import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type AttachPullRequestBody = {
	url: string;
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

export const GET: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForPullRequest(token);

	if (!task) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const pullRequest = getTaskPullRequest(task);

	return c.json({
		pullRequest,
		pullRequests: pullRequest ? [pullRequest] : [],
	});
};

export const POST: RouteHandler = async (c) => {
	const body = parseAttachPullRequestBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error: "Expected an http(s) pull request url",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForPullRequest(token);

	if (!task) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const now = new Date().toISOString();
	const created = task.pullRequestUrl !== body.url;
	const taskUpdate = taskTx(task.id).update({
		pullRequestUrl: body.url,
	});

	if (created) {
		await db.transact([
			taskUpdate,
			eventTx(id())
				.create({
					type: "chaterface.pull_request_attached",
					data: {
						url: body.url,
					},
					createdAt: now,
				})
				.link({ task: task.id }),
		]);
	} else {
		await db.transact(taskUpdate);
	}

	return c.json({
		taskId: task.id,
		url: body.url,
		created,
	});
};

const getTaskForPullRequest = async (agentToken: string) => {
	return db
		.query({
			tasks: {
				$: {
					fields: ["pullRequestUrl"],
					where: {
						agentToken,
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};

const getTaskPullRequest = (
	task: NonNullable<Awaited<ReturnType<typeof getTaskForPullRequest>>>,
) => {
	if (!task.pullRequestUrl) {
		return null;
	}

	return {
		taskId: task.id,
		url: task.pullRequestUrl,
	};
};

const parseAttachPullRequestBody = (
	value: unknown,
): AttachPullRequestBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const url = getHttpUrl(value.url);

	if (!url) {
		return undefined;
	}

	return {
		url,
	};
};

const getHttpUrl = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();

	if (!trimmed) {
		return undefined;
	}

	try {
		const url = new URL(trimmed);

		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return undefined;
		}

		url.hash = "";
		return url.toString();
	} catch {
		return undefined;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
