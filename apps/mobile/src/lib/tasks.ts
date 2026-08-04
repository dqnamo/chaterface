import { id } from "@instantdb/react-native";
import db from "@/lib/instant";

export type TaskDotStatus = "idle" | "running" | "failed";

export type TaskListItem = {
	id: string;
	name: string;
	status?: string;
	completedAt?: string | number;
	sandboxId?: string;
	agentThreadId?: string;
	agentSessions?: { id: string; status?: string }[];
};

const ACTIVE_TASK_STATUS_RANKS = {
	failed: 0,
	idle: 1,
	in_progress: 2,
} as const;

export function toTaskDotStatus(status: string | undefined): TaskDotStatus {
	if (status === "in_progress" || status === "running") {
		return "running";
	}

	if (status === "failed") {
		return "failed";
	}

	return "idle";
}

export function isCompletedTask(task: TaskListItem) {
	return (
		Boolean(task.completedAt) ||
		task.status === "complete" ||
		task.status === "done"
	);
}

export function isActiveTask(task: TaskListItem) {
	if (isCompletedTask(task) || task.status === "todo") {
		return false;
	}

	return (
		task.status === "in_progress" ||
		(task.agentSessions?.length ?? 0) > 0 ||
		Boolean(task.sandboxId) ||
		Boolean(task.agentThreadId)
	);
}

const getActiveTaskStatusRank = (status: string | undefined) =>
	status && status in ACTIVE_TASK_STATUS_RANKS
		? ACTIVE_TASK_STATUS_RANKS[status as keyof typeof ACTIVE_TASK_STATUS_RANKS]
		: ACTIVE_TASK_STATUS_RANKS.idle;

/**
 * Splits a workspace's tasks into the same "active" / "completed" groups the
 * web sidebar shows, preserving its ordering rules.
 */
export function groupTasks(tasks: readonly TaskListItem[]) {
	const indexed = tasks.map((task, index) => ({ task, index }));

	const active = indexed
		.filter(({ task }) => isActiveTask(task))
		.sort((first, second) => {
			const rankDelta =
				getActiveTaskStatusRank(first.task.status) -
				getActiveTaskStatusRank(second.task.status);

			return rankDelta || first.index - second.index;
		})
		.map(({ task }) => task);

	const completed = indexed
		.filter(({ task }) => isCompletedTask(task))
		.sort((first, second) => {
			const completedAtDelta = String(
				second.task.completedAt ?? "",
			).localeCompare(String(first.task.completedAt ?? ""));

			return completedAtDelta || first.index - second.index;
		})
		.map(({ task }) => task);

	const other = indexed
		.filter(({ task }) => !isActiveTask(task) && !isCompletedTask(task))
		.map(({ task }) => task);

	return { active, completed, other };
}

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
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

export const DEFAULT_TASK_NAME = "New task";

/**
 * Creates a task and its first agent session, then records the
 * `chaterface.new_task` event the backend workflow picks up. This is the same
 * transaction the web app's new-task dialog runs.
 */
export async function createTask({
	agentId,
	agentModel,
	agentReasoningEffort,
	agentSpeed,
	instructions,
	workspaceAgentId,
	workspaceId,
}: {
	agentId: string;
	agentModel: string;
	agentReasoningEffort: string;
	agentSpeed: string;
	instructions: string;
	workspaceAgentId: string;
	workspaceId: string;
}) {
	const taskId = id();
	const agentSessionId = id();
	const eventId = id();
	const createdAt = new Date().toISOString();
	const name = getFallbackTaskName(instructions) ?? DEFAULT_TASK_NAME;

	await db.transact([
		taskTx(taskId)
			.create({
				name,
				status: "in_progress",
				instructions,
				createdAt,
				agentModel,
				agentReasoningEffort,
				agentSpeed,
			})
			.link({
				workspace: workspaceId,
				workspaceAgent: workspaceAgentId,
				agent: agentId,
			}),
		agentSessionTx(agentSessionId)
			.create({
				name: "Agent",
				status: "running",
				createdAt,
				updatedAt: createdAt,
			})
			.link({ task: taskId, agent: agentId }),
		eventTx(eventId)
			.create({
				type: "chaterface.new_task",
				data: { taskId, name, instructions, attachments: [] },
				createdAt,
			})
			.link({ task: taskId, agentSession: agentSessionId }),
	]);

	return taskId;
}

/**
 * Appends a user turn to an existing task and re-opens it so the agent picks
 * the work back up.
 */
export async function sendTurn({
	agentModel,
	agentReasoningEffort,
	agentSessionId,
	agentSpeed,
	content,
	taskId,
	userId,
}: {
	agentModel?: string;
	agentReasoningEffort?: string;
	agentSessionId: string;
	agentSpeed?: string;
	content: string;
	taskId: string;
	userId?: string;
}) {
	const eventId = id();
	const createdAt = new Date().toISOString();

	await db.transact([
		taskTx(taskId).update({
			status: "in_progress",
			completedAt: undefined,
			agentModel,
			agentReasoningEffort,
			agentSpeed,
		}),
		agentSessionTx(agentSessionId).update({
			status: "running",
			updatedAt: createdAt,
		}),
		eventTx(eventId)
			.create({
				type: "chaterface.new_user_message",
				data: { content, attachments: [], userId },
				createdAt,
			})
			.link({ task: taskId, agentSession: agentSessionId }),
	]);
}

/** Creates an agent session for a task that has none yet. */
export async function createAgentSession({
	agentId,
	taskId,
	name = "Agent",
}: {
	agentId?: string;
	taskId: string;
	name?: string;
}) {
	const agentSessionId = id();
	const createdAt = new Date().toISOString();

	const transaction = agentSessionTx(agentSessionId).create({
		name,
		status: "idle",
		createdAt,
		updatedAt: createdAt,
	});

	await db.transact(
		agentId
			? transaction.link({ task: taskId, agent: agentId })
			: transaction.link({ task: taskId }),
	);

	return agentSessionId;
}

export function getFallbackTaskName(instructions: string | undefined) {
	if (!instructions) {
		return undefined;
	}

	const firstLine = instructions.split("\n")[0] ?? "";

	return cleanTaskName(firstLine);
}

function cleanTaskName(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const normalized = value
		.trim()
		.replace(/^["'`]+|["'`.]+$/g, "")
		.replace(/\s+/g, " ");

	if (!normalized) {
		return undefined;
	}

	return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}
