import { encryptAgentAuth } from "@/agent-auth-storage";
import db from "@/instant.admin";
import type { Sandbox } from "./e2b-sandbox";

const CODEX_AUTH_PATH = "~/.codex/auth.json";

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

		await db.transact(
			agentTx(agentId).update({
				auth: await encryptAgentAuth(auth),
			}),
		);
	} catch (error) {
		console.log("Failed to sync agent auth from sandbox", {
			agentId,
			error,
		});
	}
};
