import "server-only";

import {
  cleanCommandOutput,
  sandboxWorkspace,
  shellQuote,
} from "@/lib/codex/sandbox-auth";
import { type AppSandbox, runSandboxCommand } from "@/lib/sandbox/service";

export type GithubRepositorySetup = {
  path: string;
  url: string;
};

export type GithubSetup = {
  gitEmail?: string;
  gitName?: string;
  repositories: GithubRepositorySetup[];
  token?: string;
};

const githubCredentialsPath = "$HOME/.git-credentials";

export async function applyGithubSetup(
  sandbox: AppSandbox,
  setup: GithubSetup,
) {
  const commands = createGithubSetupCommands(setup);

  if (commands.length === 0) {
    return;
  }

  const result = await runSandboxCommand(
    sandbox,
    ["set -e", ...commands].join("\n"),
    240_000,
  );

  if (!result.success) {
    throw new Error(
      `GitHub setup failed: ${cleanCommandOutput(result.output) || "No output"}`,
    );
  }
}

function createGithubSetupCommands(setup: GithubSetup) {
  const commands: string[] = [];

  if (setup.gitName) {
    commands.push(`git config --global user.name ${shellQuote(setup.gitName)}`);
  }

  if (setup.gitEmail) {
    commands.push(
      `git config --global user.email ${shellQuote(setup.gitEmail)}`,
    );
  }

  if (setup.token) {
    const credential = `https://x-access-token:${setup.token}@github.com`;

    commands.push(
      "git config --global credential.helper store",
      `printf %s ${shellQuote(credential)} > ${githubCredentialsPath}`,
      `chmod 600 ${githubCredentialsPath}`,
    );
  }

  for (const repository of setup.repositories) {
    commands.push(createCloneCommand(repository));
  }

  return commands;
}

function createCloneCommand(repository: GithubRepositorySetup) {
  const targetPath = toSandboxPath(repository.path);

  return [
    `mkdir -p ${shellQuote(parentDirectory(targetPath))}`,
    `if test -d ${shellQuote(`${targetPath}/.git`)}; then`,
    `  GIT_TERMINAL_PROMPT=0 git -C ${shellQuote(targetPath)} fetch --all --prune;`,
    `elif test -e ${shellQuote(targetPath)}; then`,
    `  echo ${shellQuote(`Clone path already exists and is not a git repo: ${targetPath}`)}; exit 1;`,
    "else",
    `  GIT_TERMINAL_PROMPT=0 git clone ${shellQuote(repository.url)} ${shellQuote(targetPath)};`,
    "fi",
  ].join("\n");
}

function toSandboxPath(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error("Repository clone path is required.");
  }

  if (trimmedValue.startsWith("/")) {
    if (
      trimmedValue === sandboxWorkspace ||
      trimmedValue.startsWith(`${sandboxWorkspace}/`)
    ) {
      return trimmedValue;
    }

    throw new Error(`Clone path must be inside ${sandboxWorkspace}.`);
  }

  const parts = trimmedValue.split("/").filter(Boolean);

  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("Repository clone path cannot include . or .. segments.");
  }

  return `${sandboxWorkspace}/${parts.join("/")}`;
}

function parentDirectory(path: string) {
  const slashIndex = path.lastIndexOf("/");

  return slashIndex > 0 ? path.slice(0, slashIndex) : sandboxWorkspace;
}
