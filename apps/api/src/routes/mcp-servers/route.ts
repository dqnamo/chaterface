import db, { id } from "@repo/db/admin";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";
import {
	getMcpAuthSummary,
	MCP_SERVER_NAME_PATTERN,
	type McpAuthConfig,
} from "../../lib/mcp-auth.js";

type CreateMcpServerBody = {
	name: string;
	url: string;
	enabled?: boolean;
	auth?: CreateMcpAuthBody;
};

type CreateMcpAuthBody = { type: "oauth" };

const mcpServerTx = (mcpServerId: string) => {
	const tx = db.tx.mcpServers[mcpServerId];

	if (!tx) {
		throw new Error(`MCP server transaction builder ${mcpServerId} not found`);
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
		mcpServers: (task.workspace.mcpServers ?? []).map((server) => ({
			id: server.id,
			name: server.name,
			url: server.url,
			transport: server.transport ?? "streamable_http",
			enabled: server.enabled !== false,
			auth: getMcpAuthSummary(server.auth),
			createdAt: server.createdAt,
			updatedAt: server.updatedAt,
		})),
	});
};

export const POST: RouteHandler = async (c) => {
	const body = parseCreateMcpServerBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected name, url, optional enabled, and optional OAuth auth when creating an MCP server",
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

	const auth = createMcpAuthConfig(body.auth);
	const mcpServerId = id();
	const now = new Date().toISOString();

	await db.transact([
		mcpServerTx(mcpServerId)
			.create({
				name: body.name,
				url: body.url,
				transport: "streamable_http",
				auth,
				enabled: body.enabled ?? true,
				createdAt: now,
				updatedAt: now,
			})
			.link({ workspace: task.workspace.id }),
		eventTx(id())
			.create({
				type: "chaterface.mcp_server_created",
				data: {
					mcpServerId,
					name: body.name,
					url: body.url,
					authType: auth.type,
				},
				createdAt: now,
			})
			.link({ task: task.id }),
	]);

	return c.json({
		mcpServerId,
		name: body.name,
		url: body.url,
		transport: "streamable_http",
		enabled: body.enabled ?? true,
		auth: getMcpAuthSummary(auth),
	});
};

const parseCreateMcpServerBody = (
	value: unknown,
): CreateMcpServerBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const name = getMcpServerName(value.name);
	const url = getMcpServerUrl(value.url);

	if (!name || !url) {
		return undefined;
	}

	const auth = "auth" in value ? parseCreateMcpAuthBody(value.auth) : undefined;

	if ("auth" in value && !auth) {
		return undefined;
	}

	return {
		name,
		url,
		enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
		auth,
	};
};

const parseCreateMcpAuthBody = (
	value: unknown,
): CreateMcpAuthBody | undefined => {
	if (!isRecord(value) || !("type" in value)) {
		return undefined;
	}

	if (value.type === "oauth") {
		return { type: "oauth" };
	}

	return undefined;
};

const createMcpAuthConfig = (
	body: CreateMcpAuthBody | undefined,
): McpAuthConfig => {
	return {
		type: body?.type ?? "oauth",
		status: "not_connected",
		updatedAt: new Date().toISOString(),
	};
};

const getMcpServerName = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return MCP_SERVER_NAME_PATTERN.test(trimmed) ? trimmed : undefined;
};

const getMcpServerUrl = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	try {
		const url = new URL(value.trim());

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return undefined;
		}

		return url.toString();
	} catch {
		return undefined;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
