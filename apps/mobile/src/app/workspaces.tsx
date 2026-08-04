import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/utils/tailwind";

export default function WorkspacesSheet() {
	const router = useRouter();
	const { workspace, workspaces, setActiveWorkspace } = useWorkspace();

	return (
		<ScrollView
			className="flex-1"
			contentInsetAdjustmentBehavior="automatic"
			contentContainerClassName="android:pb-safe"
		>
			<AndroidGrabber />
			<View className="pt-2">
				{workspaces.map((entry) => {
					const isSelected = entry.id === workspace?.id;

					return (
						<Pressable
							className="flex-row items-center px-5 py-3.5 gap-3.5 active:bg-muted"
							key={entry.id}
							onPress={() => {
								setActiveWorkspace(entry.handle);
								router.dismissTo("/");
							}}
						>
							<View className="flex-1">
								<Text
									className={cn(
										"text-[17px]",
										isSelected ? "text-foreground" : "text-muted-foreground",
									)}
								>
									{entry.name}
								</Text>
								<Text className="text-[13px] text-muted-foreground">
									{entry.handle}
								</Text>
							</View>
							{isSelected ? (
								<Icon icon={Check} className="w-5 h-5 text-foreground" />
							) : null}
						</Pressable>
					);
				})}
			</View>
		</ScrollView>
	);
}
