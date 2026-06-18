import type { InstaQLEntity } from "@instantdb/react-native";
import { StatusBar } from "expo-status-bar";
import { DateTime } from "luxon";
import {
	ArrowLeft,
	ArrowSquareOut,
	CheckCircle,
	CircleNotch,
	GitPullRequest,
	PaperPlaneTilt,
	PlusCircle,
	Robot,
	SignOut,
	WarningCircle,
	XCircle,
} from "phosphor-react-native";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	useColorScheme,
	View,
} from "react-native";
import { isCompletedTask, toTaskDotStatus } from "./helpers/task-status-helper";
import { formatWorkspaceHandle } from "./helpers/workspace-handle-helper";
import db, { id } from "./instant.client";
import type { AppSchema } from "./instant.schema";

type Theme = typeof lightTheme;
type Workspace = Pick<
	InstaQLEntity<AppSchema, "workspaces">,
	"id" | "name" | "handle" | "createdAt"
> & {
	tasks?: Task[];
	workspaceAgents?: WorkspaceAgent[];
};
type Task = InstaQLEntity<AppSchema, "tasks"> & {
	agent?: Agent;
	workspaceAgent?: WorkspaceAgent;
	agentSessions?: AgentSession[];
	events?: EventEntity[];
	services?: ServiceEntity[];
};
type Agent = Pick<InstaQLEntity<AppSchema, "agents">, "id" | "name">;
type WorkspaceAgent = Pick<
	InstaQLEntity<AppSchema, "workspaceAgents">,
	"id" | "name" | "settings"
> & {
	agent?: Agent;
};
type AgentSession = Pick<
	InstaQLEntity<AppSchema, "agentSessions">,
	"id" | "name" | "status" | "createdAt" | "updatedAt"
>;
type EventEntity = InstaQLEntity<AppSchema, "events">;
type ServiceEntity = Pick<
	InstaQLEntity<AppSchema, "services">,
	"id" | "name" | "url" | "status" | "portNumber"
>;
type JsonRecord = Record<string, unknown>;
type Screen =
	| { name: "workspaces" }
	| { name: "workspace"; workspaceId: string }
	| { name: "task"; workspaceId: string; taskId: string };

const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_REASONING_EFFORT = "medium";
const DEFAULT_CODEX_SPEED = "standard";

const lightTheme = {
	background: "#fbfbfc",
	surface: "#ffffff",
	surfaceMuted: "#f3f3f5",
	border: "#dfdfe3",
	borderStrong: "#c8c8cf",
	text: "#1c1c1f",
	textMuted: "#696970",
	textSubtle: "#8a8a91",
	accent: "#285eff",
	accentMuted: "#edf2ff",
	accentText: "#ffffff",
	success: "#12823b",
	successMuted: "#e8f7ee",
	warning: "#9f6400",
	warningMuted: "#fff4d7",
	danger: "#c12a2a",
	dangerMuted: "#fff0f0",
	shadow: "#000000",
};

const darkTheme: Theme = {
	background: "#111113",
	surface: "#19191c",
	surfaceMuted: "#232328",
	border: "#34343a",
	borderStrong: "#464650",
	text: "#f2f2f3",
	textMuted: "#b6b6bd",
	textSubtle: "#85858f",
	accent: "#7c9cff",
	accentMuted: "#1d2948",
	accentText: "#ffffff",
	success: "#51d88a",
	successMuted: "#173421",
	warning: "#f0bd4f",
	warningMuted: "#3d2e12",
	danger: "#ff7070",
	dangerMuted: "#421f22",
	shadow: "#000000",
};

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

const agentSessionTx = (agentSessionId: string) => {
	const tx = db.tx.agentSessions[agentSessionId];

	if (!tx) {
		throw new Error(
			`Agent session transaction builder ${agentSessionId} not found`,
		);
	}

	return tx;
};

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
	}

	return tx;
};

const memberTx = (memberId: string) => {
	const tx = db.tx.members[memberId];

	if (!tx) {
		throw new Error(`Member transaction builder ${memberId} not found`);
	}

	return tx;
};

export default function App() {
	const colorScheme = useColorScheme();
	const theme = colorScheme === "dark" ? darkTheme : lightTheme;

	return (
		<SafeAreaView
			style={[styles.safeArea, { backgroundColor: theme.background }]}
		>
			<StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
			<AuthGate theme={theme} />
		</SafeAreaView>
	);
}

function AuthGate({ theme }: { theme: Theme }) {
	const { isLoading, user, error } = db.useAuth();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [isCodeSent, setIsCodeSent] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState<string>();
	const trimmedEmail = email.trim();
	const trimmedCode = code.trim();
	const canSubmit =
		trimmedEmail.length > 0 && (!isCodeSent || trimmedCode.length > 0);

	const submit = async () => {
		if (!canSubmit || isSubmitting) {
			return;
		}

		setMessage(undefined);
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
				setMessage(`Code sent to ${trimmedEmail}`);
			}
		} catch (error) {
			setMessage(getErrorMessage(error, "Authentication failed"));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return <CenteredState theme={theme} label="Loading Chaterface..." />;
	}

	if (error) {
		return <CenteredState theme={theme} label={error.message} danger />;
	}

	if (user) {
		return <WorkspaceApp theme={theme} userId={user.id} />;
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={styles.keyboard}
		>
			<View style={styles.authShell}>
				<LogoMark theme={theme} size={52} />
				<View style={styles.authHeader}>
					<Text style={[styles.title, { color: theme.text }]}>
						Sign in to Chaterface
					</Text>
					<Text style={[styles.bodyText, { color: theme.textMuted }]}>
						Enter your email to receive a magic code.
					</Text>
				</View>
				<View
					style={[
						styles.authCard,
						{ backgroundColor: theme.surface, borderColor: theme.border },
					]}
				>
					<LabeledInput
						theme={theme}
						label="Email"
						value={email}
						placeholder="you@example.com"
						keyboardType="email-address"
						autoCapitalize="none"
						editable={!isSubmitting && !isCodeSent}
						onChangeText={setEmail}
					/>
					{isCodeSent ? (
						<LabeledInput
							theme={theme}
							label="Magic code"
							value={code}
							placeholder="123456"
							keyboardType="number-pad"
							autoCapitalize="none"
							editable={!isSubmitting}
							onChangeText={setCode}
						/>
					) : null}
					{message ? (
						<Text style={[styles.messageText, { color: theme.textMuted }]}>
							{message}
						</Text>
					) : null}
					<View style={styles.authActions}>
						{isCodeSent ? (
							<Pressable
								disabled={isSubmitting}
								onPress={() => {
									setIsCodeSent(false);
									setCode("");
									setMessage(undefined);
								}}
							>
								<Text style={[styles.linkText, { color: theme.textMuted }]}>
									Different email
								</Text>
							</Pressable>
						) : (
							<View />
						)}
						<PrimaryButton
							theme={theme}
							label={isCodeSent ? "Verify code" : "Send code"}
							disabled={!canSubmit || isSubmitting}
							loading={isSubmitting}
							onPress={submit}
						/>
					</View>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

function WorkspaceApp({ theme, userId }: { theme: Theme; userId: string }) {
	const [screen, setScreen] = useState<Screen>({ name: "workspaces" });
	const { isLoading, error, data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					"members.user.id": userId,
				},
			},
			tasks: {
				agentSessions: {},
			},
			workspaceAgents: {
				agent: {},
			},
		},
	});
	const workspaces = useMemo(
		() =>
			[...((data?.workspaces ?? []) as Workspace[])].sort((first, second) =>
				first.name.localeCompare(second.name),
			),
		[data?.workspaces],
	);

	if (isLoading) {
		return <CenteredState theme={theme} label="Loading workspaces..." />;
	}

	if (error) {
		return <CenteredState theme={theme} label={error.message} danger />;
	}

	const selectedWorkspace =
		screen.name === "workspace" || screen.name === "task"
			? workspaces.find((workspace) => workspace.id === screen.workspaceId)
			: undefined;

	if (screen.name === "task" && selectedWorkspace) {
		return (
			<TaskScreen
				theme={theme}
				taskId={screen.taskId}
				workspace={selectedWorkspace}
				userId={userId}
				onBack={() =>
					setScreen({ name: "workspace", workspaceId: selectedWorkspace.id })
				}
			/>
		);
	}

	if (selectedWorkspace) {
		return (
			<WorkspaceScreen
				theme={theme}
				workspace={selectedWorkspace}
				onBack={() => setScreen({ name: "workspaces" })}
				onOpenTask={(taskId) =>
					setScreen({
						name: "task",
						workspaceId: selectedWorkspace.id,
						taskId,
					})
				}
			/>
		);
	}

	return (
		<WorkspaceListScreen
			theme={theme}
			workspaces={workspaces}
			userId={userId}
			onOpenWorkspace={(workspaceId) =>
				setScreen({ name: "workspace", workspaceId })
			}
		/>
	);
}

function WorkspaceListScreen({
	theme,
	workspaces,
	userId,
	onOpenWorkspace,
}: {
	theme: Theme;
	workspaces: Workspace[];
	userId: string;
	onOpenWorkspace: (workspaceId: string) => void;
}) {
	const [isCreating, setIsCreating] = useState(false);
	const [name, setName] = useState("");
	const [handle, setHandle] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const hasWorkspaces = workspaces.length > 0;

	const updateName = (nextName: string) => {
		const previousGeneratedHandle = formatWorkspaceHandle(name);

		setName(nextName);
		setHandle((currentHandle) =>
			currentHandle === previousGeneratedHandle
				? formatWorkspaceHandle(nextName)
				: currentHandle,
		);
	};

	const createWorkspace = async () => {
		const nextName = name.trim();
		const nextHandle = formatWorkspaceHandle(handle);

		if (!nextName || !nextHandle || isSubmitting) {
			return;
		}

		setIsSubmitting(true);

		try {
			const workspaceId = id();
			const createdAt = DateTime.now().toISO();

			await db.transact([
				workspaceTx(workspaceId).create({
					name: nextName,
					handle: nextHandle,
					createdAt,
				}),
				memberTx(id())
					.update({
						createdAt,
						joinedAt: createdAt,
						role: "owner",
					})
					.link({ workspace: workspaceId, user: userId }),
			]);

			setName("");
			setHandle("");
			setIsCreating(false);
			onOpenWorkspace(workspaceId);
		} catch (error) {
			Alert.alert("Could not create workspace", getErrorMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View style={[styles.screen, { backgroundColor: theme.background }]}>
			<Header
				theme={theme}
				title="Chaterface"
				right={
					<IconButton
						theme={theme}
						label="Sign out"
						icon={<SignOut color={theme.textMuted} size={19} weight="bold" />}
						onPress={() => void db.auth.signOut()}
					/>
				}
			/>
			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					!hasWorkspaces && styles.emptyScrollContent,
				]}
			>
				{hasWorkspaces ? (
					<>
						<Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
							Workspaces
						</Text>
						<View style={styles.stack}>
							{workspaces.map((workspace) => (
								<Pressable
									key={workspace.id}
									style={[
										styles.rowCard,
										{
											backgroundColor: theme.surface,
											borderColor: theme.border,
										},
									]}
									onPress={() => onOpenWorkspace(workspace.id)}
								>
									<Monogram theme={theme} label={workspace.name} />
									<View style={styles.rowBody}>
										<Text style={[styles.rowTitle, { color: theme.text }]}>
											{workspace.name}
										</Text>
										<Text
											style={[styles.rowMeta, { color: theme.textMuted }]}
											numberOfLines={1}
										>
											@{workspace.handle}
										</Text>
									</View>
									<Text style={[styles.countText, { color: theme.textSubtle }]}>
										{workspace.tasks?.length ?? 0}
									</Text>
								</Pressable>
							))}
						</View>
					</>
				) : (
					<View style={styles.emptyState}>
						<LogoMark theme={theme} size={60} />
						<Text style={[styles.title, { color: theme.text }]}>
							Create Workspace
						</Text>
						<Text style={[styles.bodyText, { color: theme.textMuted }]}>
							Create a workspace to manage your tasks.
						</Text>
					</View>
				)}
			</ScrollView>
			<View style={[styles.bottomBar, { borderColor: theme.border }]}>
				<PrimaryButton
					theme={theme}
					label="New workspace"
					icon={<PlusCircle color={theme.accentText} size={18} weight="bold" />}
					onPress={() => setIsCreating(true)}
				/>
			</View>
			<Modal
				visible={isCreating}
				animationType="slide"
				presentationStyle="pageSheet"
			>
				<SafeAreaView
					style={[styles.safeArea, { backgroundColor: theme.background }]}
				>
					<Header
						theme={theme}
						title="New workspace"
						left={
							<TextButton
								theme={theme}
								label="Cancel"
								onPress={() => setIsCreating(false)}
							/>
						}
					/>
					<View style={styles.modalContent}>
						<LabeledInput
							theme={theme}
							label="Name"
							value={name}
							placeholder="Workspace name"
							onChangeText={updateName}
						/>
						<LabeledInput
							theme={theme}
							label="Handle"
							value={handle}
							placeholder="workspace-handle"
							autoCapitalize="none"
							onChangeText={(value) => setHandle(formatWorkspaceHandle(value))}
						/>
						<PrimaryButton
							theme={theme}
							label="Create workspace"
							loading={isSubmitting}
							disabled={!name.trim() || !handle.trim() || isSubmitting}
							onPress={createWorkspace}
						/>
					</View>
				</SafeAreaView>
			</Modal>
		</View>
	);
}

function WorkspaceScreen({
	theme,
	workspace,
	onBack,
	onOpenTask,
}: {
	theme: Theme;
	workspace: Workspace;
	onBack: () => void;
	onOpenTask: (taskId: string) => void;
}) {
	const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
	const tasks = useMemo(
		() => sortTasks(workspace.tasks ?? []),
		[workspace.tasks],
	);
	const activeTasks = tasks.filter(
		(task) => !isCompletedTask(task.status, task.completedAt),
	);
	const completedTasks = tasks.filter((task) =>
		isCompletedTask(task.status, task.completedAt),
	);

	return (
		<View style={[styles.screen, { backgroundColor: theme.background }]}>
			<Header
				theme={theme}
				title={workspace.name}
				subtitle={`@${workspace.handle}`}
				left={
					<IconButton
						theme={theme}
						label="Back"
						icon={<ArrowLeft color={theme.textMuted} size={20} weight="bold" />}
						onPress={onBack}
					/>
				}
			/>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				{tasks.length === 0 ? (
					<View style={styles.emptyState}>
						<Robot color={theme.textSubtle} size={42} weight="duotone" />
						<Text style={[styles.title, { color: theme.text }]}>
							What do you want to build?
						</Text>
						<Text style={[styles.bodyText, { color: theme.textMuted }]}>
							Create a fresh task and start an agent session.
						</Text>
					</View>
				) : (
					<>
						<TaskSection
							theme={theme}
							title="Active"
							tasks={activeTasks}
							onOpenTask={onOpenTask}
						/>
						<TaskSection
							theme={theme}
							title="Completed"
							tasks={completedTasks}
							onOpenTask={onOpenTask}
						/>
					</>
				)}
			</ScrollView>
			<View style={[styles.bottomBar, { borderColor: theme.border }]}>
				<PrimaryButton
					theme={theme}
					label="New task"
					icon={<PlusCircle color={theme.accentText} size={18} weight="bold" />}
					onPress={() => setIsNewTaskOpen(true)}
				/>
			</View>
			<NewTaskModal
				theme={theme}
				workspace={workspace}
				visible={isNewTaskOpen}
				onClose={() => setIsNewTaskOpen(false)}
				onCreated={(taskId) => {
					setIsNewTaskOpen(false);
					onOpenTask(taskId);
				}}
			/>
		</View>
	);
}

function TaskSection({
	theme,
	title,
	tasks,
	onOpenTask,
}: {
	theme: Theme;
	title: string;
	tasks: Task[];
	onOpenTask: (taskId: string) => void;
}) {
	if (tasks.length === 0) {
		return null;
	}

	return (
		<View style={styles.section}>
			<Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
				{title}
			</Text>
			<View style={styles.stack}>
				{tasks.map((task) => (
					<Pressable
						key={task.id}
						style={[
							styles.rowCard,
							{ backgroundColor: theme.surface, borderColor: theme.border },
						]}
						onPress={() => onOpenTask(task.id)}
					>
						<StatusDot theme={theme} status={task.status} />
						<View style={styles.rowBody}>
							<Text
								style={[styles.rowTitle, { color: theme.text }]}
								numberOfLines={1}
							>
								{task.name}
							</Text>
							<Text
								style={[styles.rowMeta, { color: theme.textMuted }]}
								numberOfLines={1}
							>
								{formatRelative(task.createdAt)} · {task.status ?? "idle"}
							</Text>
						</View>
					</Pressable>
				))}
			</View>
		</View>
	);
}

function TaskScreen({
	theme,
	workspace,
	taskId,
	userId,
	onBack,
}: {
	theme: Theme;
	workspace: Workspace;
	taskId: string;
	userId: string;
	onBack: () => void;
}) {
	const [message, setMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const { isLoading, error, data } = db.useQuery({
		tasks: {
			$: {
				where: {
					id: taskId,
				},
			},
			agent: {},
			workspaceAgent: {
				agent: {},
			},
			agentSessions: {},
			events: {},
			services: {},
		},
	});
	const task = data?.tasks?.[0] as Task | undefined;
	const events = useMemo(
		() => [...(task?.events ?? [])].sort(compareEvents),
		[task?.events],
	);

	const sendMessage = async () => {
		const content = message.trim();

		if (!task || !content || isSending) {
			return;
		}

		setIsSending(true);

		try {
			const now = DateTime.now().toISO();
			const agentSessionId =
				task.agentSessions?.[0]?.id ?? (await createAgentSession(task));
			const nextEventId = id();

			setMessage("");
			await db.transact([
				taskTx(task.id).update({
					status: "in_progress",
					completedAt: undefined,
					agentModel: task.agentModel ?? DEFAULT_CODEX_MODEL,
					agentReasoningEffort:
						task.agentReasoningEffort ?? DEFAULT_CODEX_REASONING_EFFORT,
					agentSpeed: task.agentSpeed ?? DEFAULT_CODEX_SPEED,
				}),
				agentSessionTx(agentSessionId).update({
					status: "running",
					updatedAt: now,
				}),
				eventTx(nextEventId)
					.create({
						type: "chaterface.new_user_message",
						data: { content, attachments: [], userId },
						createdAt: now,
					})
					.link({
						task: task.id,
						agentSession: agentSessionId,
					}),
			]);
		} catch (error) {
			Alert.alert("Could not send message", getErrorMessage(error));
		} finally {
			setIsSending(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={[styles.screen, { backgroundColor: theme.background }]}
		>
			<Header
				theme={theme}
				title={task?.name ?? "Task"}
				subtitle={workspace.name}
				left={
					<IconButton
						theme={theme}
						label="Back"
						icon={<ArrowLeft color={theme.textMuted} size={20} weight="bold" />}
						onPress={onBack}
					/>
				}
			/>
			{isLoading ? (
				<CenteredState theme={theme} label="Loading task..." />
			) : error ? (
				<CenteredState theme={theme} label={error.message} danger />
			) : !task ? (
				<CenteredState theme={theme} label="Task not found" danger />
			) : (
				<>
					<ScrollView contentContainerStyle={styles.threadContent}>
						<TaskSummary theme={theme} task={task} />
						{task.services && task.services.length > 0 ? (
							<ServiceList theme={theme} services={task.services} />
						) : null}
						{task.pullRequestUrl ? (
							<LinkCard
								theme={theme}
								icon={
									<GitPullRequest
										color={theme.accent}
										size={18}
										weight="bold"
									/>
								}
								label="Open pull request"
								url={task.pullRequestUrl}
							/>
						) : null}
						<View style={styles.stack}>
							{events.map((event) => (
								<EventCard key={event.id} theme={theme} event={event} />
							))}
						</View>
					</ScrollView>
					<View style={[styles.composer, { borderColor: theme.border }]}>
						<TextInput
							style={[
								styles.composerInput,
								{
									backgroundColor: theme.surface,
									borderColor: theme.border,
									color: theme.text,
								},
							]}
							value={message}
							placeholder="Message the agent"
							placeholderTextColor={theme.textSubtle}
							multiline
							onChangeText={setMessage}
						/>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Send message"
							disabled={message.trim().length === 0 || isSending}
							style={({ pressed }) => [
								styles.sendButton,
								{
									backgroundColor:
										message.trim().length === 0 || isSending
											? theme.border
											: theme.accent,
									opacity: pressed ? 0.78 : 1,
								},
							]}
							onPress={sendMessage}
						>
							{isSending ? (
								<ActivityIndicator color={theme.accentText} />
							) : (
								<PaperPlaneTilt
									color={theme.accentText}
									size={20}
									weight="bold"
								/>
							)}
						</Pressable>
					</View>
				</>
			)}
		</KeyboardAvoidingView>
	);
}

function NewTaskModal({
	theme,
	workspace,
	visible,
	onClose,
	onCreated,
}: {
	theme: Theme;
	workspace: Workspace;
	visible: boolean;
	onClose: () => void;
	onCreated: (taskId: string) => void;
}) {
	const [instructions, setInstructions] = useState("");
	const [workspaceAgentId, setWorkspaceAgentId] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const workspaceAgents = workspace.workspaceAgents ?? [];
	const resolvedWorkspaceAgent =
		workspaceAgents.find((agent) => agent.id === workspaceAgentId) ??
		workspaceAgents[0];
	const canSubmit =
		instructions.trim().length > 0 &&
		Boolean(resolvedWorkspaceAgent?.id && resolvedWorkspaceAgent.agent?.id) &&
		!isCreating;

	const submit = async () => {
		const trimmedInstructions = instructions.trim();

		if (!canSubmit || !resolvedWorkspaceAgent?.agent?.id) {
			return;
		}

		setIsCreating(true);

		try {
			const taskId = id();
			const agentSessionId = id();
			const nextEventId = id();
			const createdAt = DateTime.now().toISO();
			const name = cleanTaskName(trimmedInstructions) ?? "New task";

			await db.transact([
				taskTx(taskId)
					.create({
						name,
						status: "in_progress",
						instructions: trimmedInstructions,
						createdAt,
						agentModel: DEFAULT_CODEX_MODEL,
						agentReasoningEffort: DEFAULT_CODEX_REASONING_EFFORT,
						agentSpeed: DEFAULT_CODEX_SPEED,
					})
					.link({
						workspace: workspace.id,
						workspaceAgent: resolvedWorkspaceAgent.id,
						agent: resolvedWorkspaceAgent.agent.id,
					}),
				agentSessionTx(agentSessionId)
					.create({
						name: "Agent",
						status: "running",
						createdAt,
						updatedAt: createdAt,
					})
					.link({ task: taskId, agent: resolvedWorkspaceAgent.agent.id }),
				eventTx(nextEventId)
					.create({
						type: "chaterface.new_task",
						data: {
							taskId,
							name,
							instructions: trimmedInstructions,
							attachments: [],
						},
						createdAt,
					})
					.link({
						task: taskId,
						agentSession: agentSessionId,
					}),
			]);

			setInstructions("");
			onCreated(taskId);
		} catch (error) {
			Alert.alert("Could not create task", getErrorMessage(error));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<SafeAreaView
				style={[styles.safeArea, { backgroundColor: theme.background }]}
			>
				<Header
					theme={theme}
					title="New task"
					left={<TextButton theme={theme} label="Cancel" onPress={onClose} />}
				/>
				<View style={styles.modalContent}>
					<TextInput
						style={[
							styles.taskInput,
							{
								backgroundColor: theme.surface,
								borderColor: theme.border,
								color: theme.text,
							},
						]}
						value={instructions}
						placeholder="What should the agent do?"
						placeholderTextColor={theme.textSubtle}
						multiline
						textAlignVertical="top"
						onChangeText={setInstructions}
					/>
					<View style={styles.agentPicker}>
						<Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
							Agent
						</Text>
						{workspaceAgents.length === 0 ? (
							<Text style={[styles.bodyText, { color: theme.warning }]}>
								Add an agent in the web app before starting tasks here.
							</Text>
						) : (
							<View style={styles.chipRow}>
								{workspaceAgents.map((agent) => {
									const selected = agent.id === resolvedWorkspaceAgent?.id;

									return (
										<Pressable
											key={agent.id}
											style={[
												styles.chip,
												{
													backgroundColor: selected
														? theme.accentMuted
														: theme.surface,
													borderColor: selected ? theme.accent : theme.border,
												},
											]}
											onPress={() => setWorkspaceAgentId(agent.id)}
										>
											<Text
												style={[
													styles.chipText,
													{ color: selected ? theme.accent : theme.textMuted },
												]}
											>
												{agent.name}
											</Text>
										</Pressable>
									);
								})}
							</View>
						)}
					</View>
					<PrimaryButton
						theme={theme}
						label="Start task"
						loading={isCreating}
						disabled={!canSubmit}
						onPress={submit}
					/>
				</View>
			</SafeAreaView>
		</Modal>
	);
}

function TaskSummary({ theme, task }: { theme: Theme; task: Task }) {
	return (
		<View
			style={[
				styles.summaryCard,
				{ backgroundColor: theme.surface, borderColor: theme.border },
			]}
		>
			<View style={styles.summaryTitleRow}>
				<StatusDot theme={theme} status={task.status} />
				<View style={styles.rowBody}>
					<Text style={[styles.rowTitle, { color: theme.text }]}>
						{task.name}
					</Text>
					<Text style={[styles.rowMeta, { color: theme.textMuted }]}>
						{task.status ?? "idle"} · {formatRelative(task.createdAt)}
					</Text>
				</View>
			</View>
			{task.instructions ? (
				<Text style={[styles.instructions, { color: theme.textMuted }]}>
					{task.instructions}
				</Text>
			) : null}
			{task.latestDiffFileCount || task.latestDiffBytes ? (
				<Text style={[styles.rowMeta, { color: theme.textSubtle }]}>
					Latest diff: {task.latestDiffFileCount ?? 0} files
					{task.latestDiffBytes
						? ` · ${formatBytes(task.latestDiffBytes)}`
						: ""}
				</Text>
			) : null}
		</View>
	);
}

function ServiceList({
	theme,
	services,
}: {
	theme: Theme;
	services: ServiceEntity[];
}) {
	return (
		<View style={styles.stack}>
			{services.map((service) =>
				service.url ? (
					<LinkCard
						key={service.id}
						theme={theme}
						icon={
							<ArrowSquareOut color={theme.accent} size={18} weight="bold" />
						}
						label={`${service.name} · ${service.status ?? "service"}`}
						url={service.url}
					/>
				) : null,
			)}
		</View>
	);
}

function LinkCard({
	theme,
	icon,
	label,
	url,
}: {
	theme: Theme;
	icon: React.ReactNode;
	label: string;
	url: string;
}) {
	return (
		<Pressable
			style={[
				styles.linkCard,
				{ backgroundColor: theme.accentMuted, borderColor: theme.accent },
			]}
			onPress={() => void Linking.openURL(url)}
		>
			{icon}
			<Text
				style={[styles.linkCardText, { color: theme.accent }]}
				numberOfLines={1}
			>
				{label}
			</Text>
		</Pressable>
	);
}

function EventCard({ theme, event }: { theme: Theme; event: EventEntity }) {
	const eventInfo = getEventInfo(event);

	return (
		<View
			style={[
				styles.eventCard,
				{ backgroundColor: theme.surface, borderColor: theme.border },
			]}
		>
			<View style={styles.eventHeader}>
				<EventIcon theme={theme} tone={eventInfo.tone} />
				<View style={styles.rowBody}>
					<Text style={[styles.eventTitle, { color: theme.text }]}>
						{eventInfo.title}
					</Text>
					<Text style={[styles.rowMeta, { color: theme.textSubtle }]}>
						{formatRelative(event.createdAt)}
					</Text>
				</View>
			</View>
			{eventInfo.body ? (
				<Text style={[styles.eventBody, { color: theme.textMuted }]}>
					{eventInfo.body}
				</Text>
			) : null}
		</View>
	);
}

function EventIcon({
	theme,
	tone,
}: {
	theme: Theme;
	tone: "running" | "success" | "warning" | "danger" | "neutral";
}) {
	if (tone === "running") {
		return <CircleNotch color={theme.accent} size={18} weight="bold" />;
	}

	if (tone === "success") {
		return <CheckCircle color={theme.success} size={18} weight="bold" />;
	}

	if (tone === "warning") {
		return <WarningCircle color={theme.warning} size={18} weight="bold" />;
	}

	if (tone === "danger") {
		return <XCircle color={theme.danger} size={18} weight="bold" />;
	}

	return <Robot color={theme.textSubtle} size={18} weight="bold" />;
}

function Header({
	theme,
	title,
	subtitle,
	left,
	right,
}: {
	theme: Theme;
	title: string;
	subtitle?: string;
	left?: React.ReactNode;
	right?: React.ReactNode;
}) {
	return (
		<View style={[styles.header, { borderColor: theme.border }]}>
			<View style={styles.headerSide}>{left}</View>
			<View style={styles.headerTitleWrap}>
				<Text
					style={[styles.headerTitle, { color: theme.text }]}
					numberOfLines={1}
				>
					{title}
				</Text>
				{subtitle ? (
					<Text
						style={[styles.headerSubtitle, { color: theme.textMuted }]}
						numberOfLines={1}
					>
						{subtitle}
					</Text>
				) : null}
			</View>
			<View style={[styles.headerSide, styles.headerSideRight]}>{right}</View>
		</View>
	);
}

function PrimaryButton({
	theme,
	label,
	icon,
	loading,
	disabled,
	onPress,
}: {
	theme: Theme;
	label: string;
	icon?: React.ReactNode;
	loading?: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			style={({ pressed }) => [
				styles.primaryButton,
				{
					backgroundColor: disabled ? theme.borderStrong : theme.text,
					opacity: pressed ? 0.82 : 1,
				},
			]}
			onPress={onPress}
		>
			{loading ? <ActivityIndicator color={theme.background} /> : icon}
			<Text style={[styles.primaryButtonText, { color: theme.background }]}>
				{label}
			</Text>
		</Pressable>
	);
}

function IconButton({
	theme,
	label,
	icon,
	onPress,
}: {
	theme: Theme;
	label: string;
	icon: React.ReactNode;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			style={({ pressed }) => [
				styles.iconButton,
				{
					backgroundColor: theme.surface,
					borderColor: theme.border,
					opacity: pressed ? 0.76 : 1,
				},
			]}
			onPress={onPress}
		>
			{icon}
		</Pressable>
	);
}

function TextButton({
	theme,
	label,
	onPress,
}: {
	theme: Theme;
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable accessibilityRole="button" onPress={onPress}>
			<Text style={[styles.textButton, { color: theme.textMuted }]}>
				{label}
			</Text>
		</Pressable>
	);
}

function LabeledInput({
	theme,
	label,
	value,
	placeholder,
	keyboardType,
	autoCapitalize,
	editable,
	onChangeText,
}: {
	theme: Theme;
	label: string;
	value: string;
	placeholder: string;
	keyboardType?: "default" | "email-address" | "number-pad";
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	editable?: boolean;
	onChangeText: (value: string) => void;
}) {
	return (
		<View style={styles.inputGroup}>
			<Text style={[styles.inputLabel, { color: theme.textMuted }]}>
				{label}
			</Text>
			<TextInput
				style={[
					styles.textInput,
					{
						backgroundColor: theme.surfaceMuted,
						borderColor: theme.border,
						color: theme.text,
					},
				]}
				value={value}
				placeholder={placeholder}
				placeholderTextColor={theme.textSubtle}
				keyboardType={keyboardType}
				autoCapitalize={autoCapitalize}
				editable={editable}
				onChangeText={onChangeText}
			/>
		</View>
	);
}

function CenteredState({
	theme,
	label,
	danger,
}: {
	theme: Theme;
	label: string;
	danger?: boolean;
}) {
	return (
		<View style={styles.centeredState}>
			<LogoMark theme={theme} size={48} />
			<Text
				style={[
					styles.bodyText,
					{ color: danger ? theme.danger : theme.textMuted },
				]}
			>
				{label}
			</Text>
		</View>
	);
}

function LogoMark({ theme, size }: { theme: Theme; size: number }) {
	return (
		<View
			style={[
				styles.logo,
				{
					width: size,
					height: size,
					backgroundColor: theme.text,
				},
			]}
		>
			<View
				style={[
					styles.logoCutout,
					{
						borderColor: theme.background,
						width: size * 0.52,
						height: size * 0.52,
					},
				]}
			/>
		</View>
	);
}

function Monogram({ theme, label }: { theme: Theme; label: string }) {
	return (
		<View
			style={[
				styles.monogram,
				{ backgroundColor: theme.surfaceMuted, borderColor: theme.border },
			]}
		>
			<Text style={[styles.monogramText, { color: theme.text }]}>
				{label.trim().charAt(0).toUpperCase() || "C"}
			</Text>
		</View>
	);
}

function StatusDot({
	theme,
	status,
}: {
	theme: Theme;
	status: string | undefined;
}) {
	const dotStatus = toTaskDotStatus(status);
	const backgroundColor =
		dotStatus === "running"
			? theme.accent
			: dotStatus === "failed"
				? theme.danger
				: dotStatus === "complete"
					? theme.success
					: theme.textSubtle;

	return <View style={[styles.statusDot, { backgroundColor }]} />;
}

async function createAgentSession(task: Task) {
	const agentId = task.workspaceAgent?.agent?.id ?? task.agent?.id;
	const agentSessionId = id();
	const createdAt = DateTime.now().toISO();
	const transaction = agentSessionTx(agentSessionId).create({
		name: "Agent",
		status: "idle",
		createdAt,
		updatedAt: createdAt,
	});

	await db.transact(
		agentId
			? transaction.link({ task: task.id, agent: agentId })
			: transaction.link({ task: task.id }),
	);

	return agentSessionId;
}

function sortTasks(tasks: Task[]) {
	return [...tasks].sort((first, second) => {
		const firstComplete = isCompletedTask(first.status, first.completedAt);
		const secondComplete = isCompletedTask(second.status, second.completedAt);

		if (firstComplete !== secondComplete) {
			return firstComplete ? 1 : -1;
		}

		return String(second.createdAt ?? "").localeCompare(
			String(first.createdAt ?? ""),
		);
	});
}

function compareEvents(first: EventEntity, second: EventEntity) {
	return String(first.createdAt ?? "").localeCompare(
		String(second.createdAt ?? ""),
	);
}

function getEventInfo(event: EventEntity) {
	const type = event.type ?? "";
	const data = asRecord(event.data) ?? {};

	if (type === "chaterface.new_task") {
		return {
			title: "New task",
			body: getString(data, "instructions"),
			tone: "neutral" as const,
		};
	}

	if (type === "chaterface.new_user_message") {
		return {
			title: "You",
			body: getString(data, "content"),
			tone: "neutral" as const,
		};
	}

	if (type === "codex.turn.started") {
		return {
			title: "Agent started",
			body: undefined,
			tone: "running" as const,
		};
	}

	if (type === "codex.turn.completed") {
		return {
			title: "Agent completed",
			body: undefined,
			tone: "success" as const,
		};
	}

	if (type.includes("failed")) {
		return {
			title: humanizeEventType(type),
			body: getString(data, "message") ?? getString(data, "error"),
			tone: "danger" as const,
		};
	}

	if (type.includes("warning")) {
		return {
			title: humanizeEventType(type),
			body: getString(data, "message"),
			tone: "warning" as const,
		};
	}

	const item = asRecord(data.item);
	const output = item
		? (getString(item, "output") ?? getString(item, "text"))
		: undefined;

	return {
		title: humanizeEventType(type || "Event"),
		body: output ?? getString(data, "message"),
		tone: type.endsWith("completed")
			? ("success" as const)
			: ("neutral" as const),
	};
}

function humanizeEventType(type: string) {
	return type
		.replace(/^chaterface\./, "")
		.replace(/^codex\./, "")
		.replace(/[._-]+/g, " ")
		.replace(/\b\w/g, (match) => match.toUpperCase());
}

function asRecord(value: unknown): JsonRecord | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as JsonRecord)
		: undefined;
}

function getString(record: JsonRecord, key: string) {
	const value = record[key];

	return typeof value === "string" && value.trim() ? value : undefined;
}

function cleanTaskName(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const firstLine = value.split("\n")[0] ?? "";
	const normalized = firstLine
		.trim()
		.replace(/^["'`]+|["'`.]+$/g, "")
		.replace(/\s+/g, " ");

	if (!normalized) {
		return undefined;
	}

	return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

function formatRelative(value: unknown) {
	if (!value) {
		return "just now";
	}

	const date = DateTime.fromISO(String(value));

	if (!date.isValid) {
		return "just now";
	}

	return date.toRelative() ?? date.toLocaleString(DateTime.DATETIME_MED);
}

function formatBytes(value: number) {
	if (value < 1024) {
		return `${value} B`;
	}

	if (value < 1024 * 1024) {
		return `${Math.round(value / 1024)} KB`;
	}

	return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown, fallback = "Something went wrong") {
	return error instanceof Error ? error.message : fallback;
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	keyboard: {
		flex: 1,
	},
	screen: {
		flex: 1,
	},
	authShell: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 20,
		gap: 22,
	},
	authHeader: {
		alignItems: "center",
		gap: 5,
	},
	authCard: {
		width: "100%",
		borderWidth: StyleSheet.hairlineWidth,
		padding: 14,
		gap: 14,
	},
	authActions: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 14,
	},
	header: {
		minHeight: 58,
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		gap: 8,
	},
	headerSide: {
		width: 48,
		alignItems: "flex-start",
	},
	headerSideRight: {
		alignItems: "flex-end",
	},
	headerTitleWrap: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		minWidth: 0,
	},
	headerTitle: {
		fontSize: 15,
		fontWeight: "700",
	},
	headerSubtitle: {
		fontSize: 12,
		marginTop: 1,
	},
	scrollContent: {
		padding: 14,
		paddingBottom: 96,
	},
	emptyScrollContent: {
		flexGrow: 1,
		justifyContent: "center",
	},
	threadContent: {
		padding: 12,
		paddingBottom: 106,
		gap: 12,
	},
	bottomBar: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: StyleSheet.hairlineWidth,
		padding: 12,
		paddingBottom: 14,
	},
	modalContent: {
		flex: 1,
		padding: 16,
		gap: 16,
	},
	stack: {
		gap: 8,
	},
	section: {
		marginBottom: 20,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
		marginBottom: 8,
	},
	rowCard: {
		minHeight: 60,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	rowBody: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 15,
		fontWeight: "700",
	},
	rowMeta: {
		fontSize: 12,
		marginTop: 2,
	},
	countText: {
		fontSize: 12,
		fontWeight: "700",
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingHorizontal: 24,
		paddingVertical: 48,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		textAlign: "center",
	},
	bodyText: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: "center",
	},
	messageText: {
		fontSize: 13,
		lineHeight: 18,
	},
	linkText: {
		fontSize: 13,
		fontWeight: "600",
	},
	primaryButton: {
		minHeight: 42,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
	},
	primaryButtonText: {
		fontSize: 14,
		fontWeight: "800",
	},
	iconButton: {
		width: 38,
		height: 38,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: "center",
		justifyContent: "center",
	},
	textButton: {
		fontSize: 14,
		fontWeight: "700",
	},
	inputGroup: {
		gap: 6,
	},
	inputLabel: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "uppercase",
	},
	textInput: {
		minHeight: 44,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 11,
		fontSize: 15,
	},
	taskInput: {
		minHeight: 180,
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		fontSize: 15,
		lineHeight: 21,
	},
	agentPicker: {
		gap: 8,
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	chip: {
		minHeight: 34,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	chipText: {
		fontSize: 13,
		fontWeight: "700",
	},
	summaryCard: {
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		gap: 10,
	},
	summaryTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	instructions: {
		fontSize: 14,
		lineHeight: 20,
	},
	linkCard: {
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	linkCardText: {
		flex: 1,
		fontSize: 14,
		fontWeight: "800",
	},
	eventCard: {
		borderWidth: StyleSheet.hairlineWidth,
		padding: 12,
		gap: 8,
	},
	eventHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 9,
	},
	eventTitle: {
		fontSize: 14,
		fontWeight: "800",
	},
	eventBody: {
		fontSize: 14,
		lineHeight: 20,
	},
	composer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		borderTopWidth: StyleSheet.hairlineWidth,
		padding: 10,
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
	},
	composerInput: {
		flex: 1,
		minHeight: 42,
		maxHeight: 112,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 11,
		paddingVertical: 9,
		fontSize: 15,
		lineHeight: 20,
	},
	sendButton: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	centeredState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 14,
		paddingHorizontal: 24,
	},
	logo: {
		alignItems: "center",
		justifyContent: "center",
	},
	logoCutout: {
		borderWidth: 3,
	},
	monogram: {
		width: 38,
		height: 38,
		borderWidth: StyleSheet.hairlineWidth,
		alignItems: "center",
		justifyContent: "center",
	},
	monogramText: {
		fontSize: 14,
		fontWeight: "800",
	},
	statusDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
});
