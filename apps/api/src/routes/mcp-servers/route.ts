import db, { id } from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import { getBearerToken, getTaskForAgentToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";
import {
	getMcpAuthSummary,
	HTTP_HEADER_NAME_PATTERN,
	MCP_SERVER_NAME_PATTERN,
	type McpAuthConfig,
} from "../../lib/mcp-auth.js";

type CreateMcpServerBody = {
	name: string;
	url: string;
	enabled?: boolean;
	auth?: CreateMcpAuthBody;
};

type CreateMcpAuthBody =
	| { type?: "none" }
	| { type: "bearer"; token: string }
	| { type: "headers"; headers: Array<{ name: string; value: string }> }
	| {
			type: "oauth";
			issuer?: string;
			authorizationUrl?: string;
			tokenUrl?: string;
			clientId?: string;
			clientSecret?: string;
			scope?: string;
			resource?: string;
	  }
	| {
			type: "client_credentials";
			tokenUrl: string;
			clientId: string;
			clientSecret: string;
			scope?: string;
			resource?: string;
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
		mcpServers: (task.factory.mcpServers ?? []).map((server) => ({
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
					"Expected name, url, optional enabled, and optional auth when creating an MCP server",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const auth = await createMcpAuthConfig(body.auth);
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
			.link({ factory: task.factory.id }),
		eventTx(id())
			.create({
				type: "factoryplane.mcp_server_created",
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

	return {
		name,
		url,
		enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
		auth: parseCreateMcpAuthBody(value.auth),
	};
};

const parseCreateMcpAuthBody = (
	value: unknown,
): CreateMcpAuthBody | undefined => {
	if (!isRecord(value) || !("type" in value)) {
		return undefined;
	}

	if (value.type === "none") {
		return { type: "none" };
	}

	if (value.type === "bearer" && typeof value.token === "string") {
		return { type: "bearer", token: value.token };
	}

	if (value.type === "headers" && Array.isArray(value.headers)) {
		const headers = value.headers.flatMap((header) => {
			if (!isRecord(header)) {
				return [];
			}

			const name = getHeaderName(header.name);

			if (!name || typeof header.value !== "string") {
				return [];
			}

			return [{ name, value: header.value }];
		});

		return headers.length > 0 ? { type: "headers", headers } : undefined;
	}

	if (value.type === "oauth") {
		return {
			type: "oauth",
			issuer: getOptionalString(value.issuer),
			authorizationUrl: getOptionalUrl(value.authorizationUrl),
			tokenUrl: getOptionalUrl(value.tokenUrl),
			clientId: getOptionalString(value.clientId),
			clientSecret:
				typeof value.clientSecret === "string" && value.clientSecret.length > 0
					? value.clientSecret
					: undefined,
			scope: getOptionalString(value.scope),
			resource: getOptionalString(value.resource),
		};
	}

	if (value.type === "client_credentials") {
		const tokenUrl = getOptionalUrl(value.tokenUrl);
		const clientId = getOptionalString(value.clientId);
		const clientSecret =
			typeof value.clientSecret === "string" && value.clientSecret.length > 0
				? value.clientSecret
				: undefined;

		if (!tokenUrl || !clientId || !clientSecret) {
			return undefined;
		}

		return {
			type: "client_credentials",
			tokenUrl,
			clientId,
			clientSecret,
			scope: getOptionalString(value.scope),
			resource: getOptionalString(value.resource),
		};
	}

	return undefined;
};

const createMcpAuthConfig = async (
	body: CreateMcpAuthBody | undefined,
): Promise<McpAuthConfig> => {
	if (!body?.type || body.type === "none") {
		return { type: "none" };
	}

	if (body.type === "oauth") {
		const encryptionService = body.clientSecret
			? getEncryptionService()
			: undefined;

		return {
			type: "oauth",
			status: "not_connected",
			issuer: body.issuer,
			authorizationUrl: body.authorizationUrl,
			tokenUrl: body.tokenUrl,
			clientId: body.clientId,
			clientSecretEncrypted:
				body.clientSecret && encryptionService
					? await encryptionService.encrypt(body.clientSecret)
					: undefined,
			scope: body.scope,
			resource: body.resource,
			updatedAt: new Date().toISOString(),
		};
	}

	if (body.type === "client_credentials") {
		const encryptionService = getEncryptionService();

		return {
			type: "client_credentials",
			status: "configured",
			tokenUrl: body.tokenUrl,
			clientId: body.clientId,
			clientSecretEncrypted: await encryptionService.encrypt(body.clientSecret),
			scope: body.scope,
			resource: body.resource,
			updatedAt: new Date().toISOString(),
		};
	}

	const encryptionService = getEncryptionService();
	const now = new Date().toISOString();

	if (body.type === "bearer") {
		return {
			type: "bearer",
			tokenEncrypted: await encryptionService.encrypt(body.token),
			updatedAt: now,
		};
	}

	if (body.type !== "headers") {
		return { type: "none" };
	}

	return {
		type: "headers",
		headers: await Promise.all(
			body.headers.map(async (header) => ({
				id: id(),
				name: header.name,
				valueEncrypted: await encryptionService.encrypt(header.value),
				createdAt: now,
			})),
		),
		updatedAt: now,
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

const getHeaderName = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return HTTP_HEADER_NAME_PATTERN.test(trimmed) ? trimmed : undefined;
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalUrl = (value: unknown) => {
	const trimmed = getOptionalString(value);

	if (!trimmed) {
		return undefined;
	}

	try {
		const url = new URL(trimmed);

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return undefined;
		}

		return url.toString();
	} catch {
		return undefined;
	}
};

const getEncryptionService = () => {
	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured");
	}

	return createEncryptionService(encryptionKey);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
