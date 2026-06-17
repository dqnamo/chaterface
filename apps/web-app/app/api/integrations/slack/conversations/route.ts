import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";
import {
	decryptSlackBotToken,
	listSlackConversations,
	parseSlackAuth,
	SLACK_PROVIDER,
} from "@/integrations/slack";

export const runtime = "nodejs";

type IntegrationConnection = {
	id: string;
	provider?: string;
	status?: string;
	auth?: unknown;
	workspace?: {
		members?: Array<{
			user?: {
				id: string;
			};
		}>;
	};
};

export async function GET(req: NextRequest) {
	const connectionId = new URL(req.url).searchParams.get("connectionId");

	if (!connectionId) {
		return NextResponse.json(
			{ message: "connectionId is required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateConnectionRequest(req, connectionId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	try {
		const botToken = await decryptSlackBotToken(
			parseSlackAuth(authResult.connection.auth),
		);
		const conversations = await listSlackConversations(botToken);

		return NextResponse.json({
			conversations: conversations.map((conversation) => ({
				id: conversation.id,
				name: conversation.name,
				isPrivate: Boolean(conversation.is_private),
			})),
		});
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? error.message
						: "Failed to list Slack conversations.",
			},
			{ status: 400 },
		);
	}
}

const authenticateConnectionRequest = async (
	req: NextRequest,
	connectionId: string,
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

	const connection = await db
		.query({
			integrationConnections: {
				$: {
					where: {
						id: connectionId,
						provider: SLACK_PROVIDER,
					},
				},
				workspace: {
					members: {
						user: {},
					},
				},
			},
		})
		.then(
			(result) =>
				result.integrationConnections[0] as IntegrationConnection | undefined,
		);

	if (!connection) {
		return {
			ok: false as const,
			status: 404,
			message: "Slack connection not found",
		};
	}

	if (connection.status !== "connected") {
		return {
			ok: false as const,
			status: 409,
			message: "Slack connection is not connected",
		};
	}

	if (!hasConnectionAccess(connection, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, connection };
};

const hasConnectionAccess = (
	connection: IntegrationConnection,
	userId: string,
) =>
	connection.workspace?.members?.some((member) => member.user?.id === userId) ??
	false;

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};
