import { createHmac, timingSafeEqual } from "node:crypto";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { Socket } from "node:net";
import db from "@repo/db/admin";
import httpProxy from "http-proxy";

type PreviewSession = {
	serviceId: string;
	userId: string;
	exp: number;
};

type PreviewService = {
	id: string;
	e2bHost?: string;
	task?: {
		sandboxTrafficAccessToken?: string;
	};
};

type ResolvedProxyRequest =
	| {
			ok: true;
			service: Required<Pick<PreviewService, "e2bHost">> & PreviewService;
			trafficAccessToken: string;
	  }
	| { ok: false; status: number; message: string };

const port = Number(process.env.PORT ?? 3003);
const previewsDomain =
	process.env.FACTORYPLANE_PREVIEWS_DOMAIN ?? "previews.factoryplane.com";
const cookieDomain =
	process.env.FACTORYPLANE_PREVIEW_COOKIE_DOMAIN ?? `.${previewsDomain}`;
const cookieName = process.env.FACTORYPLANE_PREVIEW_COOKIE_NAME ?? "fp_preview";
const sessionSecret = process.env.FACTORYPLANE_PREVIEW_SESSION_SECRET;
const sessionMaxAgeSeconds = 60 * 60 * 8;

const proxy = httpProxy.createProxyServer({
	changeOrigin: true,
	secure: true,
	ws: true,
});

proxy.on("error", (_error, _req, res) => {
	if (res instanceof Socket) {
		res.destroy();
		return;
	}

	if (!res.headersSent) {
		res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
	}

	res.end("Preview upstream failed");
});

proxy.on("proxyRes", (proxyRes: IncomingMessage, req: IncomingMessage) => {
	const rewrittenLocation = rewriteUpstreamLocation(
		proxyRes.headers.location,
		req.headers.host,
	);

	if (rewrittenLocation) {
		proxyRes.headers.location = rewrittenLocation;
	}
});

const server = createServer(async (req, res) => {
	try {
		await handleHttpRequest(req, res);
	} catch (error) {
		console.error(error);
		sendText(res, 500, "Preview proxy failed");
	}
});

server.on("upgrade", async (req, socket, head) => {
	try {
		const resolution = await resolveProxyRequest(req);

		if (!resolution.ok) {
			socket.write(
				`HTTP/1.1 ${resolution.status} ${resolution.message}\r\nConnection: close\r\n\r\n`,
			);
			socket.destroy();
			return;
		}

		proxy.ws(req, socket, head, {
			headers: {
				...getForwardedPreviewHeaders(req),
				"e2b-traffic-access-token": resolution.trafficAccessToken,
			},
			target: `wss://${resolution.service.e2bHost}`,
		});
	} catch (error) {
		console.error(error);
		socket.destroy();
	}
});

server.listen(port, () => {
	console.log(`previews listening on http://localhost:${port}`);
});

const handleHttpRequest = async (req: IncomingMessage, res: ServerResponse) => {
	if (req.url === "/health") {
		sendText(res, 200, "ok");
		return;
	}

	const url = getRequestUrl(req);

	if (url.pathname === "/__factoryplane/preview-session") {
		await handlePreviewSessionRequest(req, res, url);
		return;
	}

	const resolution = await resolveProxyRequest(req);

	if (!resolution.ok) {
		sendText(res, resolution.status, resolution.message);
		return;
	}

	proxy.web(req, res, {
		headers: {
			...getForwardedPreviewHeaders(req),
			"e2b-traffic-access-token": resolution.trafficAccessToken,
		},
		target: `https://${resolution.service.e2bHost}`,
	});
};

const handlePreviewSessionRequest = async (
	req: IncomingMessage,
	res: ServerResponse,
	url: URL,
) => {
	const serviceId = getServiceIdFromHost(req.headers.host);
	const ticket = url.searchParams.get("ticket");

	if (!serviceId || !ticket) {
		sendText(res, 400, "Missing preview session ticket");
		return;
	}

	const session = verifySignedValue<PreviewSession>(ticket);

	if (!session || session.serviceId !== serviceId) {
		sendText(res, 401, "Invalid preview session ticket");
		return;
	}

	const cookie = signValue({
		serviceId: session.serviceId,
		userId: session.userId,
		exp: Date.now() + sessionMaxAgeSeconds * 1000,
	});

	res.writeHead(302, {
		"cache-control": "no-store",
		location: "/",
		"set-cookie": serializeCookie(cookie),
	});
	res.end();
};

const resolveProxyRequest = async (
	req: IncomingMessage,
): Promise<ResolvedProxyRequest> => {
	const serviceId = getServiceIdFromHost(req.headers.host);

	if (!serviceId) {
		return { ok: false, status: 404, message: "Unknown preview host" };
	}

	const session = getPreviewSession(req);

	if (!session || session.serviceId !== serviceId) {
		return { ok: false, status: 401, message: "Preview auth required" };
	}

	const service = await getPreviewService(serviceId);

	if (!service?.e2bHost) {
		return {
			ok: false,
			status: 404,
			message:
				"Preview service is missing its E2B upstream. Stop it and start it again after deploying the latest API.",
		};
	}

	const trafficAccessToken = service.task?.sandboxTrafficAccessToken;

	if (!trafficAccessToken) {
		return {
			ok: false,
			status: 502,
			message: "Preview sandbox is missing a traffic access token",
		};
	}

	return {
		ok: true,
		service: service as Required<Pick<PreviewService, "e2bHost">> &
			PreviewService,
		trafficAccessToken,
	};
};

const getPreviewService = async (
	serviceId: string,
): Promise<PreviewService | undefined> => {
	const result = await db.query({
		services: {
			$: {
				where: {
					id: serviceId,
				},
			},
			task: {},
		},
	});

	return result.services[0] as PreviewService | undefined;
};

const getPreviewSession = (req: IncomingMessage) => {
	const cookieValue = parseCookies(req.headers.cookie)[cookieName];
	return cookieValue
		? verifySignedValue<PreviewSession>(cookieValue)
		: undefined;
};

const getServiceIdFromHost = (hostHeader: string | undefined) => {
	const host = hostHeader?.split(":")[0]?.toLowerCase();

	if (!host?.endsWith(`.${previewsDomain}`)) {
		return undefined;
	}

	const serviceId = host.slice(0, -1 * `.${previewsDomain}`.length);
	return serviceId && !serviceId.includes(".") ? serviceId : undefined;
};

const getRequestUrl = (req: IncomingMessage) => {
	const host = req.headers.host ?? previewsDomain;
	return new URL(req.url ?? "/", `https://${host}`);
};

const getForwardedPreviewHeaders = (
	req: IncomingMessage,
): Record<string, string> => {
	const host = req.headers.host?.split(":")[0]?.toLowerCase();

	if (!host?.endsWith(`.${previewsDomain}`)) {
		return {};
	}

	return {
		"x-forwarded-host": host,
		"x-forwarded-port": "443",
		"x-forwarded-proto": "https",
		"x-forwarded-ssl": "on",
	};
};

const rewriteUpstreamLocation = (
	location: string | string[] | undefined,
	hostHeader: string | undefined,
) => {
	const host = hostHeader?.split(":")[0]?.toLowerCase();

	if (typeof location !== "string" || !host?.endsWith(`.${previewsDomain}`)) {
		return undefined;
	}

	let url: URL;

	try {
		url = new URL(location, `https://${host}`);
	} catch {
		return undefined;
	}

	if (!url.hostname.endsWith(".e2b.app")) {
		return undefined;
	}

	url.protocol = "https:";
	url.host = host;

	return url.toString();
};

const signValue = (value: PreviewSession) => {
	if (!sessionSecret) {
		throw new Error("FACTORYPLANE_PREVIEW_SESSION_SECRET is not configured");
	}

	const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
	const signature = createHmac("sha256", sessionSecret)
		.update(payload)
		.digest("base64url");

	return `${payload}.${signature}`;
};

const verifySignedValue = <T>(value: string): T | undefined => {
	if (!sessionSecret) {
		throw new Error("FACTORYPLANE_PREVIEW_SESSION_SECRET is not configured");
	}

	const [payload, signature] = value.split(".");

	if (!payload || !signature) {
		return undefined;
	}

	const expected = createHmac("sha256", sessionSecret)
		.update(payload)
		.digest("base64url");

	if (!safeEqual(signature, expected)) {
		return undefined;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	} catch {
		return undefined;
	}

	if (!isRecord(parsed) || typeof parsed.exp !== "number") {
		return undefined;
	}

	if (parsed.exp < Date.now()) {
		return undefined;
	}

	return parsed as T;
};

const safeEqual = (a: string, b: string) => {
	const aBuffer = Buffer.from(a);
	const bBuffer = Buffer.from(b);

	return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
};

const parseCookies = (cookieHeader: string | undefined) => {
	const cookies: Record<string, string> = {};

	for (const part of cookieHeader?.split(";") ?? []) {
		const [rawName, ...rawValue] = part.trim().split("=");
		const name = rawName?.trim();

		if (name) {
			try {
				cookies[name] = decodeURIComponent(rawValue.join("="));
			} catch {}
		}
	}

	return cookies;
};

const serializeCookie = (value: string) => {
	const encodedValue = encodeURIComponent(value);
	return [
		`${cookieName}=${encodedValue}`,
		`Domain=${cookieDomain}`,
		"Path=/",
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
		`Max-Age=${sessionMaxAgeSeconds}`,
	].join("; ");
};

const sendText = (res: ServerResponse, status: number, body: string) => {
	res.writeHead(status, {
		"cache-control": "no-store",
		"content-type": "text/plain; charset=utf-8",
	});
	res.end(body);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
