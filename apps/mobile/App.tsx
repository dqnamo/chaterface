import "react-native-get-random-values";

import type { InstaQLEntity } from "@instantdb/react";
import { id } from "@instantdb/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	NavigationContainer,
	type NavigationProp,
} from "@react-navigation/native";
import {
	createNativeStackNavigator,
	type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import {
	Buildings,
	CaretRight,
	CheckCircle,
	DotsThree,
	FileCode,
	GearSix,
	Globe,
	List,
	MinusCircle,
	PaperPlaneTilt,
	PlusCircle,
	Robot,
	SignOut,
	UserCircle,
	XCircle,
} from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { AppSchema } from "../web-app/instant.schema";
import {
	Button,
	CenterShell,
	ErrorState,
	Field,
	ListRow,
	LoadingState,
	Logo,
	Monogram,
	Panel,
	Screen,
	SectionLabel,
	TaskStatusDots,
	textStyles,
} from "./src/components/primitives";
import db from "./src/db/client";
import { colors, spacing } from "./src/theme";
import { nowIso } from "./src/utils/date";
import {
	getRememberedWorkspace,
	rememberLastWorkspace,
} from "./src/utils/last-workspace";
import { toTaskDotStatus } from "./src/utils/task-status";

type RootStackParamList = {
	Home: undefined;
	Workspace: { workspaceHandle: string; workspaceId: string };
	Task: { workspaceHandle: string; workspaceId: string; taskId: string };
	NewWorkspace: undefined;
	WorkspaceMenu: { workspaceHandle: string; workspaceId: string };
	WorkspaceSettings: { workspaceHandle: string; workspaceId: string };
};

type Workspace = InstaQLEntity<AppSchema, "workspaces"> & {
	agents?: Agent[];
	members?: Member[];
	tasks?: Task[];
	repositories?: Repository[];
	environmentFiles?: EnvironmentFile[];
	secrets?: Secret[];
	apiKeys?: ApiKey[];
};
type Task = InstaQLEntity<AppSchema, "tasks"> & {
	services?: Service[];
	events?: EventEntity[];
};
type Agent = InstaQLEntity<AppSchema, "agents">;
type EventEntity = InstaQLEntity<AppSchema, "events">;
type Service = InstaQLEntity<AppSchema, "services">;
type Repository = InstaQLEntity<AppSchema, "repositories">;
type EnvironmentFile = InstaQLEntity<AppSchema, "environmentFiles">;
type Secret = InstaQLEntity<AppSchema, "secrets">;
type ApiKey = InstaQLEntity<AppSchema, "apiKeys">;
type Member = InstaQLEntity<AppSchema, "members"> & {
	user?: { id: string; email?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const API_BASE_URL = process.env.EXPO_PUBLIC_FACTORYPLANE_API_URL;

function tx<EntityName extends keyof typeof db.tx>(
	entityName: EntityName,
	entityId: string,
) {
	const builder = db.tx[entityName][entityId];

	if (!builder) {
		throw new Error(`${String(entityName)} transaction ${entityId} not found`);
	}

	return builder;
}

export default function App() {
	return (
		<SafeAreaProvider>
			<NavigationContainer>
				<StatusBar style="dark" />
				<AuthGate>
					<Stack.Navigator
						screenOptions={{
							headerStyle: { backgroundColor: colors.grayscale1 },
							headerShadowVisible: false,
							headerTitleStyle: {
								color: colors.grayscale12,
								fontSize: 15,
								fontWeight: "600",
							},
							contentStyle: { backgroundColor: colors.grayscale1 },
						}}
					>
						<Stack.Screen
							name="Home"
							component={HomeScreen}
							options={{ title: "Factoryplane" }}
						/>
						<Stack.Screen
							name="Workspace"
							component={WorkspaceScreen}
							options={({ navigation, route }) => ({
								title: "New Task",
								headerRight: () => (
									<Pressable
										onPress={() =>
											navigation.navigate("WorkspaceMenu", route.params)
										}
										style={styles.headerButton}
									>
										<List color={colors.grayscale12} size={20} weight="bold" />
									</Pressable>
								),
							})}
						/>
						<Stack.Screen
							name="Task"
							component={TaskScreen}
							options={({ navigation, route }) => ({
								title: "Task",
								headerRight: () => (
									<Pressable
										onPress={() =>
											navigation.navigate("WorkspaceMenu", {
												workspaceHandle: route.params.workspaceHandle,
												workspaceId: route.params.workspaceId,
											})
										}
										style={styles.headerButton}
									>
										<DotsThree
											color={colors.grayscale12}
											size={24}
											weight="bold"
										/>
									</Pressable>
								),
							})}
						/>
						<Stack.Screen
							name="NewWorkspace"
							component={NewWorkspaceScreen}
							options={{
								title: "New Workspace",
								presentation: Platform.OS === "ios" ? "formSheet" : "modal",
							}}
						/>
						<Stack.Screen
							name="WorkspaceMenu"
							component={WorkspaceMenuScreen}
							options={{
								title: "Workspace",
								presentation: Platform.OS === "ios" ? "formSheet" : "modal",
							}}
						/>
						<Stack.Screen
							name="WorkspaceSettings"
							component={WorkspaceSettingsScreen}
							options={{
								title: "Settings",
								presentation: Platform.OS === "ios" ? "formSheet" : "modal",
							}}
						/>
					</Stack.Navigator>
				</AuthGate>
			</NavigationContainer>
		</SafeAreaProvider>
	);
}

function AuthGate({ children }: { children: React.ReactNode }) {
	const { isLoading, user, error: authError } = db.useAuth();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [isCodeSent, setIsCodeSent] = useState(false);
	const [error, setError] = useState<string>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const trimmedEmail = email.trim();
	const trimmedCode = code.trim();
	const canSubmit =
		trimmedEmail.length > 0 && (!isCodeSent || trimmedCode.length > 0);

	const submit = async () => {
		if (isSubmitting || !canSubmit) {
			return;
		}

		setError(undefined);
		setIsSubmitting(true);

		try {
			if (isCodeSent) {
				await db.auth.signInWithMagicCode({
					email: trimmedEmail,
					code: trimmedCode,
				});
			} else {
				await db.auth.sendMagicCode({ email: trimmedEmail });
				setIsCodeSent(true);
			}
		} catch (nextError) {
			setError(getErrorMessage(nextError, "Authentication failed"));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!process.env.EXPO_PUBLIC_INSTANT_APP_ID) {
		return (
			<CenterShell>
				<Logo size={6} />
				<Text style={textStyles.title}>Configure InstantDB</Text>
				<Text style={styles.centeredCopy}>
					Set EXPO_PUBLIC_INSTANT_APP_ID in apps/mobile/.env to connect this
					Expo app to the same Instant app as web.
				</Text>
			</CenterShell>
		);
	}

	if (isLoading) {
		return <LoadingState label="Loading Factoryplane..." />;
	}

	if (authError) {
		return <ErrorState message={authError.message} />;
	}

	if (user) {
		return children;
	}

	return (
		<SafeAreaView style={styles.authSafeArea}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={styles.keyboardAvoiding}
			>
				<CenterShell>
					<Logo size={7} />
					<View style={styles.centeredBlock}>
						<Text style={textStyles.title}>Sign in to Factoryplane</Text>
						<Text style={styles.centeredCopy}>
							Enter your email to receive a magic code.
						</Text>
					</View>
					<Panel style={styles.authPanel}>
						<View style={styles.formBlock}>
							<SectionLabel
								label="Email"
								description="Where your sign-in code will be sent."
							/>
							<Field
								autoCapitalize="none"
								autoComplete="email"
								editable={!isSubmitting && !isCodeSent}
								keyboardType="email-address"
								onChangeText={setEmail}
								placeholder="you@example.com"
								returnKeyType="send"
								value={email}
								onSubmitEditing={submit}
							/>
						</View>
						{isCodeSent ? (
							<View style={styles.formBlock}>
								<SectionLabel
									label="Magic code"
									description={`Enter the code sent to ${trimmedEmail}.`}
								/>
								<Field
									autoCapitalize="none"
									autoComplete="one-time-code"
									editable={!isSubmitting}
									onChangeText={setCode}
									placeholder="Magic code"
									returnKeyType="done"
									value={code}
									onSubmitEditing={submit}
								/>
							</View>
						) : null}
						{error ? <Text style={styles.errorBox}>{error}</Text> : null}
						<View style={styles.formActions}>
							{isCodeSent ? (
								<Button
									variant="ghost"
									disabled={isSubmitting}
									onPress={() => {
										setIsCodeSent(false);
										setCode("");
										setError(undefined);
									}}
								>
									Different email
								</Button>
							) : (
								<View />
							)}
							<Button disabled={!canSubmit || isSubmitting} onPress={submit}>
								{isSubmitting
									? "Submitting..."
									: isCodeSent
										? "Verify code"
										: "Send code"}
							</Button>
						</View>
					</Panel>
				</CenterShell>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

function HomeScreen({
	navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">) {
	const { user } = db.useAuth();
	const currentUserId = user?.id ?? "__unauthenticated__";
	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					"members.user.id": currentUserId,
				},
			},
		},
	});
	const workspaces = (data?.workspaces ?? []) as Workspace[];

	useEffect(() => {
		if (!user?.id || workspaces.length === 0) {
			return;
		}

		let cancelled = false;

		const routeToRememberedWorkspace = async () => {
			const remembered = await getRememberedWorkspace(user.id);
			const accessibleWorkspaces = workspaces.map((workspace) => ({
				workspaceId: workspace.id,
				workspaceHandle: workspace.handle,
			}));
			const target =
				accessibleWorkspaces.find(
					(workspace) =>
						remembered &&
						workspace.workspaceId === remembered.workspaceId &&
						workspace.workspaceHandle === remembered.workspaceHandle,
				) ?? accessibleWorkspaces[0];

			if (!cancelled && target) {
				navigation.replace("Workspace", target);
			}
		};

		void routeToRememberedWorkspace();

		return () => {
			cancelled = true;
		};
	}, [navigation, workspaces, user?.id]);

	if (isLoading) {
		return <LoadingState label="Loading workspaces..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<Screen>
			<ScrollView contentContainerStyle={styles.listScreen}>
				<Logo size={8} />
				<View style={styles.centeredBlock}>
					<Text style={textStyles.heading}>Your Workspaces</Text>
					<Text style={styles.centeredCopy}>
						Select a workspace to manage your tasks
					</Text>
				</View>
				<Button
					variant="secondary"
					icon={<SignOut color={colors.grayscale11} size={16} weight="bold" />}
					onPress={() => void signOut()}
				>
					Sign out
				</Button>
				<View style={styles.list}>
					{workspaces.map((workspace) => (
						<ListRow
							key={workspace.id}
							icon={<Monogram seed={workspace.name} letters={1} />}
							onPress={() =>
								navigation.navigate("Workspace", {
									workspaceHandle: workspace.handle,
									workspaceId: workspace.id,
								})
							}
						>
							<Text style={textStyles.heading}>{workspace.name}</Text>
							<Text style={textStyles.caption}>{workspace.handle}</Text>
						</ListRow>
					))}
				</View>
				<Button
					icon={<Buildings color={colors.grayscale1} size={16} weight="bold" />}
					onPress={() => navigation.navigate("NewWorkspace")}
				>
					New Workspace
				</Button>
			</ScrollView>
		</Screen>
	);
}

function WorkspaceScreen({
	navigation,
	route,
}: NativeStackScreenProps<RootStackParamList, "Workspace">) {
	const { workspaceHandle, workspaceId } = route.params;
	const { user } = db.useAuth();
	const [taskName, setTaskName] = useState("");
	const [instructions, setInstructions] = useState("");
	const [agentId, setAgentId] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					id: workspaceId,
				},
			},
			agents: {
				$: {
					fields: ["name", "provider", "settings"],
				},
			},
			members: {
				user: {},
			},
			tasks: {},
		},
		tasks: {
			$: {
				where: {
					workspace: workspaceId,
				},
			},
		},
	});
	const workspace = data?.workspaces?.[0] as Workspace | undefined;
	const agents = workspace?.agents ?? [];
	const tasks = ((data?.tasks ?? []) as Task[]).sort((first, second) =>
		String(second.createdAt ?? "").localeCompare(String(first.createdAt ?? "")),
	);
	const resolvedAgentId = agentId || agents[0]?.id;
	const activeTasks = tasks.filter((task) => !task.completedAt);
	const completedTasks = tasks.filter((task) => task.completedAt);

	useEffect(() => {
		if (!user?.id) {
			return;
		}

		void rememberLastWorkspace({
			workspaceId,
			workspaceHandle,
			userId: user.id,
		});
	}, [workspaceId, workspaceHandle, user?.id]);

	const createTask = async () => {
		if (!resolvedAgentId || isCreating || !taskName.trim()) {
			return;
		}

		setIsCreating(true);

		try {
			const taskId = id();
			await db.transact(
				tx("tasks", taskId)
					.create({
						name: taskName.trim(),
						status: "in_progress",
						instructions,
						createdAt: nowIso(),
					})
					.link({ workspace: workspaceId, agent: resolvedAgentId }),
			);
			await db.transact(
				tx("events", id())
					.create({
						type: "factoryplane.new_task",
						data: {
							taskId,
							name: taskName.trim(),
							instructions,
							images: [],
						},
						createdAt: nowIso(),
					})
					.link({ task: taskId }),
			);
			setTaskName("");
			setInstructions("");
			navigation.navigate("Task", { workspaceHandle, workspaceId, taskId });
		} catch (nextError) {
			Alert.alert("Failed to create task", getErrorMessage(nextError));
		} finally {
			setIsCreating(false);
		}
	};

	if (isLoading) {
		return <LoadingState label="Loading workspace..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={styles.keyboardAvoiding}
		>
			<Screen>
				<ScrollView contentContainerStyle={styles.taskComposerScreen}>
					<Logo size={8} />
					<View style={styles.centeredBlock}>
						<Text style={textStyles.title}>What do you want to build?</Text>
						<Text style={styles.centeredCopy}>{workspace?.name}</Text>
					</View>
					<Panel style={styles.composerPanel}>
						<View style={styles.formBlock}>
							<SectionLabel label="Name" description="The name of the task." />
							<Field
								onChangeText={setTaskName}
								placeholder="Task Name"
								returnKeyType="next"
								value={taskName}
							/>
						</View>
						<View style={styles.formBlock}>
							<SectionLabel
								label="Instructions"
								description="The instructions for the task."
							/>
							<Field
								multiline
								onChangeText={setInstructions}
								placeholder="Task Instructions"
								value={instructions}
							/>
						</View>
						<View style={styles.agentPicker}>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.agentPickerContent}
							>
								{agents.map((agent) => {
									const selected = agent.id === resolvedAgentId;

									return (
										<Pressable
											key={agent.id}
											onPress={() => setAgentId(agent.id)}
											style={[
												styles.agentPill,
												selected ? styles.agentPillSelected : undefined,
											]}
										>
											<Robot
												color={selected ? colors.accent11 : colors.grayscale10}
												size={16}
												weight="bold"
											/>
											<Text
												style={[
													styles.agentPillText,
													selected ? styles.agentPillTextSelected : undefined,
												]}
											>
												{agent.name}
											</Text>
										</Pressable>
									);
								})}
							</ScrollView>
							<Button
								disabled={!resolvedAgentId || !taskName.trim() || isCreating}
								icon={
									<PlusCircle
										color={colors.grayscale1}
										size={16}
										weight="bold"
									/>
								}
								onPress={createTask}
							>
								{isCreating ? "Creating..." : "Create Task"}
							</Button>
						</View>
					</Panel>
					<View style={styles.taskLists}>
						<TaskList
							title="Tasks"
							count={activeTasks.length}
							tasks={activeTasks}
							workspaceHandle={workspaceHandle}
							workspaceId={workspaceId}
							navigation={navigation}
						/>
						{completedTasks.length > 0 ? (
							<TaskList
								title="Completed Tasks"
								count={completedTasks.length}
								tasks={completedTasks}
								workspaceHandle={workspaceHandle}
								workspaceId={workspaceId}
								navigation={navigation}
							/>
						) : null}
					</View>
				</ScrollView>
			</Screen>
		</KeyboardAvoidingView>
	);
}

function TaskList({
	title,
	count,
	tasks,
	workspaceHandle,
	workspaceId,
	navigation,
}: {
	title: string;
	count: number;
	tasks: Task[];
	workspaceHandle: string;
	workspaceId: string;
	navigation: NavigationProp<RootStackParamList>;
}) {
	return (
		<View style={styles.taskListBlock}>
			<View style={styles.inlineHeader}>
				<Text style={textStyles.mono}>{title}</Text>
				<Text style={textStyles.mono}>{count}</Text>
			</View>
			<View style={styles.list}>
				{tasks.map((task) => (
					<ListRow
						key={task.id}
						icon={<TaskStatusDots status={toTaskDotStatus(task.status)} />}
						onPress={() =>
							navigation.navigate("Task", {
								workspaceHandle,
								workspaceId,
								taskId: task.id,
							})
						}
					>
						<Text style={textStyles.heading}>{task.name}</Text>
						<Text style={textStyles.caption}>
							{task.status ?? (task.completedAt ? "complete" : "idle")}
						</Text>
					</ListRow>
				))}
			</View>
		</View>
	);
}

function TaskScreen({
	route,
}: NativeStackScreenProps<RootStackParamList, "Task">) {
	const { taskId } = route.params;
	const { user } = db.useAuth();
	const [message, setMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isLoadingDiff, setIsLoadingDiff] = useState(false);
	const [diffText, setDiffText] = useState<string>();
	const { data, isLoading, error } = db.useQuery({
		tasks: {
			$: {
				where: {
					id: taskId,
				},
			},
			services: {},
		},
		events: {
			$: {
				where: {
					"task.id": taskId,
				},
			},
		},
	});
	const task = data?.tasks?.[0] as Task | undefined;
	const events = useMemo(
		() =>
			((data?.events ?? []) as EventEntity[]).sort((first, second) =>
				String(first.createdAt ?? "").localeCompare(
					String(second.createdAt ?? ""),
				),
			),
		[data?.events],
	);
	const services = task?.services ?? [];
	const isCompleted = Boolean(task?.completedAt);

	useEffect(() => {
		if (!task?.latestDiffPath || !user?.refresh_token || !API_BASE_URL) {
			setDiffText(undefined);
			return;
		}

		let cancelled = false;

		const loadDiff = async () => {
			setIsLoadingDiff(true);

			try {
				const response = await fetch(
					`${API_BASE_URL}/api/tasks/${task.id}/diff?version=${encodeURIComponent(
						String(task.latestDiffGeneratedAt ?? task.latestDiffPath),
					)}`,
					{
						headers: {
							Authorization: `Bearer ${user.refresh_token}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error(`Diff request failed: ${response.status}`);
				}

				const body = await response.text();

				if (!cancelled) {
					setDiffText(body);
				}
			} catch {
				if (!cancelled) {
					setDiffText(undefined);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingDiff(false);
				}
			}
		};

		void loadDiff();

		return () => {
			cancelled = true;
		};
	}, [
		task?.id,
		task?.latestDiffGeneratedAt,
		task?.latestDiffPath,
		user?.refresh_token,
	]);

	const toggleComplete = async () => {
		if (!task) {
			return;
		}

		await db.transact(
			tx("tasks", task.id).update({
				completedAt: isCompleted ? undefined : nowIso(),
				status: isCompleted ? "idle" : "complete",
			}),
		);
	};

	const sendMessage = async () => {
		if (!task || isSending) {
			return;
		}

		const content = message.trim();

		if (!content) {
			return;
		}

		setIsSending(true);

		try {
			setMessage("");
			await db.transact(
				tx("tasks", task.id).update({
					status: "in_progress",
					completedAt: undefined,
				}),
			);
			await db.transact(
				tx("events", id())
					.create({
						type: "factoryplane.new_user_message",
						data: { content, images: [] },
						createdAt: nowIso(),
					})
					.link({ task: task.id }),
			);
		} catch (nextError) {
			Alert.alert("Failed to send message", getErrorMessage(nextError));
		} finally {
			setIsSending(false);
		}
	};

	if (isLoading) {
		return <LoadingState label="Loading task..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={styles.keyboardAvoiding}
		>
			<Screen>
				<View style={styles.taskHeader}>
					<View style={styles.taskHeaderTitle}>
						<TaskStatusDots status={toTaskDotStatus(task?.status)} size={4} />
						<Text style={textStyles.heading} numberOfLines={1}>
							{task?.name}
						</Text>
					</View>
					<Button
						variant="secondary"
						icon={
							isCompleted ? (
								<MinusCircle color={colors.blue11} size={16} weight="bold" />
							) : (
								<CheckCircle color={colors.green11} size={16} weight="bold" />
							)
						}
						onPress={() => void toggleComplete()}
					>
						{isCompleted ? "Uncomplete" : "Complete"}
					</Button>
				</View>
				<ScrollView contentContainerStyle={styles.timeline}>
					{events.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
					<Panel style={styles.sidePanel}>
						<View style={styles.sidePanelHeader}>
							<Globe color={colors.grayscale11} size={16} weight="bold" />
							<Text style={textStyles.heading}>Services</Text>
						</View>
						{services.length === 0 ? (
							<Text style={textStyles.caption}>No running services yet.</Text>
						) : (
							services.map((service) => (
								<Pressable
									key={service.id}
									style={styles.serviceRow}
									onPress={() => {
										if (service.url) {
											void Linking.openURL(service.url);
										}
									}}
								>
									<Text style={textStyles.heading}>{service.name}</Text>
									<Text style={textStyles.caption}>
										:{service.portNumber} · {service.status ?? "unknown"}
									</Text>
								</Pressable>
							))
						)}
					</Panel>
					<Panel style={styles.sidePanel}>
						<View style={styles.sidePanelHeader}>
							<FileCode color={colors.grayscale11} size={16} weight="bold" />
							<Text style={textStyles.heading}>Changes</Text>
						</View>
						{isLoadingDiff ? (
							<Text style={textStyles.caption}>Loading changes...</Text>
						) : diffText ? (
							<Text style={styles.diffText} numberOfLines={18}>
								{diffText}
							</Text>
						) : (
							<Text style={textStyles.caption}>
								No latest diff available on mobile yet.
							</Text>
						)}
					</Panel>
				</ScrollView>
				<View style={styles.messageDock}>
					<Panel style={styles.messagePanel}>
						<Field
							multiline
							onChangeText={setMessage}
							placeholder="Task Instructions"
							value={message}
							style={styles.messageField}
						/>
						<View style={styles.formActions}>
							<View />
							<Button
								disabled={isSending || !message.trim()}
								icon={
									<PaperPlaneTilt
										color={colors.grayscale1}
										size={16}
										weight="bold"
									/>
								}
								onPress={sendMessage}
							>
								{isSending ? "Sending..." : "Send Message"}
							</Button>
						</View>
					</Panel>
				</View>
			</Screen>
		</KeyboardAvoidingView>
	);
}

function EventCard({ event }: { event: EventEntity }) {
	const data = asRecord(event.data);
	const title = titleForEvent(event.type);
	const content =
		getString(data, "content") ??
		getString(data, "instructions") ??
		getString(data, "message") ??
		getString(asRecord(data?.item), "type") ??
		JSON.stringify(data ?? {}, null, 2);

	return (
		<View style={styles.eventCard}>
			<View style={styles.eventMarker} />
			<View style={styles.eventBody}>
				<Text style={textStyles.heading}>{title}</Text>
				{content ? <Text style={styles.eventText}>{content}</Text> : null}
			</View>
		</View>
	);
}

function NewWorkspaceScreen({
	navigation,
}: NativeStackScreenProps<RootStackParamList, "NewWorkspace">) {
	const { user } = db.useAuth();
	const [name, setName] = useState("");
	const [handle, setHandle] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const createWorkspace = async () => {
		if (!user?.id || isCreating || !name.trim() || !handle.trim()) {
			return;
		}

		setIsCreating(true);

		try {
			const workspaceId = id();
			await db.transact([
				tx("workspaces", workspaceId).create({
					name: name.trim(),
					handle: handle.trim(),
					createdAt: nowIso(),
				}),
				tx("members", id())
					.update({
						createdAt: nowIso(),
						joinedAt: nowIso(),
						role: "owner",
					})
					.link({ workspace: workspaceId, user: user.id }),
			]);
			navigation.replace("Workspace", {
				workspaceHandle: handle.trim(),
				workspaceId,
			});
		} catch (nextError) {
			Alert.alert("Failed to create workspace", getErrorMessage(nextError));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<FormSheet>
			<Panel>
				<View style={styles.formBlock}>
					<SectionLabel label="Name" description="The name of the workspace." />
					<Field
						onChangeText={setName}
						placeholder="Workspace Name"
						value={name}
					/>
				</View>
				<View style={styles.formBlock}>
					<SectionLabel
						label="Handle"
						description="A unique handle used by this workspace."
					/>
					<Field
						autoCapitalize="none"
						onChangeText={setHandle}
						placeholder="Workspace Handle"
						value={handle}
					/>
				</View>
				<View style={styles.formActions}>
					<Button variant="ghost" onPress={() => navigation.goBack()}>
						Cancel
					</Button>
					<Button
						disabled={isCreating || !name.trim() || !handle.trim()}
						onPress={createWorkspace}
					>
						Create
					</Button>
				</View>
			</Panel>
		</FormSheet>
	);
}

function WorkspaceMenuScreen({
	navigation,
	route,
}: NativeStackScreenProps<RootStackParamList, "WorkspaceMenu">) {
	const { workspaceHandle, workspaceId } = route.params;
	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					id: workspaceId,
				},
			},
		},
		tasks: {
			$: {
				where: {
					workspace: workspaceId,
				},
			},
		},
	});
	const workspace = data?.workspaces?.[0] as Workspace | undefined;
	const tasks = ((data?.tasks ?? []) as Task[]).sort((first, second) =>
		String(second.createdAt ?? "").localeCompare(String(first.createdAt ?? "")),
	);

	if (isLoading) {
		return <LoadingState label="Loading menu..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<FormSheet>
			<View style={styles.sheetHeader}>
				<View>
					<Text style={textStyles.title}>{workspace?.name}</Text>
					<Text style={textStyles.caption}>{workspaceHandle}</Text>
				</View>
				<Button
					variant="secondary"
					icon={<GearSix color={colors.grayscale11} size={16} weight="bold" />}
					onPress={() =>
						navigation.navigate("WorkspaceSettings", {
							workspaceHandle,
							workspaceId,
						})
					}
				>
					Settings
				</Button>
			</View>
			<Button
				icon={<PlusCircle color={colors.grayscale1} size={16} weight="bold" />}
				onPress={() =>
					navigation.navigate("Workspace", { workspaceHandle, workspaceId })
				}
			>
				New Task
			</Button>
			<View style={styles.taskListBlock}>
				<View style={styles.inlineHeader}>
					<Text style={textStyles.mono}>Tasks</Text>
					<Text style={textStyles.mono}>{tasks.length}</Text>
				</View>
				<View style={styles.list}>
					{tasks.map((task) => (
						<ListRow
							key={task.id}
							icon={<TaskStatusDots status={toTaskDotStatus(task.status)} />}
							onPress={() =>
								navigation.navigate("Task", {
									workspaceHandle,
									workspaceId,
									taskId: task.id,
								})
							}
						>
							<Text style={textStyles.heading}>{task.name}</Text>
							<Text style={textStyles.caption}>{task.status ?? "idle"}</Text>
						</ListRow>
					))}
				</View>
			</View>
		</FormSheet>
	);
}

function WorkspaceSettingsScreen({
	route,
}: NativeStackScreenProps<RootStackParamList, "WorkspaceSettings">) {
	const { workspaceId } = route.params;
	const [repositoryUrl, setRepositoryUrl] = useState("");
	const [repositoryPath, setRepositoryPath] = useState("");
	const [environmentPath, setEnvironmentPath] = useState("");
	const [environmentContent, setEnvironmentContent] = useState("");
	const [secretName, setSecretName] = useState("");
	const [secretValue, setSecretValue] = useState("");
	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					id: workspaceId,
				},
			},
			repositories: {},
			environmentFiles: {},
			secrets: {},
			apiKeys: {},
			agents: {
				$: {
					fields: ["name", "provider", "settings"],
				},
			},
			members: {
				user: {},
			},
		},
	});
	const workspace = data?.workspaces?.[0] as Workspace | undefined;

	const addRepository = async () => {
		if (!repositoryUrl.trim()) {
			return;
		}

		await db.transact(
			tx("repositories", id())
				.create({
					url: repositoryUrl.trim(),
					path: repositoryPath.trim() || undefined,
					createdAt: nowIso(),
				})
				.link({ workspace: workspaceId }),
		);
		setRepositoryUrl("");
		setRepositoryPath("");
	};

	const addEnvironmentFile = async () => {
		if (!environmentPath.trim()) {
			return;
		}

		await db.transact(
			tx("environmentFiles", id())
				.create({
					path: environmentPath.trim(),
					content: environmentContent,
					createdAt: nowIso(),
				})
				.link({ workspace: workspaceId }),
		);
		setEnvironmentPath("");
		setEnvironmentContent("");
	};

	const addSecret = async () => {
		if (!secretName.trim()) {
			return;
		}

		await db.transact(
			tx("secrets", id())
				.create({
					name: secretName.trim(),
					valueEncrypted: secretValue,
					createdAt: nowIso(),
				})
				.link({ workspace: workspaceId }),
		);
		setSecretName("");
		setSecretValue("");
	};

	if (isLoading) {
		return <LoadingState label="Loading settings..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<FormSheet>
			<View style={styles.sheetHeader}>
				<View>
					<Text style={textStyles.title}>{workspace?.name}</Text>
					<Text style={textStyles.caption}>Workspace Settings</Text>
				</View>
			</View>
			<SettingsSection
				icon={<GearSix color={colors.grayscale11} size={17} weight="bold" />}
				title="GitHub"
				description={
					workspace?.gitAuthorName || workspace?.gitAuthorEmail
						? [workspace.gitAuthorName, workspace.gitAuthorEmail]
								.filter(Boolean)
								.join(" · ")
						: "Configure GitHub token from web or during workspace creation."
				}
			/>
			<SettingsEditor
				title="Repositories"
				rows={(workspace?.repositories ?? []).map((repository) => ({
					id: repository.id,
					title: repository.url,
					subtitle: repository.path || repository.branch || "Default checkout",
					onDelete: () =>
						db.transact(tx("repositories", repository.id).delete()),
				}))}
			>
				<Field
					autoCapitalize="none"
					onChangeText={setRepositoryUrl}
					placeholder="https://github.com/org/repo.git"
					value={repositoryUrl}
				/>
				<Field
					autoCapitalize="none"
					onChangeText={setRepositoryPath}
					placeholder="Optional path"
					value={repositoryPath}
				/>
				<Button disabled={!repositoryUrl.trim()} onPress={addRepository}>
					Add Repository
				</Button>
			</SettingsEditor>
			<SettingsEditor
				title="Environment Files"
				rows={(workspace?.environmentFiles ?? []).map((file) => ({
					id: file.id,
					title: file.path,
					subtitle: "Synced before task setup",
					onDelete: () => db.transact(tx("environmentFiles", file.id).delete()),
				}))}
			>
				<Field
					autoCapitalize="none"
					onChangeText={setEnvironmentPath}
					placeholder=".npmrc"
					value={environmentPath}
				/>
				<Field
					multiline
					onChangeText={setEnvironmentContent}
					placeholder="//registry.npmjs.org/:_authToken=token"
					value={environmentContent}
				/>
				<Button disabled={!environmentPath.trim()} onPress={addEnvironmentFile}>
					Add File
				</Button>
			</SettingsEditor>
			<SettingsEditor
				title="Secrets"
				rows={(workspace?.secrets ?? []).map((secret) => ({
					id: secret.id,
					title: secret.name,
					subtitle: "Stored value",
					onDelete: () => db.transact(tx("secrets", secret.id).delete()),
				}))}
			>
				<Field
					autoCapitalize="characters"
					onChangeText={setSecretName}
					placeholder="SECRET_NAME"
					value={secretName}
				/>
				<Field
					onChangeText={setSecretValue}
					placeholder="Secret value"
					secureTextEntry
					value={secretValue}
				/>
				<Button disabled={!secretName.trim()} onPress={addSecret}>
					Add Secret
				</Button>
			</SettingsEditor>
			<SettingsSection
				icon={<Robot color={colors.grayscale11} size={17} weight="bold" />}
				title="Agents"
				description={`${workspace?.agents?.length ?? 0} configured`}
			/>
			<SettingsSection
				icon={<UserCircle color={colors.grayscale11} size={17} weight="bold" />}
				title="Members"
				description={`${workspace?.members?.length ?? 0} members`}
			/>
		</FormSheet>
	);
}

function SettingsSection({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<View style={styles.settingsSection}>
			{icon}
			<View style={styles.rowContent}>
				<Text style={textStyles.heading}>{title}</Text>
				<Text style={textStyles.caption}>{description}</Text>
			</View>
			<CaretRight color={colors.grayscale10} size={16} weight="bold" />
		</View>
	);
}

function SettingsEditor({
	title,
	rows,
	children,
}: {
	title: string;
	rows: Array<{
		id: string;
		title: string;
		subtitle: string;
		onDelete: () => Promise<unknown>;
	}>;
	children: React.ReactNode;
}) {
	return (
		<Panel style={styles.settingsEditor}>
			<Text style={textStyles.heading}>{title}</Text>
			{rows.map((row) => (
				<View key={row.id} style={styles.compactRow}>
					<View style={styles.rowContent}>
						<Text style={textStyles.body} numberOfLines={1}>
							{row.title}
						</Text>
						<Text style={textStyles.caption} numberOfLines={1}>
							{row.subtitle}
						</Text>
					</View>
					<Pressable
						onPress={() => {
							Alert.alert("Delete", `Delete ${row.title}?`, [
								{ text: "Cancel", style: "cancel" },
								{
									text: "Delete",
									style: "destructive",
									onPress: () => void row.onDelete(),
								},
							]);
						}}
						style={styles.iconButton}
					>
						<XCircle color={colors.red11} size={18} weight="bold" />
					</Pressable>
				</View>
			))}
			<View style={styles.settingsForm}>{children}</View>
		</Panel>
	);
}

function FormSheet({ children }: { children: React.ReactNode }) {
	return (
		<Screen>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={styles.formSheet}
			>
				{children}
			</ScrollView>
		</Screen>
	);
}

async function signOut() {
	await AsyncStorage.removeItem("factoryplane:last-workspace");
	await db.auth.signOut();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
}

function getString(
	record: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const value = record?.[key];
	return typeof value === "string" ? value : undefined;
}

function titleForEvent(type: string | undefined) {
	switch (type) {
		case "factoryplane.new_task":
			return "New task";
		case "factoryplane.new_user_message":
			return "User message";
		case "codex.turn.started":
			return "Agent started";
		case "codex.turn.completed":
			return "Agent completed";
		default:
			return type?.replaceAll(".", " ") ?? "Event";
	}
}

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	return fallback;
}

const styles = StyleSheet.create({
	authSafeArea: {
		flex: 1,
		backgroundColor: colors.grayscale1,
	},
	keyboardAvoiding: {
		flex: 1,
	},
	headerButton: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center",
	},
	listScreen: {
		flexGrow: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.lg,
		padding: spacing.lg,
	},
	centeredBlock: {
		alignItems: "center",
		gap: 2,
	},
	centeredCopy: {
		...textStyles.body,
		textAlign: "center",
	},
	authPanel: {
		width: "100%",
		maxWidth: 420,
	},
	formBlock: {
		gap: spacing.md,
		padding: spacing.md,
	},
	formActions: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: spacing.md,
		padding: spacing.md,
	},
	errorBox: {
		marginHorizontal: spacing.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.red9,
		backgroundColor: colors.red2,
		color: colors.red11,
		fontSize: 12,
	},
	list: {
		width: "100%",
		gap: spacing.sm,
	},
	taskComposerScreen: {
		flexGrow: 1,
		alignItems: "center",
		gap: spacing.lg,
		padding: spacing.lg,
	},
	composerPanel: {
		width: "100%",
		maxWidth: 640,
	},
	agentPicker: {
		gap: spacing.md,
		padding: spacing.md,
	},
	agentPickerContent: {
		gap: spacing.sm,
	},
	agentPill: {
		minHeight: 32,
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.md,
		backgroundColor: colors.grayscale2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grayscale4,
	},
	agentPillSelected: {
		backgroundColor: colors.accent3,
		borderColor: colors.accent8,
	},
	agentPillText: {
		color: colors.grayscale11,
		fontSize: 12,
		fontWeight: "600",
	},
	agentPillTextSelected: {
		color: colors.accent11,
	},
	taskLists: {
		width: "100%",
		maxWidth: 640,
		gap: spacing.lg,
	},
	taskListBlock: {
		gap: spacing.sm,
		width: "100%",
	},
	inlineHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.md,
	},
	taskHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: spacing.md,
		padding: spacing.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.grayscale4,
	},
	taskHeaderTitle: {
		minWidth: 0,
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
	},
	timeline: {
		padding: spacing.lg,
		gap: spacing.lg,
	},
	eventCard: {
		flexDirection: "row",
		gap: spacing.md,
	},
	eventMarker: {
		width: 8,
		height: 8,
		marginTop: 6,
		backgroundColor: colors.accent9,
	},
	eventBody: {
		flex: 1,
		minWidth: 0,
		gap: spacing.xs,
		paddingBottom: spacing.md,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.grayscale4,
	},
	eventText: {
		...textStyles.body,
	},
	sidePanel: {
		gap: spacing.md,
		padding: spacing.md,
	},
	sidePanelHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	serviceRow: {
		gap: 2,
		paddingVertical: spacing.sm,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.grayscale4,
	},
	diffText: {
		color: colors.grayscale11,
		fontFamily: "Courier",
		fontSize: 11,
		lineHeight: 15,
	},
	messageDock: {
		padding: spacing.sm,
		backgroundColor: colors.grayscale1,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.grayscale4,
	},
	messagePanel: {
		gap: spacing.sm,
	},
	messageField: {
		minHeight: 84,
		borderWidth: 0,
		backgroundColor: colors.grayscale1,
	},
	formSheet: {
		gap: spacing.lg,
		padding: spacing.lg,
		paddingBottom: spacing.xxl,
	},
	sheetHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: spacing.md,
	},
	settingsSection: {
		minHeight: 56,
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
		padding: spacing.md,
		backgroundColor: colors.grayscale2,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grayscale4,
	},
	settingsEditor: {
		gap: spacing.md,
		padding: spacing.md,
	},
	compactRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
		paddingVertical: spacing.sm,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: colors.grayscale4,
	},
	rowContent: {
		flex: 1,
		minWidth: 0,
	},
	iconButton: {
		width: 34,
		height: 34,
		alignItems: "center",
		justifyContent: "center",
	},
	settingsForm: {
		gap: spacing.sm,
	},
});
