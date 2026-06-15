"use client";

import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
	monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { type InstaQLEntity, id } from "@instantdb/react";
import NumberFlow from "@number-flow/react";
import {
	CheckCircleIcon,
	CircleIcon,
	DotsSixVerticalIcon,
	PlayCircleIcon,
	PlusCircleIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
	getAgentDefaultOptions,
} from "@/codex-options";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import { Input, Textarea } from "@/components/Input";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import TaskStatusDots from "@/components/TaskStatusDots";
import { cn } from "@/helpers/classname-helper";
import { toTaskDotStatus } from "@/helpers/task-status-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type Agent = Pick<
	InstaQLEntity<AppSchema, "agents">,
	"id" | "name" | "settings"
>;
type AgentSession = Pick<
	InstaQLEntity<AppSchema, "agentSessions">,
	"id" | "name" | "status"
>;
type Task = InstaQLEntity<AppSchema, "tasks"> & {
	agentSessions?: AgentSession[];
};
type TaskColumnId = "todo" | "in_progress" | "done";

type TaskColumn = {
	id: TaskColumnId;
	title: string;
	icon: ReactNode;
	empty: string;
};

const COLUMNS: TaskColumn[] = [
	{
		id: "todo",
		title: "Todo",
		icon: <CircleIcon weight="bold" className="size-4 text-grayscale-9" />,
		empty: "No todo tasks",
	},
	{
		id: "in_progress",
		title: "In Progress",
		icon: <PlayCircleIcon weight="bold" className="size-4 text-blue-9" />,
		empty: "No active tasks",
	},
	{
		id: "done",
		title: "Done",
		icon: <CheckCircleIcon weight="bold" className="size-4 text-green-9" />,
		empty: "No done tasks",
	},
];

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

export default function TasksPage() {
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [taskName, setTaskName] = useState("");
	const [taskInstructions, setTaskInstructions] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string>();
	const [movingTaskId, setMovingTaskId] = useState<string>();

	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			agents: {
				$: {
					fields: ["name", "settings"],
				},
			},
		},
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
			agentSessions: {},
		},
	});

	const agents = data?.organisations?.[0]?.agents as Agent[] | undefined;
	const selectedAgent = agents?.[0];
	const tasks = useMemo(
		() => [...(data?.tasks ?? [])].sort(compareTasks),
		[data?.tasks],
	);
	const tasksByColumn = useMemo(() => {
		const grouped: Record<TaskColumnId, Task[]> = {
			todo: [],
			in_progress: [],
			done: [],
		};

		for (const task of tasks) {
			grouped[getTaskColumnId(task)].push(task);
		}

		return grouped;
	}, [tasks]);
	const noAgentsConfigured =
		Boolean(data?.organisations?.[0]) && (agents?.length ?? 0) === 0;

	const startTask = useCallback(
		async (taskId: string) => {
			if (!user?.refresh_token) {
				throw new Error("You must be signed in to start a task.");
			}

			const response = await fetch(`/api/tasks/${taskId}/start`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.refresh_token}`,
				},
			});

			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(result?.message ?? "Failed to start task.");
			}
		},
		[user?.refresh_token],
	);

	const moveTaskToColumn = useCallback(
		async (taskId: string, nextColumnId: TaskColumnId) => {
			const task = tasks.find((candidate) => candidate.id === taskId);

			if (
				!task ||
				getTaskColumnId(task) === nextColumnId ||
				nextColumnId === "todo"
			) {
				return;
			}

			setMovingTaskId(taskId);

			try {
				if (nextColumnId === "in_progress") {
					await startTask(taskId);
					return;
				}

				await db.transact(
					taskTx(taskId).update({
						status: nextColumnId === "done" ? "complete" : "todo",
						completedAt:
							nextColumnId === "done" ? DateTime.now().toISO() : undefined,
					}),
				);
			} finally {
				setMovingTaskId(undefined);
			}
		},
		[startTask, tasks],
	);

	useEffect(() => {
		return monitorForElements({
			onDrop({ source, location }) {
				const taskId = getDragDataString(source.data.taskId);
				const nextColumnId = getDragDataString(
					location.current.dropTargets[0]?.data.columnId,
				) as TaskColumnId | undefined;

				if (!taskId || !isTaskColumnId(nextColumnId)) {
					return;
				}

				void moveTaskToColumn(taskId, nextColumnId).catch((error) => {
					console.error("Failed to move task", {
						error: error instanceof Error ? error.message : String(error),
					});
				});
			},
		});
	}, [moveTaskToColumn]);

	const createTask = async () => {
		const name = taskName.trim();
		const instructions = taskInstructions.trim();

		if (isCreating || !name || !instructions) {
			return;
		}

		if (!selectedAgent) {
			setCreateError("Create an agent before creating a task.");
			return;
		}

		if (!user?.refresh_token) {
			setCreateError("You must be signed in to create a task.");
			return;
		}

		const defaults = getAgentDefaultOptions(selectedAgent.settings);
		setIsCreating(true);
		setCreateError(undefined);

		try {
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					taskId: id(),
					factoryId: currentFactoryId,
					agentId: selectedAgent.id,
					name,
					instructions,
					agentModel: defaults.agentModel ?? DEFAULT_CODEX_MODEL,
					agentReasoningEffort:
						defaults.agentReasoningEffort ?? DEFAULT_CODEX_REASONING_EFFORT,
					agentSpeed: defaults.agentSpeed ?? DEFAULT_CODEX_SPEED,
				}),
			});

			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(result?.message ?? "Failed to create task.");
			}

			setTaskName("");
			setTaskInstructions("");
			setIsCreateOpen(false);
		} catch (error) {
			setCreateError(
				error instanceof Error ? error.message : "Failed to create task.",
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden">
			<header className="flex shrink-0 flex-row items-center justify-between border-b border-grayscale-4 p-1.5">
				<div className="flex min-w-0 flex-row items-center">
					<ExpandSidebarButton />
					<p className="truncate p-1 text-sm text-grayscale-11">Tasks</p>
				</div>
				<Button
					type="button"
					disabled={noAgentsConfigured}
					onClick={() => setIsCreateOpen(true)}
					className="h-7 shrink-0"
				>
					<PlusCircleIcon weight="bold" className="size-4" />
					New task
				</Button>
			</header>
			{noAgentsConfigured ? (
				<p className="shrink-0 border-b border-red-6 bg-red-2 px-3 py-2 text-xs text-red-11">
					Create an agent before adding tasks.
				</p>
			) : null}
			<div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-3 md:divide-x md:divide-grayscale-4 md:overflow-hidden">
				{COLUMNS.map((column) => (
					<KanbanColumn
						key={column.id}
						column={column}
						tasks={tasksByColumn[column.id]}
						currentOrgHandle={currentOrgHandle}
						currentFactoryId={currentFactoryId}
						movingTaskId={movingTaskId}
						onStartTask={(taskId) => {
							void moveTaskToColumn(taskId, "in_progress").catch((error) => {
								console.error("Failed to start task", {
									error: error instanceof Error ? error.message : String(error),
								});
							});
						}}
					/>
				))}
			</div>
			<Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								void createTask();
							}}
						>
							<div className="flex flex-col gap-1 p-3">
								<Dialog.Title>Create task</Dialog.Title>
								<Dialog.Description>
									Add a todo task without starting an agent session.
								</Dialog.Description>
							</div>
							<div className="flex flex-col gap-3 border-t border-grayscale-4 p-3">
								<label className="flex flex-col gap-1.5" htmlFor="task-name">
									<span className="text-xs text-grayscale-11">Name</span>
									<Input
										autoFocus
										id="task-name"
										type="text"
										placeholder="Task name"
										value={taskName}
										onChange={(event) => setTaskName(event.target.value)}
									/>
								</label>
								<label
									className="flex flex-col gap-1.5"
									htmlFor="task-instructions"
								>
									<span className="text-xs text-grayscale-11">
										Instructions
									</span>
									<Textarea
										id="task-instructions"
										className="min-h-32 text-sm"
										placeholder="What should the agent do when this starts?"
										value={taskInstructions}
										onChange={(event) =>
											setTaskInstructions(event.target.value)
										}
										onSubmit={createTask}
									/>
								</label>
								{createError ? (
									<p className="rounded-md border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
										{createError}
									</p>
								) : null}
							</div>
							<div className="flex items-center justify-end gap-2 border-t border-grayscale-4 p-3">
								<Dialog.Close type="button">Cancel</Dialog.Close>
								<Button
									type="submit"
									disabled={
										isCreating || !taskName.trim() || !taskInstructions.trim()
									}
								>
									{isCreating ? "Creating..." : "Create task"}
								</Button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}

function KanbanColumn({
	column,
	tasks,
	currentOrgHandle,
	currentFactoryId,
	movingTaskId,
	onStartTask,
}: {
	column: TaskColumn;
	tasks: Task[];
	currentOrgHandle: string;
	currentFactoryId: string;
	movingTaskId?: string;
	onStartTask: (taskId: string) => void;
}) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);

	useEffect(() => {
		const element = ref.current;

		if (!element) {
			return;
		}

		return dropTargetForElements({
			element,
			getData: () => ({ columnId: column.id }),
			canDrop: ({ source }) =>
				getDragDataString(source.data.type) === "task" && column.id !== "todo",
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: () => setIsDraggedOver(false),
		});
	}, [column.id]);

	return (
		<section
			ref={ref}
			className={cn(
				"flex min-h-[18rem] min-w-0 flex-col overflow-hidden border-b border-grayscale-4 bg-grayscale-1 transition-colors md:min-h-0 md:border-b-0",
				isDraggedOver && "bg-accent-2",
			)}
		>
			<header className="flex shrink-0 items-center justify-between gap-3 border-b border-grayscale-4 px-3 py-2">
				<div className="flex min-w-0 items-center gap-2">
					{column.icon}
					<h2 className="truncate text-sm font-medium text-grayscale-12">
						{column.title}
					</h2>
				</div>
				<NumberFlow
					value={tasks.length}
					className="font-mono text-[11px] font-semibold leading-none text-grayscale-10 tabular-nums"
				/>
			</header>
			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
				{tasks.length > 0 ? (
					tasks.map((task) => (
						<TaskCard
							key={task.id}
							task={task}
							href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
							showStart={column.id === "todo"}
							isMoving={movingTaskId === task.id}
							columnId={column.id}
							onStart={() => onStartTask(task.id)}
						/>
					))
				) : (
					<div className="flex min-h-28 flex-1 items-center justify-center border border-dashed border-grayscale-5 px-4 text-center text-xs text-grayscale-10">
						{column.empty}
					</div>
				)}
			</div>
		</section>
	);
}

function TaskCard({
	task,
	href,
	showStart,
	isMoving,
	columnId,
	onStart,
}: {
	task: Task;
	href: string;
	showStart: boolean;
	isMoving: boolean;
	columnId: TaskColumnId;
	onStart: () => void;
}) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const element = ref.current;

		if (!element) {
			return;
		}

		return combine(
			draggable({
				element,
				getInitialData: () => ({
					type: "task",
					taskId: task.id,
					columnId,
				}),
				onDragStart: () => setIsDragging(true),
				onDrop: () => setIsDragging(false),
			}),
		);
	}, [task.id, columnId]);

	const sessions = task.agentSessions ?? [];
	const status = toTaskDotStatus(task.status);

	return (
		<div
			ref={ref}
			className={cn(
				"group rounded-md border border-grayscale-4 bg-grayscale-1 p-3 shadow-sm shadow-grayscale-12/5 transition-all hover:border-grayscale-6",
				isDragging && "opacity-50",
				isMoving && "pointer-events-none opacity-60",
			)}
		>
			<div className="flex items-start gap-2">
				<DotsSixVerticalIcon className="mt-0.5 size-4 shrink-0 cursor-grab text-grayscale-8 group-active:cursor-grabbing" />
				<Link href={href} className="min-w-0 flex-1">
					<h3 className="truncate text-sm font-medium text-grayscale-12">
						{task.name}
					</h3>
					{task.instructions ? (
						<p className="mt-1 line-clamp-3 text-xs leading-5 text-grayscale-10">
							{task.instructions}
						</p>
					) : null}
				</Link>
			</div>
			<div className="mt-3 flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-1.5">
					{sessions.length > 0 ? (
						sessions
							.slice(0, 4)
							.map((session, index) => (
								<TaskStatusDots
									key={session.id}
									status={toTaskDotStatus(session.status)}
									label={`${session.name || `Session ${index + 1}`} status`}
								/>
							))
					) : (
						<TaskStatusDots status={status} />
					)}
				</div>
				{showStart ? (
					<Button
						type="button"
						variant="secondary"
						disabled={isMoving}
						onClick={onStart}
						className="h-7 px-2 text-[11px]"
					>
						<PlayCircleIcon weight="bold" className="size-3.5" />
						Start
					</Button>
				) : null}
			</div>
		</div>
	);
}

const getTaskColumnId = (task: Task): TaskColumnId => {
	if (
		task.completedAt ||
		task.status === "complete" ||
		task.status === "done"
	) {
		return "done";
	}

	if (task.status === "todo") {
		return "todo";
	}

	const hasStarted =
		(task.agentSessions?.length ?? 0) > 0 ||
		Boolean(task.sandboxId) ||
		Boolean(task.agentThreadId);

	return task.status === "in_progress" || hasStarted ? "in_progress" : "todo";
};

const compareTasks = (first: Task, second: Task) => {
	const firstTime = getTimestamp(first.createdAt);
	const secondTime = getTimestamp(second.createdAt);
	return secondTime - firstTime || first.name.localeCompare(second.name);
};

const getTimestamp = (value: string | number | Date | null | undefined) => {
	if (!value) {
		return 0;
	}

	const timestamp =
		value instanceof Date
			? value.getTime()
			: typeof value === "number"
				? value
				: new Date(value).getTime();

	return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getDragDataString = (value: unknown) =>
	typeof value === "string" ? value : undefined;

const isTaskColumnId = (value: unknown): value is TaskColumnId =>
	value === "todo" || value === "in_progress" || value === "done";
