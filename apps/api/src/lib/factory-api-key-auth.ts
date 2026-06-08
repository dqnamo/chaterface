import db from "@repo/db/admin";
import { hashSecretValue } from "@repo/encryption";

type FactoryApiKey = {
	id: string;
	revokedAt?: string | Date;
	factory?: {
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

export const getFactoryForApiKey = async (token: string) => {
	const tokenHash = await hashSecretValue(token);
	const apiKey = await db
		.query({
			apiKeys: {
				$: {
					where: {
						tokenHash,
					},
				},
				factory: {},
			},
		})
		.then((result) => result.apiKeys[0] as FactoryApiKey | undefined);

	if (!apiKey?.factory || apiKey.revokedAt) {
		return undefined;
	}

	await db.transact(
		apiKeyTx(apiKey.id).update({
			lastUsedAt: new Date().toISOString(),
		}),
	);

	return {
		apiKeyId: apiKey.id,
		factoryId: apiKey.factory.id,
	};
};
