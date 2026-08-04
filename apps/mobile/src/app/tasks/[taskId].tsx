import { getAgentDefaultOptions } from "@repo/db/agent-options";
import {
	buildTimeline,
	type TaskEvent,
	type TimelineNode,
	type UserDisplayProfile,
} from "@repo/db/timeline";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAgentConfig } from "@/components/agent-config-context";
import {
	ChatProvider,
	Conversation,
	ConversationEmptyState,
	ConversationScrollButton,
	PromptInput,
	PromptInputBody,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/chat";
import { MainHeader } from "@/components/main-header";
import { TimelineEvent } from "@/components/timeline/timeline-event";
import db from "@/lib/instant";
import { createAgentSession, sendTurn } from "@/lib/tasks";

type TimelineRow = TimelineNode & { id: string };

export default function TaskScreen() {
	const { taskId } = useLocalSearchParams<{ taskId: string }>();
	const { user } = db.useAuth();
	const { agentModel, agentReasoningEffort, agentSpeed, applyDefaults } =
		useAgentConfig();

	const [input, setInput] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const { data, isLoading } = db.useQuery(
		taskId
			? {
					tasks: {
						$: { where: { id: taskId } },
						events: {},
						agentSessions: { $: { fields: ["name", "status", "createdAt"] } },
						agent: { $: { fields: ["name", "settings"] } },
						workspaceAgent: {
							$: { fields: ["name", "settings"] },
							agent: { $: { fields: ["name", "settings"] } },
						},
						workspace: {
							members: {
								$: { fields: ["name"] },
								user: { $: { fields: ["email", "name"] } },
							},
						},
					},
				}
			: null,
	);

	const task = data?.tasks?.[0];
	const events = useMemo(
		() => (task?.events ?? []) as TaskEvent[],
		[task?.events],
	);

	const rows = useMemo<TimelineRow[]>(
		() =>
			buildTimeline(events).map((node) => ({
				...node,
				// The list keys off `id`; the folded node key is the stable identity.
				id: node.key,
			})),
		[events],
	);

	const agentName =
		toOptionalString(task?.workspaceAgent?.agent?.name) ??
		toOptionalString(task?.workspaceAgent?.name) ??
		toOptionalString(task?.agent?.name) ??
		"Agent";
	const taskName = toOptionalString(task?.name) ?? "Task";

	// Adopt the task's saved model settings once it loads so a follow-up turn
	// continues with the same configuration the task was started with.
	const taskModel = toOptionalString(task?.agentModel);
	const taskReasoningEffort = toOptionalString(task?.agentReasoningEffort);
	const taskSpeed = toOptionalString(task?.agentSpeed);

	useEffect(() => {
		if (!taskModel && !taskReasoningEffort && !taskSpeed) {
			return;
		}

		const defaults = getAgentDefaultOptions({
			agentModel: taskModel,
			agentReasoningEffort: taskReasoningEffort,
			agentSpeed: taskSpeed,
		});

		applyDefaults(defaults);
		// `applyDefaults` is stable per provider render; re-running on task change
		// is the intent here.
	}, [taskModel, taskReasoningEffort, taskSpeed, applyDefaults]);

	const userProfiles = useMemo(() => {
		const profiles: Record<string, UserDisplayProfile> = {};

		for (const member of task?.workspace?.members ?? []) {
			const memberUser = member.user;

			if (memberUser?.id) {
				profiles[memberUser.id] = {
					id: memberUser.id,
					email: toOptionalString(memberUser.email),
					memberName: toOptionalString(member.name),
					userName: toOptionalString(memberUser.name),
				};
			}
		}

		return profiles;
	}, [task?.workspace?.members]);

	const currentUserProfile = user?.id ? userProfiles[user.id] : undefined;

	const onSend = useCallback(() => {
		const content = input.trim();

		if (!content || !task || isSending) {
			return;
		}

		setIsSending(true);
		setError(null);
		setInput("");
		void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		void (async () => {
			try {
				const agentSessionId =
					task.agentSessions?.[0]?.id ??
					(await createAgentSession({
						agentId: task.workspaceAgent?.agent?.id ?? task.agent?.id,
						taskId: task.id,
					}));

				await sendTurn({
					agentModel,
					agentReasoningEffort,
					agentSessionId,
					agentSpeed,
					content,
					taskId: task.id,
					userId: user?.id,
				});
			} catch (caught) {
				setError(
					caught instanceof Error
						? caught
						: new Error("Failed to send message"),
				);
				setInput(content);
			} finally {
				setIsSending(false);
			}
		})();
	}, [
		agentModel,
		agentReasoningEffort,
		agentSpeed,
		input,
		isSending,
		task,
		user?.id,
	]);

	const chat = useMemo(
		() => ({ input, setInput, isGenerating: isSending, onSend, error }),
		[input, isSending, onSend, error],
	);

	const renderMessage = useCallback(
		({ item }: { item: TimelineRow }) => (
			<TimelineEvent
				agentName={agentName}
				currentUserProfile={currentUserProfile}
				node={item}
				userProfiles={userProfiles}
			/>
		),
		[agentName, currentUserProfile, userProfiles],
	);

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</View>
		);
	}

	if (!task) {
		return (
			<View className="flex-1 items-center justify-center gap-2 px-10 bg-background">
				<Text className="text-xl font-semibold text-foreground">
					Task not found
				</Text>
				<Text className="text-sm text-muted-foreground text-center">
					It may have been deleted, or belong to another workspace.
				</Text>
			</View>
		);
	}

	return (
		<>
			<Stack.Screen options={{ title: taskName }} />
			<ChatProvider value={chat}>
				<Conversation
					data={rows}
					renderMessage={renderMessage}
					emptyState={
						<ConversationEmptyState
							title={taskName}
							description="Waiting for the agent to start."
						/>
					}
				>
					<ConversationScrollButton />
					<PromptInput>
						<PromptInputBody>
							<PromptInputTextarea placeholder={`Message ${agentName}...`} />
							<PromptInputSubmit />
						</PromptInputBody>
					</PromptInput>
				</Conversation>
			</ChatProvider>
			<MainHeader />
		</>
	);
}

/**
 * InstantDB widens projected fields to `unknown`; narrow them at the edge so
 * the rest of the screen works with plain strings.
 */
function toOptionalString(value: unknown) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}
