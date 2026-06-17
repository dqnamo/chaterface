import db, { id } from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../../lib/file-router.js";

type RepositorySecret = {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
};

type SecretMetadata = {
	id: string;
	name: string;
	createdAt?: string;
};

type CreateRepositorySecretBody = {
	name: string;
	value: string;
};

type DeleteRepositorySecretBody = {
	secretId: string;
};

const SECRET_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const repositoryTx = (repositoryId: string) => {
	const tx = db.tx.repositories[repositoryId];

	if (!tx) {
		throw new Error(`Repository transaction builder ${repositoryId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export const GET: RouteHandler = async (c) => {
	const repositoryId = c.req.param("repositoryId");

	if (!repositoryId) {
		return c.json({ error: "Missing repository id" }, 400);
	}

	const authResult = await authenticateRepositoryRequest(
		c.req.header("Authorization"),
		repositoryId,
	);

	if (!authResult.ok) {
		return c.json({ error: authResult.error }, authResult.status);
	}

	return c.json({
		secrets: getRepositorySecrets(authResult.repository.secrets).map(
			toSecretMetadata,
		),
	});
};

export const POST: RouteHandler = async (c) => {
	const repositoryId = c.req.param("repositoryId");
	const body = parseCreateRepositorySecretBody(await c.req.json());

	if (!repositoryId) {
		return c.json({ error: "Missing repository id" }, 400);
	}

	if (!body) {
		return c.json(
			{
				error:
					"Expected a valid environment variable name and value when creating a repository secret",
			},
			400,
		);
	}

	const authResult = await authenticateRepositoryRequest(
		c.req.header("Authorization"),
		repositoryId,
	);

	if (!authResult.ok) {
		return c.json({ error: authResult.error }, authResult.status);
	}

	const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;

	if (!encryptionKey) {
		return c.json({ error: "Secret encryption key is not configured" }, 500);
	}

	const encryptionService = createEncryptionService(encryptionKey);
	const secret: RepositorySecret = {
		id: id(),
		name: body.name,
		valueEncrypted: await encryptionService.encrypt(body.value),
		createdAt: new Date().toISOString(),
	};
	const existingSecrets = getRepositorySecrets(authResult.repository.secrets);
	const nextSecrets = [
		...existingSecrets.filter(
			(existingSecret) => existingSecret.name !== body.name,
		),
		secret,
	];

	await db.transact([
		repositoryTx(repositoryId).update({
			secrets: nextSecrets,
		}),
		eventTx(id())
			.create({
				type: "factoryplane.repository_secret_saved",
				data: {
					repositoryId,
					secretId: secret.id,
					name: secret.name,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: authResult.task.id }),
	]);

	return c.json({
		secret: toSecretMetadata(secret),
	});
};

export const DELETE: RouteHandler = async (c) => {
	const repositoryId = c.req.param("repositoryId");
	const body = parseDeleteRepositorySecretBody(await c.req.json());

	if (!repositoryId) {
		return c.json({ error: "Missing repository id" }, 400);
	}

	if (!body) {
		return c.json({ error: "Expected secretId when deleting a secret" }, 400);
	}

	const authResult = await authenticateRepositoryRequest(
		c.req.header("Authorization"),
		repositoryId,
	);

	if (!authResult.ok) {
		return c.json({ error: authResult.error }, authResult.status);
	}

	const existingSecrets = getRepositorySecrets(authResult.repository.secrets);
	const deletedSecret = existingSecrets.find(
		(secret) => secret.id === body.secretId,
	);
	const nextSecrets = existingSecrets.filter(
		(secret) => secret.id !== body.secretId,
	);

	await db.transact([
		repositoryTx(repositoryId).update({
			secrets: nextSecrets,
		}),
		eventTx(id())
			.create({
				type: "factoryplane.repository_secret_deleted",
				data: {
					repositoryId,
					secretId: body.secretId,
					name: deletedSecret?.name,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: authResult.task.id }),
	]);

	return c.json({
		secretId: body.secretId,
		status: "deleted",
	});
};

const authenticateRepositoryRequest = async (
	authorizationHeader: string | undefined,
	repositoryId: string,
) => {
	const token = getBearerToken(authorizationHeader);

	if (!token) {
		return {
			ok: false as const,
			status: 401 as const,
			error: "Unauthorized",
		};
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return {
			ok: false as const,
			status: 401 as const,
			error: "Unauthorized",
		};
	}

	const repository = task.workspace.repositories?.find(
		(repository) => repository.id === repositoryId,
	);

	if (!repository) {
		return {
			ok: false as const,
			status: 404 as const,
			error: "Repository not found",
		};
	}

	return {
		ok: true as const,
		task,
		repository,
	};
};

const parseCreateRepositorySecretBody = (
	value: unknown,
): CreateRepositorySecretBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const name = getSecretName(value.name);

	if (!name || typeof value.value !== "string") {
		return undefined;
	}

	return {
		name,
		value: value.value,
	};
};

const parseDeleteRepositorySecretBody = (
	value: unknown,
): DeleteRepositorySecretBody | undefined => {
	if (!isRecord(value) || typeof value.secretId !== "string") {
		return undefined;
	}

	return {
		secretId: value.secretId,
	};
};

const getRepositorySecrets = (value: unknown): RepositorySecret[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isRepositorySecret);
};

const isRepositorySecret = (value: unknown): value is RepositorySecret => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.valueEncrypted === "string"
	);
};

const toSecretMetadata = (secret: RepositorySecret): SecretMetadata => ({
	id: secret.id,
	name: secret.name,
	createdAt: secret.createdAt,
});

const getSecretName = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return SECRET_NAME_PATTERN.test(trimmed) ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
