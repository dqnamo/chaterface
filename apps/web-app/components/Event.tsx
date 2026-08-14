import type { InstaQLEntity } from "@instantdb/react";
import {
	CheckCircleIcon,
	CircleNotchIcon,
	FileIcon,
	WarningCircleIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
	type Components,
	type ExtraProps,
	type LinkSafetyConfig,
	Streamdown,
} from "streamdown";
import { getPublicServiceUrl } from "@/helpers/service-preview-url-helper";
import type { AppSchema } from "@/instant.schema";
import CodeBlock from "./CodeBlock";
import Logo from "./Logo";
import Monogram from "./Monogram";

type EventEntity = InstaQLEntity<AppSchema, "events">;
type JsonRecord = Record<string, unknown>;
type TaskSummary = {
	id?: string;
	name?: string;
	instructions?: string;
};
type Attachment = {
	id: string;
	path: string;
	url?: string;
	name: string;
	contentType: string;
	size: number;
};
type Tone = "neutral" | "accent" | "success" | "warning" | "danger";
export type UserDisplayProfile = {
	id: string;
	email?: string;
	memberName?: string;
	userName?: string;
};

/** A resolved lifecycle state for a grouped (started -> finished) timeline row. */
export type TimelinePhase = "running" | "success" | "warning" | "failed";

/**
 * A single row in the timeline. Lifecycle events that share a key (e.g. a
 * setup step's `started` and `completed` events) are folded into one node so
 * the row stays in place and just updates its icon as it progresses.
 */
export type TimelineNode = {
	key: string;
	event: EventEntity;
	phase?: TimelinePhase;
	startedAt?: string;
};

type TimelineContext = {
	runKey: string;
	turnKey: string;
};
type TimestampMeta = {
	dateTime: string;
	relative: string;
	time: string;
	title: string;
};

const OUTPUT_PREVIEW_LIMIT = 6000;
const MESSAGE_LINK_SAFETY = { enabled: false } satisfies LinkSafetyConfig;
const MESSAGE_COMPONENTS = {
	code: MarkdownCodeBlock,
	inlineCode: InlineCode,
} as Components;

const toneClasses: Record<Tone, string> = {
	neutral: "text-grayscale-11",
	accent: "text-accent-11",
	success: "text-green-11",
	warning: "text-grayscale-12",
	danger: "text-red-11",
};

const phaseClasses: Record<TimelinePhase, string> = {
	running: "text-accent-11",
	success: "text-green-11",
	warning: "text-yellow-9",
	failed: "text-red-11",
};

type StreamdownCodeProps = ComponentPropsWithoutRef<"code"> & ExtraProps;

/**
 * Folds a flat list of events into timeline nodes, merging lifecycle pairs
 * (started/completed/failed) that describe the same underlying unit of work.
 */
export function buildTimeline(events: readonly EventEntity[]): TimelineNode[] {
	const sorted = [...events].sort(compareEvents);
	const nodes: TimelineNode[] = [];
	const indexByKey = new Map<string, number>();
	let unscopedRunIndex = 0;
	let runKey = `run:unscoped:${unscopedRunIndex}`;
	let turnKey = `turn:${runKey}:pending`;

	const upsertNode = (
		key: string,
		event: EventEntity,
		phase?: TimelinePhase,
	) => {
		const existingIndex = indexByKey.get(key);

		if (existingIndex === undefined) {
			indexByKey.set(key, nodes.length);
			nodes.push({
				key,
				event,
				phase,
				startedAt: event.createdAt ? String(event.createdAt) : undefined,
			});
			return;
		}

		const node = nodes[existingIndex];

		if (node) {
			node.event = event;
			node.phase = phase ? mergePhase(node.phase, phase) : node.phase;
		}
	};

	for (const event of sorted) {
		const type = event.type ?? "";

		if (
			type === "chaterface.new_task" ||
			type === "chaterface.new_user_message"
		) {
			runKey = `run:${event.id}`;
			turnKey = `turn:${runKey}:pending`;
			upsertNode(event.id, event);
			continue;
		}

		if (type === "codex.turn.started") {
			turnKey = `turn:${event.id}`;
			upsertNode(turnKey, event, "running");
			continue;
		}

		if (type === "codex.turn.completed") {
			upsertNode(turnKey, event, "success");

			unscopedRunIndex += runKey.startsWith("run:unscoped:") ? 1 : 0;
			if (runKey.startsWith("run:unscoped:")) {
				runKey = `run:unscoped:${unscopedRunIndex}`;
				turnKey = `turn:${runKey}:pending`;
			}
			continue;
		}

		const group = groupInfoFor(event, { runKey, turnKey });

		if (!group) {
			nodes.push({ key: event.id, event });
			continue;
		}

		upsertNode(group.key, event, group.phase);
	}

	return nodes;
}

function groupInfoFor(
	event: EventEntity,
	context: TimelineContext,
): { key: string; phase: TimelinePhase } | null {
	const type = event.type ?? "";
	const data = asRecord(event.data) ?? {};

	if (type.startsWith("chaterface.setup_step_")) {
		const step = getString(data, "step") ?? "step";
		const phase: TimelinePhase = type.endsWith("_failed")
			? "failed"
			: type.endsWith("_warning")
				? "warning"
				: type.endsWith("_completed")
					? "success"
					: "running";

		return { key: `${context.runKey}:setup:${step}`, phase };
	}

	if (type.startsWith("codex.item.")) {
		const item = asRecord(data.item);
		const itemType = item ? getString(item, "type") : undefined;

		if (
			item &&
			(itemType === "command_execution" || itemType === "file_change")
		) {
			const id = getString(item, "id") ?? event.id;
			const status = getString(item, "status");
			const exitCode = getNumber(item, "exit_code");
			const phase: TimelinePhase =
				status === "failed" || (exitCode !== undefined && exitCode !== 0)
					? "failed"
					: status === "completed" || type.endsWith(".completed")
						? "success"
						: "running";

			return { key: `${context.turnKey}:item:${id}`, phase };
		}
	}

	return null;
}

function compareEvents(a: EventEntity, b: EventEntity) {
	const timeCompare = getEventTime(a) - getEventTime(b);

	if (timeCompare !== 0) {
		return timeCompare;
	}

	const rankCompare = getEventSortRank(a) - getEventSortRank(b);

	if (rankCompare !== 0) {
		return rankCompare;
	}

	return String(a.id).localeCompare(String(b.id));
}

function getEventTime(event: EventEntity) {
	const timestamp =
		event.createdAt ??
		getString((event as unknown as JsonRecord) ?? {}, "serverCreatedAt");
	const time = parseTimestamp(timestamp);

	return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function getEventSortRank(event: EventEntity) {
	const type = event.type ?? "";

	if (type === "chaterface.new_task") {
		return 0;
	}

	if (type === "chaterface.new_user_message") {
		return 1;
	}

	if (type === "codex.thread.started") {
		return 2;
	}

	if (type === "codex.turn.started") {
		return 3;
	}

	if (type === "codex.item.started") {
		return 4;
	}

	if (type === "codex.item.completed") {
		return 5;
	}

	if (type === "codex.turn.completed") {
		return 6;
	}

	if (type.endsWith("_started") || type.endsWith(".started")) {
		return 7;
	}

	if (
		type.endsWith("_completed") ||
		type.endsWith("_failed") ||
		type.endsWith("_warning")
	) {
		return 8;
	}

	return 9;
}

function mergePhase(
	prev: TimelinePhase | undefined,
	next: TimelinePhase,
): TimelinePhase {
	if (prev === "failed" || next === "failed") {
		return "failed";
	}

	if (prev === "warning" || next === "warning") {
		return "warning";
	}

	if (prev === "success" || next === "success") {
		return "success";
	}

	return next;
}

export default function Event({
	agentName,
	currentUserProfile,
	node,
	task,
	userProfiles = {},
}: {
	agentName?: string;
	currentUserProfile?: UserDisplayProfile;
	node: TimelineNode;
	task?: TaskSummary;
	userProfiles?: Record<string, UserDisplayProfile>;
}) {
	const { event, phase } = node;
	const type = event.type ?? "event";
	const data = asRecord(event.data) ?? {};
	const timestampMeta = formatTimestampMeta(event.createdAt);
	const timestamp = timestampMeta?.time;

	if (type === "chaterface.new_task") {
		return <NewTaskEvent data={data} task={task} timestamp={timestamp} />;
	}

	if (type === "chaterface.new_user_message") {
		const content = getString(data, "content");
		const attachments = getAttachments(data);
		const userId = getString(data, "userId");
		const profile = userId ? userProfiles[userId] : currentUserProfile;

		return (
			<UserMessage
				attachments={attachments}
				name={getUserDisplayName(profile)}
				text={content}
				timestamp={timestamp}
			/>
		);
	}

	if (type.startsWith("chaterface.service_")) {
		return <ServiceEvent data={data} timestamp={timestamp} type={type} />;
	}

	if (type.startsWith("chaterface.repository_")) {
		return <RepositoryEvent data={data} timestamp={timestamp} type={type} />;
	}

	if (
		type === "chaterface.pull_request_attached" ||
		type === "chaterface.pull_request_merged"
	) {
		return <PullRequestEvent data={data} timestamp={timestamp} type={type} />;
	}

	if (type.startsWith("chaterface.setup_step_")) {
		return <SetupStepEvent data={data} phase={phase} timestamp={timestamp} />;
	}

	if (type === "codex.thread.started") {
		return (
			<EventCard
				actorName={agentName}
				glyph="AI"
				meta={timestamp}
				source="agent"
				subtitle={getString(data, "thread_id") ?? getString(data, "threadId")}
				title="Agent connected"
				tone="accent"
			/>
		);
	}

	if (type === "codex.turn.started" || type === "codex.turn.completed") {
		return (
			<TurnEvent
				agentName={agentName}
				data={data}
				phase={phase}
				timestamp={timestamp}
			/>
		);
	}

	if (type.startsWith("codex.item.")) {
		return (
			<CodexItemEvent
				agentName={agentName}
				data={data}
				phase={phase}
				timestamp={timestamp}
				timestampMeta={timestampMeta}
				type={type}
			/>
		);
	}

	return (
		<EventCard
			glyph="EV"
			meta={timestamp}
			phase={type.includes("failed") ? "failed" : undefined}
			source={type.startsWith("chaterface.") ? "chaterface" : "event"}
			subtitle={type}
			title={formatEventType(type)}
			tone={type.includes("failed") ? "danger" : "neutral"}
		>
			<RawPayload value={event.data} />
		</EventCard>
	);
}

function NewTaskEvent({
	data,
	task,
	timestamp,
}: {
	data: JsonRecord;
	task?: TaskSummary;
	timestamp?: string;
}) {
	const taskId = getString(data, "taskId") ?? task?.id;
	const name = getString(data, "name") ?? task?.name;
	const instructions = getString(data, "instructions") ?? task?.instructions;
	const attachments = getAttachments(data);
	const showInstructions = instructions && instructions !== name;

	return (
		<EventCard
			glyph="FP"
			logo
			meta={timestamp}
			source="chaterface"
			subtitle={name ? "New task created" : taskId}
			title={name ?? "New task created"}
			tone="accent"
		>
			{showInstructions ? <MessageBubble text={instructions} /> : null}
			<AttachmentGrid attachments={attachments} />
			{name ? <DetailGrid items={[["task", taskId]]} /> : null}
		</EventCard>
	);
}

function TurnEvent({
	agentName,
	data,
	phase,
	timestamp,
}: {
	agentName?: string;
	data: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
}) {
	const usage = asRecord(data.usage);
	const resolvedPhase = phase ?? "running";
	const title =
		resolvedPhase === "success"
			? "Agent turn completed"
			: resolvedPhase === "failed"
				? "Agent turn failed"
				: "Agent turn started";

	return (
		<EventCard
			actorName={agentName}
			glyph="AI"
			logo
			meta={timestamp}
			phase={resolvedPhase}
			source="agent"
			title={title}
			tone="accent"
		>
			{usage ? (
				<DetailGrid
					items={[
						["input", formatNumber(getNumber(usage, "input_tokens"))],
						["output", formatNumber(getNumber(usage, "output_tokens"))],
						["cached", formatNumber(getNumber(usage, "cached_input_tokens"))],
						[
							"reasoning",
							formatNumber(getNumber(usage, "reasoning_output_tokens")),
						],
					]}
				/>
			) : null}
		</EventCard>
	);
}

function SetupStepEvent({
	data,
	phase,
	timestamp,
}: {
	data: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
}) {
	return (
		<EventCard
			glyph="ST"
			meta={timestamp}
			phase={phase ?? "running"}
			source="chaterface"
			subtitle={getString(data, "step")}
			title={getString(data, "title") ?? "Setup step"}
			tone="accent"
		>
			<DetailGrid items={[["error", getString(data, "error")]]} />
		</EventCard>
	);
}

function ServiceEvent({
	data,
	timestamp,
	type,
}: {
	data: JsonRecord;
	timestamp?: string;
	type: string;
}) {
	const name = getString(data, "name") ?? "Service";
	const serviceId = getString(data, "serviceId");
	const url = getPublicServiceUrl({
		serviceId,
		url: getString(data, "url"),
	});
	const previewHref = serviceId ? `/services/${serviceId}` : url;
	const isFailure = type.includes("failed");
	const title =
		type === "chaterface.service_started"
			? "Service started"
			: type === "chaterface.service_stopped"
				? "Service stopped"
				: type === "chaterface.service_failed"
					? "Service failed"
					: "Service stop failed";

	return (
		<EventCard
			glyph="SV"
			meta={timestamp}
			phase={isFailure ? "failed" : "success"}
			source="chaterface"
			subtitle={name}
			title={title}
			tone={isFailure ? "danger" : "success"}
		>
			<DetailGrid
				items={[
					["service", getString(data, "serviceId")],
					["port", getNumber(data, "portNumber")],
					["pid", getNumber(data, "pid")],
					[
						"url",
						url && previewHref ? (
							<a
								className="text-accent-11 underline-offset-2 hover:underline"
								href={previewHref}
								key="service-url"
								rel="noopener noreferrer"
								target="_blank"
							>
								{url}
							</a>
						) : undefined,
					],
					["error", getString(data, "error")],
				]}
			/>
		</EventCard>
	);
}

function RepositoryEvent({
	data,
	timestamp,
	type,
}: {
	data: JsonRecord;
	timestamp?: string;
	type: string;
}) {
	const url = getString(data, "url");
	const title =
		type === "chaterface.repository_created"
			? "Repository added"
			: type === "chaterface.repository_updated"
				? "Repository updated"
				: "Repository removed";

	return (
		<EventCard
			glyph="RP"
			meta={timestamp}
			phase="success"
			source="chaterface"
			subtitle={url ?? getString(data, "repositoryId")}
			title={title}
			tone="success"
		>
			<DetailGrid
				items={[
					["repository", getString(data, "repositoryId")],
					["path", getString(data, "path")],
					["branch", getString(data, "branch")],
				]}
			/>
		</EventCard>
	);
}

function PullRequestEvent({
	data,
	timestamp,
	type,
}: {
	data: JsonRecord;
	timestamp?: string;
	type: string;
}) {
	const url = getString(data, "url");
	const title =
		type === "chaterface.pull_request_merged"
			? "Pull request merged"
			: "Pull request attached";

	return (
		<EventCard
			glyph="PR"
			meta={timestamp}
			phase="success"
			source="chaterface"
			title={title}
			tone="success"
		>
			<DetailGrid
				items={[
					[
						"url",
						url ? (
							<a
								className="text-accent-11 underline-offset-2 hover:underline"
								href={url}
								key="pull-request-url"
								rel="noopener noreferrer"
								target="_blank"
							>
								{url}
							</a>
						) : undefined,
					],
					["method", getString(data, "mergeMethod")],
					["sha", getString(data, "sha")],
				]}
			/>
		</EventCard>
	);
}

function CodexItemEvent({
	agentName,
	data,
	phase,
	timestamp,
	timestampMeta,
	type,
}: {
	agentName?: string;
	data: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
	timestampMeta?: TimestampMeta;
	type: string;
}) {
	const item = asRecord(data.item);
	const itemType = item ? getString(item, "type") : undefined;

	if (!item) {
		return (
			<EventCard
				actorName={agentName}
				glyph="AI"
				meta={timestamp}
				source="agent"
				subtitle={type}
				title="Agent item"
				tone="neutral"
			>
				<RawPayload value={data} />
			</EventCard>
		);
	}

	if (itemType === "agent_message") {
		return (
			<AgentMessage
				agentName={agentName}
				text={getString(item, "text") ?? "No message text"}
				timestampMeta={timestampMeta}
			/>
		);
	}

	if (itemType === "command_execution") {
		return (
			<CommandExecutionEvent
				agentName={agentName}
				item={item}
				phase={phase}
				timestamp={timestamp}
			/>
		);
	}

	if (itemType === "file_change") {
		return (
			<FileChangeEvent
				agentName={agentName}
				item={item}
				phase={phase}
				timestamp={timestamp}
			/>
		);
	}

	return (
		<EventCard
			actorName={agentName}
			glyph="IT"
			meta={timestamp}
			source="agent"
			subtitle={itemType}
			title={formatEventType(type)}
			tone={toneForStatus(getString(item, "status"))}
		>
			<RawPayload value={item} />
		</EventCard>
	);
}

function CommandExecutionEvent({
	agentName,
	item,
	phase,
	timestamp,
}: {
	agentName?: string;
	item: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
}) {
	const command = getString(item, "command");
	const exitCode = getNumber(item, "exit_code");
	const output = getString(item, "aggregated_output");
	const resolvedPhase = phase ?? "running";
	const title =
		resolvedPhase === "failed"
			? "Command failed"
			: resolvedPhase === "success"
				? "Command completed"
				: "Running command";

	return (
		<EventCard
			actorName={agentName}
			glyph="$"
			meta={timestamp}
			phase={resolvedPhase}
			source="agent"
			subtitle={exitCode === undefined ? undefined : `exit ${exitCode}`}
			titleFullWidth
			title={title}
			tone="accent"
		>
			{command ? <PlainCodeBlock>{command}</PlainCodeBlock> : null}
			{output ? <OutputPreview output={output} /> : null}
		</EventCard>
	);
}

function FileChangeEvent({
	agentName,
	item,
	phase,
	timestamp,
}: {
	agentName?: string;
	item: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
}) {
	const changes = getRecordArray(item, "changes");
	const resolvedPhase = phase ?? "running";

	return (
		<EventCard
			actorName={agentName}
			glyph="FS"
			meta={timestamp}
			phase={resolvedPhase}
			source="agent"
			subtitle={summarizeCount(changes.length, "file change")}
			title={
				resolvedPhase === "success" ? "File changes" : "Writing file changes"
			}
			tone="accent"
		>
			{changes.length > 0 ? (
				<ul className="flex flex-col gap-0.5">
					{changes.slice(0, 6).map((change) => {
						const kind = getString(change, "kind") ?? "update";
						const path = getString(change, "path") ?? "unknown path";

						return (
							<li
								className="flex min-w-0 items-center gap-2 py-0.5"
								key={`${kind}-${path}`}
							>
								<span className="shrink-0 bg-grayscale-3 px-1.5 py-px font-mono text-[9px] font-medium uppercase leading-4 text-grayscale-10">
									{kind}
								</span>
								<span className="truncate font-mono text-[11px] leading-4 text-grayscale-10">
									{path}
								</span>
							</li>
						);
					})}
					{changes.length > 6 ? (
						<li className="px-2 text-[11px] leading-4 text-grayscale-9">
							+{changes.length - 6} more
						</li>
					) : null}
				</ul>
			) : null}
		</EventCard>
	);
}

function AgentMessage({
	agentName,
	text,
	timestampMeta,
}: {
	agentName?: string;
	text: string;
	timestampMeta?: TimestampMeta;
}) {
	const displayName = agentName ?? "Codex";

	return (
		<motion.article
			animate={{ opacity: 1, y: 0 }}
			className="relative min-w-0 max-w-full overflow-hidden py-2"
			initial={{ opacity: 0, y: 6 }}
			layout="position"
			transition={{ duration: 0.18, ease: "easeOut" }}
		>
			<div className="flex min-w-0 max-w-full flex-col gap-1.5 px-3">
				<div className="flex min-w-0 items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2">
						<TimelineAvatar glyph="AI" logo source="agent" />
						<p className="min-w-0 truncate text-[13px] font-medium leading-5 text-grayscale-12">
							{displayName}
						</p>
					</div>
					{timestampMeta ? (
						<time
							className="shrink-0 text-right text-[11px] leading-4 text-grayscale-8"
							dateTime={timestampMeta.dateTime}
							suppressHydrationWarning
							title={timestampMeta.title}
						>
							{timestampMeta.time}
							<span className="text-grayscale-7"> · </span>
							<span>{timestampMeta.relative}</span>
						</time>
					) : null}
				</div>
				<div className="min-w-0 max-w-full">
					<MessageBubble text={text} />
				</div>
			</div>
		</motion.article>
	);
}

function UserMessage({
	attachments,
	name,
	text,
	timestamp,
}: {
	attachments: Attachment[];
	name: string;
	text?: string;
	timestamp?: string;
}) {
	return (
		<motion.article
			animate={{ opacity: 1, y: 0 }}
			className="relative min-w-0 max-w-full overflow-hidden py-2"
			initial={{ opacity: 0, y: 6 }}
			layout="position"
			transition={{ duration: 0.18, ease: "easeOut" }}
		>
			<div className="flex min-w-0 max-w-full flex-col gap-1 px-3">
				<div className="flex min-w-0 items-center gap-2">
					<Monogram
						className="size-7 shrink-0 rounded-full text-xs"
						letters={1}
						seed={name}
					/>
					<p className="min-w-0 truncate text-[13px] font-medium leading-5 text-grayscale-12">
						{name}
					</p>
					{timestamp ? (
						<time className="shrink-0 text-[11px] leading-4 text-grayscale-9">
							{timestamp}
						</time>
					) : null}
				</div>
				{text ? <MessageBubble text={text} /> : null}
				<AttachmentGrid attachments={attachments} />
			</div>
		</motion.article>
	);
}

type EventSource = "agent" | "event" | "chaterface";

function EventCard({
	actorName,
	children,
	glyph,
	logo = false,
	meta,
	phase,
	source = "event",
	subtitle,
	title,
	titleFullWidth = false,
	tone,
}: {
	actorName?: string;
	children?: ReactNode;
	glyph: string;
	logo?: boolean;
	meta?: string;
	phase?: TimelinePhase;
	source?: EventSource;
	subtitle?: ReactNode;
	title?: string;
	titleFullWidth?: boolean;
	tone: Tone;
}) {
	if (source !== "agent") {
		return (
			<motion.article
				animate={{ opacity: 1, y: 0 }}
				className="relative min-w-0 max-w-full overflow-hidden py-1"
				initial={{ opacity: 0, y: 4 }}
				layout="position"
				transition={{ duration: 0.16, ease: "easeOut" }}
			>
				<div className="flex min-w-0 max-w-full flex-col gap-1 px-3">
					<div className="flex min-w-0 max-w-full gap-2.5">
						<SystemEventIcon
							glyph={glyph}
							logo={logo}
							phase={phase}
							tone={tone}
						/>
						{title || subtitle || meta ? (
							<div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
								{title ? (
									<p className="min-w-0 break-words text-[13px] font-medium leading-5 text-grayscale-12">
										{title}
									</p>
								) : null}
								{subtitle ? (
									<p className="min-w-0 max-w-full break-words font-mono text-[11px] leading-4 text-grayscale-9">
										{subtitle}
									</p>
								) : null}
								{meta ? (
									<time className="shrink-0 text-[11px] leading-4 text-grayscale-8">
										{meta}
									</time>
								) : null}
							</div>
						) : null}
					</div>
					{children ? (
						<div className="flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden">
							{children}
						</div>
					) : null}
				</div>
			</motion.article>
		);
	}

	const displayName = actorName ?? "Codex";
	const titleRow =
		title || subtitle ? (
			<div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
				{title ? (
					<p className="flex min-w-0 max-w-full items-center gap-1.5 text-[13px] font-medium leading-5 text-grayscale-12">
						<PhaseIcon phase={phase} tone={tone} />
						<span className="min-w-0 break-words">{title}</span>
					</p>
				) : null}
				{subtitle ? (
					<p className="min-w-0 max-w-full break-words font-mono text-[11px] leading-4 text-grayscale-9">
						{subtitle}
					</p>
				) : null}
			</div>
		) : null;

	return (
		<motion.article
			animate={{ opacity: 1, y: 0 }}
			className="relative min-w-0 max-w-full overflow-hidden py-2"
			initial={{ opacity: 0, y: 6 }}
			layout="position"
			transition={{ duration: 0.18, ease: "easeOut" }}
		>
			<div className="flex min-w-0 max-w-full flex-col gap-1 px-3">
				<div className="flex min-w-0 max-w-full gap-2.5">
					<TimelineAvatar glyph={glyph} logo={logo} source={source} />
					<div className="min-w-0 flex-1">
						<div className="flex min-w-0 items-baseline gap-2">
							<p className="min-w-0 truncate text-[13px] font-medium leading-5 text-grayscale-12">
								{displayName}
							</p>
							{meta ? (
								<time className="shrink-0 text-[11px] leading-4 text-grayscale-9">
									{meta}
								</time>
							) : null}
						</div>
						{titleFullWidth ? null : titleRow}
					</div>
				</div>
				{titleFullWidth ? titleRow : null}
				{children ? (
					<div
						className={cx(
							"flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden",
							title || subtitle ? "mt-0.5" : "",
						)}
					>
						{children}
					</div>
				) : null}
			</div>
		</motion.article>
	);
}

function SystemEventIcon({
	glyph,
	logo,
	phase,
	tone,
}: {
	glyph: string;
	logo: boolean;
	phase?: TimelinePhase;
	tone: Tone;
}) {
	if (phase) {
		return <PhaseIcon phase={phase} tone={tone} />;
	}

	if (logo) {
		return <Logo className="mt-0.5 size-4 text-accent-11" />;
	}

	return (
		<span className="mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-grayscale-4 font-mono text-[7px] font-semibold text-grayscale-9">
			{glyph.slice(0, 1)}
		</span>
	);
}

function TimelineAvatar({
	glyph,
	logo,
	source,
}: {
	glyph: string;
	logo: boolean;
	source: EventSource;
}) {
	if (source === "agent") {
		return (
			<Image
				alt=""
				aria-hidden="true"
				className="mt-0.5 size-4 shrink-0 object-contain dark:invert"
				height={16}
				src="/codex.svg"
				width={16}
			/>
		);
	}

	if (source === "chaterface" || logo) {
		return <Logo className="mt-0.5 size-4 text-accent-11" />;
	}

	return (
		<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-grayscale-3 font-mono text-[9px] font-semibold text-grayscale-10">
			{glyph}
		</div>
	);
}

function PhaseIcon({ phase, tone }: { phase?: TimelinePhase; tone: Tone }) {
	if (!phase) {
		return null;
	}

	return (
		<span
			className={cx(
				"flex size-3.5 shrink-0 items-center justify-center",
				phase ? phaseClasses[phase] : toneClasses[tone],
			)}
		>
			<AnimatePresence initial={false} mode="popLayout">
				<motion.span
					animate={{ scale: 1, opacity: 1 }}
					className="flex items-center justify-center"
					exit={{ scale: 0.6, opacity: 0 }}
					initial={{ scale: 0.6, opacity: 0 }}
					key={phase ?? "glyph"}
					transition={{ duration: 0.15, ease: "easeOut" }}
				>
					{phase === "running" ? (
						<CircleNotchIcon className="size-3 animate-spin" weight="bold" />
					) : phase === "success" ? (
						<CheckCircleIcon className="size-3" weight="fill" />
					) : phase === "warning" ? (
						<WarningCircleIcon className="size-3" weight="fill" />
					) : phase === "failed" ? (
						<XCircleIcon className="size-3" weight="fill" />
					) : null}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

function DetailGrid({
	items,
}: {
	items: Array<[label: string, value: ReactNode | undefined]>;
}) {
	const visibleItems = items.filter(
		([, value]) => value !== undefined && value !== "",
	);

	if (visibleItems.length === 0) {
		return null;
	}

	return (
		<dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 py-0.5 text-[12px] leading-5">
			{visibleItems.map(([label, value]) => (
				<div className="contents" key={label}>
					<dt className="font-mono font-medium text-grayscale-9">{label}</dt>
					<dd className="min-w-0 break-words text-grayscale-11">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function MessageBubble({ text }: { text: string }) {
	return (
		<Streamdown
			className="min-w-0 max-w-full overflow-hidden break-words text-[13px] leading-6 text-grayscale-12 [&_a]:text-accent-11 [&_a]:underline-offset-2 [&_a:hover]:underline [&_p]:my-0"
			components={MESSAGE_COMPONENTS}
			dir="auto"
			linkSafety={MESSAGE_LINK_SAFETY}
			lineNumbers={false}
			mode="static"
		>
			{text}
		</Streamdown>
	);
}

function MarkdownCodeBlock({ children, className }: StreamdownCodeProps) {
	const content = children as ReactNode;
	const codeClassName = typeof className === "string" ? className : undefined;
	const language = codeClassName?.match(/language-(\S+)/)?.[1] ?? "tsx";
	const code = childrenToString(content).replace(/\n$/, "");

	return <CodeBlock code={code} language={language} />;
}

function InlineCode({ children }: StreamdownCodeProps) {
	return (
		<code
			className="rounded-none bg-grayscale-3 px-1.5 py-0.5 font-mono text-[0.85em]"
			data-streamdown="inline-code"
		>
			{children}
		</code>
	);
}

function childrenToString(children: ReactNode): string {
	if (typeof children === "string" || typeof children === "number") {
		return String(children);
	}

	if (Array.isArray(children)) {
		return children.map(childrenToString).join("");
	}

	return "";
}

function AttachmentGrid({ attachments }: { attachments: Attachment[] }) {
	if (attachments.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5">
			{attachments.map((attachment) => {
				const contentType =
					attachment.contentType || "application/octet-stream";
				const isImage = contentType.startsWith("image/");
				const subtitle = [
					formatContentType(contentType),
					formatFileSize(attachment.size),
				]
					.filter(Boolean)
					.join(" · ");

				return (
					<a
						className="group min-w-0 overflow-hidden rounded-md border border-grayscale-4 bg-grayscale-1 transition-colors hover:border-accent-7"
						href={attachment.url}
						key={attachment.id}
						rel="noreferrer"
						target="_blank"
					>
						{isImage && attachment.url ? (
							/* biome-ignore lint/performance/noImgElement: Instant Storage signed URLs are user uploads outside Next image config. */
							<img
								alt={attachment.name}
								className="aspect-square w-full object-cover"
								src={attachment.url}
							/>
						) : (
							<div className="flex aspect-square w-full items-center justify-center bg-grayscale-2 text-xs text-grayscale-10">
								<FileIcon className="size-6" weight="bold" />
							</div>
						)}
						<div className="min-w-0 px-2 py-1">
							<p className="truncate text-[11px] leading-4 text-grayscale-12">
								{attachment.name || "file"}
							</p>
							<p className="text-[10px] leading-4 text-grayscale-9">
								{subtitle}
							</p>
						</div>
					</a>
				);
			})}
		</div>
	);
}

function PlainCodeBlock({ children }: { children: string }) {
	return (
		<pre className="max-w-full overflow-x-auto rounded-md bg-grayscale-2 px-2 py-1.5 text-[11px] leading-5 text-grayscale-11 ring-1 ring-grayscale-4">
			<code>{children}</code>
		</pre>
	);
}

function OutputPreview({ output }: { output: string }) {
	const preview =
		output.length > OUTPUT_PREVIEW_LIMIT
			? output.slice(output.length - OUTPUT_PREVIEW_LIMIT)
			: output;

	return (
		<details className="group min-w-0 max-w-full overflow-hidden rounded-md bg-grayscale-2 ring-1 ring-grayscale-4">
			<summary className="cursor-pointer px-2 py-1 text-[11px] font-medium leading-4 text-grayscale-10">
				Output
				{output.length > OUTPUT_PREVIEW_LIMIT
					? ` (last ${formatNumber(OUTPUT_PREVIEW_LIMIT)} chars)`
					: ""}
			</summary>
			<pre className="max-h-64 max-w-full overflow-auto px-2 pb-2 text-[11px] leading-5 text-grayscale-11">
				<code>{preview}</code>
			</pre>
		</details>
	);
}

function RawPayload({ value }: { value: unknown }) {
	return (
		<details className="min-w-0 max-w-full overflow-hidden rounded-md bg-grayscale-2 ring-1 ring-grayscale-4">
			<summary className="cursor-pointer px-2 py-1 text-[11px] font-medium leading-4 text-grayscale-10">
				Payload
			</summary>
			<pre className="max-h-64 max-w-full overflow-auto px-2 pb-2 text-[11px] leading-5 text-grayscale-11">
				<code>{JSON.stringify(value, null, 2)}</code>
			</pre>
		</details>
	);
}

function asRecord(value: unknown): JsonRecord | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	return value as JsonRecord;
}

function getString(record: JsonRecord, key: string): string | undefined {
	const value = record[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(record: JsonRecord, key: string): number | undefined {
	const value = record[key];
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function getRecordArray(record: JsonRecord, key: string): JsonRecord[] {
	const value = record[key];

	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((item) => {
		const record = asRecord(item);
		return record ? [record] : [];
	});
}

function getAttachments(record: JsonRecord): Attachment[] {
	const items = [
		...getRecordArray(record, "attachments"),
		...getRecordArray(record, "images"),
	];

	return items.flatMap((item) => {
		const id = getString(item, "id") ?? getString(item, "path");
		const path = getString(item, "path");
		const name = getString(item, "name") ?? "file";
		const contentType =
			getString(item, "contentType") ?? "application/octet-stream";

		if (!id || !path) {
			return [];
		}

		return [
			{
				id,
				path,
				url: getString(item, "url"),
				name,
				contentType,
				size: getNumber(item, "size") ?? 0,
			},
		];
	});
}

function formatContentType(value: string) {
	if (value === "application/octet-stream") {
		return "FILE";
	}

	return value.replace(/^image\//, "").toUpperCase();
}

function formatTimestampMeta(value: unknown): TimestampMeta | undefined {
	const time = parseTimestamp(value);

	if (Number.isNaN(time)) {
		return undefined;
	}

	const date = new Date(time);

	return {
		dateTime: date.toISOString(),
		relative: formatRelativeTimestamp(time),
		time: date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		}),
		title: date.toLocaleString([], {
			dateStyle: "medium",
			timeStyle: "short",
		}),
	};
}

function formatRelativeTimestamp(time: number) {
	const diffSeconds = Math.round((time - Date.now()) / 1000);
	const absoluteSeconds = Math.abs(diffSeconds);

	if (absoluteSeconds < 45) {
		return "just now";
	}

	const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		["minute", 60],
		["hour", 60 * 60],
		["day", 60 * 60 * 24],
		["week", 60 * 60 * 24 * 7],
		["month", 60 * 60 * 24 * 30],
		["year", 60 * 60 * 24 * 365],
	];
	const formatter = new Intl.RelativeTimeFormat(undefined, {
		numeric: "auto",
		style: "narrow",
	});

	for (let index = 0; index < units.length; index += 1) {
		const [unit, unitSeconds] = units[index] ?? ["year", 60 * 60 * 24 * 365];
		const nextUnitSeconds = units[index + 1]?.[1];

		if (!nextUnitSeconds || absoluteSeconds < nextUnitSeconds) {
			return formatter.format(Math.round(diffSeconds / unitSeconds), unit);
		}
	}

	return formatter.format(
		Math.round(diffSeconds / (60 * 60 * 24 * 365)),
		"year",
	);
}

function getUserDisplayName(profile: UserDisplayProfile | undefined) {
	return (
		profile?.memberName?.trim() ||
		profile?.userName?.trim() ||
		profile?.email?.trim() ||
		"You"
	);
}

function parseTimestamp(value: unknown) {
	if (typeof value === "string") {
		const time = Date.parse(value);

		return Number.isNaN(time) ? Number.NaN : time;
	}

	if (value instanceof Date) {
		const time = value.getTime();

		return Number.isNaN(time) ? Number.NaN : time;
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	return Number.NaN;
}

function formatEventType(type: string) {
	const label = type
		.replace(/^codex\./, "")
		.replace(/^cursor\./, "")
		.replace(/^chaterface\./, "")
		.replace(/[._-]/g, " ");

	return label.charAt(0).toUpperCase() + label.slice(1);
}

function toneForStatus(status: string | undefined): Tone {
	if (!status) {
		return "neutral";
	}

	if (status.includes("fail") || status === "error") {
		return "danger";
	}

	if (status === "completed" || status === "running" || status === "stopped") {
		return "success";
	}

	if (status === "in_progress" || status === "started") {
		return "accent";
	}

	return "neutral";
}

function formatNumber(value: number | undefined) {
	return value === undefined
		? undefined
		: new Intl.NumberFormat().format(value);
}

function formatFileSize(size: number) {
	if (!Number.isFinite(size) || size <= 0) {
		return "0 B";
	}

	const units = ["B", "KB", "MB", "GB"];
	let value = size;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function summarizeCount(count: number, singular: string) {
	return `${formatNumber(count) ?? 0} ${singular}${count === 1 ? "" : "s"}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}
