import type { InstaQLEntity } from "@instantdb/core";
import type { AppSchema } from "./schema.js";

/**
 * Platform-neutral logic for turning a task's raw event log into a renderable
 * timeline. The web app and the mobile app render very different chrome, but
 * they agree on which events exist, how lifecycle pairs fold together, and what
 * each event means — that shared understanding lives here.
 */

export type TaskEvent = InstaQLEntity<AppSchema, "events">;
export type JsonRecord = Record<string, unknown>;

/** A resolved lifecycle state for a grouped (started -> finished) timeline row. */
export type TimelinePhase = "running" | "success" | "warning" | "failed";

/**
 * A single row in the timeline. Lifecycle events that share a key (e.g. a
 * setup step's `started` and `completed` events) are folded into one node so
 * the row stays in place and just updates its icon as it progresses.
 */
export type TimelineNode = {
	key: string;
	event: TaskEvent;
	phase?: TimelinePhase;
	startedAt?: string;
};

export type Attachment = {
	id: string;
	path: string;
	url?: string;
	name: string;
	contentType: string;
	size: number;
};

export type UserDisplayProfile = {
	id: string;
	email?: string;
	memberName?: string;
	userName?: string;
};

type TimelineContext = {
	runKey: string;
	turnKey: string;
};

/**
 * Folds a flat list of events into timeline nodes, merging lifecycle pairs
 * (started/completed/failed) that describe the same underlying unit of work.
 */
export function buildTimeline(events: readonly TaskEvent[]): TimelineNode[] {
	const sorted = [...events].sort(compareEvents);
	const nodes: TimelineNode[] = [];
	const indexByKey = new Map<string, number>();
	let unscopedRunIndex = 0;
	let runKey = `run:unscoped:${unscopedRunIndex}`;
	let turnKey = `turn:${runKey}:pending`;

	const upsertNode = (key: string, event: TaskEvent, phase?: TimelinePhase) => {
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
	event: TaskEvent,
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

function compareEvents(a: TaskEvent, b: TaskEvent) {
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

function getEventTime(event: TaskEvent) {
	const timestamp =
		event.createdAt ??
		getString((event as unknown as JsonRecord) ?? {}, "serverCreatedAt");
	const time = parseTimestamp(timestamp);

	return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function getEventSortRank(event: TaskEvent) {
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

export function mergePhase(
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

/**
 * A description of what a timeline node *is*, with no styling attached. Each
 * client maps these to its own chrome.
 */
export type TimelineEntry =
	| {
			kind: "new_task";
			taskId?: string;
			name?: string;
			instructions?: string;
			attachments: Attachment[];
	  }
	| {
			kind: "user_message";
			userId?: string;
			content?: string;
			attachments: Attachment[];
	  }
	| { kind: "agent_message"; text: string }
	| { kind: "agent_connected"; threadId?: string }
	| { kind: "turn"; phase: TimelinePhase; usage?: TokenUsage }
	| {
			kind: "setup_step";
			phase: TimelinePhase;
			step?: string;
			title: string;
			error?: string;
	  }
	| {
			kind: "command";
			phase: TimelinePhase;
			command?: string;
			exitCode?: number;
			output?: string;
	  }
	| { kind: "file_change"; phase: TimelinePhase; changes: FileChange[] }
	| {
			kind: "service";
			phase: TimelinePhase;
			title: string;
			name: string;
			serviceId?: string;
			portNumber?: number;
			url?: string;
			error?: string;
	  }
	| {
			kind: "repository";
			title: string;
			url?: string;
			repositoryId?: string;
			path?: string;
			branch?: string;
	  }
	| {
			kind: "pull_request";
			title: string;
			url?: string;
			mergeMethod?: string;
			sha?: string;
	  }
	| {
			kind: "unknown";
			title: string;
			subtitle?: string;
			phase?: TimelinePhase;
			payload: unknown;
	  };

export type TokenUsage = {
	inputTokens?: number;
	outputTokens?: number;
	cachedInputTokens?: number;
	reasoningOutputTokens?: number;
};

export type FileChange = {
	kind: string;
	path: string;
};

/** Maps a timeline node onto a structured, render-agnostic description. */
export function describeTimelineNode(node: TimelineNode): TimelineEntry {
	const { event, phase } = node;
	const type = event.type ?? "event";
	const data = asRecord(event.data) ?? {};

	if (type === "chaterface.new_task") {
		return {
			kind: "new_task",
			taskId: getString(data, "taskId"),
			name: getString(data, "name"),
			instructions: getString(data, "instructions"),
			attachments: getAttachments(data),
		};
	}

	if (type === "chaterface.new_user_message") {
		return {
			kind: "user_message",
			userId: getString(data, "userId"),
			content: getString(data, "content"),
			attachments: getAttachments(data),
		};
	}

	if (type === "codex.thread.started") {
		return {
			kind: "agent_connected",
			threadId: getString(data, "thread_id") ?? getString(data, "threadId"),
		};
	}

	if (type === "codex.turn.started" || type === "codex.turn.completed") {
		const usage = asRecord(data.usage);

		return {
			kind: "turn",
			phase: phase ?? "running",
			usage: usage
				? {
						inputTokens: getNumber(usage, "input_tokens"),
						outputTokens: getNumber(usage, "output_tokens"),
						cachedInputTokens: getNumber(usage, "cached_input_tokens"),
						reasoningOutputTokens: getNumber(usage, "reasoning_output_tokens"),
					}
				: undefined,
		};
	}

	if (type.startsWith("chaterface.setup_step_")) {
		return {
			kind: "setup_step",
			phase: phase ?? "running",
			step: getString(data, "step"),
			title: getString(data, "title") ?? "Setup step",
			error: getString(data, "error"),
		};
	}

	if (type.startsWith("chaterface.service_")) {
		const isFailure = type.includes("failed");

		return {
			kind: "service",
			phase: isFailure ? "failed" : "success",
			title:
				type === "chaterface.service_started"
					? "Service started"
					: type === "chaterface.service_stopped"
						? "Service stopped"
						: type === "chaterface.service_failed"
							? "Service failed"
							: "Service stop failed",
			name: getString(data, "name") ?? "Service",
			serviceId: getString(data, "serviceId"),
			portNumber: getNumber(data, "portNumber"),
			url: getString(data, "url"),
			error: getString(data, "error"),
		};
	}

	if (type.startsWith("chaterface.repository_")) {
		return {
			kind: "repository",
			title:
				type === "chaterface.repository_created"
					? "Repository added"
					: type === "chaterface.repository_updated"
						? "Repository updated"
						: "Repository removed",
			url: getString(data, "url"),
			repositoryId: getString(data, "repositoryId"),
			path: getString(data, "path"),
			branch: getString(data, "branch"),
		};
	}

	if (
		type === "chaterface.pull_request_attached" ||
		type === "chaterface.pull_request_merged"
	) {
		return {
			kind: "pull_request",
			title:
				type === "chaterface.pull_request_merged"
					? "Pull request merged"
					: "Pull request attached",
			url: getString(data, "url"),
			mergeMethod: getString(data, "mergeMethod"),
			sha: getString(data, "sha"),
		};
	}

	if (type.startsWith("codex.item.")) {
		const item = asRecord(data.item);
		const itemType = item ? getString(item, "type") : undefined;

		if (item && itemType === "agent_message") {
			return {
				kind: "agent_message",
				text: getString(item, "text") ?? "No message text",
			};
		}

		if (item && itemType === "command_execution") {
			return {
				kind: "command",
				phase: phase ?? "running",
				command: getString(item, "command"),
				exitCode: getNumber(item, "exit_code"),
				output: getString(item, "aggregated_output"),
			};
		}

		if (item && itemType === "file_change") {
			return {
				kind: "file_change",
				phase: phase ?? "running",
				changes: getRecordArray(item, "changes").map((change) => ({
					kind: getString(change, "kind") ?? "update",
					path: getString(change, "path") ?? "unknown path",
				})),
			};
		}

		return {
			kind: "unknown",
			title: formatEventType(type),
			subtitle: itemType ?? type,
			phase,
			payload: item ?? data,
		};
	}

	return {
		kind: "unknown",
		title: formatEventType(type),
		subtitle: type,
		phase: type.includes("failed") ? "failed" : phase,
		payload: event.data,
	};
}

export function asRecord(value: unknown): JsonRecord | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	return value as JsonRecord;
}

export function getString(record: JsonRecord, key: string): string | undefined {
	const value = record[key];

	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getNumber(record: JsonRecord, key: string): number | undefined {
	const value = record[key];

	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

export function getRecordArray(record: JsonRecord, key: string): JsonRecord[] {
	const value = record[key];

	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((item) => {
		const record = asRecord(item);

		return record ? [record] : [];
	});
}

export function getAttachments(record: JsonRecord): Attachment[] {
	const items = [
		...getRecordArray(record, "attachments"),
		// `images` is the legacy key for attachments recorded before the rename.
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

export function parseTimestamp(value: unknown): number {
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

export function formatEventType(type: string): string {
	const label = type
		.replace(/^codex\./, "")
		.replace(/^cursor\./, "")
		.replace(/^chaterface\./, "")
		.replace(/[._-]/g, " ");

	return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatRelativeTimestamp(time: number): string {
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

export function getUserDisplayName(
	profile: UserDisplayProfile | undefined,
): string {
	return (
		profile?.memberName?.trim() ||
		profile?.userName?.trim() ||
		profile?.email?.trim() ||
		"You"
	);
}

export function formatNumber(value: number | undefined): string | undefined {
	return value === undefined
		? undefined
		: new Intl.NumberFormat().format(value);
}

export function formatFileSize(size: number): string {
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

export function summarizeCount(count: number, singular: string): string {
	return `${formatNumber(count) ?? 0} ${singular}${count === 1 ? "" : "s"}`;
}
