"use client";

import { id } from "@instantdb/react";
import db from "@repo/db/client";
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
import CornerCubes from "@/components/CornerCubes";
import {
	getImageFiles,
	hasImageFiles,
	ImageAttachments,
	useImageAttachments,
} from "@/components/ImageAttachments";
import { Textarea } from "@/components/Input";
import Logo from "@/components/Logo";
import { ModelConfigMenu } from "@/components/ModelConfigMenu";
import { Select } from "@/components/Select";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import { cn } from "@/helpers/classname-helper";

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
	const [isDraggingImages, setIsDraggingImages] = useState(false);
	const {
		attachments: imageAttachments,
		addFiles: addImageFiles,
		removeAttachment: removeImageAttachment,
		clearAttachments: clearImageAttachments,
		uploadAttachments: uploadImageAttachments,
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
			agents: {},
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

		if (!resolvedAgentId || isCreating || !instructions) {
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
			const images = await uploadImageAttachments(taskId);
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
					instructions,
					images,
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

			clearImageAttachments();
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
		if (!hasImageFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		setIsDraggingImages(true);
	};

	const handleComposerDragLeave = (
		event: ReactDragEvent<HTMLFieldSetElement>,
	) => {
		const nextTarget = event.relatedTarget as Node | null;

		if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
			setIsDraggingImages(false);
		}
	};

	const handleComposerDrop = (event: ReactDragEvent<HTMLFieldSetElement>) => {
		if (!hasImageFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		setIsDraggingImages(false);
		addImageFiles(getImageFiles(event.dataTransfer));
	};

	const handleComposerPaste = (
		event: ReactClipboardEvent<HTMLFieldSetElement>,
	) => {
		if (!hasImageFiles(event.clipboardData)) {
			return;
		}

		event.preventDefault();
		addImageFiles(getImageFiles(event.clipboardData));
	};

	return (
		<div className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-4 md:px-0">
			<ExpandSidebarButton className="absolute left-2 top-2 z-20" />
			<Logo size={8} />
			<div className="flex flex-col gap-px items-center justify-center">
				<h1 className="text-lg font-medium text-grayscale-12">
					What do you want to build?
				</h1>
			</div>
			<fieldset
				aria-label="New task composer"
				className={cn(
					"flex flex-col max-w-xl w-full bg-grayscale-1 border border-grayscale-4 relative transition-colors",
					isDraggingImages && "border-accent-8 bg-accent-2",
				)}
				onDragLeave={handleComposerDragLeave}
				onDragOver={handleComposerDragOver}
				onDrop={handleComposerDrop}
				onPaste={handleComposerPaste}
			>
				<CornerCubes
					placement="outside"
					spacing={3}
					translate={12}
					size={6}
					color="var(--color-grayscale-6)"
					active={true}
				/>
				<div className="flex flex-col p-3 gap-3">
					<div className="flex flex-col">
						<p className="text-xs text-grayscale-11">Instructions</p>
						<p className="text-xs text-grayscale-10">
							The task will be named automatically.
						</p>
					</div>
					<Textarea
						className="text-sm"
						placeholder="Task Instructions"
						disabled={isCreating}
						value={taskInstructions}
						onChange={(e) => setTaskInstructions(e.target.value)}
						onSubmit={createTask}
					/>
					<ImageAttachments
						attachments={imageAttachments}
						disabled={isCreating}
						onAddFiles={addImageFiles}
						onRemoveAttachment={removeImageAttachment}
					/>
					{createError ? (
						<p className="border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
							{createError}
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
					<div className="flex flex-row items-center justify-center gap-2 ml-auto">
						<Button
							type="button"
							disabled={
								isCreating || !resolvedAgentId || !taskInstructions.trim()
							}
							onClick={createTask}
						>
							{isCreating ? "Creating..." : "Create Task"}
						</Button>
					</div>
				</div>
			</fieldset>
		</div>
	);
}
