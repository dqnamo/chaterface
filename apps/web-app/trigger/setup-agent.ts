import db from "@repo/db/admin";
import { task } from "@trigger.dev/sdk";
import { Sandbox } from "e2b/dist/index.mjs";

import { syncAgentAuthFromSandbox } from "./sync-agent-auth";

function agentTx(agentId: string) {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
}

const e2bPortPlaceholder = ["$", "{PORT}"].join("");
const CODEX_AUTH_PATH = "~/.codex/auth.json";

type AgentProvider = "codex" | "cursor";

const getAgentProvider = (agent: {
	provider?: string | null;
}): AgentProvider => (agent.provider === "cursor" ? "cursor" : "codex");

const getCursorApiKey = (auth: unknown) => {
	if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
		return undefined;
	}

	const value = (auth as { apiKey?: unknown }).apiKey;
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;
};

const getCursorPathPrefix = () =>
	'export PATH="$HOME/.cursor/bin:$HOME/.local/bin:$PATH"';

const getCursorInstallCommand = () =>
	[
		getCursorPathPrefix(),
		"if ! command -v cursor-agent >/dev/null 2>&1; then",
		"  curl https://cursor.com/install -fsS | bash",
		"fi",
		"cursor-agent --version",
	].join("\n");

const getCursorEnv = (auth: unknown) => {
	const apiKey = getCursorApiKey(auth);

	if (!apiKey) {
		throw new Error("Cursor agents require auth.apiKey");
	}

	return { CURSOR_API_KEY: apiKey };
};

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

			const provider = getAgentProvider(agent);
			const sandbox = await Sandbox.create("codex", {
				timeoutMs: 10 * 60 * 1000,
				lifecycle: {
					onTimeout: "pause",
					autoResume: true,
				},
				network: {
					allowPublicTraffic: false,
					maskRequestHost: `localhost:${e2bPortPlaceholder}`,
				},
			});

			if (provider === "cursor") {
				const cursorInstall = await sandbox.commands.run(
					getCursorInstallCommand(),
					{ timeoutMs: 120_000 },
				);
				console.log(cursorInstall);

				const result = await sandbox.commands.run(
					[
						getCursorPathPrefix(),
						'cursor-agent -p --output-format text "Respond with PING and nothing else"',
					].join("\n"),
					{ envs: getCursorEnv(agent.auth) },
				);
				console.log(result);
			} else {
				await sandbox.files.write(CODEX_AUTH_PATH, JSON.stringify(agent.auth));

				const codexUpdate = await sandbox.commands.run(
					"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
					{ timeoutMs: 0 },
				);
				console.log(codexUpdate);

				const result = await sandbox.commands.run(
					'codex exec --yolo --model gpt-5.5 --skip-git-repo-check "Respond with PING and nothing else"',
				);
				console.log(result);
			}

			if (provider === "codex") {
				await syncAgentAuthFromSandbox(sandbox, payload.agentId);
			}

			await db.transact(
				agentTx(payload.agentId).update({
					sandboxId: sandbox.sandboxId,
					sandboxTrafficAccessToken: sandbox.trafficAccessToken,
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
