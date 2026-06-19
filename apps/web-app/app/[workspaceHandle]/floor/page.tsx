"use client";

import { type InstaQLEntity, id } from "@instantdb/react";
import {
	CaretDownIcon,
	CheckCircleIcon,
	CornersOutIcon,
	FlowArrowIcon,
	GitBranchIcon,
	KeyboardIcon,
	MinusIcon,
	PaperPlaneTiltIcon,
	PlayCircleIcon,
	PlusCircleIcon,
	PlusIcon,
	SlackLogoIcon,
	WebhooksLogoIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import {
	addEdge,
	Background,
	type Connection,
	type Edge,
	Handle,
	type Node,
	type NodeProps,
	Position,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodeConnections,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
	createContext,
	type ClipboardEvent as ReactClipboardEvent,
	type DragEvent as ReactDragEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/Button";
import { ContextMenu } from "@/components/ContextMenu";
import {
	getAttachmentFiles,
	hasAttachmentFiles,
	ImageAttachments,
	useImageAttachments,
} from "@/components/ImageAttachments";
import { Textarea } from "@/components/Input";
import { Select } from "@/components/Select";
import { ExpandSidebarButton } from "@/components/SidebarContext";
import TaskStatusDots from "@/components/TaskStatusDots";
import { cn } from "@/helpers/classname-helper";
import { toTaskDotStatus } from "@/helpers/task-status-helper";
import db from "@/instant.client";
import type { AppSchema } from "@/instant.schema";

type WorkflowBlockType =
	| "manualStart"
	| "webhook"
	| "instruction"
	| "agentRun"
	| "agentDecision"
	| "yesNoClassifier"
	| "httpRequest"
	| "integrationTrigger"
	| "integrationAction"
	| "conditionalRouter"
	| "completeTask";

type LegacyWorkflowBlockType = WorkflowBlockType | "humanInput";

type RouterCondition = {
	id: string;
	label: string;
	expression: string;
};

type DecisionOption = {
	id: string;
	label: string;
};

type WorkflowNodeData = {
	blockType: WorkflowBlockType;
	label: string;
	webhookId?: string;
	webhookSecret?: string;
	prompt?: string;
	agentId?: string;
	sessionKey?: string;
	instruction?: string;
	question?: string;
	options?: DecisionOption[];
	httpMethod?: string;
	httpUrl?: string;
	httpHeaders?: string;
	httpBody?: string;
	provider?: string;
	action?: string;
	trigger?: string;
	connectionId?: string;
	channelId?: string;
	messageTemplate?: string;
	threadTsTemplate?: string;
	conditions?: RouterCondition[];
	completionMessage?: string;
};

type LegacyWorkflowNodeData = Omit<WorkflowNodeData, "blockType"> & {
	blockType: LegacyWorkflowBlockType;
	humanInputEnabled?: boolean;
	humanInputPrompt?: string;
	humanPrompt?: string;
};

type WorkflowNode = Node<WorkflowNodeData, WorkflowBlockType>;
type LegacyWorkflowNode = Node<LegacyWorkflowNodeData, LegacyWorkflowBlockType>;
type WorkflowEdge = Edge & {
	pathOptions?: {
		borderRadius?: number;
		offset?: number;
		stepPosition?: number;
	};
};

type FloorWorkflow = {
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
};

type Agent = InstaQLEntity<AppSchema, "workspaceAgents"> & {
	agent?: InstaQLEntity<AppSchema, "agents">;
};
type WorkspaceWebhook = InstaQLEntity<AppSchema, "webhooks">;
type IntegrationConnection = InstaQLEntity<AppSchema, "integrationConnections">;
type IntegrationTriggerSubscription = InstaQLEntity<
	AppSchema,
	"integrationTriggerSubscriptions"
>;
type WorkflowTask = InstaQLEntity<AppSchema, "tasks">;

const workflowEdgePathOptions = {
	borderRadius: 28,
	offset: 28,
};
const humanLoopHandleId = "human-loop";
const MIN_INSPECTOR_SIZE = 320;
const MAX_INSPECTOR_SIZE = 640;
const DEFAULT_INSPECTOR_SIZE = 360;

type WorkflowNodeTasksContextValue = {
	workspaceHandle: string;
	tasksByNodeId: Map<string, WorkflowTask[]>;
};

const WorkflowNodeTasksContext = createContext<WorkflowNodeTasksContextValue>({
	workspaceHandle: "",
	tasksByNodeId: new Map(),
});

const blockOptions: Array<{
	type: WorkflowBlockType;
	label: string;
	description: string;
}> = [
	{
		type: "webhook",
		label: "Webhook",
		description: "Entry point with URL and secret.",
	},
	{
		type: "agentRun",
		label: "Agent Step",
		description: "Runs one turn in an agent conversation.",
	},
	{
		type: "instruction",
		label: "Instruction",
		description: "Formats the next prompt before an agent session.",
	},
	{
		type: "agentDecision",
		label: "Agent Decision",
		description: "Asks an agent to choose one route.",
	},
	{
		type: "yesNoClassifier",
		label: "Yes/No Classifier",
		description: "Runs Codex once and routes by answer.",
	},
	{
		type: "httpRequest",
		label: "HTTP Request",
		description: "Send an HTTP request to an external service.",
	},
	{
		type: "integrationTrigger",
		label: "Slack Message Trigger",
		description: "Starts when a Slack channel receives a message.",
	},
	{
		type: "integrationAction",
		label: "Slack Message",
		description: "Sends a message to a Slack channel.",
	},
	{
		type: "conditionalRouter",
		label: "Conditional Router",
		description: "CEL-style exits from expressions.",
	},
	{
		type: "completeTask",
		label: "Complete Task",
		description: "Marks the workflow task complete.",
	},
];

const defaultWorkflow = (): FloorWorkflow => {
	const webhookNodeId = id();
	const instructionId = id();
	const agentId = id();
	const completeId = id();

	return {
		nodes: [
			createWorkflowNode("instruction", { x: 80, y: 280 }, instructionId),
			createWorkflowNode("webhook", { x: 80, y: 120 }, webhookNodeId),
			createWorkflowNode("agentRun", { x: 420, y: 120 }, agentId),
			createWorkflowNode("completeTask", { x: 760, y: 120 }, completeId),
		],
		edges: [
			{
				id: id(),
				type: "smoothstep",
				animated: true,
				pathOptions: workflowEdgePathOptions,
				source: webhookNodeId,
				sourceHandle: "output",
				target: agentId,
				targetHandle: "input",
			},
			{
				id: id(),
				type: "smoothstep",
				animated: true,
				pathOptions: workflowEdgePathOptions,
				source: instructionId,
				sourceHandle: "output",
				target: agentId,
				targetHandle: "input",
			},
			{
				id: id(),
				type: "smoothstep",
				animated: true,
				pathOptions: workflowEdgePathOptions,
				source: agentId,
				sourceHandle: "output",
				target: completeId,
				targetHandle: "input",
			},
		],
	};
};

const createWorkflowNode = (
	blockType: WorkflowBlockType,
	position: { x: number; y: number },
	nodeId = id(),
): WorkflowNode => ({
	id: nodeId,
	type: blockType,
	position,
	data: getDefaultNodeData(blockType),
});

const getDefaultNodeData = (blockType: WorkflowBlockType): WorkflowNodeData => {
	switch (blockType) {
		case "manualStart":
			return {
				blockType,
				label: "Manual Start",
			};
		case "webhook":
			return {
				blockType,
				label: "Webhook",
				webhookId: id(),
				webhookSecret: createSecret(),
			};
		case "agentRun":
			return {
				blockType,
				label: "Agent Step",
				prompt: "Use the workflow input:\n\n{{input.message}}",
				sessionKey: "main",
			};
		case "instruction":
			return {
				blockType,
				label: "Instruction",
				instruction: "Use the workflow input:\n\n{{input.message}}",
			};
		case "agentDecision":
			return {
				blockType,
				label: "Agent Decision",
				question:
					"Did the previous response ask for human clarification, or can the workflow continue?",
				options: [
					{ id: "continue", label: "Continue" },
					{ id: "needs_human", label: "Needs human" },
				],
			};
		case "yesNoClassifier":
			return {
				blockType,
				label: "Yes/No Classifier",
				prompt:
					"Should this workflow continue without asking a human?\n\nWorkflow input:\n{{input}}",
			};
		case "httpRequest":
			return {
				blockType,
				label: "HTTP Request",
				httpMethod: "POST",
				httpUrl: "https://api.example.com",
				httpHeaders: '{\n  "Content-Type": "application/json"\n}',
				httpBody: '{\n  "message": "{{input.message}}"\n}',
			};
		case "integrationTrigger":
			return {
				blockType,
				label: "Slack Message Trigger",
				provider: "slack",
				trigger: "messageReceived",
			};
		case "integrationAction":
			return {
				blockType,
				label: "Slack Message",
				provider: "slack",
				action: "sendMessage",
				messageTemplate: "{{input.message}}",
			};
		case "conditionalRouter":
			return {
				blockType,
				label: "Conditional Router",
				conditions: [
					{
						id: id(),
						label: "matched",
						expression: "input.status == 'ready'",
					},
				],
			};
		case "completeTask":
			return {
				blockType,
				label: "Complete Task",
				completionMessage: "Workflow completed.",
			};
	}
};

const createSecret = () =>
	Array.from({ length: 24 }, () =>
		Math.floor(Math.random() * 36).toString(36),
	).join("");

const nodeTypes = {
	manualStart: WorkflowCard,
	webhook: WorkflowCard,
	instruction: WorkflowCard,
	agentRun: WorkflowCard,
	agentDecision: WorkflowCard,
	yesNoClassifier: WorkflowCard,
	httpRequest: WorkflowCard,
	integrationTrigger: WorkflowCard,
	integrationAction: WorkflowCard,
	conditionalRouter: WorkflowCard,
	completeTask: WorkflowCard,
};

const workspaceTx = (workspaceId: string) => {
	const tx = db.tx.workspaces[workspaceId];

	if (!tx) {
		throw new Error(`Workspace transaction builder ${workspaceId} not found`);
	}

	return tx;
};

const webhookTx = (webhookId: string) => {
	const tx = db.tx.webhooks[webhookId];

	if (!tx) {
		throw new Error(`Webhook transaction builder ${webhookId} not found`);
	}

	return tx;
};

const integrationTriggerSubscriptionTx = (subscriptionId: string) => {
	const tx = db.tx.integrationTriggerSubscriptions[subscriptionId];

	if (!tx) {
		throw new Error(
			`Integration trigger subscription ${subscriptionId} not found`,
		);
	}

	return tx;
};

export default function WorkspaceFloorPage() {
	return (
		<ReactFlowProvider>
			<WorkspaceFloorEditor />
		</ReactFlowProvider>
	);
}

function WorkspaceFloorEditor() {
	const { workspaceHandle } = useParams();
	const { user } = db.useAuth();
	const currentWorkspaceHandle = workspaceHandle as string;
	const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow<
		WorkflowNode,
		WorkflowEdge
	>();
	const [selectedNodeId, setSelectedNodeId] = useState<string>();
	const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
	const [inspectorSize, setInspectorSize] = useState(DEFAULT_INSPECTOR_SIZE);
	const [hasHydratedWorkflow, setHasHydratedWorkflow] = useState(false);
	const [unsavedChanges, setUnsavedChanges] = useState(0);
	const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
	const [saveError, setSaveError] = useState<string>();
	const latestWorkflowRef = useRef<FloorWorkflow>({ nodes: [], edges: [] });
	const floorWorkflowSyncKeyRef = useRef<string | undefined>(undefined);
	const unsavedChangeKeysRef = useRef(new Set<string>());
	const syncedWebhookIdsRef = useRef(new Set<string>());
	const syncedIntegrationSubscriptionIdsRef = useRef(new Set<string>());
	const addBlockScreenPositionRef = useRef<
		{ x: number; y: number } | undefined
	>(undefined);
	const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);

	const { data } = db.useQuery({
		workspaces: {
			$: {
				where: {
					handle: currentWorkspaceHandle,
				},
			},
			workspaceAgents: {
				$: {
					fields: ["name", "settings", "status"],
				},
				agent: {
					$: {
						fields: ["name", "provider", "settings", "status"],
					},
				},
			},
			integrationConnections: {},
			webhooks: {},
			integrationTriggerSubscriptions: {
				integrationConnection: {},
			},
			tasks: {},
		},
	});
	const workspace = data?.workspaces?.[0];
	const currentWorkspaceId = workspace?.id ?? "";
	const floorWorkflowSyncKey = useMemo(
		() =>
			workspace
				? `${workspace.id}:${JSON.stringify(workspace.floorWorkflow ?? null)}`
				: undefined,
		[workspace],
	);
	const agents = (workspace?.workspaceAgents ?? []) as Agent[];
	const integrationConnections = (workspace?.integrationConnections ??
		[]) as IntegrationConnection[];
	const workflowTasks = useMemo(
		() =>
			((workspace?.tasks ?? []) as WorkflowTask[])
				.filter((task) => task.workflowNodeId && !task.completedAt)
				.sort(compareWorkflowTasks),
		[workspace?.tasks],
	);
	const tasksByNodeId = useMemo(() => {
		const grouped = new Map<string, WorkflowTask[]>();

		for (const task of workflowTasks) {
			if (!task.workflowNodeId) {
				continue;
			}

			grouped.set(
				task.workflowNodeId,
				(grouped.get(task.workflowNodeId) ?? []).concat(task),
			);
		}

		return grouped;
	}, [workflowTasks]);
	const webhooks = useMemo(
		() => (workspace?.webhooks ?? []) as WorkspaceWebhook[],
		[workspace?.webhooks],
	);
	const integrationTriggerSubscriptions = useMemo(
		() =>
			(workspace?.integrationTriggerSubscriptions ??
				[]) as IntegrationTriggerSubscription[],
		[workspace?.integrationTriggerSubscriptions],
	);
	const selectedNode = nodes.find((node) => node.id === selectedNodeId);

	const startInspectorResize = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		event.preventDefault();
		const separator = event.currentTarget;
		const pointerId = event.pointerId;
		separator.setPointerCapture(pointerId);
		const startX = event.clientX;
		const startSize = inspectorSize;

		const handleMove = (moveEvent: PointerEvent) => {
			const nextSize = Math.min(
				MAX_INSPECTOR_SIZE,
				Math.max(MIN_INSPECTOR_SIZE, startSize + (startX - moveEvent.clientX)),
			);
			setInspectorSize(nextSize);
		};

		const stopResize = () => {
			separator.releasePointerCapture(pointerId);
			separator.removeEventListener("pointermove", handleMove);
			separator.removeEventListener("pointerup", stopResize);
		};

		separator.addEventListener("pointermove", handleMove);
		separator.addEventListener("pointerup", stopResize);
	};

	const persistFloorLayout = useCallback(
		async (workflow: FloorWorkflow) => {
			const webhookSynced = withSyncedWebhookEntities(
				workflow,
				webhooks,
				currentWorkspaceId,
				syncedWebhookIdsRef.current,
			);
			const integrationSynced = withSyncedIntegrationTriggerSubscriptions(
				webhookSynced.workflow,
				integrationTriggerSubscriptions,
				currentWorkspaceId,
				syncedIntegrationSubscriptionIdsRef.current,
			);

			await db.transact([
				workspaceTx(currentWorkspaceId).update({
					floorWorkflow: integrationSynced.workflow,
					floorWorkflowUpdatedAt: new Date().toISOString(),
				}),
				...webhookSynced.transactions,
				...integrationSynced.transactions,
			]);
			for (const webhookId of webhookSynced.webhookIds) {
				syncedWebhookIdsRef.current.add(webhookId);
			}
			for (const subscriptionId of integrationSynced.subscriptionIds) {
				syncedIntegrationSubscriptionIdsRef.current.add(subscriptionId);
			}
			return integrationSynced.workflow;
		},
		[currentWorkspaceId, webhooks, integrationTriggerSubscriptions],
	);

	useEffect(() => {
		if (!workspace || !floorWorkflowSyncKey) {
			return;
		}

		if (
			hasHydratedWorkflow &&
			floorWorkflowSyncKeyRef.current === floorWorkflowSyncKey
		) {
			return;
		}

		if (hasHydratedWorkflow && unsavedChanges > 0) {
			return;
		}

		const hydratedWorkflow =
			workspace.floorWorkflow === undefined || workspace.floorWorkflow === null
				? defaultWorkflow()
				: parseWorkflow(workspace.floorWorkflow);
		const nextWorkflow = cloneWorkflow(hydratedWorkflow);

		setNodes(nextWorkflow.nodes);
		setEdges(nextWorkflow.edges);
		setSelectedNodeId(undefined);
		unsavedChangeKeysRef.current = new Set();
		setUnsavedChanges(0);
		setSaveError(undefined);
		floorWorkflowSyncKeyRef.current = floorWorkflowSyncKey;
		setHasHydratedWorkflow(true);
	}, [
		workspace,
		floorWorkflowSyncKey,
		hasHydratedWorkflow,
		setEdges,
		setNodes,
		unsavedChanges,
	]);

	useEffect(() => {
		latestWorkflowRef.current = {
			nodes,
			edges,
		};
	}, [edges, nodes]);

	useEffect(() => {
		for (const webhook of webhooks) {
			syncedWebhookIdsRef.current.add(webhook.id);
		}
	}, [webhooks]);

	const markWorkflowChanged = useCallback((changeKeys: string | string[]) => {
		const keys = Array.isArray(changeKeys) ? changeKeys : [changeKeys];

		if (keys.length === 0) {
			return;
		}

		const nextKeys = new Set(unsavedChangeKeysRef.current);

		for (const key of keys) {
			nextKeys.add(key);
		}

		unsavedChangeKeysRef.current = nextKeys;
		setUnsavedChanges(nextKeys.size);
		setSaveError(undefined);
	}, []);

	const onConnect = useCallback(
		(connection: Connection) => {
			const edgeId = id();

			setEdges((currentEdges) =>
				addEdge(
					{
						...connection,
						id: edgeId,
						type: "smoothstep",
						animated: true,
						className: "stroke-accent-9",
						pathOptions: workflowEdgePathOptions,
					},
					currentEdges,
				),
			);
			markWorkflowChanged(`edge-added:${edgeId}`);
		},
		[markWorkflowChanged, setEdges],
	);

	const zoomIntoFloor = useCallback(() => {
		void zoomIn({ duration: 160 });
	}, [zoomIn]);

	const zoomOutOfFloor = useCallback(() => {
		void zoomOut({ duration: 160 });
	}, [zoomOut]);

	const fitFloorToView = useCallback(() => {
		void fitView({ duration: 180, padding: 0.2 });
	}, [fitView]);

	const addBlock = useCallback(
		(
			blockType: WorkflowBlockType,
			screenPosition?: { x: number; y: number },
		) => {
			const position = screenPosition ?? {
				x: 180 + nodes.length * 12,
				y: 120 + nodes.length * 12,
			};
			const node = createWorkflowNode(
				blockType,
				screenToFlowPosition(position),
			);
			setNodes((currentNodes) => currentNodes.concat(node));
			setSelectedNodeId(node.id);
			setIsAddBlockOpen(false);
			markWorkflowChanged(`node-added:${node.id}`);
		},
		[markWorkflowChanged, nodes.length, screenToFlowPosition, setNodes],
	);

	const addBlockFromContextMenu = useCallback(
		(blockType: WorkflowBlockType) => {
			addBlock(blockType, addBlockScreenPositionRef.current);
		},
		[addBlock],
	);

	const captureAddBlockPosition = useCallback((event: ReactMouseEvent) => {
		addBlockScreenPositionRef.current = {
			x: event.clientX,
			y: event.clientY,
		};
		setIsAddBlockOpen(false);
	}, []);

	const updateSelectedNode = useCallback(
		(data: Partial<WorkflowNodeData>) => {
			if (!selectedNodeId) {
				return;
			}

			setNodes((currentNodes) =>
				currentNodes.map((node) =>
					node.id === selectedNodeId
						? { ...node, data: { ...node.data, ...data } }
						: node,
				),
			);
			markWorkflowChanged(`node-edited:${selectedNodeId}`);
		},
		[markWorkflowChanged, selectedNodeId, setNodes],
	);

	const saveWorkflow = async () => {
		if (!user) {
			setSaveError("You must be signed in.");
			return;
		}

		setIsSavingWorkflow(true);
		setSaveError(undefined);
		try {
			const workflow = await persistFloorLayout(
				cloneWorkflow(latestWorkflowRef.current),
			);
			setNodes(workflow.nodes);
			setEdges(workflow.edges);
			unsavedChangeKeysRef.current = new Set();
			setUnsavedChanges(0);
		} catch (error) {
			setSaveError(
				error instanceof Error ? error.message : "Failed to save workflow.",
			);
		} finally {
			setIsSavingWorkflow(false);
		}
	};

	return (
		<WorkflowNodeTasksContext.Provider
			value={{
				workspaceHandle: currentWorkspaceHandle,
				tasksByNodeId,
			}}
		>
			<div className="relative flex h-full w-full bg-grayscale-1">
				<div className="absolute left-4 top-4 z-30">
					<FloorDock
						hasUnsavedChanges={unsavedChanges > 0}
						isAddBlockOpen={isAddBlockOpen}
						isSavingWorkflow={isSavingWorkflow}
						saveError={saveError}
						onAddBlockToggle={() => {
							setIsAddBlockOpen((isOpen) => !isOpen);
						}}
						onFitView={fitFloorToView}
						onSaveWorkflow={() => {
							void saveWorkflow();
						}}
						onZoomIn={zoomIntoFloor}
						onZoomOut={zoomOutOfFloor}
					/>
					{isAddBlockOpen ? (
						<AddBlockDropdown
							onAdd={addBlock}
							onClose={() => setIsAddBlockOpen(false)}
						/>
					) : null}
				</div>
				<ContextMenu.Root>
					<ContextMenu.Trigger
						render={
							<div
								className="relative min-h-0 flex-1"
								onContextMenu={captureAddBlockPosition}
								role="application"
							/>
						}
					>
						<ReactFlow<WorkflowNode, WorkflowEdge>
							nodes={nodes}
							edges={edges}
							nodeTypes={nodeTypes}
							defaultEdgeOptions={{
								type: "smoothstep",
								animated: true,
							}}
							onNodesChange={(changes) => {
								onNodesChange(changes);
								markWorkflowChanged(getActualFlowChangeKeys(changes, "node"));
							}}
							onEdgesChange={(changes) => {
								onEdgesChange(changes);
								markWorkflowChanged(getActualFlowChangeKeys(changes, "edge"));
							}}
							onConnect={onConnect}
							onPaneClick={() => {
								setIsAddBlockOpen(false);
								setSelectedNodeId(undefined);
							}}
							onNodeClick={(_, node) => {
								setSelectedNodeId(node.id);
								setIsAddBlockOpen(false);
							}}
							fitView
							minZoom={0.25}
							maxZoom={1.6}
							proOptions={{ hideAttribution: true }}
							className="workspace-floor-flow bg-grayscale-1 text-grayscale-12"
						>
							<Background color="var(--color-grayscale-4)" gap={18} size={1} />
						</ReactFlow>
					</ContextMenu.Trigger>
					<ContextMenu.Portal>
						<ContextMenu.Positioner>
							<ContextMenu.Popup className="w-72">
								<AddBlockMenuItems onAdd={addBlockFromContextMenu} />
							</ContextMenu.Popup>
						</ContextMenu.Positioner>
					</ContextMenu.Portal>
				</ContextMenu.Root>
				<AnimatePresence initial={false}>
					{selectedNode ? (
						<Inspector
							agents={agents}
							workspaceId={currentWorkspaceId}
							workspaceHandle={currentWorkspaceHandle}
							node={selectedNode}
							workflow={{ nodes, edges }}
							webhooks={webhooks}
							integrationConnections={integrationConnections}
							onChange={updateSelectedNode}
							onClose={() => setSelectedNodeId(undefined)}
							onResizeStart={startInspectorResize}
							size={inspectorSize}
						/>
					) : null}
				</AnimatePresence>
			</div>
		</WorkflowNodeTasksContext.Provider>
	);
}

function FloorDock({
	hasUnsavedChanges,
	isAddBlockOpen,
	isSavingWorkflow,
	onAddBlockToggle,
	onFitView,
	onSaveWorkflow,
	onZoomIn,
	onZoomOut,
	saveError,
}: {
	hasUnsavedChanges: boolean;
	isAddBlockOpen: boolean;
	isSavingWorkflow: boolean;
	onAddBlockToggle: () => void;
	onFitView: () => void;
	onSaveWorkflow: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	saveError: string | undefined;
}) {
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="workspace-floor-popover flex items-center gap-1 rounded-lg border border-grayscale-5 bg-grayscale-1/95 p-1 shadow-lg backdrop-blur dark:bg-grayscale-2/95">
				<ExpandSidebarButton className="h-8 rounded-md text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12" />
				<FloorDockIconButton label="Zoom in" onClick={onZoomIn}>
					<PlusIcon weight="bold" className="size-4" />
				</FloorDockIconButton>
				<FloorDockIconButton label="Zoom out" onClick={onZoomOut}>
					<MinusIcon weight="bold" className="size-4" />
				</FloorDockIconButton>
				<FloorDockIconButton label="Fit view" onClick={onFitView}>
					<CornersOutIcon weight="bold" className="size-4" />
				</FloorDockIconButton>
				<div className="mx-0.5 h-6 w-px bg-grayscale-5" />
				<button
					type="button"
					aria-expanded={isAddBlockOpen}
					onClick={onAddBlockToggle}
					className="flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-grayscale-12 transition-colors hover:bg-grayscale-3"
				>
					<PlusCircleIcon weight="bold" className="size-4 shrink-0" />
					<span>Add block</span>
					<CaretDownIcon
						weight="bold"
						className={cn(
							"size-3 shrink-0 transition-transform",
							isAddBlockOpen && "rotate-180",
						)}
					/>
				</button>
				<button
					type="button"
					onClick={onSaveWorkflow}
					disabled={!hasUnsavedChanges || isSavingWorkflow}
					className={cn(
						"flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors",
						hasUnsavedChanges
							? "bg-grayscale-12 text-grayscale-1 hover:bg-grayscale-11"
							: "text-grayscale-10",
					)}
				>
					<CheckCircleIcon weight="bold" className="size-4 shrink-0" />
					<span>{isSavingWorkflow ? "Saving" : "Save"}</span>
				</button>
			</div>
			{saveError ? (
				<p className="rounded-md border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11 shadow-lg">
					{saveError}
				</p>
			) : hasUnsavedChanges ? (
				<p className="workspace-floor-popover rounded-md border border-grayscale-5 bg-grayscale-1/95 px-2 py-1.5 text-xs text-grayscale-10 shadow-lg backdrop-blur dark:bg-grayscale-2/95">
					Unsaved changes
				</p>
			) : null}
		</div>
	);
}

function FloorDockIconButton({
	children,
	label,
	onClick,
}: {
	children: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			className="flex size-8 items-center justify-center rounded-md text-grayscale-11 transition-colors hover:bg-grayscale-3 hover:text-grayscale-12"
		>
			{children}
		</button>
	);
}

function WorkflowCard({ data, selected, id: nodeId }: NodeProps<WorkflowNode>) {
	const humanLoopConnections = useNodeConnections({
		id: nodeId,
		handleType: "target",
		handleId: humanLoopHandleId,
	});
	const humanLoopConnected = humanLoopConnections.length > 0;

	if (data.blockType === "manualStart") {
		return (
			<ManualStartNodeCard data={data} nodeId={nodeId} selected={selected} />
		);
	}

	const icon = getBlockIcon(data.blockType);
	const conditions = data.conditions ?? [];
	const decisionOptions = data.options ?? [];

	return (
		<div
			className={cn(
				"workspace-floor-node-card min-w-64 max-w-72 rounded-lg border bg-grayscale-1 text-grayscale-12 shadow-sm shadow-grayscale-12/5 dark:bg-grayscale-2 dark:shadow-black/25",
				selected
					? "border-accent-9 ring-2 ring-accent-5"
					: "border-grayscale-6 dark:border-grayscale-5",
			)}
		>
			{data.blockType === "agentRun" ? (
				<>
					<Handle
						type="target"
						id="input"
						position={Position.Left}
						style={{ top: 78 }}
						className="!size-3 !border-2 !border-grayscale-1 !bg-accent-9"
					/>
					<Handle
						type="target"
						id={humanLoopHandleId}
						position={Position.Top}
						className={cn(
							"!size-3 !border-2 !border-grayscale-1",
							humanLoopConnected ? "!bg-accent-10" : "!bg-grayscale-7",
						)}
					/>
				</>
			) : data.blockType !== "webhook" &&
				data.blockType !== "integrationTrigger" ? (
				<Handle
					type="target"
					id="input"
					position={Position.Left}
					className="!size-3 !border-2 !border-grayscale-1 !bg-accent-9"
				/>
			) : null}
			{data.blockType === "agentRun" ? (
				<HumanLoopEntry connected={humanLoopConnected} />
			) : null}
			<div className="flex items-start gap-2 border-b border-grayscale-4 px-3 py-2">
				<div className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-accent-3 text-accent-11">
					{icon}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-grayscale-12">
						{data.label}
					</p>
					<p className="font-mono text-[10px] text-grayscale-10">{nodeId}</p>
				</div>
			</div>
			<div className="flex flex-col gap-2 px-3 py-2 text-xs text-grayscale-11">
				<NodePreview data={data} />
				{data.blockType === "conditionalRouter" ? (
					<div className="flex flex-col gap-1">
						{conditions.map((condition, index) => (
							<div
								key={condition.id}
								className="workspace-floor-node-inset relative rounded-md border border-grayscale-4 bg-grayscale-2 px-2 py-1"
							>
								<p className="font-medium text-grayscale-12">
									{condition.label || `Condition ${index + 1}`}
								</p>
								<p className="truncate font-mono text-[10px]">
									{condition.expression}
								</p>
								<Handle
									type="source"
									id={condition.id}
									position={Position.Right}
									style={{ top: 13 + index * 42 }}
									className="!size-3 !border-2 !border-grayscale-1 !bg-green-9"
								/>
							</div>
						))}
					</div>
				) : data.blockType === "agentDecision" ? (
					<div className="flex flex-col gap-1">
						{decisionOptions.map((option, index) => (
							<div
								key={option.id}
								className="workspace-floor-node-inset relative rounded-md border border-grayscale-4 bg-grayscale-2 px-2 py-1"
							>
								<p className="font-medium text-grayscale-12">
									{option.label || option.id}
								</p>
								<p className="truncate font-mono text-[10px]">{option.id}</p>
								<Handle
									type="source"
									id={option.id}
									position={Position.Right}
									style={{ top: 13 + index * 42 }}
									className="!size-3 !border-2 !border-grayscale-1 !bg-green-9"
								/>
							</div>
						))}
					</div>
				) : data.blockType === "yesNoClassifier" ? (
					<div className="flex flex-col gap-1">
						{(["yes", "no"] as const).map((answer, index) => (
							<div
								key={answer}
								className="workspace-floor-node-inset relative rounded-md border border-grayscale-4 bg-grayscale-2 px-2 py-1"
							>
								<p className="font-medium capitalize text-grayscale-12">
									{answer}
								</p>
								<p className="font-mono text-[10px]">{answer}</p>
								<Handle
									type="source"
									id={answer}
									position={Position.Right}
									style={{ top: 13 + index * 42 }}
									className="!size-3 !border-2 !border-grayscale-1 !bg-green-9"
								/>
							</div>
						))}
					</div>
				) : data.blockType !== "completeTask" ? (
					<Handle
						type="source"
						id="output"
						position={Position.Right}
						className="!size-3 !border-2 !border-grayscale-1 !bg-green-9"
					/>
				) : null}
			</div>
			<WorkflowTaskStrip nodeId={nodeId} />
		</div>
	);
}

function HumanLoopEntry({ connected }: { connected: boolean }) {
	return (
		<div
			className={cn(
				"workspace-floor-node-strip border-b px-3 py-2 transition-colors",
				connected
					? "border-accent-6 bg-accent-2 text-accent-12"
					: "border-grayscale-4 bg-grayscale-2 text-grayscale-11",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs font-medium">Human-loop entry</p>
				<p
					className={cn(
						"font-mono text-[10px]",
						connected ? "text-accent-11" : "text-grayscale-10",
					)}
				>
					{connected ? "connected" : "idle"}
				</p>
			</div>
		</div>
	);
}

function ManualStartNodeCard({
	data,
	nodeId,
	selected,
}: {
	data: WorkflowNodeData;
	nodeId: string;
	selected: boolean;
}) {
	return (
		<div
			className={cn(
				"workspace-floor-node-shell w-[360px] rounded-xl border border-grayscale-3 bg-grayscale-2 p-1.5 shadow-sm shadow-grayscale-12/5 dark:border-grayscale-5 dark:bg-grayscale-2 dark:shadow-black/25",
				selected ? "border-accent-9 ring-2 ring-accent-5" : "",
			)}
		>
			<div className="workspace-floor-node-card overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-5 dark:bg-grayscale-3">
				<div className="relative flex min-h-36 flex-col p-3">
					<div className="mb-3 flex items-center justify-between gap-2">
						<div className="flex min-w-0 items-center gap-2">
							<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-3 text-accent-11">
								<KeyboardIcon weight="bold" className="size-3.5" />
							</div>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium text-grayscale-12">
									{data.label}
								</p>
								<p className="truncate font-mono text-[10px] text-grayscale-10">
									{nodeId}
								</p>
							</div>
						</div>
					</div>
					<div className="min-h-16 text-sm text-grayscale-10">
						Enter workflow input...
					</div>
					<div className="mt-3 flex items-center justify-between gap-2 border-t border-grayscale-4 pt-2">
						<div className="workspace-floor-node-inset flex h-7 items-center gap-1.5 rounded-md bg-grayscale-2 px-2 text-xs text-grayscale-11 ring-1 ring-grayscale-4">
							<span>Add files</span>
						</div>
						<div className="flex h-8 items-center gap-2 rounded-md border border-grayscale-12 bg-grayscale-12 px-3 text-xs font-medium text-grayscale-1">
							<PlayCircleIcon weight="bold" className="size-4" />
							<span>Start</span>
						</div>
					</div>
					<WorkflowTaskStrip nodeId={nodeId} />
				</div>
			</div>
			<Handle
				type="source"
				id="output"
				position={Position.Right}
				className="!size-3 !border-2 !border-grayscale-1 !bg-green-9"
			/>
		</div>
	);
}

function WorkflowTaskStrip({ nodeId }: { nodeId: string }) {
	const { workspaceHandle, tasksByNodeId } = useContext(
		WorkflowNodeTasksContext,
	);
	const tasks = tasksByNodeId.get(nodeId) ?? [];

	if (tasks.length === 0) {
		return null;
	}

	return (
		<div className="border-t border-grayscale-4 px-3 py-2">
			<div className="flex min-h-4 flex-row items-center gap-1.5 overflow-hidden">
				<AnimatePresence initial={false}>
					{tasks.map((task) => (
						<motion.div
							key={task.id}
							layout
							initial={{ x: -14, opacity: 0, scale: 0.9 }}
							animate={{ x: 0, opacity: 1, scale: 1 }}
							exit={{ x: -10, opacity: 0, scale: 0.9 }}
							transition={{ type: "spring", stiffness: 520, damping: 34 }}
							className="shrink-0"
						>
							<Link
								href={`/${workspaceHandle}/tasks/${task.id}`}
								onClick={(event) => event.stopPropagation()}
								title={task.name}
								aria-label={`Open task ${task.name}`}
								className="nodrag nopan flex size-5 items-center justify-center rounded-sm transition-colors hover:bg-grayscale-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-8"
							>
								<TaskStatusDots
									status={toTaskDotStatus(task.status)}
									size={3}
									gap={1}
								/>
							</Link>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}

function NodePreview({ data }: { data: WorkflowNodeData }) {
	if (data.blockType === "manualStart") {
		return (
			<>
				<p>Start this flow from a composer.</p>
				<p className="font-mono text-[10px] text-grayscale-10">
					Input is available as {"{{input.message}}"}.
				</p>
			</>
		);
	}

	if (data.blockType === "webhook") {
		return (
			<>
				<p>Entry point for external POST requests.</p>
				<p className="truncate font-mono text-[10px]">
					Webhook: {data.webhookId}
				</p>
			</>
		);
	}

	if (data.blockType === "agentRun") {
		return (
			<>
				<p className="line-clamp-3 whitespace-pre-wrap">{data.prompt}</p>
				<p className="font-mono text-[10px] text-grayscale-10">
					Uses {"{{input.*}}"} template values.
				</p>
			</>
		);
	}

	if (data.blockType === "instruction") {
		return (
			<>
				<p className="line-clamp-3 whitespace-pre-wrap">{data.instruction}</p>
				<p className="font-mono text-[10px] text-grayscale-10">
					Can start workflow with manual input.
				</p>
			</>
		);
	}

	if (data.blockType === "agentDecision") {
		return <p className="line-clamp-3 whitespace-pre-wrap">{data.question}</p>;
	}

	if (data.blockType === "yesNoClassifier") {
		return (
			<>
				<p className="line-clamp-3 whitespace-pre-wrap">{data.prompt}</p>
				<p className="font-mono text-[10px] text-grayscale-10">
					Outputs yes or no.
				</p>
			</>
		);
	}

	if (data.blockType === "httpRequest") {
		return (
			<>
				<p className="truncate font-mono text-[10px]">
					{data.httpMethod ?? "GET"} {data.httpUrl}
				</p>
				<p className="line-clamp-2 whitespace-pre-wrap">{data.httpBody}</p>
			</>
		);
	}

	if (data.blockType === "integrationTrigger") {
		return (
			<>
				<p>Starts when Slack receives a channel message.</p>
				<p className="truncate font-mono text-[10px]">
					Channel: {data.channelId || "not selected"}
				</p>
			</>
		);
	}

	if (data.blockType === "integrationAction") {
		return (
			<>
				<p className="line-clamp-3 whitespace-pre-wrap">
					{data.messageTemplate}
				</p>
				<p className="truncate font-mono text-[10px]">
					Channel: {data.channelId || "not selected"}
				</p>
			</>
		);
	}

	if (data.blockType === "completeTask") {
		return <p className="line-clamp-3">{data.completionMessage}</p>;
	}

	return <p>Routes to the first CEL expression that matches.</p>;
}

function AddBlockMenuItems({
	onAdd,
}: {
	onAdd: (blockType: WorkflowBlockType) => void;
}) {
	return (
		<>
			<div className="px-2 py-1.5 font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
				Add block
			</div>
			{blockOptions.map((option) => (
				<ContextMenu.Item
					key={option.type}
					onClick={() => onAdd(option.type)}
					className="items-start rounded-md px-2 py-2 data-[highlighted]:bg-grayscale-2"
				>
					<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-3 text-accent-11">
						{getBlockIcon(option.type)}
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium text-grayscale-12">
							{option.label}
						</p>
						<p className="text-xs text-grayscale-10">{option.description}</p>
					</div>
				</ContextMenu.Item>
			))}
		</>
	);
}

function AddBlockDropdown({
	onAdd,
	onClose,
}: {
	onAdd: (blockType: WorkflowBlockType) => void;
	onClose: () => void;
}) {
	return (
		<div
			role="menu"
			className="workspace-floor-popover mt-2 w-72 rounded-lg border border-grayscale-5 bg-grayscale-1 p-1 shadow-xl dark:bg-grayscale-2"
		>
			<div className="px-2 py-1.5 font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
				Add block
			</div>
			{blockOptions.map((option) => (
				<button
					key={option.type}
					type="button"
					onClick={() => onAdd(option.type)}
					className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-grayscale-2"
				>
					<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-3 text-accent-11">
						{getBlockIcon(option.type)}
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium text-grayscale-12">
							{option.label}
						</p>
						<p className="text-xs text-grayscale-10">{option.description}</p>
					</div>
				</button>
			))}
			<button
				type="button"
				onClick={onClose}
				className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-grayscale-10 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
			>
				Cancel
			</button>
		</div>
	);
}

function Inspector({
	agents,
	workspaceId,
	workspaceHandle,
	node,
	workflow,
	webhooks,
	integrationConnections,
	onChange,
	onClose,
	onResizeStart,
	size,
}: {
	agents: Agent[];
	workspaceId: string;
	workspaceHandle: string;
	node: WorkflowNode | undefined;
	workflow: FloorWorkflow;
	webhooks: WorkspaceWebhook[];
	integrationConnections: IntegrationConnection[];
	onChange: (data: Partial<WorkflowNodeData>) => void;
	onClose: () => void;
	onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	size: number;
}) {
	const webhook = useMemo(
		() =>
			node?.data.blockType === "webhook"
				? findWebhookForNode(node, webhooks)
				: undefined,
		[node, webhooks],
	);
	const webhookUrl = useMemo(() => {
		if (node?.data.blockType !== "webhook") {
			return "";
		}

		const publicId = webhook?.publicId ?? node.data.webhookId;

		if (!publicId) {
			return "";
		}

		if (typeof window === "undefined") {
			return `/api/webhooks/${publicId}`;
		}

		return `${window.location.origin}/api/webhooks/${publicId}`;
	}, [node, webhook]);

	if (!node) {
		return null;
	}

	return (
		<motion.aside
			className="workspace-floor-inspector absolute right-0 top-0 z-20 flex h-full shrink-0 flex-col gap-3 overflow-y-auto border-l border-grayscale-4 bg-grayscale-1 p-3 shadow-xl shadow-grayscale-12/5 dark:bg-grayscale-1 dark:shadow-black/30"
			style={{ width: size }}
			initial={{ x: "100%" }}
			animate={{ x: "0%" }}
			exit={{ x: "100%" }}
			transition={{ type: "spring", stiffness: 420, damping: 42 }}
		>
			<button
				type="button"
				aria-label="Resize block inspector"
				onPointerDown={onResizeStart}
				className="absolute inset-y-0 left-0 w-px cursor-col-resize bg-grayscale-4 transition-colors hover:bg-accent-8"
			/>
			<div className="flex items-start gap-2">
				<div className="min-w-0 flex-1">
					<p className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
						Selected block
					</p>
					<input
						value={node.data.label}
						onChange={(event) => onChange({ label: event.target.value })}
						className="mt-1 w-full rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-sm font-semibold text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
					/>
				</div>
				<button
					type="button"
					aria-label="Close block inspector"
					onClick={onClose}
					className="flex size-8 shrink-0 items-center justify-center rounded-md border border-grayscale-5 bg-grayscale-1 text-grayscale-11 transition-colors hover:bg-grayscale-2 hover:text-grayscale-12"
				>
					<XCircleIcon weight="bold" className="size-4" />
				</button>
			</div>
			{node.data.blockType === "manualStart" ? (
				<ManualStartComposer
					workspaceId={workspaceId}
					node={node}
					workflow={workflow}
				/>
			) : null}
			{node.data.blockType === "webhook" ? (
				<InspectorSection title="Webhook">
					<label className="flex flex-col gap-1 text-xs text-grayscale-11">
						URL
						<textarea
							readOnly
							value={webhookUrl}
							className="min-h-16 resize-none rounded-md border border-grayscale-5 bg-grayscale-2 px-2 py-1.5 font-mono text-[11px] text-grayscale-12"
						/>
					</label>
					<label className="flex flex-col gap-1 text-xs text-grayscale-11">
						Secret
						<input
							value={webhook?.secret ?? node.data.webhookSecret ?? ""}
							onChange={(event) =>
								onChange({ webhookSecret: event.target.value })
							}
							className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 font-mono text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
						/>
					</label>
				</InspectorSection>
			) : null}
			{node.data.blockType === "agentRun" ? (
				<AgentRunInspector agents={agents} node={node} onChange={onChange} />
			) : null}
			{node.data.blockType === "instruction" ? (
				<>
					<ManualStartComposer
						workspaceId={workspaceId}
						node={node}
						workflow={workflow}
					/>
					<InstructionInspector node={node} onChange={onChange} />
				</>
			) : null}
			{node.data.blockType === "agentDecision" ? (
				<AgentDecisionInspector node={node} onChange={onChange} />
			) : null}
			{node.data.blockType === "yesNoClassifier" ? (
				<YesNoClassifierInspector
					agents={agents}
					node={node}
					onChange={onChange}
				/>
			) : null}
			{node.data.blockType === "httpRequest" ? (
				<InspectorSection title="HTTP request">
					<label className="flex flex-col gap-1 text-xs text-grayscale-11">
						Method
						<input
							value={node.data.httpMethod ?? ""}
							onChange={(event) =>
								onChange({ httpMethod: event.target.value.toUpperCase() })
							}
							className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 font-mono text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
						/>
					</label>
					<label className="flex flex-col gap-1 text-xs text-grayscale-11">
						URL
						<input
							value={node.data.httpUrl ?? ""}
							onChange={(event) => onChange({ httpUrl: event.target.value })}
							className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 font-mono text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
						/>
					</label>
					<div className="flex flex-col gap-1 text-xs text-grayscale-11">
						<span>Headers JSON</span>
						<Textarea
							value={node.data.httpHeaders ?? ""}
							onChange={(event) =>
								onChange({ httpHeaders: event.target.value })
							}
							className="min-h-24 font-mono"
						/>
					</div>
					<div className="flex flex-col gap-1 text-xs text-grayscale-11">
						<span>Body</span>
						<Textarea
							value={node.data.httpBody ?? ""}
							onChange={(event) => onChange({ httpBody: event.target.value })}
							className="min-h-32 font-mono"
						/>
					</div>
				</InspectorSection>
			) : null}
			{node.data.blockType === "integrationTrigger" ||
			node.data.blockType === "integrationAction" ? (
				<SlackIntegrationInspector
					connections={integrationConnections}
					node={node}
					onChange={onChange}
				/>
			) : null}
			{node.data.blockType === "conditionalRouter" ? (
				<RouterInspector node={node} onChange={onChange} />
			) : null}
			{node.data.blockType === "completeTask" ? (
				<InspectorSection title="Complete task">
					<div className="flex flex-col gap-1 text-xs text-grayscale-11">
						<span>Completion message</span>
						<Textarea
							value={node.data.completionMessage ?? ""}
							onChange={(event) =>
								onChange({ completionMessage: event.target.value })
							}
							className="min-h-24"
						/>
					</div>
				</InspectorSection>
			) : null}
			<p className="mt-auto text-xs text-grayscale-10">
				Tasks from this floor appear under{" "}
				<a
					href={`/${workspaceHandle}`}
					className="text-accent-11 hover:underline"
				>
					the workspace task list
				</a>
				.
			</p>
		</motion.aside>
	);
}

function AgentRunInspector({
	agents,
	node,
	onChange,
}: {
	agents: Agent[];
	node: WorkflowNode;
	onChange: (data: Partial<WorkflowNodeData>) => void;
}) {
	const resolvedAgentId = node.data.agentId || agents[0]?.id;
	const agentItems = agents.map((agent) => ({
		value: agent.id,
		label: agent.name,
	}));

	return (
		<InspectorSection title="Agent step">
			<AgentSelectField
				agents={agents}
				emptyMessage="No agents configured."
				items={agentItems}
				value={resolvedAgentId}
				onChange={(value) =>
					onChange({ agentId: value === null ? undefined : value })
				}
			/>
			<label className="flex flex-col gap-1 text-xs text-grayscale-11">
				Conversation key
				<input
					value={node.data.sessionKey ?? ""}
					onChange={(event) => onChange({ sessionKey: event.target.value })}
					placeholder="Leave blank for this step only"
					className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 font-mono text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
				/>
			</label>
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Prompt</span>
				<Textarea
					value={node.data.prompt ?? ""}
					onChange={(event) => onChange({ prompt: event.target.value })}
					className="min-h-32 font-mono"
				/>
			</div>
		</InspectorSection>
	);
}

type SlackConversation = {
	id: string;
	name: string;
	isPrivate?: boolean;
};

function SlackIntegrationInspector({
	connections,
	node,
	onChange,
}: {
	connections: IntegrationConnection[];
	node: WorkflowNode;
	onChange: (data: Partial<WorkflowNodeData>) => void;
}) {
	const { user } = db.useAuth();
	const [conversations, setConversations] = useState<SlackConversation[]>([]);
	const [isLoadingChannels, setIsLoadingChannels] = useState(false);
	const [channelError, setChannelError] = useState<string>();
	const slackConnections = connections.filter(
		(connection) =>
			connection.provider === "slack" && connection.status === "connected",
	);
	const connectionItems = slackConnections.map((connection) => ({
		value: connection.id,
		label: connection.externalName || connection.name || "Slack",
	}));
	const channelItems = conversations.map((conversation) => ({
		value: conversation.id,
		label: `#${conversation.name}`,
	}));
	const selectedConnectionId = node.data.connectionId ?? undefined;

	useEffect(() => {
		if (!selectedConnectionId || !user?.refresh_token) {
			setConversations([]);
			setChannelError(undefined);
			return;
		}

		let cancelled = false;

		const loadConversations = async () => {
			setIsLoadingChannels(true);
			setChannelError(undefined);

			try {
				const response = await fetch(
					`/api/integrations/slack/conversations?connectionId=${encodeURIComponent(
						selectedConnectionId,
					)}`,
					{
						headers: {
							Authorization: `Bearer ${user.refresh_token}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error(await getApiErrorMessage(response));
				}

				const body = (await response.json()) as {
					conversations?: SlackConversation[];
				};

				if (!cancelled) {
					setConversations(body.conversations ?? []);
				}
			} catch (error) {
				if (!cancelled) {
					setConversations([]);
					setChannelError(
						error instanceof Error
							? error.message
							: "Failed to load Slack channels.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingChannels(false);
				}
			}
		};

		void loadConversations();

		return () => {
			cancelled = true;
		};
	}, [selectedConnectionId, user?.refresh_token]);

	return (
		<InspectorSection
			title={
				node.data.blockType === "integrationTrigger"
					? "Slack trigger"
					: "Slack message"
			}
		>
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Connection</span>
				<Select.Root
					items={connectionItems}
					value={node.data.connectionId ?? null}
					onValueChange={(value) =>
						onChange({
							connectionId: value ?? undefined,
							channelId: undefined,
						})
					}
				>
					<Select.Trigger>
						<Select.Value placeholder="Select Slack workspace" />
						<Select.Icon />
					</Select.Trigger>
					<Select.Portal>
						<Select.Positioner>
							<Select.Popup>
								<Select.List>
									{slackConnections.map((connection) => (
										<Select.Item value={connection.id} key={connection.id}>
											<Select.ItemText>
												{connection.externalName || connection.name || "Slack"}
											</Select.ItemText>
											<Select.ItemIndicator />
										</Select.Item>
									))}
								</Select.List>
							</Select.Popup>
						</Select.Positioner>
					</Select.Portal>
				</Select.Root>
				{slackConnections.length === 0 ? (
					<Link
						href="../integrations"
						className="text-xs text-accent-11 hover:underline"
					>
						Connect Slack in Integrations.
					</Link>
				) : null}
			</div>
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Channel</span>
				<Select.Root
					items={channelItems}
					value={node.data.channelId ?? null}
					onValueChange={(value) => onChange({ channelId: value ?? undefined })}
					disabled={!selectedConnectionId || isLoadingChannels}
				>
					<Select.Trigger>
						<Select.Value
							placeholder={
								isLoadingChannels ? "Loading channels" : "Select channel"
							}
						/>
						<Select.Icon />
					</Select.Trigger>
					<Select.Portal>
						<Select.Positioner>
							<Select.Popup>
								<Select.List>
									{conversations.map((conversation) => (
										<Select.Item value={conversation.id} key={conversation.id}>
											<Select.ItemText>#{conversation.name}</Select.ItemText>
											<Select.ItemIndicator />
										</Select.Item>
									))}
								</Select.List>
							</Select.Popup>
						</Select.Positioner>
					</Select.Portal>
				</Select.Root>
				{channelError ? (
					<p className="text-xs text-red-11">{channelError}</p>
				) : null}
			</div>
			{node.data.blockType === "integrationAction" ? (
				<>
					<div className="flex flex-col gap-1 text-xs text-grayscale-11">
						<span>Message</span>
						<Textarea
							value={node.data.messageTemplate ?? ""}
							onChange={(event) =>
								onChange({ messageTemplate: event.target.value })
							}
							className="min-h-32 font-mono"
						/>
					</div>
					<label className="flex flex-col gap-1 text-xs text-grayscale-11">
						Thread timestamp
						<input
							value={node.data.threadTsTemplate ?? ""}
							onChange={(event) =>
								onChange({ threadTsTemplate: event.target.value })
							}
							placeholder="{{input.slack.threadTs}}"
							className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 font-mono text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
						/>
					</label>
				</>
			) : null}
		</InspectorSection>
	);
}

function YesNoClassifierInspector({
	agents,
	node,
	onChange,
}: {
	agents: Agent[];
	node: WorkflowNode;
	onChange: (data: Partial<WorkflowNodeData>) => void;
}) {
	const codexAgents = agents.filter(
		(agent) => agent.agent?.provider !== "cursor",
	);
	const resolvedAgentId = node.data.agentId || codexAgents[0]?.id;
	const agentItems = codexAgents.map((agent) => ({
		value: agent.id,
		label: agent.name,
	}));

	return (
		<InspectorSection title="Yes/no classifier">
			<AgentSelectField
				agents={codexAgents}
				emptyMessage="No Codex agents configured."
				items={agentItems}
				value={resolvedAgentId}
				onChange={(value) =>
					onChange({ agentId: value === null ? undefined : value })
				}
			/>
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Classifier prompt</span>
				<Textarea
					value={node.data.prompt ?? ""}
					onChange={(event) => onChange({ prompt: event.target.value })}
					className="min-h-40 font-mono"
				/>
			</div>
		</InspectorSection>
	);
}

function AgentSelectField({
	agents,
	emptyMessage,
	items,
	onChange,
	value,
}: {
	agents: Agent[];
	emptyMessage: string;
	items: Array<{ value: string; label: string }>;
	onChange: (value: string | null) => void;
	value: string | undefined;
}) {
	return (
		<div className="flex flex-col gap-1 text-xs text-grayscale-11">
			<span>Agent</span>
			<Select.Root items={items} value={value ?? null} onValueChange={onChange}>
				<Select.Trigger>
					<Select.Value placeholder="Select an agent" />
					<Select.Icon />
				</Select.Trigger>
				<Select.Portal>
					<Select.Positioner>
						<Select.Popup>
							<Select.List>
								{agents.map((agent) => (
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
			{agents.length === 0 ? (
				<p className="text-xs text-red-11">{emptyMessage}</p>
			) : null}
		</div>
	);
}

function ManualStartComposer({
	workspaceId,
	node,
	workflow,
}: {
	workspaceId: string;
	node: WorkflowNode;
	workflow: FloorWorkflow;
}) {
	const { user } = db.useAuth();
	const [message, setMessage] = useState("");
	const [pendingTaskId, setPendingTaskId] = useState(() => id());
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState<string>();
	const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
	const {
		attachments,
		addFiles,
		removeAttachment,
		clearAttachments,
		uploadAttachments,
	} = useImageAttachments({
		taskId: pendingTaskId,
		uploadImmediately: true,
	});

	const startWorkflow = async () => {
		const trimmedMessage = message.trim();

		if ((!trimmedMessage && attachments.length === 0) || isStarting) {
			return;
		}

		if (!user?.refresh_token) {
			setError("You must be signed in to start this workflow.");
			return;
		}

		const taskId = pendingTaskId;
		setIsStarting(true);
		setError(undefined);

		try {
			const images = await uploadAttachments(taskId);
			const fallbackMessage = buildAttachmentOnlyWorkflowMessage(images);
			const response = await fetch(
				`/api/workspaces/${workspaceId}/floor/manual-starts/${node.id}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${user.refresh_token}`,
					},
					body: JSON.stringify({
						taskId,
						input: {
							message: trimmedMessage || fallbackMessage,
							images,
						},
						images,
						workflow,
					}),
				},
			);

			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(result?.message ?? "Failed to start workflow.");
			}

			clearAttachments();
			setPendingTaskId(id());
			setMessage("");
		} catch (startError) {
			setError(
				startError instanceof Error
					? startError.message
					: "Failed to start workflow.",
			);
		} finally {
			setIsStarting(false);
		}
	};

	const handleDragOver = (event: ReactDragEvent<HTMLFieldSetElement>) => {
		if (!hasAttachmentFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		setIsDraggingAttachments(true);
	};

	const handleDragLeave = (event: ReactDragEvent<HTMLFieldSetElement>) => {
		const nextTarget = event.relatedTarget as globalThis.Node | null;

		if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
			setIsDraggingAttachments(false);
		}
	};

	const handleDrop = (event: ReactDragEvent<HTMLFieldSetElement>) => {
		if (!hasAttachmentFiles(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		setIsDraggingAttachments(false);
		addFiles(getAttachmentFiles(event.dataTransfer));
	};

	const handlePaste = (event: ReactClipboardEvent<HTMLFieldSetElement>) => {
		if (!hasAttachmentFiles(event.clipboardData)) {
			return;
		}

		event.preventDefault();
		addFiles(getAttachmentFiles(event.clipboardData));
	};

	return (
		<InspectorSection title="Start workflow">
			<fieldset
				aria-label="Workflow start composer"
				className={cn(
					"workspace-floor-panel flex min-w-0 flex-col gap-2 rounded-md border border-grayscale-4 bg-grayscale-1 p-2 transition-colors",
					isDraggingAttachments && "border-accent-8 bg-accent-2",
				)}
				disabled={isStarting}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onPaste={handlePaste}
			>
				<Textarea
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					onSubmit={startWorkflow}
					placeholder="Enter workflow input..."
					className="min-h-32 border-0 bg-transparent px-0 py-0 text-sm shadow-none hover:bg-transparent focus:bg-transparent focus:ring-0"
				/>
				<ImageAttachments
					attachments={attachments}
					disabled={isStarting}
					onAddFiles={addFiles}
					onRemoveAttachment={removeAttachment}
				/>
				<div className="flex items-center justify-between gap-2">
					{error ? (
						<p className="min-w-0 flex-1 truncate text-xs text-red-11">
							{error}
						</p>
					) : (
						<p className="min-w-0 flex-1 text-xs text-grayscale-10">
							Submit to create a workflow task.
						</p>
					)}
					<Button
						type="button"
						onClick={startWorkflow}
						disabled={
							(!message.trim() && attachments.length === 0) || isStarting
						}
					>
						<PlayCircleIcon weight="bold" className="size-4" />
						{isStarting ? "Starting" : "Start"}
					</Button>
				</div>
			</fieldset>
		</InspectorSection>
	);
}

function buildAttachmentOnlyWorkflowMessage(attachments: { name: string }[]) {
	if (attachments.length === 0) {
		return "Use the attached file input.";
	}

	const fileList = attachments
		.map((attachment) => `- ${attachment.name}`)
		.join("\n");

	return `Use the attached file input.\n\nAttached files:\n${fileList}`;
}

function InstructionInspector({
	node,
	onChange,
}: {
	node: WorkflowNode;
	onChange: (data: Partial<WorkflowNodeData>) => void;
}) {
	return (
		<InspectorSection title="Instruction">
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Prompt template</span>
				<Textarea
					value={node.data.instruction ?? ""}
					onChange={(event) => onChange({ instruction: event.target.value })}
					className="min-h-40 font-mono"
				/>
			</div>
		</InspectorSection>
	);
}

function AgentDecisionInspector({
	node,
	onChange,
}: {
	node: WorkflowNode;
	onChange: (data: Partial<WorkflowNodeData>) => void;
}) {
	const options = node.data.options ?? [];
	const optionRowKeysRef = useRef<string[]>([]);

	while (optionRowKeysRef.current.length < options.length) {
		optionRowKeysRef.current.push(id());
	}
	if (optionRowKeysRef.current.length > options.length) {
		optionRowKeysRef.current.splice(options.length);
	}

	const updateOption = (
		optionIndex: number,
		patch: Partial<DecisionOption>,
	) => {
		onChange({
			options: options.map((option, index) =>
				index === optionIndex ? { ...option, ...patch } : option,
			),
		});
	};

	const removeOption = (optionIndex: number) => {
		optionRowKeysRef.current.splice(optionIndex, 1);
		onChange({
			options: options.filter(
				(_current, currentIndex) => currentIndex !== optionIndex,
			),
		});
	};

	const addOption = () => {
		optionRowKeysRef.current.push(id());
		onChange({
			options: options.concat({
				id: `option_${options.length + 1}`,
				label: `Option ${options.length + 1}`,
			}),
		});
	};

	return (
		<InspectorSection title="Agent decision">
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Question</span>
				<Textarea
					value={node.data.question ?? ""}
					onChange={(event) => onChange({ question: event.target.value })}
					className="min-h-28"
				/>
			</div>
			<div className="flex flex-col gap-2">
				{options.map((option, index) => (
					<div
						key={optionRowKeysRef.current[index]}
						className="workspace-floor-panel rounded-md border border-grayscale-4 bg-grayscale-2 p-2"
					>
						<label className="flex flex-col gap-1 text-xs text-grayscale-11">
							Route id
							<input
								value={option.id}
								onChange={(event) =>
									updateOption(index, { id: event.target.value })
								}
								className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 font-mono text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
							/>
						</label>
						<label className="mt-2 flex flex-col gap-1 text-xs text-grayscale-11">
							Label
							<input
								value={option.label}
								onChange={(event) =>
									updateOption(index, { label: event.target.value })
								}
								className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
							/>
						</label>
						<Button
							type="button"
							variant="secondary"
							className="mt-2 h-7 w-full"
							onClick={() => removeOption(index)}
							disabled={options.length === 1}
						>
							Remove option {index + 1}
						</Button>
					</div>
				))}
			</div>
			<Button type="button" variant="secondary" onClick={addOption}>
				Add option
			</Button>
		</InspectorSection>
	);
}

function RouterInspector({
	node,
	onChange,
}: {
	node: WorkflowNode;
	onChange: (data: Partial<WorkflowNodeData>) => void;
}) {
	const conditions = node.data.conditions ?? [];

	const updateCondition = (
		conditionId: string,
		patch: Partial<RouterCondition>,
	) => {
		onChange({
			conditions: conditions.map((condition) =>
				condition.id === conditionId ? { ...condition, ...patch } : condition,
			),
		});
	};

	return (
		<InspectorSection title="Conditions">
			<div className="flex flex-col gap-2">
				{conditions.map((condition, index) => (
					<div
						key={condition.id}
						className="workspace-floor-panel rounded-md border border-grayscale-4 bg-grayscale-2 p-2"
					>
						<label className="flex flex-col gap-1 text-xs text-grayscale-11">
							Exit label
							<input
								value={condition.label}
								onChange={(event) =>
									updateCondition(condition.id, {
										label: event.target.value,
									})
								}
								className="rounded-md border border-grayscale-6 bg-grayscale-1 px-2 py-1.5 text-xs text-grayscale-12 outline-none focus:border-grayscale-8 focus:ring-2 focus:ring-grayscale-4/60"
							/>
						</label>
						<div className="mt-2 flex flex-col gap-1 text-xs text-grayscale-11">
							<span>CEL expression</span>
							<Textarea
								value={condition.expression}
								onChange={(event) =>
									updateCondition(condition.id, {
										expression: event.target.value,
									})
								}
								className="min-h-20 font-mono"
							/>
						</div>
						<Button
							type="button"
							variant="secondary"
							className="mt-2 h-7 w-full"
							onClick={() =>
								onChange({
									conditions: conditions.filter(
										(current) => current.id !== condition.id,
									),
								})
							}
							disabled={conditions.length === 1}
						>
							Remove condition {index + 1}
						</Button>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="secondary"
				onClick={() =>
					onChange({
						conditions: conditions.concat({
							id: id(),
							label: `condition-${conditions.length + 1}`,
							expression: "input.value == true",
						}),
					})
				}
			>
				Add condition
			</Button>
		</InspectorSection>
	);
}

function InspectorSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="workspace-floor-panel flex flex-col gap-2 rounded-lg border border-grayscale-4 bg-grayscale-2 p-3">
			<h2 className="font-mono text-[11px] font-semibold text-grayscale-10 uppercase">
				{title}
			</h2>
			{children}
		</section>
	);
}

const getBlockIcon = (blockType: WorkflowBlockType) => {
	const className = "size-4";

	switch (blockType) {
		case "manualStart":
			return <KeyboardIcon weight="bold" className={className} />;
		case "webhook":
			return <WebhooksLogoIcon weight="bold" className={className} />;
		case "instruction":
			return <PaperPlaneTiltIcon weight="bold" className={className} />;
		case "agentRun":
			return <PlayCircleIcon weight="bold" className={className} />;
		case "agentDecision":
			return <GitBranchIcon weight="bold" className={className} />;
		case "yesNoClassifier":
			return <GitBranchIcon weight="bold" className={className} />;
		case "httpRequest":
			return <PaperPlaneTiltIcon weight="bold" className={className} />;
		case "integrationTrigger":
			return <SlackLogoIcon weight="bold" className={className} />;
		case "integrationAction":
			return <SlackLogoIcon weight="bold" className={className} />;
		case "conditionalRouter":
			return <GitBranchIcon weight="bold" className={className} />;
		case "completeTask":
			return <FlowArrowIcon weight="bold" className={className} />;
	}
};

const compareWorkflowTasks = (first: WorkflowTask, second: WorkflowTask) =>
	getTaskTime(second) - getTaskTime(first);

const getTaskTime = (task: WorkflowTask) => {
	const timestamp = task.createdAt;

	if (!timestamp) {
		return 0;
	}

	const time = new Date(timestamp).getTime();
	return Number.isNaN(time) ? 0 : time;
};

const parseWorkflow = (value: unknown): FloorWorkflow => {
	if (!isRecord(value)) {
		return { nodes: [], edges: [] };
	}

	const legacyNodes = Array.isArray(value.nodes)
		? value.nodes.filter(isLegacyWorkflowNode)
		: [];
	const legacyHumanInputNodeIds = new Set(
		legacyNodes
			.filter((node) => node.data.blockType === "humanInput")
			.map((node) => node.id),
	);

	return {
		nodes: legacyNodes.map(normalizeWorkflowNode),
		edges: Array.isArray(value.edges)
			? (value.edges.filter(isWorkflowEdge) as WorkflowEdge[]).map((edge) =>
					withWorkflowEdgeDefaults(
						legacyHumanInputNodeIds.has(edge.target)
							? {
									...edge,
									targetHandle: humanLoopHandleId,
								}
							: edge,
					),
				)
			: [],
	};
};

const normalizeWorkflowNode = (node: LegacyWorkflowNode): WorkflowNode => {
	if (node.data.blockType !== "humanInput") {
		const {
			humanInputEnabled: _humanInputEnabled,
			humanInputPrompt: _humanInputPrompt,
			humanPrompt: _humanPrompt,
			...data
		} = node.data;

		if (data.blockType === "agentRun") {
			return {
				...node,
				type: "agentRun",
				data: {
					...data,
					blockType: "agentRun",
					label:
						data.label === "Agent Run" ||
						data.label === "Agent Session" ||
						!data.label
							? "Agent Step"
							: data.label,
				},
			};
		}

		if (!isWorkflowBlockType(data.blockType)) {
			return createWorkflowNode("agentRun", node.position, node.id);
		}

		return {
			...node,
			type: data.blockType,
			data: {
				...data,
				blockType: data.blockType,
			},
		};
	}

	return {
		...node,
		type: "agentRun",
		data: {
			blockType: "agentRun",
			label:
				node.data.label === "Agent Run" || !node.data.label
					? "Agent Step"
					: node.data.label,
			prompt: "Use the human input:\n\n{{input.message}}",
		},
	};
};

const withWorkflowEdgeDefaults = (edge: WorkflowEdge): WorkflowEdge => ({
	...edge,
	type: "smoothstep",
	animated: true,
	pathOptions: {
		...workflowEdgePathOptions,
		...(isRecord(edge.pathOptions) ? edge.pathOptions : {}),
	},
});

const cloneWorkflow = (workflow: FloorWorkflow): FloorWorkflow => ({
	nodes: workflow.nodes.map((node) => ({
		...node,
		position: { ...node.position },
		data: {
			...node.data,
			conditions: node.data.conditions?.map((condition) => ({
				...condition,
			})),
			options: node.data.options?.map((option) => ({
				...option,
			})),
		},
	})),
	edges: workflow.edges.map((edge) =>
		withWorkflowEdgeDefaults({
			...edge,
			pathOptions: isRecord(edge.pathOptions)
				? { ...edge.pathOptions }
				: undefined,
		}),
	),
});

const withSyncedWebhookEntities = (
	workflow: FloorWorkflow,
	webhooks: WorkspaceWebhook[],
	workspaceId: string,
	knownWebhookIds: Set<string>,
	timestamp = new Date().toISOString(),
) => {
	const activeWebhookIds = new Set<string>();
	const existingById = new Map(
		webhooks.map((webhook) => [webhook.id, webhook]),
	);
	const transactions = [];
	const nodes = workflow.nodes.map((node) => {
		if (node.data.blockType !== "webhook") {
			return node;
		}

		const webhookId = node.data.webhookId ?? id();
		const existingWebhook = existingById.get(webhookId);
		const shouldUpdateWebhook =
			existingWebhook !== undefined || knownWebhookIds.has(webhookId);
		const name = node.data.label || "Webhook";
		const publicId = existingWebhook?.publicId ?? webhookId;
		const secret = node.data.webhookSecret ?? existingWebhook?.secret;
		activeWebhookIds.add(webhookId);

		const webhookData = {
			name,
			publicId,
			nodeId: node.id,
			enabled: true,
			updatedAt: timestamp,
			...(secret !== undefined ? { secret } : {}),
		};

		transactions.push(
			shouldUpdateWebhook
				? webhookTx(webhookId)
						.update(webhookData)
						.link({ workspace: workspaceId })
				: webhookTx(webhookId)
						.create({
							...webhookData,
							secret: secret ?? createSecret(),
							createdAt: timestamp,
						})
						.link({ workspace: workspaceId }),
		);

		const { webhookSecret: _webhookSecret, ...data } = node.data;

		return {
			...node,
			data: {
				...data,
				webhookId,
			},
		};
	});

	for (const webhook of webhooks) {
		if (!activeWebhookIds.has(webhook.id) && webhook.enabled !== false) {
			transactions.push(
				webhookTx(webhook.id).update({
					enabled: false,
					updatedAt: timestamp,
				}),
			);
		}
	}

	return {
		workflow: {
			nodes,
			edges: workflow.edges,
		},
		transactions,
		webhookIds: activeWebhookIds,
	};
};

const withSyncedIntegrationTriggerSubscriptions = (
	workflow: FloorWorkflow,
	subscriptions: IntegrationTriggerSubscription[],
	workspaceId: string,
	knownSubscriptionIds: Set<string>,
	timestamp = new Date().toISOString(),
) => {
	const activeSubscriptionIds = new Set<string>();
	const existingByNodeId = new Map(
		subscriptions.map((subscription) => [subscription.nodeId, subscription]),
	);
	const transactions = [];

	for (const node of workflow.nodes) {
		if (
			node.data.blockType !== "integrationTrigger" ||
			node.data.provider !== "slack" ||
			node.data.trigger !== "messageReceived" ||
			!node.data.connectionId ||
			!node.data.channelId
		) {
			continue;
		}

		const existingSubscription = existingByNodeId.get(node.id);
		const subscriptionId = existingSubscription?.id ?? id();
		const shouldUpdateSubscription =
			existingSubscription !== undefined ||
			knownSubscriptionIds.has(subscriptionId);
		const subscriptionData = {
			provider: "slack",
			trigger: "messageReceived",
			nodeId: node.id,
			externalId: node.data.channelId,
			config: {
				channelId: node.data.channelId,
			},
			enabled: true,
			updatedAt: timestamp,
		};
		activeSubscriptionIds.add(subscriptionId);

		transactions.push(
			shouldUpdateSubscription
				? integrationTriggerSubscriptionTx(subscriptionId)
						.update(subscriptionData)
						.link({
							workspace: workspaceId,
							integrationConnection: node.data.connectionId,
						})
				: integrationTriggerSubscriptionTx(subscriptionId)
						.create({
							...subscriptionData,
							createdAt: timestamp,
						})
						.link({
							workspace: workspaceId,
							integrationConnection: node.data.connectionId,
						}),
		);
	}

	for (const subscription of subscriptions) {
		if (
			subscription.provider === "slack" &&
			subscription.trigger === "messageReceived" &&
			!activeSubscriptionIds.has(subscription.id) &&
			subscription.enabled !== false
		) {
			transactions.push(
				integrationTriggerSubscriptionTx(subscription.id).update({
					enabled: false,
					updatedAt: timestamp,
				}),
			);
		}
	}

	return {
		workflow,
		transactions,
		subscriptionIds: activeSubscriptionIds,
	};
};

const findWebhookForNode = (
	node: WorkflowNode,
	webhooks: WorkspaceWebhook[],
): WorkspaceWebhook | undefined =>
	node.data.webhookId
		? webhooks.find((webhook) => webhook.id === node.data.webhookId)
		: undefined;

const getActualFlowChangeKeys = (
	changes: Array<{ id?: string; type: string; dragging?: boolean }>,
	entityType: "edge" | "node",
) =>
	changes.flatMap((change, index) => {
		if (
			change.type === "select" ||
			change.type === "dimensions" ||
			change.type === "position"
		) {
			return [];
		}

		return [`${entityType}-${change.type}:${change.id ?? index}`];
	});

const isLegacyWorkflowNode = (value: unknown): value is LegacyWorkflowNode =>
	isRecord(value) &&
	typeof value.id === "string" &&
	isRecord(value.position) &&
	typeof value.position.x === "number" &&
	typeof value.position.y === "number" &&
	isRecord(value.data) &&
	isLegacyWorkflowBlockType(value.data.blockType);

const isWorkflowEdge = (value: unknown): value is WorkflowEdge =>
	isRecord(value) &&
	typeof value.id === "string" &&
	typeof value.source === "string" &&
	typeof value.target === "string";

const isWorkflowBlockType = (value: unknown): value is WorkflowBlockType =>
	value === "manualStart" ||
	value === "webhook" ||
	value === "instruction" ||
	value === "agentRun" ||
	value === "agentDecision" ||
	value === "yesNoClassifier" ||
	value === "httpRequest" ||
	value === "integrationTrigger" ||
	value === "integrationAction" ||
	value === "conditionalRouter" ||
	value === "completeTask";

const isLegacyWorkflowBlockType = (
	value: unknown,
): value is LegacyWorkflowBlockType =>
	isWorkflowBlockType(value) || value === "humanInput";

const getApiErrorMessage = async (response: Response) => {
	try {
		const body = (await response.json()) as { message?: unknown };

		if (typeof body.message === "string") {
			return body.message;
		}
	} catch {
		return "Request failed";
	}

	return "Request failed";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
