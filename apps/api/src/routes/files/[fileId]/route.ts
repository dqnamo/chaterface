import db, { id } from "@repo/db/admin";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../lib/file-router.js";

type UpdateEnvironmentFileBody = {
	path?: string;
	content?: string;
};

const environmentFileTx = (fileId: string) => {
	const tx = db.tx.environmentFiles[fileId];

	if (!tx) {
		throw new Error(`Environment file transaction builder ${fileId} not found`);
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
	const fileId = c.req.param("fileId");
	const body = parseUpdateEnvironmentFileBody(await c.req.json());

	if (!fileId) {
		return c.json({ error: "Missing file id" }, 400);
	}

	if (!body) {
		return c.json(
			{
				error:
					"Expected at least one of path or content when updating an environment file",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);
	const environmentFile = task?.factory?.environmentFiles?.find(
		(file) => file.id === fileId,
	);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!environmentFile) {
		return c.json({ error: "File not found" }, 404);
	}

	await db.transact([
		environmentFileTx(fileId).update(body),
		eventTx(id())
			.create({
				type: "factoryplane.environment_file_updated",
				data: {
					fileId,
					updated: Object.keys(body),
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		fileId,
		...body,
	});
};

export const DELETE: RouteHandler = async (c) => {
	const fileId = c.req.param("fileId");

	if (!fileId) {
		return c.json({ error: "Missing file id" }, 400);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);
	const environmentFile = task?.factory?.environmentFiles?.find(
		(file) => file.id === fileId,
	);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!environmentFile) {
		return c.json({ error: "File not found" }, 404);
	}

	await db.transact([
		environmentFileTx(fileId).delete(),
		eventTx(id())
			.create({
				type: "factoryplane.environment_file_deleted",
				data: {
					fileId,
					path: environmentFile.path,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		fileId,
		status: "deleted",
	});
};

const parseUpdateEnvironmentFileBody = (
	value: unknown,
): UpdateEnvironmentFileBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const body: UpdateEnvironmentFileBody = {};

	if ("path" in value) {
		const path = getEnvironmentFilePath(value.path);

		if (!path) {
			return undefined;
		}

		body.path = path;
	}

	if ("content" in value) {
		if (typeof value.content !== "string") {
			return undefined;
		}

		body.content = value.content;
	}

	return Object.keys(body).length > 0 ? body : undefined;
};

const getEnvironmentFilePath = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const normalized = value.trim().replaceAll("\\", "/");

	if (!normalized || normalized.startsWith("/")) {
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

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
