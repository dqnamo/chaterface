import { Check } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAgentConfig } from "@/components/agent-config-context";
import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import { cn } from "@/utils/tailwind";

/**
 * Non-iOS fallback for the header's model menu. iOS gets the native SwiftUI
 * menu in `main-header.swiftui.tsx` instead.
 */
export default function ModelPickerSheet() {
	const {
		agentModel,
		agentReasoningEffort,
		agentSpeed,
		models,
		reasoningEfforts,
		speeds,
		setAgentModel,
		setAgentReasoningEffort,
		setAgentSpeed,
	} = useAgentConfig();

	return (
		<ScrollView
			className="flex-1"
			contentInsetAdjustmentBehavior="automatic"
			contentContainerClassName="android:pb-safe"
		>
			<AndroidGrabber />

			<OptionSection
				options={models}
				selected={agentModel}
				title="Model"
				onSelect={setAgentModel}
			/>
			<OptionSection
				options={reasoningEfforts}
				selected={agentReasoningEffort}
				title="Reasoning effort"
				onSelect={setAgentReasoningEffort}
			/>
			<OptionSection
				options={speeds}
				selected={agentSpeed}
				title="Speed"
				onSelect={setAgentSpeed}
			/>
		</ScrollView>
	);
}

function OptionSection({
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
		<View className="pt-2">
			<Text className="px-5 pt-3 pb-1 text-[13px] font-semibold text-muted-foreground">
				{title}
			</Text>
			{options.map((option) => {
				const isSelected = option.value === selected;

				return (
					<Pressable
						className="flex-row items-center px-5 py-3 gap-3.5 active:bg-muted"
						key={option.value}
						onPress={() => onSelect(option.value)}
					>
						<Text
							className={cn(
								"flex-1 text-[17px]",
								isSelected ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{option.label}
						</Text>
						{isSelected ? (
							<Icon icon={Check} className="w-5 h-5 text-foreground" />
						) : null}
					</Pressable>
				);
			})}
		</View>
	);
}
