import {
	describeTimelineNode,
	formatNumber,
	getUserDisplayName,
	summarizeCount,
	type TimelineEntry,
	type TimelineNode,
	type TimelinePhase,
	type UserDisplayProfile,
} from "@repo/db/timeline";
import * as Linking from "expo-linking";
import {
	AlertTriangle,
	CheckCircle2,
	FileDiff,
	FolderGit2,
	GitPullRequest,
	Loader,
	type LucideIcon,
	Server,
	Sparkles,
	Terminal,
	Wrench,
	XCircle,
} from "lucide-react-native";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { Message, MessageResponse } from "@/components/chat";
import { Icon } from "@/components/icon";
import { cn } from "@/utils/tailwind";

const MAX_LISTED_FILE_CHANGES = 6;
const OUTPUT_PREVIEW_LIMIT = 1200;

/**
 * Renders one folded timeline node. The `describeTimelineNode` call is shared
 * with the web app, so both clients agree on what each event means; only the
 * chrome below is mobile-specific.
 */
export const TimelineEvent = memo(function TimelineEvent({
	agentName,
	currentUserProfile,
	node,
	userProfiles,
}: {
	agentName?: string;
	currentUserProfile?: UserDisplayProfile;
	node: TimelineNode;
	userProfiles?: Record<string, UserDisplayProfile>;
}) {
	const entry = describeTimelineNode(node);
	const timestamp = formatTime(node.event.createdAt);

	switch (entry.kind) {
		case "new_task":
			return (
				<SystemRow
					icon={Sparkles}
					phase="success"
					subtitle={entry.instructions}
					timestamp={timestamp}
					title={entry.name ?? "New task created"}
				/>
			);

		case "user_message": {
			const profile = entry.userId
				? userProfiles?.[entry.userId]
				: currentUserProfile;

			return (
				<View className="gap-1">
					<Text className="text-[11px] text-muted-foreground text-right pr-1">
						{getUserDisplayName(profile)}
						{timestamp ? ` · ${timestamp}` : ""}
					</Text>
					<Message from="user">{entry.content ?? ""}</Message>
				</View>
			);
		}

		case "agent_message":
			return (
				<View className="gap-1 mb-2">
					<Text className="text-[11px] text-muted-foreground">
						{agentName ?? "Agent"}
						{timestamp ? ` · ${timestamp}` : ""}
					</Text>
					<Message from="assistant">
						<MessageResponse>{entry.text}</MessageResponse>
					</Message>
				</View>
			);

		case "agent_connected":
			return (
				<SystemRow
					icon={Sparkles}
					phase="success"
					subtitle={entry.threadId}
					timestamp={timestamp}
					title="Agent connected"
				/>
			);

		case "turn":
			return (
				<SystemRow
					icon={Sparkles}
					phase={entry.phase}
					subtitle={formatUsage(entry.usage)}
					timestamp={timestamp}
					title={
						entry.phase === "success"
							? "Agent turn completed"
							: entry.phase === "failed"
								? "Agent turn failed"
								: "Agent turn started"
					}
				/>
			);

		case "setup_step":
			return (
				<SystemRow
					icon={Wrench}
					phase={entry.phase}
					subtitle={entry.error ?? entry.step}
					timestamp={timestamp}
					title={entry.title}
				/>
			);

		case "command":
			return (
				<SystemRow
					icon={Terminal}
					phase={entry.phase}
					timestamp={timestamp}
					title={
						entry.phase === "failed"
							? "Command failed"
							: entry.phase === "success"
								? "Command completed"
								: "Running command"
					}
					trailing={
						entry.exitCode === undefined ? undefined : `exit ${entry.exitCode}`
					}
				>
					{entry.command ? <CodeLine>{entry.command}</CodeLine> : null}
					{entry.output ? (
						<CodeLine muted>{truncate(entry.output)}</CodeLine>
					) : null}
				</SystemRow>
			);

		case "file_change":
			return (
				<SystemRow
					icon={FileDiff}
					phase={entry.phase}
					timestamp={timestamp}
					title={
						entry.phase === "success" ? "File changes" : "Writing file changes"
					}
					trailing={summarizeCount(entry.changes.length, "file change")}
				>
					{entry.changes.slice(0, MAX_LISTED_FILE_CHANGES).map((change) => (
						<View
							className="flex-row items-center gap-2"
							key={`${change.kind}-${change.path}`}
						>
							<Text className="text-[9px] font-medium uppercase text-muted-foreground bg-muted px-1.5 py-px rounded">
								{change.kind}
							</Text>
							<Text
								className="flex-1 text-[11px] text-muted-foreground"
								numberOfLines={1}
							>
								{change.path}
							</Text>
						</View>
					))}
					{entry.changes.length > MAX_LISTED_FILE_CHANGES ? (
						<Text className="text-[11px] text-muted-foreground">
							+{entry.changes.length - MAX_LISTED_FILE_CHANGES} more
						</Text>
					) : null}
				</SystemRow>
			);

		case "service":
			return (
				<SystemRow
					icon={Server}
					phase={entry.phase}
					subtitle={entry.error ?? entry.name}
					timestamp={timestamp}
					title={entry.title}
					trailing={
						entry.portNumber === undefined
							? undefined
							: `port ${entry.portNumber}`
					}
				>
					{entry.url ? <LinkLine url={entry.url} /> : null}
				</SystemRow>
			);

		case "repository":
			return (
				<SystemRow
					icon={FolderGit2}
					phase="success"
					subtitle={entry.url ?? entry.repositoryId}
					timestamp={timestamp}
					title={entry.title}
					trailing={entry.branch}
				/>
			);

		case "pull_request":
			return (
				<SystemRow
					icon={GitPullRequest}
					phase="success"
					timestamp={timestamp}
					title={entry.title}
					trailing={entry.mergeMethod}
				>
					{entry.url ? <LinkLine url={entry.url} /> : null}
				</SystemRow>
			);

		default:
			return (
				<SystemRow
					icon={Wrench}
					phase={entry.phase}
					subtitle={entry.subtitle}
					timestamp={timestamp}
					title={entry.title}
				/>
			);
	}
});

const phaseIcons: Record<TimelinePhase, LucideIcon> = {
	running: Loader,
	success: CheckCircle2,
	warning: AlertTriangle,
	failed: XCircle,
};

const phaseColors: Record<TimelinePhase, string> = {
	running: "text-muted-foreground",
	success: "text-muted-foreground",
	warning: "text-muted-foreground",
	failed: "text-red-500",
};

function SystemRow({
	children,
	icon,
	phase,
	subtitle,
	timestamp,
	title,
	trailing,
}: {
	children?: React.ReactNode;
	icon: LucideIcon;
	phase?: TimelinePhase;
	subtitle?: string;
	timestamp?: string;
	title: string;
	trailing?: string;
}) {
	// A failed phase gets the phase glyph so it stands out; otherwise the
	// event's own icon is more informative than a generic checkmark.
	const GlyphIcon = phase === "failed" ? phaseIcons.failed : icon;
	const glyphColor = phase ? phaseColors[phase] : "text-muted-foreground";

	return (
		<View className="flex-row gap-2.5 py-1.5 mb-1">
			<View className="pt-0.5">
				<Icon icon={GlyphIcon} className={cn("w-4 h-4", glyphColor)} />
			</View>
			<View className="flex-1 gap-1">
				<View className="flex-row items-baseline gap-2 flex-wrap">
					<Text className="text-[13px] font-medium text-foreground">
						{title}
					</Text>
					{trailing ? (
						<Text className="text-[11px] text-muted-foreground">
							{trailing}
						</Text>
					) : null}
					{timestamp ? (
						<Text className="text-[11px] text-muted-foreground">
							{timestamp}
						</Text>
					) : null}
				</View>
				{subtitle ? (
					<Text className="text-[12px] text-muted-foreground" numberOfLines={4}>
						{subtitle}
					</Text>
				) : null}
				{children}
			</View>
		</View>
	);
}

function CodeLine({
	children,
	muted = false,
}: {
	children: string;
	muted?: boolean;
}) {
	return (
		<View className="rounded-lg bg-muted px-2.5 py-2 border-continuous">
			<Text
				className={cn(
					"text-[11px]",
					muted ? "text-muted-foreground" : "text-foreground",
				)}
			>
				{children}
			</Text>
		</View>
	);
}

function LinkLine({ url }: { url: string }) {
	return (
		<Pressable onPress={() => void Linking.openURL(url)}>
			<Text className="text-[12px] text-blue-500" numberOfLines={1}>
				{url}
			</Text>
		</Pressable>
	);
}

function formatUsage(usage: TimelineEntryUsage) {
	if (!usage) {
		return undefined;
	}

	const parts = [
		usage.inputTokens === undefined
			? undefined
			: `${formatNumber(usage.inputTokens)} in`,
		usage.outputTokens === undefined
			? undefined
			: `${formatNumber(usage.outputTokens)} out`,
	].filter(Boolean);

	return parts.length > 0 ? parts.join(" · ") : undefined;
}

type TimelineEntryUsage = Extract<TimelineEntry, { kind: "turn" }>["usage"];

function truncate(value: string) {
	return value.length > OUTPUT_PREVIEW_LIMIT
		? `${value.slice(0, OUTPUT_PREVIEW_LIMIT)}\n...`
		: value;
}

function formatTime(value: unknown) {
	if (typeof value !== "string" && typeof value !== "number") {
		return undefined;
	}

	const time = new Date(value).getTime();

	if (Number.isNaN(time)) {
		return undefined;
	}

	return new Date(time).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}
