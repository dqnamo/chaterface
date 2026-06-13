import db from "@repo/db/admin";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../lib/file-router.js";
import { applyMcpAuthHeaders } from "../../../lib/mcp-auth.js";

const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"content-length",
	"host",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
]);

const mcpServerTx = (mcpServerId: string) => {
	const tx = db.tx.mcpServers[mcpServerId];

	if (!tx) {
		throw new Error(`MCP server transaction builder ${mcpServerId} not found`);
	}

	return tx;
};

export const GET: RouteHandler = (c) => proxyMcpRequest(c);
export const POST: RouteHandler = (c) => proxyMcpRequest(c);
export const DELETE: RouteHandler = (c) => proxyMcpRequest(c);

const proxyMcpRequest: RouteHandler = async (c) => {
	const mcpServerId = c.req.param("mcpServerId");

	if (!mcpServerId) {
		return c.json({ error: "Missing MCP server id" }, 400);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const mcpServer = task.factory.mcpServers?.find(
		(server) => server.id === mcpServerId,
	);

	if (!mcpServer || mcpServer.enabled === false) {
		return c.json({ error: "MCP server not found" }, 404);
	}

	const targetUrl = getMcpServerUrl(mcpServer.url);

	if (!targetUrl) {
		return c.json({ error: "MCP server URL is invalid" }, 502);
	}

	for (const [key, value] of new URL(c.req.url).searchParams) {
		targetUrl.searchParams.append(key, value);
	}

	const headers = getForwardHeaders(c.req.raw.headers);

	try {
		const nextAuth = await applyMcpAuthHeaders(headers, mcpServer.auth);

		if (nextAuth) {
			await db.transact(
				mcpServerTx(mcpServer.id).update({
					auth: nextAuth,
					updatedAt: new Date().toISOString(),
				}),
			);
		}
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to apply MCP server auth",
			},
			502,
		);
	}

	let response: Response;

	try {
		response = await fetch(targetUrl, {
			method: c.req.method,
			headers,
			body: hasRequestBody(c.req.method) ? c.req.raw.body : undefined,
			duplex: "half",
		} as RequestInit & { duplex: "half" });
	} catch (error) {
		return c.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to reach MCP server",
			},
			502,
		);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: getResponseHeaders(response.headers),
	});
};

const getMcpServerUrl = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	try {
		const url = new URL(value);

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			return undefined;
		}

		return url;
	} catch {
		return undefined;
	}
};

const getForwardHeaders = (source: Headers) => {
	const headers = new Headers();

	for (const [name, value] of source) {
		const lowerName = name.toLowerCase();

		if (HOP_BY_HOP_HEADERS.has(lowerName) || lowerName === "authorization") {
			continue;
		}

		headers.set(name, value);
	}

	return headers;
};

const getResponseHeaders = (source: Headers) => {
	const headers = new Headers();

	for (const [name, value] of source) {
		if (HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
			continue;
		}

		headers.set(name, value);
	}

	return headers;
};

const hasRequestBody = (method: string) =>
	method !== "GET" && method !== "HEAD";
