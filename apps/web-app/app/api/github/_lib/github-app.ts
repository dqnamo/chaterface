import {
	createHmac,
	createSign,
	randomBytes,
	timingSafeEqual,
} from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";

export const GITHUB_APP_STATE_COOKIE = "factoryplane_github_app_state";
const GITHUB_APP_STATE_TTL_SECONDS = 10 * 60;
const GITHUB_API_VERSION = "2022-11-28";

export type AuthenticatedFactory = {
	id: string;
	githubAppInstallationId?: string;
	organisation?: {
		members?: Array<{
			user?: {
				id: string;
			};
		}>;
	};
};

export type GithubAppState = {
	factoryId: string;
	userId: string;
	redirectPath: string;
	nonce: string;
	expiresAt: number;
};

export type GithubAppConfig = {
	appId: string;
	appSlug: string;
	privateKey: string;
};

export const authenticateFactoryRequest = async (
	req: NextRequest,
	factoryId: string | undefined,
) => {
	if (!factoryId) {
		return {
			ok: false as const,
			status: 400,
			message: "factoryId is required",
		};
	}

	const refreshToken = getBearerToken(req.headers.get("Authorization"));

	if (!refreshToken) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const user = await db.auth.verifyToken(refreshToken).catch(() => undefined);

	if (!user) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const factory = await getAuthenticatedFactory(factoryId);

	if (!factory) {
		return {
			ok: false as const,
			status: 404,
			message: "Factory not found",
		};
	}

	if (!hasFactoryAccess(factory, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, user, factory };
};

export const getAuthenticatedFactory = async (factoryId: string) => {
	return await db
		.query({
			factories: {
				$: {
					where: {
						id: factoryId,
					},
				},
				organisation: {
					members: {
						user: {},
					},
				},
			},
		})
		.then((result) => result.factories[0] as AuthenticatedFactory | undefined);
};

export const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

export const hasFactoryAccess = (
	factory: AuthenticatedFactory,
	userId: string,
) =>
	factory.organisation?.members?.some((member) => member.user?.id === userId) ??
	false;

export const getGithubAppConfig = () => {
	const appId = process.env.GITHUB_APP_ID?.trim();
	const appSlug = process.env.GITHUB_APP_SLUG?.trim();
	const privateKey = normalizePrivateKey(process.env.GITHUB_APP_PRIVATE_KEY);

	if (!appId || !appSlug || !privateKey) {
		return {
			ok: false as const,
			message: "GitHub App credentials are not configured",
		};
	}

	return {
		ok: true as const,
		appId,
		appSlug,
		privateKey,
	};
};

export const createGithubAppState = (
	input: Pick<GithubAppState, "factoryId" | "userId" | "redirectPath">,
) => {
	const state: GithubAppState = {
		...input,
		redirectPath: normalizeRedirectPath(input.redirectPath),
		nonce: randomBytes(16).toString("base64url"),
		expiresAt: Date.now() + GITHUB_APP_STATE_TTL_SECONDS * 1000,
	};

	return signState(state);
};

export const verifyGithubAppState = (signedState: string) => {
	const [payload, signature] = signedState.split(".");

	if (!payload || !signature) {
		return;
	}

	const expectedSignature = signPayload(payload);

	if (!safeEqual(signature, expectedSignature)) {
		return;
	}

	try {
		const parsed = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		) as Partial<GithubAppState>;

		if (
			typeof parsed.factoryId !== "string" ||
			typeof parsed.userId !== "string" ||
			typeof parsed.redirectPath !== "string" ||
			typeof parsed.nonce !== "string" ||
			typeof parsed.expiresAt !== "number" ||
			parsed.expiresAt < Date.now()
		) {
			return;
		}

		return {
			factoryId: parsed.factoryId,
			userId: parsed.userId,
			redirectPath: normalizeRedirectPath(parsed.redirectPath),
			nonce: parsed.nonce,
			expiresAt: parsed.expiresAt,
		};
	} catch {
		return;
	}
};

export const setGithubAppStateCookie = (
	response: NextResponse,
	state: string,
) => {
	response.cookies.set(GITHUB_APP_STATE_COOKIE, state, {
		httpOnly: true,
		maxAge: GITHUB_APP_STATE_TTL_SECONDS,
		path: "/api/github/app",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});
};

export const clearGithubAppStateCookie = (response: NextResponse) => {
	response.cookies.set(GITHUB_APP_STATE_COOKIE, "", {
		httpOnly: true,
		maxAge: 0,
		path: "/api/github/app",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});
};

export const createGithubAppJwt = (
	config: Pick<GithubAppConfig, "appId" | "privateKey">,
) => {
	const now = Math.floor(Date.now() / 1000);
	const header = base64UrlJson({
		alg: "RS256",
		typ: "JWT",
	});
	const payload = base64UrlJson({
		iat: now - 60,
		exp: now + 9 * 60,
		iss: config.appId,
	});
	const unsignedToken = `${header}.${payload}`;
	const signature = createSign("RSA-SHA256")
		.update(unsignedToken)
		.sign(config.privateKey, "base64url");

	return `${unsignedToken}.${signature}`;
};

export const createInstallationAccessToken = async (
	installationId: string,
	config: GithubAppConfig,
) => {
	const response = await fetch(
		`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
		{
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${createGithubAppJwt(config)}`,
				"User-Agent": "Factoryplane",
				"X-GitHub-Api-Version": GITHUB_API_VERSION,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to create GitHub App installation token");
	}

	const result = (await response.json()) as { token?: string };

	if (!result.token) {
		throw new Error("GitHub App installation token response was empty");
	}

	return result.token;
};

export const getGithubAppInstallation = async (
	installationId: string,
	config: GithubAppConfig,
) => {
	const response = await fetch(
		`https://api.github.com/app/installations/${encodeURIComponent(installationId)}`,
		{
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${createGithubAppJwt(config)}`,
				"User-Agent": "Factoryplane",
				"X-GitHub-Api-Version": GITHUB_API_VERSION,
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to load GitHub App installation");
	}

	return (await response.json()) as {
		account?: {
			login?: string;
			type?: string;
		};
	};
};

export const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

export const readJson = async (req: NextRequest) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

export const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

export const normalizeRedirectPath = (value: string | undefined) => {
	if (!value?.startsWith("/") || value.startsWith("//")) {
		return "/";
	}

	return value;
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const signState = (state: GithubAppState) => {
	const payload = Buffer.from(JSON.stringify(state), "utf8").toString(
		"base64url",
	);

	return `${payload}.${signPayload(payload)}`;
};

const signPayload = (payload: string) =>
	createHmac("sha256", getStateSecret()).update(payload).digest("base64url");

const getStateSecret = () => {
	const secret =
		process.env.GITHUB_APP_STATE_SECRET?.trim() ||
		process.env.SECRET_ENCRYPTION_KEY?.trim();

	if (!secret) {
		throw new Error("GitHub App state secret is not configured");
	}

	return secret;
};

const safeEqual = (first: string, second: string) => {
	const firstBuffer = Buffer.from(first);
	const secondBuffer = Buffer.from(second);

	return (
		firstBuffer.length === secondBuffer.length &&
		timingSafeEqual(firstBuffer, secondBuffer)
	);
};

const base64UrlJson = (value: unknown) =>
	Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const normalizePrivateKey = (value: string | undefined) => {
	const trimmed = value?.trim();

	if (!trimmed) {
		return undefined;
	}

	return trimmed.replace(/\\n/g, "\n");
};
