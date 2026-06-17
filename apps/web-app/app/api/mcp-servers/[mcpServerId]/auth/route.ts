import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";

type McpAuthBody = { type: "oauth" };

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ mcpServerId: string }> },
) {
	const { mcpServerId } = await params;

	if (!(await authenticate(req))) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = parseMcpAuthBody(await req.json());

	if (!body) {
		return NextResponse.json(
			{ message: "Only OAuth MCP auth is supported" },
			{ status: 400 },
		);
	}

	const mcpServer = await getMcpServer(mcpServerId);

	if (!mcpServer) {
		return NextResponse.json(
			{ message: "MCP server not found" },
			{ status: 404 },
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

const authenticate = async (req: NextRequest) => {
	const authorizationHeader = req.headers.get("Authorization");
	const refreshToken = authorizationHeader?.startsWith("Bearer ")
		? authorizationHeader.slice("Bearer ".length)
		: undefined;

	if (!refreshToken) {
		return undefined;
	}

	try {
		return await db.auth.verifyToken(refreshToken);
	} catch {
		return undefined;
	}
};

const getMcpServer = async (mcpServerId: string) => {
	return db
		.query({
			mcpServers: {
				$: {
					where: {
						id: mcpServerId,
					},
					fields: ["auth"],
				},
			},
		})
		.then((data) => data.mcpServers[0]);
};

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
