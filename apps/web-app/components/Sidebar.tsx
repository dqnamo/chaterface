import type { InstaQLEntity } from "@instantdb/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { SidebarSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/helpers/classname-helper";
import CornerBrackets from "./CornerBrackets";

type Task = InstaQLEntity<AppSchema, "tasks">;

type SidebarProps = {
	onToggleCollapse: () => void;
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
				<div className="group relative">
          <Link
            href={`/${currentOrgHandle}/factories/${currentFactoryId}`}
            className="flex w-full min-w-0 flex-row items-center justify-between gap-4 bg-grayscale-12 p-2 pr-2 pl-3 transition-transform duration-150 group-hover:scale-97"
          >
            <CornerBrackets
              placement="outside"
              spacing={1}
              translate={1}
              color="var(--color-grayscale-12)"
            />
            <p className="min-w-0 truncate text-xs text-grayscale-2 transition-colors group-hover:text-grayscale-1">
              New Task
            </p>
            <p className="flex aspect-square size-5 shrink-0 items-center justify-center bg-grayscale-11/50 font-mono text-xs leading-none text-grayscale-8 uppercase">
              N
            </p>
          </Link>
        </div>
			</div>
			<div className="mt-2 flex flex-row items-center justify-between">
				<p className="px-3 font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
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
						task={task}
						selected={task.id === currentTaskId}
					/>
				))}
			</div>
		</div>
	);
}

const TaskSidebarItem = ({
	href,
	task,
	selected,
}: {
	href: string;
	task: Task;
	selected: boolean;
}) => {
	return (
		<Link
			key={task.id}
			href={href}
			className={cn(
				"group relative block truncate text-sm text-grayscale-11 hover:text-grayscale-12 transition-colors px-3 py-1.5 hover:bg-grayscale-2",
				selected ? "bg-grayscale-3" : "",
			)}
		>
			<CornerBrackets
				placement="inside"
				color={selected ? "accent-9" : "grayscale-8"}
				size={1.5}
				active={selected}
			/>
			{task.name}
		</Link>
	);
};
