import {
	encryptAgentAuth,
	getAgentAuthProviderAccountId,
} from "@/agent-auth-storage";
import db from "@/instant.admin";
import type { Sandbox } from "./e2b-sandbox";

const CODEX_AUTH_PATH = "~/.codex/auth.json";

type AgentForAuthSync = {
	id: string;
	provider?: string;
	providerAccountId?: string;
	creator?: {
		id: string;
	};
};

const agentTx = (agentId: string) => {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
};

export const syncAgentAuthFromSandbox = async (
	sandbox: Sandbox,
	agentId: string,
) => {
	try {
		const raw = await sandbox.files.read(CODEX_AUTH_PATH);
		const auth = JSON.parse(raw) as unknown;
		const providerAccountId = getAgentAuthProviderAccountId("codex", auth);
		const encryptedAuth = await encryptAgentAuth(auth);
		const syncAgentIds = providerAccountId
			? await getSameOwnerAgentIds(agentId, providerAccountId)
			: [agentId];

		await db.transact(
			syncAgentIds.map((syncAgentId) =>
				agentTx(syncAgentId).update({
					auth: encryptedAuth,
					providerAccountId,
				}),
			),
		);
	} catch (error) {
		console.log("Failed to sync agent auth from sandbox", {
			agentId,
			error,
		});
	}
};

const getSameOwnerAgentIds = async (
	agentId: string,
	providerAccountId: string,
) => {
	const sourceAgent = await db
		.query({
			agents: {
				$: {
					where: {
						id: agentId,
					},
					fields: ["provider", "providerAccountId"],
				},
				creator: {},
			},
		})
		.then((result) => result.agents[0] as AgentForAuthSync | undefined);

	const creatorId = sourceAgent?.creator?.id;
	if (!creatorId) {
		return [agentId];
	}

	const agents = await db
		.query({
			agents: {
				$: {
					where: {
						providerAccountId,
					},
					fields: ["provider", "providerAccountId"],
				},
				creator: {},
			},
		})
		.then((result) => result.agents as AgentForAuthSync[]);

	const matchingIds = agents
		.filter(
			(agent) =>
				(!agent.provider || agent.provider === "codex") &&
				agent.providerAccountId === providerAccountId &&
				agent.creator?.id === creatorId,
		)
		.map((agent) => agent.id);

	return matchingIds.includes(agentId)
		? matchingIds
		: [agentId, ...matchingIds];
};
