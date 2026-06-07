"use client";

import { id } from "@instantdb/react";
import {
	ArrowsLeftRightIcon,
	CheckCircleIcon,
	FileCodeIcon,
	MinusCircleIcon,
	PencilSimpleIcon,
	PlusCircleIcon,
	SidebarSimpleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { type FileDiffMetadata, parsePatchFiles } from "@pierre/diffs";
import db from "@repo/db/client";
import { DateTime } from "luxon";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
} from "@/codex-options";
import CornerBrackets from "@/components/CornerBrackets";
import CornerCubes from "@/components/CornerCubes";
import Event, { buildTimeline } from "@/components/Event";
import { Textarea } from "@/components/Input";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { ExpandSidebarButton, useSidebar } from "@/components/SidebarContext";
import { Tabs } from "@/components/Tabs";
import { cn } from "@/helpers/classname-helper";

const MIN_PREVIEW_SIZE = 320;
const MAX_PREVIEW_SIZE = 720;
const DEFAULT_PREVIEW_SIZE = 480;
const DIFF_VIEW_STYLE = {
	"--diffs-font-family": "var(--font-jetbrains-mono)",
	"--diffs-header-font-family": "var(--font-jetbrains-mono)",
	"--diffs-font-size": "0.75rem",
	"--diffs-line-height": "1rem",
} as CSSProperties;
const DIFF_VIEW_OPTIONS = {
	diffStyle: "unified",
	hunkSeparators: "line-info-basic",
	overflow: "wrap",
	stickyHeader: true,
	theme: "pierre-light",
} as const;

const FileDiff = dynamic(
	() => import("@pierre/diffs/react").then((module) => module.FileDiff),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
				Loading changes...
			</div>
		),
	},
);

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

const serviceTx = (serviceId: string) => {
	const tx = db.tx.services[serviceId];

	if (!tx) {
		throw new Error(`Service transaction builder ${serviceId} not found`);
	}

	return tx;
};

const renderDiffHeader = (fileDiff: FileDiffMetadata) => {
	const additions = fileDiff.hunks.reduce(
		(total, hunk) => total + hunk.additionCount,
		0,
	);
	const deletions = fileDiff.hunks.reduce(
		(total, hunk) => total + hunk.deletionCount,
		0,
	);
	const Icon = getDiffHeaderIcon(fileDiff.type);
	const iconClassName = getDiffHeaderIconClassName(fileDiff.type);

	return (
		<div className="flex min-w-0 items-center justify-between gap-3 border-b border-grayscale-4 bg-grayscale-1 px-3 py-2 font-mono text-xs">
			<div className="flex min-w-0 items-center gap-2">
				<Icon weight="bold" className={`size-4 shrink-0 ${iconClassName}`} />
				<div className="flex min-w-0 items-center gap-1 text-grayscale-12">
					{fileDiff.prevName && fileDiff.prevName !== fileDiff.name ? (
						<>
							<span className="truncate text-grayscale-10">
								{fileDiff.prevName}
							</span>
							<ArrowsLeftRightIcon
								weight="bold"
								className="size-3 shrink-0 text-grayscale-9"
							/>
						</>
					) : null}
					<span className="truncate">{fileDiff.name}</span>
				</div>
			</div>
			{additions > 0 || deletions > 0 ? (
				<div className="flex shrink-0 items-center gap-2 text-[11px]">
					{additions > 0 ? (
						<span className="text-green-10">+{additions}</span>
					) : null}
					{deletions > 0 ? (
						<span className="text-red-10">-{deletions}</span>
					) : null}
				</div>
			) : null}
		</div>
	);
};

const getDiffHeaderIcon = (type: FileDiffMetadata["type"]) => {
	switch (type) {
		case "new":
			return PlusCircleIcon;
		case "deleted":
			return MinusCircleIcon;
		case "rename-changed":
		case "rename-pure":
			return ArrowsLeftRightIcon;
		case "change":
			return PencilSimpleIcon;
		default:
			return FileCodeIcon;
	}
};

const getDiffHeaderIconClassName = (type: FileDiffMetadata["type"]) => {
	switch (type) {
		case "new":
			return "text-green-9";
		case "deleted":
			return "text-red-9";
		case "rename-changed":
		case "rename-pure":
			return "text-blue-9";
		case "change":
			return "text-accent-9";
		default:
			return "text-grayscale-10";
	}
};

export default function TaskPage() {
	const { taskId } = useParams();
	const { user } = db.useAuth();
	const {
		isMobile,
		isRightCollapsed,
		collapseRight,
		expandRight,
		setHasRightPanel,
	} = useSidebar();
	const [message, setMessage] = useState("");
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);
	const [previewSize, setPreviewSize] = useState(DEFAULT_PREVIEW_SIZE);

	useEffect(() => {
		setHasRightPanel(true);

		return () => setHasRightPanel(false);
	}, [setHasRightPanel]);
	const [rightPanelTab, setRightPanelTab] = useState("services");
	const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
		null,
	);
	const [patchText, setPatchText] = useState<string | null>(null);
	const [isPatchLoading, setIsPatchLoading] = useState(false);
	const [patchError, setPatchError] = useState<string | null>(null);
	const diffFiles = useMemo<FileDiffMetadata[]>(() => {
		if (!patchText?.trim()) {
			return [];
		}

		return parsePatchFiles(patchText, `task-${taskId as string}`).flatMap(
			(patch) => patch.files,
		);
	}, [patchText, taskId]);

	const startPreviewResize = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (isRightCollapsed) {
			return;
		}

		event.preventDefault();
		const separator = event.currentTarget;
		const pointerId = event.pointerId;
		separator.setPointerCapture(pointerId);
		const startX = event.clientX;
		const startSize = previewSize;

		const handleMove = (moveEvent: PointerEvent) => {
			const nextSize = Math.min(
				MAX_PREVIEW_SIZE,
				Math.max(MIN_PREVIEW_SIZE, startSize + (startX - moveEvent.clientX)),
			);
			setPreviewSize(nextSize);
		};

		const stopResize = () => {
			separator.releasePointerCapture(pointerId);
			separator.removeEventListener("pointermove", handleMove);
			separator.removeEventListener("pointerup", stopResize);
		};

		separator.addEventListener("pointermove", handleMove);
		separator.addEventListener("pointerup", stopResize);
	};

	const { data, isLoading, error } = db.useQuery({
		tasks: {
			$: {
				where: {
					id: taskId as string,
				},
			},
			services: {},
		},
	});

	const {
		data: eventsData,
		canLoadNextPage,
		loadNextPage,
	} = db.useInfiniteQuery({
		events: {
			$: {
				where: {
					"task.id": taskId as string,
				},
				limit: 30,
				order: {
					serverCreatedAt: "desc",
				},
			},
		},
	});

	const task = data?.tasks?.[0];
	const events = eventsData?.events;
	const timeline = useMemo(() => buildTimeline(events ?? []), [events]);
	const services = task?.services ?? [];
	const selectedService =
		services.find((service) => service.id === selectedServiceId) ?? services[0];

	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const isPinnedToBottomRef = useRef(true);
	const isLoadingOlderRef = useRef(false);
	const previousScrollHeightRef = useRef(0);
	const hasInitialScrolledRef = useRef(false);

	const handleScroll = useCallback(() => {
		const container = scrollContainerRef.current;

		if (!container) {
			return;
		}

		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		isPinnedToBottomRef.current = distanceFromBottom < 80;

		if (
			container.scrollTop < 80 &&
			canLoadNextPage &&
			!isLoadingOlderRef.current
		) {
			isLoadingOlderRef.current = true;
			previousScrollHeightRef.current = container.scrollHeight;
			loadNextPage();
		}
	}, [canLoadNextPage, loadNextPage]);

	useLayoutEffect(() => {
		const container = scrollContainerRef.current;

		if (!container || timeline.length === 0) {
			return;
		}

		// First time we have messages, jump straight to the newest ones.
		if (!hasInitialScrolledRef.current) {
			container.scrollTop = container.scrollHeight;
			hasInitialScrolledRef.current = true;
			return;
		}

		// Older messages were just prepended; keep the viewport anchored so the
		// content the user was reading doesn't jump.
		if (isLoadingOlderRef.current) {
			const heightDelta =
				container.scrollHeight - previousScrollHeightRef.current;
			container.scrollTop += heightDelta;
			isLoadingOlderRef.current = false;
			return;
		}

		// New messages arrived while the user was at the bottom: follow along.
		if (isPinnedToBottomRef.current) {
			container.scrollTop = container.scrollHeight;
		}
	}, [timeline]);

	const stopService = async (serviceId: string) => {
		await db.transact(serviceTx(serviceId).delete());
	};

	useEffect(() => {
		if (!task) {
			return;
		}

		setAgentModel(task.agentModel ?? DEFAULT_CODEX_MODEL);
		setAgentReasoningEffort(
			task.agentReasoningEffort ?? DEFAULT_CODEX_REASONING_EFFORT,
		);
		setAgentSpeed(task.agentSpeed ?? DEFAULT_CODEX_SPEED);
	}, [task]);

	useEffect(() => {
		const firstService = services[0];

		if (!firstService) {
			setSelectedServiceId(null);
			return;
		}

		if (
			!selectedServiceId ||
			!services.some((service) => service.id === selectedServiceId)
		) {
			setSelectedServiceId(firstService.id);
		}
	}, [services, selectedServiceId]);

	useEffect(() => {
		if (!task?.latestDiffPath || !taskId || !user?.refresh_token) {
			setPatchText(null);
			setPatchError(null);
			setIsPatchLoading(false);
			return;
		}

		let cancelled = false;
		const diffVersion = task.latestDiffGeneratedAt ?? task.latestDiffPath;

		const loadPatch = async () => {
			setIsPatchLoading(true);
			setPatchError(null);

			try {
				const response = await fetch(
					`/api/tasks/${taskId as string}/diff?version=${encodeURIComponent(String(diffVersion))}`,
					{
						cache: "no-store",
						headers: {
							Authorization: `Bearer ${user.refresh_token}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error("Failed to load changes");
				}

				const nextPatchText = await response.text();

				if (!cancelled) {
					setPatchText(nextPatchText);
				}
			} catch (error) {
				if (!cancelled) {
					setPatchText(null);
					setPatchError(error instanceof Error ? error.message : String(error));
				}
			} finally {
				if (!cancelled) {
					setIsPatchLoading(false);
				}
			}
		};

		void loadPatch();

		return () => {
			cancelled = true;
		};
	}, [
		task?.latestDiffPath,
		task?.latestDiffGeneratedAt,
		taskId,
		user?.refresh_token,
	]);

	const sendMessage = async () => {
		if (!task) {
			return;
		}
		if (!message) {
			return;
		}

		isPinnedToBottomRef.current = true;
		setMessage("");

		await db.transact(
			taskTx(task.id).update({
				status: "in_progress",
				agentModel,
				agentReasoningEffort,
				agentSpeed,
			}),
		);

		const eventId = id();
		await db.transact(
			eventTx(eventId)
				.create({
					type: "factoryplane.new_user_message",
					data: { content: message },
					createdAt: DateTime.now().toISO(),
				})
				.link({ task: taskId as string }),
		);
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error.message}</div>;
	}

	return (
		<div className="flex h-full w-full overflow-hidden">
			<div className="flex h-full min-w-0 flex-1 flex-col">
				<div className="flex flex-row items-center justify-between p-1.5 border-b border-grayscale-4">
					<div className="flex flex-row items-center">
						<ExpandSidebarButton />
						<p className="text-sm text-grayscale-11 p-1">{task?.name}</p>
					</div>
					<div className="flex flex-row items-center">
						<div className="bg-grayscale-3 p-1.5 px-3 flex flex-row items-center gap-2 group relative hover:bg-green-3">
							<CornerBrackets
								placement="inside"
								spacing={1}
								translate={1.5}
								size={1.5}
								color="var(--color-green-9)"
							/>
							<CheckCircleIcon
								weight="bold"
								className="size-4 text-green-9 group-hover:hidden"
							/>
							<CheckCircleIcon
								weight="fill"
								className="size-4 text-green-9 group-hover:block hidden"
							/>
							<p className="text-xs text-grayscale-12">Mark as complete</p>
						</div>
						<AnimatePresence initial={false}>
							{!isMobile && isRightCollapsed && (
								<motion.button
									type="button"
									aria-label="Expand preview panel"
									onClick={expandRight}
									initial={{ width: 0, marginLeft: 0, opacity: 0 }}
									animate={{ width: 24, marginLeft: 6, opacity: 1 }}
									exit={{ width: 0, marginLeft: 0, opacity: 0 }}
									transition={{ type: "spring", stiffness: 500, damping: 40 }}
									className="flex h-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden group bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
								>
									<span className="flex size-6 shrink-0 items-center justify-center">
										<SidebarSimpleIcon
											weight="bold"
											className="-scale-x-100 text-grayscale-11 group-hover:text-grayscale-12"
										/>
									</span>
								</motion.button>
							)}
						</AnimatePresence>
					</div>
				</div>
				<div
					ref={scrollContainerRef}
					onScroll={handleScroll}
					className="flex h-full flex-col gap-4 overflow-y-auto"
				>
					<div className="flex flex-col p-4 max-w-3xl mx-auto w-full">
						{canLoadNextPage && (
							<button
								type="button"
								onClick={loadNextPage}
								className="mx-auto mb-2 text-xs text-grayscale-10 hover:text-grayscale-12"
							>
								Load earlier messages
							</button>
						)}
						<AnimatePresence initial={false}>
							{timeline.map((node) => (
								<Event key={node.key} node={node} />
							))}
						</AnimatePresence>
					</div>
				</div>
				<div className="flex flex-col pb-2 px-2">
					<div className="flex flex-col gap-2">
						<div className="flex flex-col max-w-3xl mx-auto w-full bg-white border border-grayscale-4 relative">
							<CornerCubes
								placement="outside"
								spacing={0.75}
								translate={3}
								size={1.5}
								color="var(--color-grayscale-6)"
								active={true}
							/>

							<div className="flex flex-col p-3 gap-3">
								<Textarea
									className="text-sm"
									placeholder="Task Instructions"
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									onSubmit={sendMessage}
								/>
							</div>
							<div className="flex flex-row items-center justify-between p-3">
								<div className="flex flex-row items-center justify-center gap-2">
									<ModelConfigMenu
										model={agentModel}
										reasoningEffort={agentReasoningEffort}
										speed={agentSpeed}
										onModelChange={setAgentModel}
										onReasoningEffortChange={setAgentReasoningEffort}
										onSpeedChange={setAgentSpeed}
									/>
								</div>
								<div className="flex flex-row items-center justify-center gap-2 ml-auto">
									<button
										type="button"
										onClick={sendMessage}
										className="shrink-0 relative group hover:scale-96 transition-transform duration-150 flex flex-row items-center justify-center gap-2 bg-grayscale-12 text-grayscale-1 text-xs font-medium px-3 py-1.5 overflow-visible"
									>
										<CornerBrackets
											placement="outside"
											spacing={1}
											translate={1.5}
											size={1.5}
											color="grayscale-12"
										/>
										Send Message
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{!isMobile && (
				<AnimatePresence initial={false}>
					{!isRightCollapsed && (
						<motion.div
							aria-label="Resize chat and service preview"
							onPointerDown={startPreviewResize}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="w-px shrink-0 cursor-col-resize bg-grayscale-4 transition-colors hover:bg-accent-8"
						/>
					)}
				</AnimatePresence>
			)}
			<AnimatePresence>
				{isMobile && !isRightCollapsed && (
					<motion.button
						type="button"
						aria-label="Close preview panel"
						onClick={collapseRight}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-40 bg-grayscale-12/30"
					/>
				)}
			</AnimatePresence>
			<motion.div
				className={cn(
					"relative flex shrink-0 flex-col",
					isMobile && "fixed inset-y-0 right-0 z-50 w-full bg-grayscale-1",
				)}
				style={isMobile ? undefined : { width: previewSize }}
				initial={false}
				animate={
					isMobile
						? { x: isRightCollapsed ? "100%" : "0%" }
						: { marginRight: isRightCollapsed ? -previewSize : 0 }
				}
				transition={{ type: "spring", stiffness: 420, damping: 42 }}
			>
				<Tabs.Root
					value={rightPanelTab}
					onValueChange={(value) => {
						if (value != null) {
							setRightPanelTab(String(value));
						}
					}}
					className="flex-1"
				>
					<div className="flex flex-row items-center gap-1.5 p-1.5 border-b border-grayscale-4">
						<Tabs.List>
							<Tabs.Tab value="services">Services</Tabs.Tab>
							<Tabs.Tab value="changes">Changes</Tabs.Tab>
							<Tabs.Indicator />
						</Tabs.List>
						<button
							type="button"
							aria-label="Collapse preview panel"
							onClick={collapseRight}
							className="ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center group bg-grayscale-2 transition-colors duration-150 hover:bg-grayscale-3"
						>
							<SidebarSimpleIcon
								weight="bold"
								className="-scale-x-100 text-grayscale-11 group-hover:text-grayscale-12"
							/>
						</button>
					</div>
					<Tabs.Panel value="services" className="flex min-h-0 flex-1 flex-col">
						{services.length > 0 ? (
							<Tabs.Root
								value={selectedService?.id ?? null}
								onValueChange={(value) => {
									setSelectedServiceId(value == null ? null : String(value));
								}}
								className="flex-1"
							>
								<Tabs.List className="border-b border-grayscale-4 p-1.5">
									{services.map((service) => (
										<Tabs.Tab key={service.id} value={service.id}>
											{service.name}
										</Tabs.Tab>
									))}
									<Tabs.Indicator />
								</Tabs.List>
								<div className="p-2 border-b border-grayscale-4 flex flex-row items-center justify-between">
									<p className="text-xs text-grayscale-10 truncate">
										{selectedService?.command ?? "No command"}
									</p>
									<button
										type="button"
										className="bg-grayscale-3 shrink-0 p-1.5 px-3 flex flex-row items-center gap-2 group relative hover:bg-red-3"
										onClick={() => {
											if (selectedService) {
												stopService(selectedService.id);
											}
										}}
									>
										<CornerBrackets
											placement="inside"
											spacing={1}
											translate={1.5}
											size={1.5}
											color="var(--color-red-9)"
										/>
										<XCircleIcon
											weight="bold"
											className="size-4 text-red-9 group-hover:hidden"
										/>
										<XCircleIcon
											weight="fill"
											className="size-4 text-red-9 group-hover:block hidden"
										/>
										<p className="text-xs text-grayscale-12">Stop service</p>
									</button>
								</div>
								<div className="min-h-0 flex-1">
									{services.map((service) => (
										<Tabs.Panel
											key={service.id}
											value={service.id}
											className="h-full"
										>
											{service.url ? (
												<iframe
													src={service.url}
													title={`${service.name} preview`}
													className="h-full w-full"
												/>
											) : (
												<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
													Selected service has no preview URL
												</div>
											)}
										</Tabs.Panel>
									))}
								</div>
							</Tabs.Root>
						) : (
							<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
								<div className="flex flex-col items-center justify-center gap-px p-8">
									<p className="text-sm text-grayscale-12">
										No services running
									</p>
									<p className="text-xs text-grayscale-10 max-w-sm text-center">
										The agent can start dev servers for you to preview here.
									</p>
								</div>
							</div>
						)}
					</Tabs.Panel>
					<Tabs.Panel
						value="changes"
						className="flex min-h-0 flex-1 overflow-auto bg-grayscale-1"
					>
						{isPatchLoading ? (
							<div className="flex h-full flex-1 items-center justify-center text-xs text-grayscale-10">
								Loading changes...
							</div>
						) : patchError ? (
							<div className="flex h-full flex-1 items-center justify-center text-xs text-grayscale-10">
								<div className="flex flex-col items-center justify-center gap-px p-8">
									<p className="text-sm text-red-9">Unable to load changes</p>
									<p className="max-w-sm text-center text-xs text-grayscale-10">
										{patchError}
									</p>
								</div>
							</div>
						) : diffFiles.length > 0 ? (
							<div className="flex min-w-full flex-col">
								{diffFiles.map((fileDiff, index) => (
									<FileDiff
										key={fileDiff.cacheKey ?? `${fileDiff.name}-${index}`}
										fileDiff={fileDiff}
										style={DIFF_VIEW_STYLE}
										options={DIFF_VIEW_OPTIONS}
										renderCustomHeader={renderDiffHeader}
									/>
								))}
							</div>
						) : (
							<div className="flex h-full flex-1 items-center justify-center text-xs text-grayscale-10">
								<div className="flex flex-col items-center justify-center gap-px p-8">
									<p className="text-sm text-grayscale-12">No changes yet</p>
									<p className="text-xs text-grayscale-10 max-w-sm text-center">
										The agent has not made any file changes here yet.
									</p>
								</div>
							</div>
						)}
					</Tabs.Panel>
				</Tabs.Root>
			</motion.div>
		</div>
	);
}
