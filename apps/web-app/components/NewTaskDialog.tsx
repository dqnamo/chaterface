"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
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
import { Input, Textarea } from "@/components/Input";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type Agent = Pick<
	InstaQLEntity<AppSchema, "agents">,
	"id" | "name" | "settings"
>;

type CreateTaskResult = {
	taskId?: string;
	message?: string;
};

export function NewTaskDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
	const { user } = db.useAuth();

	const [taskName, setTaskName] = useState("");
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
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			agents: {
				$: {
					fields: ["name", "settings"],
				},
			},
		},
	});

	const agents = data?.organisations?.[0]?.agents as Agent[] | undefined;
	const resolvedAgentId = agentId || agents?.[0]?.id;
	const selectedAgent = useMemo(
		() => agents?.find((agent) => agent.id === resolvedAgentId),
		[agents, resolvedAgentId],
	);
	const noAgentsConfigured =
		Boolean(data?.organisations?.[0]) && (agents?.length ?? 0) === 0;
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
		setTaskName("");
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

		if (!user?.refresh_token) {
			setCreateError("You must be signed in to create a task.");
			return;
		}

		const taskId = pendingTaskId;
		setIsCreating(true);
		setCreateError(undefined);

		try {
			const attachments = await uploadFileAttachments(taskId);
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.refresh_token}`,
				},
				body: JSON.stringify({
					taskId,
					factoryId: currentFactoryId,
					agentId: resolvedAgentId,
					name: taskName.trim() || undefined,
					instructions:
						instructions || buildAttachmentOnlyInstructions(attachments),
					attachments,
					agentModel,
					agentReasoningEffort,
					agentSpeed,
				}),
			});

			const result = (await response
				.json()
				.catch(() => null)) as CreateTaskResult | null;

			if (!response.ok) {
				throw new Error(result?.message ?? "Failed to create task.");
			}

			router.push(
				`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${taskId}`,
			);

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
							<label className="flex flex-col gap-1.5" htmlFor="task-name">
								<span className="text-xs text-grayscale-11">
									Name <span className="text-grayscale-9">(optional)</span>
								</span>
								<Input
									autoFocus
									id="task-name"
									placeholder="Generated from instructions"
									type="text"
									value={taskName}
									onChange={(event) => setTaskName(event.target.value)}
								/>
							</label>
							<label
								className="flex flex-col gap-1.5"
								htmlFor="task-instructions"
							>
								<span className="text-xs text-grayscale-11">Instructions</span>
								<Textarea
									id="task-instructions"
									className="min-h-32 text-sm"
									placeholder="What should the agent do?"
									value={taskInstructions}
									onChange={(event) => setTaskInstructions(event.target.value)}
									onSubmit={() => submitTask()}
								/>
							</label>
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
								<p className="rounded-md border border-amber-6 bg-amber-2 px-2 py-1.5 text-xs text-amber-11">
									Create an agent before creating tasks.{" "}
									<Link
										className="font-medium underline underline-offset-2"
										href={`/${currentOrgHandle}/factories/${currentFactoryId}/organisation/settings/agents`}
									>
										Open agents
									</Link>
								</p>
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
