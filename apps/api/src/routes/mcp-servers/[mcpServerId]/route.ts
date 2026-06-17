import db, { id } from "@repo/db/admin";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../lib/file-router.js";
import {
	getMcpAuthSummary,
	MCP_SERVER_NAME_PATTERN,
} from "../../../lib/mcp-auth.js";

type UpdateMcpServerBody = {
	name?: string;
	url?: string;
	enabled?: boolean;
	auth?: { type: "none" | "oauth" | "client_credentials" };
};

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

export const PATCH: RouteHandler = async (c) => {
	const mcpServerId = c.req.param("mcpServerId");
	const body = parseUpdateMcpServerBody(await c.req.json());

	if (!mcpServerId) {
		return c.json({ error: "Missing MCP server id" }, 400);
	}

	if (!body) {
		return c.json(
			{
				error:
					"Expected at least one of name, url, enabled, or auth when updating an MCP server",
			},
			400,
		);
	}

	const authResult = await authenticateMcpServerRequest(
		c.req.header("Authorization"),
		mcpServerId,
	);

	if (!authResult.ok) {
		return c.json({ error: authResult.error }, authResult.status);
	}

	const now = new Date().toISOString();
	const update = {
		...body,
		...(body.auth ? { auth: createMetadataOnlyAuth(body.auth) } : {}),
		updatedAt: now,
	};

	await db.transact([
		mcpServerTx(mcpServerId).update(update),
		eventTx(id())
			.create({
				type: "factoryplane.mcp_server_updated",
				data: {
					mcpServerId,
					name: body.name,
					url: body.url,
					enabled: body.enabled,
					authType: body.auth?.type,
				},
				createdAt: now,
			})
			.link({ task: authResult.task.id }),
	]);

	return c.json({
		mcpServerId,
		...update,
		auth: body.auth
			? getMcpAuthSummary(createMetadataOnlyAuth(body.auth))
			: getMcpAuthSummary(authResult.mcpServer.auth),
	});
};

export const DELETE: RouteHandler = async (c) => {
	const mcpServerId = c.req.param("mcpServerId");

	if (!mcpServerId) {
		return c.json({ error: "Missing MCP server id" }, 400);
	}

	const authResult = await authenticateMcpServerRequest(
		c.req.header("Authorization"),
		mcpServerId,
	);

	if (!authResult.ok) {
		return c.json({ error: authResult.error }, authResult.status);
	}

	await db.transact([
		mcpServerTx(mcpServerId).delete(),
		eventTx(id())
			.create({
				type: "factoryplane.mcp_server_deleted",
				data: {
					mcpServerId,
					name: authResult.mcpServer.name,
					url: authResult.mcpServer.url,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: authResult.task.id }),
	]);

	return c.json({
		mcpServerId,
		status: "deleted",
	});
};

const authenticateMcpServerRequest = async (
	authorizationHeader: string | undefined,
	mcpServerId: string,
) => {
	const token = getBearerToken(authorizationHeader);

	if (!token) {
		return {
			ok: false as const,
			status: 401 as const,
			error: "Unauthorized",
		};
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return {
			ok: false as const,
			status: 401 as const,
			error: "Unauthorized",
		};
	}

	const mcpServer = task.workspace.mcpServers?.find(
		(server) => server.id === mcpServerId,
	);

	if (!mcpServer) {
		return {
			ok: false as const,
			status: 404 as const,
			error: "MCP server not found",
		};
	}

	return {
		ok: true as const,
		task,
		mcpServer,
	};
};

const parseUpdateMcpServerBody = (
	value: unknown,
): UpdateMcpServerBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const body: UpdateMcpServerBody = {};

	if ("name" in value) {
		const name = getMcpServerName(value.name);

		if (!name) {
			return undefined;
		}

		body.name = name;
	}

	if ("url" in value) {
		const url = getMcpServerUrl(value.url);

		if (!url) {
			return undefined;
		}

		body.url = url;
	}

	if ("enabled" in value) {
		if (typeof value.enabled !== "boolean") {
			return undefined;
		}

		body.enabled = value.enabled;
	}

	if ("auth" in value) {
		const auth = parseMetadataOnlyAuth(value.auth);

		if (!auth) {
			return undefined;
		}

		body.auth = auth;
	}

	return Object.keys(body).length > 0 ? body : undefined;
};

const parseMetadataOnlyAuth = (
	value: unknown,
): UpdateMcpServerBody["auth"] | undefined => {
	if (!isRecord(value) || typeof value.type !== "string") {
		return undefined;
	}

	if (
		value.type === "none" ||
		value.type === "oauth" ||
		value.type === "client_credentials"
	) {
		return { type: value.type };
	}

	return undefined;
};

const createMetadataOnlyAuth = (value: {
	type: "none" | "oauth" | "client_credentials";
}) => {
	if (value.type === "oauth") {
		return { type: "oauth", status: "not_connected" };
	}

	if (value.type === "client_credentials") {
		return { type: "client_credentials", status: "not_configured" };
	}

	return { type: "none" };
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
