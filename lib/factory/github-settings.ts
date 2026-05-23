export type GithubRepositorySettings = {
  path: string;
  url: string;
};

export type GithubSettingsInput = {
  gitEmail?: string;
  gitName?: string;
  repositories: GithubRepositorySettings[];
  token?: string;
};

const maxGitIdentityLength = 256;
const maxGithubTokenLength = 4096;
const maxRepoCount = 20;
const maxRepoUrlLength = 2048;
const maxRepoPathLength = 512;

export function parseGithubSettingsInput(
  value: unknown,
): GithubSettingsInput | { error: string } {
  if (!isRecord(value)) {
    return {
      gitEmail: undefined,
      gitName: undefined,
      repositories: [],
      token: undefined,
    };
  }

  const gitName = readOptionalTrimmedString(value.gitName);
  const gitEmail = readOptionalTrimmedString(value.gitEmail);
  const token = readOptionalTrimmedString(value.token);

  if (gitName && gitName.length > maxGitIdentityLength) {
    return { error: "Git name is too long." };
  }

  if (gitEmail && gitEmail.length > maxGitIdentityLength) {
    return { error: "Git email is too long." };
  }

  if (token && token.length > maxGithubTokenLength) {
    return { error: "GitHub token is too long." };
  }

  const repositories = Array.isArray(value.repositories)
    ? value.repositories
    : [];

  if (repositories.length > maxRepoCount) {
    return { error: `Add ${maxRepoCount} repositories or fewer.` };
  }

  const parsedRepositories: GithubRepositorySettings[] = [];

  for (const repository of repositories) {
    if (!isRecord(repository)) {
      return { error: "Repository entries must include a URL and path." };
    }

    const url = readOptionalTrimmedString(repository.url);
    const path = readOptionalTrimmedString(repository.path);

    if (!url && !path) {
      continue;
    }

    if (!url || !path) {
      return { error: "Each repository needs both a URL and clone path." };
    }

    if (url.length > maxRepoUrlLength || path.length > maxRepoPathLength) {
      return { error: "Repository URL or clone path is too long." };
    }

    if (!isSupportedRepositoryUrl(url)) {
      return {
        error: "Repository URLs must be HTTPS Git URLs.",
      };
    }

    if (!isSupportedClonePath(path)) {
      return {
        error:
          "Clone paths must be relative paths or absolute paths under /workspace/home.",
      };
    }

    parsedRepositories.push({ path, url });
  }

  return {
    gitEmail,
    gitName,
    repositories: parsedRepositories,
    token,
  };
}

function readOptionalTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSupportedRepositoryUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

function isSupportedClonePath(value: string) {
  if (value.includes("\0")) {
    return false;
  }

  if (value.startsWith("/")) {
    return value === "/workspace/home" || value.startsWith("/workspace/home/");
  }

  const parts = value.split("/").filter(Boolean);

  return (
    parts.length > 0 && parts.every((part) => part !== "." && part !== "..")
  );
}
