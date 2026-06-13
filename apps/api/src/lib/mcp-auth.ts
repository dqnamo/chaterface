import { createEncryptionService } from "@repo/encryption";

export type McpAuthConfig =
	| { type: "none" }
	| { type: "bearer"; tokenEncrypted: string; updatedAt?: string }
	| {
			type: "headers";
			headers: Array<{
				id: string;
				name: string;
				valueEncrypted: string;
				createdAt?: string;
			}>;
			updatedAt?: string;
	  }
	| {
			type: "oauth";
			status?: string;
			issuer?: string;
			authorizationUrl?: string;
			tokenUrl?: string;
			clientId?: string;
			clientSecretEncrypted?: string;
			scope?: string;
			resource?: string;
			accessTokenEncrypted?: string;
			refreshTokenEncrypted?: string;
			expiresAt?: string;
			pending?: {
				state: string;
				codeVerifierEncrypted: string;
				redirectUri: string;
			};
			updatedAt?: string;
	  }
	| {
			type: "client_credentials";
			status?: string;
			tokenUrl?: string;
			clientId?: string;
			clientSecretEncrypted?: string;
			scope?: string;
			resource?: string;
			updatedAt?: string;
	  };

export const MCP_SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
export const HTTP_HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

type EncryptionService = ReturnType<typeof createEncryptionService>;

export const getMcpAuthSummary = (auth: unknown) => {
	const parsed = parseMcpAuthConfig(auth);

	if (parsed.type === "bearer") {
		return { type: "bearer", configured: true };
	}

	if (parsed.type === "headers") {
		return {
			type: "headers",
			headers: parsed.headers.map((header) => ({
				id: header.id,
				name: header.name,
				createdAt: header.createdAt,
			})),
		};
	}

	if (parsed.type === "oauth") {
		return {
			type: "oauth",
			status: parsed.status ?? "not_connected",
			issuer: parsed.issuer,
			authorizationUrl: parsed.authorizationUrl,
			tokenUrl: parsed.tokenUrl,
			clientId: parsed.clientId,
			scope: parsed.scope,
			resource: parsed.resource,
			connected: Boolean(
				parsed.accessTokenEncrypted || parsed.refreshTokenEncrypted,
			),
		};
	}

	if (parsed.type === "client_credentials") {
		return {
			type: "client_credentials",
			status: parsed.status ?? "not_configured",
			tokenUrl: parsed.tokenUrl,
			clientId: parsed.clientId,
			scope: parsed.scope,
			resource: parsed.resource,
			configured: Boolean(parsed.clientSecretEncrypted),
		};
	}

	return { type: "none" };
};

export const applyMcpAuthHeaders = async (
	headers: Headers,
	auth: unknown,
): Promise<McpAuthConfig | undefined> => {
	const parsed = parseMcpAuthConfig(auth);

	if (parsed.type === "none") {
		return;
	}

	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured");
	}

	const encryptionService = createEncryptionService(encryptionKey);

	if (parsed.type === "bearer") {
		headers.set(
			"Authorization",
			`Bearer ${await encryptionService.decrypt(parsed.tokenEncrypted)}`,
		);
		return;
	}

	if (parsed.type === "headers") {
		for (const header of parsed.headers) {
			headers.set(
				header.name,
				await encryptionService.decrypt(header.valueEncrypted),
			);
		}
		return;
	}

	if (parsed.type === "oauth") {
		const token = await getOAuthAccessToken(parsed, encryptionService);
		headers.set("Authorization", `Bearer ${token.accessToken}`);
		return token.auth;
	}

	const token = await getClientCredentialsAccessToken(
		parsed,
		encryptionService,
	);
	headers.set("Authorization", `Bearer ${token}`);
};

export const parseMcpAuthConfig = (value: unknown): McpAuthConfig => {
	if (!isRecord(value) || typeof value.type !== "string") {
		return { type: "none" };
	}

	if (
		value.type === "bearer" &&
		typeof value.tokenEncrypted === "string" &&
		value.tokenEncrypted.length > 0
	) {
		return {
			type: "bearer",
			tokenEncrypted: value.tokenEncrypted,
			updatedAt: getOptionalString(value.updatedAt),
		};
	}

	if (value.type === "headers") {
		return {
			type: "headers",
			headers: getMcpHeaderSecrets(value.headers),
			updatedAt: getOptionalString(value.updatedAt),
		};
	}

	if (value.type === "oauth") {
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
			accessTokenEncrypted: getOptionalString(value.accessTokenEncrypted),
			refreshTokenEncrypted: getOptionalString(value.refreshTokenEncrypted),
			expiresAt: getOptionalString(value.expiresAt),
			pending: getOAuthPending(value.pending),
			updatedAt: getOptionalString(value.updatedAt),
		};
	}

	if (value.type === "client_credentials") {
		return {
			type: "client_credentials",
			status: getOptionalString(value.status),
			tokenUrl: getOptionalString(value.tokenUrl),
			clientId: getOptionalString(value.clientId),
			clientSecretEncrypted: getOptionalString(value.clientSecretEncrypted),
			scope: getOptionalString(value.scope),
			resource: getOptionalString(value.resource),
			updatedAt: getOptionalString(value.updatedAt),
		};
	}

	return { type: "none" };
};

const getOAuthAccessToken = async (
	auth: Extract<McpAuthConfig, { type: "oauth" }>,
	encryptionService: EncryptionService,
) => {
	if (
		auth.accessTokenEncrypted &&
		auth.expiresAt &&
		new Date(auth.expiresAt).getTime() > Date.now() + 60_000
	) {
		return {
			accessToken: await encryptionService.decrypt(auth.accessTokenEncrypted),
		};
	}

	if (!auth.refreshTokenEncrypted || !auth.tokenUrl || !auth.clientId) {
		throw new Error("OAuth MCP server is not connected");
	}

	const refreshToken = await encryptionService.decrypt(
		auth.refreshTokenEncrypted,
	);
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: refreshToken,
		client_id: auth.clientId,
	});

	if (auth.clientSecretEncrypted) {
		body.set(
			"client_secret",
			await encryptionService.decrypt(auth.clientSecretEncrypted),
		);
	}

	if (auth.resource) {
		body.set("resource", auth.resource);
	}

	const response = await fetch(auth.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body,
	});

	if (!response.ok) {
		throw new Error("Failed to refresh OAuth MCP token");
	}

	const token = parseTokenResponse(await response.json());
	const now = Date.now();
	const nextAuth: McpAuthConfig = {
		...auth,
		status: "connected",
		accessTokenEncrypted: await encryptionService.encrypt(token.accessToken),
		refreshTokenEncrypted: token.refreshToken
			? await encryptionService.encrypt(token.refreshToken)
			: auth.refreshTokenEncrypted,
		expiresAt: token.expiresIn
			? new Date(now + token.expiresIn * 1000).toISOString()
			: undefined,
		pending: undefined,
		updatedAt: new Date(now).toISOString(),
	};

	return {
		accessToken: token.accessToken,
		auth: nextAuth,
	};
};

const getClientCredentialsAccessToken = async (
	auth: Extract<McpAuthConfig, { type: "client_credentials" }>,
	encryptionService: EncryptionService,
) => {
	if (!auth.tokenUrl || !auth.clientId || !auth.clientSecretEncrypted) {
		throw new Error("Client credentials MCP auth is not configured");
	}

	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: auth.clientId,
		client_secret: await encryptionService.decrypt(auth.clientSecretEncrypted),
	});

	if (auth.scope) {
		body.set("scope", auth.scope);
	}

	if (auth.resource) {
		body.set("resource", auth.resource);
	}

	const response = await fetch(auth.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body,
	});

	if (!response.ok) {
		throw new Error("Failed to get client credentials MCP token");
	}

	return parseTokenResponse(await response.json()).accessToken;
};

const parseTokenResponse = (value: unknown) => {
	if (!isRecord(value) || typeof value.access_token !== "string") {
		throw new Error("OAuth token response did not include access_token");
	}

	return {
		accessToken: value.access_token,
		refreshToken:
			typeof value.refresh_token === "string" ? value.refresh_token : undefined,
		expiresIn:
			typeof value.expires_in === "number" ? value.expires_in : undefined,
	};
};

const getMcpHeaderSecrets = (value: unknown) => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isMcpHeaderSecret);
};

const isMcpHeaderSecret = (
	value: unknown,
): value is {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
} => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		HTTP_HEADER_NAME_PATTERN.test(value.name) &&
		typeof value.valueEncrypted === "string" &&
		value.valueEncrypted.length > 0
	);
};

const getOAuthPending = (value: unknown) => {
	if (!isRecord(value)) {
		return undefined;
	}

	const state = getOptionalString(value.state);
	const codeVerifierEncrypted = getOptionalString(value.codeVerifierEncrypted);
	const redirectUri = getOptionalString(value.redirectUri);

	if (!state || !codeVerifierEncrypted || !redirectUri) {
		return undefined;
	}

	return { state, codeVerifierEncrypted, redirectUri };
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
