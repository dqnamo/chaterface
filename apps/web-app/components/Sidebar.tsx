import { type InstaQLEntity, id } from "@instantdb/react";
import NumberFlow from "@number-flow/react";
import {
	BuildingsIcon,
	CheckCircleIcon,
	CheckIcon,
	FadersHorizontalIcon,
	KanbanIcon,
	MinusCircleIcon,
	PlusCircleIcon,
	ShapesIcon,
	SidebarSimpleIcon,
	UserCircleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { DateTime } from "luxon";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/helpers/classname-helper";
import { toTaskDotStatus } from "@/helpers/task-status-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";
import { Button } from "./Button";
import { ContextMenu } from "./ContextMenu";
import CornerBrackets from "./CornerBrackets";
import { Dialog } from "./Dialog";
import { Input } from "./Input";
import { Menu } from "./Menu";
import Monogram from "./Monogram";
import { ScrollArea } from "./ScrollArea";
import { useSidebar } from "./SidebarContext";
import TaskStatusDots from "./TaskStatusDots";

type AgentSession = Pick<
	InstaQLEntity<AppSchema, "agentSessions">,
	"id" | "name" | "status"
>;
type Task = InstaQLEntity<AppSchema, "tasks"> & {
	agentSessions?: AgentSession[];
};
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

const organisationTx = (organisationId: string) => {
	const tx = db.tx.organisations[organisationId];

	if (!tx) {
		throw new Error(
			`Organisation transaction builder ${organisationId} not found`,
		);
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

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
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

const compareActiveTaskEntries = (
	first: { task: Task; index: number },
	second: { task: Task; index: number },
) => {
	const rankDelta =
		getActiveTaskStatusRank(first.task.status) -
		getActiveTaskStatusRank(second.task.status);

	return rankDelta || first.index - second.index;
};

export default function Sidebar({ onToggleCollapse }: SidebarProps) {
	const router = useRouter();
	const { orgHandle, factoryId, taskId } = useParams();
	const pathname = usePathname();
	const { isMobile, collapse } = useSidebar();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const currentTaskId = taskId as string;
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
			agentSessions: {},
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
			activeTasks: tasks
				.map((task, index) => ({ task, index }))
				.filter(({ task }) => !task.completedAt)
				.sort(compareActiveTaskEntries)
				.map(({ task }) => task),
			completedTasks: tasks.filter((task) => task.completedAt),
		}),
		[tasks],
	);
	const settingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/settings`;
	const personalSettingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/personal-settings`;
	const tasksHref = `/${currentOrgHandle}/factories/${currentFactoryId}/tasks`;
	const newTaskHref = tasksHref;
	const floorHref = `/${currentOrgHandle}/factories/${currentFactoryId}/floor`;
	const completedTasksHref = `/${currentOrgHandle}/factories/${currentFactoryId}/completed-tasks`;
	const organisationSettingsHref = `/${currentOrgHandle}/factories/${currentFactoryId}/organisation/settings`;
	const isSettingsSelected = pathname.startsWith(settingsHref);
	const isPersonalSettingsSelected = pathname.startsWith(personalSettingsHref);
	const isTasksSelected =
		pathname === tasksHref || pathname.startsWith(`${tasksHref}/`);
	const isFloorSelected = pathname === floorHref;
	const isCompletedTasksSelected = pathname === completedTasksHref;
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
		<ScrollArea.Root className="h-full w-full min-w-0 max-w-full">
			<ScrollArea.Viewport>
				<ScrollArea.Content className="flex min-h-full w-full min-w-0 max-w-full flex-col gap-2 px-2 py-2">
					<div className="sticky top-0 z-20 mb-2 flex min-w-0 max-w-full flex-row items-start justify-between gap-2 bg-grayscale-1 pb-2">
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
							className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
						>
							<SidebarSimpleIcon weight="bold" />
						</button>
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
							<FadersHorizontalIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">Factory Settings</span>
						</Link>
						<Link
							href={personalSettingsHref}
							onClick={closeAfterMobileNavigation}
							className={cn(
								"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
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
							href={floorHref}
							onClick={closeAfterMobileNavigation}
							className={cn(
								"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
								isFloorSelected ? "bg-grayscale-3" : "",
							)}
						>
							<CornerBrackets
								placement="inside"
								color={isFloorSelected ? "accent-9" : "grayscale-8"}
								size={6}
								active={isFloorSelected}
							/>
							<ShapesIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">Factory</span>
						</Link>
						<Link
							href={organisationSettingsHref}
							onClick={closeAfterMobileNavigation}
							className={cn(
								"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
								isOrganisationSettingsSelected ? "bg-grayscale-3" : "",
							)}
						>
							<CornerBrackets
								placement="inside"
								color={
									isOrganisationSettingsSelected ? "accent-9" : "grayscale-8"
								}
								size={6}
								active={isOrganisationSettingsSelected}
							/>
							<BuildingsIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">
								Organisation Settings
							</span>
						</Link>
						<div className="mt-2">
							<Button
								render={
									<Link href={tasksHref} onClick={closeAfterMobileNavigation} />
								}
								nativeButton={false}
								aria-keyshortcuts="N"
								className="w-full"
								shortcut="N"
							>
								<PlusCircleIcon weight="bold" className="size-4 shrink-0" />
								<p className="min-w-0 flex-1 truncate text-current">New Task</p>
							</Button>
						</div>
						<Link
							href={tasksHref}
							onClick={closeAfterMobileNavigation}
							className={cn(
								"group relative mt-2 flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
								isTasksSelected ? "bg-grayscale-3" : "",
							)}
						>
							<CornerBrackets
								placement="inside"
								color={isTasksSelected ? "accent-9" : "grayscale-8"}
								size={6}
								active={isTasksSelected}
							/>
							<KanbanIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">Tasks</span>
							<NumberFlow
								value={activeTasks.length}
								className="shrink-0 font-mono text-[11px] leading-none font-semibold text-grayscale-10 tabular-nums"
							/>
						</Link>
						<Link
							href={completedTasksHref}
							onClick={closeAfterMobileNavigation}
							className={cn(
								"group relative mt-2 flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
								isCompletedTasksSelected ? "bg-grayscale-3" : "",
							)}
						>
							<CornerBrackets
								placement="inside"
								color={isCompletedTasksSelected ? "accent-9" : "grayscale-8"}
								size={6}
								active={isCompletedTasksSelected}
							/>
							<CheckCircleIcon weight="bold" className="size-4 shrink-0" />
							<span className="min-w-0 flex-1 truncate">Completed Tasks</span>
							<NumberFlow
								value={completedTasks.length}
								className="shrink-0 font-mono text-[11px] leading-none font-semibold text-grayscale-10 tabular-nums"
							/>
						</Link>
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
										href={`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${task.id}`}
										fallbackHref={`/${currentOrgHandle}/factories/${currentFactoryId}`}
										task={task}
										selected={task.id === currentTaskId}
										onNavigate={closeAfterMobileNavigation}
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</ScrollArea.Content>
			</ScrollArea.Viewport>
			<ScrollArea.Scrollbar>
				<ScrollArea.Thumb />
			</ScrollArea.Scrollbar>
		</ScrollArea.Root>
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
	const { user } = db.useAuth();
	const [createOrganisationOpen, setCreateOrganisationOpen] = useState(false);
	const [createFactoryOrganisation, setCreateFactoryOrganisation] =
		useState<Organisation>();
	const [organisationName, setOrganisationName] = useState("");
	const [organisationHandle, setOrganisationHandle] = useState("");
	const [factoryName, setFactoryName] = useState("");
	const [githubAccessToken, setGithubAccessToken] = useState("");
	const [gitAuthorName, setGitAuthorName] = useState("");
	const [gitAuthorEmail, setGitAuthorEmail] = useState("");
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

	const createOrganisation = async () => {
		if (!user?.id) {
			return;
		}

		const organisationId = id();
		await db.transact([
			organisationTx(organisationId).create({
				name: organisationName,
				handle: organisationHandle,
				createdAt: DateTime.now().toISO(),
			}),
			memberTx(id())
				.update({
					createdAt: DateTime.now().toISO(),
					joinedAt: DateTime.now().toISO(),
					role: "owner",
				})
				.link({ organisation: organisationId, user: user.id }),
		]);

		const nextHandle = organisationHandle;
		setOrganisationName("");
		setOrganisationHandle("");
		setCreateOrganisationOpen(false);
		navigateTo(`/${nextHandle}/factories`);
	};

	const createFactory = async () => {
		if (!createFactoryOrganisation || !user?.id) {
			return;
		}

		const factoryId = id();
		const trimmedGithubAccessToken = githubAccessToken.trim();

		await db.transact(
			factoryTx(factoryId)
				.create({
					name: factoryName,
					createdAt: DateTime.now().toISO(),
					gitAuthorName: gitAuthorName.trim() || undefined,
					gitAuthorEmail: gitAuthorEmail.trim() || undefined,
				})
				.link({ organisation: createFactoryOrganisation.id }),
		);

		if (trimmedGithubAccessToken) {
			const response = await fetch("/api/factories/saveGithub", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					factoryId,
					githubAccessToken: trimmedGithubAccessToken,
					gitAuthorName: gitAuthorName.trim(),
					gitAuthorEmail: gitAuthorEmail.trim(),
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to save GitHub credentials: ${response.status}`,
				);
			}
		}

		const nextOrgHandle = createFactoryOrganisation.handle;
		setFactoryName("");
		setGithubAccessToken("");
		setGitAuthorName("");
		setGitAuthorEmail("");
		setCreateFactoryOrganisation(undefined);
		navigateTo(`/${nextOrgHandle}/factories/${factoryId}`);
	};

	return (
		<>
			<Menu.Root>
				<Menu.Trigger className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-1.5 py-1 hover:bg-grayscale-2 data-[popup-open]:bg-grayscale-2">
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
						<Menu.Popup className="max-h-[min(34rem,calc(100vh-1rem))] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto">
							<div className="flex flex-col gap-0.5 px-3 py-2">
								<p className="font-mono text-[11px] leading-none font-semibold text-grayscale-10 uppercase">
									Switch context
								</p>
								<p className="truncate text-xs text-grayscale-11">
									Factories and organisations
								</p>
							</div>
							<Menu.Separator />
							{organisations.length ? (
								organisations.map((organisation, organisationIndex) => {
									const organisationSelected =
										organisation.handle === currentOrgHandle;

									return (
										<Menu.Group key={organisation.id}>
											<Menu.Item
												onClick={() =>
													navigateTo(`/${organisation.handle}/factories`)
												}
												className={cn(
													"items-start py-2",
													organisationSelected
														? "bg-grayscale-2 text-grayscale-12"
														: "",
												)}
											>
												<BuildingsIcon
													weight="bold"
													className="mt-0.5 size-4 shrink-0"
												/>
												<span className="flex min-w-0 flex-1 flex-col gap-0.5">
													<span className="truncate text-xs font-medium">
														{organisation.name}
													</span>
													<span className="truncate font-mono text-[11px] text-grayscale-10">
														/{organisation.handle}
														{organisationSelected ? " - current org" : ""}
													</span>
												</span>
											</Menu.Item>
											{organisation.factories?.length ? (
												organisation.factories.map((factory) => {
													const selected =
														organisationSelected &&
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
																"ml-6 mr-1",
																selected
																	? "bg-grayscale-2 text-grayscale-12"
																	: "",
															)}
														>
															<ShapesIcon
																weight="bold"
																className="size-4 shrink-0"
															/>
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
												<Menu.Item
													disabled={true}
													className="ml-6 mr-1 text-grayscale-9"
												>
													<span className="min-w-0 flex-1 truncate">
														No factories
													</span>
												</Menu.Item>
											)}
											{organisationIndex < organisations.length - 1 ? (
												<Menu.Separator />
											) : null}
										</Menu.Group>
									);
								})
							) : (
								<Menu.Item disabled={true} className="text-grayscale-9">
									<span className="min-w-0 flex-1 truncate">
										No organisations
									</span>
								</Menu.Item>
							)}
							<Menu.Separator />
							<Menu.Item
								disabled={!currentOrganisation}
								onClick={() => {
									if (currentOrganisation) {
										setCreateFactoryOrganisation(currentOrganisation);
									}
								}}
							>
								<ShapesIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">New factory</span>
							</Menu.Item>
							<Menu.Item onClick={() => setCreateOrganisationOpen(true)}>
								<BuildingsIcon weight="bold" className="size-4 shrink-0" />
								<span className="min-w-0 flex-1 truncate">
									New organisation
								</span>
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>
			<Dialog.Root
				open={createOrganisationOpen}
				onOpenChange={setCreateOrganisationOpen}
			>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								void createOrganisation().catch((error) => {
									console.error("Failed to create organisation", {
										error:
											error instanceof Error ? error.message : String(error),
									});
								});
							}}
						>
							<div className="flex flex-col p-3 gap-3">
								<div className="flex flex-col">
									<Dialog.Title>Create Organisation</Dialog.Title>
									<Dialog.Description>
										Create a new organisation to manage factories.
									</Dialog.Description>
								</div>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Name</p>
								<Input
									type="text"
									placeholder="Organisation Name"
									value={organisationName}
									onChange={(event) => setOrganisationName(event.target.value)}
								/>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Handle</p>
								<Input
									type="text"
									placeholder="Organisation Handle"
									value={organisationHandle}
									onChange={(event) =>
										setOrganisationHandle(event.target.value)
									}
								/>
							</div>
							<div className="flex flex-row items-center justify-end gap-2 p-3">
								<Dialog.Close>Cancel</Dialog.Close>
								<button
									type="submit"
									className="relative group hover:scale-96 transition-transform duration-150 flex flex-row items-center justify-center gap-2 bg-grayscale-12 text-grayscale-1 text-xs font-medium px-3 py-1.5 overflow-visible"
								>
									<CornerBrackets
										placement="outside"
										spacing={4}
										translate={6}
										size={6}
										color="grayscale-12"
									/>
									Create
								</button>
							</div>
						</form>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
			<Dialog.Root
				open={Boolean(createFactoryOrganisation)}
				onOpenChange={(open) => {
					if (!open) {
						setCreateFactoryOrganisation(undefined);
					}
				}}
			>
				<Dialog.Portal>
					<Dialog.Backdrop />
					<Dialog.Popup>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								void createFactory().catch((error) => {
									console.error("Failed to create factory", {
										error:
											error instanceof Error ? error.message : String(error),
									});
								});
							}}
						>
							<div className="flex flex-col p-3 gap-3">
								<div className="flex flex-col">
									<Dialog.Title>Create Factory</Dialog.Title>
									<Dialog.Description>
										Set up a new factory for{" "}
										{createFactoryOrganisation?.name ?? "this organisation"}.
									</Dialog.Description>
								</div>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Name</p>
								<Input
									type="text"
									placeholder="Factory Name"
									value={factoryName}
									onChange={(event) => setFactoryName(event.target.value)}
								/>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">GitHub Access Token</p>
								<Input
									type="text"
									placeholder="GitHub Access Token"
									value={githubAccessToken}
									onChange={(event) => setGithubAccessToken(event.target.value)}
								/>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Git Author Name</p>
								<Input
									type="text"
									placeholder="Git Author Name"
									value={gitAuthorName}
									onChange={(event) => setGitAuthorName(event.target.value)}
								/>
							</div>
							<div className="flex flex-col p-3 gap-3">
								<p className="text-xs text-grayscale-11">Git Author Email</p>
								<Input
									type="email"
									placeholder="Git Author Email"
									value={gitAuthorEmail}
									onChange={(event) => setGitAuthorEmail(event.target.value)}
								/>
							</div>
							<div className="flex flex-row items-center justify-end gap-2 p-3">
								<Dialog.Close>Cancel</Dialog.Close>
								<button
									type="submit"
									className="relative group hover:scale-96 transition-transform duration-150 flex flex-row items-center justify-center gap-2 bg-grayscale-12 text-grayscale-1 text-xs font-medium px-3 py-1.5 overflow-visible"
								>
									<CornerBrackets
										placement="outside"
										spacing={4}
										translate={6}
										size={6}
										color="grayscale-12"
									/>
									Create
								</button>
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
							"group relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
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
				{isCompleted ? null : (
					<span className="flex shrink-0 flex-row items-center gap-1.5 overflow-hidden">
						{agentSessions.length > 0 ? (
							agentSessions.map((session, index) => (
								<TaskStatusDots
									key={session.id}
									status={toTaskDotStatus(session.status)}
									label={`${session.name || `Session ${index + 1}`} status`}
								/>
							))
						) : (
							<TaskStatusDots status={status} />
						)}
					</span>
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
