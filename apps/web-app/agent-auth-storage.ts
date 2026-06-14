import { createEncryptionService } from "@/encryption";

const ENCRYPTED_AGENT_AUTH_TYPE = "encrypted_agent_auth";

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
