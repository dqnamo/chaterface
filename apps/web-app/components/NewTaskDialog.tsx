"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import { ArrowRightIcon, RobotIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	type ClipboardEvent as ReactClipboardEvent,
	type DragEvent as ReactDragEvent,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	DEFAULT_CODEX_SPEED,
	getAgentDefaultOptions,
} from "@/codex-options";
import { Button } from "@/components/Button";
import { Dialog } from "@/components/Dialog";
import {
	getAttachmentFiles,
	hasAttachmentFiles,
	ImageAttachments,
	useImageAttachments,
} from "@/components/ImageAttachments";
import { Textarea } from "@/components/Input";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";
import { cn } from "@/helpers/classname-helper";
import { captureProductEvent } from "@/helpers/posthog-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type Agent = Pick<
	InstaQLEntity<AppSchema, "agents">,
	"id" | "name" | "settings"
>;

const DEFAULT_TASK_NAME = "New task";

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

export function NewTaskDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const { workspaceHandle } = useParams();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { user } = db.useAuth();

	const [taskInstructions, setTaskInstructions] = useState("");
	const [agentId, setAgentId] = useState("");
	const [agentModel, setAgentModel] = useState(DEFAULT_CODEX_MODEL);
	const [agentReasoningEffort, setAgentReasoningEffort] = useState(
		DEFAULT_CODEX_REASONING_EFFORT,
	);
	const [agentSpeed, setAgentSpeed] = useState(DEFAULT_CODEX_SPEED);
	const [pendingTaskId, setPendingTaskId] = useState(() => id());
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string>();
	const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
	const {
		attachments: fileAttachments,
		addFiles: addAttachmentFiles,
		removeAttachment: removeFileAttachment,
		clearAttachments: clearFileAttachments,
		uploadAttachments: uploadFileAttachments,
	} = useImageAttachments({
		taskId: pendingTaskId,
		uploadImmediately: true,
	});

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			agents: {
				$: {
					fields: ["name", "settings"],
				},
			},
		},
	});

	const workspace = data?.workspaces?.[0];
	const currentWorkspaceId = workspace?.id;
	const agents = workspace?.agents as Agent[] | undefined;
	const resolvedAgentId = agentId || agents?.[0]?.id;
	const selectedAgent = useMemo(
		() => agents?.find((agent) => agent.id === resolvedAgentId),
		[agents, resolvedAgentId],
	);
	const noAgentsConfigured =
		Boolean(data?.workspaces?.[0]) && (agents?.length ?? 0) === 0;
	const canSubmit =
		!isCreating &&
		Boolean(resolvedAgentId) &&
		(Boolean(taskInstructions.trim()) || fileAttachments.length > 0);

	useEffect(() => {
		if (!selectedAgent) {
			return;
		}

		const defaults = getAgentDefaultOptions(selectedAgent.settings);
		setAgentModel(defaults.agentModel);
		setAgentReasoningEffort(defaults.agentReasoningEffort);
		setAgentSpeed(defaults.agentSpeed);
	}, [selectedAgent]);

	const resetForm = () => {
		clearFileAttachments();
		setPendingTaskId(id());
		setTaskInstructions("");
		setCreateError(undefined);
		setIsDraggingAttachments(false);
	};

	const submitTask = async () => {
		const instructions = taskInstructions.trim();

		if (!canSubmit) {
			return;
		}

		if (!resolvedAgentId) {
			setCreateError("Create an agent before creating a task.");
			return;
		}

		if (!currentWorkspaceId) {
			setCreateError("Workspace is still loading.");
			return;
		}

		if (!user) {
			setCreateError("You must be signed in to create a task.");
			return;
		}

		const taskId = pendingTaskId;
		setIsCreating(true);
		setCreateError(undefined);

		try {
			const attachments = await uploadFileAttachments(taskId);
			const resolvedInstructions =
				instructions || buildAttachmentOnlyInstructions(attachments);
			const name =
				getFallbackTaskName(resolvedInstructions) ?? DEFAULT_TASK_NAME;
			const agentSessionId = id();
			const eventId = id();
			const createdAt = new Date().toISOString();
			const attachmentFileIds = getAttachmentFileIds(attachments);

			await db.transact([
				taskTx(taskId)
					.create({
						name,
						status: "in_progress",
						instructions: resolvedInstructions,
						createdAt,
						agentModel,
						agentReasoningEffort,
						agentSpeed,
					})
					.link({ workspace: currentWorkspaceId, agent: resolvedAgentId }),
				agentSessionTx(agentSessionId)
					.create({
						name: "Agent",
						status: "running",
						createdAt,
						updatedAt: createdAt,
					})
					.link({ task: taskId, agent: resolvedAgentId }),
				eventTx(eventId)
					.create({
						type: "chaterface.new_task",
						data: {
							taskId,
							name,
							instructions: resolvedInstructions,
							attachments,
						},
						createdAt,
					})
					.link({
						task: taskId,
						agentSession: agentSessionId,
						...(attachmentFileIds.length > 0
							? { attachments: attachmentFileIds }
							: {}),
					}),
			]);

			captureProductEvent("task_created", {
				task_id: taskId,
				workspace_id: currentWorkspaceId,
				agent_id: resolvedAgentId,
				agent_model: agentModel,
				agent_reasoning_effort: agentReasoningEffort,
				agent_speed: agentSpeed,
				has_attachments: attachments.length > 0,
				attachment_count: attachments.length,
			});
			router.push(`/${currentWorkspaceHandle}/tasks/${taskId}`);

			resetForm();
			onOpenChange(false);
		} catch (error) {
			setCreateError(
				error instanceof Error ? error.message : "Failed to create task.",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleComposerDragOver = (
		event: ReactDragEvent<HTMLFieldSetElement>,
	) => {
		if (!hasAttachmentFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		setIsDraggingAttachments(true);
	};

	const handleComposerDragLeave = (
		event: ReactDragEvent<HTMLFieldSetElement>,
	) => {
		const nextTarget = event.relatedTarget as Node | null;

		if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
			setIsDraggingAttachments(false);
		}
	};

	const handleComposerDrop = (event: ReactDragEvent<HTMLFieldSetElement>) => {
		if (!hasAttachmentFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		setIsDraggingAttachments(false);
		addAttachmentFiles(getAttachmentFiles(event.dataTransfer));
	};

	const handleComposerPaste = (
		event: ReactClipboardEvent<HTMLFieldSetElement>,
	) => {
		if (!hasAttachmentFiles(event.clipboardData)) {
			return;
		}

		event.preventDefault();
		addAttachmentFiles(getAttachmentFiles(event.clipboardData));
	};

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen && !isCreating) {
					setCreateError(undefined);
					setIsDraggingAttachments(false);
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop />
				<Dialog.Popup className="max-h-[calc(100vh-2rem)] overflow-y-auto">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void submitTask();
						}}
					>
						<div className="flex flex-col gap-1 p-3">
							<Dialog.Title>New task</Dialog.Title>
							<Dialog.Description>
								Start an agent session with a fresh task.
							</Dialog.Description>
						</div>
						<fieldset
							aria-label="New task composer"
							className={cn(
								"flex flex-col gap-3 border-t border-grayscale-4 p-3 transition-colors",
								isDraggingAttachments && "bg-accent-2",
							)}
							disabled={isCreating}
							onDragLeave={handleComposerDragLeave}
							onDragOver={handleComposerDragOver}
							onDrop={handleComposerDrop}
							onPaste={handleComposerPaste}
						>
							<Textarea
								aria-label="Task instructions"
								autoFocus
								id="task-instructions"
								className="min-h-32 text-sm"
								placeholder="What should the agent do?"
								value={taskInstructions}
								onChange={(event) => setTaskInstructions(event.target.value)}
								onSubmit={() => submitTask()}
							/>
							<ImageAttachments
								attachments={fileAttachments}
								disabled={isCreating}
								onAddFiles={addAttachmentFiles}
								onRemoveAttachment={removeFileAttachment}
							/>
							<div className="flex flex-wrap items-center gap-2">
								<Select.Root
									items={
										agents?.map((agent) => ({
											value: agent.id,
											label: agent.name,
										})) ?? []
									}
									value={resolvedAgentId ?? null}
									onValueChange={(value) => setAgentId(value ?? "")}
								>
									<Select.Trigger>
										<Select.Value placeholder="Select an agent" />
										<Select.Icon />
									</Select.Trigger>
									<Select.Portal>
										<Select.Positioner>
											<Select.Popup>
												<Select.List>
													{agents?.map((agent) => (
														<Select.Item value={agent.id} key={agent.id}>
															<Select.ItemText>{agent.name}</Select.ItemText>
															<Select.ItemIndicator />
														</Select.Item>
													))}
												</Select.List>
											</Select.Popup>
										</Select.Positioner>
									</Select.Portal>
								</Select.Root>
								<ModelConfigMenu
									model={agentModel}
									reasoningEffort={agentReasoningEffort}
									speed={agentSpeed}
									onModelChange={setAgentModel}
									onReasoningEffortChange={setAgentReasoningEffort}
									onSpeedChange={setAgentSpeed}
								/>
							</div>
							{createError ? (
								<p className="rounded-md border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
									{createError}
								</p>
							) : null}
							{noAgentsConfigured ? (
								<div className="flex flex-col gap-3 rounded-md border border-amber-5 bg-amber-2 p-3 text-sm text-amber-12 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex min-w-0 items-start gap-2">
										<span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-amber-6 bg-amber-3 text-amber-11">
											<RobotIcon weight="bold" className="size-3.5" />
										</span>
										<div className="min-w-0">
											<p className="font-medium">No agents configured</p>
											<p className="mt-0.5 text-xs text-amber-11">
												Add an agent before starting a task in this workspace.
											</p>
										</div>
									</div>
									<Link
										className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-amber-6 bg-grayscale-1 px-3 text-xs font-medium text-amber-12 transition-colors hover:bg-amber-3"
										href={`/${currentWorkspaceHandle}/agents`}
									>
										Open agents
										<ArrowRightIcon weight="bold" className="size-3.5" />
									</Link>
								</div>
							) : null}
						</fieldset>
						<div className="flex flex-wrap items-center justify-end gap-2 border-t border-grayscale-4 p-3">
							<Dialog.Close type="button" disabled={isCreating}>
								Cancel
							</Dialog.Close>
							<Button type="submit" disabled={!canSubmit}>
								{isCreating ? "Starting..." : "Start task"}
							</Button>
						</div>
					</form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

function buildAttachmentOnlyInstructions(attachments: { name: string }[]) {
	if (attachments.length === 0) {
		return "Use the attached file input.";
	}

	const fileList = attachments
		.map((attachment) => `- ${attachment.name}`)
		.join("\n");

	return `Use the attached file input.\n\nAttached files:\n${fileList}`;
}

function getAttachmentFileIds(attachments: { id: string }[]) {
	return attachments.map((attachment) => attachment.id).filter(Boolean);
}

function getFallbackTaskName(instructions: string | undefined) {
	if (!instructions) {
		return undefined;
	}

	const firstLine = instructions.split("\n")[0] ?? "";
	return cleanTaskName(firstLine);
}

function cleanTaskName(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const normalized = value
		.trim()
		.replace(/^["'`]+|["'`.]+$/g, "")
		.replace(/\s+/g, " ");

	if (!normalized) {
		return undefined;
	}

	return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}
