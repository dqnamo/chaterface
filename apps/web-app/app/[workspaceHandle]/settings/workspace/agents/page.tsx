"use client";

import type { InstaQLEntity } from "@instantdb/react";
import {
	ArrowSquareOutIcon,
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
type AgentProvider = "codex" | "cursor";
type CodexDeviceAuth = {
	verificationUri: string;
	userCode: string;
};

const PROVIDERS: {
	value: AgentProvider;
	label: string;
	description: string;
}[] = [
	{
		value: "codex",
		label: "Codex",
		description:
			"Uses Codex CLI device code auth and the existing Codex runner.",
	},
	{
		value: "cursor",
		label: "Cursor",
		description: "Uses Cursor CLI with CURSOR_API_KEY for headless runs.",
	},
];

const agentTx = (agentId: string) => {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
};

const getProviderLabel = (provider: string | undefined) =>
	provider === "cursor" ? "Cursor" : "Codex";

export default function AgentsPage() {
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { user } = db.useAuth();
	const [name, setName] = useState("");
	const [provider, setProvider] = useState<AgentProvider>("codex");
	const [cursorApiKey, setCursorApiKey] = useState("");
	const [pendingCodexAgentId, setPendingCodexAgentId] = useState<string>();
	const [codexDeviceAuth, setCodexDeviceAuth] = useState<CodexDeviceAuth>();
	const [codexAuthStatus, setCodexAuthStatus] = useState<string>();
	const [codexAuthModalOpen, setCodexAuthModalOpen] = useState(false);
	const [isStartingCodexAuth, setIsStartingCodexAuth] = useState(false);
	const [isCompletingCodexAuth, setIsCompletingCodexAuth] = useState(false);
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);
	const [formError, setFormError] = useState<string>();

	const { data, isLoading, error } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			agents: {
				$: {
					fields: [
						"name",
						"authState",
						"createdAt",
						"provider",
						"settings",
						"status",
					],
				},
			},
		},
	});

	const workspace = data?.workspaces?.[0];
	const agents = useMemo(
		() =>
			[...(workspace?.agents ?? [])].sort(
				(firstAgent, secondAgent) =>
					new Date(secondAgent.createdAt ?? 0).getTime() -
					new Date(firstAgent.createdAt ?? 0).getTime(),
			),
		[workspace?.agents],
	);
	const selectedProvider = PROVIDERS.find((item) => item.value === provider);
	const pendingCodexAgent = pendingCodexAgentId
		? agents.find((agent) => agent.id === pendingCodexAgentId)
		: undefined;

	useEffect(() => {
		if (!pendingCodexAgentId) {
			return;
		}

		const deviceAuth = getCodexDeviceAuth(pendingCodexAgent?.authState);

		if (deviceAuth) {
			setCodexDeviceAuth(deviceAuth);
			setCodexAuthStatus("pending");
			setFormError(undefined);
			return;
		}

		const authStatus = getCodexAuthStatus(pendingCodexAgent?.authState);

		if (authStatus) {
			setCodexAuthStatus(authStatus);
		}

		const authError = getCodexAuthError(pendingCodexAgent?.authState);

		if (authError) {
			setFormError(authError);
		}
	}, [pendingCodexAgentId, pendingCodexAgent?.authState]);

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
			if (pendingCodexAgentId) {
				setCodexAuthModalOpen(true);
				return;
			}

			await startCodexDeviceAuth(trimmedName);
			return;
		}

		const apiKey = cursorApiKey.trim();
		if (!apiKey) {
			setFormError("Enter a Cursor API key.");
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
				auth: { apiKey },
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
		setCursorApiKey("");
	};

	const startCodexDeviceAuth = async (trimmedName: string) => {
		if (!workspace) {
			return;
		}

		if (!user?.refresh_token) {
			setFormError("You must be signed in to create an agent.");
			return;
		}

		setPendingCodexAgentId(undefined);
		setCodexDeviceAuth(undefined);
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

			if (typeof body.agent?.id !== "string") {
				setFormError("Codex device auth response was incomplete.");
				return;
			}

			setPendingCodexAgentId(body.agent.id);
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

	const completeCodexDeviceAuth = async () => {
		setFormError(undefined);

		if (!user?.refresh_token) {
			setFormError("You must be signed in to complete agent auth.");
			return;
		}

		if (!pendingCodexAgentId) {
			setFormError("Start Codex device auth before completing it.");
			return;
		}

		setIsCompletingCodexAuth(true);

		try {
			const response = await fetch("/api/agents/device-auth", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					agentId: pendingCodexAgentId,
				}),
			});
			const body = (await response.json().catch(() => ({}))) as {
				message?: unknown;
			};

			if (!response.ok) {
				setFormError(
					typeof body.message === "string"
						? body.message
						: "Failed to complete Codex device auth.",
				);
				return;
			}

			setName("");
			setPendingCodexAgentId(undefined);
			setCodexDeviceAuth(undefined);
			setCodexAuthStatus(undefined);
			setCodexAuthModalOpen(false);
		} catch (error) {
			setFormError(
				error instanceof Error
					? error.message
					: "Failed to complete Codex device auth.",
			);
		} finally {
			setIsCompletingCodexAuth(false);
		}
	};

	const deleteAgent = async (agent: Agent) => {
		await db.transact(agentTx(agent.id).delete());
	};

	const updateAgentDefaults = async (
		agent: Agent,
		defaults: Partial<AgentDefaultOptions>,
	) => {
		await db.transact(
			agentTx(agent.id).update({
				settings: {
					...getAgentSettingsRecord(agent.settings),
					...defaults,
				},
			}),
		);
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
								onValueChange={(value) =>
									setProvider((value as AgentProvider | null) ?? "codex")
								}
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
					{provider === "cursor" ? (
						<Field label="Cursor API key">
							<Input
								type="password"
								placeholder="Cursor API key"
								value={cursorApiKey}
								onChange={(event) => setCursorApiKey(event.target.value)}
							/>
						</Field>
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
									: pendingCodexAgentId
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
				error={formError}
				isStarting={isStartingCodexAuth}
				isCompleting={isCompletingCodexAuth}
				onOpenChange={setCodexAuthModalOpen}
				onComplete={completeCodexDeviceAuth}
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function CodexDeviceAuthDialog({
	open,
	deviceAuth,
	authStatus,
	error,
	isStarting,
	isCompleting,
	onOpenChange,
	onComplete,
}: {
	open: boolean;
	deviceAuth: CodexDeviceAuth | undefined;
	authStatus: string | undefined;
	error: string | undefined;
	isStarting: boolean;
	isCompleting: boolean;
	onOpenChange: (open: boolean) => void;
	onComplete: () => Promise<void>;
}) {
	const busy = isStarting || isCompleting;
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
						{isStarting || waitingForDeviceAuth ? (
							<div className="border border-grayscale-4 bg-grayscale-2 p-3 text-sm text-grayscale-11">
								{waitingMessage}
							</div>
						) : deviceAuth ? (
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
							Close
						</Dialog.Close>
						<Button
							type="button"
							disabled={!deviceAuth || busy}
							onClick={() => {
								void onComplete();
							}}
						>
							{isCompleting ? "Completing..." : "Complete Codex Auth"}
						</Button>
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
	agent: Agent;
	onDelete: (agent: Agent) => Promise<void>;
	onDefaultsChange: (
		agent: Agent,
		defaults: Partial<AgentDefaultOptions>,
	) => Promise<void>;
}) {
	const defaults = getAgentDefaultOptions(agent.settings);

	return (
		<div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
			<div className="flex min-w-0 flex-col gap-2">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex min-w-0 items-center gap-2">
						<p className="truncate text-sm font-medium text-grayscale-12">
							{agent.name}
						</p>
						<span className="shrink-0 bg-grayscale-2 px-1.5 py-0.5 font-mono text-[10px] text-grayscale-10 uppercase">
							{getProviderLabel(agent.provider)}
						</span>
					</div>
					<p className="text-xs text-grayscale-10">{agent.status ?? "idle"}</p>
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
