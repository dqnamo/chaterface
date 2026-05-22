import "server-only";

import { getAdminDbCore } from "@/lib/admin-db-core";
import {
  cleanCommandOutput,
  ensureCodexCli,
  restoreCodexHome,
  shellQuote,
  snapshotCodexHome,
} from "@/lib/codex/sandbox-auth";
import {
  type AppSandbox,
  connectSandbox,
  createWorkerSandbox,
  runSandboxCommand,
} from "@/lib/sandbox/service";

type FactorySecretRecord = {
  capabilitySandboxId?: string;
  defaultSandboxCheckpointId?: string;
  id: string;
};

export type SkillCandidate = {
  description: string;
  name: string;
  path: string;
};

export async function getFactoryCapabilitySandbox({
  factory,
  factoryId,
}: {
  factory: FactorySecretRecord;
  factoryId: string;
}) {
  if (factory.capabilitySandboxId) {
    const sandbox = await connectSandbox(factory.capabilitySandboxId);
    await ensureCodexCli(sandbox);
    return sandbox;
  }

  const checkpointId = factory.defaultSandboxCheckpointId;

  if (!checkpointId) {
    throw new Error("Connect Codex before configuring capabilities.");
  }

  const sandbox = await createWorkerSandbox({
    checkpointId,
    factoryId,
    workerId: `capabilities-${Date.now()}`,
  });

  await restoreCodexHome(sandbox);
  await ensureCodexCli(sandbox);

  const db = getAdminDbCore();
  await db.transact(
    db.tx.factories[factory.id].update({ capabilitySandboxId: sandbox.id }),
  );

  return sandbox;
}

export async function snapshotFactoryCapabilities({
  sandbox,
  factoryId,
}: {
  sandbox: AppSandbox;
  factoryId: string;
}) {
  const checkpoint = await snapshotCodexHome(sandbox, factoryId);
  const db = getAdminDbCore();

  await db.transact(
    db.tx.factories[factoryId].update({
      capabilitySandboxId: sandbox.id,
      defaultSandboxCheckpointId: checkpoint.id,
    }),
  );

  return checkpoint;
}

export async function listSkillCandidates(
  sandbox: AppSandbox,
  repoUrl: string,
) {
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
  const result = await runSandboxCommand(
    sandbox,
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
  repoUrl,
  sandbox,
  skillPaths,
}: {
  repoUrl: string;
  sandbox: AppSandbox;
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
  const result = await runSandboxCommand(
    sandbox,
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
