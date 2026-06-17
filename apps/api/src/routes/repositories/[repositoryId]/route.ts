import db, { id } from "@repo/db/admin";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../lib/file-router.js";

type UpdateRepositoryBody = {
	url?: string;
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

export const PATCH: RouteHandler = async (c) => {
	const repositoryId = c.req.param("repositoryId");
	const body = parseUpdateRepositoryBody(await c.req.json());

	if (!repositoryId) {
		return c.json({ error: "Missing repository id" }, 400);
	}

	if (!body) {
		return c.json(
			{
				error:
					"Expected at least one of url, path, or branch when updating a repository",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);
	const repository = task?.workspace?.repositories?.find(
		(repository) => repository.id === repositoryId,
	);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!repository) {
		return c.json({ error: "Repository not found" }, 404);
	}

	await db.transact([
		repositoryTx(repositoryId).update(body),
		eventTx(id())
			.create({
				type: "chaterface.repository_updated",
				data: {
					repositoryId,
					...body,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		repositoryId,
		...body,
	});
};

export const DELETE: RouteHandler = async (c) => {
	const repositoryId = c.req.param("repositoryId");

	if (!repositoryId) {
		return c.json({ error: "Missing repository id" }, 400);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);
	const repository = task?.workspace?.repositories?.find(
		(repository) => repository.id === repositoryId,
	);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!repository) {
		return c.json({ error: "Repository not found" }, 404);
	}

	const repositoryDetails = await getRepositoryDetails(repositoryId);

	await db.transact([
		repositoryTx(repositoryId).delete(),
		eventTx(id())
			.create({
				type: "chaterface.repository_deleted",
				data: {
					repositoryId,
					url: repositoryDetails?.url,
					path: repositoryDetails?.path,
					branch: repositoryDetails?.branch,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		repositoryId,
		status: "deleted",
	});
};

const getRepositoryDetails = async (repositoryId: string) => {
	return db
		.query({
			repositories: {
				$: {
					fields: ["url", "path", "branch"],
					where: {
						id: repositoryId,
					},
				},
			},
		})
		.then((data) => data.repositories[0]);
};

const parseUpdateRepositoryBody = (
	value: unknown,
): UpdateRepositoryBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const body: UpdateRepositoryBody = {};

	if ("url" in value) {
		const url = getNonEmptyString(value.url);

		if (!url) {
			return undefined;
		}

		body.url = url;
	}

	if ("path" in value) {
		body.path = getOptionalRepositoryPath(value.path);
	}

	if ("branch" in value) {
		body.branch = getOptionalString(value.branch);
	}

	return Object.keys(body).length > 0 ? body : undefined;
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
