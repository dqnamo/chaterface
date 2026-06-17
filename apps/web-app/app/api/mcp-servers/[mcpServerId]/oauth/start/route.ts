import { type NextRequest, NextResponse } from "next/server";
import { createEncryptionService } from "@/encryption";
import db from "@/instant.admin";
import {
	createOAuthState,
	createPkceChallenge,
	createPkceVerifier,
	discoverOAuthMetadata,
	registerOAuthClient,
} from "../../../_lib/oauth";

type OAuthAuth = {
	type: "oauth";
	status?: string;
	issuer?: string;
	authorizationUrl?: string;
	tokenUrl?: string;
	clientId?: string;
	clientSecretEncrypted?: string;
	scope?: string;
	resource?: string;
};

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ mcpServerId: string }> },
) {
	const { mcpServerId } = await params;

	if (!(await authenticate(req))) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const mcpServer = await getMcpServer(mcpServerId);

	if (!mcpServer) {
		return NextResponse.json(
			{ message: "MCP server not found" },
			{ status: 404 },
		);
	}

	const auth = parseOAuthAuth(mcpServer.auth);
	const redirectUri = new URL(
		"/api/mcp-servers/oauth/callback",
		req.url,
	).toString();

	try {
		const metadata = await discoverOAuthMetadata(mcpServer.url, auth);
		const encryptionService = getEncryptionService();
		const dynamicClient =
			auth.clientId || !metadata.registrationUrl
				? undefined
				: await registerOAuthClient(metadata.registrationUrl, redirectUri);
		const clientId = auth.clientId ?? dynamicClient?.clientId;

		if (!clientId) {
			return NextResponse.json(
				{ message: "OAuth clientId is required for this MCP server" },
				{ status: 400 },
			);
		}

		const verifier = createPkceVerifier();
		const state = createOAuthState(mcpServerId);
		const authorizationUrl = new URL(metadata.authorizationUrl);

		authorizationUrl.searchParams.set("response_type", "code");
		authorizationUrl.searchParams.set("client_id", clientId);
		authorizationUrl.searchParams.set("redirect_uri", redirectUri);
		authorizationUrl.searchParams.set("state", state);
		authorizationUrl.searchParams.set(
			"code_challenge",
			createPkceChallenge(verifier),
		);
		authorizationUrl.searchParams.set("code_challenge_method", "S256");

		const scope = auth.scope;

		if (scope) {
			authorizationUrl.searchParams.set("scope", scope);
		}

		if (metadata.resource) {
			authorizationUrl.searchParams.set("resource", metadata.resource);
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
				auth: {
					type: "oauth",
					status: "pending",
					issuer: metadata.issuer,
					authorizationUrl: metadata.authorizationUrl,
					tokenUrl: metadata.tokenUrl,
					clientId,
					clientSecretEncrypted: dynamicClient?.clientSecret
						? await encryptionService.encrypt(dynamicClient.clientSecret)
						: auth.clientSecretEncrypted,
					scope,
					resource: metadata.resource,
					pending: {
						state,
						codeVerifierEncrypted: await encryptionService.encrypt(verifier),
						redirectUri,
					},
					updatedAt: new Date().toISOString(),
				},
				updatedAt: new Date().toISOString(),
			}),
		);

		return NextResponse.json({
			authorizationUrl: authorizationUrl.toString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? error.message
						: "Failed to start MCP OAuth flow",
			},
			{ status: 400 },
		);
	}
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
					fields: ["url", "auth"],
				},
			},
		})
		.then((data) => data.mcpServers[0]);
};

const parseOAuthAuth = (value: unknown): OAuthAuth => {
	if (!isRecord(value) || value.type !== "oauth") {
		return { type: "oauth" };
	}

	return {
		type: "oauth",
		status: getOptionalString(value.status),
		issuer: getOptionalString(value.issuer),
		authorizationUrl: getOptionalString(value.authorizationUrl),
		tokenUrl: getOptionalString(value.tokenUrl),
		clientId: getOptionalString(value.clientId),
		clientSecretEncrypted: getOptionalString(value.clientSecretEncrypted),
		scope: getOptionalString(value.scope),
		resource: getOptionalString(value.resource),
	};
};

const getEncryptionService = () => {
	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured");
	}

	return createEncryptionService(encryptionKey);
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
