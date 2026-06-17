import db, { id } from "@repo/db/admin";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

type CreateEnvironmentFileBody = {
	path: string;
	content: string;
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
		files: task.workspace.environmentFiles ?? [],
	});
};

export const POST: RouteHandler = async (c) => {
	const body = parseCreateEnvironmentFileBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected path and content when creating an environment file. Path must be workspace-relative.",
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

	const fileId = id();

	await db.transact([
		environmentFileTx(fileId)
			.create({
				path: body.path,
				content: body.content,
				createdAt: new Date().toISOString(),
			})
			.link({ workspace: task.workspace.id }),
		eventTx(id())
			.create({
				type: "chaterface.environment_file_created",
				data: {
					fileId,
					path: body.path,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id }),
	]);

	return c.json({
		fileId,
		path: body.path,
		content: body.content,
	});
};

const parseCreateEnvironmentFileBody = (
	value: unknown,
): CreateEnvironmentFileBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const path = getEnvironmentFilePath(value.path);

	if (!path || typeof value.content !== "string") {
		return undefined;
	}

	return {
		path,
		content: value.content,
	};
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
