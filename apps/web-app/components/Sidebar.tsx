import type { InstaQLEntity } from "@instantdb/react";
import {
	BuildingsIcon,
	CaretDownIcon,
	CaretRightIcon,
	CheckIcon,
	FadersHorizontalIcon,
	MinusCircleIcon,
	ShapesIcon,
	SidebarSimpleIcon,
	UserCircleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { DateTime } from "luxon";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/helpers/classname-helper";
import { toTaskDotStatus } from "@/helpers/task-status-helper";
import { ContextMenu } from "./ContextMenu";
import CornerBrackets from "./CornerBrackets";
import { Menu } from "./Menu";
import Monogram from "./Monogram";
import { useSidebar } from "./SidebarContext";
import TaskStatusDots from "./TaskStatusDots";

type Task = InstaQLEntity<AppSchema, "tasks">;
type Factory = Pick<InstaQLEntity<AppSchema, "factories">, "id" | "name">;
type Organisation = Pick<
	InstaQLEntity<AppSchema, "organisations">,
	"id" | "name" | "handle"
> & {
	factories?: Factory[];
};

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
	const router = useRouter();
	const { orgHandle, factoryId, taskId } = useParams();
	const pathname = usePathname();
	const { isMobile, collapse } = useSidebar();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const currentTaskId = taskId as string;
	const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
	const closeAfterMobileNavigation = useCallback(() => {
		if (isMobile) {
			collapse();
		}
	}, [collapse, isMobile]);

	const { data } = db.useQuery({
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});
	const { data: switcherData } = db.useQuery({
		organisations: {
			factories: {},
		},
	});
	const tasks = data?.tasks ?? [];
	const organisations = useMemo(
		() =>
			(switcherData?.organisations ?? [])
				.map((organisation) => ({
					id: organisation.id,
					name: organisation.name,
					handle: organisation.handle,
					factories: [...(organisation.factories ?? [])]
						.map((factory) => ({
							id: factory.id,
							name: factory.name,
						}))
						.sort((firstFactory, secondFactory) =>
							firstFactory.name.localeCompare(secondFactory.name),
						),
				}))
				.sort((firstOrganisation, secondOrganisation) =>
					firstOrganisation.name.localeCompare(secondOrganisation.name),
				),
		[switcherData?.organisations],
	);
	const { activeTasks, completedTasks } = useMemo(
		() => ({
			activeTasks: tasks.filter((task) => !task.completedAt),
			completedTasks: tasks.filter((task) => task.completedAt),
		}),
		[tasks],
	);
	const settingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/settings`;
	const personalSettingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/personal-settings`;
	const newTaskHref = `/${currentOrgHandle}/factories/${currentFactoryId}`;
	const organisationSettingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/organisation/settings`;
	const isSettingsSelected = pathname.startsWith(settingsHref);
	const isPersonalSettingsSelected = pathname.startsWith(personalSettingsHref);
	const isOrganisationSettingsSelected = pathname.startsWith(
		organisationSettingsHref,
	);
	const navigateToNewTask = useCallback(() => {
		router.push(newTaskHref);
		closeAfterMobileNavigation();
	}, [closeAfterMobileNavigation, newTaskHref, router]);

	useHotkeys(
		"n",
		navigateToNewTask,
		{
			description: "New task",
			preventDefault: true,
		},
		[navigateToNewTask],
	);

	return (
		<div className="flex h-full w-full flex-col gap-2 overflow-y-auto px-2 py-2">
			<div>
				<div className="mb-4 flex flex-row items-center justify-between gap-2">
					<FactorySwitcher
						organisations={organisations}
						currentOrgHandle={currentOrgHandle}
						currentFactoryId={currentFactoryId}
						onNavigate={closeAfterMobileNavigation}
					/>
					<button
						type="button"
						aria-label="Collapse sidebar"
						onClick={onToggleCollapse}
						className="flex size-6 shrink-0 cursor-pointer items-center justify-center bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
					>
						<SidebarSimpleIcon weight="bold" />
					</button>
				</div>
				<Link
					href={settingsHref}
					onClick={closeAfterMobileNavigation}
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
					<span className="min-w-0 flex-1 truncate">Factory Settings</span>
				</Link>
				<Link
					href={personalSettingsHref}
					onClick={closeAfterMobileNavigation}
					className={cn(
						"group relative flex items-center gap-2.5 px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
						isPersonalSettingsSelected ? "bg-grayscale-3" : "",
					)}
				>
					<CornerBrackets
						placement="inside"
						color={isPersonalSettingsSelected ? "accent-9" : "grayscale-8"}
						size={6}
						active={isPersonalSettingsSelected}
					/>
					<UserCircleIcon weight="bold" className="size-4 shrink-0" />
					<span className="min-w-0 flex-1 truncate">Personal Settings</span>
				</Link>
				<Link
					href={organisationSettingsHref}
					onClick={closeAfterMobileNavigation}
					className={cn(
						"group relative flex items-center gap-2.5 px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
						isOrganisationSettingsSelected ? "bg-grayscale-3" : "",
					)}
				>
					<CornerBrackets
						placement="inside"
						color={isOrganisationSettingsSelected ? "accent-9" : "grayscale-8"}
						size={6}
						active={isOrganisationSettingsSelected}
					/>
					<BuildingsIcon weight="bold" className="size-4 shrink-0" />
					<span className="min-w-0 flex-1 truncate">Organisation Settings</span>
				</Link>
				<div className="p-1.5 mt-2">
					<Link
						href={newTaskHref}
						onClick={closeAfterMobileNavigation}
						aria-keyshortcuts="N"
						className="group relative flex w-full min-w-0 overflow-visible"
					>
						<span className="relative flex w-full min-w-0 flex-row items-center justify-between gap-4 overflow-visible bg-grayscale-12 p-2 pr-2 pl-3 ">
							<CornerBrackets
								placement="outside"
								spacing={4}
								translate={4}
								color="grayscale-12"
							/>
							<p className="min-w-0 truncate text-sm text-grayscale-2 transition-colors group-hover:text-grayscale-1">
								New Task
							</p>
							<p className="hidden aspect-square size-5 shrink-0 items-center justify-center bg-grayscale-11/50 font-mono text-xs leading-none text-grayscale-8 uppercase sm:flex">
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
						onNavigate={closeAfterMobileNavigation}
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
								onNavigate={closeAfterMobileNavigation}
							/>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}

const FactorySwitcher = ({
	organisations,
	currentOrgHandle,
	currentFactoryId,
	onNavigate,
}: {
	organisations: Organisation[];
	currentOrgHandle: string;
	currentFactoryId: string;
	onNavigate: () => void;
}) => {
	const router = useRouter();
	const currentOrganisation = organisations.find(
		(organisation) => organisation.handle === currentOrgHandle,
	);
	const currentFactory = currentOrganisation?.factories?.find(
		(factory) => factory.id === currentFactoryId,
	);
	const triggerSeed =
		currentFactory?.name ?? currentOrganisation?.name ?? currentOrgHandle;

	const navigateTo = (href: string) => {
		router.push(href);
		onNavigate();
	};

	return (
		<Menu.Root>
			<Menu.Trigger className="min-w-0 flex-1 border-0 bg-transparent px-1.5 py-1 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2">
				<Monogram
					seed={triggerSeed}
					letters={currentFactory ? 2 : 1}
					className="size-7 shrink-0"
				/>
				<span className="flex min-w-0 flex-1 flex-col text-left">
					<span className="truncate text-sm leading-tight text-grayscale-12">
						{currentFactory?.name ?? currentOrganisation?.name ?? "Factories"}
					</span>
					<span className="truncate text-[11px] leading-tight text-grayscale-10">
						{currentOrganisation?.name ?? currentOrgHandle}
					</span>
				</span>
				<Menu.TriggerIcon />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="start" sideOffset={8}>
					<Menu.Popup className="w-72 max-w-[calc(100vw-1rem)]">
						<Menu.Item onClick={() => navigateTo("/")}>
							<BuildingsIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">All organisations</span>
						</Menu.Item>
						<Menu.Separator />
						{organisations.map((organisation) => (
							<Menu.Group key={organisation.id}>
								<Menu.GroupLabel className="truncate">
									{organisation.name}
								</Menu.GroupLabel>
								<Menu.Item
									onClick={() =>
										navigateTo(`/${organisation.handle}/factories`)
									}
									className={cn(
										organisation.handle === currentOrgHandle && !currentFactory
											? "bg-grayscale-2 text-grayscale-12"
											: "",
									)}
								>
									<BuildingsIcon weight="bold" className="size-4 shrink-0" />
									<span className="min-w-0 flex-1 truncate">Factories</span>
									{organisation.handle === currentOrgHandle &&
									!currentFactory ? (
										<CheckIcon
											size={14}
											weight="bold"
											className="shrink-0 text-accent-9"
										/>
									) : null}
								</Menu.Item>
								{organisation.factories?.length ? (
									organisation.factories.map((factory) => {
										const selected =
											organisation.handle === currentOrgHandle &&
											factory.id === currentFactoryId;

										return (
											<Menu.Item
												key={factory.id}
												onClick={() =>
													navigateTo(
														`/${organisation.handle}/factories/${factory.id}`,
													)
												}
												className={cn(
													selected ? "bg-grayscale-2 text-grayscale-12" : "",
												)}
											>
												<ShapesIcon weight="bold" className="size-4 shrink-0" />
												<span className="min-w-0 flex-1 truncate">
													{factory.name}
												</span>
												{selected ? (
													<CheckIcon
														size={14}
														weight="bold"
														className="shrink-0 text-accent-9"
													/>
												) : null}
											</Menu.Item>
										);
									})
								) : (
									<Menu.Item disabled={true} className="text-grayscale-9">
										<span className="min-w-0 flex-1 truncate">
											No factories
										</span>
									</Menu.Item>
								)}
								<Menu.Separator />
							</Menu.Group>
						))}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};

const TaskSidebarItem = ({
	fallbackHref,
	href,
	task,
	selected,
	onNavigate,
}: {
	fallbackHref: string;
	href: string;
	task: Task;
	selected: boolean;
	onNavigate: () => void;
}) => {
	const router = useRouter();
	const status = toTaskDotStatus(task.status);
	const isCompleted = Boolean(task.completedAt);

	const toggleCompletion = async () => {
		await db.transact(
			taskTx(task.id).update({
				completedAt: isCompleted ? undefined : DateTime.now().toISO(),
				status: isCompleted ? "idle" : "complete",
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
						onClick={onNavigate}
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
						<ContextMenu.Item onClick={toggleCompletion}>
							{isCompleted ? (
								<MinusCircleIcon size={14} weight="bold" className="shrink-0" />
							) : (
								<CheckIcon size={14} weight="bold" className="shrink-0" />
							)}
							<span>{isCompleted ? "Uncomplete task" : "Mark complete"}</span>
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
