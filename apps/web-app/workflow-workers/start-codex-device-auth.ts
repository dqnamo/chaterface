import {
	encryptAgentAuth,
	getAgentAuthProviderAccountId,
} from "@/agent-auth-storage";
import db from "@/instant.admin";
import { E2BSandbox as Sandbox } from "@/workflows/e2b-sandbox";

const CODEX_HOME = "/home/user/.codex";
const CODEX_AUTH_PATH = `${CODEX_HOME}/auth.json`;
const CODEX_CONFIG_PATH = `${CODEX_HOME}/config.toml`;
const CODEX_PACKAGE = "@openai/codex@latest";
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;

type CodexDeviceAuthInstructions = {
	verificationUri: string;
	userCode: string;
};

type Agent = {
	id: string;
	provider?: string;
};

const agentTx = (agentId: string) => {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
};

export async function runStartCodexDeviceAuthWorkflow(payload: {
	agentId: string;
}) {
	const agent = await db
		.query({
			agents: {
				$: {
					fields: ["provider"],
					where: {
						id: payload.agentId,
					},
				},
			},
		})
		.then((result) => result.agents[0] as Agent | undefined);

	if (!agent) {
		throw new Error(`Agent ${payload.agentId} not found`);
	}

	if (agent.provider && agent.provider !== "codex") {
		throw new Error(`${agent.provider} agents do not use Codex device auth`);
	}

	let sandbox: Sandbox | undefined;
	let deviceAuth: CodexDeviceAuthInstructions | undefined;
	let loginOutput = "";

	try {
		console.log("Creating Codex auth sandbox", { agentId: payload.agentId });
		sandbox = await Sandbox.create("codex", {
			timeoutMs: LOGIN_TIMEOUT_MS + 5 * 60 * 1000,
		});
		console.log("Created Codex auth sandbox", {
			agentId: payload.agentId,
			sandboxId: sandbox.sandboxId,
		});

		await db.transact(
			agentTx(payload.agentId).update({
				sandboxId: sandbox.sandboxId,
				status: "auth_starting",
				authState: {
					type: "codex_device_auth",
					status: "starting",
					startedAt: new Date().toISOString(),
				},
			}),
		);

		console.log("Preparing Codex auth home", { agentId: payload.agentId });
		await prepareCodexHome(sandbox);
		console.log("Starting Codex device login command", {
			agentId: payload.agentId,
		});

		const login = await sandbox.commands.run(buildCodexLoginCommand(), {
			background: true,
			timeoutMs: 30_000,
			onStdout: (data) => {
				loginOutput += data;
				console.log("Codex device login stdout", {
					agentId: payload.agentId,
					data,
				});
			},
			onStderr: (data) => {
				loginOutput += data;
				console.log("Codex device login stderr", {
					agentId: payload.agentId,
					data,
				});
			},
		});
		console.log("Started Codex device login command", {
			agentId: payload.agentId,
			pid: login.pid,
		});

		await db.transact(
			agentTx(payload.agentId).update({
				status: "auth_pending",
				authState: {
					type: "codex_device_auth",
					status: "waiting_for_code",
					updatedAt: new Date().toISOString(),
				},
			}),
		);

		const deadline = Date.now() + LOGIN_TIMEOUT_MS;
		let lastPublishedLog = "";

		while (Date.now() < deadline) {
			const auth = await readCodexAuth(sandbox);
			const cleanOutput = cleanLoginOutput(loginOutput);
			const nextDeviceAuth =
				parseCodexDeviceAuthInstructions(cleanOutput) ?? deviceAuth;

			if (
				cleanOutput !== lastPublishedLog ||
				JSON.stringify(nextDeviceAuth) !== JSON.stringify(deviceAuth)
			) {
				lastPublishedLog = cleanOutput;
				deviceAuth = nextDeviceAuth;

				await db.transact(
					agentTx(payload.agentId).update({
						authState: {
							type: "codex_device_auth",
							status: "waiting_for_code",
							deviceAuth,
							output: cleanOutput,
							updatedAt: new Date().toISOString(),
						},
					}),
				);
			}

			if (auth) {
				await db.transact(
					agentTx(payload.agentId).update({
						auth: await encryptAgentAuth(auth),
						providerAccountId: getAgentAuthProviderAccountId("codex", auth),
						status: "ready",
						authState: {
							type: "codex_device_auth",
							status: "completed",
							deviceAuth,
							updatedAt: new Date().toISOString(),
						},
					}),
				);

				return { agentId: payload.agentId, status: "ready" };
			}

			if (!(await isProcessRunning(sandbox, login.pid))) {
				const result = await login.wait();
				loginOutput += result.stdout;
				loginOutput += result.stderr;

				const authAfterExit = await readCodexAuth(sandbox);
				if (authAfterExit) {
					await db.transact(
						agentTx(payload.agentId).update({
							auth: await encryptAgentAuth(authAfterExit),
							providerAccountId: getAgentAuthProviderAccountId(
								"codex",
								authAfterExit,
							),
							status: "ready",
							authState: {
								type: "codex_device_auth",
								status: "completed",
								deviceAuth,
								updatedAt: new Date().toISOString(),
							},
						}),
					);

					return { agentId: payload.agentId, status: "ready" };
				}

				const finalLog = cleanLoginOutput(loginOutput);
				throw new Error(
					getLoginFailureMessage(finalLog) ??
						"Codex device login ended before auth.json was written.",
				);
			}

			await delay(POLL_INTERVAL_MS);
		}

		throw new Error(
			"Codex device login timed out before auth.json was written.",
		);
	} catch (error) {
		const message = getErrorMessage(error);

		await db.transact(
			agentTx(payload.agentId).update({
				status: "auth_failed",
				authState: {
					type: "codex_device_auth",
					status: "failed",
					deviceAuth,
					error: message,
					updatedAt: new Date().toISOString(),
				},
			}),
		);

		throw error;
	}
}

const prepareCodexHome = async (sandbox: Sandbox) => {
	const result = await sandbox.commands.run(
		[
			"set -euo pipefail",
			`mkdir -p ${shellQuote(CODEX_HOME)}`,
			`chmod 700 ${shellQuote(CODEX_HOME)}`,
			`printf '%s\n' ${shellQuote('cli_auth_credentials_store = "file"')} > ${shellQuote(CODEX_CONFIG_PATH)}`,
			`rm -f ${shellQuote(CODEX_AUTH_PATH)}`,
		].join("\n"),
		{ timeoutMs: 30_000 },
	);

	if (result.exitCode !== 0) {
		throw new Error(
			result.stderr || result.stdout || "Failed to prepare Codex auth home",
		);
	}
};

const buildCodexLoginCommand = () =>
	[
		"set -euo pipefail",
		`export CODEX_HOME=${shellQuote(CODEX_HOME)}`,
		`timeout ${Math.ceil(LOGIN_TIMEOUT_MS / 1000)}s npx -y ${CODEX_PACKAGE} login --device-auth`,
	].join("\n");

const readCodexAuth = async (sandbox: Sandbox) => {
	let raw: string;

	try {
		raw = await sandbox.files.read(CODEX_AUTH_PATH);
	} catch {
		return undefined;
	}

	let auth: unknown;

	try {
		auth = JSON.parse(raw);
	} catch {
		return undefined;
	}

	return isRecord(auth) && Object.keys(auth).length > 0 ? auth : undefined;
};

const isProcessRunning = async (sandbox: Sandbox, pid: number) => {
	const result = await sandbox.commands.run(`kill -0 ${pid}`, {
		timeoutMs: 30_000,
	});

	return result.exitCode === 0;
};

const getLoginFailureMessage = (output: string) => {
	if (!output.trim()) {
		return undefined;
	}

	if (!parseCodexDeviceAuthInstructions(output)) {
		return "Codex did not print a device-code sign-in link. Make sure device code login is enabled for the ChatGPT account or workspace.";
	}

	return undefined;
};

const cleanLoginOutput = (output: string) => stripAnsi(output).trim();

const parseCodexDeviceAuthInstructions = (
	output: string,
): CodexDeviceAuthInstructions | undefined => {
	const text = stripAnsi(output);
	const verificationUri = findVerificationUri(text);
	const userCode = findUserCode(text) ?? findUserCodeInUrl(verificationUri);

	if (!verificationUri || !userCode) {
		return undefined;
	}

	return {
		verificationUri,
		userCode,
	};
};

const findVerificationUri = (text: string) => {
	const urls = [...text.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
		.map((match) => cleanUrl(match[0]))
		.filter(Boolean);

	return (
		urls.find((url) =>
			/(^https?:\/\/([^/]+\.)?(openai|chatgpt)\.com\b|device|verify|activate|login|oauth)/i.test(
				url,
			),
		) ?? urls.at(-1)
	);
};

const findUserCode = (text: string) => {
	const labeledCode = text.match(
		/(?:[Uu][Ss][Ee][Rr]\s*)?[Cc][Oo][Dd][Ee][\s\S]{0,160}?([A-Z0-9]{4,6}(?:-[A-Z0-9]{4,6}){1,3}|[A-Z0-9]{6,12})(?![a-z])/,
	)?.[1];

	if (labeledCode) {
		return labeledCode.toUpperCase();
	}

	return text
		.match(/\b[A-Z0-9]{4,6}(?:-[A-Z0-9]{4,6}){1,3}\b/)?.[0]
		.toUpperCase();
};

const findUserCodeInUrl = (url: string | undefined) => {
	if (!url) {
		return undefined;
	}

	try {
		const parsed = new URL(url);
		return (
			parsed.searchParams.get("user_code") ??
			parsed.searchParams.get("code") ??
			undefined
		)?.toUpperCase();
	} catch {
		return undefined;
	}
};

const cleanUrl = (value: string) => value.replace(/[),.;\]]+$/g, "").trim();

const stripAnsi = (value: string) =>
	value.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape parsing requires control characters.
		/[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
		"",
	);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);
