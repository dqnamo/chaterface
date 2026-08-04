import { AgentConfigProvider } from "@/components/agent-config-context";
import { AuthGate } from "@/components/auth-gate";
import {
	DrawerContent,
	DrawerProvider,
	useDrawer,
} from "@/components/drawer-content";
import { DrawerLayout } from "@/components/drawer-layout";
import "@/global.css";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider as RNTheme,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { WorkspaceProvider } from "@/lib/workspace";
import { useSystemBackgroundColor } from "@/utils/use-system-background-color";
import "react-native-get-random-values";
import { useColorScheme } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind, useCSSVariable } from "uniwind";

const GLASS = isLiquidGlassAvailable();
const IS_ANDROID = process.env.EXPO_OS === "android";

function ThemeProvider(props: { children: React.ReactNode }) {
	const colorScheme = useColorScheme();

	return (
		<RNTheme value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
				{props.children}
			</SafeAreaListener>
		</RNTheme>
	);
}

export const unstable_settings = {
	anchor: "index",
};

export default function RootLayout() {
	return (
		<ThemeProvider>
			<KeyboardProvider>
				<AuthGate>
					<WorkspaceProvider>
						<AgentConfigProvider>
							<DrawerProvider>
								<RootDrawer />
							</DrawerProvider>
						</AgentConfigProvider>
					</WorkspaceProvider>
				</AuthGate>
				{process.env.EXPO_OS !== "ios" && <StatusBar style="auto" />}
			</KeyboardProvider>
		</ThemeProvider>
	);
}

function RootDrawer() {
	const router = useRouter();
	const { isOpen, openDrawer, closeDrawer } = useDrawer();
	const { taskId } = useGlobalSearchParams<{ taskId?: string }>();

	useSystemBackgroundColor();

	return (
		<DrawerLayout
			open={isOpen}
			onOpen={openDrawer}
			onClose={closeDrawer}
			drawerContent={
				<DrawerContent
					activeTaskId={typeof taskId === "string" ? taskId : undefined}
					onNavigate={(path) => {
						closeDrawer();
						router.replace(path, { withAnchor: true });
					}}
					onOpenModal={(path) => {
						closeDrawer();
						router.navigate(path);
					}}
				/>
			}
		>
			<StackLayout />
		</DrawerLayout>
	);
}

function StackLayout() {
	const appForeground = useCSSVariable("--app-foreground") as string;
	const appBackground = useCSSVariable("--app-background") as string;

	return (
		<Stack
			screenOptions={{
				headerTransparent: GLASS,
				headerBackButtonDisplayMode: GLASS ? "minimal" : "default",
				headerTintColor: appForeground,
				headerShadowVisible: IS_ANDROID ? false : undefined,
				headerStyle: IS_ANDROID
					? { backgroundColor: appBackground }
					: undefined,
			}}
		>
			<Stack.Screen
				name="index"
				dangerouslySingular
				options={{
					title: "Tasks",
					animation: "none",
					gestureEnabled: false,
				}}
			/>

			<Stack.Screen
				name="tasks/[taskId]"
				options={{
					title: "Task",
					headerLargeTitleShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="new-task"
				options={{
					title: "New task",
					presentation: "formSheet",
					sheetAllowedDetents: [0.6, 1],
					sheetCornerRadius: IS_ANDROID ? 28 : undefined,
					sheetGrabberVisible: true,
					headerTransparent: GLASS,
					headerLargeTitleShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="workspaces"
				options={{
					title: "Workspaces",
					presentation: "formSheet",
					sheetAllowedDetents: "fitToContents",
					sheetCornerRadius: IS_ANDROID ? 28 : undefined,
					sheetGrabberVisible: true,
					headerTransparent: GLASS,
					headerLargeTitleShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="model-picker"
				options={{
					title: "Agent",
					presentation: "formSheet",
					sheetAllowedDetents: "fitToContents",
					sheetCornerRadius: IS_ANDROID ? 28 : undefined,
					sheetGrabberVisible: true,
					headerTransparent: GLASS,
					headerLargeTitleShadowVisible: false,
				}}
			/>

			<Stack.Screen
				name="(settings)"
				options={{
					presentation: IS_ANDROID ? undefined : "modal",
					headerShown: false,
				}}
			/>
		</Stack>
	);
}
