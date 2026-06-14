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
	Shapes,
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
	getRememberedFactory,
	rememberLastFactory,
} from "./src/utils/last-factory";
import { toTaskDotStatus } from "./src/utils/task-status";

type RootStackParamList = {
	Home: undefined;
	Factories: { orgHandle: string };
	Factory: { orgHandle: string; factoryId: string };
	Task: { orgHandle: string; factoryId: string; taskId: string };
	NewOrganisation: undefined;
	NewFactory: {
		orgHandle: string;
		organisationId: string;
		organisationName: string;
	};
	FactoryMenu: { orgHandle: string; factoryId: string };
	FactorySettings: { orgHandle: string; factoryId: string };
};

type Organisation = InstaQLEntity<AppSchema, "organisations"> & {
	factories?: Factory[];
	agents?: Agent[];
	members?: Member[];
};
type Factory = InstaQLEntity<AppSchema, "factories"> & {
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
							name="Factories"
							component={FactoriesScreen}
							options={{ title: "Factories" }}
						/>
						<Stack.Screen
							name="Factory"
							component={FactoryScreen}
							options={({ navigation, route }) => ({
								title: "New Task",
								headerRight: () => (
									<Pressable
										onPress={() =>
											navigation.navigate("FactoryMenu", route.params)
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
											navigation.navigate("FactoryMenu", {
												orgHandle: route.params.orgHandle,
												factoryId: route.params.factoryId,
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
							name="NewOrganisation"
							component={NewOrganisationScreen}
							options={{
								title: "New Organisation",
								presentation: Platform.OS === "ios" ? "formSheet" : "modal",
							}}
						/>
						<Stack.Screen
							name="NewFactory"
							component={NewFactoryScreen}
							options={{
								title: "New Factory",
								presentation: Platform.OS === "ios" ? "formSheet" : "modal",
							}}
						/>
						<Stack.Screen
							name="FactoryMenu"
							component={FactoryMenuScreen}
							options={{
								title: "Factory",
								presentation: Platform.OS === "ios" ? "formSheet" : "modal",
							}}
						/>
						<Stack.Screen
							name="FactorySettings"
							component={FactorySettingsScreen}
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
		organisations: {
			$: {
				where: {
					"members.user.id": currentUserId,
				},
			},
			factories: {},
		},
	});
	const organisations = (data?.organisations ?? []) as Organisation[];

	useEffect(() => {
		if (!user?.id || organisations.length === 0) {
			return;
		}

		let cancelled = false;

		const routeToRememberedFactory = async () => {
			const remembered = await getRememberedFactory(user.id);
			const accessibleFactories = organisations.flatMap((organisation) =>
				(organisation.factories ?? []).map((factory) => ({
					factoryId: factory.id,
					orgHandle: organisation.handle,
				})),
			);
			const target =
				accessibleFactories.find(
					(factory) =>
						remembered &&
						factory.factoryId === remembered.factoryId &&
						factory.orgHandle === remembered.orgHandle,
				) ?? accessibleFactories[0];

			if (!cancelled && target) {
				navigation.replace("Factory", target);
			}
		};

		void routeToRememberedFactory();

		return () => {
			cancelled = true;
		};
	}, [navigation, organisations, user?.id]);

	if (isLoading) {
		return <LoadingState label="Loading organisations..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<Screen>
			<ScrollView contentContainerStyle={styles.listScreen}>
				<Logo size={8} />
				<View style={styles.centeredBlock}>
					<Text style={textStyles.heading}>Your Organisations</Text>
					<Text style={styles.centeredCopy}>
						Select your organisation to manage your factories
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
					{organisations.map((organisation) => (
						<ListRow
							key={organisation.id}
							icon={<Monogram seed={organisation.name} letters={1} />}
							onPress={() =>
								navigation.navigate("Factories", {
									orgHandle: organisation.handle,
								})
							}
						>
							<Text style={textStyles.heading}>{organisation.name}</Text>
							<Text style={textStyles.caption}>{organisation.handle}</Text>
						</ListRow>
					))}
				</View>
				<Button
					icon={<Buildings color={colors.grayscale1} size={16} weight="bold" />}
					onPress={() => navigation.navigate("NewOrganisation")}
				>
					New Organisation
				</Button>
			</ScrollView>
		</Screen>
	);
}

function FactoriesScreen({
	navigation,
	route,
}: NativeStackScreenProps<RootStackParamList, "Factories">) {
	const { user } = db.useAuth();
	const currentUserId = user?.id ?? "__unauthenticated__";
	const { orgHandle } = route.params;
	const { data, isLoading, error } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: orgHandle,
					"members.user.id": currentUserId,
				},
			},
			factories: {},
		},
	});
	const organisation = data?.organisations?.[0] as Organisation | undefined;
	const factories = organisation?.factories ?? [];

	useEffect(() => {
		if (!user?.id || factories.length === 0) {
			return;
		}

		let cancelled = false;

		const routeToRememberedFactory = async () => {
			const remembered = await getRememberedFactory(user.id);
			const target =
				factories.find(
					(factory) =>
						remembered &&
						factory.id === remembered.factoryId &&
						remembered.orgHandle === orgHandle,
				) ?? factories[0];

			if (!cancelled && target) {
				navigation.replace("Factory", {
					orgHandle,
					factoryId: target.id,
				});
			}
		};

		void routeToRememberedFactory();

		return () => {
			cancelled = true;
		};
	}, [factories, navigation, orgHandle, user?.id]);

	if (isLoading) {
		return <LoadingState label="Loading factories..." />;
	}

	if (error) {
		return <ErrorState message={error.message} />;
	}

	return (
		<Screen>
			<ScrollView contentContainerStyle={styles.listScreen}>
				<Logo size={8} />
				<View style={styles.centeredBlock}>
					<Text style={textStyles.heading}>
						{organisation?.name ?? orgHandle}
					</Text>
					<Text style={styles.centeredCopy}>
						Select a factory to manage your tasks
					</Text>
				</View>
				<View style={styles.list}>
					{factories.map((factory) => (
						<ListRow
							key={factory.id}
							icon={<Monogram seed={factory.name} letters={2} />}
							onPress={() =>
								navigation.navigate("Factory", {
									orgHandle,
									factoryId: factory.id,
								})
							}
						>
							<Text style={textStyles.heading}>{factory.name}</Text>
							{factory.gitAuthorName ? (
								<Text style={textStyles.caption}>{factory.gitAuthorName}</Text>
							) : null}
						</ListRow>
					))}
				</View>
				{organisation ? (
					<Button
						icon={<Shapes color={colors.grayscale1} size={16} weight="bold" />}
						onPress={() =>
							navigation.navigate("NewFactory", {
								orgHandle,
								organisationId: organisation.id,
								organisationName: organisation.name,
							})
						}
					>
						New Factory
					</Button>
				) : null}
			</ScrollView>
		</Screen>
	);
}

function FactoryScreen({
	navigation,
	route,
}: NativeStackScreenProps<RootStackParamList, "Factory">) {
	const { orgHandle, factoryId } = route.params;
	const { user } = db.useAuth();
	const [taskName, setTaskName] = useState("");
	const [instructions, setInstructions] = useState("");
	const [agentId, setAgentId] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const { data, isLoading, error } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: orgHandle,
				},
			},
			agents: {
				$: {
					fields: ["name", "provider", "settings"],
				},
			},
		},
		factories: {
			$: {
				where: {
					id: factoryId,
				},
			},
		},
		tasks: {
			$: {
				where: {
					factory: factoryId,
				},
			},
		},
	});
	const organisation = data?.organisations?.[0] as Organisation | undefined;
	const factory = data?.factories?.[0] as Factory | undefined;
	const agents = organisation?.agents ?? [];
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

		void rememberLastFactory({
			factoryId,
			orgHandle,
			userId: user.id,
		});
	}, [factoryId, orgHandle, user?.id]);

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
					.link({ factory: factoryId, agent: resolvedAgentId }),
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
			navigation.navigate("Task", { orgHandle, factoryId, taskId });
		} catch (nextError) {
			Alert.alert("Failed to create task", getErrorMessage(nextError));
		} finally {
			setIsCreating(false);
		}
	};

	if (isLoading) {
		return <LoadingState label="Loading factory..." />;
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
						<Text style={styles.centeredCopy}>{factory?.name}</Text>
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
							orgHandle={orgHandle}
							factoryId={factoryId}
							navigation={navigation}
						/>
						{completedTasks.length > 0 ? (
							<TaskList
								title="Completed Tasks"
								count={completedTasks.length}
								tasks={completedTasks}
								orgHandle={orgHandle}
								factoryId={factoryId}
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
	orgHandle,
	factoryId,
	navigation,
}: {
	title: string;
	count: number;
	tasks: Task[];
	orgHandle: string;
	factoryId: string;
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
								orgHandle,
								factoryId,
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

function NewOrganisationScreen({
	navigation,
}: NativeStackScreenProps<RootStackParamList, "NewOrganisation">) {
	const { user } = db.useAuth();
	const [name, setName] = useState("");
	const [handle, setHandle] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const createOrganisation = async () => {
		if (!user?.id || isCreating || !name.trim() || !handle.trim()) {
			return;
		}

		setIsCreating(true);

		try {
			const organisationId = id();
			await db.transact([
				tx("organisations", organisationId).create({
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
					.link({ organisation: organisationId, user: user.id }),
			]);
			navigation.replace("Factories", { orgHandle: handle.trim() });
		} catch (nextError) {
			Alert.alert("Failed to create organisation", getErrorMessage(nextError));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<FormSheet>
			<Panel>
				<View style={styles.formBlock}>
					<SectionLabel
						label="Name"
						description="The name of the organisation."
					/>
					<Field
						onChangeText={setName}
						placeholder="Organisation Name"
						value={name}
					/>
				</View>
				<View style={styles.formBlock}>
					<SectionLabel
						label="Handle"
						description="A unique handle used by this organisation."
					/>
					<Field
						autoCapitalize="none"
						onChangeText={setHandle}
						placeholder="Organisation Handle"
						value={handle}
					/>
				</View>
				<View style={styles.formActions}>
					<Button variant="ghost" onPress={() => navigation.goBack()}>
						Cancel
					</Button>
					<Button
						disabled={isCreating || !name.trim() || !handle.trim()}
						onPress={createOrganisation}
					>
						Create
					</Button>
				</View>
			</Panel>
		</FormSheet>
	);
}

function NewFactoryScreen({
	navigation,
	route,
}: NativeStackScreenProps<RootStackParamList, "NewFactory">) {
	const { orgHandle, organisationId, organisationName } = route.params;
	const { user } = db.useAuth();
	const [name, setName] = useState("");
	const [githubToken, setGithubToken] = useState("");
	const [gitAuthorName, setGitAuthorName] = useState("");
	const [gitAuthorEmail, setGitAuthorEmail] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const createFactory = async () => {
		if (!user?.id || isCreating || !name.trim()) {
			return;
		}

		setIsCreating(true);

		try {
			const factoryId = id();
			await db.transact(
				tx("factories", factoryId)
					.create({
						name: name.trim(),
						createdAt: nowIso(),
						gitAuthorName: gitAuthorName.trim() || undefined,
						gitAuthorEmail: gitAuthorEmail.trim() || undefined,
					})
					.link({ organisation: organisationId }),
			);

			if (githubToken.trim() && API_BASE_URL) {
				await fetch(`${API_BASE_URL}/api/factories/saveGithub`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${user.refresh_token}`,
					},
					body: JSON.stringify({
						factoryId,
						githubAccessToken: githubToken.trim(),
						gitAuthorName: gitAuthorName.trim(),
						gitAuthorEmail: gitAuthorEmail.trim(),
					}),
				});
			}

			await rememberLastFactory({
				factoryId,
				orgHandle,
				userId: user.id,
			});
			navigation.replace("Factory", { orgHandle, factoryId });
		} catch (nextError) {
			Alert.alert("Failed to create factory", getErrorMessage(nextError));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<FormSheet>
			<Panel>
				<View style={styles.formBlock}>
					<SectionLabel
						label="Name"
						description={`Set up a new factory for ${organisationName}.`}
					/>
					<Field
						onChangeText={setName}
						placeholder="Factory Name"
						value={name}
					/>
				</View>
				<View style={styles.formBlock}>
					<SectionLabel
						label="GitHub Access Token"
						description="Used to authenticate with your repositories."
					/>
					<Field
						autoCapitalize="none"
						onChangeText={setGithubToken}
						placeholder="GitHub Access Token"
						secureTextEntry
						value={githubToken}
					/>
				</View>
				<View style={styles.formBlock}>
					<SectionLabel
						label="Git Author Name"
						description="The name used for commits made by this factory."
					/>
					<Field
						onChangeText={setGitAuthorName}
						placeholder="Git Author Name"
						value={gitAuthorName}
					/>
				</View>
				<View style={styles.formBlock}>
					<SectionLabel
						label="Git Author Email"
						description="The email used for commits made by this factory."
					/>
					<Field
						autoCapitalize="none"
						keyboardType="email-address"
						onChangeText={setGitAuthorEmail}
						placeholder="Git Author Email"
						value={gitAuthorEmail}
					/>
				</View>
				<View style={styles.formActions}>
					<Button variant="ghost" onPress={() => navigation.goBack()}>
						Cancel
					</Button>
					<Button disabled={isCreating || !name.trim()} onPress={createFactory}>
						Create
					</Button>
				</View>
			</Panel>
		</FormSheet>
	);
}

function FactoryMenuScreen({
	navigation,
	route,
}: NativeStackScreenProps<RootStackParamList, "FactoryMenu">) {
	const { orgHandle, factoryId } = route.params;
	const { data, isLoading, error } = db.useQuery({
		factories: {
			$: {
				where: {
					id: factoryId,
				},
			},
		},
		tasks: {
			$: {
				where: {
					factory: factoryId,
				},
			},
		},
	});
	const factory = data?.factories?.[0] as Factory | undefined;
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
					<Text style={textStyles.title}>{factory?.name}</Text>
					<Text style={textStyles.caption}>{orgHandle}</Text>
				</View>
				<Button
					variant="secondary"
					icon={<GearSix color={colors.grayscale11} size={16} weight="bold" />}
					onPress={() =>
						navigation.navigate("FactorySettings", { orgHandle, factoryId })
					}
				>
					Settings
				</Button>
			</View>
			<Button
				icon={<PlusCircle color={colors.grayscale1} size={16} weight="bold" />}
				onPress={() => navigation.navigate("Factory", { orgHandle, factoryId })}
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
									orgHandle,
									factoryId,
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

function FactorySettingsScreen({
	route,
}: NativeStackScreenProps<RootStackParamList, "FactorySettings">) {
	const { orgHandle, factoryId } = route.params;
	const [repositoryUrl, setRepositoryUrl] = useState("");
	const [repositoryPath, setRepositoryPath] = useState("");
	const [environmentPath, setEnvironmentPath] = useState("");
	const [environmentContent, setEnvironmentContent] = useState("");
	const [secretName, setSecretName] = useState("");
	const [secretValue, setSecretValue] = useState("");
	const { data, isLoading, error } = db.useQuery({
		factories: {
			$: {
				where: {
					id: factoryId,
				},
			},
			repositories: {},
			environmentFiles: {},
			secrets: {},
			apiKeys: {},
		},
		organisations: {
			$: {
				where: {
					handle: orgHandle,
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
		},
	});
	const factory = data?.factories?.[0] as Factory | undefined;
	const organisation = data?.organisations?.[0] as Organisation | undefined;

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
				.link({ factory: factoryId }),
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
				.link({ factory: factoryId }),
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
				.link({ factory: factoryId }),
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
					<Text style={textStyles.title}>{factory?.name}</Text>
					<Text style={textStyles.caption}>Factory Settings</Text>
				</View>
			</View>
			<SettingsSection
				icon={<GearSix color={colors.grayscale11} size={17} weight="bold" />}
				title="GitHub"
				description={
					factory?.gitAuthorName || factory?.gitAuthorEmail
						? [factory.gitAuthorName, factory.gitAuthorEmail]
								.filter(Boolean)
								.join(" · ")
						: "Configure GitHub token from web or during factory creation."
				}
			/>
			<SettingsEditor
				title="Repositories"
				rows={(factory?.repositories ?? []).map((repository) => ({
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
				rows={(factory?.environmentFiles ?? []).map((file) => ({
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
				rows={(factory?.secrets ?? []).map((secret) => ({
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
				description={`${organisation?.agents?.length ?? 0} configured`}
			/>
			<SettingsSection
				icon={<UserCircle color={colors.grayscale11} size={17} weight="bold" />}
				title="Members"
				description={`${organisation?.members?.length ?? 0} members`}
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
	await AsyncStorage.removeItem("factoryplane:last-factory");
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
