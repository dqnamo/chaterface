import { createHash, createSign, randomUUID } from "node:crypto";
import type { InstaQLEntity } from "@instantdb/react";
import { task } from "@trigger.dev/sdk";
import { decryptAgentAuth } from "@/agent-auth-storage";
import {
	CODEX_REASONING_EFFORT_OPTIONS,
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	getAgentDefaultOptions,
	getCodexSpeedConfigOverrides,
	getTaskAgentSpeed,
} from "@/codex-options";
import { createEncryptionService } from "@/encryption";
import db from "@/instant.admin";
import type { AppSchema } from "@/instant.schema";
import {
	decryptSlackBotToken,
	parseSlackAuth,
	postSlackMessage,
	SLACK_PROVIDER,
	SLACK_SEND_MESSAGE_ACTION,
} from "@/integrations/slack";
import {
	formatCodexDeveloperInstructionsConfig,
	getCodexDeveloperInstructions,
} from "./codex-system-prompt";
import { E2BSandbox as Sandbox } from "./e2b-sandbox";
import { syncAgentAuthFromSandbox } from "./sync-agent-auth";

type Event = InstaQLEntity<AppSchema, "events">;
type Task = InstaQLEntity<AppSchema, "tasks">;
type Agent = InstaQLEntity<AppSchema, "agents">;
type AgentSession = InstaQLEntity<AppSchema, "agentSessions"> & {
	agent?: Agent;
};
type EventWithAgentSession = Event & {
	agentSession?: AgentSession;
};
type Workspace = InstaQLEntity<AppSchema, "workspaces">;
type Repository = InstaQLEntity<AppSchema, "repositories">;
type EnvironmentFile = InstaQLEntity<AppSchema, "environmentFiles">;
type Skill = InstaQLEntity<AppSchema, "skills">;
type McpServer = InstaQLEntity<AppSchema, "mcpServers">;
type Command = InstaQLEntity<AppSchema, "commands">;
type SandboxPackage = InstaQLEntity<AppSchema, "sandboxPackages">;
type IntegrationConnection = InstaQLEntity<AppSchema, "integrationConnections">;
type WorkspaceWithRepositories = Workspace & {
	repositories?: Repository[];
	environmentFiles?: EnvironmentFile[];
	skills?: Skill[];
	mcpServers?: McpServer[];
	commands?: Command[];
	sandboxPackages?: SandboxPackage[];
	agents?: Agent[];
	integrationConnections?: IntegrationConnection[];
};
type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		label?: string;
		prompt?: string;
		agentId?: string;
		sessionKey?: string;
		instruction?: string;
		question?: string;
		options?: DecisionOption[];
		completionMessage?: string;
		conditions?: RouterCondition[];
		provider?: string;
		action?: string;
		connectionId?: string;
		channelId?: string;
		messageTemplate?: string;
		threadTsTemplate?: string;
	};
};
type DecisionOption = {
	id: string;
	label?: string;
};
type PendingAgentDecision = {
	questionId: string;
	workflowNodeId: string;
	agentSessionId?: string;
	question: string;
	options: DecisionOption[];
	askedAt: string;
};
type WorkflowDecisionAnswer = {
	questionId?: string;
	workflowNodeId?: string;
	route?: string;
	answerId?: string;
	answerLabel?: string;
	reason?: string;
	additionalInformation?: unknown;
	answeredAt?: string;
};
type RouterCondition = {
	id: string;
	label?: string;
	expression?: string;
};
type WorkflowEdge = {
	source?: string;
	sourceHandle?: string | null;
	target?: string;
	targetHandle?: string | null;
};
type FloorWorkflow = {
	nodes?: WorkflowNode[];
	edges?: WorkflowEdge[];
};
type RepositorySecret = {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
};
type TaskEnvironmentPackage = {
	command: string;
	aptPackage: string;
};
type TaskDiffFileStatus =
	| "added"
	| "modified"
	| "deleted"
	| "renamed"
	| "copied"
	| "typechange"
	| "unmerged"
	| "unknown";
type TaskDiffFileSummary = {
	path: string;
	oldPath?: string;
	status: TaskDiffFileStatus;
	additions?: number;
	deletions?: number;
	binary?: boolean;
};
type ConfiguredTaskEnvironmentPackage = {
	aptPackage: string;
	command?: string;
};
type CodexEvent = {
	type: string;
	data: unknown;
};
type AgentProvider = "codex" | "cursor";
type WorkspaceSetupScriptKind = "new_task" | "new_turn";
type Attachment = {
	id: string;
	path: string;
	url?: string;
	name: string;
	contentType: string;
	size: number;
};
type AttachmentDownload = {
	contentType: string;
	downloadUrl: string;
	filePath: string;
};
type CommandResultLike = {
	exitCode: number;
	stdout?: string;
	stderr?: string;
};

type RunCodexExecOptions = {
	attachments?: Attachment[];
	imagePaths?: string[];
	attachmentPaths?: string[];
	agentSession?: AgentSession;
	outputLastMessagePath?: string;
	outputSchemaPath?: string;
	persistEvents?: boolean;
	resumeLast?: boolean;
	ephemeral?: boolean;
};

type SetupStepOptions = {
	timeoutMs?: number;
	failureStatus?: "failed" | "warning";
};

const CODEX_AUTH_PATH = "~/.codex/auth.json";
const CODEX_CONFIG_PATH = "~/.codex/config.toml";
const DEFAULT_API_URL = "https://api.factoryplane.com";
const DIFF_BASELINE_ROOT = "/tmp/factoryplane-baselines";
const DIFF_WORK_ROOT = "/tmp/factoryplane-diff-work";
const DIFF_STORAGE_CONTENT_TYPE = "text/x-patch";
const REPOSITORY_SECRETS_FINGERPRINT_PATH =
	".factoryplane/repository-secrets-fingerprint";
const REPOSITORY_SECRETS_ENV_BLOCK_START =
	"# >>> FACTORYPLANE REPOSITORY SECRETS";
const REPOSITORY_SECRETS_ENV_BLOCK_END =
	"# <<< FACTORYPLANE REPOSITORY SECRETS";
const FACTORYPLANE_SCRIPT_DIR = "/tmp/factoryplane-scripts";
const WORKFLOW_OUTPUT_DIR = "/tmp/factoryplane-agent-outputs";
const HUMAN_LOOP_HANDLE_ID = "human-loop";
const WORKSPACE_SETUP_SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;
const GITHUB_AUTH_VALIDATION_TIMEOUT_MS = 120_000;
const GITHUB_AUTH_SETUP_STEP_TIMEOUT_MS =
	GITHUB_AUTH_VALIDATION_TIMEOUT_MS + 10_000;
const DEFAULT_TASK_ENVIRONMENT_PACKAGES: TaskEnvironmentPackage[] = [
	{
		command: "rg",
		aptPackage: "ripgrep",
	},
];
const APT_PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9+._:-]*$/;
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

const getAgentProvider = (agent: {
	provider?: string | null;
}): AgentProvider => (agent.provider === "cursor" ? "cursor" : "codex");

const getProviderLabel = (provider: AgentProvider) =>
	provider === "cursor" ? "Cursor" : "Codex";

const getCursorApiKey = (auth: unknown) => {
	if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
		return undefined;
	}

	const value = (auth as { apiKey?: unknown }).apiKey;
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;
};

const getCursorAuthEnvs = async (
	agent: Agent,
): Promise<Record<string, string>> => {
	const apiKey = getCursorApiKey(await getAgentAuth(agent));

	if (!apiKey) {
		throw new Error(`Cursor agent ${agent.id} is missing auth.apiKey`);
	}

	return { CURSOR_API_KEY: apiKey };
};

const getAgentAuth = async (agent: Agent) => {
	if (!agent.auth) {
		throw new Error(`Agent ${agent.id} is missing auth`);
	}

	return decryptAgentAuth(agent.auth);
};

const getCursorPathPrefix = () =>
	'export PATH="$HOME/.cursor/bin:$HOME/.local/bin:$PATH"';

const buildCursorInstallCommand = () =>
	[
		getCursorPathPrefix(),
		"if ! command -v cursor-agent >/dev/null 2>&1; then",
		"  curl https://cursor.com/install -fsS | bash",
		"fi",
		"cursor-agent --version",
	].join("\n");

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const agentSessionTx = (agentSessionId: string) => {
	const tx = db.tx.agentSessions[agentSessionId];

	if (!tx) {
		throw new Error(
			`Agent session transaction builder ${agentSessionId} not found`,
		);
	}

	return tx;
};

const integrationConnectionTx = (connectionId: string) => {
	const tx = db.tx.integrationConnections[connectionId];

	if (!tx) {
		throw new Error(`Integration connection ${connectionId} not found`);
	}

	return tx;
};

const updateTaskStatus = async (
	taskId: string,
	status: "idle" | "in_progress" | "failed",
) => {
	await db.transact(
		taskTx(taskId).update({
			status,
		}),
	);
};

const updateTaskFailureState = async (
	taskId: string,
	agentSessionId: string | undefined,
) => {
	const failedTaskUpdate = taskTx(taskId).update({
		status: "failed",
	});

	if (!agentSessionId) {
		await db.transact(failedTaskUpdate);
		return;
	}

	await db.transact([
		failedTaskUpdate,
		agentSessionTx(agentSessionId).update({
			agentPid: undefined,
			status: "failed",
			updatedAt: new Date().toISOString(),
		}),
	]);
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
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
					agentSession: {
						agent: {},
					},
					task: {
						agent: {},
						workspace: {
							repositories: {},
							environmentFiles: {},
							skills: {},
							mcpServers: {},
							commands: {},
							sandboxPackages: {},
							agents: {},
							integrationConnections: {},
						},
					},
				},
			})
			.then((result) => result.events?.[0]);

		const task = event?.task;
		const agent = task?.agent;
		const workspace = task?.workspace;

		if (!event || !task || !agent || !workspace) {
			console.log("Skipping event without task, agent, or workspace", payload);
			return;
		}

		try {
			if (event?.type === "factoryplane.new_task") {
				await processNewTask(
					event as Event,
					agent as Agent,
					task as Task,
					workspace as WorkspaceWithRepositories,
				);
			} else if (event?.type === "factoryplane.new_user_message") {
				await processNewUserMessage(
					event as Event,
					task as Task,
					agent as Agent,
					workspace as WorkspaceWithRepositories,
				);
			}
		} catch (error) {
			await updateTaskFailureState(
				task.id,
				(event as EventWithAgentSession).agentSession?.id,
			);
			throw error;
		}
	},
});

const processNewTask = async (
	event: Event,
	agent: Agent,
	task: Task,
	workspace: WorkspaceWithRepositories,
) => {
	const { sandbox, diffWorkspacePath } = await setupTaskSandbox(
		agent,
		task,
		workspace,
	);
	const agentSession = await resolveAgentSession(event, task, agent, workspace);
	const attachments = getAttachments(event.data, task.id);
	const message = buildNewTaskPrompt(task, attachments);

	const completed = await runAgentExec(
		sandbox,
		{ ...task, diffWorkspacePath },
		agent,
		workspace,
		message,
		{ agentSession, attachments },
	);

	if (completed) {
		await enqueueWorkflowContinuation(
			sandbox,
			{ ...task, diffWorkspacePath },
			workspace,
			agentSession,
		);
	}
};

const processNewUserMessage = async (
	event: Event,
	task: Task,
	agent: Agent,
	workspace: WorkspaceWithRepositories,
) => {
	const content = getStringDataValue(event.data, "content");
	const attachments = getAttachments(event.data, task.id);

	if (!content && attachments.length === 0) {
		console.log(
			"Skipping user message event without content or attachments",
			event.id,
		);
		return;
	}

	if (!task.sandboxId) {
		throw new Error(`Task ${task.id} is missing sandboxId`);
	}

	const sandbox = await Sandbox.connect(task.sandboxId);
	const agentSession = await resolveAgentSession(event, task, agent, workspace);
	const provider = getAgentProvider(agent);
	const canResumeAgentSession =
		provider === "codex" ? Boolean(agentSession.agentThreadId) : true;
	const userPrompt = content ?? "Please use the attached file input.";
	await killTaskAgentProcess(sandbox, task, agentSession);
	await setupSandboxGitIdentity(sandbox, task.id, workspace);
	await syncRepositoryEnvFilesIfChanged(sandbox, task.id, workspace);
	const completed = await runAgentExec(
		sandbox,
		task,
		agent,
		workspace,
		userPrompt,
		{
			agentSession,
			attachments,
			resumeLast: canResumeAgentSession,
		},
	);

	if (completed) {
		await enqueueWorkflowContinuation(sandbox, task, workspace, agentSession);
	}
};

const resolveAgentSession = async (
	event: Event,
	task: Task,
	agent: Agent,
	workspace: WorkspaceWithRepositories,
): Promise<AgentSession> => {
	const linkedSession = (event as Event & { agentSession?: AgentSession })
		.agentSession;

	if (linkedSession) {
		return linkedSession;
	}

	const sessionKey = getWorkflowSessionKeyForTask(task, workspace);
	const existingSession = await db
		.query({
			agentSessions: {
				$: {
					where: {
						"task.id": task.id,
						workflowSessionKey: sessionKey,
					},
				},
				agent: {},
			},
		})
		.then((result) => result.agentSessions[0] as AgentSession | undefined);

	if (existingSession) {
		await db.transact(
			eventTx(event.id).link({ agentSession: existingSession.id }),
		);
		return existingSession;
	}

	const legacySession = await db
		.query({
			agentSessions: {
				$: {
					where: {
						"task.id": task.id,
						workflowNodeId: task.workflowNodeId,
					},
				},
				agent: {},
			},
		})
		.then((result) => result.agentSessions[0] as AgentSession | undefined);

	if (legacySession) {
		await db.transact([
			agentSessionTx(legacySession.id).update({
				workflowSessionKey: sessionKey,
				updatedAt: new Date().toISOString(),
			}),
			eventTx(event.id).link({ agentSession: legacySession.id }),
		]);
		return {
			...legacySession,
			workflowSessionKey: sessionKey,
		} as AgentSession;
	}

	const agentSessionId = randomUUID();
	const now = new Date().toISOString();
	const name = getAgentSessionName(sessionKey);

	await db.transact([
		agentSessionTx(agentSessionId)
			.create({
				name,
				status: "idle",
				createdAt: now,
				updatedAt: now,
				workflowNodeId: task.workflowNodeId,
				workflowSessionKey: sessionKey,
			})
			.link({ task: task.id, agent: agent.id }),
		eventTx(event.id).link({ agentSession: agentSessionId }),
	]);

	return {
		id: agentSessionId,
		name,
		status: "idle",
		createdAt: now,
		updatedAt: now,
		workflowNodeId: task.workflowNodeId,
		workflowSessionKey: sessionKey,
		agent,
	} as AgentSession;
};

const getOrCreateAgentSessionForStep = async (
	task: Task,
	agent: Agent,
	workflowNode: WorkflowNode,
) => {
	const workflowNodeId = workflowNode.id;
	const sessionKey = getWorkflowSessionKey(workflowNode);
	const existingSession = await db
		.query({
			agentSessions: {
				$: {
					where: {
						"task.id": task.id,
						workflowSessionKey: sessionKey,
					},
				},
				agent: {},
			},
		})
		.then((result) => result.agentSessions[0] as AgentSession | undefined);

	if (existingSession) {
		return existingSession;
	}

	const legacySession =
		sessionKey === workflowNodeId
			? undefined
			: await db
					.query({
						agentSessions: {
							$: {
								where: {
									"task.id": task.id,
									workflowNodeId,
								},
							},
							agent: {},
						},
					})
					.then(
						(result) => result.agentSessions[0] as AgentSession | undefined,
					);

	if (legacySession) {
		await db.transact(
			agentSessionTx(legacySession.id).update({
				workflowSessionKey: sessionKey,
				updatedAt: new Date().toISOString(),
			}),
		);
		return {
			...legacySession,
			workflowSessionKey: sessionKey,
		} as AgentSession;
	}

	const agentSessionId = randomUUID();
	const now = new Date().toISOString();
	const name = getAgentSessionName(sessionKey);

	await db.transact(
		agentSessionTx(agentSessionId)
			.create({
				name,
				status: "idle",
				createdAt: now,
				updatedAt: now,
				workflowNodeId,
				workflowSessionKey: sessionKey,
			})
			.link({ task: task.id, agent: agent.id }),
	);

	return {
		id: agentSessionId,
		name,
		status: "idle",
		createdAt: now,
		updatedAt: now,
		workflowNodeId,
		workflowSessionKey: sessionKey,
		agent,
	} as AgentSession;
};

const getWorkflowSessionKeyForTask = (
	task: Task,
	workspace: WorkspaceWithRepositories,
) => {
	const workflow = getTaskFloorWorkflow(task, workspace);
	const workflowNode = workflow.nodes.find(
		(node) => node.id === task.workflowNodeId,
	);

	return workflowNode
		? getWorkflowSessionKey(workflowNode)
		: task.workflowNodeId;
};

const getWorkflowSessionKey = (workflowNode: WorkflowNode) => {
	const rawKey = getOptionalDataString(workflowNode.data?.sessionKey);
	return rawKey ?? workflowNode.id;
};

const getAgentSessionName = (sessionKey: string | undefined) =>
	sessionKey ? `Agent conversation ${sessionKey}` : "Agent";

const enqueueWorkflowContinuation = async (
	sandbox: Sandbox,
	task: Task,
	workspace: WorkspaceWithRepositories,
	agentSession: AgentSession | undefined,
) => {
	const currentTask = await getLatestWorkflowTask(task.id).then(
		(latestTask) => latestTask ?? task,
	);
	const workflow = getTaskFloorWorkflow(currentTask, workspace);
	const decisionNextNode = findAnsweredAgentDecisionNextNode(
		workflow,
		currentTask,
	);

	if (decisionNextNode) {
		await continueWorkflowFromNode(
			sandbox,
			currentTask,
			workspace,
			workflow,
			decisionNextNode,
			{
				agentSession,
			},
		);
		return;
	}

	const nextNode = findNextWorkflowNode(workflow, currentTask.workflowNodeId);

	if (nextNode) {
		await continueWorkflowFromNode(
			sandbox,
			currentTask,
			workspace,
			workflow,
			nextNode,
			{
				agentSession,
			},
		);
		return;
	}

	const humanLoopEdge = findHumanLoopWaitEdge(
		workflow,
		currentTask.workflowNodeId,
	);

	if (humanLoopEdge) {
		await waitForHumanInAgentSession(
			currentTask,
			humanLoopEdge.target,
			agentSession,
		);
	}
};

const getLatestWorkflowTask = async (taskId: string) =>
	db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
			},
		})
		.then((result) => result.tasks[0] as Task | undefined);

const getTaskFloorWorkflow = (
	task: Task,
	workspace: WorkspaceWithRepositories,
): Required<FloorWorkflow> => {
	const workflowInput = getWorkflowInput(task.workflowInput);
	const workflowSnapshot = workflowInput.workflowSnapshot;

	return parseFloorWorkflow(workflowSnapshot ?? workspace.floorWorkflow);
};

const waitForHumanInAgentSession = async (
	task: Task,
	workflowNodeId: string | undefined,
	agentSession: AgentSession | undefined,
) => {
	await db.transact(
		taskTx(task.id).update({
			status: "idle",
			workflowState: "waiting_for_human",
			workflowNodeId: workflowNodeId ?? task.workflowNodeId,
		}),
	);

	await persistFactoryplaneEvent(task.id, "factoryplane.workflow.human_input", {
		taskId: task.id,
		workflowNodeId: workflowNodeId ?? task.workflowNodeId,
		agentSessionId: agentSession?.id,
		prompt: "Waiting for human input in the agent session.",
	});
};

const continueWorkflowFromNode = async (
	sandbox: Sandbox,
	task: Task,
	workspace: WorkspaceWithRepositories,
	workflow: Required<FloorWorkflow>,
	nextNode: WorkflowNode,
	options: {
		agentSession?: AgentSession;
		prompt?: string;
	} = {},
): Promise<void> => {
	if (nextNode.data?.blockType === "completeTask") {
		const now = new Date().toISOString();
		await db.transact(
			taskTx(task.id).update({
				status: "complete",
				completedAt: now,
				workflowState: "complete",
				workflowNodeId: nextNode.id,
				agentToken: undefined,
			}),
		);
		await persistFactoryplaneEvent(task.id, "factoryplane.workflow.completed", {
			taskId: task.id,
			workflowNodeId: nextNode.id,
			message: nextNode.data.completionMessage,
		});
		return;
	}

	if (nextNode.data?.blockType === "conditionalRouter") {
		await routeConditionalWorkflowNode(
			sandbox,
			task,
			workspace,
			workflow,
			nextNode,
			options,
		);
		return;
	}

	if (nextNode.data?.blockType === "yesNoClassifier") {
		await routeYesNoClassifierNode(
			sandbox,
			task,
			workspace,
			workflow,
			nextNode,
			options,
		);
		return;
	}

	if (nextNode.data?.blockType === "instruction") {
		await continueFromInstructionNode(
			sandbox,
			task,
			workspace,
			workflow,
			nextNode,
			options,
		);
		return;
	}

	if (nextNode.data?.blockType === "agentDecision") {
		await routeAgentDecisionNode(
			sandbox,
			task,
			workspace,
			workflow,
			nextNode,
			options,
		);
		return;
	}

	if (nextNode.data?.blockType === "integrationAction") {
		await continueFromIntegrationActionNode(
			sandbox,
			task,
			workspace,
			workflow,
			nextNode,
			options,
		);
		return;
	}

	if (nextNode.data?.blockType !== "agentRun") {
		return;
	}

	const requestedAgentId = getOptionalDataString(nextNode.data.agentId);
	const agent = resolveWorkflowAgent(workspace, requestedAgentId);

	if (!agent) {
		throw new Error(
			requestedAgentId
				? `Workflow agent ${requestedAgentId} not found`
				: "Workflow has an Agent Session block but no agents are configured",
		);
	}

	const workflowInput = getWorkflowInput(task.workflowInput);
	const content =
		options.prompt ??
		(renderWorkflowTemplate(
			nextNode.data.prompt || "Use the workflow input:\n\n{{input.message}}",
			workflowInput,
		) ||
			"Continue this workflow task.");
	const agentDefaults = getAgentDefaultOptions(agent.settings);
	const eventId = randomUUID();
	const agentSession = await getOrCreateAgentSessionForStep(
		task,
		agent,
		nextNode,
	);

	await db.transact([
		taskTx(task.id)
			.update({
				status: "in_progress",
				agentModel: agentDefaults.agentModel,
				agentReasoningEffort: agentDefaults.agentReasoningEffort,
				agentSpeed: agentDefaults.agentSpeed,
				workflowState: "agent_running",
				workflowNodeId: nextNode.id,
			})
			.link({ agent: agent.id }),
		eventTx(eventId)
			.create({
				type: "factoryplane.new_user_message",
				data: {
					taskId: task.id,
					content,
					images: getWorkflowImages(workflowInput),
					workflow: {
						state: "agent_running",
						input: workflowInput,
						agentRunNodeId: nextNode.id,
						agentId: agent.id,
						sessionKey: getWorkflowSessionKey(nextNode),
					},
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id, agentSession: agentSession.id }),
	]);
};

const routeYesNoClassifierNode = async (
	sandbox: Sandbox,
	task: Task,
	workspace: WorkspaceWithRepositories,
	workflow: Required<FloorWorkflow>,
	classifierNode: WorkflowNode,
	options: {
		agentSession?: AgentSession;
		prompt?: string;
	} = {},
) => {
	const workflowInput = getWorkflowInput(task.workflowInput);
	const requestedAgentId = getOptionalDataString(classifierNode.data?.agentId);
	const agent = resolveWorkflowAgent(workspace, requestedAgentId);

	if (!agent) {
		throw new Error(
			requestedAgentId
				? `Workflow classifier agent ${requestedAgentId} not found`
				: "Workflow has a Yes/No Classifier block but no agents are configured",
		);
	}

	if (getAgentProvider(agent) !== "codex") {
		throw new Error("Yes/No Classifier blocks require a Codex agent");
	}

	const renderedPrompt =
		renderWorkflowTemplate(
			classifierNode.data?.prompt ||
				"Classify this workflow input as yes or no:\n\n{{input}}",
			workflowInput,
		) || "Classify the current workflow input as yes or no.";
	const classification = await runYesNoClassifier(
		sandbox,
		task,
		agent,
		workspace,
		buildYesNoClassifierPrompt(renderedPrompt, workflowInput),
		classifierNode.id,
	);
	const nextWorkflowInput = {
		...getWorkflowInput(task.workflowInput),
		classifier: {
			workflowNodeId: classifierNode.id,
			answer: classification?.answer,
			reason: classification?.reason,
			classifiedAt: new Date().toISOString(),
		},
	};

	await db.transact(
		taskTx(task.id)
			.update({
				status: "idle",
				workflowState: classification
					? "classifier_matched"
					: "classifier_unmatched",
				workflowNodeId: classifierNode.id,
				workflowInput: nextWorkflowInput,
			})
			.link({ agent: agent.id }),
	);

	task.workflowInput = nextWorkflowInput;
	task.workflowNodeId = classifierNode.id;

	await persistFactoryplaneEvent(task.id, "factoryplane.workflow.classifier", {
		taskId: task.id,
		workflowNodeId: classifierNode.id,
		agentId: agent.id,
		answer: classification?.answer,
		reason: classification?.reason,
		prompt: renderedPrompt,
	});

	if (!classification) {
		return;
	}

	const edge = findWorkflowEdgeFromHandle(
		workflow,
		classifierNode.id,
		classification.answer,
	);

	if (!edge?.target) {
		await persistFactoryplaneEvent(
			task.id,
			"factoryplane.workflow.classifier_unconnected",
			{
				taskId: task.id,
				workflowNodeId: classifierNode.id,
				answer: classification.answer,
				reason: classification.reason,
			},
		);
		return;
	}

	const nextNode = workflow.nodes.find((node) => node.id === edge.target);

	if (!nextNode) {
		return;
	}

	await continueWorkflowFromNode(
		sandbox,
		task,
		workspace,
		workflow,
		nextNode,
		options,
	);
};

const routeConditionalWorkflowNode = async (
	sandbox: Sandbox,
	task: Task,
	workspace: WorkspaceWithRepositories,
	workflow: Required<FloorWorkflow>,
	routerNode: WorkflowNode,
	options: {
		agentSession?: AgentSession;
		prompt?: string;
	} = {},
) => {
	const workflowInput = getWorkflowInput(task.workflowInput);
	const conditions = routerNode.data?.conditions ?? [];
	const matchedCondition = conditions.find((condition) =>
		evaluateRouterCondition(condition.expression, workflowInput),
	);

	await db.transact(
		taskTx(task.id).update({
			status: "idle",
			workflowState: matchedCondition ? "router_matched" : "router_unmatched",
			workflowNodeId: routerNode.id,
		}),
	);

	await persistFactoryplaneEvent(task.id, "factoryplane.workflow.router", {
		taskId: task.id,
		workflowNodeId: routerNode.id,
		routerLabel: routerNode.data?.label,
		matched: Boolean(matchedCondition),
		conditionId: matchedCondition?.id,
		conditionLabel: matchedCondition?.label,
		expression: matchedCondition?.expression,
	});

	if (!matchedCondition) {
		return;
	}

	const edge = findWorkflowEdgeFromHandle(
		workflow,
		routerNode.id,
		matchedCondition.id,
	);

	if (!edge?.target) {
		await persistFactoryplaneEvent(
			task.id,
			"factoryplane.workflow.router_unconnected",
			{
				taskId: task.id,
				workflowNodeId: routerNode.id,
				conditionId: matchedCondition.id,
				conditionLabel: matchedCondition.label,
			},
		);
		return;
	}

	const nextNode = workflow.nodes.find((node) => node.id === edge.target);

	if (!nextNode) {
		return;
	}

	await continueWorkflowFromNode(
		sandbox,
		task,
		workspace,
		workflow,
		nextNode,
		options,
	);
};

const continueFromInstructionNode = async (
	sandbox: Sandbox,
	task: Task,
	workspace: WorkspaceWithRepositories,
	workflow: Required<FloorWorkflow>,
	instructionNode: WorkflowNode,
	options: {
		agentSession?: AgentSession;
		prompt?: string;
	} = {},
) => {
	const workflowInput = getWorkflowInput(task.workflowInput);
	const prompt =
		renderWorkflowTemplate(
			instructionNode.data?.instruction ||
				instructionNode.data?.prompt ||
				"{{input.message}}",
			workflowInput,
		) || options.prompt;
	const nextNode = findNextWorkflowNode(workflow, instructionNode.id);

	await db.transact(
		taskTx(task.id).update({
			workflowState: "instruction_ready",
			workflowNodeId: instructionNode.id,
			workflowInput: {
				...workflowInput,
				prompt,
			},
		}),
	);

	await persistFactoryplaneEvent(task.id, "factoryplane.workflow.instruction", {
		taskId: task.id,
		workflowNodeId: instructionNode.id,
		agentSessionId: options.agentSession?.id,
		prompt,
	});

	task.workflowInput = {
		...workflowInput,
		prompt,
	};

	if (!nextNode) {
		return;
	}

	await continueWorkflowFromNode(sandbox, task, workspace, workflow, nextNode, {
		...options,
		prompt,
	});
};

const continueFromIntegrationActionNode = async (
	sandbox: Sandbox,
	task: Task,
	workspace: WorkspaceWithRepositories,
	workflow: Required<FloorWorkflow>,
	actionNode: WorkflowNode,
	options: {
		agentSession?: AgentSession;
		prompt?: string;
	} = {},
) => {
	if (
		actionNode.data?.provider !== SLACK_PROVIDER ||
		actionNode.data?.action !== SLACK_SEND_MESSAGE_ACTION
	) {
		throw new Error("Unsupported integration action block");
	}

	const workflowInput = getWorkflowInput(task.workflowInput);
	const connectionId = getOptionalDataString(actionNode.data.connectionId);
	const channelId = getOptionalDataString(actionNode.data.channelId);
	const connection = resolveIntegrationConnection(workspace, connectionId);

	if (!connection) {
		throw new Error(
			connectionId
				? `Slack connection ${connectionId} not found`
				: "Slack Message blocks require a Slack connection",
		);
	}

	if (!channelId) {
		throw new Error("Slack Message blocks require a channel.");
	}

	const text =
		renderWorkflowTemplate(
			actionNode.data.messageTemplate || "{{input.message}}",
			workflowInput,
		) || "Workflow update.";
	const threadTs =
		actionNode.data.threadTsTemplate !== undefined
			? renderWorkflowTemplate(actionNode.data.threadTsTemplate, workflowInput)
			: undefined;
	const botToken = await decryptSlackBotToken(parseSlackAuth(connection.auth));
	const postedMessage = await postSlackMessage({
		botToken,
		channel: channelId,
		text,
		threadTs,
	});
	const completedAt = new Date().toISOString();
	const nextWorkflowInput = {
		...workflowInput,
		slack: {
			...(isRecord(workflowInput.slack) ? workflowInput.slack : {}),
			lastMessage: {
				channelId: postedMessage.channel ?? channelId,
				ts: postedMessage.ts,
				text,
				sentAt: completedAt,
			},
		},
		integrationAction: {
			provider: SLACK_PROVIDER,
			action: SLACK_SEND_MESSAGE_ACTION,
			connectionId: connection.id,
			workflowNodeId: actionNode.id,
			completedAt,
		},
	};

	await db.transact([
		taskTx(task.id).update({
			status: "idle",
			workflowState: "integration_action_completed",
			workflowNodeId: actionNode.id,
			workflowInput: nextWorkflowInput,
		}),
		integrationConnectionTx(connection.id).update({
			lastUsedAt: completedAt,
			updatedAt: completedAt,
		}),
	]);

	await persistFactoryplaneEvent(
		task.id,
		"factoryplane.workflow.integration_action",
		{
			taskId: task.id,
			workflowNodeId: actionNode.id,
			provider: SLACK_PROVIDER,
			action: SLACK_SEND_MESSAGE_ACTION,
			connectionId: connection.id,
			channelId,
			messageTs: postedMessage.ts,
		},
	);

	task.workflowInput = nextWorkflowInput;
	task.workflowNodeId = actionNode.id;

	const nextNode = findNextWorkflowNode(workflow, actionNode.id);

	if (!nextNode) {
		return;
	}

	await continueWorkflowFromNode(sandbox, task, workspace, workflow, nextNode, {
		...options,
		prompt: options.prompt,
	});
};

const routeAgentDecisionNode = async (
	_sandbox: Sandbox,
	task: Task,
	_workspace: WorkspaceWithRepositories,
	_workflow: Required<FloorWorkflow>,
	decisionNode: WorkflowNode,
	options: {
		agentSession?: AgentSession;
		prompt?: string;
	} = {},
) => {
	const workflowInput = getWorkflowInput(task.workflowInput);
	const optionIds = getDecisionOptionIds(decisionNode);

	if (optionIds.length === 0 || !options.agentSession) {
		await db.transact(
			taskTx(task.id).update({
				status: "idle",
				workflowState: "decision_unmatched",
				workflowNodeId: decisionNode.id,
				workflowInput: {
					...workflowInput,
					decision: undefined,
				},
			}),
		);

		await persistFactoryplaneEvent(task.id, "factoryplane.workflow.decision", {
			taskId: task.id,
			workflowNodeId: decisionNode.id,
			agentSessionId: options.agentSession?.id,
			decision: undefined,
			reason: options.agentSession
				? "Decision block has no answer options."
				: "Decision block has no originating agent session.",
		});
		return;
	}

	const pendingDecision = getPendingAgentDecision(workflowInput);

	if (pendingDecision?.workflowNodeId === decisionNode.id) {
		return;
	}

	const questionId = randomUUID();
	const question =
		decisionNode.data?.question ||
		"Based on the previous agent response, choose the next workflow route.";
	const pendingAgentDecision: PendingAgentDecision = {
		questionId,
		workflowNodeId: decisionNode.id,
		agentSessionId: options.agentSession.id,
		question,
		options: decisionNode.data?.options ?? [],
		askedAt: new Date().toISOString(),
	};
	const content = buildAgentDecisionQuestionPrompt(
		pendingAgentDecision,
		workflowInput,
	);
	const eventId = randomUUID();

	await db.transact([
		taskTx(task.id).update({
			status: "in_progress",
			workflowState: "decision_waiting_for_agent",
			workflowNodeId: decisionNode.id,
			workflowInput: {
				...workflowInput,
				pendingAgentDecision,
				decision: undefined,
			},
		}),
		eventTx(eventId)
			.create({
				type: "factoryplane.new_user_message",
				data: {
					taskId: task.id,
					content,
					workflow: {
						state: "decision_waiting_for_agent",
						input: workflowInput,
						decisionNodeId: decisionNode.id,
						questionId,
					},
				},
				createdAt: new Date().toISOString(),
			})
			.link({ task: task.id, agentSession: options.agentSession.id }),
	]);

	await persistFactoryplaneEvent(
		task.id,
		"factoryplane.workflow.decision_question",
		{
			taskId: task.id,
			workflowNodeId: decisionNode.id,
			agentSessionId: options.agentSession.id,
			questionId,
			question,
			options: pendingAgentDecision.options,
		},
	);
};

const getDecisionOptionIds = (decisionNode: WorkflowNode) =>
	(decisionNode.data?.options ?? [])
		.map((option) => option.id)
		.filter((value) => value.trim().length > 0);

const buildAgentDecisionQuestionPrompt = (
	decision: PendingAgentDecision,
	workflowInput: Record<string, unknown>,
) => {
	const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

	return [
		"Answer this question for the workflow.",
		"",
		decision.question,
		"",
		`Question id: ${decision.questionId}`,
		"",
		"Answer options:",
		...decision.options.map(
			(option) => `- ${option.id}: ${option.label ?? option.id}`,
		),
		"",
		"Choose exactly one answer option id. Then call this API with curl:",
		"",
		"```bash",
		`curl -X POST ${apiUrl}/workflow-decisions/answers \\`,
		"  -H 'Content-Type: application/json' \\",
		`  -d '{"questionId":"${decision.questionId}","answerId":"OPTION_ID","additionalInformation":"optional context"}'`,
		"```",
		"",
		"Use `additionalInformation` for a short reason or any details needed by the next workflow step.",
		"",
		"Workflow input:",
		JSON.stringify(workflowInput, null, 2),
		"",
		"After the curl call succeeds, briefly say which answer id you chose.",
	].join("\n");
};

const buildYesNoClassifierPrompt = (
	prompt: string,
	workflowInput: Record<string, unknown>,
) =>
	[
		"Classify the following workflow question.",
		"",
		prompt,
		"",
		"Return only JSON that matches the required schema.",
		"Use answer `yes` when the condition is true. Use answer `no` when it is false.",
		"Include a concise reason.",
		"",
		"Workflow input:",
		JSON.stringify(workflowInput, null, 2),
	].join("\n");

const findAnsweredAgentDecisionNextNode = (
	workflow: Required<FloorWorkflow>,
	task: Task,
) => {
	if (!task.workflowNodeId) {
		return undefined;
	}

	const decisionNode = workflow.nodes.find(
		(node) => node.id === task.workflowNodeId,
	);

	if (decisionNode?.data?.blockType !== "agentDecision") {
		return undefined;
	}

	const workflowInput = getWorkflowInput(task.workflowInput);
	const decision = getWorkflowDecisionAnswer(workflowInput);

	if (
		decision?.workflowNodeId !== decisionNode.id ||
		typeof decision.route !== "string"
	) {
		return undefined;
	}

	const edge = findWorkflowEdgeFromHandle(
		workflow,
		decisionNode.id,
		decision.route,
	);

	if (!edge?.target) {
		return undefined;
	}

	return workflow.nodes.find((node) => node.id === edge.target);
};

const getPendingAgentDecision = (
	input: Record<string, unknown>,
): PendingAgentDecision | undefined => {
	const value = input.pendingAgentDecision;

	if (!isRecord(value)) {
		return undefined;
	}

	if (
		typeof value.questionId !== "string" ||
		typeof value.workflowNodeId !== "string" ||
		typeof value.question !== "string" ||
		!Array.isArray(value.options)
	) {
		return undefined;
	}

	return {
		questionId: value.questionId,
		workflowNodeId: value.workflowNodeId,
		agentSessionId:
			typeof value.agentSessionId === "string"
				? value.agentSessionId
				: undefined,
		question: value.question,
		options: value.options.filter(isDecisionOption),
		askedAt:
			typeof value.askedAt === "string"
				? value.askedAt
				: new Date().toISOString(),
	};
};

const getWorkflowDecisionAnswer = (
	input: Record<string, unknown>,
): WorkflowDecisionAnswer | undefined => {
	const value = input.decision;

	if (!isRecord(value)) {
		return undefined;
	}

	return {
		questionId:
			typeof value.questionId === "string" ? value.questionId : undefined,
		workflowNodeId:
			typeof value.workflowNodeId === "string"
				? value.workflowNodeId
				: undefined,
		route: typeof value.route === "string" ? value.route : undefined,
		answerId: typeof value.answerId === "string" ? value.answerId : undefined,
		answerLabel:
			typeof value.answerLabel === "string" ? value.answerLabel : undefined,
		reason: typeof value.reason === "string" ? value.reason : undefined,
		additionalInformation: value.additionalInformation,
		answeredAt:
			typeof value.answeredAt === "string" ? value.answeredAt : undefined,
	};
};

const isDecisionOption = (value: unknown): value is DecisionOption =>
	isRecord(value) && typeof value.id === "string";

const findNextWorkflowNode = (
	workflow: Required<FloorWorkflow>,
	currentNodeId: string | undefined,
) => {
	if (!currentNodeId) {
		return undefined;
	}

	const edge = findWorkflowEdgeFromHandle(workflow, currentNodeId, "output");

	if (!edge?.target) {
		return undefined;
	}

	return workflow.nodes.find((node) => node.id === edge.target);
};

const findHumanLoopWaitEdge = (
	workflow: Required<FloorWorkflow>,
	currentNodeId: string | undefined,
) => {
	if (!currentNodeId) {
		return undefined;
	}

	return workflow.edges.find(
		(currentEdge) =>
			currentEdge.source === currentNodeId &&
			(currentEdge.sourceHandle === undefined ||
				currentEdge.sourceHandle === null ||
				currentEdge.sourceHandle === "output") &&
			currentEdge.targetHandle === HUMAN_LOOP_HANDLE_ID,
	);
};

const findWorkflowEdgeFromHandle = (
	workflow: Required<FloorWorkflow>,
	sourceNodeId: string,
	sourceHandle: string,
) =>
	workflow.edges.find(
		(currentEdge) =>
			currentEdge.source === sourceNodeId &&
			(currentEdge.sourceHandle === undefined ||
				currentEdge.sourceHandle === null ||
				currentEdge.sourceHandle === sourceHandle) &&
			(currentEdge.targetHandle === undefined ||
				currentEdge.targetHandle === null ||
				currentEdge.targetHandle === "input"),
	);

const parseFloorWorkflow = (value: unknown): Required<FloorWorkflow> => {
	if (!isRecord(value)) {
		return { nodes: [], edges: [] };
	}

	return {
		nodes: Array.isArray(value.nodes) ? value.nodes.filter(isWorkflowNode) : [],
		edges: Array.isArray(value.edges) ? value.edges.filter(isWorkflowEdge) : [],
	};
};

const isWorkflowNode = (value: unknown): value is WorkflowNode =>
	isRecord(value) && typeof value.id === "string";

const isWorkflowEdge = (value: unknown): value is WorkflowEdge =>
	isRecord(value) &&
	(typeof value.source === "string" || value.source === undefined) &&
	(typeof value.target === "string" || value.target === undefined);

const resolveWorkflowAgent = (
	workspace: WorkspaceWithRepositories,
	agentId: string | undefined,
) => {
	const agents = workspace.agents ?? [];
	return agentId ? agents.find((agent) => agent.id === agentId) : agents[0];
};

const resolveIntegrationConnection = (
	workspace: WorkspaceWithRepositories,
	connectionId: string | undefined,
) => {
	const connections = workspace.integrationConnections ?? [];
	return connectionId
		? connections.find(
				(connection) =>
					connection.id === connectionId &&
					connection.provider === SLACK_PROVIDER &&
					connection.status === "connected",
			)
		: connections.find(
				(connection) =>
					connection.provider === SLACK_PROVIDER &&
					connection.status === "connected",
			);
};

const getWorkflowInput = (value: unknown): Record<string, unknown> =>
	isRecord(value) ? value : {};

const getWorkflowImages = (input: Record<string, unknown>) =>
	Array.isArray(input.images) ? input.images : [];

const renderWorkflowTemplate = (
	template: string,
	input: Record<string, unknown>,
) =>
	template
		.replace(/\{\{\s*input(?:\.([a-zA-Z0-9_-]+))?\s*\}\}/g, (_, key) => {
			const value = typeof key === "string" ? input[key] : input;
			return stringifyTemplateValue(value);
		})
		.trim();

const stringifyTemplateValue = (value: unknown) => {
	if (value === undefined || value === null) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	return JSON.stringify(value, null, 2) ?? "";
};

const evaluateRouterCondition = (
	expression: string | undefined,
	input: Record<string, unknown>,
) => {
	const trimmed = expression?.trim();

	if (!trimmed) {
		return false;
	}

	try {
		return Boolean(evaluateRouterExpression(trimmed, input));
	} catch (error) {
		console.warn("Failed to evaluate workflow router condition", {
			expression,
			error,
		});
		return false;
	}
};

const evaluateRouterExpression = (
	expression: string,
	input: Record<string, unknown>,
): unknown => {
	const withoutOuterParens = stripOuterParens(expression.trim());
	const orParts = splitTopLevelOperator(withoutOuterParens, "||");

	if (orParts.length > 1) {
		return orParts.some((part) =>
			Boolean(evaluateRouterExpression(part, input)),
		);
	}

	const andParts = splitTopLevelOperator(withoutOuterParens, "&&");

	if (andParts.length > 1) {
		return andParts.every((part) =>
			Boolean(evaluateRouterExpression(part, input)),
		);
	}

	const comparison = findTopLevelComparison(withoutOuterParens);

	if (comparison) {
		const left = evaluateRouterValue(comparison.left, input);
		const right = evaluateRouterValue(comparison.right, input);
		return compareRouterValues(left, right, comparison.operator);
	}

	if (withoutOuterParens.startsWith("!")) {
		return !evaluateRouterExpression(withoutOuterParens.slice(1).trim(), input);
	}

	return evaluateRouterValue(withoutOuterParens, input);
};

const evaluateRouterValue = (
	rawValue: string,
	input: Record<string, unknown>,
): unknown => {
	const value = rawValue.trim();

	if (
		(value.startsWith("'") && value.endsWith("'")) ||
		(value.startsWith('"') && value.endsWith('"'))
	) {
		return value.slice(1, -1);
	}

	if (value === "true") {
		return true;
	}

	if (value === "false") {
		return false;
	}

	if (value === "null") {
		return null;
	}

	if (/^-?\d+(\.\d+)?$/.test(value)) {
		return Number(value);
	}

	if (value === "input") {
		return input;
	}

	if (value.startsWith("input.")) {
		return getRouterInputPath(input, value.slice("input.".length));
	}

	return undefined;
};

const getRouterInputPath = (
	input: Record<string, unknown>,
	path: string,
): unknown =>
	path.split(".").reduce<unknown>((current, segment) => {
		if (!isRecord(current)) {
			return undefined;
		}

		return current[segment];
	}, input);

const compareRouterValues = (
	left: unknown,
	right: unknown,
	operator: string,
) => {
	switch (operator) {
		case "==":
			return left === right;
		case "!=":
			return left !== right;
		case ">":
			return compareOrderedRouterValues(left, right, (a, b) => a > b);
		case ">=":
			return compareOrderedRouterValues(left, right, (a, b) => a >= b);
		case "<":
			return compareOrderedRouterValues(left, right, (a, b) => a < b);
		case "<=":
			return compareOrderedRouterValues(left, right, (a, b) => a <= b);
		default:
			return false;
	}
};

const compareOrderedRouterValues = (
	left: unknown,
	right: unknown,
	compare: (left: number, right: number) => boolean,
) =>
	typeof left === "number" && typeof right === "number"
		? compare(left, right)
		: false;

const findTopLevelComparison = (expression: string) => {
	const operators = ["==", "!=", ">=", "<=", ">", "<"];

	for (const operator of operators) {
		const index = findTopLevelOperatorIndex(expression, operator);

		if (index >= 0) {
			return {
				left: expression.slice(0, index),
				operator,
				right: expression.slice(index + operator.length),
			};
		}
	}

	return undefined;
};

const splitTopLevelOperator = (expression: string, operator: string) => {
	const parts: string[] = [];
	let start = 0;
	let index = findTopLevelOperatorIndex(expression, operator, start);

	while (index >= 0) {
		parts.push(expression.slice(start, index).trim());
		start = index + operator.length;
		index = findTopLevelOperatorIndex(expression, operator, start);
	}

	if (parts.length === 0) {
		return [expression];
	}

	parts.push(expression.slice(start).trim());
	return parts;
};

const findTopLevelOperatorIndex = (
	expression: string,
	operator: string,
	startIndex = 0,
) => {
	let quote: string | undefined;
	let depth = 0;

	for (
		let index = startIndex;
		index <= expression.length - operator.length;
		index++
	) {
		const char = expression[index];

		if (quote) {
			if (char === quote && expression[index - 1] !== "\\") {
				quote = undefined;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (char === "(") {
			depth++;
			continue;
		}

		if (char === ")") {
			depth = Math.max(0, depth - 1);
			continue;
		}

		if (
			depth === 0 &&
			expression.slice(index, index + operator.length) === operator
		) {
			return index;
		}
	}

	return -1;
};

const stripOuterParens = (expression: string) => {
	let current = expression;

	while (hasWrappingParens(current)) {
		current = current.slice(1, -1).trim();
	}

	return current;
};

const hasWrappingParens = (expression: string) => {
	if (!expression.startsWith("(") || !expression.endsWith(")")) {
		return false;
	}

	let quote: string | undefined;
	let depth = 0;

	for (let index = 0; index < expression.length; index++) {
		const char = expression[index];

		if (quote) {
			if (char === quote && expression[index - 1] !== "\\") {
				quote = undefined;
			}
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (char === "(") {
			depth++;
			continue;
		}

		if (char === ")") {
			depth--;

			if (depth === 0 && index < expression.length - 1) {
				return false;
			}
		}
	}

	return depth === 0;
};

const getOptionalDataString = (value: unknown) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const setupTaskSandbox = async (
	agent: Agent,
	task: Task,
	workspace: WorkspaceWithRepositories,
) => {
	if (!workspace) {
		throw new Error(`Agent ${agent.id} is missing workspace`);
	}

	const agentAuth = await getAgentAuth(agent);
	const sandbox = await runSetupStep(
		task.id,
		"sandbox",
		"Create sandbox",
		() =>
			Sandbox.create("codex", {
				timeoutMs: 10 * 60 * 1000,
			}),
		{ timeoutMs: 120_000 },
	);
	const provider = getAgentProvider(agent);

	await db.transact(
		taskTx(task.id).update({
			sandboxId: sandbox.sandboxId,
			sandboxTrafficAccessToken: sandbox.trafficAccessToken,
		}),
	);

	if (provider === "cursor") {
		await getCursorAuthEnvs(agent);
		const cursorInstall = await runSetupStep(
			task.id,
			"cursor_update",
			"Install Cursor CLI",
			() =>
				sandbox.commands.run(buildCursorInstallCommand(), {
					timeoutMs: 120_000,
				}),
			{ timeoutMs: 130_000 },
		);
		console.log(cursorInstall);
	} else {
		await runSetupStep(task.id, "codex_auth", "Write Codex auth", () =>
			sandbox.files.write(CODEX_AUTH_PATH, JSON.stringify(agentAuth)),
		);

		const codexUpdate = await runSetupStep(
			task.id,
			"codex_update",
			"Update Codex",
			() =>
				sandbox.commands.run(
					"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
					{ timeoutMs: 120_000 },
				),
			{ timeoutMs: 130_000 },
		);
		console.log(codexUpdate);
	}

	await installTaskEnvironmentPackages(sandbox, task.id, workspace);
	await setupSandboxGitIdentity(sandbox, task.id, workspace);

	const repositoryGithubEnvs = await setupRepositoryGithubAuth(
		sandbox,
		task.id,
		workspace,
	);
	await cloneWorkspaceRepositories(
		sandbox,
		task.id,
		workspace,
		repositoryGithubEnvs,
	);
	await writeWorkspaceEnvironmentFiles(sandbox, task.id, workspace);
	await writeWorkspaceRepositoryEnvFiles(sandbox, task.id, workspace);
	await installWorkspaceSkills(sandbox, task.id, provider, workspace);
	await writeCodexMcpConfig(sandbox, task.id, provider, workspace);
	await runWorkspaceCommands(sandbox, task.id, workspace, "new_task", {
		...getAgentSafeBaseEnvs(),
		...repositoryGithubEnvs,
	});

	const diffWorkspacePath = await runSetupStep(
		task.id,
		"diff_baseline",
		"Create diff baseline",
		() => createTaskWorkspaceBaseline(sandbox, task.id),
	);
	await db.transact(
		taskTx(task.id).update({
			diffWorkspacePath,
		}),
	);

	return { sandbox, diffWorkspacePath };
};

const setupSandboxGitIdentity = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: Workspace,
) => {
	const commands: string[] = [];
	const gitAuthorName = workspace.gitAuthorName?.trim();
	const gitAuthorEmail = workspace.gitAuthorEmail?.trim();

	if (gitAuthorName) {
		commands.push(`git config --global user.name ${shellQuote(gitAuthorName)}`);
	}

	if (gitAuthorEmail) {
		commands.push(
			`git config --global user.email ${shellQuote(gitAuthorEmail)}`,
		);
	}

	if (commands.length === 0) {
		return;
	}

	await runSetupStep(
		taskId,
		"git_identity",
		"Configure Git identity",
		() =>
			sandbox.commands.run(["set -e", ...commands].join("\n"), {
				timeoutMs: 30_000,
			}),
		{ timeoutMs: 35_000 },
	);
};

const installTaskEnvironmentPackages = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: Workspace,
) => {
	const packages = getTaskEnvironmentPackages(workspace);

	if (packages.length === 0) {
		return;
	}

	await runSetupStep(
		taskId,
		"environment_packages",
		"Install environment packages",
		() =>
			sandbox.commands.run(buildInstallEnvironmentPackagesCommand(packages), {
				timeoutMs: 180_000,
			}),
		{ timeoutMs: 190_000 },
	);
};

const getTaskEnvironmentPackages = (
	workspace: Workspace,
): ConfiguredTaskEnvironmentPackage[] => {
	const packages = new Map<string, ConfiguredTaskEnvironmentPackage>();

	for (const pkg of DEFAULT_TASK_ENVIRONMENT_PACKAGES) {
		packages.set(pkg.aptPackage, pkg);
	}

	for (const aptPackage of parseWorkspaceEnvironmentPackages(
		workspace.environmentPackages,
	)) {
		packages.set(aptPackage, { aptPackage });
	}

	for (const aptPackage of getWorkspaceSandboxPackageNames(workspace)) {
		packages.set(aptPackage, { aptPackage });
	}

	return [...packages.values()];
};

const getWorkspaceSandboxPackageNames = (workspace: Workspace) => {
	const packages =
		(workspace as WorkspaceWithRepositories).sandboxPackages ?? [];
	const names: string[] = [];
	const seen = new Set<string>();

	for (const pkg of packages) {
		const packageName = pkg.name.trim();

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName) || seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		names.push(packageName);
	}

	return names;
};

const parseWorkspaceEnvironmentPackages = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const packages: string[] = [];

	for (const item of value) {
		if (typeof item !== "string") {
			continue;
		}

		const packageName = item.trim();

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName) || seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

const buildInstallEnvironmentPackagesCommand = (
	packages: ConfiguredTaskEnvironmentPackage[],
) => {
	const packageLines = packages.map((pkg) => {
		if (!pkg.command) {
			return `set -- "$@" ${shellQuote(pkg.aptPackage)}`;
		}

		return [
			`if ! command -v ${shellQuote(pkg.command)} >/dev/null 2>&1; then`,
			`  set -- "$@" ${shellQuote(pkg.aptPackage)}`,
			"fi",
		].join("\n");
	});

	return [
		"set -e",
		"set --",
		...packageLines,
		'if [ "$#" -eq 0 ]; then',
		"  exit 0",
		"fi",
		"export DEBIAN_FRONTEND=noninteractive",
		'if [ "$(id -u)" -eq 0 ]; then',
		'  SUDO=""',
		"elif command -v sudo >/dev/null 2>&1; then",
		'  SUDO="sudo"',
		"else",
		'  printf "Root privileges or sudo are required to install environment packages.\\n" >&2',
		"  exit 1",
		"fi",
		"$SUDO apt-get update",
		'$SUDO apt-get install -y --no-install-recommends "$@"',
	].join("\n");
};

const cloneWorkspaceRepositories = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: WorkspaceWithRepositories,
	envs: Record<string, string>,
) => {
	const repositories = workspace.repositories ?? [];

	if (repositories.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runSetupStep(
		taskId,
		"repositories",
		"Clone repositories",
		async () => {
			const result = await sandbox.commands.run(
				[
					"set -e",
					`cd ${shellQuote(workspacePath)}`,
					buildGithubAuthNoticeCommand(),
					buildGithubAuthHeaderCommand(),
					...repositories.map((repository) =>
						buildCloneRepositoryCommand(
							repository,
							Boolean(envs.GITHUB_ACCESS_TOKEN),
						),
					),
				].join("\n"),
				{ timeoutMs: 10 * 60 * 1000, envs },
			);

			assertCommandSucceeded(result, "Clone repositories");
			return result;
		},
		{ timeoutMs: 11 * 60 * 1000 },
	);
};

const writeWorkspaceEnvironmentFiles = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: WorkspaceWithRepositories,
) => {
	const environmentFiles = getWorkspaceEnvironmentFiles(
		workspace.environmentFiles,
	);

	if (environmentFiles.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runSetupStep(
		taskId,
		"environment_files",
		"Write environment files",
		async () => {
			await Promise.all(
				environmentFiles.map(async (file) => {
					const filePath = `${workspacePath}/${file.path}`;
					const parentPath = filePath.slice(0, filePath.lastIndexOf("/"));

					await sandbox.commands.run(`mkdir -p ${shellQuote(parentPath)}`, {
						timeoutMs: 30_000,
					});
					await sandbox.files.write(filePath, file.content);
				}),
			);
		},
		{ timeoutMs: 60_000 },
	);
};

const getWorkspaceEnvironmentFiles = (
	files: EnvironmentFile[] | undefined,
): Array<{ path: string; content: string }> => {
	if (!files) {
		return [];
	}

	const environmentFiles = new Map<string, { path: string; content: string }>();

	for (const file of [...files].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	)) {
		const path = normalizeEnvironmentFilePath(file.path);

		if (!path) {
			continue;
		}

		environmentFiles.set(path, {
			path,
			content: file.content,
		});
	}

	return [...environmentFiles.values()];
};

const installWorkspaceSkills = async (
	sandbox: Sandbox,
	taskId: string,
	provider: AgentProvider,
	workspace: WorkspaceWithRepositories,
) => {
	if (provider !== "codex") {
		return;
	}

	const skills = getWorkspaceSkills(workspace.skills);

	if (skills.length === 0) {
		return;
	}

	await runSetupStep(
		taskId,
		"workspace_skills",
		"Install workspace skills",
		async () => {
			await Promise.all(
				skills.map(async (skill) => {
					const skillPath = `~/.codex/skills/factoryplane/${skill.slug}`;
					const files =
						skill.files.length > 0
							? skill.files
							: [{ path: "SKILL.md", content: skill.instructions }];

					await sandbox.commands.run(`mkdir -p ${shellQuote(skillPath)}`, {
						timeoutMs: 30_000,
					});

					await Promise.all(
						files.map(async (file) => {
							const filePath = `${skillPath}/${file.path}`;
							const parentPath = filePath.slice(0, filePath.lastIndexOf("/"));

							await sandbox.commands.run(`mkdir -p ${shellQuote(parentPath)}`, {
								timeoutMs: 30_000,
							});
							await sandbox.files.write(filePath, file.content);
						}),
					);
				}),
			);
		},
		{ timeoutMs: 60_000 },
	);
};

const getWorkspaceSkills = (
	skills: Skill[] | undefined,
): Array<{
	slug: string;
	instructions: string;
	files: Array<{ path: string; content: string }>;
}> => {
	if (!skills) {
		return [];
	}

	return [...skills]
		.filter(
			(skill) =>
				Boolean(skill.enabled) &&
				!skill.removedAt &&
				typeof skill.instructions === "string" &&
				skill.instructions.trim().length > 0,
		)
		.sort(
			(a, b) =>
				new Date(a.createdAt ?? 0).getTime() -
				new Date(b.createdAt ?? 0).getTime(),
		)
		.map((skill) => ({
			slug:
				normalizeSkillSlug(skill.slug) ??
				normalizeSkillSlug(skill.name) ??
				skill.id,
			instructions: skill.instructions,
			files: getSkillFiles(skill.files),
		}));
};

const writeCodexMcpConfig = async (
	sandbox: Sandbox,
	taskId: string,
	provider: AgentProvider,
	workspace: WorkspaceWithRepositories,
) => {
	if (provider !== "codex") {
		return;
	}

	const mcpServers = getWorkspaceMcpServers(workspace.mcpServers);

	if (mcpServers.length === 0) {
		return;
	}

	const config = buildCodexMcpConfig(mcpServers);

	await runSetupStep(
		taskId,
		"codex_mcp_config",
		"Configure MCP servers",
		async () => {
			await sandbox.commands.run("mkdir -p ~/.codex", { timeoutMs: 30_000 });
			await sandbox.files.write(CODEX_CONFIG_PATH, `${config}\n`);
		},
		{ timeoutMs: 60_000 },
	);
};

const getWorkspaceMcpServers = (
	mcpServers: McpServer[] | undefined,
): Array<{ id: string; name: string; proxyUrl: string }> => {
	if (!mcpServers) {
		return [];
	}

	const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

	return [...mcpServers]
		.filter(
			(mcpServer) =>
				mcpServer.enabled !== false &&
				(mcpServer.transport ?? "streamable_http") === "streamable_http" &&
				typeof mcpServer.name === "string" &&
				typeof mcpServer.url === "string",
		)
		.sort(
			(a, b) =>
				new Date(a.createdAt ?? 0).getTime() -
				new Date(b.createdAt ?? 0).getTime(),
		)
		.map((mcpServer) => ({
			id: mcpServer.id,
			name: normalizeMcpServerName(mcpServer.name) ?? mcpServer.id,
			proxyUrl: `${apiUrl}/mcp-proxy/${mcpServer.id}`,
		}));
};

const buildCodexMcpConfig = (
	mcpServers: Array<{ id: string; name: string; proxyUrl: string }>,
) =>
	mcpServers
		.map((mcpServer) =>
			[
				`[mcp_servers.${formatTomlString(mcpServer.name)}]`,
				`url = ${formatTomlString(mcpServer.proxyUrl)}`,
				"enabled = true",
			].join("\n"),
		)
		.join("\n\n");

const normalizeMcpServerName = (value: string) => {
	const trimmed = value.trim();
	return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(trimmed) ? trimmed : undefined;
};

const formatTomlString = (value: string) => JSON.stringify(value);

const normalizeApiUrl = (value: string | undefined) => {
	const trimmed = value?.trim();

	if (!trimmed) {
		return DEFAULT_API_URL;
	}

	return trimmed.replace(/\/+$/, "");
};

const getSkillFiles = (
	value: unknown,
): Array<{ path: string; content: string }> => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((file) => {
		if (!isRecord(file)) {
			return [];
		}

		const filePath =
			typeof file.path === "string"
				? normalizeSkillFilePath(file.path)
				: undefined;
		const content = typeof file.content === "string" ? file.content : undefined;

		if (!filePath || content === undefined) {
			return [];
		}

		return [{ path: filePath, content }];
	});
};

const normalizeSkillSlug = (value: string | undefined) => {
	if (!value) {
		return undefined;
	}

	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || undefined;
};

const normalizeSkillFilePath = (value: string) => {
	const normalized = value.trim().replaceAll("\\", "/");

	if (!normalized || normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.join("/");
};

const setupRepositoryGithubAuth = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: Workspace,
) => {
	const envs = await getWorkspaceGithubAuthEnvs(workspace);

	if (!envs.GITHUB_ACCESS_TOKEN) {
		return envs;
	}

	await runOptionalSetupStep(
		taskId,
		"repository_auth",
		"Validate repository GitHub App installation",
		async () => {
			await validateGithubToken(sandbox, envs);
			return envs;
		},
		{ timeoutMs: GITHUB_AUTH_SETUP_STEP_TIMEOUT_MS },
	);

	return envs;
};

const buildGithubAuthNoticeCommand = () =>
	[
		'if [ -z "$GITHUB_ACCESS_TOKEN" ]; then',
		'  printf "No workspace GitHub App installation configured; private GitHub repositories will fail to clone. Connect GitHub in workspace settings.\\n" >&2',
		"fi",
	].join("\n");

const buildGithubAuthHeaderCommand = () =>
	[
		'if [ -n "$GITHUB_ACCESS_TOKEN" ]; then',
		'  GITHUB_AUTH_HEADER="$(printf "x-access-token:%s" "$GITHUB_ACCESS_TOKEN" | base64 | tr -d "\\n")"',
		"fi",
	].join("\n");

const getWorkspaceGithubAuthEnvs = async (
	workspace: Workspace,
): Promise<Record<string, string>> => {
	if (!workspace.githubAppInstallationId) {
		return {
			GIT_TERMINAL_PROMPT: "0",
		};
	}

	const githubAccessToken = await createGithubAppInstallationAccessToken(
		workspace.githubAppInstallationId,
	);

	return {
		GITHUB_ACCESS_TOKEN: githubAccessToken,
		GITHUB_AUTH_HEADER: Buffer.from(
			`x-access-token:${githubAccessToken}`,
			"utf8",
		).toString("base64"),
		GH_TOKEN: githubAccessToken,
		GH_PROMPT_DISABLED: "1",
		GIT_TERMINAL_PROMPT: "0",
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

const validateGithubToken = async (
	sandbox: Sandbox,
	envs: Record<string, string>,
) => {
	let authStderr = "";

	try {
		const ghAuth = await sandbox.commands.run(
			[
				"set +e",
				'repository_count="$(gh api installation/repositories --jq .total_count 2>&1)"',
				"status=$?",
				'if [ "$status" -ne 0 ]; then',
				'  printf "GitHub CLI auth failed while validating workspace GitHub App installation:\\n%s\\n" "$repository_count" >&2',
				'  exit "$status"',
				"fi",
				'printf "Authenticated GitHub App installation with access to %s repositories\\n" "$repository_count"',
			].join("\n"),
			{
				timeoutMs: GITHUB_AUTH_VALIDATION_TIMEOUT_MS,
				envs,
				onStdout: (data) => {
					console.log(data);
				},
				onStderr: (data) => {
					authStderr += data;
					console.error(data);
				},
			},
		);
		console.log(ghAuth);
	} catch (error) {
		throw new Error(
			[
				"GitHub CLI auth failed",
				authStderr.trim() || getErrorMessage(error),
			].join(": "),
		);
	}
};

const buildCloneRepositoryCommand = (
	repository: Repository,
	hasGithubAccessToken: boolean,
) => {
	const path = getRepositoryPath(repository);
	const githubCloneUrl = getGithubHttpsCloneUrl(repository.url);
	const cloneUrl = githubCloneUrl ?? repository.url.trim();
	const args = ["git"];

	if (githubCloneUrl && hasGithubAccessToken) {
		args.push(
			"-c",
			`'http.https://github.com/.extraheader=Authorization: Basic '"$GITHUB_AUTH_HEADER"`,
		);
	}

	args.push("clone");

	if (repository.branch?.trim()) {
		args.push("--branch", shellQuote(repository.branch.trim()));
	}

	args.push(shellQuote(cloneUrl), shellQuote(path));
	return args.join(" ");
};

const writeRepositoryEnvFiles = async (
	sandbox: Sandbox,
	repositories: Repository[],
	workspacePath: string,
) => {
	const envFileOperations = await Promise.all(
		repositories.map(async (repository) => {
			const secretNames = getRepositorySecrets(repository.secrets).map(
				(secret) => secret.name,
			);
			const secretsBlock = await buildRepositoryEnvFileSecretsBlock(repository);

			return {
				path: `${workspacePath}/${getRepositoryPath(repository)}/.env`,
				secretNames,
				secretsBlock,
			};
		}),
	);

	await Promise.all(
		envFileOperations.map((envFile) =>
			upsertRepositoryEnvFileSecretsBlock(
				sandbox,
				envFile.path,
				envFile.secretsBlock,
				envFile.secretNames,
			),
		),
	);
};

const writeWorkspaceRepositoryEnvFiles = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: WorkspaceWithRepositories,
) => {
	const repositories = workspace.repositories ?? [];

	if (repositories.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runSetupStep(
		taskId,
		"repository_env_files",
		"Write repository .env files",
		() =>
			writeRepositoryEnvFilesAndFingerprint(
				sandbox,
				repositories,
				workspacePath,
			),
		{ timeoutMs: 60_000 },
	);
};

const writeRepositoryEnvFilesAndFingerprint = async (
	sandbox: Sandbox,
	repositories: Repository[],
	workspacePath: string,
) => {
	await writeRepositoryEnvFiles(sandbox, repositories, workspacePath);
	await writeRepositorySecretsFingerprint(
		sandbox,
		workspacePath,
		getRepositorySecretsFingerprint(repositories),
	);
};

const syncRepositoryEnvFilesIfChanged = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: WorkspaceWithRepositories,
) => {
	const repositories = workspace.repositories ?? [];

	if (repositories.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runSetupStep(
		taskId,
		"repository_env_files",
		"Refresh repository .env files",
		async () => {
			const nextFingerprint = getRepositorySecretsFingerprint(repositories);
			const currentFingerprint = await readRepositorySecretsFingerprint(
				sandbox,
				workspacePath,
			);

			if (currentFingerprint === nextFingerprint) {
				return;
			}

			await writeRepositoryEnvFilesAndFingerprint(
				sandbox,
				repositories,
				workspacePath,
			);
		},
		{ timeoutMs: 60_000 },
	);
};

const readRepositorySecretsFingerprint = async (
	sandbox: Sandbox,
	workspacePath: string,
) => {
	try {
		return (
			await sandbox.files.read(
				`${workspacePath}/${REPOSITORY_SECRETS_FINGERPRINT_PATH}`,
			)
		).trim();
	} catch {
		return undefined;
	}
};

const writeRepositorySecretsFingerprint = async (
	sandbox: Sandbox,
	workspacePath: string,
	fingerprint: string,
) => {
	const result = await sandbox.commands.run(
		`mkdir -p ${shellQuote(`${workspacePath}/.factoryplane`)}`,
		{ timeoutMs: 30_000 },
	);
	assertCommandSucceeded(
		result,
		"Create repository secrets fingerprint directory",
	);
	await sandbox.files.write(
		`${workspacePath}/${REPOSITORY_SECRETS_FINGERPRINT_PATH}`,
		`${fingerprint}\n`,
	);
};

const getRepositorySecretsFingerprint = (repositories: Repository[]) => {
	const payload = repositories
		.map((repository) => ({
			id: repository.id,
			path: getRepositoryPath(repository),
			secrets: getRepositorySecrets(repository.secrets)
				.map((secret) => ({
					id: secret.id,
					name: secret.name,
					valueEncrypted: secret.valueEncrypted,
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const buildRepositoryEnvFileSecretsBlock = async (repository: Repository) => {
	const secrets = getRepositorySecrets(repository.secrets);

	if (secrets.length === 0) {
		return undefined;
	}

	const encryptionService = createEncryptionService(
		process.env.SECRET_ENCRYPTION_KEY ?? "",
	);
	const lines = await Promise.all(
		secrets.map(async (secret) => {
			const value = await encryptionService.decrypt(secret.valueEncrypted);
			return `${secret.name}=${JSON.stringify(value)}`;
		}),
	);

	return [
		REPOSITORY_SECRETS_ENV_BLOCK_START,
		...lines,
		REPOSITORY_SECRETS_ENV_BLOCK_END,
		"",
	].join("\n");
};

const upsertRepositoryEnvFileSecretsBlock = async (
	sandbox: Sandbox,
	path: string,
	secretsBlock: string | undefined,
	secretNames: string[],
) => {
	const currentContents = await readOptionalSandboxFile(sandbox, path);
	const nextContents = mergeRepositoryEnvFileSecretsBlock(
		currentContents,
		secretsBlock,
		secretNames,
	);

	if (nextContents === undefined) {
		const result = await sandbox.commands.run(`rm -f ${shellQuote(path)}`, {
			timeoutMs: 30_000,
		});
		assertCommandSucceeded(result, "Remove repository .env file");
		return;
	}

	if (currentContents === nextContents) {
		return;
	}

	await sandbox.files.write(path, nextContents);
};

const readOptionalSandboxFile = async (sandbox: Sandbox, path: string) => {
	try {
		return await sandbox.files.read(path);
	} catch {
		return undefined;
	}
};

const mergeRepositoryEnvFileSecretsBlock = (
	currentContents: string | undefined,
	secretsBlock: string | undefined,
	secretNames: string[],
) => {
	const baseContents = removeRepositoryEnvFileSecretLines(
		removeRepositoryEnvFileSecretsBlock(currentContents ?? ""),
		secretNames,
	).trimEnd();

	if (!secretsBlock) {
		return baseContents ? `${baseContents}\n` : undefined;
	}

	return baseContents ? `${baseContents}\n\n${secretsBlock}` : secretsBlock;
};

const removeRepositoryEnvFileSecretLines = (
	contents: string,
	secretNames: string[],
) => {
	if (secretNames.length === 0) {
		return contents;
	}

	const names = new Set(secretNames);

	return contents
		.split(/\r?\n/)
		.filter((line) => {
			const match = line.match(
				/^[\t ]*(?:export[\t ]+)?([A-Za-z_][A-Za-z0-9_]*)[\t ]*=/,
			);

			return !match?.[1] || !names.has(match[1]);
		})
		.join("\n");
};

const removeRepositoryEnvFileSecretsBlock = (contents: string) => {
	const pattern = new RegExp(
		`${escapeRegExp(REPOSITORY_SECRETS_ENV_BLOCK_START)}\\r?\\n[\\s\\S]*?\\r?\\n${escapeRegExp(REPOSITORY_SECRETS_ENV_BLOCK_END)}(?:\\r?\\n)?`,
		"g",
	);

	return contents.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
};

const escapeRegExp = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getRepositorySecrets = (value: unknown): RepositorySecret[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isRepositorySecret);
};

const isRepositorySecret = (value: unknown): value is RepositorySecret => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.valueEncrypted === "string" &&
		/^[A-Za-z_][A-Za-z0-9_]*$/.test(value.name)
	);
};

const getGithubHttpsCloneUrl = (url: string) => {
	const trimmed = url.trim();
	const httpsMatch = trimmed.match(
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (httpsMatch?.[1] && httpsMatch[2]) {
		return `https://github.com/${httpsMatch[1]}/${httpsMatch[2].replace(/\.git$/i, "")}.git`;
	}

	const sshMatch = trimmed.match(
		/^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (sshMatch?.[1] && sshMatch[2]) {
		return `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/i, "")}.git`;
	}

	return undefined;
};

const getRepositoryDefaultPath = (url: string) => {
	const lastSegment = url.split("/").pop()?.trim() || "repository";
	return (
		normalizeRepositoryPath(lastSegment.replace(/\.git$/i, "")) ?? "repository"
	);
};

const getRepositoryPath = (repository: Repository) => {
	return (
		normalizeRepositoryPath(repository.path) ??
		getRepositoryDefaultPath(repository.url)
	);
};

const normalizeRepositoryPath = (value: string | undefined) => {
	if (!value) {
		return undefined;
	}

	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.filter(
			(segment) => segment.length > 0 && segment !== "." && segment !== "..",
		);

	return segments.length > 0 ? segments.join("/") : undefined;
};

const normalizeEnvironmentFilePath = (value: string | undefined) => {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim().replaceAll("\\", "/");

	if (normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.length > 0 ? segments.join("/") : undefined;
};

const runWorkspaceCommands = async (
	sandbox: Sandbox,
	taskId: string,
	workspace: Workspace,
	kind: WorkspaceSetupScriptKind,
	envs: Record<string, string>,
) => {
	const script = getWorkspaceCommandScript(workspace, kind);
	const scriptContent = script?.trim();

	if (!scriptContent) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);
	const scriptPath = `${FACTORYPLANE_SCRIPT_DIR}/${kind}-${taskId}.sh`;
	const title =
		kind === "new_task" ? "Run new task commands" : "Run new turn commands";

	await runSetupStep(
		taskId,
		`workspace_${kind}_commands`,
		title,
		async () => {
			await sandbox.commands.run(
				`mkdir -p ${shellQuote(FACTORYPLANE_SCRIPT_DIR)}`,
				{ timeoutMs: 30_000 },
			);
			await sandbox.files.write(scriptPath, scriptContent);

			return sandbox.commands.run(
				buildRunWorkspaceSetupScriptCommand(scriptPath, workspacePath),
				{
					timeoutMs: WORKSPACE_SETUP_SCRIPT_TIMEOUT_MS,
					envs: {
						...envs,
						FACTORYPLANE_WORKSPACE_ID: workspace.id,
						FACTORYPLANE_TASK_ID: taskId,
						FACTORYPLANE_WORKSPACE: workspacePath,
					},
				},
			);
		},
		{ timeoutMs: WORKSPACE_SETUP_SCRIPT_TIMEOUT_MS + 30_000 },
	);
};

const getWorkspaceCommandScript = (
	workspace: Workspace,
	kind: WorkspaceSetupScriptKind,
) => {
	const commands = getWorkspaceCommandsForKind(workspace, kind);

	if (commands.length > 0) {
		return commands.join("\n\n");
	}

	if (kind === "new_task") {
		return workspace.newTaskSetupScript;
	}

	return workspace.newTurnSetupScript;
};

const getWorkspaceCommandsForKind = (
	workspace: Workspace,
	kind: WorkspaceSetupScriptKind,
) => {
	const commands = (workspace as WorkspaceWithRepositories).commands ?? [];
	const selected = commands.filter((command) =>
		kind === "new_task"
			? (command.runOnNewTask ?? false)
			: (command.runOnNewTurn ?? false),
	);

	return selected
		.sort(
			(a, b) =>
				new Date(a.createdAt ?? 0).getTime() -
				new Date(b.createdAt ?? 0).getTime(),
		)
		.map((command) => command.command.trim())
		.filter((command) => command.length > 0);
};

const buildRunWorkspaceSetupScriptCommand = (
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

const runAgentExec = async (
	sandbox: Sandbox,
	task: Task,
	agent: Agent,
	workspace: Workspace,
	prompt: string,
	options: RunCodexExecOptions = {},
): Promise<boolean> => {
	const provider = getAgentProvider(agent);
	const attachmentPaths = options.attachments?.length
		? await materializeAttachments(sandbox, task.id, options.attachments)
		: [];
	const imagePaths =
		provider === "codex"
			? attachmentPaths
					.filter((attachment) => attachment.contentType.startsWith("image/"))
					.map((attachment) => attachment.filePath)
			: [];
	const workflowOutput = await prepareWorkflowOutputCapture(
		sandbox,
		task,
		provider,
	);
	await prepareAgentAuthForRun(sandbox, task.id, agent);
	const { envs, agentToken } = await setupRun(sandbox, task, agent, workspace);
	const agentSession = options.agentSession;
	const shouldResumeRun =
		options.resumeLast &&
		(provider !== "codex" || Boolean(agentSession?.agentThreadId));
	const output = createAgentOutputHandler(task.id, provider, agentSession?.id);
	const command = await runSetupStep(
		task.id,
		provider === "cursor" ? "cursor_launch" : "codex_launch",
		shouldResumeRun
			? `Resume ${getProviderLabel(provider)}`
			: `Start ${getProviderLabel(provider)}`,
		() =>
			sandbox.commands.run(
				buildAgentExecCommand(provider, task, prompt, {
					...options,
					resumeLast: shouldResumeRun,
					attachmentPaths: attachmentPaths.map(
						(attachment) => attachment.filePath,
					),
					imagePaths,
					outputLastMessagePath: workflowOutput?.outputPath,
				}),
				{
					background: true,
					timeoutMs: 0,
					envs,
					onStdout: output.append,
					onStderr: (data) => {
						console.error(data);
					},
				},
			),
	);

	await updateTaskAgentPid(task.id, command.pid);
	if (agentSession) {
		await updateAgentSessionRunState(agentSession.id, {
			agentPid: command.pid,
			status: "running",
		});
	}

	let wasInterrupted = false;
	let completed = false;
	let failed = false;

	try {
		const result = await command.wait();
		console.log(result);
		assertCommandSucceeded(result, `${getProviderLabel(provider)} execution`);

		if (!wasInterrupted) {
			await updateTaskStatus(task.id, "idle");
			if (agentSession) {
				await updateAgentSessionRunState(agentSession.id, {
					agentPid: undefined,
					status: "idle",
				});
			}
			completed = true;
		}
	} catch (error) {
		const currentPid = agentSession
			? await getAgentSessionPid(agentSession.id)
			: await getTaskAgentPid(task.id);

		if (currentPid !== command.pid) {
			console.log("Agent process was interrupted", {
				taskId: task.id,
				pid: command.pid,
				error,
			});
			wasInterrupted = true;
			return false;
		}

		failed = true;
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
		if (agentSession) {
			await clearAgentSessionPid(
				agentSession.id,
				command.pid,
				failed ? "failed" : "idle",
			);
		}
		await postRun(task.id, agentToken);
		if (provider === "codex") {
			await syncAgentAuthFromSandbox(sandbox, agent.id);
		}
	}

	if (completed && workflowOutput) {
		await persistWorkflowStructuredOutput(
			sandbox,
			task,
			workflowOutput.outputPath,
			workflowOutput.nodeId,
			agentSession?.id,
		);
	}

	return completed;
};

const runYesNoClassifier = async (
	sandbox: Sandbox,
	task: Task,
	agent: Agent,
	workspace: Workspace,
	prompt: string,
	workflowNodeId: string,
): Promise<{ answer: "yes" | "no"; reason?: string } | undefined> => {
	const agentDefaults = getAgentDefaultOptions(agent.settings);
	const taskForClassifier = {
		...task,
		agentModel: agentDefaults.agentModel,
		agentReasoningEffort: agentDefaults.agentReasoningEffort,
		agentSpeed: agentDefaults.agentSpeed,
		workflowNodeId,
	};
	const runId = randomUUID();
	const outputPath = `${WORKFLOW_OUTPUT_DIR}/${task.id}-${runId}-classifier.json`;
	const outputSchemaPath = `${WORKFLOW_OUTPUT_DIR}/${task.id}-${runId}-classifier-schema.json`;

	await db.transact(
		taskTx(task.id)
			.update({
				status: "in_progress",
				agentModel: agentDefaults.agentModel,
				agentReasoningEffort: agentDefaults.agentReasoningEffort,
				agentSpeed: agentDefaults.agentSpeed,
				workflowState: "classifier_running",
				workflowNodeId,
			})
			.link({ agent: agent.id }),
	);

	await prepareAgentAuthForRun(sandbox, task.id, agent);
	await runSetupStep(
		task.id,
		"classifier_output_schema",
		"Prepare classifier output schema",
		async () => {
			await sandbox.commands.run(
				`mkdir -p ${shellQuote(WORKFLOW_OUTPUT_DIR)}`,
				{
					timeoutMs: 30_000,
				},
			);
			await sandbox.files.write(
				outputSchemaPath,
				JSON.stringify(YES_NO_CLASSIFIER_OUTPUT_SCHEMA, null, 2),
			);
		},
		{ timeoutMs: 30_000 },
	);

	const { envs, agentToken } = await setupRun(
		sandbox,
		taskForClassifier,
		agent,
		workspace,
	);
	const output = createAgentOutputHandler(task.id, "codex", undefined);

	try {
		const result = await runSetupStep(
			task.id,
			"yes_no_classifier",
			"Run yes/no classifier",
			() =>
				sandbox.commands.run(
					buildCodexExecCommand(taskForClassifier, prompt, {
						ephemeral: true,
						outputLastMessagePath: outputPath,
						outputSchemaPath,
					}),
					{
						timeoutMs: 10 * 60 * 1000,
						envs,
						onStdout: output.append,
						onStderr: (data) => {
							console.error(data);
						},
					},
				),
			{ timeoutMs: 11 * 60 * 1000 },
		);
		console.log(result);
	} finally {
		await output.flush();
		await postRun(task.id, agentToken);
		await syncAgentAuthFromSandbox(sandbox, agent.id);
	}

	const rawOutput = await sandbox.files.read(outputPath).catch(() => undefined);
	const parsed = parseWorkflowStructuredOutput(rawOutput);

	if (!isRecord(parsed)) {
		return undefined;
	}

	const answer = parsed.answer;

	if (answer !== "yes" && answer !== "no") {
		return undefined;
	}

	return {
		answer,
		reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
	};
};

const YES_NO_CLASSIFIER_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["answer"],
	properties: {
		answer: {
			type: "string",
			enum: ["yes", "no"],
		},
		reason: {
			type: "string",
		},
	},
};

const prepareAgentAuthForRun = async (
	sandbox: Sandbox,
	taskId: string,
	agent: Agent,
) => {
	if (getAgentProvider(agent) !== "codex") {
		return;
	}

	const agentAuth = await getAgentAuth(agent);

	await runSetupStep(taskId, "codex_auth", "Write Codex auth", () =>
		sandbox.files.write(CODEX_AUTH_PATH, JSON.stringify(agentAuth)),
	);
};

const prepareWorkflowOutputCapture = async (
	sandbox: Sandbox,
	task: Task,
	provider: AgentProvider,
) => {
	if (provider !== "codex") {
		return undefined;
	}

	const runId = randomUUID();
	const outputPath = `${WORKFLOW_OUTPUT_DIR}/${task.id}-${runId}.json`;

	await runSetupStep(
		task.id,
		"workflow_output_capture",
		"Prepare workflow output capture",
		async () => {
			await sandbox.commands.run(
				`mkdir -p ${shellQuote(WORKFLOW_OUTPUT_DIR)}`,
				{ timeoutMs: 30_000 },
			);
		},
		{ timeoutMs: 30_000 },
	);

	return {
		nodeId: task.workflowNodeId,
		outputPath,
	};
};

const persistWorkflowStructuredOutput = async (
	sandbox: Sandbox,
	task: Task,
	outputPath: string,
	workflowNodeId: string | undefined,
	agentSessionId: string | undefined,
) => {
	const rawOutput = await sandbox.files.read(outputPath).catch(() => undefined);
	const finalMessage = rawOutput?.trim();

	if (!finalMessage) {
		return;
	}

	const latestTask = await getLatestWorkflowTask(task.id).catch(
		() => undefined,
	);
	const currentInput = getWorkflowInput(
		latestTask?.workflowInput ?? task.workflowInput,
	);
	const structuredOutput = parseWorkflowStructuredOutput(finalMessage);
	const workflowInput = {
		...currentInput,
		...(isRecord(structuredOutput) ? structuredOutput : {}),
		lastMessage: finalMessage,
		...(structuredOutput !== undefined ? { output: structuredOutput } : {}),
	};

	await db.transact(
		taskTx(task.id).update({
			workflowInput,
		}),
	);

	await persistFactoryplaneEvent(task.id, "factoryplane.workflow.output", {
		taskId: task.id,
		workflowNodeId,
		agentSessionId,
		output: structuredOutput,
		lastMessage: finalMessage,
	});

	task.workflowInput = workflowInput;
};

const parseWorkflowStructuredOutput = (rawOutput: string | undefined) => {
	const trimmed = rawOutput?.trim();

	if (!trimmed) {
		return undefined;
	}

	try {
		return JSON.parse(trimmed) as unknown;
	} catch (error) {
		console.warn("Failed to parse workflow structured output", {
			error,
			output: trimmed,
		});
		return undefined;
	}
};

const materializeAttachments = async (
	sandbox: Sandbox,
	taskId: string,
	attachments: Attachment[],
) => {
	const validAttachments = attachments.filter((attachment) =>
		isValidTaskAttachmentPath(taskId, attachment.path),
	);

	if (validAttachments.length === 0) {
		return [];
	}

	const attachmentDir = `/tmp/factoryplane-attachments/${taskId}`;
	const downloads = await runSetupStep(
		taskId,
		"file_attachments",
		"Download file attachments",
		async () => {
			const downloads: AttachmentDownload[] = await Promise.all(
				validAttachments.map(async (attachment, index) => {
					const downloadUrl = await getAttachmentDownloadUrl(attachment.path);
					const filePath = `${attachmentDir}/${String(index + 1).padStart(2, "0")}-${sanitizeSandboxFileName(attachment.name)}`;

					return {
						contentType: attachment.contentType,
						downloadUrl,
						filePath,
					};
				}),
			);
			const result = await sandbox.commands.run(
				[
					"set -e",
					`mkdir -p ${shellQuote(attachmentDir)}`,
					...downloads.map(
						(download) =>
							`curl -fL --retry 3 --retry-delay 1 -o ${shellQuote(download.filePath)} ${shellQuote(download.downloadUrl)}`,
					),
				].join("\n"),
				{ timeoutMs: 120_000 },
			);

			assertCommandSucceeded(result, "Download file attachments");
			return downloads;
		},
		{ timeoutMs: 120_000 },
	);

	return downloads.map((download) => ({
		contentType: download.contentType,
		filePath: download.filePath,
	}));
};

const getAttachmentDownloadUrl = async (path: string) => {
	const fileUrl = await getStorageFileUrl(path);

	if (fileUrl) {
		return fileUrl;
	}

	const storage = db.storage as typeof db.storage & {
		getDownloadUrl?: (path: string) => Promise<string>;
	};
	const downloadUrl = await storage.getDownloadUrl?.(path);

	if (downloadUrl) {
		return downloadUrl;
	}

	throw new Error(`Attachment file was not found in storage: ${path}`);
};

const getStorageFileUrl = async (path: string) => {
	const result = await db.query({
		$files: {
			$: {
				where: {
					path,
				},
			},
		},
	});
	const file = result.$files[0] as { url?: unknown } | undefined;

	return typeof file?.url === "string" && file.url.length > 0
		? file.url
		: undefined;
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

	const diff = await generateTaskPatch(sandbox, task.id, workspacePath);
	const latestDiffPath = `tasks/${task.id}/latest.patch`;
	const patchBuffer = Buffer.from(diff.patch, "utf8");
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
				latestDiffFileCount: diff.files.length,
				latestDiffFiles: diff.files,
			})
			.link({ latestDiffFile: file.id }),
	);
};

const generateTaskPatch = async (
	sandbox: Sandbox,
	taskId: string,
	workspacePath: string,
) => {
	const nameStatusMarker = "__FACTORYPLANE_DIFF_NAME_STATUS__";
	const numstatMarker = "__FACTORYPLANE_DIFF_NUMSTAT__";
	const patchMarker = "__FACTORYPLANE_DIFF_PATCH__";
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
			"git add -f -A",
			"git commit --allow-empty -qm baseline",
			`replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(repoPath)}`,
			"git add -f -A",
			`printf '%s\\n' ${shellQuote(nameStatusMarker)}`,
			"git diff --cached --name-status HEAD",
			`printf '%s\\n' ${shellQuote(numstatMarker)}`,
			"git diff --cached --numstat HEAD",
			`printf '%s\\n' ${shellQuote(patchMarker)}`,
			"git diff --cached --binary --full-index HEAD",
		].join("\n"),
		{ timeoutMs: 120_000 },
	);

	const sections = splitTaskDiffOutput(result.stdout, {
		nameStatus: nameStatusMarker,
		numstat: numstatMarker,
		patch: patchMarker,
	});

	return {
		patch: sections.patch,
		files: parseTaskDiffFiles(sections.nameStatus, sections.numstat),
	};
};

const splitTaskDiffOutput = (
	output: string,
	markers: { nameStatus: string; numstat: string; patch: string },
) => {
	const nameStatusStart = output.indexOf(`${markers.nameStatus}\n`);
	const numstatStart = output.indexOf(`${markers.numstat}\n`);
	const patchStart = output.indexOf(`${markers.patch}\n`);

	if (nameStatusStart < 0 || numstatStart < 0 || patchStart < 0) {
		return {
			nameStatus: "",
			numstat: "",
			patch: output,
		};
	}

	return {
		nameStatus: output
			.slice(nameStatusStart + markers.nameStatus.length + 1, numstatStart)
			.trimEnd(),
		numstat: output
			.slice(numstatStart + markers.numstat.length + 1, patchStart)
			.trimEnd(),
		patch: output.slice(patchStart + markers.patch.length + 1),
	};
};

const parseTaskDiffFiles = (
	nameStatusText: string,
	numstatText: string,
): TaskDiffFileSummary[] => {
	const files = new Map<string, TaskDiffFileSummary>();

	for (const line of nameStatusText.split("\n")) {
		if (!line.trim()) {
			continue;
		}

		const [rawStatus, firstPath, secondPath] = line.split("\t");
		if (!rawStatus || !firstPath) {
			continue;
		}

		const statusCode = rawStatus.charAt(0);
		const isRenameOrCopy = statusCode === "R" || statusCode === "C";
		const path = isRenameOrCopy && secondPath ? secondPath : firstPath;
		const oldPath = isRenameOrCopy ? firstPath : undefined;

		files.set(path, {
			path,
			...(oldPath ? { oldPath } : {}),
			status: getTaskDiffFileStatus(rawStatus),
		});
	}

	for (const line of numstatText.split("\n")) {
		if (!line.trim()) {
			continue;
		}

		const [rawAdditions, rawDeletions, path] = line.split("\t");
		if (!path) {
			continue;
		}

		const existing = files.get(path);
		if (!existing) {
			continue;
		}

		const additions = parseTaskDiffLineCount(rawAdditions);
		const deletions = parseTaskDiffLineCount(rawDeletions);
		files.set(path, {
			...existing,
			...(additions === undefined ? {} : { additions }),
			...(deletions === undefined ? {} : { deletions }),
			binary: additions === undefined || deletions === undefined || undefined,
		});
	}

	return Array.from(files.values()).sort((first, second) =>
		first.path.localeCompare(second.path),
	);
};

const parseTaskDiffLineCount = (value: string | undefined) => {
	if (!value || value === "-") {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const getTaskDiffFileStatus = (rawStatus: string): TaskDiffFileStatus => {
	switch (rawStatus.charAt(0)) {
		case "A":
			return "added";
		case "M":
			return "modified";
		case "D":
			return "deleted";
		case "R":
			return "renamed";
		case "C":
			return "copied";
		case "T":
			return "typechange";
		case "U":
			return "unmerged";
		default:
			return "unknown";
	}
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

const setupRun = async (
	sandbox: Sandbox,
	task: Task,
	agent: Agent,
	workspace: Workspace,
) => {
	const agentToken = randomUUID();
	await db.transact(
		taskTx(task.id).update({
			agentToken,
		}),
	);

	const envs: Record<string, string> = {
		FACTORYPLANE_AUTH_TOKEN: agentToken,
		...getAgentSafeBaseEnvs(),
		...(await getWorkspaceGithubAuthEnvs(workspace)),
	};

	if (getAgentProvider(agent) === "cursor") {
		Object.assign(envs, await getCursorAuthEnvs(agent));
	}

	try {
		await runWorkspaceCommands(sandbox, task.id, workspace, "new_turn", envs);
	} catch (error) {
		await clearTaskAgentToken(task.id, agentToken);
		throw error;
	}

	return { envs, agentToken };
};

const getAgentSafeBaseEnvs = () => ({
	GH_PROMPT_DISABLED: "1",
	GIT_TERMINAL_PROMPT: "0",
});

const postRun = async (taskId: string, agentToken: string) => {
	await clearTaskAgentToken(taskId, agentToken);
};

const buildAgentExecCommand = (
	provider: AgentProvider,
	task: Task,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	const promptWithAttachments = appendAttachmentReferences(
		ensureAgentPrompt(prompt),
		options.attachmentPaths,
	);

	if (provider === "cursor") {
		return buildCursorExecCommand(task, promptWithAttachments, options);
	}

	return buildCodexExecCommand(task, promptWithAttachments, options);
};

const appendAttachmentReferences = (
	prompt: string,
	attachmentPaths: string[] | undefined,
) => {
	if (!attachmentPaths?.length) {
		return prompt;
	}

	return [
		prompt,
		"",
		"Attached files have been downloaded into the sandbox at:",
		...attachmentPaths.map((filePath) => `- ${filePath}`),
		"",
		"Use these local paths when you need to inspect or reference the uploaded files.",
	].join("\n");
};

const ensureAgentPrompt = (prompt: string | undefined) => {
	const trimmed = prompt?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : "Continue this task.";
};

const buildNewTaskPrompt = (task: Task, attachments: Attachment[]) => {
	const instructions = task.instructions?.trim();

	if (instructions) {
		return `${task.name}. ${instructions}`;
	}

	if (attachments.length === 0) {
		return `${task.name}. Continue this task.`;
	}

	const attachmentList = attachments
		.map((attachment) => `- ${attachment.name}`)
		.join("\n");

	return `${task.name}. Use the attached file input.\n\nAttached files:\n${attachmentList}`;
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
	const imageArgs = (options.imagePaths ?? []).map(
		(imagePath) => `--image ${shellQuote(imagePath)}`,
	);

	if (options.ephemeral) {
		args.push("--ephemeral");
	}

	if (options.outputSchemaPath) {
		args.push(`--output-schema ${shellQuote(options.outputSchemaPath)}`);
	}

	if (options.outputLastMessagePath) {
		args.push(
			`--output-last-message ${shellQuote(options.outputLastMessagePath)}`,
		);
	}

	if (options.resumeLast && options.agentSession?.agentThreadId) {
		args.push(`resume ${shellQuote(options.agentSession.agentThreadId)}`);
		args.push(...imageArgs);
	} else {
		args.push(
			`-c ${shellQuote(formatCodexDeveloperInstructionsConfig(getCodexDeveloperInstructions()))}`,
		);
		args.push(...imageArgs);
	}

	args.push(shellQuote(prompt));
	return args.join(" ");
};

const buildCursorExecCommand = (
	task: Task,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	const args = ["cursor-agent", "-p", "--force", "--output-format stream-json"];
	const model = task.agentModel?.trim();

	if (model) {
		args.push(`--model ${shellQuote(model)}`);
	}

	if (options.resumeLast) {
		args.push("--resume");
	}

	args.push(shellQuote(prompt));
	return [getCursorPathPrefix(), args.join(" ")].join("\n");
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

const killTaskAgentProcess = async (
	sandbox: Sandbox,
	task: Task,
	agentSession: AgentSession | undefined,
) => {
	const agentPid =
		typeof agentSession?.agentPid === "number"
			? agentSession.agentPid
			: task.agentPid;

	if (typeof agentPid !== "number") {
		return;
	}

	try {
		const killed = await sandbox.commands.kill(agentPid);
		console.log("Killed previous agent process", {
			taskId: task.id,
			agentSessionId: agentSession?.id,
			pid: agentPid,
			killed,
		});
	} catch (error) {
		console.log("Failed to kill previous agent process", {
			taskId: task.id,
			agentSessionId: agentSession?.id,
			pid: agentPid,
			error,
		});
	}

	await clearTaskAgentPid(task.id, agentPid);
	if (agentSession) {
		await clearAgentSessionPid(agentSession.id, agentPid);
	}
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

const updateAgentSessionRunState = async (
	agentSessionId: string,
	state: {
		agentPid?: number;
		status: string;
	},
) => {
	await db.transact(
		agentSessionTx(agentSessionId).update({
			agentPid: state.agentPid,
			status: state.status,
			updatedAt: new Date().toISOString(),
		}),
	);
};

const clearAgentSessionPid = async (
	agentSessionId: string,
	agentPid: number,
	status: "idle" | "failed" = "idle",
) => {
	const currentPid = await getAgentSessionPid(agentSessionId);

	if (currentPid !== agentPid) {
		return;
	}

	await db.transact(
		agentSessionTx(agentSessionId).update({
			agentPid: undefined,
			status,
			updatedAt: new Date().toISOString(),
		}),
	);
};

const getAgentSessionPid = async (agentSessionId: string) => {
	const currentSession = await db
		.query({
			agentSessions: {
				$: {
					where: {
						id: agentSessionId,
					},
				},
			},
		})
		.then((result) => result.agentSessions[0]);

	return currentSession?.agentPid;
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

const clearTaskAgentToken = async (taskId: string, agentToken: string) => {
	const existingToken = await getTaskAgentToken(taskId);

	if (existingToken !== agentToken) {
		return;
	}

	await db.transact(
		taskTx(taskId).update({
			agentToken: undefined,
		}),
	);
};

const createAgentOutputHandler = (
	taskId: string,
	provider: AgentProvider,
	agentSessionId: string | undefined,
) => {
	let buffer = "";

	const append = async (chunk: string) => {
		buffer += chunk;

		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? "";

		await persistCodexEvents(
			taskId,
			parseAgentLines(lines, provider),
			agentSessionId,
		);
	};

	const flush = async () => {
		const finalLine = buffer.trim();
		buffer = "";

		if (!finalLine) {
			return;
		}

		const events = parseAgentLines([finalLine], provider);
		await persistCodexEvents(taskId, events, agentSessionId);
	};

	return { append, flush };
};

const parseAgentLines = (lines: string[], provider: AgentProvider) => {
	const events: CodexEvent[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		events.push(parseAgentEvent(line, provider));
	}

	return events;
};

const parseAgentEvent = (line: string, provider: AgentProvider): CodexEvent => {
	try {
		const data = JSON.parse(line) as unknown;

		if (!isRecord(data)) {
			return {
				type: `${provider}.event`,
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
		const typePrefix = `${provider}.`;

		return {
			type: rawType.startsWith(typePrefix) ? rawType : `${provider}.${rawType}`,
			data,
		};
	} catch (error) {
		return {
			type: `${provider}.unparsed`,
			data: {
				raw: line,
				error: error instanceof Error ? error.message : String(error),
			},
		};
	}
};

const persistCodexEvents = async (
	taskId: string,
	events: CodexEvent[],
	agentSessionId: string | undefined,
) => {
	if (events.length === 0) {
		return;
	}

	await db.transact(
		events.map((event) => {
			const eventTx = db.tx.events[randomUUID()];

			if (!eventTx) {
				throw new Error("Failed to create InstantDB event transaction");
			}

			const transaction = eventTx
				.create({
					type: event.type,
					data: event.data,
					createdAt: new Date().toISOString(),
				})
				.link(
					agentSessionId
						? { task: taskId, agentSession: agentSessionId }
						: { task: taskId },
				);

			return transaction;
		}),
	);

	if (agentSessionId) {
		const threadId = events
			.map((event) => getAgentThreadId(event.data))
			.find((value): value is string => Boolean(value));

		if (threadId) {
			await db.transact([
				agentSessionTx(agentSessionId).update({
					agentThreadId: threadId,
					updatedAt: new Date().toISOString(),
				}),
				taskTx(taskId).update({
					agentThreadId: threadId,
				}),
			]);
		}
	}
};

const getAgentThreadId = (data: unknown) => {
	if (!isRecord(data)) {
		return undefined;
	}

	const threadId = data.thread_id ?? data.threadId;

	return typeof threadId === "string" && threadId.length > 0
		? threadId
		: undefined;
};

const runSetupStep = async <T>(
	taskId: string,
	step: string,
	title: string,
	action: () => Promise<T>,
	options: SetupStepOptions = {},
) => {
	console.log("Setup step started", { taskId, step, title });
	await persistFactoryplaneEvent(taskId, "factoryplane.setup_step_started", {
		step,
		title,
		status: "started",
	});

	try {
		const result = await runWithTimeout(action(), title, options.timeoutMs);
		console.log("Setup step completed", { taskId, step, title });
		await persistFactoryplaneEvent(
			taskId,
			"factoryplane.setup_step_completed",
			{
				step,
				title,
				status: "completed",
			},
		);
		return result;
	} catch (error) {
		const failureStatus = options.failureStatus ?? "failed";
		console.error("Setup step failed", {
			taskId,
			step,
			title,
			status: failureStatus,
			error,
		});
		await persistFactoryplaneEvent(
			taskId,
			failureStatus === "warning"
				? "factoryplane.setup_step_warning"
				: "factoryplane.setup_step_failed",
			{
				step,
				title,
				status: failureStatus,
				error: getErrorMessage(error),
			},
		);
		throw error;
	}
};

const runWithTimeout = async <T>(
	promise: Promise<T>,
	label: string,
	timeoutMs: number | undefined,
) => {
	if (!timeoutMs) {
		return promise;
	}

	let timeout: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
};

const assertCommandSucceeded = (result: CommandResultLike, label: string) => {
	if (result.exitCode === 0) {
		return;
	}

	const stderr = result.stderr?.trim();
	const stdout = result.stdout?.trim();
	const output = stderr || stdout;
	const detail = output ? `: ${truncateForError(output)}` : "";

	throw new Error(`${label} failed with exit code ${result.exitCode}${detail}`);
};

const truncateForError = (value: string) =>
	value.length > 800 ? `${value.slice(0, 797)}...` : value;

const runOptionalSetupStep = async <T>(
	taskId: string,
	step: string,
	title: string,
	action: () => Promise<T>,
	options: SetupStepOptions = {},
) => {
	try {
		return await runSetupStep(taskId, step, title, action, {
			...options,
			failureStatus: options.failureStatus ?? "warning",
		});
	} catch (error) {
		console.warn("Optional setup step failed", {
			taskId,
			step,
			error,
		});
		return undefined;
	}
};

const persistFactoryplaneEvent = async (
	taskId: string,
	type: string,
	data: Record<string, unknown>,
) => {
	const agentSessionId =
		typeof data.agentSessionId === "string" ? data.agentSessionId : undefined;

	await db.transact(
		eventTx(randomUUID())
			.create({
				type,
				data,
				createdAt: new Date().toISOString(),
			})
			.link(
				agentSessionId
					? { task: taskId, agentSession: agentSessionId }
					: { task: taskId },
			),
	);
};

const getErrorMessage = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
};

const getStringDataValue = (data: unknown, key: string) => {
	if (!isRecord(data)) {
		return undefined;
	}

	const value = data[key];
	return typeof value === "string" ? value : undefined;
};

const getAttachments = (data: unknown, taskId: string): Attachment[] => {
	if (!isRecord(data)) {
		return [];
	}

	const items = [
		...(Array.isArray(data.attachments) ? data.attachments : []),
		...(Array.isArray(data.images) ? data.images : []),
	];

	return items.flatMap((item) => {
		if (!isRecord(item)) {
			return [];
		}

		const path = getStringRecordValue(item, "path");
		const id = getStringRecordValue(item, "id") ?? path;
		const name = getStringRecordValue(item, "name") ?? "file";
		const contentType =
			getStringRecordValue(item, "contentType") ?? "application/octet-stream";
		const size = item.size;

		if (!id || !path || !isValidTaskAttachmentPath(taskId, path)) {
			return [];
		}

		return [
			{
				id,
				path,
				url: getStringRecordValue(item, "url"),
				name,
				contentType,
				size: typeof size === "number" && Number.isFinite(size) ? size : 0,
			},
		];
	});
};

const isValidTaskAttachmentPath = (taskId: string, path: string) =>
	path.startsWith(`tasks/${taskId}/attachments/`) ||
	path.startsWith(`tasks/${taskId}/images/`);

const getStringRecordValue = (record: Record<string, unknown>, key: string) => {
	const value = record[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const sanitizeSandboxFileName = (value: string) => {
	const normalized = value
		.trim()
		.replaceAll("\\", "-")
		.replaceAll("/", "-")
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "image";
};

const shellQuote = (value: string) => {
	return `'${value.replaceAll("'", "'\\''")}'`;
};
