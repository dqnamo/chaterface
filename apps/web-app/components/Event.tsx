import type { InstaQLEntity } from "@instantdb/react";
import type { ReactNode } from "react";
import type { AppSchema } from "@/instant.schema";
import Logo from "./Logo";

type EventEntity = InstaQLEntity<AppSchema, "events">;
type JsonRecord = Record<string, unknown>;
type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const OUTPUT_PREVIEW_LIMIT = 6000;

const toneClasses: Record<Tone, { icon: string; pill: string }> = {
	neutral: {
		icon: "bg-grayscale-3 text-grayscale-11",
		pill: "bg-grayscale-3 text-grayscale-11",
	},
	accent: {
		icon: "bg-accent-3 text-accent-11",
		pill: "bg-accent-3 text-accent-11",
	},
	success: {
		icon: "bg-accent-3 text-accent-11",
		pill: "bg-accent-3 text-accent-11",
	},
	warning: {
		icon: "bg-grayscale-3 text-grayscale-12",
		pill: "bg-grayscale-3 text-grayscale-12",
	},
	danger: {
		icon: "bg-red-100 text-red-700",
		pill: "bg-red-100 text-red-700",
	},
};

export default function Event({ event }: { event: EventEntity }) {
	const type = event.type ?? "event";
	const data = asRecord(event.data) ?? {};
	const timestamp = formatTimestamp(event.createdAt);

	if (type === "factoryplane.new_task") {
		return (
			<EventCard
				icon="FP"
				logo
				meta={timestamp}
				subtitle={getString(data, "taskId")}
				title="New task created"
				tone="accent"
			/>
		);
	}

	if (type === "factoryplane.new_user_message") {
		return (
			<EventCard icon="ME" meta={timestamp} title="Message sent" tone="neutral">
				<MessageBubble>
					{getString(data, "content") ?? "Empty message"}
				</MessageBubble>
			</EventCard>
		);
	}

	if (type.startsWith("factoryplane.service_")) {
		return <ServiceEvent data={data} timestamp={timestamp} type={type} />;
	}

	if (type === "codex.thread.started") {
		return (
			<EventCard
				icon="AI"
				meta={timestamp}
				subtitle={getString(data, "threadId")}
				title="Agent thread started"
				tone="accent"
			/>
		);
	}

	if (type === "codex.turn.completed") {
		return null;
	}

	if (type === "codex.turn.started") {
		return <CodexTurnStartedEvent timestamp={timestamp} />;
	}

	if (type.startsWith("codex.item.")) {
		return <CodexItemEvent data={data} timestamp={timestamp} type={type} />;
	}

	return (
		<EventCard
			icon="EV"
			meta={timestamp}
			subtitle={type}
			title={formatEventType(type)}
			tone={type.includes("failed") ? "danger" : "neutral"}
		>
			<RawPayload value={event.data} />
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
	const url = getString(data, "url");
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
			icon="SV"
			meta={timestamp}
			status={statusFromType(type)}
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

function CodexTurnStartedEvent({ timestamp }: { timestamp?: string }) {
	return (
		<EventCard
			icon="AI"
			meta={timestamp}
			status="started"
			title="Agent turn started"
			tone="accent"
		/>
	);
}

function CodexItemEvent({
	data,
	timestamp,
	type,
}: {
	data: JsonRecord;
	timestamp?: string;
	type: string;
}) {
	const item = asRecord(data.item);
	const itemType = item ? getString(item, "type") : undefined;

	if (!item) {
		return (
			<EventCard
				icon="AI"
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
			<EventCard
				icon="AI"
				meta={timestamp}
				status={getString(item, "status")}
				title="Agent message"
				tone="neutral"
			>
				<MessageBubble>
					{getString(item, "text") ?? "No message text"}
				</MessageBubble>
			</EventCard>
		);
	}

	if (itemType === "command_execution") {
		return (
			<CommandExecutionEvent item={item} timestamp={timestamp} type={type} />
		);
	}

	if (itemType === "file_change") {
		return <FileChangeEvent item={item} timestamp={timestamp} type={type} />;
	}

	return (
		<EventCard
			icon="IT"
			meta={timestamp}
			status={getString(item, "status")}
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
	timestamp,
	type,
}: {
	item: JsonRecord;
	timestamp?: string;
	type: string;
}) {
	const command = getString(item, "command");
	const exitCode = getNumber(item, "exit_code");
	const status = getString(item, "status") ?? statusFromType(type);
	const output = getString(item, "aggregated_output");
	const tone = exitCode && exitCode !== 0 ? "danger" : toneForStatus(status);
	const title =
		tone === "danger"
			? "Command failed"
			: type.endsWith(".started")
				? "Command started"
				: "Command completed";

	return (
		<EventCard
			icon="$"
			meta={timestamp}
			status={status}
			subtitle={exitCode === undefined ? undefined : `exit ${exitCode}`}
			title={title}
			tone={tone}
		>
			{command ? <CodeBlock>{command}</CodeBlock> : null}
			{output ? <OutputPreview output={output} /> : null}
		</EventCard>
	);
}

function FileChangeEvent({
	item,
	timestamp,
	type,
}: {
	item: JsonRecord;
	timestamp?: string;
	type: string;
}) {
	const changes = getRecordArray(item, "changes");
	const status = getString(item, "status") ?? statusFromType(type);

	return (
		<EventCard
			icon="FS"
			meta={timestamp}
			status={status}
			subtitle={summarizeCount(changes.length, "file change")}
			title={
				type.endsWith(".started")
					? "File change started"
					: "File change completed"
			}
			tone={toneForStatus(status)}
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

function EventCard({
	children,
	icon,
	logo = false,
	meta,
	status,
	subtitle,
	title,
	tone,
}: {
	children?: ReactNode;
	icon: string;
	logo?: boolean;
	meta?: string;
	status?: string;
	subtitle?: ReactNode;
	title: string;
	tone: Tone;
}) {
	const classes = toneClasses[tone];

	return (
		<article className="py-2">
			<div className="flex gap-2.5">
				<div
					className={cx(
						"mt-0.5 flex size-7 shrink-0 items-center justify-center font-mono text-[10px] font-semibold",
						classes.icon,
					)}
				>
					{logo ? <Logo size={4} /> : icon}
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex min-w-0 flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<p className="font-medium text-sm text-grayscale-12">{title}</p>
							{status ? <StatusPill status={status} tone={tone} /> : null}
							{meta ? (
								<span className="text-[11px] text-grayscale-10">{meta}</span>
							) : null}
						</div>
						{subtitle ? (
							<p className="break-words font-mono text-[11px] text-grayscale-10">
								{subtitle}
							</p>
						) : null}
					</div>
					{children ? (
						<div className="flex flex-col gap-2">{children}</div>
					) : null}
				</div>
			</div>
		</article>
	);
}

function StatusPill({ status, tone }: { status: string; tone: Tone }) {
	return (
		<span
			className={cx(
				"px-2 py-0.5 font-mono text-[10px] font-medium uppercase leading-none",
				toneClasses[tone].pill,
			)}
		>
			{formatStatus(status)}
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
		<dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
			{visibleItems.map(([label, value]) => (
				<div className="contents" key={label}>
					<dt className="font-medium text-grayscale-10">{label}</dt>
					<dd className="min-w-0 break-words text-grayscale-12">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function MessageBubble({ children }: { children: ReactNode }) {
	return (
		<div className="whitespace-pre-wrap text-sm leading-6 text-grayscale-12">
			{children}
		</div>
	);
}

function CodeBlock({ children }: { children: string }) {
	return (
		<pre className="overflow-x-auto bg-grayscale-2 p-2 text-[11px] leading-5 text-grayscale-12">
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
		<details className="group bg-grayscale-2">
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
		<details className="rounded-md bg-grayscale-2">
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
	if (typeof value !== "string") {
		return undefined;
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return undefined;
	}

	return date.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatEventType(type: string) {
	const label = type
		.replace(/^codex\./, "")
		.replace(/^factoryplane\./, "")
		.replace(/[._-]/g, " ");

	return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatStatus(status: string) {
	return status.replace(/[._-]/g, " ");
}

function statusFromType(type: string) {
	return (
		type
			.split(".")
			.at(-1)
			?.replace(/^service_/, "") ?? "event"
	);
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
