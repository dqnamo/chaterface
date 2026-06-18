import { type NextRequest, NextResponse } from "next/server";
import { getAgentDefaultOptions } from "@/codex-options";
import db, { id } from "@/instant.admin";

type RouteContext = {
	params: Promise<{
		workspaceId: string;
		manualStartNodeId: string;
	}>;
};

type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		label?: string;
		prompt?: string;
		instruction?: string;
		agentId?: string;
		sessionKey?: string;
	};
};

type WorkflowEdge = {
	source?: string;
	sourceHandle?: string | null;
	target?: string;
	targetHandle?: string | null;
};

type Agent = {
	id: string;
	settings?: unknown;
};

type WorkspaceAgent = {
	id: string;
	name?: string;
	settings?: unknown;
	agent?: Agent;
};

type AuthenticatedWorkspace = {
	id: string;
	floorWorkflow?: {
		nodes?: WorkflowNode[];
		edges?: WorkflowEdge[];
	};
	workspaceAgents?: WorkspaceAgent[];
	members?: Array<{
		user?: {
			id: string;
		};
	}>;
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

export async function POST(req: NextRequest, context: RouteContext) {
	const { workspaceId, manualStartNodeId } = await context.params;
	const body = await readJson(req);
	const input = isRecord(body.input) ? body.input : {};
	const images = Array.isArray(body.images) ? body.images : [];
	const message =
		getOptionalString(input.message) || buildAttachmentOnlyMessage(images);

	if (!message) {
		return NextResponse.json(
			{ message: "input.message or attached files are required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const workflow =
		parseWorkflow(body.workflow) ?? authResult.workspace.floorWorkflow;
	const startNode = workflow?.nodes?.find(
		(node) =>
			node.id === manualStartNodeId &&
			(node.data?.blockType === "instruction" ||
				node.data?.blockType === "manualStart"),
	);

	if (!startNode) {
		return NextResponse.json(
			{ message: "Workflow start block not found" },
			{ status: 404 },
		);
	}

	const workflowInput = {
		...input,
		message,
		images,
		workflowSnapshot: workflow,
	};
	const start = findNextAgentRunStart(
		workflow,
		manualStartNodeId,
		workflowInput,
		startNode,
	);

	if (!start) {
		return NextResponse.json(
			{ message: "Connect this Instruction block to an Agent Session block." },
			{ status: 409 },
		);
	}

	const { agentRunNode, prompt } = start;
	const requestedAgentId = getOptionalString(agentRunNode.data?.agentId);
	const workspaceAgent = resolveWorkspaceAgent(
		authResult.workspace,
		requestedAgentId,
	);
	const agent = workspaceAgent?.agent;

	if (!agent) {
		return NextResponse.json(
			{
				message: requestedAgentId
					? "Selected agent not found"
					: "No agent is configured for this workspace",
			},
			{ status: requestedAgentId ? 400 : 409 },
		);
	}

	const taskId = getOptionalString(body.taskId) ?? id();
	const agentSessionId = id();
	const manualStartedEventId = id();
	const newTaskEventId = id();
	const createdAt = new Date().toISOString();
	const name = `${startNode.data?.label || "Workflow"} started`;
	const instructions =
		prompt || buildManualStartFallbackInstructions(message, images);
	const agentDefaults = getAgentDefaultOptions(workspaceAgent.settings);
	const workflowSessionKey = getWorkflowSessionKey(agentRunNode);

	await db.transact([
		taskTx(taskId)
			.create({
				name,
				status: "in_progress",
				instructions,
				createdAt,
				agentModel: agentDefaults.agentModel,
				agentReasoningEffort: agentDefaults.agentReasoningEffort,
				agentSpeed: agentDefaults.agentSpeed,
				workflowState: "agent_running",
				workflowInput,
				workflowNodeId: agentRunNode.id,
			})
			.link({
				workspace: authResult.workspace.id,
				workspaceAgent: workspaceAgent.id,
				agent: agent.id,
			}),
		agentSessionTx(agentSessionId)
			.create({
				name: getAgentSessionName(workflowSessionKey),
				status: "running",
				createdAt,
				updatedAt: createdAt,
				workflowNodeId: agentRunNode.id,
				workflowSessionKey,
			})
			.link({ task: taskId, agent: agent.id }),
		eventTx(manualStartedEventId)
			.create({
				type: "chaterface.workflow.manual_started",
				data: {
					workspaceId: authResult.workspace.id,
					taskId,
					startNodeId: manualStartNodeId,
					agentRunNodeId: agentRunNode.id,
					agentId: agent.id,
					workspaceAgentId: workspaceAgent.id,
					sessionKey: workflowSessionKey,
					input: workflowInput,
					images,
				},
				createdAt,
			})
			.link({ task: taskId, agentSession: agentSessionId }),
		eventTx(newTaskEventId)
			.create({
				type: "chaterface.new_task",
				data: {
					taskId,
					name,
					instructions,
					images,
					workflow: {
						state: "agent_running",
						input: workflowInput,
						startNodeId: manualStartNodeId,
						agentRunNodeId: agentRunNode.id,
						sessionKey: workflowSessionKey,
					},
				},
				createdAt,
			})
			.link({ task: taskId, agentSession: agentSessionId }),
	]);

	return NextResponse.json(
		{
			taskId,
			workspaceId: authResult.workspace.id,
			agentId: agent.id,
			workspaceAgentId: workspaceAgent.id,
			agentSessionId,
			workflowState: "agent_running",
		},
		{ status: 201 },
	);
}

const authenticateWorkspaceRequest = async (
	req: NextRequest,
	workspaceId: string,
) => {
	const refreshToken = getBearerToken(req.headers.get("Authorization"));

	if (!refreshToken) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const user = await db.auth.verifyToken(refreshToken).catch(() => undefined);

	if (!user) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const workspace = await db
		.query({
			workspaces: {
				$: {
					where: {
						id: workspaceId,
					},
				},
				workspaceAgents: {
					$: {
						fields: ["name", "settings"],
					},
					agent: {
						$: {
							fields: ["name", "settings"],
						},
					},
				},
				members: {
					user: {},
				},
			},
		})
		.then(
			(result) => result.workspaces?.[0] as AuthenticatedWorkspace | undefined,
		);

	if (!workspace) {
		return {
			ok: false as const,
			status: 404,
			message: "Workspace not found",
		};
	}

	if (!hasWorkspaceAccess(workspace, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, workspace };
};

const getWorkflowSessionKey = (agentRunNode: WorkflowNode) =>
	getOptionalString(agentRunNode.data?.sessionKey) ?? agentRunNode.id;

const getAgentSessionName = (sessionKey: string) =>
	`Agent conversation ${sessionKey}`;

const findNextAgentRunStart = (
	workflow: AuthenticatedWorkspace["floorWorkflow"],
	manualStartNodeId: string,
	input: Record<string, unknown>,
	startNode: WorkflowNode,
) => {
	const nodes = workflow?.nodes ?? [];
	let currentNodeId = manualStartNodeId;
	let prompt =
		startNode.data?.blockType === "instruction"
			? renderWorkflowTemplate(
					startNode.data.instruction ||
						startNode.data.prompt ||
						"Use the workflow input:\n\n{{input.message}}",
					input,
				)
			: undefined;
	const visitedNodeIds = new Set<string>();

	while (!visitedNodeIds.has(currentNodeId)) {
		visitedNodeIds.add(currentNodeId);
		const edge = findWorkflowEdgeFromHandle(workflow, currentNodeId, "output");

		if (!edge?.target) {
			return undefined;
		}

		const node = nodes.find((current) => current.id === edge.target);

		if (!node) {
			return undefined;
		}

		if (node.data?.blockType === "instruction") {
			prompt =
				renderWorkflowTemplate(
					node.data.instruction ||
						node.data.prompt ||
						"Use the workflow input:\n\n{{input.message}}",
					input,
				) || prompt;
			currentNodeId = node.id;
			continue;
		}

		if (node.data?.blockType === "agentRun") {
			return {
				agentRunNode: node,
				prompt:
					prompt ||
					renderWorkflowTemplate(
						node.data.prompt || "Use the workflow input:\n\n{{input.message}}",
						input,
					),
			};
		}

		return undefined;
	}

	return undefined;
};

const findWorkflowEdgeFromHandle = (
	workflow: AuthenticatedWorkspace["floorWorkflow"],
	sourceNodeId: string,
	sourceHandle: string,
) =>
	(workflow?.edges ?? []).find(
		(currentEdge) =>
			currentEdge.source === sourceNodeId &&
			(currentEdge.sourceHandle === undefined ||
				currentEdge.sourceHandle === null ||
				currentEdge.sourceHandle === sourceHandle) &&
			(currentEdge.targetHandle === undefined ||
				currentEdge.targetHandle === null ||
				currentEdge.targetHandle === "input"),
	);

const parseWorkflow = (
	value: unknown,
): AuthenticatedWorkspace["floorWorkflow"] => {
	if (!isRecord(value)) {
		return undefined;
	}

	return {
		nodes: Array.isArray(value.nodes) ? value.nodes.filter(isWorkflowNode) : [],
		edges: Array.isArray(value.edges) ? value.edges.filter(isWorkflowEdge) : [],
	};
};

const isWorkflowNode = (value: unknown): value is WorkflowNode =>
	isRecord(value) && typeof value.id === "string";

const isWorkflowEdge = (value: unknown): value is WorkflowEdge =>
	isRecord(value) &&
	(typeof value.source === "string" || value.source === undefined) &&
	(typeof value.target === "string" || value.target === undefined);

const resolveWorkspaceAgent = (
	workspace: AuthenticatedWorkspace,
	agentId: string | undefined,
) => {
	const workspaceAgents = workspace.workspaceAgents ?? [];
	return agentId
		? workspaceAgents.find(
				(workspaceAgent) =>
					workspaceAgent.id === agentId || workspaceAgent.agent?.id === agentId,
			)
		: workspaceAgents[0];
};

const buildManualStartFallbackInstructions = (
	message: string,
	images: unknown[],
) =>
	`Workflow manually started.\n\nInput:\n${message}${
		images.length > 0 ? `\n\nImages attached: ${images.length}` : ""
	}`;

const buildAttachmentOnlyMessage = (attachments: unknown[]) => {
	if (attachments.length === 0) {
		return undefined;
	}

	const names = attachments.flatMap((attachment) => {
		if (!isRecord(attachment)) {
			return [];
		}

		const name = getOptionalString(attachment.name);
		return name ? [name] : [];
	});

	if (names.length === 0) {
		return "Use the attached file input.";
	}

	return [
		"Use the attached file input.",
		"",
		"Attached files:",
		...names.map((name) => `- ${name}`),
	].join("\n");
};

const renderWorkflowTemplate = (
	template: string,
	input: Record<string, unknown>,
) =>
	template
		.replace(/\{\{\s*input(?:\.([a-zA-Z0-9_-]+))?\s*\}\}/g, (_, key) => {
			const value = typeof key === "string" ? input[key] : input;
			return stringifyTemplateValue(value);
		})
		.trim();

const stringifyTemplateValue = (value: unknown) => {
	if (value === undefined || value === null) {
		return "";
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	return JSON.stringify(value, null, 2) ?? "";
};

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const hasWorkspaceAccess = (
	workspace: AuthenticatedWorkspace,
	userId: string,
) => workspace.members?.some((member) => member.user?.id === userId) ?? false;

const readJson = async (req: NextRequest) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
