import * as Application from "expo-application";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { useCSSVariable } from "uniwind";

const GLASS = isLiquidGlassAvailable();

export default function SettingsLayout() {
	const router = useRouter();

	const appForeground = useCSSVariable("--app-foreground") as string;
	const appBackground = useCSSVariable("--app-background") as string;

	return (
		<Stack
			screenOptions={{
				headerTransparent: GLASS,
				headerLargeTitleShadowVisible: false,
				headerBackButtonDisplayMode: GLASS ? "minimal" : "default",
				headerTintColor: appForeground,
				headerShadowVisible: false,
				headerStyle: { backgroundColor: appBackground },
			}}
		>
			<Stack.Screen
				name="settings"
				options={{
					title: "Settings",
					headerLeft: () => null,
				}}
			>
				<Stack.Toolbar placement="left">
					<Stack.Toolbar.Button icon="xmark" onPress={() => router.back()} />
				</Stack.Toolbar>
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Menu icon="info.circle">
						<Stack.Toolbar.MenuAction icon="app">
							{`${Application.applicationName} v${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`}
						</Stack.Toolbar.MenuAction>
					</Stack.Toolbar.Menu>
				</Stack.Toolbar>
			</Stack.Screen>
		</Stack>
	);
}
