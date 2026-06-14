"use client";

import type { InstaQLEntity } from "@instantdb/react";
import NumberFlow from "@number-flow/react";
import { ArrowRightIcon, MinusCircleIcon } from "@phosphor-icons/react";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type Task = InstaQLEntity<AppSchema, "tasks">;

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

export default function CompletedTasksPage() {
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;

	const { data } = db.useQuery({
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});

	const completedTasks = (data?.tasks ?? [])
		.filter((task) => task.completedAt)
		.sort(compareCompletedTasks);

	return (
		<div className="relative flex h-full w-full flex-col overflow-hidden">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<div className="flex min-h-0 flex-1 flex-col px-4 py-14 md:px-8">
				<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
					<header className="flex flex-col gap-2">
						<div className="flex items-end justify-between gap-4">
							<div className="min-w-0">
								<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
									Completed Tasks
								</p>
								<h1 className="mt-2 text-2xl font-medium text-grayscale-12">
									Done
								</h1>
							</div>
							<NumberFlow
								value={completedTasks.length}
								className="font-mono text-2xl leading-none font-semibold text-grayscale-12 tabular-nums"
							/>
						</div>
					</header>

					{completedTasks.length > 0 ? (
						<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-grayscale-4 bg-grayscale-1">
							<div className="flex items-center justify-between border-grayscale-4 border-b px-3 py-2 font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
								<span>Task</span>
								<span>Completed</span>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								{completedTasks.map((task) => (
									<CompletedTaskRow
										key={task.id}
										task={task}
										href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
									/>
								))}
							</div>
						</div>
					) : (
						<div className="flex flex-1 items-center justify-center rounded-lg border border-grayscale-4 border-dashed bg-grayscale-1 px-6 py-12 text-center">
							<div className="max-w-sm">
								<h2 className="text-sm font-medium text-grayscale-12">
									No completed tasks
								</h2>
								<p className="mt-1 text-sm text-grayscale-10">
									Tasks marked complete will appear here.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function CompletedTaskRow({ task, href }: { task: Task; href: string }) {
	const uncompleteTask = async () => {
		await db.transact(
			taskTx(task.id).update({
				completedAt: undefined,
				status: "idle",
			}),
		);
	};

	return (
		<div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-grayscale-3 border-b px-3 py-2 last:border-b-0 hover:bg-grayscale-2">
			<Link
				href={href}
				className="flex min-w-0 items-center gap-2 text-sm text-grayscale-12"
			>
				<span className="min-w-0 truncate">{task.name}</span>
				<ArrowRightIcon className="size-3 shrink-0 text-grayscale-8 opacity-0 transition-opacity group-hover:opacity-100" />
			</Link>
			<div className="flex items-center gap-2">
				<p className="hidden font-mono text-[11px] leading-none text-grayscale-10 tabular-nums sm:block">
					{formatTaskDate(task.completedAt)}
				</p>
				<Button
					type="button"
					variant="secondary"
					onClick={uncompleteTask}
					className={cn(
						"h-7 px-2 text-[11px]",
						"border-transparent bg-transparent text-grayscale-10 hover:border-grayscale-5 hover:bg-grayscale-1 hover:text-grayscale-12",
					)}
				>
					<MinusCircleIcon weight="bold" className="size-3.5" />
					<span>Uncomplete</span>
				</Button>
			</div>
		</div>
	);
}

const compareCompletedTasks = (first: Task, second: Task) =>
	getTimestamp(second.completedAt) - getTimestamp(first.completedAt);

const getTimestamp = (value: Task["completedAt"]) =>
	value ? new Date(value).getTime() : 0;

const formatTaskDate = (value: Task["completedAt"]) => {
	if (!value) {
		return "";
	}

	const dateTime = DateTime.fromJSDate(new Date(value));

	return dateTime.isValid ? dateTime.toFormat("LLL d, yyyy") : "";
};
