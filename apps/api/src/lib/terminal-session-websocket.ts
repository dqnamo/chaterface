import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import db from "@repo/db/admin";
import type { CommandHandle } from "e2b/dist/index.mjs";
import { type RawData, WebSocket, WebSocketServer } from "ws";
import { E2BSandbox as Sandbox } from "./e2b-sandbox.js";

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

type ClientMessage =
	| {
			type: "input";
			data: string;
	  }
	| {
			type: "resize";
			cols: number;
			rows: number;
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
	let sandbox: Sandbox | undefined;
	let handle: CommandHandle | undefined;

	try {
		sendJson(ws, {
			type: "status",
			status: "connecting",
		});

		sandbox = await Sandbox.connect(context.sandboxId);
		handle = await sandbox.pty.connect(context.pid, {
			timeoutMs: 0,
			onData: (data) => {
				sendJson(ws, {
					type: "data",
					data: new TextDecoder().decode(data),
				});
			},
		});

		sendJson(ws, {
			type: "ready",
			pid: handle.pid,
		});

		ws.on("message", (message) => {
			void handleClientMessage(ws, sandbox, context, message);
		});

		ws.on("close", () => {
			void handle?.disconnect();
		});
	} catch (error) {
		sendJson(ws, {
			type: "error",
			message: serializeError(error),
		});
		ws.close(1011, "Failed to connect terminal session");
		await handle?.disconnect();
	}
};

const handleClientMessage = async (
	ws: WebSocket,
	sandbox: Sandbox | undefined,
	context: TerminalSessionContext,
	message: RawData,
) => {
	if (!sandbox) {
		return;
	}

	const parsed = parseClientMessage(message);

	if (!parsed) {
		sendJson(ws, {
			type: "error",
			message: "Invalid terminal message",
		});
		return;
	}

	if (parsed.type === "input") {
		await sandbox.pty.sendInput(
			context.pid,
			new TextEncoder().encode(parsed.data),
		);
		await touchTerminalSession(context.terminalSessionId);
		return;
	}

	await sandbox.pty.resize(context.pid, {
		cols: parsed.cols,
		rows: parsed.rows,
	});
	await updateTerminalSessionSize(
		context.terminalSessionId,
		parsed.cols,
		parsed.rows,
	);
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
				agent: {
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

	const sandboxId =
		terminalSession.task?.sandboxId ?? terminalSession.agent?.sandboxId;

	if (!sandboxId) {
		throw new UpgradeError(409, "Terminal session is missing sandbox id");
	}

	return {
		terminalSessionId,
		sandboxId,
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

const parseClientMessage = (message: RawData): ClientMessage | null => {
	if (!Buffer.isBuffer(message)) {
		return null;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(message.toString("utf8"));
	} catch {
		return null;
	}

	if (!isRecord(parsed) || typeof parsed.type !== "string") {
		return null;
	}

	if (parsed.type === "input" && typeof parsed.data === "string") {
		return {
			type: "input",
			data: parsed.data,
		};
	}

	if (
		parsed.type === "resize" &&
		typeof parsed.cols === "number" &&
		typeof parsed.rows === "number" &&
		Number.isInteger(parsed.cols) &&
		Number.isInteger(parsed.rows) &&
		parsed.cols > 0 &&
		parsed.rows > 0
	) {
		return {
			type: "resize",
			cols: parsed.cols,
			rows: parsed.rows,
		};
	}

	return null;
};

const updateTerminalSessionSize = async (
	terminalSessionId: string,
	cols: number,
	rows: number,
) => {
	await db.transact(
		terminalSessionTx(terminalSessionId).update({
			cols,
			rows,
			lastActivityAt: new Date().toISOString(),
		}),
	);
};

const touchTerminalSession = async (terminalSessionId: string) => {
	await db.transact(
		terminalSessionTx(terminalSessionId).update({
			lastActivityAt: new Date().toISOString(),
		}),
	);
};

const terminalSessionTx = (terminalSessionId: string) => {
	const tx = db.tx.terminalSessions[terminalSessionId];

	if (!tx) {
		throw new Error(
			`Terminal session transaction builder ${terminalSessionId} not found`,
		);
	}

	return tx;
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

const serializeError = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
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
