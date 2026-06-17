import db, { id } from "@repo/db/admin";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type CreateRepositoryBody = {
	url: string;
	path?: string;
	branch?: string;
};

const repositoryTx = (repositoryId: string) => {
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		throw new Error(`Repository transaction builder ${repositoryId} not found`);
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

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return c.json({
		repositories: task.workspace.repositories ?? [],
	});
};

export const POST: RouteHandler = async (c) => {
	const body = parseCreateRepositoryBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected url, and optional path and branch, when creating a repository",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const repositoryId = id();

	await db.transact([
		repositoryTx(repositoryId)
			.create({
				url: body.url,
				path: body.path,
				branch: body.branch,
				createdAt: new Date().toISOString(),
			})
			.link({ workspace: task.workspace.id }),
		eventTx(id())
			.create({
				type: "chaterface.repository_created",
				data: {
					repositoryId,
					url: body.url,
					path: body.path,
					branch: body.branch,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		repositoryId,
		url: body.url,
		path: body.path,
		branch: body.branch,
	});
};

const parseCreateRepositoryBody = (
	value: unknown,
): CreateRepositoryBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const url = getNonEmptyString(value.url);

	if (!url) {
		return undefined;
	}

	return {
		url,
		path: getOptionalRepositoryPath(value.path),
		branch: getOptionalString(value.branch),
	};
};

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalRepositoryPath = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.filter(
			(segment) => segment.length > 0 && segment !== "." && segment !== "..",
		);

	return segments.length > 0 ? segments.join("/") : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
