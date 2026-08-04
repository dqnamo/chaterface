import {
	Button,
	Host,
	HStack,
	Menu,
	Section,
	Image as SUIImage,
	Text as SUIText,
	VStack,
} from "@expo/ui/swift-ui";
import {
	controlSize,
	font,
	foregroundStyle,
} from "@expo/ui/swift-ui/modifiers";
import { Stack, useRouter } from "expo-router";
import { useColorScheme } from "react-native";
import { useAgentConfig } from "@/components/agent-config-context";
import { useDrawer } from "./drawer-content";

function HeaderTitleMenu() {
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
	const colorScheme = useColorScheme();
	const isDark = colorScheme === "dark";
	const headerFg = isDark ? "#fff" : "#000";
	const headerFgMuted = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)";

	return (
		<Host style={{ minWidth: 120, minHeight: 40 }}>
			<Menu
				label={
					<VStack spacing={0}>
						<HStack spacing={4} alignment="center">
							<SUIText
								modifiers={[
									foregroundStyle(headerFg),
									font({ weight: "semibold", size: 17 }),
								]}
							>
								{agentModel}
							</SUIText>
							<SUIImage systemName="chevron.down" size={10} color={headerFg} />
						</HStack>
						<SUIText
							modifiers={[foregroundStyle(headerFgMuted), font({ size: 12 })]}
						>
							{`${agentReasoningEffort} · ${agentSpeed}`}
						</SUIText>
					</VStack>
				}
				modifiers={[controlSize("regular")]}
			>
				<Section title="Model">
					{models.map((option) => (
						<Button
							key={option.value}
							label={option.label}
							systemImage={option.value === agentModel ? "checkmark" : "circle"}
							onPress={() => setAgentModel(option.value)}
						/>
					))}
				</Section>
				<Section title="Reasoning effort">
					{reasoningEfforts.map((option) => (
						<Button
							key={option.value}
							label={option.label}
							systemImage={
								option.value === agentReasoningEffort ? "checkmark" : "circle"
							}
							onPress={() => setAgentReasoningEffort(option.value)}
						/>
					))}
				</Section>
				<Section title="Speed">
					{speeds.map((option) => (
						<Button
							key={option.value}
							label={option.label}
							systemImage={option.value === agentSpeed ? "checkmark" : "circle"}
							onPress={() => setAgentSpeed(option.value)}
						/>
					))}
				</Section>
			</Menu>
		</Host>
	);
}

export function MainHeader() {
	const { openDrawer } = useDrawer();
	const router = useRouter();

	return (
		<>
			<Stack.Screen.Title asChild>
				<HeaderTitleMenu />
			</Stack.Screen.Title>
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
			</Stack.Toolbar>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon="square.and.pencil"
					onPress={() => router.navigate("/new-task")}
				/>
			</Stack.Toolbar>
		</>
	);
}
