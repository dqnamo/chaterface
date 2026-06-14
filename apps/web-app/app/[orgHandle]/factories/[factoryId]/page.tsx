"use client";

import { id } from "@instantdb/react";
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
import {
	getAttachmentFiles,
	hasAttachmentFiles,
	ImageAttachments,
	useImageAttachments,
} from "@/components/ImageAttachments";
import { Textarea } from "@/components/Input";
import Logo from "@/components/Logo";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import { cn } from "@/helpers/classname-helper";
import db from "@/instant.client";

export default function FactoryPage() {
	const router = useRouter();
	const { orgHandle, factoryId } = useParams();
	const currentOrgHandle = orgHandle as string;
	const currentFactoryId = factoryId as string;
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
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			agents: {
				$: {
					fields: ["name", "provider", "settings"],
				},
			},
		},
		tasks: {
			$: {
				where: {
					factory: currentFactoryId,
				},
			},
		},
	});

	const agents = data?.organisations?.[0]?.agents;
	const resolvedAgentId = agentId || agents?.[0]?.id;
	const selectedAgent = useMemo(
		() => agents?.find((agent) => agent.id === resolvedAgentId),
		[agents, resolvedAgentId],
	);
	const noAgentsConfigured =
		Boolean(data?.organisations?.[0]) && (agents?.length ?? 0) === 0;
	const agentItems =
		agents?.map((agent) => ({ value: agent.id, label: agent.name })) ?? [];

	useEffect(() => {
		if (!selectedAgent) {
			return;
		}

		const defaults = getAgentDefaultOptions(selectedAgent.settings);
		setAgentModel(defaults.agentModel);
		setAgentReasoningEffort(defaults.agentReasoningEffort);
		setAgentSpeed(defaults.agentSpeed);
	}, [selectedAgent]);

	const createTask = async () => {
		const instructions = taskInstructions.trim();

		if (isCreating || (!instructions && fileAttachments.length === 0)) {
			return;
		}

		if (!resolvedAgentId) {
			setCreateError("Create an agent before starting a task.");
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
					instructions:
						instructions || buildAttachmentOnlyInstructions(attachments),
					attachments,
					agentModel,
					agentReasoningEffort,
					agentSpeed,
				}),
			});

			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(result?.message ?? "Failed to create task.");
			}

			clearFileAttachments();
			setPendingTaskId(id());
			setTaskInstructions("");
			router.push(
				`/${currentOrgHandle}/factories/${currentFactoryId}/tasks/${taskId}`,
			);
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
		<div className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-4 md:px-0">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<Logo size={7} />
			<div className="flex flex-col gap-px items-center justify-center max-w-md text-center">
				<h1 className="text-lg font-medium text-grayscale-12">
					What do you want to build?
				</h1>
				<p className="text-sm text-grayscale-11 text-balance">
					Creates a fresh new sandbox to do your task.
				</p>
			</div>
			<div className="mt-6 mx-auto w-full max-w-xl rounded-xl border border-grayscale-3 bg-grayscale-2 p-1.5 dark:bg-grayscale-2">
				<div className="overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-5 dark:bg-grayscale-3">
					<fieldset
						aria-label="New task composer"
						className={cn(
							"relative mx-auto flex w-full max-w-xl flex-col transition-colors",
							isDraggingAttachments && "border-accent-8 bg-accent-2",
						)}
						onDragLeave={handleComposerDragLeave}
						onDragOver={handleComposerDragOver}
						onDrop={handleComposerDrop}
						onPaste={handleComposerPaste}
					>
						<div className="flex flex-col gap-2 p-2">
							<Textarea
								className="bg-grayscale-1 p-2 text-sm border-grayscale-3 dark:bg-grayscale-4 focus:bg-grayscale-2 dark:hover:bg-grayscale-5 dark:focus:bg-grayscale-5"
								placeholder="Task Instructions"
								disabled={isCreating}
								value={taskInstructions}
								onChange={(e) => setTaskInstructions(e.target.value)}
								onSubmit={createTask}
							/>
							<ImageAttachments
								attachments={fileAttachments}
								disabled={isCreating}
								onAddFiles={addAttachmentFiles}
								onRemoveAttachment={removeFileAttachment}
							/>
							{createError ? (
								<p className="rounded-md border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
									{createError}
								</p>
							) : null}
							{noAgentsConfigured ? (
								<p className="rounded-md border border-amber-6 bg-amber-2 px-2 py-1.5 text-xs text-amber-11">
									Create an agent before starting a task.{" "}
									<Link
										className="font-medium underline underline-offset-2"
										href={`/${currentOrgHandle}/factories/${currentFactoryId}/organisation/settings/agents`}
									>
										Open agents
									</Link>
								</p>
							) : null}
						</div>
						<div className="flex flex-row items-center justify-between p-3">
							<div className="flex flex-row items-center justify-center gap-2">
								<Select.Root
									items={agentItems}
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
							<div className="ml-auto flex flex-row items-center justify-center gap-2">
								<Button
									type="button"
									disabled={
										isCreating ||
										!resolvedAgentId ||
										(!taskInstructions.trim() && fileAttachments.length === 0)
									}
									onClick={createTask}
								>
									{isCreating ? "Creating..." : "Create Task"}
								</Button>
							</div>
						</div>
					</fieldset>
				</div>
			</div>
		</div>
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
