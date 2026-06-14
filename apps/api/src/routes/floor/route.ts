import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

export const GET: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	return c.json({
		workflow: parseWorkflow(task.factory.floorWorkflow) ?? {
			nodes: [],
			edges: [],
		},
	});
};

const parseWorkflow = (value: unknown) => {
	if (
		!isRecord(value) ||
		!Array.isArray(value.nodes) ||
		!Array.isArray(value.edges)
	) {
		return undefined;
	}

	return {
		nodes: value.nodes,
		edges: value.edges,
	};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
