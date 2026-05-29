import "server-only";

import {
  installSkills,
  type SkillCandidate,
} from "@/lib/codex/factory-capabilities";
import {
  applyGithubSetup,
  type GithubRepositorySetup,
} from "@/lib/codex/github-setup";
import { hashProvisioningInput } from "@/lib/codex/provisioning-hash";
import { cleanCommandOutput } from "@/lib/codex/sandbox-auth";
import { decryptSecretValue } from "@/lib/crypto.server";
import { type AppSandbox, runSandboxCommand } from "@/lib/sandbox/service";

type GithubSettingsRecord = {
  gitEmail?: string;
  gitName?: string;
  hasToken?: boolean;
  repositories?: unknown;
  status?: string;
  tokenEncrypted?: string;
};

type SkillRecord = {
  id?: string;
  installedAt?: string;
  name?: string;
  repoUrl?: string;
  skillPath?: string;
  status?: string;
};

export type WorkerProvisioningFactory = {
  githubSettings?: GithubSettingsRecord;
  id: string;
  skills?: SkillRecord[];
};

export type WorkerProvisioningResult = {
  applied: boolean;
  hash: string;
  summary: {
    gitRepositoryCount: number;
    gitTokenConfigured: boolean;
    skillCount: number;
  };
};

type ProvisioningPlan = {
  github: {
    repositories: GithubRepositorySetup[];
    tokenEncrypted?: string;
  };
  hash: string;
  skills: ProvisioningSkill[];
  summary: WorkerProvisioningResult["summary"];
};

type ProvisioningSkill = SkillCandidate & {
  installedAt?: string;
  repoUrl: string;
};

export async function provisionWorkerSandbox({
  appliedHash,
  factory,
  force,
  sandbox,
}: {
  appliedHash?: string;
  factory: WorkerProvisioningFactory;
  force?: boolean;
  sandbox: AppSandbox;
}): Promise<WorkerProvisioningResult> {
  const plan = createProvisioningPlan(factory);

  if (!force && appliedHash === plan.hash) {
    return {
      applied: false,
      hash: plan.hash,
      summary: plan.summary,
    };
  }

  await resetManagedProvisioningState(sandbox);
  await applyGithubSetup(sandbox, {
    repositories: plan.github.repositories,
    token: decryptOptionalString(plan.github.tokenEncrypted),
  });
  await installConfiguredSkills({
    sandbox,
    skills: plan.skills,
  });

  return {
    applied: true,
    hash: plan.hash,
    summary: plan.summary,
  };
}

async function resetManagedProvisioningState(sandbox: AppSandbox) {
  const result = await runSandboxCommand(
    sandbox,
    [
      'rm -f "$HOME/.git-credentials"',
      "git config --global --unset credential.helper >/dev/null 2>&1 || true",
      "git config --global --unset user.name >/dev/null 2>&1 || true",
      "git config --global --unset user.email >/dev/null 2>&1 || true",
      'rm -rf "$HOME/.agents/skills"',
      'mkdir -p "$HOME/.agents/skills"',
    ].join(" && "),
    30_000,
  );

  if (!result.success) {
    throw new Error(
      `Worker provisioning reset failed: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }
}

export function createProvisioningPlan(
  factory: WorkerProvisioningFactory,
): ProvisioningPlan {
  const repositories = getGithubRepositories(
    factory.githubSettings?.repositories,
  );
  const skills = getInstalledSkills(factory.skills ?? []);
  const hashInput = {
    github: {
      repositories,
      tokenEncrypted: factory.githubSettings?.tokenEncrypted ?? null,
    },
    skills,
  };

  return {
    github: {
      repositories,
      tokenEncrypted: factory.githubSettings?.tokenEncrypted,
    },
    hash: hashProvisioningInput(hashInput),
    skills,
    summary: {
      gitRepositoryCount: repositories.length,
      gitTokenConfigured: Boolean(factory.githubSettings?.tokenEncrypted),
      skillCount: skills.length,
    },
  };
}

async function installConfiguredSkills({
  sandbox,
  skills,
}: {
  sandbox: AppSandbox;
  skills: ProvisioningSkill[];
}) {
  const skillsByRepo = new Map<string, ProvisioningSkill[]>();

  for (const skill of skills) {
    const existing = skillsByRepo.get(skill.repoUrl) ?? [];
    existing.push(skill);
    skillsByRepo.set(skill.repoUrl, existing);
  }

  for (const [repoUrl, repoSkills] of skillsByRepo) {
    await installSkills({
      repoUrl,
      sandbox,
      skillPaths: repoSkills.map((skill) => skill.path),
    });
  }
}

function decryptOptionalString(value?: string) {
  if (!value) {
    return undefined;
  }

  const decrypted = decryptSecretValue<unknown>(value);

  return typeof decrypted === "string" ? decrypted : undefined;
}

function getGithubRepositories(value: unknown): GithubRepositorySetup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((repository) => {
      if (!isRecord(repository)) {
        return [];
      }

      const path = readString(repository.path);
      const url = readString(repository.url);

      return path && url ? [{ path, url }] : [];
    })
    .sort((first, second) =>
      `${first.path}\0${first.url}`.localeCompare(
        `${second.path}\0${second.url}`,
      ),
    );
}

function getInstalledSkills(skills: SkillRecord[]): ProvisioningSkill[] {
  return skills
    .flatMap((skill) => {
      const name = readString(skill.name);
      const path = readString(skill.skillPath);
      const repoUrl = readString(skill.repoUrl);

      if (skill.status !== "installed" || !name || !path || !repoUrl) {
        return [];
      }

      return [
        {
          description: "",
          installedAt: skill.installedAt,
          name,
          path,
          repoUrl,
        },
      ];
    })
    .sort((first, second) =>
      `${first.repoUrl}\0${first.path}\0${first.name}\0${first.installedAt ?? ""}`.localeCompare(
        `${second.repoUrl}\0${second.path}\0${second.name}\0${second.installedAt ?? ""}`,
      ),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}
