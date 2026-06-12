"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import {
	PlusIcon,
	RobotIcon,
	TrashIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
import type { AppSchema } from "@repo/db/schema";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
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
import { Input, Textarea } from "@/components/Input";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";

type Agent = InstaQLEntity<AppSchema, "agents">;
type AgentProvider = "codex" | "cursor";

const PROVIDERS: {
	value: AgentProvider;
	label: string;
	description: string;
}[] = [
	{
		value: "codex",
		label: "Codex",
		description: "Uses Codex CLI auth JSON and the existing Codex runner.",
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
	const { orgHandle } = useParams();
	const currentOrgHandle = orgHandle as string;
	const [name, setName] = useState("");
	const [provider, setProvider] = useState<AgentProvider>("codex");
	const [codexAuth, setCodexAuth] = useState("");
	const [cursorApiKey, setCursorApiKey] = useState("");
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);
	const [formError, setFormError] = useState<string>();

	const { data, isLoading, error } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			agents: {},
		},
	});

	const organisation = data?.organisations?.[0];
	const agents = useMemo(
		() =>
			[...(organisation?.agents ?? [])].sort(
				(firstAgent, secondAgent) =>
					new Date(secondAgent.createdAt ?? 0).getTime() -
					new Date(firstAgent.createdAt ?? 0).getTime(),
			),
		[organisation?.agents],
	);
	const selectedProvider = PROVIDERS.find((item) => item.value === provider);

	const createAgent = async () => {
		setFormError(undefined);

		if (!organisation) {
			return;
		}

		const trimmedName = name.trim();
		if (!trimmedName) {
			setFormError("Enter an agent name.");
			return;
		}

		let auth: unknown;
		if (provider === "cursor") {
			const apiKey = cursorApiKey.trim();
			if (!apiKey) {
				setFormError("Enter a Cursor API key.");
				return;
			}
			auth = { apiKey };
		} else {
			try {
				auth = JSON.parse(codexAuth);
			} catch {
				setFormError("Codex auth must be valid JSON.");
				return;
			}
		}

		const agentId = id();
		await db.transact(
			agentTx(agentId)
				.create({
					name: trimmedName,
					provider,
					createdAt: DateTime.now().toISO(),
					status: "creating",
					auth,
					settings: {
						agentModel,
						agentReasoningEffort,
						agentSpeed,
					},
				})
				.link({ organisation: organisation.id }),
		);

		setName("");
		setCodexAuth("");
		setCursorApiKey("");
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
					{organisation?.name ?? "Organisation"} agents
				</h1>
				<p className="text-sm text-grayscale-10">
					Agents belong to the organisation and can be selected by factories in
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
						<Field label="Codex auth JSON">
							<Textarea
								placeholder='{"OPENAI_API_KEY":"..."}'
								value={codexAuth}
								onChange={(event) => setCodexAuth(event.target.value)}
							/>
						</Field>
					)}
					{formError ? (
						<div className="flex items-center gap-1.5 text-xs text-red-11">
							<WarningCircleIcon weight="bold" className="size-3.5" />
							{formError}
						</div>
					) : null}
					<div className="flex justify-end">
						<Button
							type="button"
							onClick={() => {
								void createAgent();
							}}
						>
							Create Agent
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}

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
