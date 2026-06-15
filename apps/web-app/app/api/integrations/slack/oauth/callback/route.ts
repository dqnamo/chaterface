import { type NextRequest, NextResponse } from "next/server";
import { createEncryptionService } from "@/encryption";
import db from "@/instant.admin";
import {
	exchangeSlackOAuthCode,
	parseSlackAuth,
	SLACK_PROVIDER,
} from "@/integrations/slack";

export const runtime = "nodejs";

type IntegrationConnection = {
	id: string;
	auth?: unknown;
};

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const error = url.searchParams.get("error");

	if (error) {
		return renderMessage(`Slack OAuth failed: ${error}`, 400);
	}

	if (!code || !state) {
		return renderMessage("Slack OAuth callback is missing code or state.", 400);
	}

	const connectionId = state.split(":")[0];

	if (!connectionId) {
		return renderMessage("Slack OAuth state is invalid.", 400);
	}

	const connection = await getIntegrationConnection(connectionId);

	if (!connection) {
		return renderMessage("Slack integration connection was not found.", 404);
	}

	const auth = parseSlackAuth(connection.auth);

	if (auth.pendingState !== state || !auth.redirectUri) {
		return renderMessage("Slack OAuth state was not recognized.", 400);
	}

	try {
		const token = await exchangeSlackOAuthCode({
			code,
			redirectUri: auth.redirectUri,
		});
		const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

		if (!encryptionKey) {
			throw new Error("Secret encryption key is not configured.");
		}

		const botToken = token.access_token;

		if (!botToken) {
			throw new Error("Slack OAuth response did not include a bot token.");
		}

		const encryptionService = createEncryptionService(encryptionKey);
		const now = new Date().toISOString();
		const tx = db.tx.integrationConnections[connectionId];

		if (!tx) {
			return renderMessage("Slack integration connection was not found.", 404);
		}

		await db.transact(
			tx.update({
				name: token.team?.name ? `Slack - ${token.team.name}` : "Slack",
				status: "connected",
				externalId: token.team?.id,
				externalName: token.team?.name,
				auth: {
					type: "oauth",
					status: "connected",
					botTokenEncrypted: await encryptionService.encrypt(botToken),
					botUserId: token.bot_user_id,
					scope: token.scope,
					teamId: token.team?.id,
					appId: token.app_id,
					installedAt: now,
				},
				config: {
					teamId: token.team?.id,
					teamName: token.team?.name,
				},
				updatedAt: now,
			}),
		);

		return renderMessage("Slack connected. You can close this tab.");
	} catch (callbackError) {
		return renderMessage(
			callbackError instanceof Error
				? callbackError.message
				: "Failed to complete Slack OAuth.",
			400,
		);
	}
}

const getIntegrationConnection = async (connectionId: string) =>
	db
		.query({
			integrationConnections: {
				$: {
					where: {
						id: connectionId,
						provider: SLACK_PROVIDER,
					},
				},
			},
		})
		.then(
			(result) =>
				result.integrationConnections[0] as IntegrationConnection | undefined,
		);

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
