import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createEncryptionService } from "@/encryption";
import db from "@/instant.admin";

type McpAuthBody =
	| { type: "none" }
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

const HTTP_HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

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
			{ message: "A valid MCP auth configuration is required" },
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

const buildMcpAuth = async (body: McpAuthBody) => {
	const now = new Date().toISOString();

	if (body.type === "none") {
		return { type: "none" };
	}

	if (body.type === "oauth") {
		const encryptionService = getEncryptionService();

		return {
			type: "oauth",
			status: "not_connected",
			issuer: body.issuer,
			authorizationUrl: body.authorizationUrl,
			tokenUrl: body.tokenUrl,
			clientId: body.clientId,
			clientSecretEncrypted: body.clientSecret
				? await encryptionService.encrypt(body.clientSecret)
				: undefined,
			scope: body.scope,
			resource: body.resource,
			updatedAt: now,
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
			updatedAt: now,
		};
	}

	const encryptionService = getEncryptionService();

	if (body.type === "bearer") {
		return {
			type: "bearer",
			tokenEncrypted: await encryptionService.encrypt(body.token),
			updatedAt: now,
		};
	}

	return {
		type: "headers",
		headers: await Promise.all(
			body.headers.map(async (header) => ({
				id: randomUUID(),
				name: header.name,
				valueEncrypted: await encryptionService.encrypt(header.value),
				createdAt: now,
			})),
		),
		updatedAt: now,
	};
};

const summarizeAuth = (auth: Awaited<ReturnType<typeof buildMcpAuth>>) => {
	if (auth.type === "bearer") {
		return { type: "bearer", configured: true };
	}

	if (auth.type === "headers") {
		return {
			type: "headers",
			headers: (auth.headers ?? []).map((header) => ({
				id: header.id,
				name: header.name,
				createdAt: header.createdAt,
			})),
		};
	}

	return {
		type: auth.type,
		status: "status" in auth ? auth.status : undefined,
	};
};

const getEncryptionService = () => {
	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured");
	}

	return createEncryptionService(encryptionKey);
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

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
