import type { InstaQLEntity } from "@instantdb/react";
import {
	CheckCircleIcon,
	CircleNotchIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { type LinkSafetyConfig, Streamdown } from "streamdown";
import type { AppSchema } from "@/instant.schema";
import Logo from "./Logo";

type EventEntity = InstaQLEntity<AppSchema, "events">;
type JsonRecord = Record<string, unknown>;
type TaskSummary = {
	id?: string;
	name?: string;
	instructions?: string;
};
type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

/** A resolved lifecycle state for a grouped (started -> finished) timeline row. */
export type TimelinePhase = "running" | "success" | "failed";

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

const OUTPUT_PREVIEW_LIMIT = 6000;
const MESSAGE_LINK_SAFETY = { enabled: false } satisfies LinkSafetyConfig;
const previewsDomain =
	process.env.NEXT_PUBLIC_FACTORYPLANE_PREVIEWS_DOMAIN ??
	"previews.factoryplane.com";

const toneClasses: Record<Tone, string> = {
	neutral: "bg-grayscale-3 text-grayscale-11",
	accent: "bg-accent-3 text-accent-11",
	success: "bg-green-3 text-green-11",
	warning: "bg-grayscale-3 text-grayscale-12",
	danger: "bg-red-3 text-red-11",
};

const phaseClasses: Record<TimelinePhase, string> = {
	running: "bg-accent-3 text-accent-11",
	success: "bg-green-3 text-green-11",
	failed: "bg-red-3 text-red-11",
};

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
			type === "factoryplane.new_task" ||
			type === "factoryplane.new_user_message"
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

	if (type.startsWith("factoryplane.setup_step_")) {
		const step = getString(data, "step") ?? "step";
		const phase: TimelinePhase = type.endsWith("_failed")
			? "failed"
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

	if (type === "factoryplane.new_task") {
		return 0;
	}

	if (type === "factoryplane.new_user_message") {
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

	if (type.endsWith("_completed") || type.endsWith("_failed")) {
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

	if (prev === "success" || next === "success") {
		return "success";
	}

	return next;
}

export default function Event({
	node,
	task,
}: {
	node: TimelineNode;
	task?: TaskSummary;
}) {
	const { event, phase } = node;
	const type = event.type ?? "event";
	const data = asRecord(event.data) ?? {};
	const timestamp = formatTimestamp(event.createdAt);

	if (type === "factoryplane.new_task") {
		return <NewTaskEvent data={data} task={task} timestamp={timestamp} />;
	}

	if (type === "factoryplane.new_user_message") {
		return (
			<EventCard
				glyph="ME"
				meta={timestamp}
				title="Message sent"
				tone="neutral"
			>
				<MessageBubble text={getString(data, "content") ?? "Empty message"} />
			</EventCard>
		);
	}

	if (type.startsWith("factoryplane.service_")) {
		return <ServiceEvent data={data} timestamp={timestamp} type={type} />;
	}

	if (type.startsWith("factoryplane.repository_")) {
		return <RepositoryEvent data={data} timestamp={timestamp} type={type} />;
	}

	if (type.startsWith("factoryplane.setup_step_")) {
		return <SetupStepEvent data={data} phase={phase} timestamp={timestamp} />;
	}

	if (type === "codex.thread.started") {
		return (
			<EventCard
				glyph="AI"
				meta={timestamp}
				subtitle={getString(data, "thread_id") ?? getString(data, "threadId")}
				title="Agent connected"
				tone="accent"
			/>
		);
	}

	if (type === "codex.turn.started" || type === "codex.turn.completed") {
		return <TurnEvent data={data} phase={phase} timestamp={timestamp} />;
	}

	if (type.startsWith("codex.item.")) {
		return (
			<CodexItemEvent
				data={data}
				phase={phase}
				timestamp={timestamp}
				type={type}
			/>
		);
	}

	return (
		<EventCard
			glyph="EV"
			meta={timestamp}
			phase={type.includes("failed") ? "failed" : undefined}
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

	return (
		<EventCard
			glyph="FP"
			logo
			meta={timestamp}
			subtitle={name ? "New task created" : taskId}
			title={name ?? "New task created"}
			tone="accent"
		>
			{instructions ? <MessageBubble text={instructions} /> : null}
			{name ? <DetailGrid items={[["task", taskId]]} /> : null}
		</EventCard>
	);
}

function TurnEvent({
	data,
	phase,
	timestamp,
}: {
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
			glyph="AI"
			logo
			meta={timestamp}
			phase={resolvedPhase}
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
	const url = getPublicServiceUrl(data);
	const isFailure = type.includes("failed");
	const title =
		type === "factoryplane.service_started"
			? "Service started"
			: type === "factoryplane.service_stopped"
				? "Service stopped"
				: type === "factoryplane.service_failed"
					? "Service failed"
					: "Service stop failed";

	return (
		<EventCard
			glyph="SV"
			meta={timestamp}
			phase={isFailure ? "failed" : "success"}
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
						url ? (
							<a
								className="text-accent-11 underline-offset-2 hover:underline"
								href={url}
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

function getPublicServiceUrl(data: JsonRecord) {
	const url = getString(data, "url");

	if (url && !url.includes(".e2b.app")) {
		return url;
	}

	const serviceId = getString(data, "serviceId");

	return serviceId ? `https://${serviceId}.${previewsDomain}` : undefined;
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
		type === "factoryplane.repository_created"
			? "Repository added"
			: type === "factoryplane.repository_updated"
				? "Repository updated"
				: "Repository removed";

	return (
		<EventCard
			glyph="RP"
			meta={timestamp}
			phase="success"
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

function CodexItemEvent({
	data,
	phase,
	timestamp,
	type,
}: {
	data: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
	type: string;
}) {
	const item = asRecord(data.item);
	const itemType = item ? getString(item, "type") : undefined;

	if (!item) {
		return (
			<EventCard
				glyph="AI"
				meta={timestamp}
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
				text={getString(item, "text") ?? "No message text"}
				timestamp={timestamp}
			/>
		);
	}

	if (itemType === "command_execution") {
		return (
			<CommandExecutionEvent item={item} phase={phase} timestamp={timestamp} />
		);
	}

	if (itemType === "file_change") {
		return <FileChangeEvent item={item} phase={phase} timestamp={timestamp} />;
	}

	return (
		<EventCard
			glyph="IT"
			meta={timestamp}
			subtitle={itemType}
			title={formatEventType(type)}
			tone={toneForStatus(getString(item, "status"))}
		>
			<RawPayload value={item} />
		</EventCard>
	);
}

function CommandExecutionEvent({
	item,
	phase,
	timestamp,
}: {
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
			glyph="$"
			meta={timestamp}
			phase={resolvedPhase}
			subtitle={exitCode === undefined ? undefined : `exit ${exitCode}`}
			title={title}
			tone="accent"
		>
			{command ? <CodeBlock>{command}</CodeBlock> : null}
			{output ? <OutputPreview output={output} /> : null}
		</EventCard>
	);
}

function FileChangeEvent({
	item,
	phase,
	timestamp,
}: {
	item: JsonRecord;
	phase?: TimelinePhase;
	timestamp?: string;
}) {
	const changes = getRecordArray(item, "changes");
	const resolvedPhase = phase ?? "running";

	return (
		<EventCard
			glyph="FS"
			meta={timestamp}
			phase={resolvedPhase}
			subtitle={summarizeCount(changes.length, "file change")}
			title={
				resolvedPhase === "success" ? "File changes" : "Writing file changes"
			}
			tone="accent"
		>
			{changes.length > 0 ? (
				<ul className="flex flex-col gap-1">
					{changes.slice(0, 6).map((change) => {
						const kind = getString(change, "kind") ?? "update";
						const path = getString(change, "path") ?? "unknown path";

						return (
							<li
								className="flex min-w-0 items-center gap-2 py-1"
								key={`${kind}-${path}`}
							>
								<span className="shrink-0 bg-grayscale-3 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-grayscale-11">
									{kind}
								</span>
								<span className="truncate font-mono text-[11px] text-grayscale-11">
									{path}
								</span>
							</li>
						);
					})}
					{changes.length > 6 ? (
						<li className="px-2 text-xs text-grayscale-10">
							+{changes.length - 6} more
						</li>
					) : null}
				</ul>
			) : null}
		</EventCard>
	);
}

function AgentMessage({
	text,
	timestamp,
}: {
	text: string;
	timestamp?: string;
}) {
	return (
		<EventCard
			glyph="AI"
			logo
			meta={timestamp}
			title="Agent message"
			tone="accent"
		>
			<MessageBubble text={text} />
		</EventCard>
	);
}

function EventCard({
	children,
	glyph,
	logo = false,
	meta,
	phase,
	subtitle,
	title,
	tone,
}: {
	children?: ReactNode;
	glyph: string;
	logo?: boolean;
	meta?: string;
	phase?: TimelinePhase;
	subtitle?: ReactNode;
	title: string;
	tone: Tone;
}) {
	return (
		<motion.article
			animate={{ opacity: 1, y: 0 }}
			className="group relative py-2"
			initial={{ opacity: 0, y: 6 }}
			layout="position"
			transition={{ duration: 0.18, ease: "easeOut" }}
		>
			<div className="flex min-w-0 flex-col gap-2 rounded-md border border-transparent px-3 py-2.5 transition-colors duration-150 group-hover:border-grayscale-4 group-hover:bg-grayscale-2/60">
				<div className="flex min-w-0 items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-2.5">
						<StatusIcon glyph={glyph} logo={logo} phase={phase} tone={tone} />
						<div className="min-w-0 pt-0.5">
							<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
								<p className="font-medium text-sm leading-5 text-grayscale-12">
									{title}
								</p>
								{subtitle ? (
									<p className="break-words font-mono text-[11px] leading-4 text-grayscale-10">
										{subtitle}
									</p>
								) : null}
							</div>
						</div>
					</div>
					{meta ? (
						<time className="shrink-0 pt-0.5 text-[11px] leading-5 text-grayscale-10">
							{meta}
						</time>
					) : null}
				</div>
				{children ? (
					<div className="flex min-w-0 flex-col gap-2 pl-8">{children}</div>
				) : null}
			</div>
		</motion.article>
	);
}

function StatusIcon({
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
	return (
		<div
			className={cx(
				"flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-semibold ring-1 ring-inset ring-current/10",
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
						<CircleNotchIcon className="size-3.5 animate-spin" weight="bold" />
					) : phase === "success" ? (
						<CheckCircleIcon className="size-3.5" weight="fill" />
					) : phase === "failed" ? (
						<XCircleIcon className="size-3.5" weight="fill" />
					) : logo ? (
						<Logo size={3} />
					) : (
						glyph
					)}
				</motion.span>
			</AnimatePresence>
		</div>
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
		<dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md bg-grayscale-2 px-3 py-2 text-xs">
			{visibleItems.map(([label, value]) => (
				<div className="contents" key={label}>
					<dt className="font-medium text-grayscale-10">{label}</dt>
					<dd className="min-w-0 break-words text-grayscale-12">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function MessageBubble({ text }: { text: string }) {
	return (
		<Streamdown
			className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-grayscale-12 ring-1 ring-grayscale-4 [&_a]:text-accent-11 [&_a]:underline-offset-2 [&_a:hover]:underline [&_[data-streamdown=code-block]]:my-2 [&_[data-streamdown=code-block]]:rounded-md [&_[data-streamdown=code-block]]:border-grayscale-4 [&_[data-streamdown=code-block]]:bg-grayscale-2 [&_[data-streamdown=code-block-body]]:rounded-md [&_[data-streamdown=inline-code]]:rounded-sm [&_[data-streamdown=inline-code]]:bg-grayscale-3"
			dir="auto"
			linkSafety={MESSAGE_LINK_SAFETY}
			lineNumbers={false}
			mode="static"
		>
			{text}
		</Streamdown>
	);
}

function CodeBlock({ children }: { children: string }) {
	return (
		<pre className="overflow-x-auto rounded-md bg-grayscale-2 p-2 text-[11px] leading-5 text-grayscale-12 ring-1 ring-grayscale-4">
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
		<details className="group rounded-md bg-grayscale-2 ring-1 ring-grayscale-4">
			<summary className="cursor-pointer px-2 py-1.5 text-xs font-medium text-grayscale-11">
				Output
				{output.length > OUTPUT_PREVIEW_LIMIT
					? ` (last ${formatNumber(OUTPUT_PREVIEW_LIMIT)} chars)`
					: ""}
			</summary>
			<pre className="max-h-64 overflow-auto p-2 text-[11px] leading-5 text-grayscale-12">
				<code>{preview}</code>
			</pre>
		</details>
	);
}

function RawPayload({ value }: { value: unknown }) {
	return (
		<details className="rounded-md bg-grayscale-2 ring-1 ring-grayscale-4">
			<summary className="cursor-pointer px-2 py-1.5 text-xs font-medium text-grayscale-11">
				Payload
			</summary>
			<pre className="max-h-64 overflow-auto p-2 text-[11px] leading-5 text-grayscale-12">
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

function formatTimestamp(value: unknown): string | undefined {
	const time = parseTimestamp(value);

	if (Number.isNaN(time)) {
		return undefined;
	}

	const date = new Date(time);

	return date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
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
		.replace(/^factoryplane\./, "")
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

function summarizeCount(count: number, singular: string) {
	return `${formatNumber(count) ?? 0} ${singular}${count === 1 ? "" : "s"}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}
