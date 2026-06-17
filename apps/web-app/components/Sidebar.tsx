import { type InstaQLEntity, id } from "@instantdb/react";
import NumberFlow from "@number-flow/react";
import {
	BuildingsIcon,
	CheckIcon,
	GearSixIcon,
	HeadCircuitIcon,
	MinusCircleIcon,
	PlusCircleIcon,
	SignOutIcon,
	TerminalWindowIcon,
	UsersIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/helpers/classname-helper";
import {
	toAgentSessionDotStatus,
	toTaskDotStatus,
} from "@/helpers/task-status-helper";
import { formatWorkspaceHandle } from "@/helpers/workspace-handle-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";
import { Button } from "./Button";
import { ContextMenu } from "./ContextMenu";
import CornerBrackets from "./CornerBrackets";
import { Dialog } from "./Dialog";
import { Input } from "./Input";
import { Menu } from "./Menu";
import Monogram from "./Monogram";
import { NewTaskDialog } from "./NewTaskDialog";
import { PersonalSettingsContent } from "./PersonalSettings";
import { ScrollArea } from "./ScrollArea";
import { useSidebar } from "./SidebarContext";
import { getUserProfileDisplayName, TaskPresenceAvatars } from "./TaskPresence";
import TaskStatusDots from "./TaskStatusDots";
import { WorkspaceSettingsContent } from "./WorkspaceSettings";

type AgentSession = Pick<
	InstaQLEntity<AppSchema, "agentSessions">,
	"id" | "name" | "status"
>;

type Task = InstaQLEntity<AppSchema, "tasks"> & {
	agentSessions?: AgentSession[];
};

type Workspace = Pick<
	InstaQLEntity<AppSchema, "workspaces">,
	"id" | "name" | "handle"
> & {
	tasks?: Task[];
	members?: Array<{
		user?: Pick<InstaQLEntity<AppSchema, "$users">, "id" | "name">;
		name?: string;
	}>;
};

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
	}

	return tx;
};

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

const ACTIVE_TASK_STATUS_RANKS = {
	failed: 0,
	idle: 1,
	in_progress: 2,
} as const;

const getActiveTaskStatusRank = (status: Task["status"]) =>
	status && status in ACTIVE_TASK_STATUS_RANKS
		? ACTIVE_TASK_STATUS_RANKS[status as keyof typeof ACTIVE_TASK_STATUS_RANKS]
		: ACTIVE_TASK_STATUS_RANKS.idle;

const isActiveTask = (task: Task) => {
	if (
		task.completedAt ||
		task.status === "complete" ||
		task.status === "done" ||
		task.status === "todo"
	) {
		return false;
	}

	return (
		task.status === "in_progress" ||
		(task.agentSessions?.length ?? 0) > 0 ||
		Boolean(task.sandboxId) ||
		Boolean(task.agentThreadId)
	);
};

const compareActiveTaskEntries = (
	first: { task: Task; index: number },
	second: { task: Task; index: number },
) => {
	const rankDelta =
		getActiveTaskStatusRank(first.task.status) -
		getActiveTaskStatusRank(second.task.status);

	return rankDelta || first.index - second.index;
};

export default function Sidebar() {
	const { workspaceHandle, taskId } = useParams();
	const pathname = usePathname();
	const { user } = db.useAuth();
	const { isMobile, collapse } = useSidebar();
	const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
	const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
	const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
	const currentWorkspaceHandle =
		typeof workspaceHandle === "string" ? workspaceHandle : "";
	const currentTaskId = typeof taskId === "string" ? taskId : "";
	const currentUserId = user?.id ?? "__unauthenticated__";
	const closeAfterMobileNavigation = useCallback(() => {
		if (isMobile) {
			collapse();
		}
	}, [collapse, isMobile]);

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			tasks: {
				agentSessions: {},
			},
			members: {
				user: {},
			},
		},
	});
	const { data: switcherData } = db.useQuery({
		workspaces: {
			$: {
				where: {
					"members.user.id": currentUserId,
				},
			},
		},
	});
	const currentWorkspace = data?.workspaces?.[0] as Workspace | undefined;
	const tasks = currentWorkspace?.tasks ?? [];
	const workspaces = useMemo(
		() =>
			[...((switcherData?.workspaces ?? []) as Workspace[])].sort(
				(firstWorkspace, secondWorkspace) =>
					firstWorkspace.name.localeCompare(secondWorkspace.name),
			),
		[switcherData?.workspaces],
	);
	const activeTasks = useMemo(
		() =>
			tasks
				.map((task, index) => ({ task, index }))
				.filter(({ task }) => isActiveTask(task))
				.sort(compareActiveTaskEntries)
				.map(({ task }) => task),
		[tasks],
	);
	const settingsHref = `/${currentWorkspaceHandle}/settings`;
	const humansHref = `/${currentWorkspaceHandle}/humans`;
	const agentsHref = `/${currentWorkspaceHandle}/agents`;
	const isSettingsSelected = pathname.startsWith(settingsHref);
	const isHumansSelected = pathname.startsWith(humansHref);
	const isAgentsSelected = pathname.startsWith(agentsHref);
	const openNewTask = useCallback(() => {
		setIsNewTaskOpen(true);
		closeAfterMobileNavigation();
	}, [closeAfterMobileNavigation]);
	const openAccountSettings = useCallback(() => {
		setIsAccountSettingsOpen(true);
		closeAfterMobileNavigation();
	}, [closeAfterMobileNavigation]);
	const openWorkspaceSettings = useCallback(() => {
		setIsWorkspaceSettingsOpen(true);
		closeAfterMobileNavigation();
	}, [closeAfterMobileNavigation]);

	useHotkeys(
		"n",
		openNewTask,
		{
			description: "New task",
			preventDefault: true,
		},
		[openNewTask],
	);

	return (
		<>
			<ScrollArea.Root className="h-full w-full min-w-0 max-w-full">
				<ScrollArea.Viewport>
					<ScrollArea.Content className="flex min-h-full w-full min-w-0 max-w-full flex-col gap-2 px-2 py-2">
						<div className="sticky top-0 z-20 mb-1 flex min-w-0 max-w-full flex-row items-start bg-grayscale-1 pb-1">
							<WorkspaceSwitcher
								workspaces={workspaces}
								currentWorkspace={currentWorkspace}
								currentWorkspaceHandle={currentWorkspaceHandle}
								onNavigate={closeAfterMobileNavigation}
								onOpenWorkspaceSettings={openWorkspaceSettings}
							/>
						</div>
						<div className="min-w-0 max-w-full">
							<Link
								href={settingsHref}
								onClick={closeAfterMobileNavigation}
								className={cn(
									"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
									isSettingsSelected ? "bg-grayscale-3" : "",
								)}
							>
								<CornerBrackets
									placement="inside"
									color={isSettingsSelected ? "accent-9" : "grayscale-8"}
									size={6}
									active={isSettingsSelected}
								/>
								<TerminalWindowIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">
									Agent Environment
								</span>
							</Link>
							<Link
								href={humansHref}
								onClick={closeAfterMobileNavigation}
								className={cn(
									"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
									isHumansSelected ? "bg-grayscale-3" : "",
								)}
							>
								<CornerBrackets
									placement="inside"
									color={isHumansSelected ? "accent-9" : "grayscale-8"}
									size={6}
									active={isHumansSelected}
								/>
								<UsersIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">Humans</span>
							</Link>
							<Link
								href={agentsHref}
								onClick={closeAfterMobileNavigation}
								className={cn(
									"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
									isAgentsSelected ? "bg-grayscale-3" : "",
								)}
							>
								<CornerBrackets
									placement="inside"
									color={isAgentsSelected ? "accent-9" : "grayscale-8"}
									size={6}
									active={isAgentsSelected}
								/>
								<HeadCircuitIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">Agents</span>
							</Link>
							<div className="mt-2">
								<Button
									type="button"
									onClick={openNewTask}
									aria-keyshortcuts="N"
									className="w-full"
									shortcut="N"
								>
									<PlusCircleIcon weight="bold" className="size-4 shrink-0" />
									<p className="min-w-0 flex-1 truncate text-current">
										New Task
									</p>
								</Button>
							</div>
						</div>
						<div className="mt-2 flex flex-row items-center justify-between px-3">
							<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
								Active Tasks
							</p>
							<NumberFlow
								value={activeTasks.length}
								className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase tabular-nums"
							/>
						</div>
						<div className="flex min-w-0 max-w-full flex-col gap-px">
							<AnimatePresence initial={false} mode="popLayout">
								{activeTasks.map((task) => (
									<motion.div
										key={task.id}
										layout="position"
										initial={{ opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -4 }}
										transition={{ duration: 0.18, ease: "easeOut" }}
									>
										<TaskSidebarItem
											href={`/${currentWorkspaceHandle}/tasks/${task.id}`}
											fallbackHref={`/${currentWorkspaceHandle}`}
											task={task}
											selected={task.id === currentTaskId}
											onNavigate={closeAfterMobileNavigation}
										/>
									</motion.div>
								))}
							</AnimatePresence>
						</div>
						<div className="sticky bottom-0 z-10 mt-auto bg-grayscale-1 pt-2">
							<UserSidebarMenu
								currentWorkspace={currentWorkspace}
								currentUserId={currentUserId}
								onOpenAccountSettings={openAccountSettings}
							/>
						</div>
					</ScrollArea.Content>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar>
					<ScrollArea.Thumb />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>
			<NewTaskDialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen} />
			<Dialog.Root
				open={isAccountSettingsOpen}
				onOpenChange={setIsAccountSettingsOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-hidden">
						<Dialog.Title className="sr-only">Account Settings</Dialog.Title>
						<Dialog.Description className="sr-only">
							Manage your personal settings.
						</Dialog.Description>
						<div className="overflow-y-auto p-4 md:p-6">
							<PersonalSettingsContent />
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
			<Dialog.Root
				open={isWorkspaceSettingsOpen}
				onOpenChange={setIsWorkspaceSettingsOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-hidden">
						<Dialog.Title className="sr-only">Workspace Settings</Dialog.Title>
						<Dialog.Description className="sr-only">
							Manage workspace details.
						</Dialog.Description>
						<div className="overflow-y-auto p-4 md:p-6">
							<WorkspaceSettingsContent />
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}

const UserSidebarMenu = ({
	currentWorkspace,
	currentUserId,
	onOpenAccountSettings,
}: {
	currentWorkspace: Workspace | undefined;
	currentUserId: string;
	onOpenAccountSettings: () => void;
}) => {
	const { user } = db.useAuth();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const member = currentWorkspace?.members?.find(
		(member) => member.user?.id === currentUserId,
	);
	const userRecord = member?.user;
	const displayName = getUserProfileDisplayName({
		memberName: member?.name,
		userName: userRecord?.name,
		email: user?.email ?? undefined,
		fallback: "Account",
	});
	const displayDetail = user?.email ?? "Signed in";

	const signOut = async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			await db.auth.signOut();
		} catch (error) {
			console.error("Failed to sign out", {
				error: error instanceof Error ? error.message : String(error),
			});
			setIsSigningOut(false);
		}
	};

	return (
		<Menu.Root>
			<Menu.Trigger className="w-full min-w-0 rounded-md border-0 bg-transparent px-1.5 py-1 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2">
				<Monogram seed={displayName} letters={1} className="size-7 shrink-0" />
				<span className="flex min-w-0 flex-1 flex-col text-left">
					<span className="truncate text-sm leading-tight text-grayscale-12">
						{displayName}
					</span>
					<span className="truncate text-[11px] leading-tight text-grayscale-10">
						{displayDetail}
					</span>
				</span>
				<Menu.TriggerIcon />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="start" side="top" sideOffset={8}>
					<Menu.Popup className="w-72 max-w-[calc(100vw-1rem)]">
						<div className="flex min-w-0 items-center gap-2 px-3 py-2">
							<Monogram
								seed={displayName}
								letters={1}
								className="size-8 shrink-0"
							/>
							<div className="flex min-w-0 flex-col">
								<p className="truncate text-sm font-medium text-grayscale-12">
									{displayName}
								</p>
								<p className="truncate text-xs text-grayscale-10">
									{displayDetail}
								</p>
							</div>
						</div>
						<Menu.Separator />
						<Menu.Item onClick={onOpenAccountSettings}>
							<GearSixIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">Account settings</span>
						</Menu.Item>
						<Menu.Item
							disabled={isSigningOut}
							onClick={() => {
								void signOut();
							}}
						>
							<SignOutIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">
								{isSigningOut ? "Signing out..." : "Sign out"}
							</span>
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};

const WorkspaceSwitcher = ({
	workspaces,
	currentWorkspace,
	currentWorkspaceHandle,
	onNavigate,
	onOpenWorkspaceSettings,
}: {
	workspaces: Workspace[];
	currentWorkspace: Workspace | undefined;
	currentWorkspaceHandle: string;
	onNavigate: () => void;
	onOpenWorkspaceSettings: () => void;
}) => {
	const router = useRouter();
	const { user } = db.useAuth();
	const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
	const [workspaceName, setWorkspaceName] = useState("");
	const [workspaceHandle, setWorkspaceHandle] = useState("");
	const triggerSeed = currentWorkspace?.name ?? currentWorkspaceHandle;

	const updateWorkspaceName = (nextName: string) => {
		const previousGeneratedHandle = formatWorkspaceHandle(workspaceName);

		setWorkspaceName(nextName);
		setWorkspaceHandle((currentHandle) =>
			currentHandle === previousGeneratedHandle
				? formatWorkspaceHandle(nextName)
				: currentHandle,
		);
	};

	const updateWorkspaceHandle = (nextHandle: string) => {
		setWorkspaceHandle(formatWorkspaceHandle(nextHandle));
	};

	const navigateTo = (href: string) => {
		router.push(href);
		onNavigate();
	};

	const createWorkspace = async () => {
		const nextName = workspaceName.trim();
		const nextHandle = formatWorkspaceHandle(workspaceHandle);

		if (!user?.id || !nextName || !nextHandle) {
			return;
		}

		const workspaceId = id();
		await db.transact([
			workspaceTx(workspaceId).create({
				name: nextName,
				handle: nextHandle,
				createdAt: DateTime.now().toISO(),
			}),
			memberTx(id())
				.update({
					createdAt: DateTime.now().toISO(),
					joinedAt: DateTime.now().toISO(),
					role: "owner",
				})
				.link({ workspace: workspaceId, user: user.id }),
		]);

		setWorkspaceName("");
		setWorkspaceHandle("");
		setCreateWorkspaceOpen(false);
		navigateTo(`/${nextHandle}`);
	};

	return (
		<>
			<Menu.Root>
				<Menu.Trigger className="w-full min-w-0 rounded-md border-0 bg-transparent px-1.5 py-1 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2">
					<Monogram
						seed={triggerSeed}
						letters={1}
						className="size-7 shrink-0"
					/>
					<span className="flex min-w-0 flex-1 flex-col text-left">
						<span className="truncate text-sm leading-tight text-grayscale-12">
							{currentWorkspace?.name ?? "Workspaces"}
						</span>
						<span className="truncate text-[11px] leading-tight text-grayscale-10">
							/{currentWorkspaceHandle}
						</span>
					</span>
					<Menu.TriggerIcon />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="start" sideOffset={8}>
						<Menu.Popup className="max-h-[min(34rem,calc(100vh-1rem))] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto">
							<div className="flex flex-col gap-0.5 px-3 py-2">
								<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
									Switch workspace
								</p>
							</div>
							<Menu.Separator />
							{workspaces.length ? (
								workspaces.map((workspace) => {
									const selected = workspace.handle === currentWorkspaceHandle;

									return (
										<Menu.Item
											key={workspace.id}
											onClick={() => navigateTo(`/${workspace.handle}`)}
											className={cn(
												"items-start py-2",
												selected ? "bg-grayscale-2 text-grayscale-12" : "",
											)}
										>
											<BuildingsIcon
												weight="bold"
												className="mt-0.5 size-4 shrink-0"
											/>
											<span className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="truncate text-xs font-medium">
													{workspace.name}
												</span>
												<span className="truncate font-mono text-[11px] text-grayscale-10">
													/{workspace.handle}
												</span>
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
									<span className="min-w-0 flex-1 truncate">No workspaces</span>
								</Menu.Item>
							)}
							<Menu.Separator />
							<Menu.Item
								disabled={!currentWorkspace}
								onClick={onOpenWorkspaceSettings}
							>
								<GearSixIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">
									Workspace settings
								</span>
							</Menu.Item>
							<Menu.Item onClick={() => setCreateWorkspaceOpen(true)}>
								<PlusCircleIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">New workspace</span>
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
			<Dialog.Root
				open={createWorkspaceOpen}
				onOpenChange={setCreateWorkspaceOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								void createWorkspace().catch((error) => {
									console.error("Failed to create workspace", {
										error:
											error instanceof Error ? error.message : String(error),
									});
								});
							}}
						>
							<div className="flex flex-col p-3 gap-3">
								<div className="flex flex-col">
									<Dialog.Title>Create Workspace</Dialog.Title>
									<Dialog.Description>
										Create a new workspace.
									</Dialog.Description>
								</div>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Name</p>
								<Input
									type="text"
									placeholder="Workspace Name"
									value={workspaceName}
									onChange={(event) => updateWorkspaceName(event.target.value)}
								/>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Handle</p>
								<Input
									type="text"
									placeholder="Workspace Handle"
									value={workspaceHandle}
									onChange={(event) =>
										updateWorkspaceHandle(event.target.value)
									}
								/>
							</div>
							<div className="flex flex-row items-center justify-end gap-2 p-3">
								<Dialog.Close>Cancel</Dialog.Close>
								<Button
									type="submit"
									disabled={!workspaceName.trim() || !workspaceHandle}
								>
									Create
								</Button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</>
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
	const agentSessions = task.agentSessions ?? [];

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
							"group relative flex flex-col gap-1 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
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
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="min-w-0 flex-1 truncate">{task.name}</span>
					{isCompleted ? null : (
						<div className="flex shrink-0 flex-row items-center gap-1.5 overflow-hidden">
							{agentSessions.length > 0 ? (
								agentSessions.map((session, index) => (
									<TaskStatusDots
										key={session.id}
										status={toAgentSessionDotStatus(
											task.status,
											session.status,
										)}
										label={`${session.name || `Session ${index + 1}`} status`}
									/>
								))
							) : (
								<TaskStatusDots status={status} />
							)}
						</div>
					)}
				</div>
				{isCompleted ? null : (
					<TaskPresenceAvatars
						taskId={task.id}
						limit={3}
						avatarSizeClassName="size-4"
					/>
				)}
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
