import "@/global.css";

import type { Href } from "expo-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react-native";
import type React from "react";
import { createContext, use, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { TouchableGlass } from "@/components/touchable-glass";
import { SafeAreaView } from "@/components/tw";
import db from "@/lib/instant";
import { groupTasks, type TaskListItem, toTaskDotStatus } from "@/lib/tasks";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/utils/tailwind";

type DrawerContextValue = {
	isOpen: boolean;
	openDrawer: () => void;
	closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);

	const openDrawer = useCallback(() => setIsOpen(true), []);
	const closeDrawer = useCallback(() => setIsOpen(false), []);

	const value = useMemo(
		() => ({ isOpen, openDrawer, closeDrawer }),
		[isOpen, openDrawer, closeDrawer],
	);

	return <DrawerContext value={value}>{children}</DrawerContext>;
}

export function useDrawer() {
	const context = use(DrawerContext);

	if (!context) {
		throw new Error("useDrawer must be used within a DrawerProvider");
	}

	return context;
}

const statusDotClasses: Record<string, string> = {
	running: "bg-blue-500",
	failed: "bg-red-500",
	idle: "bg-transparent border border-border",
};

function TaskRow({
	active,
	onPress,
	task,
}: {
	active?: boolean;
	onPress: () => void;
	task: TaskListItem;
}) {
	const dot = toTaskDotStatus(task.status);

	return (
		<Pressable
			onPress={onPress}
			className={cn(
				"flex-row items-center gap-2.5 px-4 py-2.5 mx-2 rounded-[10px] active:bg-accent",
				active && "bg-muted",
			)}
		>
			<View className={cn("w-2 h-2 rounded-full", statusDotClasses[dot])} />
			<Text
				numberOfLines={1}
				className={cn(
					"flex-1 text-[15px]",
					active ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{task.name}
			</Text>
		</Pressable>
	);
}

export function DrawerContent({
	activeTaskId,
	onNavigate,
	onOpenModal,
}: {
	activeTaskId?: string;
	onNavigate: (path: Href) => void;
	onOpenModal: (path: Href) => void;
}) {
	const { workspace, workspaces } = useWorkspace();
	const [showCompleted, setShowCompleted] = useState(false);

	const { data } = db.useQuery(
		workspace
			? {
					workspaces: {
						$: { where: { id: workspace.id } },
						tasks: {
							$: {
								fields: [
									"name",
									"status",
									"completedAt",
									"sandboxId",
									"agentThreadId",
								],
							},
							agentSessions: { $: { fields: ["status"] } },
						},
					},
				}
			: null,
	);

	const tasks = (data?.workspaces?.[0]?.tasks ?? []) as TaskListItem[];
	const { active, completed, other } = useMemo(
		() => groupTasks(tasks),
		[tasks],
	);
	const openTasks = [...active, ...other];

	return (
		<SafeAreaView className="flex-1" edges={["top", "bottom", "left"]}>
			<Pressable
				className="px-4 pt-2 pb-3 active:opacity-60"
				onPress={() => onOpenModal("/workspaces")}
				disabled={workspaces.length <= 1}
			>
				<Text className="text-[11px] uppercase text-muted-foreground">
					Workspace
				</Text>
				<View className="flex-row items-center gap-1.5">
					<Text
						className="text-[24px] font-bold text-foreground flex-shrink"
						numberOfLines={1}
					>
						{workspace?.name ?? "Chaterface"}
					</Text>
					{workspaces.length > 1 ? (
						<Icon
							icon={ChevronDown}
							className="w-4 h-4 text-muted-foreground"
						/>
					) : null}
				</View>
			</Pressable>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 8 }}
			>
				<Text className="text-[13px] font-semibold text-muted-foreground px-6 pt-3 pb-1.5">
					Tasks
				</Text>

				{openTasks.length === 0 ? (
					<Text className="px-6 py-2 text-[13px] text-muted-foreground">
						No open tasks yet.
					</Text>
				) : (
					openTasks.map((task) => (
						<TaskRow
							active={task.id === activeTaskId}
							key={task.id}
							onPress={() => onNavigate(`/tasks/${task.id}`)}
							task={task}
						/>
					))
				)}

				{completed.length > 0 ? (
					<>
						<Pressable
							className="flex-row items-center gap-1.5 px-6 pt-5 pb-1.5 active:opacity-60"
							onPress={() => setShowCompleted((value) => !value)}
						>
							<Icon
								icon={showCompleted ? ChevronDown : ChevronRight}
								className="w-3.5 h-3.5 text-muted-foreground"
							/>
							<Text className="text-[13px] font-semibold text-muted-foreground">
								Completed ({completed.length})
							</Text>
						</Pressable>
						{showCompleted
							? completed.map((task) => (
									<TaskRow
										active={task.id === activeTaskId}
										key={task.id}
										onPress={() => onNavigate(`/tasks/${task.id}`)}
										task={task}
									/>
								))
							: null}
					</>
				) : null}
			</ScrollView>

			<View
				className="flex-row items-center px-4 py-3 border-t border-border"
				style={{ borderTopWidth: StyleSheet.hairlineWidth }}
			>
				<TouchableGlass
					onPress={() => onOpenModal("/(settings)/settings")}
					className="rounded-full p-2 flex-row items-center gap-2.5 active:opacity-60"
				>
					<Text className="text-sm text-foreground">Settings</Text>
				</TouchableGlass>
				<View className="flex-1" />
				<TouchableGlass
					onPress={() => onOpenModal("/new-task")}
					className="w-10 h-10 rounded-full bg-foreground active:bg-muted items-center justify-center"
				>
					<Icon icon={Plus} className="w-6 h-6 text-background" />
				</TouchableGlass>
			</View>
		</SafeAreaView>
	);
}
