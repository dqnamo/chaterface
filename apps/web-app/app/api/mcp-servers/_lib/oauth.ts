import { createHash, randomBytes } from "node:crypto";

export type OAuthMetadata = {
	issuer?: string;
	authorizationUrl: string;
	tokenUrl: string;
	registrationUrl?: string;
	resource?: string;
};

export const createPkceVerifier = () => toBase64Url(randomBytes(32));

export const createPkceChallenge = (verifier: string) =>
	toBase64Url(createHash("sha256").update(verifier).digest());

export const createOAuthState = (mcpServerId: string) =>
	`${mcpServerId}.${toBase64Url(randomBytes(24))}`;

export const parseOAuthState = (state: string) => {
	const [mcpServerId] = state.split(".");
	return mcpServerId && state.includes(".") ? { mcpServerId } : undefined;
};

export const discoverOAuthMetadata = async (
	mcpServerUrl: string,
	configured: {
		issuer?: string;
		authorizationUrl?: string;
		tokenUrl?: string;
		resource?: string;
	},
): Promise<OAuthMetadata> => {
	if (configured.authorizationUrl && configured.tokenUrl) {
		return {
			issuer: configured.issuer,
			authorizationUrl: configured.authorizationUrl,
			tokenUrl: configured.tokenUrl,
			resource: configured.resource ?? mcpServerUrl,
		};
	}

	const protectedResourceMetadata =
		await getProtectedResourceMetadata(mcpServerUrl);
	const issuer =
		configured.issuer ??
		getFirstString(protectedResourceMetadata?.authorization_servers) ??
		new URL(mcpServerUrl).origin;
	const authorizationServerMetadata =
		await getAuthorizationServerMetadata(issuer);
	const authorizationUrl =
		configured.authorizationUrl ??
		getRequiredString(
			authorizationServerMetadata.authorization_endpoint,
			"authorization_endpoint",
		);
	const tokenUrl =
		configured.tokenUrl ??
		getRequiredString(
			authorizationServerMetadata.token_endpoint,
			"token_endpoint",
		);
	const registrationUrl = getOptionalString(
		authorizationServerMetadata.registration_endpoint,
	);

	return {
		issuer,
		authorizationUrl,
		tokenUrl,
		registrationUrl,
		resource:
			configured.resource ??
			getOptionalString(protectedResourceMetadata?.resource) ??
			mcpServerUrl,
	};
};

export const registerOAuthClient = async (
	registrationUrl: string,
	redirectUri: string,
) => {
	const response = await fetch(registrationUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			client_name: "Factoryplane",
			redirect_uris: [redirectUri],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to dynamically register OAuth client");
	}

	const body = await response.json();
	const clientId = getRequiredString(body.client_id, "client_id");
	const clientSecret = getOptionalString(body.client_secret);

	return { clientId, clientSecret };
};

export const exchangeAuthorizationCode = async ({
	tokenUrl,
	code,
	redirectUri,
	clientId,
	clientSecret,
	codeVerifier,
	resource,
}: {
	tokenUrl: string;
	code: string;
	redirectUri: string;
	clientId: string;
	clientSecret?: string;
	codeVerifier: string;
	resource?: string;
}) => {
	const body = new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		client_id: clientId,
		code_verifier: codeVerifier,
	});

	if (clientSecret) {
		body.set("client_secret", clientSecret);
	}

	if (resource) {
		body.set("resource", resource);
	}

	const response = await fetch(tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body,
	});

	if (!response.ok) {
		throw new Error("Failed to exchange OAuth code for MCP token");
	}

	const token = await response.json();

	if (!isRecord(token) || typeof token.access_token !== "string") {
		throw new Error("OAuth token response did not include access_token");
	}

	return {
		accessToken: token.access_token,
		refreshToken:
			typeof token.refresh_token === "string" ? token.refresh_token : undefined,
		expiresIn:
			typeof token.expires_in === "number" ? token.expires_in : undefined,
	};
};

const getProtectedResourceMetadata = async (mcpServerUrl: string) => {
	const challengeUrl = await getProtectedResourceMetadataUrl(mcpServerUrl);
	const fallbackUrl = new URL(
		"/.well-known/oauth-protected-resource",
		new URL(mcpServerUrl).origin,
	).toString();
	const metadataUrl = challengeUrl ?? fallbackUrl;

	try {
		const response = await fetch(metadataUrl, {
			headers: { Accept: "application/json" },
		});

		if (!response.ok) {
			return undefined;
		}

		const body = await response.json();
		return isRecord(body) ? body : undefined;
	} catch {
		return undefined;
	}
};

const getProtectedResourceMetadataUrl = async (mcpServerUrl: string) => {
	try {
		const response = await fetch(mcpServerUrl, {
			method: "GET",
			headers: {
				Accept: "application/json, text/event-stream",
			},
		});
		const challenge = response.headers.get("www-authenticate");
		const params = parseWwwAuthenticate(challenge);
		return params.resource_metadata ?? params.resource_metadata_uri;
	} catch {
		return undefined;
	}
};

const getAuthorizationServerMetadata = async (issuer: string) => {
	for (const path of [
		"/.well-known/oauth-authorization-server",
		"/.well-known/openid-configuration",
	]) {
		const url = new URL(path, issuer).toString();

		try {
			const response = await fetch(url, {
				headers: { Accept: "application/json" },
			});

			if (!response.ok) {
				continue;
			}

			const body = await response.json();

			if (isRecord(body)) {
				return body;
			}
		} catch {}
	}

	throw new Error("Failed to discover OAuth authorization server metadata");
};

const parseWwwAuthenticate = (value: string | null) => {
	const params: Record<string, string> = {};

	if (!value) {
		return params;
	}

	for (const part of value.replace(/^Bearer\s+/i, "").split(",")) {
		const [rawKey, ...rawValue] = part.trim().split("=");
		const key = rawKey?.trim();
		const joinedValue = rawValue.join("=").trim();

		if (!key || !joinedValue) {
			continue;
		}

		params[key] = joinedValue.replace(/^"|"$/g, "");
	}

	return params;
};

const getFirstString = (value: unknown) => {
	return Array.isArray(value) && typeof value[0] === "string"
		? value[0]
		: undefined;
};

const getRequiredString = (value: unknown, name: string) => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`OAuth metadata is missing ${name}`);
	}

	return value.trim();
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const toBase64Url = (value: Buffer) =>
	value
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
