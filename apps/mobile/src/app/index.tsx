import { Stack, useRouter } from "expo-router";
import { ChevronRight, Menu, SquarePen } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	View,
} from "react-native";
import { useDrawer } from "@/components/drawer-content";
import { Icon } from "@/components/icon";
import db from "@/lib/instant";
import { groupTasks, type TaskListItem, toTaskDotStatus } from "@/lib/tasks";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/utils/tailwind";

const statusDotClasses: Record<string, string> = {
	running: "bg-blue-500",
	failed: "bg-red-500",
	idle: "bg-transparent border border-border",
};

/** The app's home: every task in the active workspace, newest work first. */
export default function TasksScreen() {
	const router = useRouter();
	const { workspace, isLoading: isWorkspaceLoading } = useWorkspace();
	const [search, setSearch] = useState("");

	const { data, isLoading } = db.useQuery(
		workspace
			? {
					workspaces: {
						$: { where: { id: workspace.id } },
						tasks: {
							$: {
								fields: [
									"name",
									"status",
									"createdAt",
									"completedAt",
									"sandboxId",
									"agentThreadId",
									"pullRequestUrl",
								],
							},
							agentSessions: { $: { fields: ["status"] } },
						},
					},
				}
			: null,
	);

	const tasks = (data?.workspaces?.[0]?.tasks ?? []) as TaskListItem[];
	const ordered = useMemo(() => {
		const { active, completed, other } = groupTasks(tasks);

		return [...active, ...other, ...completed];
	}, [tasks]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();

		return query
			? ordered.filter((task) => task.name.toLowerCase().includes(query))
			: ordered;
	}, [ordered, search]);

	if (isWorkspaceLoading || (workspace && isLoading)) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</View>
		);
	}

	if (!workspace) {
		return (
			<>
				<LeftToolbar />
				<View className="flex-1 items-center justify-center gap-2 px-10 bg-background">
					<Text className="text-xl font-semibold text-foreground text-center">
						No workspaces yet
					</Text>
					<Text className="text-sm text-muted-foreground text-center">
						Create a workspace in the Chaterface web app, then come back here.
					</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<FlatList
				data={filtered}
				keyExtractor={(item) => item.id}
				contentInsetAdjustmentBehavior="automatic"
				automaticallyAdjustsScrollIndicatorInsets
				contentContainerClassName="android:pb-safe pb-0"
				renderItem={({ item }) => (
					<TaskRow
						onPress={() => router.navigate(`/tasks/${item.id}`)}
						task={item}
					/>
				)}
				ListEmptyComponent={
					<View className="flex-1 items-center justify-center pt-32 gap-2 px-10">
						<Text className="text-[17px] text-muted-foreground text-center">
							{search
								? `No tasks matching "${search}"`
								: "No tasks yet. Start one with the compose button."}
						</Text>
					</View>
				}
			/>

			<Stack.SearchBar
				placeholder="Search tasks"
				hideWhenScrolling={false}
				onChangeText={(event) => setSearch(event.nativeEvent.text)}
				onCancelButtonPress={() => setSearch("")}
			/>

			<LeftToolbar />
			<RightToolbar />
		</>
	);
}

function TaskRow({
	onPress,
	task,
}: {
	onPress: () => void;
	task: TaskListItem;
}) {
	const dot = toTaskDotStatus(task.status);

	return (
		<Pressable
			className="flex-row items-center px-5 py-4 gap-3 active:bg-card"
			onPress={onPress}
		>
			<View className={cn("w-2 h-2 rounded-full", statusDotClasses[dot])} />
			<View className="flex-1 gap-0.5 mr-3">
				<Text numberOfLines={1} className="text-[17px] text-foreground">
					{task.name}
				</Text>
				<Text className="text-[13px] text-muted-foreground">
					{task.status ?? "idle"}
				</Text>
			</View>
			<Icon icon={ChevronRight} className="w-4 h-4 text-muted-foreground" />
		</Pressable>
	);
}

function LeftToolbar() {
	const { openDrawer } = useDrawer();

	if (process.env.EXPO_OS === "ios") {
		return (
			<Stack.Toolbar placement="left">
				<Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
			</Stack.Toolbar>
		);
	}

	return (
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
	);
}

function RightToolbar() {
	const router = useRouter();

	if (process.env.EXPO_OS === "ios") {
		return (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon="square.and.pencil"
					onPress={() => router.navigate("/new-task")}
				/>
			</Stack.Toolbar>
		);
	}

	return (
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
	);
}
