import type { InstaQLEntity } from "@instantdb/react";
import {
	CaretDownIcon,
	CaretRightIcon,
	CheckIcon,
	FadersHorizontalIcon,
	SidebarSimpleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/helpers/classname-helper";
import { toTaskDotStatus } from "@/helpers/task-status-helper";
import { ContextMenu } from "./ContextMenu";
import CornerBrackets from "./CornerBrackets";
import TaskStatusDots from "./TaskStatusDots";

import { Button } from "./Button";

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
	const pathname = usePathname();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const currentTaskId = taskId as string;
	const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

	const { data } = db.useQuery({
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});
	const tasks = data?.tasks ?? [];
	const { activeTasks, completedTasks } = useMemo(
		() => ({
			activeTasks: tasks.filter((task) => !task.completedAt),
			completedTasks: tasks.filter((task) => task.completedAt),
		}),
		[tasks],
	);
	const settingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/settings`;
	const isSettingsSelected = pathname.startsWith(settingsHref);

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
					href={settingsHref}
					className={cn(
						"group relative flex items-center gap-2.5 px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
						isSettingsSelected ? "bg-grayscale-3" : "",
					)}
				>
					<CornerBrackets
						placement="inside"
						color={isSettingsSelected ? "accent-9" : "grayscale-8"}
						size={6}
						active={isSettingsSelected}
					/>
					<FadersHorizontalIcon weight="bold" className="size-4 shrink-0" />
					<span className="min-w-0 flex-1 truncate">Settings</span>
				</Link>
				<div className="p-1.5 mt-2">
          <Link
            href={`/${currentOrgHandle}/factories/${currentFactoryId}`}
            className="group relative flex w-full min-w-0 overflow-visible"
          >
            <span className="relative flex w-full min-w-0 flex-row items-center justify-between gap-4 overflow-visible bg-grayscale-12 p-2 pr-2 pl-3 ">
              <CornerBrackets
                placement="outside"
                spacing={4}
                translate={4}
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
			</div>
			<div className="mt-2 flex flex-row items-center justify-between px-3">
				<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
					Tasks
				</p>
				<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
					{activeTasks.length}
				</p>
			</div>
			<div className="flex flex-col gap-px">
				{activeTasks.map((task) => (
					<TaskSidebarItem
						key={task.id}
						href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
						fallbackHref={`/${currentOrgHandle}/factories/${currentFactoryId}`}
						task={task}
						selected={task.id === currentTaskId}
					/>
				))}
			</div>
			<div className="mt-2 flex flex-col gap-px">
				<button
					type="button"
					onClick={() => setIsCompletedExpanded((expanded) => !expanded)}
					className="flex w-full items-center justify-between gap-2 px-3 py-1 text-left font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase transition-colors hover:text-grayscale-12"
				>
					<span className="flex min-w-0 items-center gap-1.5">
						<span className="truncate">Completed Tasks</span>
						{isCompletedExpanded ? (
							<CaretDownIcon weight="bold" className="size-3 shrink-0" />
						) : (
							<CaretRightIcon weight="bold" className="size-3 shrink-0" />
						)}
					</span>
					<span>{completedTasks.length}</span>
				</button>
				{isCompletedExpanded ? (
					<div className="flex flex-col gap-px">
						{completedTasks.map((task) => (
							<TaskSidebarItem
								key={task.id}
								href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
								fallbackHref={`/${currentOrgHandle}/factories/${currentFactoryId}`}
								task={task}
								selected={task.id === currentTaskId}
							/>
						))}
					</div>
				) : null}
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
				status: "complete",
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
					size={6}
					active={selected}
				/>
				<span className="min-w-0 flex-1 truncate">{task.name}</span>
				{isCompleted ? null : <TaskStatusDots status={status} />}
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
