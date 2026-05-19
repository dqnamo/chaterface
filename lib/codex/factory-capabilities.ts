import "server-only";

import { Box } from "@upstash/box";
import { getAdminDbCore } from "@/lib/admin-db-core";
import {
  cleanCommandOutput,
  ensureCodexCli,
  getBox,
  restoreCodexHome,
  runBoxCommand,
  shellQuote,
  snapshotCodexHome,
} from "@/lib/codex/box-auth";

type FactorySecretRecord = {
  capabilityBoxId?: string;
  defaultSanpshotId?: string;
  id: string;
};

export type SkillCandidate = {
  description: string;
  name: string;
  path: string;
};

export async function getFactoryCapabilityBox({
  factory,
  factoryId,
}: {
  factory: FactorySecretRecord;
  factoryId: string;
}) {
  if (factory.capabilityBoxId) {
    const box = await getBox(factory.capabilityBoxId);
    await ensureCodexCli(box);
    return box;
  }

  const snapshotId = factory.defaultSanpshotId;

  if (!snapshotId) {
    throw new Error("Connect Codex before configuring capabilities.");
  }

  const box = await Box.fromSnapshot(snapshotId, {
    apiKey: process.env.UPSTASH_BOX_API_KEY,
    baseUrl: process.env.UPSTASH_BOX_BASE_URL,
    runtime: "node",
    name: `factory-${factoryId.slice(0, 8)}-capabilities-${Date.now()}`,
  });

  await restoreCodexHome(box);
  await ensureCodexCli(box);

  const db = getAdminDbCore();
  await db.transact(
    db.tx.factories[factory.id].update({ capabilityBoxId: box.id }),
  );

  return box;
}

export async function snapshotFactoryCapabilities({
  box,
  factoryId,
}: {
  box: Box;
  factoryId: string;
}) {
  const snapshot = await snapshotCodexHome(box, factoryId);
  const db = getAdminDbCore();

  await db.transact(
    db.tx.factories[factoryId].update({
      capabilityBoxId: box.id,
      defaultSanpshotId: snapshot.id,
    }),
  );

  return snapshot;
}

export async function listSkillCandidates(box: Box, repoUrl: string) {
  const sourceDir = `/tmp/factory-skills-${Date.now()}`;
  const jsonMarker = "__FACTORY_SKILLS_JSON__";
  const scanner = `
const fs = require("fs");
const path = require("path");
const root = process.env.FACTORY_SKILL_SOURCE_DIR;
const marker = process.env.FACTORY_SKILL_JSON_MARKER;

function stripQuotes(value) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function readField(content, field) {
  const lines = content.split(/\\r?\\n/);

  for (const line of lines) {
    const match = line.match(new RegExp("^" + field + "\\\\s*:\\\\s*(.*)$"));

    if (match) {
      return stripQuotes(match[1] || "");
    }
  }

  return "";
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const nextPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(nextPath, files);
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(nextPath);
    }
  }
}

const files = [];
walk(root, files);
const candidates = files.sort().map((file) => {
  const content = fs.readFileSync(file, "utf8");
  const relativePath = path.relative(root, file).split(path.sep).join("/");

  return {
    description: readField(content, "description"),
    name: readField(content, "name") || path.basename(path.dirname(file)),
    path: relativePath,
  };
});

process.stdout.write(marker + JSON.stringify(candidates));
`;
  const result = await runBoxCommand(
    box,
    [
      `rm -rf ${shellQuote(sourceDir)}`,
      `git clone --quiet --depth 1 ${shellQuote(repoUrl)} ${shellQuote(sourceDir)}`,
      `FACTORY_SKILL_SOURCE_DIR=${shellQuote(sourceDir)} FACTORY_SKILL_JSON_MARKER=${shellQuote(jsonMarker)} node -e ${shellQuote(scanner)}`,
    ].join(" && "),
    120_000,
  );

  if (!result.success) {
    throw new Error(result.output.trim() || "Skill repo could not be listed.");
  }

  const output = cleanCommandOutput(result.output);
  const markerIndex = output.lastIndexOf(jsonMarker);
  const jsonOutput =
    markerIndex >= 0
      ? output.slice(markerIndex + jsonMarker.length).trim()
      : output;

  try {
    const parsed = JSON.parse(jsonOutput) as SkillCandidate[];

    return parsed.filter(
      (candidate): candidate is SkillCandidate =>
        typeof candidate?.path === "string" &&
        candidate.path.endsWith("SKILL.md") &&
        typeof candidate.name === "string" &&
        typeof candidate.description === "string",
    );
  } catch {
    throw new Error(output || "Skill repo returned an unreadable skill list.");
  }
}

export async function installSkills({
  box,
  repoUrl,
  skillPaths,
}: {
  box: Box;
  repoUrl: string;
  skillPaths: string[];
}) {
  const sourceDir = `/tmp/factory-skills-install-${Date.now()}`;
  const installCommands = skillPaths.map((skillPath) => {
    if (skillPath.startsWith("/") || skillPath.includes("..")) {
      throw new Error(`Invalid skill path: ${skillPath}`);
    }

    const sourceSkill = `${sourceDir}/${skillPath}`;
    const sourceSkillDir = sourceSkill.replace(/\/SKILL\.md$/, "");
    const fallbackName =
      skillPath
        .split("/")
        .filter(Boolean)
        .slice(-2, -1)[0]
        ?.replace(/[^a-zA-Z0-9._-]/g, "-") || "factory-skill";

    return [
      `test -f ${shellQuote(sourceSkill)}`,
      `skill_name="$(sed -n 's/^name:[[:space:]]*//p' ${shellQuote(sourceSkill)} | head -n 1 | sed 's/^["'\\''"]//; s/["'\\''"]$//; s/[^a-zA-Z0-9._-]/-/g')"`,
      `if test -z "$skill_name"; then skill_name=${shellQuote(fallbackName)}; fi`,
      `target="$HOME/.agents/skills/$skill_name"`,
      `rm -rf "$target"`,
      `mkdir -p "$HOME/.agents/skills"`,
      `cp -R ${shellQuote(sourceSkillDir)} "$target"`,
    ].join(" && ");
  });
  const result = await runBoxCommand(
    box,
    [
      `rm -rf ${shellQuote(sourceDir)}`,
      `git clone --depth 1 ${shellQuote(repoUrl)} ${shellQuote(sourceDir)}`,
      ...installCommands,
    ].join(" && "),
    180_000,
  );

  if (!result.success) {
    throw new Error(result.output.trim() || "Skills could not be installed.");
  }
}
