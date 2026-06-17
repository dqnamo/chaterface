import { randomUUID } from "node:crypto";
import { task } from "@trigger.dev/sdk";
import db from "@/instant.admin";
import { E2BSandbox as Sandbox } from "./e2b-sandbox";

const CODEX_HOME = "/home/user/.codex";
const CODEX_PACKAGE = "@openai/codex@latest";
const LOGIN_TIMEOUT_SECONDS = 15 * 60;
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

export const startCodexDeviceAuthTask = task({
	id: "start-codex-device-auth",
	retry: {
		maxAttempts: 1,
	},
	run: async (payload: { agentId: string }) => {
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

		if (agent.provider === "cursor") {
			throw new Error("Cursor agents do not use Codex device auth");
		}

		try {
			const sandbox = await Sandbox.create("codex", {
				timeoutMs: 20 * 60 * 1000,
			});
			const sessionId = randomUUID();

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

			const start = await sandbox.commands.run(
				buildStartLoginCommand(sessionId),
				{
					timeoutMs: 30_000,
				},
			);

			if (start.exitCode !== 0) {
				throw new Error(
					start.stderr || start.stdout || "Failed to start Codex device login",
				);
			}

			await db.transact(
				agentTx(payload.agentId).update({
					authState: {
						type: "codex_device_auth",
						status: "waiting_for_code",
						sessionId,
						updatedAt: new Date().toISOString(),
					},
				}),
			);

			const deadline = Date.now() + LOGIN_TIMEOUT_SECONDS * 1000;
			let lastOutput = "";
			let lastDeviceAuth: CodexDeviceAuthInstructions | undefined;

			while (Date.now() < deadline) {
				const poll = await sandbox.commands.run(buildPollCommand(sessionId), {
					timeoutMs: 30_000,
				});
				const output = poll.stdout;
				const cleanOutput = cleanLoginOutput(output);
				const deviceAuth = parseCodexDeviceAuthInstructions(cleanOutput);
				const deviceAuthChanged =
					JSON.stringify(deviceAuth) !== JSON.stringify(lastDeviceAuth);

				if (deviceAuth) {
					lastDeviceAuth = deviceAuth;
				}

				if (cleanOutput !== lastOutput || deviceAuthChanged) {
					lastOutput = cleanOutput;
					await db.transact(
						agentTx(payload.agentId).update({
							authState: {
								type: "codex_device_auth",
								status: "waiting_for_code",
								sessionId,
								deviceAuth,
								output: cleanOutput,
								updatedAt: new Date().toISOString(),
							},
						}),
					);
				}

				if (output.includes("__CODEX_AUTH_READY__")) {
					await db.transact(
						agentTx(payload.agentId).update({
							status: "auth_pending",
							authState: {
								type: "codex_device_auth",
								status: "pending",
								sessionId,
								deviceAuth: lastDeviceAuth,
								output: cleanOutput,
								updatedAt: new Date().toISOString(),
							},
						}),
					);

					return { agentId: payload.agentId, authReady: true };
				}

				const exitCode = getExitMarker(output);

				if (exitCode !== undefined && exitCode !== 0) {
					throw new Error(
						`Codex device login failed with exit code ${exitCode}`,
					);
				}

				if (exitCode === 0 && !output.includes("__CODEX_LOGIN_RUNNING__")) {
					throw new Error("Codex device login ended without writing auth.json");
				}

				await delay(POLL_INTERVAL_MS);
			}

			throw new Error("Codex device login timed out");
		} catch (error) {
			const message = getErrorMessage(error);

			await db.transact(
				agentTx(payload.agentId).update({
					status: "auth_failed",
					authState: {
						type: "codex_device_auth",
						status: "failed",
						error: message,
						updatedAt: new Date().toISOString(),
					},
				}),
			);

			throw error;
		}
	},
});

const buildStartLoginCommand = (sessionId: string) => {
	const configBase64 = Buffer.from(
		'cli_auth_credentials_store = "file"\n',
	).toString("base64");
	const logPath = getLoginLogPath(sessionId);
	const scriptPath = getLoginScriptPath(sessionId);
	const pidPath = getLoginPidPath(sessionId);
	const script = [
		"#!/bin/sh",
		"set -eu",
		"set +e",
		`CODEX_HOME=${shellQuote(CODEX_HOME)} timeout ${LOGIN_TIMEOUT_SECONDS}s npx -y ${CODEX_PACKAGE} login --device-auth`,
		"status=$?",
		"set -e",
		`printf '\\n__CODEX_LOGIN_EXIT__:%s\\n' "$status" >> ${shellQuote(logPath)}`,
		'exit "$status"',
	].join("\n");
	const scriptBase64 = Buffer.from(script).toString("base64");

	return [
		"set -eu",
		`mkdir -p ${shellQuote(CODEX_HOME)} ${shellQuote(`${CODEX_HOME}/device-login`)}`,
		`chmod 700 ${shellQuote(CODEX_HOME)}`,
		"umask 077",
		`printf %s ${shellQuote(configBase64)} | base64 -d > ${shellQuote(`${CODEX_HOME}/config.toml`)}`,
		`printf %s ${shellQuote(scriptBase64)} | base64 -d > ${shellQuote(scriptPath)}`,
		`chmod 700 ${shellQuote(scriptPath)}`,
		`: > ${shellQuote(logPath)}`,
		`nohup ${shellQuote(scriptPath)} >> ${shellQuote(logPath)} 2>&1 & echo "$!" > ${shellQuote(pidPath)}`,
	].join("\n");
};

const buildPollCommand = (sessionId: string) => {
	const logPath = getLoginLogPath(sessionId);
	const pidPath = getLoginPidPath(sessionId);

	return [
		`cat ${shellQuote(logPath)} 2>/dev/null || true`,
		`if test -s ${shellQuote(`${CODEX_HOME}/auth.json`)}; then echo "__CODEX_AUTH_READY__"; fi`,
		`if test -s ${shellQuote(pidPath)} && kill -0 "$(cat ${shellQuote(pidPath)})" 2>/dev/null; then echo "__CODEX_LOGIN_RUNNING__"; fi`,
	].join("\n");
};

const getLoginLogPath = (sessionId: string) =>
	`${CODEX_HOME}/device-login/${sessionId}.log`;

const getLoginScriptPath = (sessionId: string) =>
	`${CODEX_HOME}/device-login/${sessionId}.sh`;

const getLoginPidPath = (sessionId: string) =>
	`${CODEX_HOME}/device-login/${sessionId}.pid`;

const getExitMarker = (output: string) => {
	const match = output.match(/__CODEX_LOGIN_EXIT__:(\d+)/);
	return match ? Number(match[1]) : undefined;
};

const cleanLoginOutput = (output: string) =>
	stripAnsi(output)
		.replace(/__CODEX_AUTH_READY__\n?/g, "")
		.replace(/__CODEX_LOGIN_RUNNING__\n?/g, "")
		.replace(/__CODEX_LOGIN_EXIT__:\d+\n?/g, "");

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
		/(?:[Uu][Ss][Ee][Rr]\s*)?[Cc][Oo][Dd][Ee][^\nA-Z0-9]*([A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}|[A-Z0-9]{6,12})(?![a-z])/,
	)?.[1];

	if (labeledCode) {
		return labeledCode.toUpperCase();
	}

	return text.match(/\b[A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}\b/)?.[0].toUpperCase();
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

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);
