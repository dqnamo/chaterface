"use client";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

type TerminalSessionLiveProps = {
	terminalSessionId: string;
	userToken: string | undefined;
};

type ServerMessage =
	| {
			type: "ready";
			pid: number;
	  }
	| {
			type: "status";
			status: string;
	  }
	| {
			type: "data";
			data: string;
	  }
	| {
			type: "error";
			message: string;
	  };

export function TerminalSessionLive({
	terminalSessionId,
	userToken,
}: TerminalSessionLiveProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		const terminal = new Terminal({
			allowProposedApi: false,
			convertEol: true,
			cursorBlink: true,
			disableStdin: !userToken,
			fontFamily: "var(--font-mono)",
			fontSize: 12,
			lineHeight: 1.25,
			scrollback: 5000,
			theme: {
				background: "#0f172a",
				foreground: "#e2e8f0",
				cursor: "#e2e8f0",
				selectionBackground: "#334155",
			},
		});
		const fitAddon = new FitAddon();
		let ws: WebSocket | undefined;
		let resizeObserver: ResizeObserver | undefined;
		let disposed = false;

		const sendResize = () => {
			if (ws?.readyState !== WebSocket.OPEN) {
				return;
			}

			ws.send(
				JSON.stringify({
					type: "resize",
					cols: terminal.cols,
					rows: terminal.rows,
				}),
			);
		};

		terminal.loadAddon(fitAddon);
		terminal.open(container);
		fitAddon.fit();

		const inputDisposable = terminal.onData((data) => {
			if (ws?.readyState === WebSocket.OPEN) {
				ws.send(
					JSON.stringify({
						type: "input",
						data,
					}),
				);
			}
		});
		const resizeDisposable = terminal.onResize(sendResize);

		resizeObserver = new ResizeObserver(() => {
			fitAddon.fit();
			sendResize();
		});
		resizeObserver.observe(container);

		if (!userToken) {
			terminal.writeln("Sign in to connect to this terminal session.");
			return () => {
				disposed = true;
				resizeObserver?.disconnect();
				resizeDisposable.dispose();
				inputDisposable.dispose();
				terminal.dispose();
			};
		}

		terminal.writeln("Connecting terminal session...");

		const connect = async () => {
			try {
				const response = await fetch("/api/terminal-sessions/session", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${userToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ terminalSessionId }),
				});

				if (!response.ok) {
					throw new Error(await getSessionError(response));
				}

				const data = await response.json();
				const url = typeof data.url === "string" ? data.url : undefined;

				if (!url) {
					throw new Error("Terminal session response is missing url");
				}

				if (disposed) {
					return;
				}

				ws = new WebSocket(url);

				ws.addEventListener("open", () => {
					terminal.clear();
					sendResize();
				});

				ws.addEventListener("message", (event) => {
					const message = parseServerMessage(event.data);

					if (!message) {
						return;
					}

					if (message.type === "data") {
						terminal.write(message.data);
						return;
					}

					if (message.type === "error") {
						terminal.writeln(`\r\n${message.message}`);
					}
				});

				ws.addEventListener("close", () => {
					if (!disposed) {
						terminal.writeln("\r\nTerminal disconnected.");
					}
				});

				ws.addEventListener("error", () => {
					terminal.writeln("\r\nTerminal connection failed.");
				});
			} catch (error) {
				if (!disposed) {
					terminal.writeln(
						error instanceof Error
							? `\r\n${error.message}`
							: "\r\nFailed to connect terminal session.",
					);
				}
			}
		};

		void connect();

		return () => {
			disposed = true;
			ws?.close();
			resizeObserver?.disconnect();
			resizeDisposable.dispose();
			inputDisposable.dispose();
			terminal.dispose();
		};
	}, [terminalSessionId, userToken]);

	return <div ref={containerRef} className="h-full min-h-0 w-full" />;
}

async function getSessionError(response: Response) {
	try {
		const data = await response.json();

		if (typeof data.message === "string") {
			return data.message;
		}
	} catch {
		return "Failed to create terminal session";
	}

	return "Failed to create terminal session";
}

function parseServerMessage(value: unknown): ServerMessage | null {
	if (typeof value !== "string") {
		return null;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(value);
	} catch {
		return null;
	}

	if (!isRecord(parsed) || typeof parsed.type !== "string") {
		return null;
	}

	if (parsed.type === "ready" && typeof parsed.pid === "number") {
		return {
			type: "ready",
			pid: parsed.pid,
		};
	}

	if (parsed.type === "status" && typeof parsed.status === "string") {
		return {
			type: "status",
			status: parsed.status,
		};
	}

	if (parsed.type === "data" && typeof parsed.data === "string") {
		return {
			type: "data",
			data: parsed.data,
		};
	}

	if (parsed.type === "error" && typeof parsed.message === "string") {
		return {
			type: "error",
			message: parsed.message,
		};
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
