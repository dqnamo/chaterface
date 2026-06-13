import { createSign } from "node:crypto";
import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../../lib/agent-auth.js";
import { E2BSandbox as Sandbox } from "../../../lib/e2b-sandbox.js";
import type { RouteHandler } from "../../../lib/file-router.js";

type SetupScriptKind = "new_task" | "new_turn";

const FACTORYPLANE_SCRIPT_DIR = "/tmp/factoryplane-scripts";
const FACTORY_SETUP_SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export const POST: RouteHandler = async (c) => {
	const body = parseRunSetupScriptBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error: 'Expected script to be either "new_task" or "new_turn"',
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForSetupScriptRun(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!task.sandboxId) {
		return c.json({ error: "Task sandbox has not been created yet" }, 400);
	}

	const script =
		body.script === "new_task"
			? task.factory.newTaskSetupScript
			: task.factory.newTurnSetupScript;
	const scriptContent = script?.trim();

	if (!scriptContent) {
		return c.json({ error: "Requested setup script is empty" }, 400);
	}

	await persistSetupScriptRunEvent(task.id, body.script, "started");

	try {
		const sandbox = await Sandbox.connect(task.sandboxId);
		const workspacePath = await getSandboxWorkspacePath(sandbox);
		const scriptPath = `${FACTORYPLANE_SCRIPT_DIR}/${body.script}-${task.id}.sh`;
		const envs = await getSetupScriptEnvs(token, task, workspacePath);

		await sandbox.commands.run(
			`mkdir -p ${shellQuote(FACTORYPLANE_SCRIPT_DIR)}`,
			{ timeoutMs: 30_000 },
		);
		await sandbox.files.write(scriptPath, scriptContent);

		const result = await sandbox.commands.run(
			buildRunFactorySetupScriptCommand(scriptPath, workspacePath),
			{
				timeoutMs: FACTORY_SETUP_SCRIPT_TIMEOUT_MS,
				envs,
			},
		);

		await persistSetupScriptRunEvent(task.id, body.script, "completed");

		return c.json({
			script: body.script,
			status: "completed",
			stdout: result.stdout,
			stderr: result.stderr,
		});
	} catch (error) {
		const message = getErrorMessage(error);
		await persistSetupScriptRunEvent(task.id, body.script, "failed", {
			error: message,
		});
		return c.json(
			{
				script: body.script,
				status: "failed",
				error: message,
			},
			500,
		);
	}
};

const getTaskForSetupScriptRun = async (agentToken: string) => {
	return db
		.query({
			tasks: {
				$: {
					fields: ["sandboxId"],
					where: {
						agentToken,
					},
				},
				factory: {
					$: {
						fields: [
							"githubAppInstallationId",
							"newTaskSetupScript",
							"newTurnSetupScript",
						],
					},
				},
			},
		})
		.then((data) => data.tasks[0]);
};

const getSetupScriptEnvs = async (
	_agentToken: string,
	task: NonNullable<Awaited<ReturnType<typeof getTaskForSetupScriptRun>>>,
	workspacePath: string,
) => {
	const envs: Record<string, string> = {
		FACTORYPLANE_FACTORY_ID: task.factory?.id ?? "",
		FACTORYPLANE_TASK_ID: task.id,
		FACTORYPLANE_WORKSPACE: workspacePath,
		GIT_TERMINAL_PROMPT: "0",
	};

	const installationId = task.factory?.githubAppInstallationId;

	if (!installationId) {
		return envs;
	}

	const githubAccessToken =
		await createGithubAppInstallationAccessToken(installationId);

	return {
		...envs,
		GITHUB_ACCESS_TOKEN: githubAccessToken,
		GH_TOKEN: githubAccessToken,
	};
};

const createGithubAppInstallationAccessToken = async (
	installationId: string,
) => {
	const config = getGithubAppConfig();
	const response = await fetch(
		`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
		{
			method: "POST",
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${createGithubAppJwt(config)}`,
				"User-Agent": "Factoryplane",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		throw new Error("Failed to create GitHub App installation token");
	}

	const result = (await response.json()) as { token?: string };

	if (!result.token) {
		throw new Error("GitHub App installation token response was empty");
	}

	return result.token;
};

const getGithubAppConfig = () => {
	const appId = process.env.GITHUB_APP_ID?.trim();
	const privateKey = normalizeGithubAppPrivateKey(
		process.env.GITHUB_APP_PRIVATE_KEY,
	);

	if (!appId || !privateKey) {
		throw new Error("GitHub App credentials are not configured");
	}

	return { appId, privateKey };
};

const createGithubAppJwt = ({
	appId,
	privateKey,
}: {
	appId: string;
	privateKey: string;
}) => {
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(
		JSON.stringify({ alg: "RS256", typ: "JWT" }),
		"utf8",
	).toString("base64url");
	const payload = Buffer.from(
		JSON.stringify({
			iat: now - 60,
			exp: now + 9 * 60,
			iss: appId,
		}),
		"utf8",
	).toString("base64url");
	const unsignedToken = `${header}.${payload}`;
	const signature = createSign("RSA-SHA256")
		.update(unsignedToken)
		.sign(privateKey, "base64url");

	return `${unsignedToken}.${signature}`;
};

const normalizeGithubAppPrivateKey = (value: string | undefined) => {
	const trimmed = value?.trim();

	if (!trimmed) {
		return undefined;
	}

	return trimmed.replace(/\\n/g, "\n");
};

const parseRunSetupScriptBody = (
	value: unknown,
): { script: SetupScriptKind } | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	return isSetupScriptKind(value.script) ? { script: value.script } : undefined;
};

const isSetupScriptKind = (value: unknown): value is SetupScriptKind => {
	return value === "new_task" || value === "new_turn";
};

const getSandboxWorkspacePath = async (sandbox: Sandbox) => {
	const result = await sandbox.commands.run("pwd -P", { timeoutMs: 30_000 });
	const workspacePath = result.stdout.trim();

	if (!workspacePath) {
		throw new Error("Failed to resolve sandbox workspace path");
	}

	return workspacePath;
};

const buildRunFactorySetupScriptCommand = (
	scriptPath: string,
	workspacePath: string,
) =>
	[
		"set -e",
		`chmod 700 ${shellQuote(scriptPath)}`,
		`cd ${shellQuote(workspacePath)}`,
		`IFS= read -r first_line < ${shellQuote(scriptPath)} || true`,
		'case "$first_line" in',
		"  '#!'*)",
		`    ${shellQuote(scriptPath)}`,
		"    ;;",
		"  *)",
		`    bash ${shellQuote(scriptPath)}`,
		"    ;;",
		"esac",
	].join("\n");

const persistSetupScriptRunEvent = async (
	taskId: string,
	script: SetupScriptKind,
	status: "started" | "completed" | "failed",
	data: Record<string, unknown> = {},
) => {
	await db.transact(
		eventTx(id())
			.create({
				type: `factoryplane.setup_script_run_${status}`,
				data: {
					script,
					status,
					...data,
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: taskId }),
	);
};

const getErrorMessage = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const shellQuote = (value: string) => {
	return `'${value.replaceAll("'", "'\\''")}'`;
};
