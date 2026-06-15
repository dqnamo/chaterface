import { createHmac, timingSafeEqual } from "node:crypto";
import { createEncryptionService } from "@/encryption";

export const SLACK_PROVIDER = "slack";
export const SLACK_SEND_MESSAGE_ACTION = "sendMessage";
export const SLACK_MESSAGE_RECEIVED_TRIGGER = "messageReceived";

export const SLACK_BOT_SCOPES = [
	"chat:write",
	"channels:read",
	"channels:history",
	"groups:read",
	"groups:history",
] as const;

export type SlackConnectionAuth = {
	type: "oauth";
	status?: string;
	botTokenEncrypted?: string;
	botUserId?: string;
	scope?: string;
	teamId?: string;
	appId?: string;
	pendingState?: string;
	redirectUri?: string;
	installedAt?: string;
};

export type SlackConnectionConfig = {
	teamId?: string;
	teamName?: string;
};

export type SlackOAuthAccessResponse = {
	ok?: boolean;
	error?: string;
	access_token?: string;
	scope?: string;
	bot_user_id?: string;
	app_id?: string;
	team?: {
		id?: string;
		name?: string;
	};
};

export type SlackConversation = {
	id: string;
	name: string;
	is_private?: boolean;
	is_archived?: boolean;
};

export type SlackPostMessageResponse = {
	ok?: boolean;
	error?: string;
	channel?: string;
	ts?: string;
	message?: unknown;
};

export const getSlackClientConfig = () => {
	const clientId = process.env.SLACK_CLIENT_ID;
	const clientSecret = process.env.SLACK_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error("Slack client credentials are not configured.");
	}

	return { clientId, clientSecret };
};

export const getSlackSigningSecret = () => {
	const signingSecret = process.env.SLACK_SIGNING_SECRET;

	if (!signingSecret) {
		throw new Error("Slack signing secret is not configured.");
	}

	return signingSecret;
};

export const parseSlackAuth = (value: unknown): SlackConnectionAuth => {
	if (!isRecord(value) || value.type !== "oauth") {
		return { type: "oauth" };
	}

	return {
		type: "oauth",
		status: getOptionalString(value.status),
		botTokenEncrypted: getOptionalString(value.botTokenEncrypted),
		botUserId: getOptionalString(value.botUserId),
		scope: getOptionalString(value.scope),
		teamId: getOptionalString(value.teamId),
		appId: getOptionalString(value.appId),
		pendingState: getOptionalString(value.pendingState),
		redirectUri: getOptionalString(value.redirectUri),
		installedAt: getOptionalString(value.installedAt),
	};
};

export const parseSlackConfig = (value: unknown): SlackConnectionConfig => {
	if (!isRecord(value)) {
		return {};
	}

	return {
		teamId: getOptionalString(value.teamId),
		teamName: getOptionalString(value.teamName),
	};
};

export const decryptSlackBotToken = async (auth: SlackConnectionAuth) => {
	if (!auth.botTokenEncrypted) {
		throw new Error("Slack connection is not connected.");
	}

	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured.");
	}

	return createEncryptionService(encryptionKey).decrypt(auth.botTokenEncrypted);
};

export const exchangeSlackOAuthCode = async ({
	code,
	redirectUri,
}: {
	code: string;
	redirectUri: string;
}) => {
	const { clientId, clientSecret } = getSlackClientConfig();
	const body = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		code,
		redirect_uri: redirectUri,
	});
	const response = await fetch("https://slack.com/api/oauth.v2.access", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});
	const result = (await response.json()) as SlackOAuthAccessResponse;

	if (!response.ok || !result.ok) {
		throw new Error(result.error ?? "Slack OAuth exchange failed.");
	}

	if (!result.access_token || !result.team?.id) {
		throw new Error("Slack OAuth response did not include a bot token.");
	}

	return result;
};

export const listSlackConversations = async (botToken: string) => {
	const conversations: SlackConversation[] = [];
	let cursor: string | undefined;

	do {
		const url = new URL("https://slack.com/api/conversations.list");
		url.searchParams.set("types", "public_channel,private_channel");
		url.searchParams.set("exclude_archived", "true");
		url.searchParams.set("limit", "200");

		if (cursor) {
			url.searchParams.set("cursor", cursor);
		}

		const result = await slackGet<{
			ok?: boolean;
			error?: string;
			channels?: SlackConversation[];
			response_metadata?: { next_cursor?: string };
		}>(url, botToken);

		conversations.push(
			...(result.channels ?? []).filter(
				(channel) => channel.id && channel.name && !channel.is_archived,
			),
		);
		cursor = result.response_metadata?.next_cursor || undefined;
	} while (cursor);

	return conversations.sort((a, b) => a.name.localeCompare(b.name));
};

export const postSlackMessage = async ({
	botToken,
	channel,
	text,
	threadTs,
}: {
	botToken: string;
	channel: string;
	text: string;
	threadTs?: string;
}) => {
	return slackPost<SlackPostMessageResponse>(
		"https://slack.com/api/chat.postMessage",
		botToken,
		{
			channel,
			text,
			...(threadTs ? { thread_ts: threadTs } : {}),
		},
	);
};

export const verifySlackSignature = ({
	rawBody,
	timestamp,
	signature,
	signingSecret,
}: {
	rawBody: string;
	timestamp: string | null;
	signature: string | null;
	signingSecret: string;
}) => {
	if (!timestamp || !signature) {
		return false;
	}

	const timestampSeconds = Number(timestamp);

	if (!Number.isFinite(timestampSeconds)) {
		return false;
	}

	const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);

	if (ageSeconds > 60 * 5) {
		return false;
	}

	const base = `v0:${timestamp}:${rawBody}`;
	const expected = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;
	const expectedBuffer = Buffer.from(expected);
	const signatureBuffer = Buffer.from(signature);

	return (
		expectedBuffer.length === signatureBuffer.length &&
		timingSafeEqual(expectedBuffer, signatureBuffer)
	);
};

const slackGet = async <T extends { ok?: boolean; error?: string }>(
	url: URL,
	botToken: string,
): Promise<T> => {
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${botToken}`,
		},
	});
	const result = (await response.json()) as T;

	if (!response.ok || !result.ok) {
		throw new Error(result.error ?? "Slack API request failed.");
	}

	return result;
};

const slackPost = async <T extends { ok?: boolean; error?: string }>(
	url: string,
	botToken: string,
	body: Record<string, unknown>,
): Promise<T> => {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${botToken}`,
			"Content-Type": "application/json; charset=utf-8",
		},
		body: JSON.stringify(body),
	});
	const result = (await response.json()) as T;

	if (!response.ok || !result.ok) {
		throw new Error(result.error ?? "Slack API request failed.");
	}

	return result;
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
