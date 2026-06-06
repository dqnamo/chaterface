import db from "@repo/db/admin";
import { task } from "@trigger.dev/sdk";
import { Sandbox } from "e2b";

import { syncAgentAuthFromSandbox } from "./sync-agent-auth";

function agentTx(agentId: string) {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
}

export const setupAgentTask = task({
	id: "setup-agent",
	retry: {
		maxAttempts: 3,
	},
	run: async (payload: { agentId: string }) => {
		await db.transact(
			agentTx(payload.agentId).update({
				status: "setting_up",
			}),
		);

		try {
			const { agents } = await db.query({
				agents: {
					$: {
						where: {
							id: payload.agentId,
						},
					},
				},
			});

			const agent = agents[0];

			if (!agent) {
				throw new Error(`Agent ${payload.agentId} not found`);
			}

			if (!agent.auth) {
				throw new Error(`Agent ${payload.agentId} is missing auth`);
			}

			const sandbox = await Sandbox.create("codex", {
				timeoutMs: 10 * 60 * 1000,
				lifecycle: {
					onTimeout: "pause",
					autoResume: true,
				},
			});

			await sandbox.files.write(
				"~/.codex/auth.json",
				JSON.stringify(agent.auth),
			);

			const codexUpdate = await sandbox.commands.run(
				"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
				{ timeoutMs: 0 },
			);

			console.log(codexUpdate);

			const result = await sandbox.commands.run(
				'codex exec --yolo --model gpt-5.5 --skip-git-repo-check "Respond with PING and nothing else"',
			);

			console.log(result);

			await syncAgentAuthFromSandbox(sandbox, payload.agentId);

			await db.transact(
				agentTx(payload.agentId).update({
					sandboxId: sandbox.sandboxId,
					status: "ready",
				}),
			);
		} catch (error) {
			await db.transact(
				agentTx(payload.agentId).update({
					status: "setup_failed",
				}),
			);

			throw error;
		}
	},
});
