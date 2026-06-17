import db, { id } from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import type { RouteHandler } from "../../../lib/file-router.js";

type CreateSecretBody = {
	workspaceId?: string;
	name: string;
	value: string;
};

type AuthResult = {
	workspaceId: string;
};

type WorkspaceWithMembers = {
	id: string;
	members?: Array<{
		user?: {
			id: string;
		};
	}>;
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
		body.workspaceId,
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
			.link({ workspace: authResult.workspaceId }),
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

	const workspaceId = getNonEmptyString(value.workspaceId);
	const name = getNonEmptyString(value.name);
	const secretValue = getSecretValue(value.value);

	if (!name || !secretValue) {
		return undefined;
	}

	return {
		...(workspaceId ? { workspaceId } : {}),
		name,
		value: secretValue,
	};
};

const authenticateCreateSecretRequest = async (
	userToken: string | undefined,
	agentToken: string | undefined,
	workspaceId: string | undefined,
): Promise<AuthResult | undefined> => {
	if (userToken) {
		const user = await verifyUserToken(userToken);

		if (user && workspaceId) {
			const workspace = await getWorkspaceWithMembers(workspaceId);

			if (workspace && hasWorkspaceAccess(workspace, user.id)) {
				return { workspaceId: workspace.id };
			}
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
				workspace: {},
			},
		})
		.then((data) => data.tasks[0]);

	if (!task?.workspace) {
		return undefined;
	}

	if (workspaceId && task.workspace.id !== workspaceId) {
		return undefined;
	}

	return { workspaceId: task.workspace.id };
};

const verifyUserToken = async (token: string) => {
	try {
		return await db.auth.verifyToken(token);
	} catch {
		return undefined;
	}
};

const getWorkspaceWithMembers = async (workspaceId: string) => {
	return db
		.query({
			workspaces: {
				$: {
					where: {
						id: workspaceId,
					},
				},
				members: {
					user: {},
				},
			},
		})
		.then((data) => data.workspaces[0] as WorkspaceWithMembers | undefined);
};

const hasWorkspaceAccess = (workspace: WorkspaceWithMembers, userId: string) =>
	workspace.members?.some((member) => member.user?.id === userId) ?? false;

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
