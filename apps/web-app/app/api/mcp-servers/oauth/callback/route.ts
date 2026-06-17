import { type NextRequest, NextResponse } from "next/server";
import { createEncryptionService } from "@/encryption";
import db from "@/instant.admin";
import { exchangeAuthorizationCode, parseOAuthState } from "../../_lib/oauth";

type PendingOAuthAuth = {
	type: "oauth";
	issuer?: string;
	authorizationUrl?: string;
	tokenUrl?: string;
	clientId?: string;
	clientSecretEncrypted?: string;
	scope?: string;
	resource?: string;
	pending?: {
		state: string;
		codeVerifierEncrypted: string;
		redirectUri: string;
	};
};

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const error = url.searchParams.get("error");

	if (error) {
		return renderMessage(`MCP OAuth failed: ${error}`, 400);
	}

	if (!code || !state) {
		return renderMessage("MCP OAuth callback is missing code or state.", 400);
	}

	const parsedState = parseOAuthState(state);

	if (!parsedState) {
		return renderMessage("MCP OAuth state is invalid.", 400);
	}

	const mcpServer = await getMcpServer(parsedState.mcpServerId);

	if (!mcpServer) {
		return renderMessage("MCP server not found.", 404);
	}

	const auth = parsePendingOAuthAuth(mcpServer.auth);

	if (
		!auth.pending ||
		auth.pending.state !== state ||
		!auth.tokenUrl ||
		!auth.clientId
	) {
		return renderMessage("MCP OAuth state was not recognized.", 400);
	}

	try {
		const encryptionService = getEncryptionService();
		const codeVerifier = await encryptionService.decrypt(
			auth.pending.codeVerifierEncrypted,
		);
		const clientSecret = auth.clientSecretEncrypted
			? await encryptionService.decrypt(auth.clientSecretEncrypted)
			: undefined;
		const token = await exchangeAuthorizationCode({
			tokenUrl: auth.tokenUrl,
			code,
			redirectUri: auth.pending.redirectUri,
			clientId: auth.clientId,
			clientSecret,
			codeVerifier,
			resource: auth.resource,
		});
		const now = Date.now();
		const tx = db.tx.mcpServers[parsedState.mcpServerId];

		if (!tx) {
			return renderMessage("MCP server not found.", 404);
		}

		await db.transact(
			tx.update({
				auth: {
					type: "oauth",
					status: "connected",
					issuer: auth.issuer,
					authorizationUrl: auth.authorizationUrl,
					tokenUrl: auth.tokenUrl,
					clientId: auth.clientId,
					clientSecretEncrypted: auth.clientSecretEncrypted,
					scope: auth.scope,
					resource: auth.resource,
					accessTokenEncrypted: await encryptionService.encrypt(
						token.accessToken,
					),
					refreshTokenEncrypted: token.refreshToken
						? await encryptionService.encrypt(token.refreshToken)
						: undefined,
					expiresAt: token.expiresIn
						? new Date(now + token.expiresIn * 1000).toISOString()
						: undefined,
					updatedAt: new Date(now).toISOString(),
				},
				updatedAt: new Date(now).toISOString(),
			}),
		);

		return renderMessage("MCP OAuth connected. You can close this tab.");
	} catch (error) {
		return renderMessage(
			error instanceof Error
				? error.message
				: "Failed to complete MCP OAuth flow.",
			400,
		);
	}
}

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

const parsePendingOAuthAuth = (value: unknown): PendingOAuthAuth => {
	if (!isRecord(value) || value.type !== "oauth") {
		return { type: "oauth" };
	}

	const pending = isRecord(value.pending)
		? {
				state: getOptionalString(value.pending.state) ?? "",
				codeVerifierEncrypted:
					getOptionalString(value.pending.codeVerifierEncrypted) ?? "",
				redirectUri: getOptionalString(value.pending.redirectUri) ?? "",
			}
		: undefined;

	return {
		type: "oauth",
		issuer: getOptionalString(value.issuer),
		authorizationUrl: getOptionalString(value.authorizationUrl),
		tokenUrl: getOptionalString(value.tokenUrl),
		clientId: getOptionalString(value.clientId),
		clientSecretEncrypted: getOptionalString(value.clientSecretEncrypted),
		scope: getOptionalString(value.scope),
		resource: getOptionalString(value.resource),
		pending:
			pending?.state && pending.codeVerifierEncrypted && pending.redirectUri
				? pending
				: undefined,
	};
};

const getEncryptionService = () => {
	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured");
	}

	return createEncryptionService(encryptionKey);
};

const renderMessage = (message: string, status = 200) =>
	new NextResponse(
		`<!doctype html><html><body><p>${escapeHtml(message)}</p></body></html>`,
		{
			status,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		},
	);

const escapeHtml = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

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
