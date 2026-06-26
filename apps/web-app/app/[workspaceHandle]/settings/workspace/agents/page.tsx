"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import {
	ArrowSquareOutIcon,
	DownloadSimpleIcon,
	PlusIcon,
	RobotIcon,
	TrashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
	type AgentDefaultOptions,
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
	getAgentDefaultOptions,
	getAgentSettingsRecord,
} from "@/codex-options";
import { Button } from "@/components/Button";
import CornerBrackets from "@/components/CornerBrackets";
import { Dialog } from "@/components/Dialog";
import { Input } from "@/components/Input";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type Agent = InstaQLEntity<AppSchema, "agents">;
type WorkspaceAgent = InstaQLEntity<AppSchema, "workspaceAgents"> & {
	agent?: Agent;
};
type WorkspaceSummary = Pick<
	InstaQLEntity<AppSchema, "workspaces">,
	"id" | "handle" | "name"
>;
type ImportableAgent = Agent & {
	workspaceAgents?: Array<WorkspaceAgent & { workspace?: WorkspaceSummary }>;
};
type AgentProvider = "codex" | "cursor" | "claude" | "opencode";
type CodexDeviceAuth = {
	verificationUri: string;
	userCode: string;
};

const DEFAULT_OPENCODE_PROVIDER_ID = "anthropic";

const PROVIDERS: {
	value: AgentProvider;
	label: string;
	description: string;
	authLabel?: string;
	authPlaceholder?: string;
	defaultModel: string;
}[] = [
	{
		value: "codex",
		label: "Codex",
		description:
			"Uses Codex CLI device code auth and the existing Codex runner.",
		defaultModel: DEFAULT_CODEX_MODEL,
	},
	{
		value: "cursor",
		label: "Cursor",
		description: "Uses Cursor CLI with CURSOR_API_KEY for headless runs.",
		authLabel: "Cursor API key",
		authPlaceholder: "Cursor API key",
		defaultModel: DEFAULT_CODEX_MODEL,
	},
	{
		value: "claude",
		label: "Claude Code",
		description: "Uses Claude Code headless mode with ANTHROPIC_API_KEY.",
		authLabel: "Anthropic API key",
		authPlaceholder: "Anthropic API key",
		defaultModel: "sonnet",
	},
	{
		value: "opencode",
		label: "OpenCode",
		description:
			"Uses OpenCode run mode with credentials stored in OpenCode auth.json.",
		authLabel: "Provider API key",
		authPlaceholder: "Provider API key",
		defaultModel: "anthropic/claude-sonnet-4-5",
	},
];

const workspaceAgentTx = (workspaceAgentId: string) => {
	const tx = db.tx.workspaceAgents[workspaceAgentId];

	if (!tx) {
		throw new Error(
			`Workspace agent transaction builder ${workspaceAgentId} not found`,
		);
	}

	return tx;
};

const getProviderLabel = (provider: string | undefined) =>
	PROVIDERS.find((item) => item.value === provider)?.label ?? "Codex";

const getProviderDefaultModel = (provider: AgentProvider) =>
	PROVIDERS.find((item) => item.value === provider)?.defaultModel ??
	DEFAULT_CODEX_MODEL;

export default function AgentsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { user } = db.useAuth();
	const [name, setName] = useState("");
	const [provider, setProvider] = useState<AgentProvider>("codex");
	const [agentApiKey, setAgentApiKey] = useState("");
	const [opencodeProviderId, setOpenCodeProviderId] = useState(
		DEFAULT_OPENCODE_PROVIDER_ID,
	);
	const [pendingCodexWorkspaceAgentId, setPendingCodexWorkspaceAgentId] =
		useState<string>();
	const [codexDeviceAuth, setCodexDeviceAuth] = useState<CodexDeviceAuth>();
	const [codexAuthStatus, setCodexAuthStatus] = useState<string>();
	const [codexAuthOutput, setCodexAuthOutput] = useState<string>();
	const [codexAuthModalOpen, setCodexAuthModalOpen] = useState(false);
	const [isStartingCodexAuth, setIsStartingCodexAuth] = useState(false);
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);
	const [formError, setFormError] = useState<string>();
	const [importingAgentIds, setImportingAgentIds] = useState(
		() => new Set<string>(),
	);
	const [importStatus, setImportStatus] = useState<string>();

	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			workspaceAgents: {
				$: {
					fields: ["name", "createdAt", "settings", "status"],
				},
				agent: {
					$: {
						fields: [
							"name",
							"authState",
							"createdAt",
							"provider",
							"providerAccountId",
							"settings",
							"status",
						],
					},
				},
			},
		},
	});
	const { data: createdAgentsData, isLoading: isLoadingCreatedAgents } =
		db.useQuery({
			$users: {
				$: {
					where: {
						id: user?.id ?? "__missing_user__",
					},
				},
				createdAgents: {
					$: {
						fields: [
							"name",
							"createdAt",
							"provider",
							"providerAccountId",
							"settings",
							"status",
						],
					},
					workspaceAgents: {
						$: {
							fields: ["name", "settings"],
						},
						workspace: {
							$: {
								fields: ["name", "handle"],
							},
						},
					},
				},
			},
		});

	const workspace = data?.workspaces?.[0];
	const agents = useMemo(
		() =>
			[
				...((workspace?.workspaceAgents as WorkspaceAgent[] | undefined) ?? []),
			].sort(
				(firstAgent, secondAgent) =>
					new Date(secondAgent.createdAt ?? 0).getTime() -
					new Date(firstAgent.createdAt ?? 0).getTime(),
			),
		[workspace?.workspaceAgents],
	);
	const importableAgents = useMemo(
		() =>
			getImportableAgents({
				currentAgents: agents,
				createdAgents:
					(createdAgentsData?.$users?.[0]?.createdAgents as
						| ImportableAgent[]
						| undefined) ?? [],
			}),
		[agents, createdAgentsData?.$users],
	);
	const selectedProvider = PROVIDERS.find((item) => item.value === provider);
	const pendingCodexWorkspaceAgent = pendingCodexWorkspaceAgentId
		? agents.find((agent) => agent.id === pendingCodexWorkspaceAgentId)
		: undefined;

	useEffect(() => {
		if (!pendingCodexWorkspaceAgentId) {
			return;
		}

		const deviceAuth = getCodexDeviceAuth(
			pendingCodexWorkspaceAgent?.agent?.authState,
		);
		const authStatus = getCodexAuthStatus(
			pendingCodexWorkspaceAgent?.agent?.authState,
		);
		const authOutput = getCodexAuthOutput(
			pendingCodexWorkspaceAgent?.agent?.authState,
		);

		if (authOutput) {
			setCodexAuthOutput(authOutput);
		}

		if (deviceAuth) {
			setCodexDeviceAuth(deviceAuth);
			setFormError(undefined);
		}

		if (
			pendingCodexWorkspaceAgent?.agent?.status === "ready" ||
			authStatus === "completed"
		) {
			setCodexAuthStatus("completed");
			setFormError(undefined);
			return;
		}

		if (authStatus) {
			setCodexAuthStatus(authStatus);
		}

		const authError = getCodexAuthError(
			pendingCodexWorkspaceAgent?.agent?.authState,
		);

		if (authError) {
			setFormError(authError);
		}
	}, [
		pendingCodexWorkspaceAgentId,
		pendingCodexWorkspaceAgent?.agent?.authState,
		pendingCodexWorkspaceAgent?.agent?.status,
	]);

	const createAgent = async () => {
		setFormError(undefined);

		if (!workspace) {
			return;
		}

		const trimmedName = name.trim();
		if (!trimmedName) {
			setFormError("Enter an agent name.");
			return;
		}

		if (provider === "codex") {
			if (pendingCodexWorkspaceAgentId) {
				setCodexAuthModalOpen(true);
				return;
			}

			await startCodexDeviceAuth(trimmedName);
			return;
		}

		const apiKey = agentApiKey.trim();
		if (!apiKey) {
			setFormError(`Enter a ${selectedProvider?.authLabel ?? "API key"}.`);
			return;
		}
		const providerId = opencodeProviderId.trim();
		if (provider === "opencode" && !providerId) {
			setFormError("Enter an OpenCode provider ID.");
			return;
		}

		if (!user?.refresh_token) {
			setFormError("You must be signed in to create an agent.");
			return;
		}

		const response = await fetch("/api/agents", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${user.refresh_token}`,
			},
			body: JSON.stringify({
				workspaceId: workspace.id,
				name: trimmedName,
				provider,
				auth: provider === "opencode" ? { providerId, apiKey } : { apiKey },
				settings: {
					agentModel,
					agentReasoningEffort,
					agentSpeed,
				},
			}),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => ({}))) as {
				message?: unknown;
			};
			setFormError(
				typeof body.message === "string"
					? body.message
					: "Failed to create agent.",
			);
			return;
		}

		setName("");
		setAgentApiKey("");
		setOpenCodeProviderId(DEFAULT_OPENCODE_PROVIDER_ID);
	};

	const startCodexDeviceAuth = async (trimmedName: string) => {
		if (!workspace) {
			return;
		}

		if (!user?.refresh_token) {
			setFormError("You must be signed in to create an agent.");
			return;
		}

		setPendingCodexWorkspaceAgentId(undefined);
		setCodexDeviceAuth(undefined);
		setCodexAuthOutput(undefined);
		setCodexAuthStatus("queued");
		setCodexAuthModalOpen(true);
		setIsStartingCodexAuth(true);

		try {
			const response = await fetch("/api/agents/device-auth", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					workspaceId: workspace.id,
					name: trimmedName,
					settings: {
						agentModel,
						agentReasoningEffort,
						agentSpeed,
					},
				}),
			});

			const body = (await response.json().catch(() => ({}))) as {
				agent?: { id?: unknown };
				workspaceAgent?: { id?: unknown };
				message?: unknown;
			};

			if (!response.ok) {
				setFormError(
					typeof body.message === "string"
						? body.message
						: "Failed to start Codex device auth.",
				);
				return;
			}

			if (typeof body.workspaceAgent?.id !== "string") {
				setFormError("Codex device auth response was incomplete.");
				return;
			}

			setPendingCodexWorkspaceAgentId(body.workspaceAgent.id);
		} catch (error) {
			setFormError(
				error instanceof Error
					? error.message
					: "Failed to start Codex device auth.",
			);
		} finally {
			setIsStartingCodexAuth(false);
		}
	};

	const closeCodexAuthDialog = () => {
		setCodexAuthModalOpen(false);

		if (codexAuthStatus === "completed" || codexAuthStatus === "failed") {
			setName("");
			setPendingCodexWorkspaceAgentId(undefined);
			setCodexDeviceAuth(undefined);
			setCodexAuthOutput(undefined);
			setCodexAuthStatus(undefined);
			setFormError(undefined);
		}
	};

	const deleteAgent = async (agent: WorkspaceAgent) => {
		await db.transact(workspaceAgentTx(agent.id).delete());
	};

	const updateAgentDefaults = async (
		agent: WorkspaceAgent,
		defaults: Partial<AgentDefaultOptions>,
	) => {
		await db.transact(
			workspaceAgentTx(agent.id).update({
				settings: {
					...getAgentSettingsRecord(agent.settings),
					...defaults,
				},
			}),
		);
	};

	const importAgent = async (agent: ImportableAgent) => {
		if (!workspace || !user?.refresh_token) {
			setImportStatus("You must be signed in to import an agent.");
			return;
		}

		setImportStatus(undefined);
		setImportingAgentIds((current) => new Set(current).add(agent.id));

		try {
			const workspaceAgentId = id();

			await db.transact(
				workspaceAgentTx(workspaceAgentId)
					.create({
						name: getAgentDisplayName(agent),
						createdAt: new Date().toISOString(),
						status: agent.status ?? "ready",
						settings: getAgentSettingsRecord(agent.settings),
					})
					.link({
						workspace: workspace.id,
						agent: agent.id,
					}),
			);

			setImportStatus("Agent imported.");
		} catch (error) {
			setImportStatus(
				error instanceof Error ? error.message : "Failed to import agent.",
			);
		} finally {
			setImportingAgentIds((current) => {
				const next = new Set(current);
				next.delete(agent.id);
				return next;
			});
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 md:px-8">
			<div className="flex flex-col gap-1">
				<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
					Agents
				</p>
				<h1 className="text-lg font-medium text-grayscale-12">
					{workspace?.name ?? "Workspace"} agents
				</h1>
				<p className="text-sm text-grayscale-10">
					Agents belong to the workspace and can be selected by workspaces in
					this workspace.
				</p>
			</div>

			<section className="relative border border-grayscale-4 bg-grayscale-1">
				<CornerBrackets
					placement="outside"
					spacing={3}
					translate={12}
					size={6}
					color="var(--color-grayscale-6)"
					active={true}
				/>
				<div className="border-b border-grayscale-4 p-3">
					<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
						<RobotIcon weight="bold" className="size-4" />
						Available Agents
					</div>
				</div>
				<div className="flex flex-col divide-y divide-grayscale-4">
					{isLoading ? (
						<p className="p-3 text-sm text-grayscale-10">Loading agents...</p>
					) : error ? (
						<p className="p-3 text-sm text-red-11">{error.message}</p>
					) : agents.length > 0 ? (
						agents.map((agent) => (
							<AgentListItem
								key={agent.id}
								agent={agent}
								onDelete={deleteAgent}
								onDefaultsChange={updateAgentDefaults}
							/>
						))
					) : (
						<p className="p-3 text-sm text-grayscale-10">
							No agents configured.
						</p>
					)}
				</div>
			</section>

			{isLoadingCreatedAgents || importableAgents.length > 0 ? (
				<section className="relative border border-grayscale-4 bg-grayscale-1">
					<CornerBrackets
						placement="outside"
						spacing={3}
						translate={12}
						size={6}
						color="var(--color-grayscale-6)"
						active={true}
					/>
					<div className="border-b border-grayscale-4 p-3">
						<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
							<DownloadSimpleIcon weight="bold" className="size-4" />
							Import Your Agents
						</div>
					</div>
					<div className="flex flex-col divide-y divide-grayscale-4">
						{isLoadingCreatedAgents ? (
							<p className="p-3 text-sm text-grayscale-10">
								Loading your agents...
							</p>
						) : (
							importableAgents.map((agent) => (
								<ImportableAgentListItem
									key={agent.id}
									agent={agent}
									isImporting={importingAgentIds.has(agent.id)}
									onImport={importAgent}
								/>
							))
						)}
					</div>
					{importStatus ? (
						<div className="border-t border-grayscale-4 p-3 text-xs text-grayscale-10">
							{importStatus}
						</div>
					) : null}
				</section>
			) : null}

			<section className="relative border border-grayscale-4 bg-grayscale-1">
				<CornerBrackets
					placement="outside"
					spacing={3}
					translate={12}
					size={6}
					color="var(--color-grayscale-6)"
					active={true}
				/>
				<div className="border-b border-grayscale-4 p-3">
					<div className="flex items-center gap-2 text-sm font-medium text-grayscale-12">
						<PlusIcon weight="bold" className="size-4" />
						Create Agent
					</div>
				</div>
				<div className="flex flex-col gap-3 p-3">
					<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
						<Field label="Name">
							<Input
								type="text"
								placeholder="Agent name"
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						</Field>
						<Field label="Provider">
							<Select.Root
								items={PROVIDERS}
								value={provider}
								onValueChange={(value) => {
									const nextProvider =
										(value as AgentProvider | null) ?? "codex";
									setProvider(nextProvider);
									setAgentModel(getProviderDefaultModel(nextProvider));
									setAgentApiKey("");
									setOpenCodeProviderId(DEFAULT_OPENCODE_PROVIDER_ID);
								}}
							>
								<Select.Trigger>
									<Select.Value />
									<Select.Icon />
								</Select.Trigger>
								<Select.Portal>
									<Select.Positioner>
										<Select.Popup>
											<Select.List>
												{PROVIDERS.map((item) => (
													<Select.Item value={item.value} key={item.value}>
														<Select.ItemText>{item.label}</Select.ItemText>
														<Select.ItemIndicator />
													</Select.Item>
												))}
											</Select.List>
										</Select.Popup>
									</Select.Positioner>
								</Select.Portal>
							</Select.Root>
						</Field>
					</div>
					<div className="flex flex-col gap-1.5">
						<p className="text-xs text-grayscale-11">Task defaults</p>
						<div className="flex flex-wrap items-center gap-2">
							<ModelConfigMenu
								model={agentModel}
								reasoningEffort={agentReasoningEffort}
								speed={agentSpeed}
								onModelChange={setAgentModel}
								onReasoningEffortChange={setAgentReasoningEffort}
								onSpeedChange={setAgentSpeed}
							/>
							<p className="text-xs text-grayscale-10">
								Applied to each new task that uses this agent.
							</p>
						</div>
					</div>
					<p className="text-xs text-grayscale-10">
						{selectedProvider?.description}
					</p>
					{provider !== "codex" ? (
						<div className="grid gap-3 md:grid-cols-2">
							{provider === "opencode" ? (
								<Field label="OpenCode provider ID">
									<Input
										type="text"
										placeholder="anthropic"
										value={opencodeProviderId}
										onChange={(event) =>
											setOpenCodeProviderId(event.target.value)
										}
									/>
								</Field>
							) : null}
							<Field label={selectedProvider?.authLabel ?? "API key"}>
								<Input
									type="password"
									placeholder={selectedProvider?.authPlaceholder ?? "API key"}
									value={agentApiKey}
									onChange={(event) => setAgentApiKey(event.target.value)}
								/>
							</Field>
						</div>
					) : (
						<p className="text-xs text-grayscale-10">
							Start device auth to open a Codex sign-in modal with a one-time
							code.
						</p>
					)}
					{formError && !codexAuthModalOpen ? (
						<div className="flex items-center gap-1.5 text-xs text-red-11">
							<WarningCircleIcon weight="bold" className="size-3.5" />
							{formError}
						</div>
					) : null}
					<div className="flex justify-end">
						<Button
							type="button"
							disabled={isStartingCodexAuth}
							onClick={() => {
								void createAgent();
							}}
						>
							{provider === "codex"
								? isStartingCodexAuth
									? "Starting..."
									: pendingCodexWorkspaceAgentId
										? "Show Codex Auth"
										: "Start Codex Auth"
								: "Create Agent"}
						</Button>
					</div>
				</div>
			</section>
			<CodexDeviceAuthDialog
				open={codexAuthModalOpen}
				deviceAuth={codexDeviceAuth}
				authStatus={codexAuthStatus}
				authOutput={codexAuthOutput}
				error={formError}
				isStarting={isStartingCodexAuth}
				onOpenChange={(open) => {
					if (open) {
						setCodexAuthModalOpen(true);
						return;
					}

					closeCodexAuthDialog();
				}}
			/>
		</div>
	);
}

const getCodexDeviceAuth = (
	authState: unknown,
): CodexDeviceAuth | undefined => {
	if (!isRecord(authState) || authState.type !== "codex_device_auth") {
		return undefined;
	}

	const deviceAuth = authState.deviceAuth;

	if (!isRecord(deviceAuth)) {
		return undefined;
	}

	return typeof deviceAuth.verificationUri === "string" &&
		typeof deviceAuth.userCode === "string"
		? {
				verificationUri: deviceAuth.verificationUri,
				userCode: deviceAuth.userCode,
			}
		: undefined;
};

const getCodexAuthError = (authState: unknown) => {
	if (
		!isRecord(authState) ||
		authState.type !== "codex_device_auth" ||
		authState.status !== "failed"
	) {
		return undefined;
	}

	return typeof authState.error === "string"
		? authState.error
		: "Failed to start Codex device auth.";
};

const getCodexAuthStatus = (authState: unknown) => {
	if (!isRecord(authState) || authState.type !== "codex_device_auth") {
		return undefined;
	}

	return typeof authState.status === "string" ? authState.status : undefined;
};

const getCodexAuthOutput = (authState: unknown) => {
	if (!isRecord(authState) || authState.type !== "codex_device_auth") {
		return undefined;
	}

	return typeof authState.output === "string" ? authState.output : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getImportableAgents = ({
	currentAgents,
	createdAgents,
}: {
	currentAgents: WorkspaceAgent[];
	createdAgents: ImportableAgent[];
}) => {
	const currentImportKeys = new Set(
		currentAgents.flatMap((agent) =>
			agent.agent ? getAgentImportKeys(agent.agent) : [],
		),
	);

	return createdAgents
		.filter(
			(agent) =>
				agent.status === "ready" &&
				!getAgentImportKeys(agent).some((key) => currentImportKeys.has(key)),
		)
		.sort(
			(firstAgent, secondAgent) =>
				new Date(secondAgent.createdAt ?? 0).getTime() -
				new Date(firstAgent.createdAt ?? 0).getTime(),
		);
};

const getAgentImportKeys = (agent: Agent) => {
	const keys = [`agent:${agent.id}`];

	if (
		(!agent.provider || agent.provider === "codex") &&
		agent.providerAccountId
	) {
		keys.push(
			`provider:${agent.provider ?? "codex"}:${agent.providerAccountId}`,
		);
	}

	return keys;
};

function CodexDeviceAuthDialog({
	open,
	deviceAuth,
	authStatus,
	authOutput,
	error,
	isStarting,
	onOpenChange,
}: {
	open: boolean;
	deviceAuth: CodexDeviceAuth | undefined;
	authStatus: string | undefined;
	authOutput: string | undefined;
	error: string | undefined;
	isStarting: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const busy = isStarting;
	const isCompleted = authStatus === "completed";
	const isFailed = authStatus === "failed" || Boolean(error);
	const waitingForDeviceAuth = !deviceAuth && !error;
	const waitingMessage = getCodexAuthWaitingMessage(authStatus);

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!busy) {
					onOpenChange(nextOpen);
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop />
				<Dialog.Popup>
					<div className="flex flex-col gap-1 border-b border-grayscale-4 p-3">
						<Dialog.Title>Codex sign in</Dialog.Title>
						<Dialog.Description>
							Use the one-time code to connect this workspace agent to Codex.
						</Dialog.Description>
					</div>
					<div className="flex flex-col gap-3 p-3">
						{isCompleted ? (
							<div className="border border-grayscale-4 bg-grayscale-2 p-3 text-sm text-grayscale-11">
								Codex is connected. This agent is ready to use.
							</div>
						) : isStarting || (waitingForDeviceAuth && !authOutput) ? (
							<div className="border border-grayscale-4 bg-grayscale-2 p-3 text-sm text-grayscale-11">
								{waitingMessage}
							</div>
						) : deviceAuth && !isFailed ? (
							<div className="grid gap-3 border border-grayscale-4 bg-grayscale-2 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
								<div className="flex min-w-0 flex-col gap-1">
									<p className="text-xs font-medium text-grayscale-12">
										One-time code
									</p>
									<p className="font-mono text-lg font-semibold text-grayscale-12">
										{deviceAuth.userCode}
									</p>
									<a
										href={deviceAuth.verificationUri}
										target="_blank"
										rel="noreferrer"
										className="truncate text-xs text-accent-11 underline-offset-2 hover:underline"
									>
										{deviceAuth.verificationUri}
									</a>
								</div>
								<a
									href={deviceAuth.verificationUri}
									target="_blank"
									rel="noreferrer"
									className="flex items-center justify-center gap-1.5 border border-grayscale-5 px-2.5 py-1.5 text-xs font-medium text-grayscale-12 transition-colors hover:bg-grayscale-3"
								>
									<ArrowSquareOutIcon weight="bold" className="size-3.5" />
									Open Sign In
								</a>
							</div>
						) : authOutput && !isFailed ? (
							<pre className="max-h-56 overflow-auto whitespace-pre-wrap border border-grayscale-4 bg-grayscale-2 p-3 font-mono text-xs text-grayscale-11">
								{authOutput}
							</pre>
						) : null}
						{error ? (
							<div className="flex items-center gap-1.5 text-xs text-red-11">
								<WarningCircleIcon weight="bold" className="size-3.5" />
								{error}
							</div>
						) : null}
					</div>
					<div className="flex justify-end gap-2 border-t border-grayscale-4 p-3">
						<Dialog.Close type="button" disabled={busy}>
							{isCompleted ? "Done" : "Close"}
						</Dialog.Close>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

const getCodexAuthWaitingMessage = (status: string | undefined) => {
	if (status === "waiting_for_code") {
		return "Waiting for Codex to print the sign-in code...";
	}

	if (status === "installing") {
		return "Installing Codex in the auth sandbox...";
	}

	if (status === "starting") {
		return "Starting the Codex auth sandbox...";
	}

	if (status === "queued") {
		return "Queued Codex device auth...";
	}

	return "Preparing Codex device auth...";
};

function AgentListItem({
	agent,
	onDelete,
	onDefaultsChange,
}: {
	agent: WorkspaceAgent;
	onDelete: (agent: WorkspaceAgent) => Promise<void>;
	onDefaultsChange: (
		agent: WorkspaceAgent,
		defaults: Partial<AgentDefaultOptions>,
	) => Promise<void>;
}) {
	const defaults = getAgentDefaultOptions(agent.settings);
	const linkedAgent = agent.agent;

	return (
		<div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
			<div className="flex min-w-0 flex-col gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex min-w-0 items-center gap-2">
						<p className="truncate text-sm font-medium text-grayscale-12">
							{agent.name}
						</p>
						<span className="shrink-0 bg-grayscale-2 px-1.5 py-0.5 font-mono text-[10px] text-grayscale-10 uppercase">
							{getProviderLabel(linkedAgent?.provider)}
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grayscale-10">
						<span>{linkedAgent?.status ?? agent.status ?? "idle"}</span>
						{linkedAgent?.providerAccountId ? (
							<span className="min-w-0 truncate font-mono">
								Account {linkedAgent.providerAccountId}
							</span>
						) : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<ModelConfigMenu
						model={defaults.agentModel}
						reasoningEffort={defaults.agentReasoningEffort}
						speed={defaults.agentSpeed}
						onModelChange={(value) => {
							void onDefaultsChange(agent, { agentModel: value });
						}}
						onReasoningEffortChange={(value) => {
							void onDefaultsChange(agent, { agentReasoningEffort: value });
						}}
						onSpeedChange={(value) => {
							void onDefaultsChange(agent, { agentSpeed: value });
						}}
					/>
					<p className="text-xs text-grayscale-10">
						Defaults: reasoning {defaults.agentReasoningEffort}, speed{" "}
						{defaults.agentSpeed}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={() => {
					void onDelete(agent);
				}}
				className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-red-11 transition-colors hover:bg-red-3 hover:text-red-12"
			>
				<TrashIcon weight="bold" className="size-3.5" />
				Delete
			</button>
		</div>
	);
}

function ImportableAgentListItem({
	agent,
	isImporting,
	onImport,
}: {
	agent: ImportableAgent;
	isImporting: boolean;
	onImport: (agent: ImportableAgent) => Promise<void>;
}) {
	const defaults = getAgentDefaultOptions(agent.settings);
	const sourceWorkspace = agent.workspaceAgents?.find(
		(workspaceAgent) => workspaceAgent.workspace,
	)?.workspace;

	return (
		<div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex min-w-0 items-center gap-2">
					<p className="truncate text-sm font-medium text-grayscale-12">
						{getAgentDisplayName(agent)}
					</p>
					<span className="shrink-0 bg-grayscale-2 px-1.5 py-0.5 font-mono text-[10px] text-grayscale-10 uppercase">
						{getProviderLabel(agent.provider)}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-grayscale-10">
					{sourceWorkspace ? <span>{sourceWorkspace.name}</span> : null}
					<span>
						Defaults: reasoning {defaults.agentReasoningEffort}, speed{" "}
						{defaults.agentSpeed}
					</span>
				</div>
			</div>
			<Button
				type="button"
				variant="secondary"
				disabled={isImporting}
				onClick={() => {
					void onImport(agent);
				}}
			>
				<DownloadSimpleIcon weight="bold" className="size-3.5" />
				{isImporting ? "Importing..." : "Import"}
			</Button>
		</div>
	);
}

const getAgentDisplayName = (agent: Pick<Agent, "id" | "name">) =>
	agent.name?.trim() || `Agent ${agent.id.slice(0, 8)}`;

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<p className="text-xs text-grayscale-11">{label}</p>
			{children}
		</div>
	);
}
