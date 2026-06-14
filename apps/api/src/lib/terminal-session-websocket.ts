import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import db from "@repo/db/admin";
import { WebSocket, WebSocketServer } from "ws";

type TerminalSessionTicket = {
	terminalSessionId: string;
	userId: string;
	exp: number;
};

type TerminalSessionContext = {
	terminalSessionId: string;
	sandboxId: string;
	pid: number;
};

const terminalSessionPathPattern = /^\/terminal-sessions\/([^/]+)\/connect$/;

export const attachTerminalSessionWebSocket = (server: Server) => {
	const wss = new WebSocketServer({ noServer: true });
	const contexts = new WeakMap<WebSocket, TerminalSessionContext>();

	server.on("upgrade", async (request, socket, head) => {
		const url = getRequestUrl(request);
		const match = url?.pathname.match(terminalSessionPathPattern);

		if (!url || !match) {
			socket.destroy();
			return;
		}

		try {
			const context = await getTerminalSessionContext(
				decodeURIComponent(match[1] ?? ""),
				url.searchParams.get("ticket"),
			);

			wss.handleUpgrade(request, socket, head, (ws) => {
				contexts.set(ws, context);
				wss.emit("connection", ws, request);
			});
		} catch (error) {
			writeUpgradeError(socket, error);
		}
	});

	wss.on("connection", (ws) => {
		const context = contexts.get(ws);

		if (!context) {
			ws.close(1011, "Missing terminal session context");
			return;
		}

		void bridgeTerminalSession(ws, context);
	});
};

const bridgeTerminalSession = async (
	ws: WebSocket,
	context: TerminalSessionContext,
) => {
	console.log("Terminal attach is unavailable for Upstash Box sessions", {
		terminalSessionId: context.terminalSessionId,
		sandboxId: context.sandboxId,
		pid: context.pid,
	});
	sendJson(ws, {
		type: "error",
		message:
			"Interactive terminal attach is not supported by the Upstash Box SDK.",
	});
	ws.close(1011, "Terminal attach is not supported");
};

const getTerminalSessionContext = async (
	terminalSessionId: string,
	ticket: string | null,
): Promise<TerminalSessionContext> => {
	if (!terminalSessionId) {
		throw new UpgradeError(400, "Missing terminal session id");
	}

	const payload = verifyTicket(ticket);

	if (payload.terminalSessionId !== terminalSessionId) {
		throw new UpgradeError(403, "Terminal session ticket mismatch");
	}

	const terminalSession = await db
		.query({
			terminalSessions: {
				$: {
					fields: ["pid"],
					where: {
						id: terminalSessionId,
					},
				},
				task: {
					$: {
						fields: ["sandboxId"],
					},
				},
			},
		})
		.then((result) => result.terminalSessions[0]);

	if (!terminalSession) {
		throw new UpgradeError(404, "Terminal session not found");
	}

	if (typeof terminalSession.pid !== "number") {
		throw new UpgradeError(409, "Terminal session is missing pid");
	}

	if (!terminalSession.task?.sandboxId) {
		throw new UpgradeError(409, "Task is missing sandbox id");
	}

	return {
		terminalSessionId,
		sandboxId: terminalSession.task.sandboxId,
		pid: terminalSession.pid,
	};
};

const verifyTicket = (ticket: string | null): TerminalSessionTicket => {
	if (!ticket) {
		throw new UpgradeError(401, "Missing terminal session ticket");
	}

	const [payload, signature] = ticket.split(".");

	if (!payload || !signature || !isValidSignature(payload, signature)) {
		throw new UpgradeError(401, "Invalid terminal session ticket");
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
	} catch {
		throw new UpgradeError(401, "Invalid terminal session ticket");
	}

	if (!isTerminalSessionTicket(parsed)) {
		throw new UpgradeError(401, "Invalid terminal session ticket");
	}

	if (parsed.exp < Date.now()) {
		throw new UpgradeError(401, "Terminal session ticket expired");
	}

	return parsed;
};

const isValidSignature = (payload: string, signature: string) => {
	const expected = createHmac("sha256", getTicketSecret())
		.update(payload)
		.digest("base64url");
	const actualBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expected);

	return (
		actualBuffer.byteLength === expectedBuffer.byteLength &&
		timingSafeEqual(actualBuffer, expectedBuffer)
	);
};

const isTerminalSessionTicket = (
	value: unknown,
): value is TerminalSessionTicket => {
	return (
		isRecord(value) &&
		typeof value.terminalSessionId === "string" &&
		typeof value.userId === "string" &&
		typeof value.exp === "number"
	);
};

const sendJson = (ws: WebSocket, value: unknown) => {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(value));
	}
};

const getRequestUrl = (request: IncomingMessage) => {
	const host = request.headers.host;

	if (!host || !request.url) {
		return undefined;
	}

	return new URL(request.url, `http://${host}`);
};

const writeUpgradeError = (socket: Duplex, error: unknown) => {
	const status = error instanceof UpgradeError ? error.status : 500;
	const message =
		error instanceof UpgradeError
			? error.message
			: "Failed to connect terminal session";

	socket.write(
		`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${message}`,
	);
	socket.destroy();
};

const getTicketSecret = () => {
	const secret =
		process.env.FACTORYPLANE_TERMINAL_SESSION_SECRET ??
		process.env.FACTORYPLANE_PREVIEW_SESSION_SECRET;

	if (!secret) {
		throw new UpgradeError(
			500,
			"FACTORYPLANE_TERMINAL_SESSION_SECRET is not configured",
		);
	}

	return secret;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

class UpgradeError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}
