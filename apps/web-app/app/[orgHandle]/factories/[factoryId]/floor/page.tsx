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
	WebhooksLogoIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import db from "@repo/db/client";
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
import { useParams, useRouter } from "next/navigation";
import {
	type ClipboardEvent as ReactClipboardEvent,
	type DragEvent as ReactDragEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
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
import { cn } from "@/helpers/classname-helper";
import type { AppSchema } from "@/instant.schema";

type WorkflowBlockType =
	| "manualStart"
	| "webhook"
	| "agentRun"
	| "httpRequest"
	| "conditionalRouter"
	| "completeTask";

type LegacyWorkflowBlockType = WorkflowBlockType | "humanInput";

type RouterCondition = {
	id: string;
	label: string;
	expression: string;
};

type WorkflowNodeData = {
	blockType: WorkflowBlockType;
	label: string;
	webhookSecret?: string;
	prompt?: string;
	agentId?: string;
	responseSchema?: string;
	httpMethod?: string;
	httpUrl?: string;
	httpHeaders?: string;
	httpBody?: string;
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

type FloorChangeProposal = InstaQLEntity<AppSchema, "floorChangeProposals"> & {
	task?: {
		id: string;
		name?: string;
	};
};
type Agent = InstaQLEntity<AppSchema, "agents">;

type ProposalActionState = {
	proposalId: string;
	action: "accept" | "reject";
};

type ProposalSaveResult = {
	proposalId: string;
};

const workflowEdgePathOptions = {
	borderRadius: 28,
	offset: 28,
};
const humanLoopHandleId = "human-loop";
const MIN_INSPECTOR_SIZE = 320;
const MAX_INSPECTOR_SIZE = 640;
const DEFAULT_INSPECTOR_SIZE = 360;

const blockOptions: Array<{
	type: WorkflowBlockType;
	label: string;
	description: string;
}> = [
	{
		type: "manualStart",
		label: "Manual Start",
		description: "Start a workflow by typing input and adding files.",
	},
	{
		type: "webhook",
		label: "Webhook",
		description: "Entry point with URL and secret.",
	},
	{
		type: "agentRun",
		label: "Agent Run",
		description: "Prompt, template input, optional JSON schema.",
	},
	{
		type: "httpRequest",
		label: "HTTP Request",
		description: "Send an HTTP request to an external service.",
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
	const webhookId = id();
	const agentId = id();
	const completeId = id();

	return {
		nodes: [
			createWorkflowNode("manualStart", { x: 80, y: 280 }),
			createWorkflowNode("webhook", { x: 80, y: 120 }, webhookId),
			createWorkflowNode("agentRun", { x: 420, y: 120 }, agentId),
			createWorkflowNode("completeTask", { x: 760, y: 120 }, completeId),
		],
		edges: [
			{
				id: id(),
				type: "smoothstep",
				animated: true,
				pathOptions: workflowEdgePathOptions,
				source: webhookId,
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
				webhookSecret: createSecret(),
			};
		case "agentRun":
			return {
				blockType,
				label: "Agent Run",
				prompt: "Use the workflow input:\n\n{{input.message}}",
				responseSchema: '{\n  "type": "object",\n  "properties": {}\n}',
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
	agentRun: WorkflowCard,
	httpRequest: WorkflowCard,
	conditionalRouter: WorkflowCard,
	completeTask: WorkflowCard,
};

const factoryTx = (factoryId: string) => {
	const tx = db.tx.factories[factoryId];

	if (!tx) {
		throw new Error(`Factory transaction builder ${factoryId} not found`);
	}

	return tx;
};

const floorChangeProposalTx = (proposalId: string) => {
	const tx = db.tx.floorChangeProposals[proposalId];

	if (!tx) {
		throw new Error(
			`Floor change proposal transaction builder ${proposalId} not found`,
		);
	}

	return tx;
};

export default function FactoryFloorPage() {
	return (
		<ReactFlowProvider>
			<FactoryFloorEditor />
		</ReactFlowProvider>
	);
}

function FactoryFloorEditor() {
	const { orgHandle, factoryId } = useParams();
	const { user } = db.useAuth();
	const currentFactoryId = factoryId as string;
	const currentOrgHandle = orgHandle as string;
	const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow<
		WorkflowNode,
		WorkflowEdge
	>();
	const [selectedNodeId, setSelectedNodeId] = useState<string>();
	const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
	const [isProposalDropdownOpen, setIsProposalDropdownOpen] = useState(false);
	const [previewedProposalId, setPreviewedProposalId] = useState<string>();
	const [inspectorSize, setInspectorSize] = useState(DEFAULT_INSPECTOR_SIZE);
	const [hasHydratedWorkflow, setHasHydratedWorkflow] = useState(false);
	const [unsavedChanges, setUnsavedChanges] = useState(0);
	const [savedWorkflow, setSavedWorkflow] = useState<FloorWorkflow>();
	const [draftSaveVersion, setDraftSaveVersion] = useState(0);
	const [layoutSaveVersion, setLayoutSaveVersion] = useState(0);
	const [proposalAction, setProposalAction] = useState<ProposalActionState>();
	const [proposalError, setProposalError] = useState<string>();
	const latestWorkflowRef = useRef<FloorWorkflow>({ nodes: [], edges: [] });
	const savedWorkflowRef = useRef<FloorWorkflow | undefined>(undefined);
	const unsavedChangeKeysRef = useRef(new Set<string>());
	const draftProposalIdRef = useRef<string | undefined>(undefined);
	const draftProposalCreatedRef = useRef(false);
	const draftSaveVersionRef = useRef(0);
	const addBlockScreenPositionRef = useRef<
		{ x: number; y: number } | undefined
	>(undefined);
	const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);

	const { data } = db.useQuery({
		organisations: {
			$: {
				where: {
					handle: currentOrgHandle,
				},
			},
			agents: {},
		},
		factories: {
			$: {
				where: {
					id: currentFactoryId,
				},
			},
			floorChangeProposals: {
				task: {},
			},
		},
	});
	const factory = data?.factories?.[0];
	const agents = (data?.organisations?.[0]?.agents ?? []) as Agent[];
	const selectedNode = nodes.find((node) => node.id === selectedNodeId);
	const pendingFloorProposals = useMemo(
		() =>
			((factory?.floorChangeProposals ?? []) as FloorChangeProposal[])
				.filter((proposal) => proposal.status === "pending")
				.sort(compareFloorChangeProposals),
		[factory?.floorChangeProposals],
	);

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

	const persistWorkflow = useCallback(
		async (
			workflow: FloorWorkflow,
			proposalId: string,
		): Promise<ProposalSaveResult> => {
			const title = "Factory floor edits";
			const summary = "Saved from the floor editor.";

			if (draftProposalCreatedRef.current) {
				await db.transact(
					floorChangeProposalTx(proposalId).update({
						title,
						summary,
						workflow,
					}),
				);

				return { proposalId };
			}

			draftProposalCreatedRef.current = true;

			try {
				await db.transact(
					floorChangeProposalTx(proposalId)
						.create({
							title,
							summary,
							workflow,
							status: "pending",
							createdAt: new Date().toISOString(),
						})
						.link({ factory: currentFactoryId }),
				);
			} catch (error) {
				draftProposalCreatedRef.current = false;
				throw error;
			}

			return { proposalId };
		},
		[currentFactoryId],
	);

	const persistFloorLayout = useCallback(
		async (workflow: FloorWorkflow) => {
			await db.transact(
				factoryTx(currentFactoryId).update({
					floorWorkflow: workflow,
					floorWorkflowUpdatedAt: new Date().toISOString(),
				}),
			);
		},
		[currentFactoryId],
	);

	useEffect(() => {
		if (hasHydratedWorkflow || !factory) {
			return;
		}

		const workflow = parseWorkflow(factory.floorWorkflow);
		const hydratedWorkflow =
			workflow.nodes.length > 0 || workflow.edges.length > 0
				? workflow
				: defaultWorkflow();
		const nextWorkflow = cloneWorkflow(hydratedWorkflow);

		setNodes(nextWorkflow.nodes);
		setEdges(nextWorkflow.edges);
		setSelectedNodeId(undefined);
		setSavedWorkflow(cloneWorkflow(nextWorkflow));
		setHasHydratedWorkflow(true);
	}, [factory, hasHydratedWorkflow, setEdges, setNodes]);

	useEffect(() => {
		latestWorkflowRef.current = {
			nodes,
			edges,
		};
	}, [edges, nodes]);

	useEffect(() => {
		savedWorkflowRef.current = savedWorkflow;
	}, [savedWorkflow]);

	useEffect(() => {
		if (draftSaveVersion === 0 || unsavedChanges === 0 || !user) {
			return;
		}

		const saveVersion = draftSaveVersion;
		const workflow = cloneWorkflow(latestWorkflowRef.current);
		const proposalId = draftProposalIdRef.current ?? id();
		draftProposalIdRef.current = proposalId;

		void persistWorkflow(workflow, proposalId)
			.then((result) => {
				draftProposalIdRef.current = result.proposalId;

				if (draftSaveVersionRef.current === saveVersion) {
					unsavedChangeKeysRef.current = new Set();
					setUnsavedChanges(0);
				}
			})
			.catch((error) => {
				setProposalError(
					error instanceof Error ? error.message : "Failed to save proposal.",
				);
			});
	}, [draftSaveVersion, persistWorkflow, unsavedChanges, user]);

	useEffect(() => {
		if (layoutSaveVersion === 0 || !user || !savedWorkflowRef.current) {
			return;
		}

		const acceptedWorkflow = savedWorkflowRef.current;
		const timeout = window.setTimeout(() => {
			const workflow = cloneWorkflow(
				withCurrentNodePositions(
					acceptedWorkflow,
					latestWorkflowRef.current.nodes,
				),
			);

			void persistFloorLayout(workflow)
				.then(() => {
					setSavedWorkflow(cloneWorkflow(workflow));
				})
				.catch((error) => {
					setProposalError(
						error instanceof Error ? error.message : "Failed to save layout.",
					);
				});
		}, 700);

		return () => window.clearTimeout(timeout);
	}, [layoutSaveVersion, persistFloorLayout, user]);

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
		setDraftSaveVersion((version) => {
			const nextVersion = version + 1;
			draftSaveVersionRef.current = nextVersion;
			return nextVersion;
		});
		setProposalError(undefined);
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
			setIsProposalDropdownOpen(false);
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

	const flushDraftWorkflow = async () => {
		if (!user || unsavedChanges === 0) {
			return;
		}

		const proposalId = draftProposalIdRef.current ?? id();
		draftProposalIdRef.current = proposalId;
		await persistWorkflow(cloneWorkflow(latestWorkflowRef.current), proposalId);
		unsavedChangeKeysRef.current = new Set();
		setUnsavedChanges(0);
	};

	const decideFloorProposal = async (
		proposal: FloorChangeProposal,
		action: "accept" | "reject",
	) => {
		if (!user) {
			setProposalError("You must be signed in.");
			return;
		}

		setProposalAction({ proposalId: proposal.id, action });
		setProposalError(undefined);

		try {
			const now = new Date().toISOString();
			const isCurrentDraft = proposal.id === draftProposalIdRef.current;

			if (action === "accept") {
				const workflow = cloneWorkflow(
					withAcceptedLayoutPositions(
						isCurrentDraft
							? latestWorkflowRef.current
							: parseWorkflow(proposal.workflow),
						savedWorkflowRef.current,
					),
				);

				await db.transact([
					factoryTx(currentFactoryId).update({
						floorWorkflow: workflow,
						floorWorkflowUpdatedAt: now,
					}),
					floorChangeProposalTx(proposal.id).update({
						status: "accepted",
						decidedAt: now,
						workflow,
					}),
				]);

				setNodes(workflow.nodes);
				setEdges(workflow.edges);
				setSelectedNodeId(undefined);
				setSavedWorkflow(cloneWorkflow(workflow));
				unsavedChangeKeysRef.current = new Set();
				setUnsavedChanges(0);
				draftProposalIdRef.current = undefined;
				draftProposalCreatedRef.current = false;
				setPreviewedProposalId(undefined);
				setIsProposalDropdownOpen(false);
			} else {
				await db.transact(
					floorChangeProposalTx(proposal.id).update({
						status: "rejected",
						decidedAt: now,
					}),
				);
			}

			if (proposal.id === draftProposalIdRef.current) {
				draftProposalIdRef.current = undefined;
				draftProposalCreatedRef.current = false;

				if (action === "reject" && savedWorkflow) {
					const workflow = cloneWorkflow(savedWorkflow);
					setNodes(workflow.nodes);
					setEdges(workflow.edges);
					setSelectedNodeId(undefined);
					unsavedChangeKeysRef.current = new Set();
					setUnsavedChanges(0);
				}
			}

			if (proposal.id === previewedProposalId) {
				setPreviewedProposalId(undefined);
				setIsProposalDropdownOpen(false);

				if (action === "reject" && savedWorkflow) {
					const workflow = cloneWorkflow(savedWorkflow);
					setNodes(workflow.nodes);
					setEdges(workflow.edges);
					setSelectedNodeId(undefined);
				}
			}
		} catch (error) {
			setProposalError(
				error instanceof Error ? error.message : "Failed to update proposal.",
			);
		} finally {
			setProposalAction(undefined);
		}
	};

	const previewFloorProposal = async (proposal: FloorChangeProposal) => {
		await flushDraftWorkflow();

		const workflow = cloneWorkflow(parseWorkflow(proposal.workflow));
		setNodes(workflow.nodes);
		setEdges(workflow.edges);
		setSelectedNodeId(undefined);
		setPreviewedProposalId(proposal.id);
		setIsProposalDropdownOpen(false);
		setIsAddBlockOpen(false);
		setProposalError(undefined);
		draftProposalIdRef.current = proposal.id;
		draftProposalCreatedRef.current = true;
	};

	return (
		<div className="relative flex h-full w-full bg-grayscale-1">
			<div className="absolute left-4 top-4 z-30">
				<FloorDock
					isAddBlockOpen={isAddBlockOpen}
					isProposalDropdownOpen={isProposalDropdownOpen}
					proposalAction={proposalAction}
					proposalError={proposalError}
					proposals={pendingFloorProposals}
					previewedProposalId={previewedProposalId}
					onAddBlockToggle={() => {
						setIsProposalDropdownOpen(false);
						setIsAddBlockOpen((isOpen) => !isOpen);
					}}
					onAcceptProposal={(proposal) => {
						void decideFloorProposal(proposal, "accept");
					}}
					onFitView={fitFloorToView}
					onPreviewProposal={(proposal) => {
						void previewFloorProposal(proposal);
					}}
					onProposalDropdownToggle={() => {
						setIsAddBlockOpen(false);
						setIsProposalDropdownOpen((isOpen) => !isOpen);
					}}
					onRejectProposal={(proposal) => {
						void decideFloorProposal(proposal, "reject");
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
							if (hasCompletedPositionChange(changes)) {
								setLayoutSaveVersion((version) => version + 1);
							}
						}}
						onEdgesChange={(changes) => {
							onEdgesChange(changes);
							markWorkflowChanged(getActualFlowChangeKeys(changes, "edge"));
						}}
						onConnect={onConnect}
						onPaneClick={() => {
							setIsAddBlockOpen(false);
							setIsProposalDropdownOpen(false);
							setSelectedNodeId(undefined);
						}}
						onNodeClick={(_, node) => {
							setSelectedNodeId(node.id);
							setIsAddBlockOpen(false);
							setIsProposalDropdownOpen(false);
						}}
						fitView
						minZoom={0.25}
						maxZoom={1.6}
						proOptions={{ hideAttribution: true }}
						className="bg-grayscale-1"
					>
						<Background color="var(--slate-6)" gap={18} size={1} />
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
						factoryId={currentFactoryId}
						orgHandle={currentOrgHandle}
						node={selectedNode}
						onChange={updateSelectedNode}
						onClose={() => setSelectedNodeId(undefined)}
						onResizeStart={startInspectorResize}
						size={inspectorSize}
					/>
				) : null}
			</AnimatePresence>
		</div>
	);
}

function FloorDock({
	isAddBlockOpen,
	isProposalDropdownOpen,
	onAcceptProposal,
	onAddBlockToggle,
	onFitView,
	onPreviewProposal,
	onProposalDropdownToggle,
	onRejectProposal,
	onZoomIn,
	onZoomOut,
	previewedProposalId,
	proposalAction,
	proposalError,
	proposals,
}: {
	isAddBlockOpen: boolean;
	isProposalDropdownOpen: boolean;
	onAcceptProposal: (proposal: FloorChangeProposal) => void;
	onAddBlockToggle: () => void;
	onFitView: () => void;
	onPreviewProposal: (proposal: FloorChangeProposal) => void;
	onProposalDropdownToggle: () => void;
	onRejectProposal: (proposal: FloorChangeProposal) => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	previewedProposalId: string | undefined;
	proposalAction: ProposalActionState | undefined;
	proposalError: string | undefined;
	proposals: FloorChangeProposal[];
}) {
	const proposalCountLabel =
		proposals.length === 1
			? "1 pending proposal"
			: `${proposals.length} pending proposals`;

	return (
		<div className="flex items-center gap-1 rounded-lg border border-grayscale-5 bg-grayscale-1/95 p-1 shadow-lg backdrop-blur">
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
			<div className="relative">
				<button
					type="button"
					aria-expanded={isProposalDropdownOpen}
					onClick={onProposalDropdownToggle}
					className={cn(
						"flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-grayscale-3",
						proposals.length > 0 ? "text-grayscale-12" : "text-grayscale-10",
						previewedProposalId && "bg-accent-3 text-accent-12",
					)}
				>
					<FlowArrowIcon weight="bold" className="size-4 shrink-0" />
					<span>{proposalCountLabel}</span>
					<CaretDownIcon
						weight="bold"
						className={cn(
							"size-3 shrink-0 transition-transform",
							isProposalDropdownOpen && "rotate-180",
						)}
					/>
				</button>
				{isProposalDropdownOpen ? (
					<FloorProposalDropdown
						actionState={proposalAction}
						error={proposalError}
						onAccept={onAcceptProposal}
						onPreview={onPreviewProposal}
						onReject={onRejectProposal}
						previewedProposalId={previewedProposalId}
						proposals={proposals}
					/>
				) : null}
			</div>
		</div>
	);
}

function FloorProposalDropdown({
	actionState,
	error,
	onAccept,
	onPreview,
	onReject,
	previewedProposalId,
	proposals,
}: {
	actionState: ProposalActionState | undefined;
	error: string | undefined;
	onAccept: (proposal: FloorChangeProposal) => void;
	onPreview: (proposal: FloorChangeProposal) => void;
	onReject: (proposal: FloorChangeProposal) => void;
	previewedProposalId: string | undefined;
	proposals: FloorChangeProposal[];
}) {
	return (
		<div className="absolute left-0 top-10 z-50 flex max-h-[60vh] w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 overflow-y-auto rounded-lg border border-grayscale-5 bg-grayscale-1 p-2 shadow-xl">
			<div className="px-1">
				<p className="text-sm font-semibold text-grayscale-12">
					Floor proposals
				</p>
				<p className="text-xs text-grayscale-10">
					Select a proposal to preview it on the canvas.
				</p>
			</div>
			{error ? (
				<p className="rounded-md border border-red-6 bg-red-2 px-2 py-1.5 text-xs text-red-11">
					{error}
				</p>
			) : null}
			{proposals.length > 0 ? (
				<div className="flex flex-col gap-1">
					{proposals.map((proposal) => {
						const actionInFlight = actionState?.proposalId === proposal.id;
						const acceptInFlight =
							actionInFlight && actionState.action === "accept";
						const rejectInFlight =
							actionInFlight && actionState.action === "reject";
						const isPreviewed = previewedProposalId === proposal.id;

						return (
							<div
								key={proposal.id}
								className={cn(
									"rounded-md border p-2 transition-colors",
									isPreviewed
										? "border-accent-7 bg-accent-2"
										: "border-grayscale-4 bg-grayscale-2",
								)}
							>
								<button
									type="button"
									onClick={() => onPreview(proposal)}
									className="block w-full min-w-0 text-left"
								>
									<p className="truncate text-sm font-medium text-grayscale-12">
										{proposal.title}
									</p>
									<p className="font-mono text-[10px] text-grayscale-10">
										{formatProposalTimestamp(proposal.createdAt)}
									</p>
									{proposal.summary ? (
										<p className="mt-1 line-clamp-2 text-xs text-grayscale-11">
											{proposal.summary}
										</p>
									) : null}
								</button>
								<div className="mt-2 flex items-center justify-end gap-2">
									<Button
										type="button"
										variant="secondary"
										className="h-7"
										onClick={() => onReject(proposal)}
										disabled={actionState !== undefined}
									>
										<XCircleIcon weight="bold" className="size-4" />
										{rejectInFlight ? "Rejecting" : "Reject"}
									</Button>
									<Button
										type="button"
										className="h-7"
										onClick={() => onAccept(proposal)}
										disabled={actionState !== undefined}
									>
										<CheckCircleIcon weight="bold" className="size-4" />
										{acceptInFlight ? "Accepting" : "Accept"}
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<p className="rounded-md border border-grayscale-4 bg-grayscale-2 px-2 py-2 text-xs text-grayscale-10">
					No pending proposals.
				</p>
			)}
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

	return (
		<div
			className={cn(
				"min-w-64 max-w-72 rounded-lg border bg-grayscale-1",
				selected
					? "border-accent-9 ring-2 ring-accent-5"
					: "border-grayscale-6",
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
			) : data.blockType !== "webhook" ? (
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
								className="relative rounded-md border border-grayscale-4 bg-grayscale-2 px-2 py-1"
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
				) : data.blockType !== "completeTask" ? (
					<Handle
						type="source"
						id="output"
						position={Position.Right}
						className="!size-3 !border-2 !border-grayscale-1 !bg-green-9"
					/>
				) : null}
			</div>
		</div>
	);
}

function HumanLoopEntry({ connected }: { connected: boolean }) {
	return (
		<div
			className={cn(
				"border-b px-3 py-2 transition-colors",
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
				"w-[360px] rounded-xl border border-grayscale-3 bg-grayscale-2 p-1.5 dark:bg-grayscale-2",
				selected ? "border-accent-9 ring-2 ring-accent-5" : "",
			)}
		>
			<div className="overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-5 dark:bg-grayscale-3">
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
						<div className="flex h-7 items-center gap-1.5 rounded-md bg-grayscale-2 px-2 text-xs text-grayscale-11 ring-1 ring-grayscale-4">
							<span>Add files</span>
						</div>
						<div className="flex h-8 items-center gap-2 rounded-md border border-grayscale-12 bg-grayscale-12 px-3 text-xs font-medium text-grayscale-1">
							<PlayCircleIcon weight="bold" className="size-4" />
							<span>Start</span>
						</div>
					</div>
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
					Secret: {data.webhookSecret}
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
			className="mt-2 w-72 rounded-lg border border-grayscale-5 bg-grayscale-1 p-1 shadow-xl"
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
	factoryId,
	orgHandle,
	node,
	onChange,
	onClose,
	onResizeStart,
	size,
}: {
	agents: Agent[];
	factoryId: string;
	orgHandle: string;
	node: WorkflowNode | undefined;
	onChange: (data: Partial<WorkflowNodeData>) => void;
	onClose: () => void;
	onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	size: number;
}) {
	const webhookUrl = useMemo(() => {
		if (node?.data.blockType !== "webhook") {
			return "";
		}

		if (typeof window === "undefined") {
			return `/api/factories/${factoryId}/floor/webhooks/${node.id}`;
		}

		return `${window.location.origin}/api/factories/${factoryId}/floor/webhooks/${node.id}`;
	}, [factoryId, node]);

	if (!node) {
		return null;
	}

	return (
		<motion.aside
			className="absolute right-0 top-0 z-20 flex h-full shrink-0 flex-col gap-3 overflow-y-auto bg-grayscale-1 p-3"
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
					factoryId={factoryId}
					node={node}
					orgHandle={orgHandle}
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
							value={node.data.webhookSecret ?? ""}
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
					href={`/${orgHandle}/factories/${factoryId}`}
					className="text-accent-11 hover:underline"
				>
					the factory task list
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
		<InspectorSection title="Agent run">
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Agent</span>
				<Select.Root
					items={agentItems}
					value={resolvedAgentId ?? null}
					onValueChange={(value) =>
						onChange({ agentId: value === null ? undefined : value })
					}
				>
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
					<p className="text-xs text-red-11">No agents configured.</p>
				) : null}
			</div>
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Prompt</span>
				<Textarea
					value={node.data.prompt ?? ""}
					onChange={(event) => onChange({ prompt: event.target.value })}
					className="min-h-32 font-mono"
				/>
			</div>
			<div className="flex flex-col gap-1 text-xs text-grayscale-11">
				<span>Response schema JSON</span>
				<Textarea
					value={node.data.responseSchema ?? ""}
					onChange={(event) => onChange({ responseSchema: event.target.value })}
					className="min-h-32 font-mono"
				/>
			</div>
		</InspectorSection>
	);
}

function ManualStartComposer({
	factoryId,
	orgHandle,
	node,
}: {
	factoryId: string;
	orgHandle: string;
	node: WorkflowNode;
}) {
	const router = useRouter();
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

		if (!trimmedMessage || isStarting) {
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
			const response = await fetch(
				`/api/factories/${factoryId}/floor/manual-starts/${node.id}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${user.refresh_token}`,
					},
					body: JSON.stringify({
						taskId,
						input: {
							message: trimmedMessage,
							images,
						},
						images,
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
			router.push(`/${orgHandle}/factories/${factoryId}/tasks/${taskId}`);
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
		<InspectorSection title="Manual start">
			<fieldset
				aria-label="Manual workflow start composer"
				className={cn(
					"flex min-w-0 flex-col gap-2 rounded-md border border-grayscale-4 bg-grayscale-1 p-2 transition-colors",
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
						disabled={!message.trim() || isStarting}
					>
						<PlayCircleIcon weight="bold" className="size-4" />
						{isStarting ? "Starting" : "Start"}
					</Button>
				</div>
			</fieldset>
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
						className="rounded-md border border-grayscale-4 bg-grayscale-2 p-2"
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
		<section className="flex flex-col gap-2 rounded-lg border border-grayscale-4 bg-grayscale-2 p-3">
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
		case "agentRun":
			return <PlayCircleIcon weight="bold" className={className} />;
		case "httpRequest":
			return <PaperPlaneTiltIcon weight="bold" className={className} />;
		case "conditionalRouter":
			return <GitBranchIcon weight="bold" className={className} />;
		case "completeTask":
			return <FlowArrowIcon weight="bold" className={className} />;
	}
};

const compareFloorChangeProposals = (
	first: FloorChangeProposal,
	second: FloorChangeProposal,
) => getProposalTime(second) - getProposalTime(first);

const getProposalTime = (proposal: FloorChangeProposal) => {
	const timestamp = proposal.createdAt;

	if (!timestamp) {
		return 0;
	}

	const time = new Date(timestamp).getTime();
	return Number.isNaN(time) ? 0 : time;
};

const formatProposalTimestamp = (value: unknown) => {
	if (!value) {
		return "Pending";
	}

	const date = new Date(String(value));

	if (Number.isNaN(date.getTime())) {
		return "Pending";
	}

	return date.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
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
			label: node.data.label || "Agent Run",
			prompt: "Use the human input:\n\n{{input.message}}",
			responseSchema: '{\n  "type": "object",\n  "properties": {}\n}',
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

const withCurrentNodePositions = (
	workflow: FloorWorkflow,
	currentNodes: WorkflowNode[],
): FloorWorkflow => {
	const positionsByNodeId = new Map(
		currentNodes.map((node) => [node.id, node.position]),
	);

	return {
		nodes: workflow.nodes.map((node) => {
			const position = positionsByNodeId.get(node.id);

			return position
				? {
						...node,
						position: { ...position },
					}
				: node;
		}),
		edges: workflow.edges,
	};
};

const withAcceptedLayoutPositions = (
	workflow: FloorWorkflow,
	acceptedWorkflow: FloorWorkflow | undefined,
): FloorWorkflow =>
	acceptedWorkflow
		? withCurrentNodePositions(workflow, acceptedWorkflow.nodes)
		: workflow;

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

const hasCompletedPositionChange = (
	changes: Array<{ type: string; dragging?: boolean }>,
) =>
	changes.some(
		(change) => change.type === "position" && change.dragging !== true,
	);

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
	value === "agentRun" ||
	value === "httpRequest" ||
	value === "conditionalRouter" ||
	value === "completeTask";

const isLegacyWorkflowBlockType = (
	value: unknown,
): value is LegacyWorkflowBlockType =>
	isWorkflowBlockType(value) || value === "humanInput";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
