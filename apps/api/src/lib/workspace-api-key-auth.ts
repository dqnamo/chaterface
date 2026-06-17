import db from "@repo/db/admin";
import { hashSecretValue } from "@repo/encryption";

type WorkspaceApiKey = {
	id: string;
	revokedAt?: string | Date;
	workspace?: {
		id: string;
	};
};

const apiKeyTx = (apiKeyId: string) => {
	const tx = db.tx.apiKeys[apiKeyId];

	if (!tx) {
		throw new Error(`API key transaction builder ${apiKeyId} not found`);
	}

	return tx;
};

export const getWorkspaceForApiKey = async (token: string) => {
	const tokenHash = await hashSecretValue(token);
	const apiKey = await db
		.query({
			apiKeys: {
				$: {
					where: {
						tokenHash,
					},
				},
				workspace: {},
			},
		})
		.then((result) => result.apiKeys[0] as WorkspaceApiKey | undefined);

	if (!apiKey?.workspace || apiKey.revokedAt) {
		return undefined;
	}

	await db.transact(
		apiKeyTx(apiKey.id).update({
			lastUsedAt: new Date().toISOString(),
		}),
	);

	return {
		apiKeyId: apiKey.id,
		workspaceId: apiKey.workspace.id,
	};
};
