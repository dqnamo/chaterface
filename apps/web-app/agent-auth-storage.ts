import { createEncryptionService } from "@/encryption";

const ENCRYPTED_AGENT_AUTH_TYPE = "encrypted_agent_auth";
const CODEX_ACCOUNT_ID_KEYS = new Set([
	"account_id",
	"accountId",
	"chatgpt_account_id",
	"chatgptAccountId",
	"openai_account_id",
	"openaiAccountId",
	"user_id",
	"userId",
]);
const CODEX_TOKEN_KEYS = new Set([
	"access_token",
	"accessToken",
	"id_token",
	"idToken",
]);

type EncryptedAgentAuth = {
	type: typeof ENCRYPTED_AGENT_AUTH_TYPE;
	valueEncrypted: string;
	updatedAt: string;
};

export const encryptAgentAuth = async (
	auth: unknown,
): Promise<EncryptedAgentAuth> => {
	const serialized = JSON.stringify(auth);

	if (!serialized) {
		throw new Error("Agent auth must be JSON serializable");
	}

	return {
		type: ENCRYPTED_AGENT_AUTH_TYPE,
		valueEncrypted: await getEncryptionService().encrypt(serialized),
		updatedAt: new Date().toISOString(),
	};
};

export const decryptAgentAuth = async (auth: unknown) => {
	if (!isEncryptedAgentAuth(auth)) {
		return auth;
	}

	const decrypted = await getEncryptionService().decrypt(auth.valueEncrypted);
	return JSON.parse(decrypted) as unknown;
};

export const getAgentAuthProviderAccountId = (
	provider: string | undefined,
	auth: unknown,
) => {
	if (provider === "cursor") {
		return undefined;
	}

	return getCodexAuthAccountId(auth);
};

const getCodexAuthAccountId = (auth: unknown) =>
	findStringValueByKey(auth, CODEX_ACCOUNT_ID_KEYS) ??
	findTokenSubjectByKey(auth, CODEX_TOKEN_KEYS);

const findStringValueByKey = (
	value: unknown,
	keys: Set<string>,
): string | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	for (const [key, child] of Object.entries(value)) {
		if (keys.has(key) && typeof child === "string" && child.trim()) {
			return child.trim();
		}
	}

	for (const child of Object.values(value)) {
		const result = findStringValueByKey(child, keys);
		if (result) {
			return result;
		}
	}

	return undefined;
};

const findTokenSubjectByKey = (
	value: unknown,
	keys: Set<string>,
): string | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	for (const [key, child] of Object.entries(value)) {
		if (keys.has(key) && typeof child === "string") {
			const subject = getJwtSubject(child);
			if (subject) {
				return subject;
			}
		}
	}

	for (const child of Object.values(value)) {
		const subject = findTokenSubjectByKey(child, keys);
		if (subject) {
			return subject;
		}
	}

	return undefined;
};

const getJwtSubject = (token: string) => {
	const [, payload] = token.split(".");
	if (!payload) {
		return undefined;
	}

	try {
		const json = Buffer.from(toBase64(payload), "base64").toString("utf8");
		const parsed = JSON.parse(json) as unknown;
		if (!isRecord(parsed)) {
			return undefined;
		}

		return typeof parsed.sub === "string" && parsed.sub.trim()
			? parsed.sub.trim()
			: undefined;
	} catch {
		return undefined;
	}
};

const toBase64 = (value: string) => {
	const padded = value.padEnd(
		value.length + ((4 - (value.length % 4)) % 4),
		"=",
	);
	return padded.replace(/-/g, "+").replace(/_/g, "/");
};

const isEncryptedAgentAuth = (auth: unknown): auth is EncryptedAgentAuth =>
	isRecord(auth) &&
	auth.type === ENCRYPTED_AGENT_AUTH_TYPE &&
	typeof auth.valueEncrypted === "string";

const getEncryptionService = () => {
	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		throw new Error("Secret encryption key is not configured");
	}

	return createEncryptionService(encryptionKey);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
