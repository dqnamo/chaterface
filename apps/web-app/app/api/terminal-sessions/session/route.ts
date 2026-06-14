import { createHmac } from "node:crypto";
import db from "@/instant.admin";
import { type NextRequest, NextResponse } from "next/server";

type TerminalSessionTicket = {
	terminalSessionId: string;
	userId: string;
	exp: number;
};

const ticketTtlMs = 60 * 1000;

export async function POST(req: NextRequest) {
	const authorizationHeader = req.headers.get("Authorization");
	const refreshToken = authorizationHeader?.startsWith("Bearer ")
		? authorizationHeader.slice("Bearer ".length)
		: undefined;

	if (!refreshToken) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const user = await db.auth.verifyToken(refreshToken);

	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json();
	const terminalSessionId = getNonEmptyString(body?.terminalSessionId);

	if (!terminalSessionId) {
		return NextResponse.json(
			{ message: "Expected terminalSessionId" },
			{ status: 400 },
		);
	}

	const terminalSession = await db
		.query({
			terminalSessions: {
				$: {
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
		return NextResponse.json(
			{ message: "Terminal session not found" },
			{ status: 404 },
		);
	}

	if (typeof terminalSession.pid !== "number") {
		return NextResponse.json(
			{ message: "Terminal session is missing pid" },
			{ status: 409 },
		);
	}

	if (!terminalSession.task?.sandboxId) {
		return NextResponse.json(
			{ message: "Task is missing sandbox id" },
			{ status: 409 },
		);
	}

	const ticket = signValue({
		terminalSessionId,
		userId: user.id,
		exp: Date.now() + ticketTtlMs,
	});

	return NextResponse.json({
		url: buildTerminalSessionUrl(terminalSessionId, ticket),
	});
}

const signValue = (value: TerminalSessionTicket) => {
	const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
	const signature = createHmac("sha256", getTicketSecret())
		.update(payload)
		.digest("base64url");

	return `${payload}.${signature}`;
};

const buildTerminalSessionUrl = (terminalSessionId: string, ticket: string) => {
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
	const url = new URL(
		`/terminal-sessions/${encodeURIComponent(terminalSessionId)}/connect`,
		apiUrl,
	);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	url.searchParams.set("ticket", ticket);

	return url.toString();
};

const getTicketSecret = () => {
	const secret =
		process.env.FACTORYPLANE_TERMINAL_SESSION_SECRET ??
		process.env.FACTORYPLANE_PREVIEW_SESSION_SECRET;

	if (!secret) {
		throw new Error("FACTORYPLANE_TERMINAL_SESSION_SECRET is not configured");
	}

	return secret;
};

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};
