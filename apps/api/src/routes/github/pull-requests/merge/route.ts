import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../../lib/file-router.js";
import { createInstallationAccessToken } from "../../../../lib/github-app.js";

const GITHUB_API_VERSION = "2022-11-28";

type MergeMethod = "merge" | "squash" | "rebase";

type MergeGithubPullRequestBody = {
	url?: GithubPullRequestUrl;
	mergeMethod: MergeMethod;
	commitTitle?: string;
	commitMessage?: string;
	expectedHeadSha?: string;
	deleteBranch: boolean;
};

type GithubPullRequestUrl = {
	owner: string;
	repo: string;
	number: number;
	url: string;
};

type GithubPullRequest = {
	head?: {
		ref?: string;
		repo?: {
			owner?: {
				login?: string;
			};
			name?: string;
		};
	};
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
	const body = parseMergeGithubPullRequestBody(await readJson(c.req.json()));

	if (!body) {
		return c.json(
			{
				error:
					"Expected a valid GitHub pull request merge body. Optional fields: url, mergeMethod, commitTitle, commitMessage, expectedHeadSha, deleteBranch.",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForGithubPullRequestMerge(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!task.pullRequestUrl) {
		return c.json(
			{ error: "Task does not have an attached pull request" },
			400,
		);
	}

	const attachedPullRequest = parseGithubPullRequestUrl(task.pullRequestUrl);

	if (!attachedPullRequest) {
		return c.json({ error: "Attached pull request is not a GitHub URL" }, 409);
	}

	const pullRequest = body.url ?? attachedPullRequest;

	if (!isSameGithubPullRequest(pullRequest, attachedPullRequest)) {
		return c.json(
			{ error: "Merge URL must match the task's attached pull request" },
			409,
		);
	}

	const installationId = task.factory.githubAppInstallationId;

	if (!installationId) {
		return c.json({ error: "Factory is not connected to GitHub" }, 409);
	}

	const githubAccessToken = await createInstallationAccessToken(installationId);
	const mergeResult = await mergeGithubPullRequest(
		githubAccessToken,
		pullRequest,
		{
			commitMessage: body.commitMessage,
			commitTitle: body.commitTitle,
			expectedHeadSha: body.expectedHeadSha,
			mergeMethod: body.mergeMethod,
		},
	);

	if (!mergeResult.ok) {
		return c.json(
			{
				error: "Failed to merge GitHub pull request",
				status: mergeResult.status,
				details: mergeResult.details,
			},
			getFailureStatus(mergeResult.status),
		);
	}

	const deleteBranchResult = body.deleteBranch
		? await deletePullRequestHeadBranch(githubAccessToken, pullRequest)
		: undefined;

	await db.transact([
		taskTx(task.id).update({
			pullRequestUrl: pullRequest.url,
		}),
		eventTx(id())
			.create({
				type: "factoryplane.pull_request_merged",
				data: {
					url: pullRequest.url,
					sha: mergeResult.sha,
					mergeMethod: body.mergeMethod,
					deletedBranch: deleteBranchResult?.deleted ?? false,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		taskId: task.id,
		url: pullRequest.url,
		merged: true,
		sha: mergeResult.sha,
		message: mergeResult.message,
		deletedBranch: deleteBranchResult?.deleted ?? false,
		deleteBranchError: deleteBranchResult?.error,
	});
};

const getTaskForGithubPullRequestMerge = async (agentToken: string) => {
	return db
		.query({
			tasks: {
				$: {
					fields: ["pullRequestUrl"],
					where: {
						agentToken,
					},
				},
				factory: {
					$: {
						fields: ["githubAppInstallationId"],
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};

const mergeGithubPullRequest = async (
	token: string,
	pullRequest: GithubPullRequestUrl,
	options: {
		commitTitle?: string;
		commitMessage?: string;
		expectedHeadSha?: string;
		mergeMethod: MergeMethod;
	},
) => {
	const response = await githubFetch(
		token,
		`/repos/${encodeURIComponent(pullRequest.owner)}/${encodeURIComponent(
			pullRequest.repo,
		)}/pulls/${pullRequest.number}/merge`,
		{
			method: "PUT",
			body: JSON.stringify({
				commit_title: options.commitTitle,
				commit_message: options.commitMessage,
				merge_method: options.mergeMethod,
				sha: options.expectedHeadSha,
			}),
		},
	);
	const details = await readGithubResponse(response);

	if (!response.ok) {
		return {
			ok: false as const,
			status: response.status,
			details,
		};
	}

	const result = isRecord(details) ? details : {};

	return {
		ok: true as const,
		sha: getOptionalString(result.sha),
		message: getOptionalString(result.message),
	};
};

const deletePullRequestHeadBranch = async (
	token: string,
	pullRequest: GithubPullRequestUrl,
) => {
	const response = await githubFetch(
		token,
		`/repos/${encodeURIComponent(pullRequest.owner)}/${encodeURIComponent(
			pullRequest.repo,
		)}/pulls/${pullRequest.number}`,
	);

	if (!response.ok) {
		return { deleted: false, error: "Failed to read pull request head branch" };
	}

	const details = (await readGithubResponse(response)) as GithubPullRequest;
	const owner = details.head?.repo?.owner?.login;
	const repo = details.head?.repo?.name;
	const branch = details.head?.ref;

	if (!owner || !repo || !branch) {
		return { deleted: false, error: "Pull request head branch was missing" };
	}

	const deleteResponse = await githubFetch(
		token,
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
			repo,
		)}/git/refs/heads/${branch
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/")}`,
		{ method: "DELETE" },
	);

	if (deleteResponse.ok) {
		return { deleted: true };
	}

	const deleteDetails = await readGithubResponse(deleteResponse);

	return {
		deleted: false,
		error:
			getGithubMessage(deleteDetails) ??
			`Failed to delete pull request branch: GitHub returned ${deleteResponse.status}`,
	};
};

const githubFetch = (token: string, path: string, init: RequestInit = {}) => {
	return fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "Factoryplane",
			"X-GitHub-Api-Version": GITHUB_API_VERSION,
			...init.headers,
		},
	});
};

const getFailureStatus = (githubStatus: number) => {
	if (githubStatus === 401 || githubStatus === 403 || githubStatus === 404) {
		return githubStatus;
	}

	if (githubStatus === 405 || githubStatus === 409 || githubStatus === 422) {
		return 409;
	}

	return 500;
};

const parseMergeGithubPullRequestBody = (
	value: unknown,
): MergeGithubPullRequestBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const url =
		value.url === undefined ? undefined : parseGithubPullRequestUrl(value.url);
	const mergeMethod = parseMergeMethod(value.mergeMethod);
	const commitTitle = getOptionalString(value.commitTitle);
	const commitMessage = getOptionalString(value.commitMessage);
	const expectedHeadSha = getOptionalSha(value.expectedHeadSha);

	if (
		url === null ||
		mergeMethod === null ||
		expectedHeadSha === null ||
		(value.deleteBranch !== undefined &&
			typeof value.deleteBranch !== "boolean")
	) {
		return undefined;
	}

	return {
		url,
		mergeMethod: mergeMethod ?? "merge",
		commitTitle,
		commitMessage,
		expectedHeadSha: expectedHeadSha ?? undefined,
		deleteBranch: value.deleteBranch === true,
	};
};

const parseMergeMethod = (value: unknown): MergeMethod | undefined | null => {
	if (value === undefined) {
		return undefined;
	}

	if (value === "merge" || value === "squash" || value === "rebase") {
		return value;
	}

	return null;
};

const parseGithubPullRequestUrl = (
	value: unknown,
): GithubPullRequestUrl | null => {
	if (typeof value !== "string") {
		return null;
	}

	try {
		const url = new URL(value.trim());

		if (url.protocol !== "https:" || url.hostname !== "github.com") {
			return null;
		}

		const [owner, repo, pullSegment, numberSegment, ...rest] = url.pathname
			.split("/")
			.filter(Boolean);
		const number = Number(numberSegment);

		if (
			!owner ||
			!repo ||
			pullSegment !== "pull" ||
			!Number.isInteger(number) ||
			number < 1 ||
			rest.length > 0
		) {
			return null;
		}

		url.hash = "";
		url.search = "";

		return {
			owner,
			repo,
			number,
			url: url.toString().replace(/\/$/, ""),
		};
	} catch {
		return null;
	}
};

const isSameGithubPullRequest = (
	first: GithubPullRequestUrl,
	second: GithubPullRequestUrl,
) => {
	return (
		first.owner.toLowerCase() === second.owner.toLowerCase() &&
		first.repo.toLowerCase() === second.repo.toLowerCase() &&
		first.number === second.number
	);
};

const readGithubResponse = async (response: Response) => {
	const text = await response.text();

	if (!text) {
		return undefined;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
};

const getGithubMessage = (value: unknown) => {
	if (!isRecord(value)) {
		return undefined;
	}

	return getOptionalString(value.message);
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

const getOptionalSha = (value: unknown) => {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();

	if (!/^[a-f0-9]{40}$/i.test(trimmed)) {
		return null;
	}

	return trimmed;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
