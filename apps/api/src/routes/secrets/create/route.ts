import db, { id } from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import type { RouteHandler } from "../../../lib/file-router.js";

type CreateSecretBody = {
	factoryId?: string;
	name: string;
	value: string;
};

type AuthResult = {
	factoryId: string;
};

const secretTx = (secretId: string) => {
	const tx = db.tx.secrets[secretId];

	if (!tx) {
		throw new Error(`Secret transaction builder ${secretId} not found`);
	}

	return tx;
};

export const POST: RouteHandler = async (c) => {
	const body = parseCreateSecretBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error: "Expected name and value when creating a secret",
			},
			400,
		);
	}

	const authResult = await authenticateCreateSecretRequest(
		c.req.header("token"),
		c.req.header("Authorization")?.split(" ")[1],
		body.factoryId,
	);

	if (!authResult) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		return c.json({ error: "Secret encryption key is not configured" }, 500);
	}

	const secretId = id();
	const encryptionService = createEncryptionService(encryptionKey);
	const valueEncrypted = await encryptionService.encrypt(body.value);

	await db.transact(
		secretTx(secretId)
			.create({
				name: body.name,
				valueEncrypted,
				createdAt: new Date().toISOString(),
			})
			.link({ factory: authResult.factoryId }),
	);

	return c.json({
		secretId,
	});
};

const parseCreateSecretBody = (
	value: unknown,
): CreateSecretBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const factoryId = getNonEmptyString(value.factoryId);
	const name = getNonEmptyString(value.name);
	const secretValue = getSecretValue(value.value);

	if (!name || !secretValue) {
		return undefined;
	}

	return {
		...(factoryId ? { factoryId } : {}),
		name,
		value: secretValue,
	};
};

const authenticateCreateSecretRequest = async (
	userToken: string | undefined,
	agentToken: string | undefined,
	factoryId: string | undefined,
): Promise<AuthResult | undefined> => {
	if (userToken) {
		if ((await verifyUserToken(userToken)) && factoryId) {
			return { factoryId };
		}
	}

	if (!agentToken) {
		return undefined;
	}

	const task = await db
		.query({
			tasks: {
				$: {
					where: {
						agentToken,
					},
				},
				factory: {},
			},
		})
		.then((data) => data.tasks[0]);

	if (!task?.factory) {
		return undefined;
	}

	if (factoryId && task.factory.id !== factoryId) {
		return undefined;
	}

	return { factoryId: task.factory.id };
};

const verifyUserToken = async (token: string) => {
	try {
		return Boolean(await db.auth.verifyToken(token));
	} catch {
		return false;
	}
};

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getSecretValue = (value: unknown) => {
	if (typeof value !== "string" || value.length === 0) {
		return undefined;
	}

	return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
