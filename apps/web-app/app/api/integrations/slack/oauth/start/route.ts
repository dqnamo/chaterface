import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import db, { id } from "@/instant.admin";
import {
	getSlackClientConfig,
	SLACK_BOT_SCOPES,
	SLACK_PROVIDER,
} from "@/integrations/slack";

export const runtime = "nodejs";

type AuthenticatedFactory = {
	id: string;
	organisation?: {
		id: string;
		members?: Array<{
			user?: {
				id: string;
			};
		}>;
	};
};

const integrationConnectionTx = (connectionId: string) => {
	const tx = db.tx.integrationConnections[connectionId];

	if (!tx) {
		throw new Error(`Integration connection ${connectionId} not found`);
	}

	return tx;
};

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const factoryId = getOptionalString(body.factoryId);

	if (!factoryId) {
		return NextResponse.json(
			{ message: "factoryId is required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateFactoryRequest(req, factoryId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const organisationId = authResult.factory.organisation?.id;

	if (!organisationId) {
		return NextResponse.json(
			{ message: "Factory organisation was not found" },
			{ status: 404 },
		);
	}

	let clientId: string;

	try {
		clientId = getSlackClientConfig().clientId;
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? error.message
						: "Slack client credentials are not configured.",
			},
			{ status: 500 },
		);
	}

	const connectionId = id();
	const state = `${connectionId}:${randomUUID()}`;
	const redirectUri = new URL(
		"/api/integrations/slack/oauth/callback",
		req.url,
	).toString();
	const now = new Date().toISOString();

	await db.transact(
		integrationConnectionTx(connectionId)
			.create({
				provider: SLACK_PROVIDER,
				name: "Slack",
				status: "pending",
				auth: {
					type: "oauth",
					status: "pending",
					pendingState: state,
					redirectUri,
					scope: SLACK_BOT_SCOPES.join(","),
				},
				createdAt: now,
				updatedAt: now,
			})
			.link({ organisation: organisationId }),
	);

	const authorizationUrl = new URL("https://slack.com/oauth/v2/authorize");
	authorizationUrl.searchParams.set("client_id", clientId);
	authorizationUrl.searchParams.set("scope", SLACK_BOT_SCOPES.join(","));
	authorizationUrl.searchParams.set("redirect_uri", redirectUri);
	authorizationUrl.searchParams.set("state", state);

	return NextResponse.json({
		authorizationUrl: authorizationUrl.toString(),
	});
}

const authenticateFactoryRequest = async (
	req: NextRequest,
	factoryId: string,
) => {
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

	const factory = await db
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

	return { ok: true as const, factory };
};

const hasFactoryAccess = (factory: AuthenticatedFactory, userId: string) =>
	factory.organisation?.members?.some((member) => member.user?.id === userId) ??
	false;

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const readJson = async (req: NextRequest) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
