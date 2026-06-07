import type { InstaQLEntity } from "@instantdb/react";
import {
	CheckIcon,
	SidebarSimpleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/helpers/classname-helper";
import { toTaskDotStatus } from "@/helpers/task-status-helper";
import { ContextMenu } from "./ContextMenu";
import CornerBrackets from "./CornerBrackets";
import TaskStatusDots from "./TaskStatusDots";

type Task = InstaQLEntity<AppSchema, "tasks">;

type SidebarProps = {
	onToggleCollapse: () => void;
};

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

export default function Sidebar({ onToggleCollapse }: SidebarProps) {
	const { orgHandle, factoryId, taskId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const currentTaskId = taskId as string;

	const { data } = db.useQuery({
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});
	return (
		<div className="flex h-full w-full flex-col gap-2 overflow-y-auto px-2 py-2">
			<div>
				<div className="mb-4 flex flex-row items-center justify-between">
					<button
						type="button"
						aria-label="Collapse sidebar"
						onClick={onToggleCollapse}
						className="ml-auto flex size-6 cursor-pointer items-center justify-center bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
					>
						<SidebarSimpleIcon weight="bold" />
					</button>
				</div>
				<Link
					href={`/${currentOrgHandle}/factories/${currentFactoryId}`}
					className="group relative flex w-full min-w-0 overflow-visible"
				>
					<span className="relative flex w-full min-w-0 flex-row items-center justify-between gap-4 overflow-visible bg-black p-2 pr-2 pl-3 transition-transform duration-150 group-hover:scale-96">
						<CornerBrackets
							placement="outside"
							spacing={1}
							translate={1.5}
							color="black"
						/>
						<p className="min-w-0 truncate text-sm text-grayscale-2 transition-colors group-hover:text-grayscale-1">
							New Task
						</p>
						<p className="flex aspect-square size-5 shrink-0 items-center justify-center bg-grayscale-11/50 font-mono text-xs leading-none text-grayscale-8 uppercase">
							N
						</p>
					</span>
				</Link>
			</div>
			<div className="mt-2 flex flex-row items-center justify-between px-3">
				<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
					Tasks
				</p>
				<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
					{data?.tasks?.length}
				</p>
			</div>
			<div className="flex flex-col gap-px">
				{data?.tasks?.map((task) => (
					<TaskSidebarItem
						key={task.id}
						href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
						fallbackHref={`/${currentOrgHandle}/factories/${currentFactoryId}`}
						task={task}
						selected={task.id === currentTaskId}
					/>
				))}
			</div>
		</div>
	);
}

const TaskSidebarItem = ({
	fallbackHref,
	href,
	task,
	selected,
}: {
	fallbackHref: string;
	href: string;
	task: Task;
	selected: boolean;
}) => {
	const router = useRouter();
	const status = toTaskDotStatus(task.status);
	const isCompleted = Boolean(task.completedAt);

	const markComplete = async () => {
		if (isCompleted) {
			return;
		}

		await db.transact(
			taskTx(task.id).update({
				completedAt: DateTime.now().toISO(),
				status: "idle",
			}),
		);
	};

	const deleteTask = async () => {
		await db.transact(taskTx(task.id).delete());

		if (selected) {
			router.push(fallbackHref);
		}
	};

	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger
				render={
					<Link
						key={task.id}
						href={href}
						className={cn(
							"group relative flex items-center gap-2.5 px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
							selected ? "bg-grayscale-3" : "",
							isCompleted ? "text-grayscale-9" : "",
						)}
					/>
				}
			>
				<CornerBrackets
					placement="inside"
					color={selected ? "accent-9" : "grayscale-8"}
					size={1.5}
					active={selected}
				/>
				<span
					className={cn(
						"min-w-0 flex-1 truncate",
						isCompleted ? "line-through decoration-grayscale-8" : "",
					)}
				>
					{task.name}
				</span>
				<TaskStatusDots status={status} />
			</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Positioner>
					<ContextMenu.Popup>
						<ContextMenu.Item onClick={markComplete} disabled={isCompleted}>
							<CheckIcon size={14} weight="bold" className="shrink-0" />
							<span>Mark complete</span>
						</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item
							onClick={deleteTask}
							cornerColor="var(--color-red-9)"
							cornerClassName="group-data-[highlighted]:opacity-100 group-data-[highlighted]:translate-x-0 group-data-[highlighted]:translate-y-0"
							className="text-grayscale-12 data-[highlighted]:bg-red-3"
						>
							<XCircleIcon
								weight="bold"
								className="size-4 shrink-0 text-red-9 group-data-[highlighted]:hidden"
							/>
							<XCircleIcon
								weight="fill"
								className="hidden size-4 shrink-0 text-red-9 group-data-[highlighted]:block"
							/>
							<span>Delete</span>
						</ContextMenu.Item>
					</ContextMenu.Popup>
				</ContextMenu.Positioner>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
};
