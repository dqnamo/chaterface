import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	authErrorResponse,
	authenticateMcpServerRequest,
} from "../../../_lib/auth";

type McpAuthBody = { type: "oauth" };

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ mcpServerId: string }> },
) {
	const { mcpServerId } = await params;
	const authResult = await authenticateMcpServerRequest(req, mcpServerId);

	if (!authResult.ok) {
		return authErrorResponse(authResult);
	}

	const body = parseMcpAuthBody(await req.json());

	if (!body) {
		return NextResponse.json(
			{ message: "Only OAuth MCP auth is supported" },
			{ status: 400 },
		);
	}

	let auth: Awaited<ReturnType<typeof buildMcpAuth>>;

	try {
		auth = await buildMcpAuth(body);
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error ? error.message : "Failed to build MCP auth",
			},
			{ status: 400 },
		);
	}
	const tx = db.tx.mcpServers[mcpServerId];

	if (!tx) {
		return NextResponse.json(
			{ message: "MCP server not found" },
			{ status: 404 },
		);
	}

	await db.transact(
		tx.update({
			auth,
			updatedAt: new Date().toISOString(),
		}),
	);

	return NextResponse.json({
		auth: summarizeAuth(auth),
	});
}

const parseMcpAuthBody = (value: unknown): McpAuthBody | undefined => {
	if (!isRecord(value) || typeof value.type !== "string") {
		return undefined;
	}

	if (value.type === "oauth") {
		return { type: "oauth" };
	}

	return undefined;
};

const buildMcpAuth = (_body: McpAuthBody) => {
	const now = new Date().toISOString();

	return {
		type: "oauth",
		status: "not_connected",
		updatedAt: now,
	};
};

const summarizeAuth = (auth: ReturnType<typeof buildMcpAuth>) => {
	return {
		type: auth.type,
		status: auth.status,
	};
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
