"use client";

import { id } from "@instantdb/react";
import {
	ArrowSquareOutIcon,
	ArrowsLeftRightIcon,
	CheckCircleIcon,
	CornersOutIcon,
	FileCodeIcon,
	GitPullRequestIcon,
	MinusCircleIcon,
	PencilSimpleIcon,
	PlayCircleIcon,
	PlusCircleIcon,
	SidebarSimpleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { type FileDiffMetadata, parsePatchFiles } from "@pierre/diffs";
import { DateTime } from "luxon";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	type CSSProperties,
	type ClipboardEvent as ReactClipboardEvent,
	type DragEvent as ReactDragEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
} from "@/codex-options";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import Event, {
	buildTimeline,
	type TimelineNode,
	type UserDisplayProfile,
} from "@/components/Event";
import {
	getAttachmentFiles,
	hasAttachmentFiles,
	ImageAttachments,
	useImageAttachments,
} from "@/components/ImageAttachments";
import { Textarea } from "@/components/Input";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { ScrollArea } from "@/components/ScrollArea";
import { Select } from "@/components/Select";
import { ServicePreviewFrame } from "@/components/ServicePreviewFrame";
import { ExpandSidebarButton, useSidebar } from "@/components/SidebarContext";
import { Tabs } from "@/components/Tabs";
import {
	getTaskPresenceProfile,
	getUserProfileDisplayName,
	TaskPresenceAvatars,
	TaskPresenceTypingIndicator,
	useTaskTypingPresence,
} from "@/components/TaskPresence";
import TaskStatusDots from "@/components/TaskStatusDots";
import {
	type ChatViewMode,
	DEFAULT_CHAT_VIEW_MODE,
	getStoredDefaultChatViewMode,
} from "@/helpers/chat-view-helper";
import { cn } from "@/helpers/classname-helper";
import { getPublicServiceUrl } from "@/helpers/service-preview-url-helper";
import { toAgentSessionDotStatus } from "@/helpers/task-status-helper";
import db from "@/instant.client";

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
type JsonRecord = Record<string, unknown>;

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
const TerminalSessionLive = dynamic(
	() =>
		import("@/components/TerminalSessionLive").then(
			(module) => module.TerminalSessionLive,
		),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-full items-center justify-center text-xs text-grayscale-10">
				Loading terminal...
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

const agentSessionTx = (agentSessionId: string) => {
	const tx = db.tx.agentSessions[agentSessionId];

	if (!tx) {
		throw new Error(
			`Agent session transaction builder ${agentSessionId} not found`,
		);
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

const isMinifiedTimelineNode = (node: TimelineNode) => {
	const type = node.event.type ?? "";

	if (
		type === "factoryplane.new_task" ||
		type === "factoryplane.new_user_message" ||
		type === "codex.thread.started" ||
		type === "codex.turn.started" ||
		type === "codex.turn.completed" ||
		type.startsWith("factoryplane.setup_step_")
	) {
		return true;
	}

	if (!type.startsWith("codex.item.")) {
		return false;
	}

	const data = asJsonRecord(node.event.data);
	const item = asJsonRecord(data?.item);

	return item?.type === "agent_message";
};

const asJsonRecord = (value: unknown): JsonRecord | null => {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as JsonRecord;
	}

	return null;
};

const getEntityId = (value: unknown) => {
	const id = asJsonRecord(value)?.id;
	return typeof id === "string" ? id : undefined;
};

const getOptionalString = (value: unknown) =>
	typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;

const getAuthUserDisplayProfile = (
	user: unknown,
): UserDisplayProfile | undefined => {
	const record = asJsonRecord(user);
	const id = getOptionalString(record?.id);

	if (!id) {
		return undefined;
	}

	return {
		id,
		email: getOptionalString(record?.email),
		userName: getOptionalString(record?.name),
	};
};

const buildUserDisplayProfiles = (
	task: unknown,
	authUser: unknown,
): Record<string, UserDisplayProfile> => {
	const profiles: Record<string, UserDisplayProfile> = {};
	const authProfile = getAuthUserDisplayProfile(authUser);

	if (authProfile) {
		profiles[authProfile.id] = authProfile;
	}

	const workspace = asJsonRecord(asJsonRecord(task)?.workspace);
	const members = workspace?.members;

	if (!Array.isArray(members)) {
		return profiles;
	}

	for (const memberValue of members) {
		const member = asJsonRecord(memberValue);
		const memberUser = asJsonRecord(member?.user);
		const userId = getOptionalString(memberUser?.id);

		if (!userId) {
			continue;
		}

		profiles[userId] = {
			id: userId,
			email: getOptionalString(memberUser?.email),
			memberName: getOptionalString(member?.name),
			userName: getOptionalString(memberUser?.name),
		};
	}

	return profiles;
};

const compareAgentSessions = (
	first: { createdAt?: string | number | Date | null },
	second: { createdAt?: string | number | Date | null },
) => getTimestamp(first.createdAt) - getTimestamp(second.createdAt);

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
	const [isSendingMessage, setIsSendingMessage] = useState(false);
	const [isStartingTask, setIsStartingTask] = useState(false);
	const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);
	const [previewSize, setPreviewSize] = useState(DEFAULT_PREVIEW_SIZE);
	const [chatViewMode, setChatViewMode] = useState<ChatViewMode>(
		DEFAULT_CHAT_VIEW_MODE,
	);
	const [selectedAgentSessionId, setSelectedAgentSessionId] = useState<
		string | null
	>(null);

	useEffect(() => {
		setHasRightPanel(true);

		return () => setHasRightPanel(false);
	}, [setHasRightPanel]);

	useEffect(() => {
		setChatViewMode(getStoredDefaultChatViewMode());
	}, []);

	const [rightPanelTab, setRightPanelTab] = useState("previews");
	const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
		null,
	);
	const [selectedTerminalSessionId, setSelectedTerminalSessionId] = useState<
		string | null
	>(null);
	const [patchText, setPatchText] = useState<string | null>(null);
	const [isPatchLoading, setIsPatchLoading] = useState(false);
	const [patchError, setPatchError] = useState<string | null>(null);
	const {
		attachments: fileAttachments,
		addFiles: addAttachmentFiles,
		removeAttachment: removeFileAttachment,
		clearAttachments: clearFileAttachments,
		uploadAttachments: uploadFileAttachments,
	} = useImageAttachments({
		taskId: taskId as string,
		uploadImmediately: true,
	});
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
			services: {
				terminalSession: {},
			},
			terminalSessions: {
				services: {},
			},
			workspace: {
				members: {
					user: {},
				},
			},
			agent: {},
			agentSessions: {
				agent: {},
			},
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
			agentSession: {
				agent: {},
			},
		},
	});

	const task = data?.tasks?.[0];
	const events = eventsData?.events;
	const userDisplayProfiles = useMemo(
		() => buildUserDisplayProfiles(task, user),
		[task, user],
	);
	const currentUserProfile = user?.id
		? (userDisplayProfiles[user.id] ?? getAuthUserDisplayProfile(user))
		: undefined;
	const currentTaskPresenceProfile = useMemo(
		() =>
			currentUserProfile
				? getTaskPresenceProfile({
						userId: currentUserProfile.id,
						name: getUserProfileDisplayName(currentUserProfile),
						email: currentUserProfile.email,
					})
				: undefined,
		[currentUserProfile],
	);
	const taskPresence = useTaskTypingPresence({
		taskId: taskId as string,
		profile: currentTaskPresenceProfile,
		enabled: Boolean(task),
	});
	const agentSessions = useMemo(
		() => (task?.agentSessions ?? []).slice().sort(compareAgentSessions),
		[task?.agentSessions],
	);
	const selectedAgentSession =
		agentSessions.find((session) => session.id === selectedAgentSessionId) ??
		agentSessions[0];
	const taskAgentId = getEntityId(task?.agent);
	const selectedAgentId =
		getEntityId(selectedAgentSession?.agent) ?? taskAgentId;
	const selectedAgentName =
		selectedAgentSession?.agent?.name ?? task?.agent?.name ?? undefined;
	const selectedAgentItems = selectedAgentId
		? [{ value: selectedAgentId, label: selectedAgentName ?? "Agent" }]
		: [];
	const scopedEvents = useMemo(() => {
		if (!selectedAgentSession) {
			return events ?? [];
		}

		const isFirstSession = selectedAgentSession.id === agentSessions[0]?.id;

		return (events ?? []).filter((event) => {
			const eventSessionId = getEntityId(event.agentSession);
			return eventSessionId
				? eventSessionId === selectedAgentSession.id
				: isFirstSession;
		});
	}, [agentSessions, events, selectedAgentSession]);
	const timeline = useMemo(() => buildTimeline(scopedEvents), [scopedEvents]);
	const visibleTimeline = useMemo(
		() =>
			chatViewMode === "minified"
				? timeline.filter(isMinifiedTimelineNode)
				: timeline,
		[chatViewMode, timeline],
	);
	const services = task?.services ?? [];
	const terminalSessions = task?.terminalSessions ?? [];
	const pullRequests = getTaskPullRequests(task);
	const isTaskCompleted = Boolean(task?.completedAt);
	const isTaskStarted = Boolean(
		agentSessions.length > 0 || task?.sandboxId || task?.agentThreadId,
	);
	const selectedService =
		services.find((service) => service.id === selectedServiceId) ?? services[0];
	const selectedTerminalSession =
		terminalSessions.find(
			(terminalSession) => terminalSession.id === selectedTerminalSessionId,
		) ?? terminalSessions[0];

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

		if (!container || visibleTimeline.length === 0) {
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
	}, [visibleTimeline]);

	const stopService = async (serviceId: string) => {
		await db.transact(serviceTx(serviceId).delete());
	};

	const toggleTaskCompletion = useCallback(async () => {
		if (!task) {
			return;
		}

		await db.transact(
			taskTx(task.id).update({
				completedAt: isTaskCompleted ? undefined : DateTime.now().toISO(),
				status: isTaskCompleted ? "idle" : "complete",
			}),
		);
	}, [isTaskCompleted, task]);

	const startTask = useCallback(async () => {
		if (!task || isStartingTask) {
			return;
		}

		if (!user?.refresh_token) {
			throw new Error("You must be signed in to start a task.");
		}

		setIsStartingTask(true);

		try {
			const response = await fetch(`/api/tasks/${task.id}/start`, {
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
		} finally {
			setIsStartingTask(false);
		}
	}, [isStartingTask, task, user?.refresh_token]);

	useHotkeys(
		"d",
		toggleTaskCompletion,
		{
			description: isTaskCompleted ? "Uncomplete task" : "Complete task",
			preventDefault: true,
		},
		[isTaskCompleted, toggleTaskCompletion],
	);

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
		const firstAgentSession = agentSessions[0];

		if (!firstAgentSession) {
			setSelectedAgentSessionId(null);
			return;
		}

		if (
			!selectedAgentSessionId ||
			!agentSessions.some((session) => session.id === selectedAgentSessionId)
		) {
			setSelectedAgentSessionId(firstAgentSession.id);
		}
	}, [agentSessions, selectedAgentSessionId]);

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
		const firstTerminalSession = terminalSessions[0];

		if (!firstTerminalSession) {
			setSelectedTerminalSessionId(null);
			return;
		}

		if (
			!selectedTerminalSessionId ||
			!terminalSessions.some(
				(terminalSession) => terminalSession.id === selectedTerminalSessionId,
			)
		) {
			setSelectedTerminalSessionId(firstTerminalSession.id);
		}
	}, [terminalSessions, selectedTerminalSessionId]);

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
		if (!task || isSendingMessage) {
			return;
		}
		const content = message.trim();

		if (!content && fileAttachments.length === 0) {
			return;
		}

		isPinnedToBottomRef.current = true;
		setIsSendingMessage(true);

		try {
			const attachments = await uploadFileAttachments(task.id);
			const agentSessionId =
				selectedAgentSession?.id ?? (await createAgentSession("Agent"));
			const eventId = id();
			const createdAt = DateTime.now().toISO();

			setMessage("");
			taskPresence.stopTyping();
			clearFileAttachments();

			await db.transact([
				taskTx(task.id).update({
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
						type: "factoryplane.new_user_message",
						data: { content, attachments, userId: user?.id },
						createdAt,
					})
					.link({ task: taskId as string, agentSession: agentSessionId }),
			]);
		} finally {
			setIsSendingMessage(false);
		}
	};

	const createAgentSession = async (name = "Agent") => {
		if (!task) {
			throw new Error("Task is not loaded");
		}

		const rawAgentId = asJsonRecord(task.agent)?.id;
		const agentId = typeof rawAgentId === "string" ? rawAgentId : undefined;
		const agentSessionId = id();
		const createdAt = DateTime.now().toISO();

		const transaction = agentSessionTx(agentSessionId).create({
			name,
			status: "idle",
			createdAt,
			updatedAt: createdAt,
		});

		await db.transact(
			agentId
				? transaction.link({ task: task.id, agent: agentId })
				: transaction.link({ task: task.id }),
		);
		setSelectedAgentSessionId(agentSessionId);
		return agentSessionId;
	};

	const handleComposerDragOver = (
		event: ReactDragEvent<HTMLFieldSetElement>,
	) => {
		if (!hasAttachmentFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		setIsDraggingAttachments(true);
	};

	const handleComposerDragLeave = (
		event: ReactDragEvent<HTMLFieldSetElement>,
	) => {
		const nextTarget = event.relatedTarget as Node | null;

		if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
			setIsDraggingAttachments(false);
		}
	};

	const handleComposerDrop = (event: ReactDragEvent<HTMLFieldSetElement>) => {
		if (!hasAttachmentFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		setIsDraggingAttachments(false);
		addAttachmentFiles(getAttachmentFiles(event.dataTransfer));
	};

	const handleComposerPaste = (
		event: ReactClipboardEvent<HTMLFieldSetElement>,
	) => {
		if (!hasAttachmentFiles(event.clipboardData)) {
			return;
		}

		event.preventDefault();
		addAttachmentFiles(getAttachmentFiles(event.clipboardData));
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error.message}</div>;
	}

	return (
		<div className="relative flex h-full min-h-0 w-full overflow-hidden">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<div className="flex shrink-0 flex-row items-center justify-between border-b border-grayscale-4 p-1.5">
					<div className="flex flex-row items-center">
						<ExpandSidebarButton />
						<p className="text-sm text-grayscale-11 p-1">{task?.name}</p>
						{task ? (
							<TaskPresenceAvatars
								taskId={task.id}
								limit={5}
								className="ml-2"
							/>
						) : null}
					</div>
					<div className="flex flex-row items-center gap-1.5">
						{task?.pullRequestUrl ? (
							<Button
								render={(buttonProps) => (
									<a
										{...buttonProps}
										href={task.pullRequestUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										{buttonProps.children}
									</a>
								)}
								nativeButton={false}
								variant="secondary"
								className="h-7 border-grayscale-4 bg-grayscale-3 hover:border-green-6 hover:bg-green-3"
							>
								<CornerBrackets
									placement="inside"
									spacing={1}
									translate={1.5}
									size={6}
									color="var(--color-green-9)"
								/>
								<GitPullRequestIcon
									weight="bold"
									className="size-4 text-green-9"
								/>
								<span>View PR</span>
								<ArrowSquareOutIcon
									weight="bold"
									className="size-3 text-grayscale-10"
								/>
							</Button>
						) : null}
						{!isTaskStarted && !isTaskCompleted ? (
							<Button
								type="button"
								onClick={() => {
									void startTask().catch((error) => {
										console.error("Failed to start task", {
											error:
												error instanceof Error ? error.message : String(error),
										});
									});
								}}
								disabled={isStartingTask}
								className="h-7"
							>
								<PlayCircleIcon weight="bold" className="size-4 shrink-0" />
								{isStartingTask ? "Starting..." : "Start task"}
							</Button>
						) : null}
						<Button
							type="button"
							aria-keyshortcuts="D"
							onClick={toggleTaskCompletion}
							variant="secondary"
							shortcut="D"
							className="h-7"
						>
							{isTaskCompleted ? (
								<MinusCircleIcon weight="bold" className="size-4 shrink-0" />
							) : (
								<>
									<CheckCircleIcon
										weight="bold"
										className="size-4 shrink-0 group-hover:hidden"
									/>
									<CheckCircleIcon
										weight="fill"
										className="hidden size-4 shrink-0 group-hover:block"
									/>
								</>
							)}
							{isTaskCompleted ? "Uncomplete task" : "Mark as complete"}
						</Button>
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
									className="group flex h-6 shrink-0 cursor-pointer items-center justify-center overflow-hidden text-grayscale-11 transition-colors duration-150 hover:text-grayscale-12"
								>
									<span className="flex size-6 shrink-0 items-center justify-center">
										<SidebarSimpleIcon weight="bold" className="-scale-x-100" />
									</span>
								</motion.button>
							)}
						</AnimatePresence>
					</div>
				</div>
				<div className="flex shrink-0 flex-row items-center gap-2 border-b border-grayscale-4 px-3 py-1.5">
					{agentSessions.length > 0 ? (
						<Tabs.Root
							value={selectedAgentSession?.id ?? null}
							onValueChange={(value) => {
								setSelectedAgentSessionId(value == null ? null : String(value));
							}}
							className="min-w-0 flex-1"
						>
							<Tabs.List>
								{agentSessions.map((session, index) => (
									<Tabs.Tab key={session.id} value={session.id}>
										<span className="flex min-w-0 items-center gap-2">
											<TaskStatusDots
												status={toAgentSessionDotStatus(
													task?.status,
													session.status,
												)}
												size={3}
												gap={1}
												label={`${session.name || `Session ${index + 1}`} status`}
											/>
											<span className="truncate">
												{session.name || `Session ${index + 1}`}
											</span>
										</span>
									</Tabs.Tab>
								))}
								<Tabs.Indicator />
							</Tabs.List>
						</Tabs.Root>
					) : (
						<p className="min-w-0 flex-1 truncate text-xs text-grayscale-10">
							No agent sessions yet
						</p>
					)}
					{isTaskStarted ? (
						<Button
							type="button"
							variant="secondary"
							className="h-7 shrink-0"
							onClick={() => {
								void createAgentSession(`Session ${agentSessions.length + 1}`);
							}}
						>
							<PlusCircleIcon weight="bold" className="size-4" />
							Add session
						</Button>
					) : (
						<Button
							type="button"
							variant="secondary"
							className="h-7 shrink-0"
							disabled={isStartingTask}
							onClick={() => {
								void startTask().catch((error) => {
									console.error("Failed to start task", {
										error:
											error instanceof Error ? error.message : String(error),
									});
								});
							}}
						>
							<PlayCircleIcon weight="bold" className="size-4" />
							{isStartingTask ? "Starting..." : "Start"}
						</Button>
					)}
					<Tabs.Root
						value={chatViewMode}
						onValueChange={(value) => {
							if (value === "minified" || value === "full") {
								setChatViewMode(value);
							}
						}}
						className="min-h-0 shrink-0"
					>
						<Tabs.List>
							<Tabs.Tab value="minified">Minified</Tabs.Tab>
							<Tabs.Tab value="full">Full</Tabs.Tab>
							<Tabs.Indicator />
						</Tabs.List>
					</Tabs.Root>
				</div>
				<ScrollArea.Root className="min-h-0 flex-1">
					<ScrollArea.Viewport ref={scrollContainerRef} onScroll={handleScroll}>
						<ScrollArea.Content className="flex min-h-full w-full min-w-0 max-w-full flex-col gap-4">
							<div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col p-4">
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
									{visibleTimeline.map((node) => (
										<Event
											agentName={selectedAgentName}
											currentUserProfile={currentUserProfile}
											key={node.key}
											node={node}
											task={task}
											userProfiles={userDisplayProfiles}
										/>
									))}
								</AnimatePresence>
							</div>
						</ScrollArea.Content>
					</ScrollArea.Viewport>
					<ScrollArea.Scrollbar>
						<ScrollArea.Thumb />
					</ScrollArea.Scrollbar>
				</ScrollArea.Root>
				<div className="flex shrink-0 flex-col px-2">
					<div className="bg-grayscale-2 dark:bg-grayscale-2 px-1.5 pt-1.5 border border-grayscale-3 rounded-t-xl max-w-3xl mx-auto w-full">
						<div className="flex flex-col gap-2 bg-grayscale-1 dark:bg-grayscale-3 rounded-t-lg overflow-hidden border border-grayscale-3 dark:border-grayscale-5">
							<fieldset
								aria-label="Task message composer"
								className={cn(
									"flex flex-col max-w-3xl mx-auto w-full relative transition-colors",
									isDraggingAttachments && "border-accent-8 bg-accent-2",
								)}
								onDragLeave={handleComposerDragLeave}
								onDragOver={handleComposerDragOver}
								onDrop={handleComposerDrop}
								onPaste={handleComposerPaste}
							>
								<div className="flex flex-col p-2 gap-2">
									<Textarea
										className="text-sm bg-grayscale-1 border-grayscale-3 p-2 dark:bg-grayscale-4 focus:bg-grayscale-2 dark:hover:bg-grayscale-5 dark:focus:bg-grayscale-5"
										placeholder={
											isTaskStarted
												? "Task Instructions"
												: "Start this task before sending messages"
										}
										disabled={isSendingMessage || !isTaskStarted}
										value={message}
										onBlur={taskPresence.stopTyping}
										onFocus={taskPresence.focusComposer}
										onChange={(e) => {
											setMessage(e.target.value);
											taskPresence.markTyping();
										}}
										onSubmit={sendMessage}
									/>
									<ImageAttachments
										attachments={fileAttachments}
										disabled={isSendingMessage || !isTaskStarted}
										onAddFiles={addAttachmentFiles}
										onRemoveAttachment={removeFileAttachment}
									/>
								</div>
								<p className="min-h-4 px-3 text-[11px] leading-4 text-grayscale-10">
									<TaskPresenceTypingIndicator peers={taskPresence.peers} />
								</p>
								<div className="flex flex-row items-center justify-between p-3">
									<div className="flex min-w-0 flex-row items-center justify-center gap-2">
										<Select.Root
											items={selectedAgentItems}
											value={selectedAgentId}
										>
											<Select.Trigger
												disabled
												aria-label="Task agent"
												className="max-w-40 shrink-0 cursor-default opacity-100 hover:border-grayscale-6 hover:bg-grayscale-1 hover:text-grayscale-11 disabled:pointer-events-none disabled:opacity-100"
											>
												<Select.Value placeholder="No agent" />
												<Select.Icon />
											</Select.Trigger>
										</Select.Root>
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
										<Button
											type="button"
											disabled={
												isSendingMessage || (!isTaskStarted && isStartingTask)
											}
											onClick={
												isTaskStarted
													? sendMessage
													: () => {
															void startTask().catch((error) => {
																console.error("Failed to start task", {
																	error:
																		error instanceof Error
																			? error.message
																			: String(error),
																});
															});
														}
											}
											className="shrink-0"
										>
											{isTaskStarted
												? isSendingMessage
													? "Sending..."
													: "Send Message"
												: isStartingTask
													? "Starting..."
													: "Start task"}
										</Button>
									</div>
								</div>
							</fieldset>
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
							<Tabs.Tab value="previews">Previews</Tabs.Tab>
							<Tabs.Tab value="pull-requests">PRs</Tabs.Tab>
							<Tabs.Tab value="changes">Changes</Tabs.Tab>
							<Tabs.Tab value="terminal">Terminal</Tabs.Tab>
							<Tabs.Indicator />
						</Tabs.List>
						<button
							type="button"
							aria-label="Collapse preview panel"
							onClick={collapseRight}
							className="group ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center text-grayscale-11 transition-colors duration-150 hover:text-grayscale-12"
						>
							<SidebarSimpleIcon weight="bold" className="-scale-x-100" />
						</button>
					</div>
					<Tabs.Panel value="previews" className="flex min-h-0 flex-1 flex-col">
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
								<div className="p-2 border-b border-grayscale-4 flex flex-row items-center justify-between gap-2">
									<p className="text-xs text-grayscale-10 truncate">
										{selectedService?.terminalSession?.command ??
											selectedService?.command ??
											"No command"}
									</p>
									<div className="flex shrink-0 flex-row items-center gap-1.5">
										{selectedService ? (
											<Link
												href={`/services/${selectedService.id}`}
												aria-label="Open preview fullscreen"
												className="bg-grayscale-3 shrink-0 p-1.5 px-3 flex flex-row items-center gap-2 group relative hover:bg-accent-3"
											>
												<CornerBrackets
													placement="inside"
													spacing={1}
													translate={1.5}
													size={6}
													color="var(--color-accent-9)"
												/>
												<CornersOutIcon
													weight="bold"
													className="size-4 text-accent-9"
												/>
												<p className="text-xs text-grayscale-12">Fullscreen</p>
											</Link>
										) : null}
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
												size={6}
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
								</div>
								<div className="min-h-0 flex-1">
									{services.map((service) => (
										<Tabs.Panel
											key={service.id}
											value={service.id}
											className="h-full"
										>
											{service.url ? (
												<ServicePreviewFrame
													serviceId={service.id}
													serviceName={service.name}
													userToken={user?.refresh_token}
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
										No previews running
									</p>
									<p className="text-xs text-grayscale-10 max-w-sm text-center">
										The agent can start dev servers for you to preview here.
									</p>
								</div>
							</div>
						)}
					</Tabs.Panel>
					<Tabs.Panel
						value="pull-requests"
						className="flex min-h-0 flex-1 flex-col overflow-auto bg-grayscale-1"
					>
						{pullRequests.length > 0 ? (
							<div className="flex flex-col divide-y divide-grayscale-4">
								{pullRequests.map((pullRequest) => (
									<PullRequestRow
										key={pullRequest.id}
										pullRequest={pullRequest}
									/>
								))}
							</div>
						) : (
							<div className="flex h-full flex-1 items-center justify-center text-xs text-grayscale-10">
								<div className="flex flex-col items-center justify-center gap-px p-8">
									<p className="text-sm text-grayscale-12">No pull requests</p>
									<p className="max-w-sm text-center text-xs text-grayscale-10">
										The agent can attach a pull request link when work is ready
										for review.
									</p>
								</div>
							</div>
						)}
					</Tabs.Panel>
					<Tabs.Panel
						value="terminal"
						className="flex min-h-0 flex-1 flex-col bg-grayscale-1"
					>
						{terminalSessions.length > 0 ? (
							<Tabs.Root
								value={selectedTerminalSession?.id ?? null}
								onValueChange={(value) => {
									setSelectedTerminalSessionId(
										value == null ? null : String(value),
									);
								}}
								className="flex-1"
							>
								<Tabs.List className="border-b border-grayscale-4 p-1.5">
									{terminalSessions.map((terminalSession) => (
										<Tabs.Tab
											key={terminalSession.id}
											value={terminalSession.id}
										>
											{terminalSession.name}
										</Tabs.Tab>
									))}
									<Tabs.Indicator />
								</Tabs.List>
								<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
									{selectedTerminalSession ? (
										<TerminalSessionSummary
											terminalSession={selectedTerminalSession}
											userToken={user?.refresh_token}
										/>
									) : null}
								</div>
							</Tabs.Root>
						) : (
							<div className="flex h-full flex-1 items-center justify-center text-xs text-grayscale-10">
								<div className="flex flex-col items-center justify-center gap-px p-8">
									<p className="text-sm text-grayscale-12">
										No terminal sessions
									</p>
									<p className="text-xs text-grayscale-10 max-w-sm text-center">
										Terminal sessions will appear here when the agent starts
										long-running commands.
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

type PullRequestSummary = {
	id: string;
	url: string;
};

function getTaskPullRequests(
	task:
		| {
				id: string;
				pullRequestUrl?: string;
		  }
		| undefined,
): PullRequestSummary[] {
	if (!task?.pullRequestUrl) {
		return [];
	}

	return [
		{
			id: task.id,
			url: task.pullRequestUrl,
		},
	];
}

function PullRequestRow({ pullRequest }: { pullRequest: PullRequestSummary }) {
	const title = getPullRequestFallbackTitle(pullRequest.url);

	return (
		<a
			href={pullRequest.url}
			rel="noopener noreferrer"
			target="_blank"
			className="group flex min-w-0 items-start gap-3 px-3 py-3 transition-colors hover:bg-accent-2"
		>
			<span className="flex size-7 shrink-0 items-center justify-center bg-grayscale-3 text-green-10 group-hover:bg-green-3">
				<GitPullRequestIcon weight="bold" className="size-4" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="line-clamp-2 text-sm font-medium leading-5 text-grayscale-12">
					{title}
				</span>
				<span className="truncate font-mono text-[11px] text-grayscale-10">
					{pullRequest.url}
				</span>
			</span>
			<ArrowSquareOutIcon
				weight="bold"
				className="mt-1 size-4 shrink-0 text-grayscale-9 group-hover:text-accent-10"
			/>
		</a>
	);
}

function getPullRequestFallbackTitle(url: string) {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname.replace(/^\/+/, "");

		return path ? `${parsed.hostname}/${path}` : parsed.hostname;
	} catch {
		return url;
	}
}

type TerminalSessionSummaryProps = {
	terminalSession: {
		id: string;
		name: string;
		command?: string | null;
		cwd?: string | null;
		pid?: number | null;
		status?: string | null;
		startedBy?: string | null;
		startedAt?: string | number | Date | null;
		stoppedAt?: string | number | Date | null;
		lastActivityAt?: string | number | Date | null;
		error?: string | null;
		services?: Array<{
			id: string;
			name: string;
			portNumber?: number | null;
			url?: string | null;
			status?: string | null;
		}> | null;
	};
	userToken: string | undefined;
};

function TerminalSessionSummary({
	terminalSession,
	userToken,
}: TerminalSessionSummaryProps) {
	const services = terminalSession.services ?? [];

	return (
		<div className="flex min-h-full flex-col gap-3">
			<div className="min-h-[280px] overflow-hidden border border-grayscale-4 bg-grayscale-12">
				<TerminalSessionLive
					terminalSessionId={terminalSession.id}
					userToken={userToken}
				/>
			</div>
			<div className="flex flex-row items-center justify-between gap-3 border-b border-grayscale-4 pb-3">
				<div className="min-w-0">
					<p className="truncate text-sm text-grayscale-12">
						{terminalSession.name}
					</p>
					<p className="truncate text-xs text-grayscale-10">
						{terminalSession.cwd ?? "No working directory"}
					</p>
				</div>
				<span className="shrink-0 bg-grayscale-3 px-2 py-1 text-xs text-grayscale-11">
					{terminalSession.status ?? "unknown"}
				</span>
			</div>
			<div className="flex flex-col gap-1.5">
				<TerminalSessionField label="Command">
					<code className="block whitespace-pre-wrap break-words font-mono text-xs text-grayscale-12">
						{terminalSession.command ?? "No command"}
					</code>
				</TerminalSessionField>
				<TerminalSessionField label="PID">
					{typeof terminalSession.pid === "number"
						? String(terminalSession.pid)
						: "Unknown"}
				</TerminalSessionField>
				<TerminalSessionField label="Started by">
					{terminalSession.startedBy ?? "Unknown"}
				</TerminalSessionField>
				<TerminalSessionField label="Started">
					{formatTerminalTimestamp(terminalSession.startedAt)}
				</TerminalSessionField>
				<TerminalSessionField label="Last activity">
					{formatTerminalTimestamp(terminalSession.lastActivityAt)}
				</TerminalSessionField>
				{terminalSession.stoppedAt ? (
					<TerminalSessionField label="Stopped">
						{formatTerminalTimestamp(terminalSession.stoppedAt)}
					</TerminalSessionField>
				) : null}
			</div>
			{terminalSession.error ? (
				<div className="border border-red-6 bg-red-2 p-2 text-xs text-red-10">
					{terminalSession.error}
				</div>
			) : null}
			<div className="flex flex-col gap-2 border-t border-grayscale-4 pt-3">
				<p className="text-xs text-grayscale-10">Linked previews</p>
				{services.length > 0 ? (
					<div className="flex flex-col gap-1.5">
						{services.map((service) => {
							const publicUrl = getPublicServiceUrl({
								serviceId: service.id,
								url: service.url,
							});

							return (
								<div
									key={service.id}
									className="flex flex-row items-center justify-between gap-3 bg-grayscale-2 px-2 py-1.5"
								>
									<div className="min-w-0">
										<p className="truncate text-xs text-grayscale-12">
											{service.name}
										</p>
										<p className="truncate text-xs text-grayscale-10">
											:{service.portNumber ?? "?"} ·{" "}
											{service.status ?? "unknown"}
										</p>
									</div>
									{publicUrl ? (
										<a
											href={publicUrl}
											target="_blank"
											rel="noreferrer"
											className="shrink-0 text-xs text-accent-11 hover:text-accent-12"
										>
											Open
										</a>
									) : null}
								</div>
							);
						})}
					</div>
				) : (
					<p className="text-xs text-grayscale-10">
						This terminal session is not linked to an active preview.
					</p>
				)}
			</div>
		</div>
	);
}

function TerminalSessionField({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-xs">
			<p className="text-grayscale-10">{label}</p>
			<div className="min-w-0 text-grayscale-12">{children}</div>
		</div>
	);
}

function formatTerminalTimestamp(
	value: string | number | Date | null | undefined,
) {
	if (!value) {
		return "Unknown";
	}

	const dateTime =
		value instanceof Date
			? DateTime.fromJSDate(value)
			: typeof value === "number"
				? DateTime.fromMillis(value)
				: DateTime.fromISO(value);

	return dateTime.isValid
		? dateTime.toLocaleString(DateTime.DATETIME_MED)
		: "Unknown";
}
