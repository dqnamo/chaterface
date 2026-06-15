import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../../lib/agent-auth.js";
import { E2BSandbox as Sandbox } from "../../../lib/e2b-sandbox.js";
import type { RouteHandler } from "../../../lib/file-router.js";
import { createInstallationAccessToken } from "../../../lib/github-app.js";

const CREATE_PULL_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

type CreateGithubPullRequestBody = {
	repositoryPath: string;
	branchName?: string;
	baseBranch?: string;
	commitMessage?: string;
	title?: string;
	body?: string;
	draft: boolean;
};

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export const POST: RouteHandler = async (c) => {
	const body = parseCreateGithubPullRequestBody(await readJson(c.req.json()));

	if (!body) {
		return c.json(
			{
				error:
					"Expected a valid GitHub pull request body. Optional fields: repositoryPath, branchName, baseBranch, commitMessage, title, body, draft.",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForGithubPullRequest(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!task.sandboxId) {
		return c.json({ error: "Task sandbox has not been created yet" }, 400);
	}

	const installationId = task.factory.githubAppInstallationId;

	if (!installationId) {
		return c.json({ error: "Factory is not connected to GitHub" }, 409);
	}

	const branchName = body.branchName ?? `factoryplane/${task.id}`;
	const title = body.title ?? task.name ?? "Factoryplane changes";
	const commitMessage = body.commitMessage ?? title;
	const githubAccessToken = await createInstallationAccessToken(installationId);
	const sandbox = await Sandbox.connect(task.sandboxId);
	const workspacePath = await getSandboxWorkspacePath(sandbox);
	const repositoryPath =
		body.repositoryPath === "."
			? workspacePath
			: `${workspacePath}/${body.repositoryPath}`;
	const result = await sandbox.commands.run(
		buildCreatePullRequestCommand(repositoryPath),
		{
			timeoutMs: CREATE_PULL_REQUEST_TIMEOUT_MS,
			envs: {
				COMMIT_MESSAGE: commitMessage,
				GH_PROMPT_DISABLED: "1",
				GH_TOKEN: githubAccessToken,
				GIT_AUTHOR_EMAIL:
					task.factory.gitAuthorEmail ?? "factoryplane@example.com",
				GIT_AUTHOR_NAME: task.factory.gitAuthorName ?? "Factoryplane",
				GIT_TERMINAL_PROMPT: "0",
				GITHUB_AUTH_HEADER: Buffer.from(
					`x-access-token:${githubAccessToken}`,
					"utf8",
				).toString("base64"),
				PR_BASE_BRANCH: body.baseBranch ?? "",
				PR_BODY: body.body ?? "",
				PR_BRANCH_NAME: branchName,
				PR_DRAFT: body.draft ? "1" : "0",
				PR_TITLE: title,
			},
		},
	);

	const pullRequestUrl = getPullRequestUrlFromOutput(result.stdout);

	if (result.exitCode !== 0 || !pullRequestUrl) {
		return c.json(
			{
				error:
					result.exitCode === 2
						? "No changes or unpublished commits were found for the pull request"
						: "Failed to create GitHub pull request",
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			},
			result.exitCode === 2 ? 400 : 500,
		);
	}

	const created = task.pullRequestUrl !== pullRequestUrl;
	await attachPullRequest(task.id, pullRequestUrl, created);

	return c.json({
		taskId: task.id,
		url: pullRequestUrl,
		branchName,
		baseBranch: body.baseBranch,
		created,
	});
};

const getTaskForGithubPullRequest = async (agentToken: string) => {
	return db
		.query({
			tasks: {
				$: {
					fields: ["name", "pullRequestUrl", "sandboxId"],
					where: {
						agentToken,
					},
				},
				factory: {
					$: {
						fields: [
							"githubAppInstallationId",
							"gitAuthorEmail",
							"gitAuthorName",
						],
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};

const attachPullRequest = async (
	taskId: string,
	url: string,
	created: boolean,
) => {
	const taskUpdate = taskTx(taskId).update({
		pullRequestUrl: url,
	});

	if (!created) {
		await db.transact(taskUpdate);
		return;
	}

	await db.transact([
		taskUpdate,
		eventTx(id())
			.create({
				type: "factoryplane.pull_request_attached",
				data: {
					url,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: taskId }),
	]);
};

const buildCreatePullRequestCommand = (repositoryPath: string) =>
	[
		"set -euo pipefail",
		`cd ${shellQuote(repositoryPath)}`,
		"if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then",
		'  printf "Repository path is not inside a git work tree.\\n" >&2',
		"  exit 1",
		"fi",
		"if ! git remote get-url origin >/dev/null 2>&1; then",
		'  printf "Repository has no origin remote.\\n" >&2',
		"  exit 1",
		"fi",
		'REMOTE_URL="$(git remote get-url origin)"',
		'case "$REMOTE_URL" in',
		"  *github.com*) ;;",
		'  *) printf "Origin remote is not a GitHub repository.\\n" >&2; exit 1 ;;',
		"esac",
		'if [ -z "$PR_BASE_BRANCH" ]; then',
		'  PR_BASE_BRANCH="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed "s#^origin/##" || true)"',
		"fi",
		'if [ -z "$PR_BASE_BRANCH" ]; then',
		'  PR_BASE_BRANCH="$(git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $GITHUB_AUTH_HEADER" remote show origin | sed -n "s/.*HEAD branch: //p" | head -n 1)"',
		"fi",
		'if [ -z "$PR_BASE_BRANCH" ]; then',
		'  PR_BASE_BRANCH="main"',
		"fi",
		'git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $GITHUB_AUTH_HEADER" fetch origin "$PR_BASE_BRANCH" --depth=1 || git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $GITHUB_AUTH_HEADER" fetch origin "$PR_BASE_BRANCH"',
		'git switch -C "$PR_BRANCH_NAME"',
		'git config user.name "$GIT_AUTHOR_NAME"',
		'git config user.email "$GIT_AUTHOR_EMAIL"',
		"git add -A",
		"if ! git diff --cached --quiet; then",
		'  git commit -m "$COMMIT_MESSAGE"',
		"fi",
		'AHEAD_COUNT="$(git rev-list --count "origin/$PR_BASE_BRANCH"..HEAD 2>/dev/null || printf "0")"',
		'if [ "$AHEAD_COUNT" = "0" ]; then',
		'  printf "No changes or unpublished commits found against origin/%s.\\n" "$PR_BASE_BRANCH" >&2',
		"  exit 2",
		"fi",
		'git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $GITHUB_AUTH_HEADER" push -u origin "$PR_BRANCH_NAME" --force-with-lease',
		'if PR_URL="$(gh pr view "$PR_BRANCH_NAME" --json url --jq .url 2>/dev/null)" && [ -n "$PR_URL" ]; then',
		"  true",
		'elif [ "$PR_DRAFT" = "1" ]; then',
		'  PR_URL="$(gh pr create --base "$PR_BASE_BRANCH" --head "$PR_BRANCH_NAME" --title "$PR_TITLE" --body "$PR_BODY" --draft)"',
		"else",
		'  PR_URL="$(gh pr create --base "$PR_BASE_BRANCH" --head "$PR_BRANCH_NAME" --title "$PR_TITLE" --body "$PR_BODY")"',
		"fi",
		'printf "FACTORYPLANE_PULL_REQUEST_URL=%s\\n" "$PR_URL"',
	].join("\n");

const parseCreateGithubPullRequestBody = (
	value: unknown,
): CreateGithubPullRequestBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const repositoryPath = normalizeRepositoryPath(value.repositoryPath);
	const branchName = getOptionalGitBranchName(value.branchName);
	const baseBranch = getOptionalGitBranchName(value.baseBranch);

	if (!repositoryPath || branchName === null || baseBranch === null) {
		return undefined;
	}

	return {
		repositoryPath,
		branchName: branchName ?? undefined,
		baseBranch: baseBranch ?? undefined,
		commitMessage: getOptionalString(value.commitMessage),
		title: getOptionalString(value.title),
		body: getOptionalString(value.body) ?? "",
		draft: value.draft === true,
	};
};

const normalizeRepositoryPath = (value: unknown) => {
	if (value === undefined) {
		return ".";
	}

	if (typeof value !== "string") {
		return undefined;
	}

	const normalized = value.trim().replaceAll("\\", "/");

	if (!normalized || normalized === ".") {
		return ".";
	}

	if (normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.join("/");
};

const getOptionalGitBranchName = (value: unknown) => {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		return null;
	}

	const branchName = value.trim();

	if (!isSafeGitBranchName(branchName)) {
		return null;
	}

	return branchName;
};

const isSafeGitBranchName = (value: string) => {
	if (
		!value ||
		value.length > 200 ||
		value.startsWith("/") ||
		value.endsWith("/") ||
		value.startsWith("-") ||
		value.includes("..") ||
		value.includes("@{") ||
		hasInvalidGitRefChar(value)
	) {
		return false;
	}

	return value.split("/").every((segment) => {
		return (
			segment &&
			!segment.startsWith(".") &&
			!segment.endsWith(".lock") &&
			segment !== "@"
		);
	});
};

const hasInvalidGitRefChar = (value: string) => {
	for (const character of value) {
		const code = character.charCodeAt(0);

		if (
			code <= 32 ||
			code === 127 ||
			character === "\\" ||
			character === "~" ||
			character === "^" ||
			character === ":" ||
			character === "?" ||
			character === "*" ||
			character === "[" ||
			character === "]"
		) {
			return true;
		}
	}

	return false;
};

const getPullRequestUrlFromOutput = (stdout: string) => {
	const match = stdout.match(
		/FACTORYPLANE_PULL_REQUEST_URL=(https:\/\/github\.com\/[^\s]+)/,
	);

	return match?.[1];
};

const getSandboxWorkspacePath = async (sandbox: Sandbox) => {
	const result = await sandbox.commands.run("pwd -P", { timeoutMs: 30_000 });
	const workspacePath = result.stdout.trim();

	if (!workspacePath) {
		throw new Error("Failed to resolve sandbox workspace path");
	}

	return workspacePath;
};

const readJson = async (value: Promise<unknown>) => {
	try {
		const json = await value;
		return isRecord(json) ? json : {};
	} catch {
		return {};
	}
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const shellQuote = (value: string) => {
	return `'${value.replaceAll("'", "'\\''")}'`;
};
