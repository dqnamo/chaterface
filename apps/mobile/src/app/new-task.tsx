import { getAgentDefaultOptions } from "@repo/db/agent-options";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useAgentConfig } from "@/components/agent-config-context";
import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import db from "@/lib/instant";
import { createTask } from "@/lib/tasks";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/utils/tailwind";

type WorkspaceAgentOption = {
	id: string;
	name: string;
	settings?: unknown;
	agent?: { id: string; name?: string; settings?: unknown };
};

/**
 * Mobile counterpart to the web app's new-task dialog: pick an agent, describe
 * the work, and the same transaction kicks off an agent session.
 */
export default function NewTaskScreen() {
	const router = useRouter();
	const { workspace } = useWorkspace();
	const {
		agentModel,
		agentReasoningEffort,
		agentSpeed,
		applyDefaults,
		reasoningEfforts,
		models,
		speeds,
		setAgentModel,
		setAgentReasoningEffort,
		setAgentSpeed,
	} = useAgentConfig();

	const [instructions, setInstructions] = useState("");
	const [workspaceAgentId, setWorkspaceAgentId] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string>();

	const { data, isLoading } = db.useQuery(
		workspace
			? {
					workspaces: {
						$: { where: { id: workspace.id } },
						workspaceAgents: {
							$: { fields: ["name", "settings"] },
							agent: { $: { fields: ["name", "settings"] } },
						},
					},
				}
			: null,
	);

	const workspaceAgents = (data?.workspaces?.[0]?.workspaceAgents ??
		[]) as WorkspaceAgentOption[];
	const resolvedWorkspaceAgentId = workspaceAgentId || workspaceAgents[0]?.id;
	const selectedWorkspaceAgent = useMemo(
		() =>
			workspaceAgents.find((entry) => entry.id === resolvedWorkspaceAgentId),
		[workspaceAgents, resolvedWorkspaceAgentId],
	);
	const selectedAgent = selectedWorkspaceAgent?.agent;

	// Each agent carries its own default model settings; adopt them on selection.
	const selectedAgentSettings = selectedWorkspaceAgent?.settings;

	useEffect(() => {
		if (!selectedWorkspaceAgent) {
			return;
		}

		applyDefaults(getAgentDefaultOptions(selectedAgentSettings));
	}, [selectedWorkspaceAgent, selectedAgentSettings, applyDefaults]);

	const canSubmit =
		!isCreating &&
		Boolean(workspace && resolvedWorkspaceAgentId && selectedAgent?.id) &&
		instructions.trim().length > 0;

	const submit = () => {
		const trimmed = instructions.trim();

		if (!canSubmit || !workspace || !resolvedWorkspaceAgentId) {
			return;
		}

		if (!selectedAgent?.id) {
			setError("Create an agent before starting a task.");
			return;
		}

		setIsCreating(true);
		setError(undefined);

		void (async () => {
			try {
				const taskId = await createTask({
					agentId: selectedAgent.id,
					agentModel,
					agentReasoningEffort,
					agentSpeed,
					instructions: trimmed,
					workspaceAgentId: resolvedWorkspaceAgentId,
					workspaceId: workspace.id,
				});

				void Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success,
				);
				setInstructions("");
				router.dismissTo(`/tasks/${taskId}`);
			} catch (caught) {
				setError(
					caught instanceof Error ? caught.message : "Failed to create task.",
				);
			} finally {
				setIsCreating(false);
			}
		})();
	};

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</View>
		);
	}

	return (
		<KeyboardAvoidingView behavior="padding" className="flex-1">
			<ScrollView
				className="flex-1"
				contentInsetAdjustmentBehavior="automatic"
				contentContainerClassName="android:pb-safe gap-5 p-5"
				keyboardShouldPersistTaps="handled"
			>
				<AndroidGrabber />

				<TextInput
					className="min-h-32 rounded-xl bg-card px-4 py-3 text-base text-foreground border-continuous"
					placeholder="What should the agent do?"
					multiline
					autoFocus
					editable={!isCreating}
					textAlignVertical="top"
					value={instructions}
					onChangeText={setInstructions}
				/>

				{workspaceAgents.length === 0 ? (
					<View className="rounded-xl bg-card p-4 gap-1 border-continuous">
						<Text className="text-[15px] font-medium text-foreground">
							No agents configured
						</Text>
						<Text className="text-[13px] text-muted-foreground">
							Add an agent to this workspace in the Chaterface web app before
							starting a task.
						</Text>
					</View>
				) : (
					<OptionGroup
						options={workspaceAgents.map((entry) => ({
							value: entry.id,
							label: entry.name,
						}))}
						selected={resolvedWorkspaceAgentId ?? ""}
						title="Agent"
						onSelect={setWorkspaceAgentId}
					/>
				)}

				<OptionGroup
					options={models}
					selected={agentModel}
					title="Model"
					onSelect={setAgentModel}
				/>
				<OptionGroup
					options={reasoningEfforts}
					selected={agentReasoningEffort}
					title="Reasoning effort"
					onSelect={setAgentReasoningEffort}
				/>
				<OptionGroup
					options={speeds}
					selected={agentSpeed}
					title="Speed"
					onSelect={setAgentSpeed}
				/>

				{error ? <Text className="text-xs text-red-500">{error}</Text> : null}

				<Pressable
					className={cn(
						"rounded-xl py-3.5 items-center",
						canSubmit ? "bg-foreground" : "bg-secondary",
					)}
					disabled={!canSubmit}
					onPress={submit}
				>
					<Text
						className={cn(
							"text-base font-medium",
							canSubmit ? "text-background" : "text-muted-foreground",
						)}
					>
						{isCreating ? "Starting..." : "Start task"}
					</Text>
				</Pressable>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

function OptionGroup({
	options,
	selected,
	title,
	onSelect,
}: {
	options: readonly { value: string; label: string }[];
	selected: string;
	title: string;
	onSelect: (value: string) => void;
}) {
	return (
		<View className="gap-1.5">
			<Text className="text-[13px] font-semibold text-muted-foreground">
				{title}
			</Text>
			<View className="rounded-xl bg-card overflow-hidden border-continuous">
				{options.map((option) => {
					const isSelected = option.value === selected;

					return (
						<Pressable
							className="flex-row items-center px-4 py-3 gap-3 active:bg-muted"
							key={option.value}
							onPress={() => onSelect(option.value)}
						>
							<Text
								className={cn(
									"flex-1 text-[15px]",
									isSelected ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{option.label}
							</Text>
							{isSelected ? (
								<Icon icon={Check} className="w-4 h-4 text-foreground" />
							) : null}
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
