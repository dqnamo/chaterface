import { randomUUID } from "node:crypto";
import type { InstaQLEntity } from "@instantdb/react";
import db from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import { task } from "@trigger.dev/sdk";
import { Sandbox } from "e2b";
import {
	CODEX_REASONING_EFFORT_OPTIONS,
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	getCodexSpeedConfigOverrides,
	getTaskAgentSpeed,
} from "@/codex-options";
import type { AppSchema } from "@/instant.schema";
import {
	formatCodexDeveloperInstructionsConfig,
	getCodexDeveloperInstructions,
} from "./codex-system-prompt";
import { syncAgentAuthFromSandbox } from "./sync-agent-auth";

type Event = InstaQLEntity<AppSchema, "events">;
type Task = InstaQLEntity<AppSchema, "tasks">;
type Agent = InstaQLEntity<AppSchema, "agents">;
type Factory = InstaQLEntity<AppSchema, "factories">;
type CodexEvent = {
	type: string;
	data: unknown;
};

type RunCodexExecOptions = {
	resumeLast?: boolean;
};

const CODEX_AUTH_PATH = "~/.codex/auth.json";
const DIFF_BASELINE_ROOT = "/tmp/factoryplane-baselines";
const DIFF_WORK_ROOT = "/tmp/factoryplane-diff-work";
const DIFF_STORAGE_CONTENT_TYPE = "text/x-patch";
const SANDBOX_DIFF_EXCLUDES = [
	".git",
	".codex",
	".factoryplane",
	".cache",
	".config",
	".npm",
	".next",
	".turbo",
	".vercel",
	"node_modules",
	"dist",
	"build",
	"coverage",
	"*.log",
	".env",
	".env.*",
];

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

export const processEventTask = task({
	id: "process-event",
	retry: {
		maxAttempts: 3,
	},
	run: async (payload: { eventId: string }) => {
		console.log("Processing event", payload);

		const event = await db
			.query({
				events: {
					$: {
						where: {
							id: payload.eventId,
						},
					},
					task: {
						agent: {},
						factory: {},
					},
				},
			})
			.then((result) => result.events[0]);

		const task = event?.task;
		const agent = task?.agent;
		const factory = task?.factory;

		if (!event || !task || !agent || !factory) {
			console.log("Skipping event without task, agent, or factory", payload);
			return;
		}

		if (event?.type === "factoryplane.new_task") {
			await processNewTask(agent as Agent, task as Task, factory as Factory);
		} else if (event?.type === "factoryplane.new_user_message") {
			await processNewUserMessage(
				event as Event,
				task as Task,
				agent as Agent,
				factory as Factory,
			);
		}
	},
});

const processNewTask = async (agent: Agent, task: Task, factory: Factory) => {
	const sandbox = await setupTaskSandbox(agent, task, factory);
	const message = `${task.name}. ${task.instructions ?? ""}.`;

	await runCodexExec(sandbox, task, factory, message, {}, agent.id);
};

const processNewUserMessage = async (
	event: Event,
	task: Task,
	agent: Agent,
	factory: Factory,
) => {
	const content = getStringDataValue(event.data, "content");

	if (!content) {
		console.log("Skipping user message event without content", event.id);
		return;
	}

	if (!task.sandboxId) {
		throw new Error(`Task ${task.id} is missing sandboxId`);
	}

	const sandbox = await Sandbox.connect(task.sandboxId);
	await killTaskCodexProcess(sandbox, task);
	await runCodexExec(
		sandbox,
		task,
		factory,
		content,
		{ resumeLast: true },
		agent.id,
	);
};

const setupTaskSandbox = async (agent: Agent, task: Task, factory: Factory) => {
	if (!agent.auth || !factory) {
		throw new Error(`Agent ${agent.id} is missing auth or factory`);
	}

	const sandbox = await Sandbox.create("codex", {
		timeoutMs: 10 * 60 * 1000,
		lifecycle: {
			onTimeout: "pause",
			autoResume: true,
		},
	});

	await db.transact(
		taskTx(task.id).update({
			sandboxId: sandbox.sandboxId,
		}),
	);

	await sandbox.files.write(CODEX_AUTH_PATH, JSON.stringify(agent.auth));

	// update the codex version
	const codexUpdate = await sandbox.commands.run(
		"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
		{ timeoutMs: 0 },
	);

	console.log(codexUpdate);

	const diffWorkspacePath = await createTaskWorkspaceBaseline(sandbox, task.id);
	await db.transact(
		taskTx(task.id).update({
			diffWorkspacePath,
		}),
	);

	return sandbox;
};

const runCodexExec = async (
	sandbox: Sandbox,
	task: Task,
	factory: Factory,
	prompt: string,
	options: RunCodexExecOptions = {},
	agentId: string,
) => {
	const { envs, agentToken } = await setupRun(sandbox, task, factory);
	const output = createCodexOutputHandler(task.id);
	const command = await sandbox.commands.run(
		buildCodexExecCommand(task, prompt, options),
		{
			background: true,
			timeoutMs: 0,
			envs,
			onStdout: output.append,
			onStderr: (data) => {
				console.error(data);
			},
		},
	);

	await updateTaskAgentPid(task.id, command.pid);

	let wasInterrupted = false;

	try {
		const result = await command.wait();
		console.log(result);
	} catch (error) {
		const currentPid = await getTaskAgentPid(task.id);

		if (currentPid !== command.pid) {
			console.log("Codex process was interrupted", {
				taskId: task.id,
				pid: command.pid,
				error,
			});
			wasInterrupted = true;
			return;
		}

		throw error;
	} finally {
		await output.flush();
		if (!wasInterrupted) {
			await persistTaskDiff(sandbox, task).catch((error) => {
				console.error("Failed to persist task diff", {
					taskId: task.id,
					error,
				});
			});
		}
		await clearTaskAgentPid(task.id, command.pid);
		await postRun(task.id, agentToken);
		await syncAgentAuthFromSandbox(sandbox, agentId);
	}
};

const createTaskWorkspaceBaseline = async (
	sandbox: Sandbox,
	taskId: string,
) => {
	const workspacePath = await getSandboxWorkspacePath(sandbox);
	const baselinePath = getTaskBaselinePath(taskId);

	await sandbox.commands.run(
		[
			"set -e",
			buildReplaceDirectoryFunction(),
			`replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(baselinePath)}`,
		].join("\n"),
		{ timeoutMs: 120_000 },
	);

	return workspacePath;
};

const persistTaskDiff = async (sandbox: Sandbox, task: Task) => {
	const workspacePath =
		typeof task.diffWorkspacePath === "string" &&
		task.diffWorkspacePath.length > 0
			? task.diffWorkspacePath
			: await getSandboxWorkspacePath(sandbox);
	const baselinePath = getTaskBaselinePath(task.id);

	const hasBaseline = await sandbox.commands.run(
		`test -d ${shellQuote(baselinePath)} && printf yes || printf no`,
		{ timeoutMs: 30_000 },
	);

	if (hasBaseline.stdout.trim() !== "yes") {
		console.warn("Task diff baseline missing; recreating baseline", {
			taskId: task.id,
			baselinePath,
		});
		const nextWorkspacePath = await createTaskWorkspaceBaseline(
			sandbox,
			task.id,
		);
		await db.transact(
			taskTx(task.id).update({
				diffWorkspacePath: nextWorkspacePath,
			}),
		);
		return;
	}

	const patch = await generateTaskPatch(sandbox, task.id, workspacePath);
	const latestDiffPath = `tasks/${task.id}/latest.patch`;
	const patchBuffer = Buffer.from(patch, "utf8");
	const { data: file } = await db.storage.uploadFile(
		latestDiffPath,
		patchBuffer,
		{
			contentType: DIFF_STORAGE_CONTENT_TYPE,
			contentDisposition: `inline; filename="${task.id}.patch"`,
		},
	);

	await db.transact(
		taskTx(task.id)
			.update({
				diffWorkspacePath: workspacePath,
				latestDiffPath,
				latestDiffGeneratedAt: new Date().toISOString(),
				latestDiffBytes: patchBuffer.byteLength,
			})
			.link({ latestDiffFile: file.id }),
	);
};

const generateTaskPatch = async (
	sandbox: Sandbox,
	taskId: string,
	workspacePath: string,
) => {
	const baselinePath = getTaskBaselinePath(taskId);
	const workPath = `${DIFF_WORK_ROOT}/${taskId}`;
	const repoPath = `${workPath}/repo`;
	const result = await sandbox.commands.run(
		[
			"set -e",
			buildReplaceDirectoryFunction(),
			`rm -rf ${shellQuote(workPath)}`,
			`mkdir -p ${shellQuote(repoPath)}`,
			`replace_factoryplane_dir ${shellQuote(baselinePath)} ${shellQuote(repoPath)}`,
			`cd ${shellQuote(repoPath)}`,
			"git init -q",
			"git config user.email factoryplane@example.com",
			"git config user.name Factoryplane",
			"git add -A",
			"git commit --allow-empty -qm baseline",
			`replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(repoPath)}`,
			"git add -A",
			"git diff --cached --binary --full-index HEAD",
		].join("\n"),
		{ timeoutMs: 120_000 },
	);

	return result.stdout;
};

const getSandboxWorkspacePath = async (sandbox: Sandbox) => {
	const result = await sandbox.commands.run("pwd -P", { timeoutMs: 30_000 });
	const workspacePath = result.stdout.trim();

	if (!workspacePath) {
		throw new Error("Failed to resolve sandbox workspace path");
	}

	return workspacePath;
};

const getTaskBaselinePath = (taskId: string) => {
	return `${DIFF_BASELINE_ROOT}/${taskId}`;
};

const buildReplaceDirectoryFunction = () => {
	const rsyncExcludes = SANDBOX_DIFF_EXCLUDES.map(
		(pattern) => `--exclude ${shellQuote(pattern)}`,
	).join(" ");
	const tarExcludes = SANDBOX_DIFF_EXCLUDES.map(
		(pattern) => `--exclude=${shellQuote(pattern)}`,
	).join(" ");

	return `
replace_factoryplane_dir() {
	src="$1"
	dest="$2"
	mkdir -p "$dest"
	if command -v rsync >/dev/null 2>&1; then
		rsync -a --delete ${rsyncExcludes} "$src"/ "$dest"/
	else
		find "$dest" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
		tar -C "$src" ${tarExcludes} -cf - . | tar -C "$dest" -xf -
	fi
}
`;
};

const setupRun = async (sandbox: Sandbox, task: Task, factory: Factory) => {
	const agentToken = randomUUID();
	await db.transact(
		taskTx(task.id).update({
			agentToken,
		}),
	);

	const encryptionService = createEncryptionService(
		process.env.SECRET_ENCRYPTION_KEY ?? "",
	);
	if (!factory.githubAccessTokenEncrypted) {
		throw new Error(`Factory ${factory.id} is missing GitHub access token`);
	}

	const githubAccessToken = await encryptionService.decrypt(
		factory.githubAccessTokenEncrypted,
	);
	const envs = {
		FACTORYPLANE_AUTH_TOKEN: agentToken,
		GITHUB_ACCESS_TOKEN: githubAccessToken,
	};

	const ghAuth = await sandbox.commands.run(
		'printf "%s" "$GITHUB_ACCESS_TOKEN" | gh auth login --with-token',
		{
			timeoutMs: 30_000,
			envs,
		},
	);
	console.log(ghAuth);

	return { envs, agentToken };
};

const postRun = async (taskId: string, agentToken: string) => {
	await clearTaskAgentToken(taskId, agentToken);
};

const buildCodexExecCommand = (
	task: Task,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	const model = getTaskAgentModel(task);
	const reasoningEffort = getTaskAgentReasoningEffort(task);
	const speedConfigOverrides = getCodexSpeedConfigOverrides(
		getTaskAgentSpeed(task.agentSpeed),
	);
	const args = [
		"codex exec",
		"--json",
		"--yolo",
		`--model ${shellQuote(model)}`,
		`-c ${shellQuote(`model_reasoning_effort=${reasoningEffort}`)}`,
		...speedConfigOverrides.map((override) => `-c ${shellQuote(override)}`),
		"--skip-git-repo-check",
	];

	if (options.resumeLast) {
		args.push("resume --last");
	} else {
		args.push(
			`-c ${shellQuote(formatCodexDeveloperInstructionsConfig(getCodexDeveloperInstructions()))}`,
		);
	}

	args.push(shellQuote(prompt));
	return args.join(" ");
};

const getTaskAgentModel = (task: Task) => {
	return task.agentModel ?? DEFAULT_CODEX_MODEL;
};

const getTaskAgentReasoningEffort = (task: Task) => {
	const effort = task.agentReasoningEffort ?? DEFAULT_CODEX_REASONING_EFFORT;
	const isValid = CODEX_REASONING_EFFORT_OPTIONS.some(
		(option) => option.value === effort,
	);

	return isValid ? effort : DEFAULT_CODEX_REASONING_EFFORT;
};

const killTaskCodexProcess = async (sandbox: Sandbox, task: Task) => {
	if (typeof task.agentPid !== "number") {
		return;
	}

	try {
		const killed = await sandbox.commands.kill(task.agentPid);
		console.log("Killed previous Codex process", {
			taskId: task.id,
			pid: task.agentPid,
			killed,
		});
	} catch (error) {
		console.log("Failed to kill previous Codex process", {
			taskId: task.id,
			pid: task.agentPid,
			error,
		});
	}

	await clearTaskAgentPid(task.id, task.agentPid);
};

const updateTaskAgentPid = async (taskId: string, agentPid: number) => {
	await db.transact(
		taskTx(taskId).update({
			agentPid,
		}),
	);
};

const clearTaskAgentPid = async (taskId: string, agentPid: number) => {
	const currentPid = await getTaskAgentPid(taskId);

	if (currentPid !== agentPid) {
		return;
	}

	await db.transact(
		taskTx(taskId).update({
			agentPid: undefined,
		}),
	);
};

const getTaskAgentPid = async (taskId: string) => {
	const currentTask = await db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
			},
		})
		.then((result) => result.tasks[0]);

	return currentTask?.agentPid;
};

const clearTaskAgentToken = async (taskId: string, agentToken: string) => {
	const currentToken = await getTaskAgentToken(taskId);

	if (currentToken !== agentToken) {
		return;
	}

	await db.transact(
		taskTx(taskId).update({
			agentToken: undefined,
		}),
	);
};

const getTaskAgentToken = async (taskId: string) => {
	const currentTask = await db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
			},
		})
		.then((result) => result.tasks[0]);

	return currentTask?.agentToken;
};

const createCodexOutputHandler = (taskId: string) => {
	let buffer = "";

	const append = async (chunk: string) => {
		buffer += chunk;

		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? "";

		await persistCodexEvents(taskId, parseCodexLines(lines));
	};

	const flush = async () => {
		const finalLine = buffer.trim();
		buffer = "";

		if (!finalLine) {
			return;
		}

		const events = parseCodexLines([finalLine]);
		await persistCodexEvents(taskId, events);
	};

	return { append, flush };
};

const parseCodexLines = (lines: string[]) => {
	const events: CodexEvent[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		events.push(parseCodexEvent(line));
	}

	return events;
};

const parseCodexEvent = (line: string): CodexEvent => {
	try {
		const data = JSON.parse(line) as unknown;

		if (!isRecord(data)) {
			return {
				type: "codex.event",
				data: {
					value: data,
					raw: line,
				},
			};
		}

		const rawType =
			typeof data.type === "string" && data.type.length > 0
				? data.type
				: "event";

		return {
			type: rawType.startsWith("codex.") ? rawType : `codex.${rawType}`,
			data,
		};
	} catch (error) {
		return {
			type: "codex.unparsed",
			data: {
				raw: line,
				error: error instanceof Error ? error.message : String(error),
			},
		};
	}
};

const persistCodexEvents = async (taskId: string, events: CodexEvent[]) => {
	if (events.length === 0) {
		return;
	}

	await db.transact(
		events.map((event) => {
			const eventTx = db.tx.events[randomUUID()];

			if (!eventTx) {
				throw new Error("Failed to create InstantDB event transaction");
			}

			return eventTx
				.create({
					type: event.type,
					data: event.data,
					createdAt: new Date().toISOString(),
				})
				.link({ task: taskId });
		}),
	);
};

const getStringDataValue = (data: unknown, key: string) => {
	if (!isRecord(data)) {
		return undefined;
	}

	const value = data[key];
	return typeof value === "string" ? value : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const shellQuote = (value: string) => {
	return `'${value.replaceAll("'", "'\\''")}'`;
};
