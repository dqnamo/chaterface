import { Link, Stack, useRouter } from "expo-router";
import { ChevronDown, Menu, SquarePen } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useAgentConfig } from "@/components/agent-config-context";
import { Icon } from "@/components/icon";
import { useDrawer } from "./drawer-content";

function HeaderTitleMenu() {
	const { agentModel, agentReasoningEffort, agentSpeed } = useAgentConfig();

	return (
		<Link href="/model-picker" asChild>
			<Pressable
				accessibilityRole="button"
				className="px-2 py-1 rounded-md active:bg-muted flex-col items-center self-center"
			>
				<View className="flex-row items-center gap-1">
					<Text className="text-[17px] font-semibold text-foreground">
						{agentModel}
					</Text>
					<Icon icon={ChevronDown} className="w-3 h-3 text-foreground" />
				</View>
				<Text className="text-[12px] text-muted-foreground">
					{agentReasoningEffort} · {agentSpeed}
				</Text>
			</Pressable>
		</Link>
	);
}

export function MainHeader() {
	const { openDrawer } = useDrawer();
	const router = useRouter();

	return (
		<>
			<Stack.Toolbar placement="left" asChild>
				<Pressable
					onPress={openDrawer}
					accessibilityLabel="Open task list"
					accessibilityRole="button"
					className="p-2 -ml-1 active:opacity-60"
				>
					<Icon icon={Menu} className="w-6 h-6 text-foreground" />
				</Pressable>
			</Stack.Toolbar>

			<Stack.Screen.Title asChild>
				<HeaderTitleMenu />
			</Stack.Screen.Title>

			<Stack.Toolbar placement="right" asChild>
				<Pressable
					accessibilityLabel="New task"
					accessibilityRole="button"
					className="p-2 -mr-1 active:opacity-60"
					onPress={() => router.navigate("/new-task")}
				>
					<Icon icon={SquarePen} className="w-6 h-6 text-foreground" />
				</Pressable>
			</Stack.Toolbar>
		</>
	);
}
