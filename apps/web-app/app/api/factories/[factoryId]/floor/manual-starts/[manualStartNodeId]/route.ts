import db, { id } from "@repo/db/admin";
import { type NextRequest, NextResponse } from "next/server";
import { getAgentDefaultOptions } from "@/codex-options";

type RouteContext = {
	params: Promise<{
		factoryId: string;
		manualStartNodeId: string;
	}>;
};

type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		label?: string;
		prompt?: string;
		agentId?: string;
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

type AuthenticatedFactory = {
	id: string;
	floorWorkflow?: {
		nodes?: WorkflowNode[];
		edges?: WorkflowEdge[];
	};
	organisation?: {
		agents?: Agent[];
		members?: Array<{
			user?: {
				id: string;
			};
		}>;
	};
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

export async function POST(req: NextRequest, context: RouteContext) {
	const { factoryId, manualStartNodeId } = await context.params;
	const body = await readJson(req);
	const input = isRecord(body.input) ? body.input : {};
	const message = getOptionalString(input.message);

	if (!message) {
		return NextResponse.json(
			{ message: "input.message is required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateFactoryRequest(req, factoryId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const manualStartNode = authResult.factory.floorWorkflow?.nodes?.find(
		(node) =>
			node.id === manualStartNodeId && node.data?.blockType === "manualStart",
	);

	if (!manualStartNode) {
		return NextResponse.json(
			{ message: "Manual start block not found" },
			{ status: 404 },
		);
	}

	const agentRunNode = findNextAgentRunNode(
		authResult.factory.floorWorkflow,
		manualStartNodeId,
	);

	if (!agentRunNode) {
		return NextResponse.json(
			{ message: "Connect this Manual Start block to an Agent Run block." },
			{ status: 409 },
		);
	}

	const requestedAgentId = getOptionalString(agentRunNode.data?.agentId);
	const agent = resolveAgent(authResult.factory, requestedAgentId);

	if (!agent) {
		return NextResponse.json(
			{
				message: requestedAgentId
					? "Selected agent not found"
					: "No agent is configured for this organisation",
			},
			{ status: requestedAgentId ? 400 : 409 },
		);
	}

	const taskId = getOptionalString(body.taskId) ?? id();
	const manualStartedEventId = id();
	const newTaskEventId = id();
	const createdAt = new Date().toISOString();
	const name = `${manualStartNode.data?.label || "Manual workflow"} started`;
	const images = Array.isArray(body.images) ? body.images : [];
	const workflowInput = {
		...input,
		message,
		images,
	};
	const renderedPrompt = renderWorkflowTemplate(
		agentRunNode.data?.prompt || "Use the workflow input:\n\n{{input.message}}",
		workflowInput,
	);
	const instructions =
		renderedPrompt || buildManualStartFallbackInstructions(message, images);
	const agentDefaults = getAgentDefaultOptions(agent.settings);

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
			.link({ factory: authResult.factory.id, agent: agent.id }),
		eventTx(manualStartedEventId)
			.create({
				type: "factoryplane.workflow.manual_started",
				data: {
					factoryId: authResult.factory.id,
					taskId,
					manualStartNodeId,
					agentRunNodeId: agentRunNode.id,
					agentId: agent.id,
					input: workflowInput,
					images,
				},
				createdAt,
			})
			.link({ task: taskId }),
		eventTx(newTaskEventId)
			.create({
				type: "factoryplane.new_task",
				data: {
					taskId,
					name,
					instructions,
					images,
					workflow: {
						state: "agent_running",
						input: workflowInput,
						manualStartNodeId,
						agentRunNodeId: agentRunNode.id,
					},
				},
				createdAt,
			})
			.link({ task: taskId }),
	]);

	return NextResponse.json(
		{
			taskId,
			factoryId: authResult.factory.id,
			agentId: agent.id,
			workflowState: "agent_running",
		},
		{ status: 201 },
	);
}

const authenticateFactoryRequest = async (
	req: NextRequest,
	factoryId: string,
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

	const factory = await db
		.query({
			factories: {
				$: {
					where: {
						id: factoryId,
					},
				},
				organisation: {
					agents: {},
					members: {
						user: {},
					},
				},
			},
		})
		.then((result) => result.factories[0] as AuthenticatedFactory | undefined);

	if (!factory) {
		return {
			ok: false as const,
			status: 404,
			message: "Factory not found",
		};
	}

	if (!hasFactoryAccess(factory, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, factory };
};

const findNextAgentRunNode = (
	workflow: AuthenticatedFactory["floorWorkflow"],
	manualStartNodeId: string,
) => {
	const nodes = workflow?.nodes ?? [];
	const edge = (workflow?.edges ?? []).find(
		(currentEdge) =>
			currentEdge.source === manualStartNodeId &&
			(currentEdge.sourceHandle === undefined ||
				currentEdge.sourceHandle === null ||
				currentEdge.sourceHandle === "output") &&
			(currentEdge.targetHandle === undefined ||
				currentEdge.targetHandle === null ||
				currentEdge.targetHandle === "input"),
	);

	if (!edge?.target) {
		return undefined;
	}

	return nodes.find(
		(node) => node.id === edge.target && node.data?.blockType === "agentRun",
	);
};

const resolveAgent = (
	factory: AuthenticatedFactory,
	agentId: string | undefined,
) => {
	const agents = factory.organisation?.agents ?? [];
	return agentId ? agents.find((agent) => agent.id === agentId) : agents[0];
};

const buildManualStartFallbackInstructions = (
	message: string,
	images: unknown[],
) =>
	`Workflow manually started.\n\nInput:\n${message}${
		images.length > 0 ? `\n\nImages attached: ${images.length}` : ""
	}`;

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

const hasFactoryAccess = (factory: AuthenticatedFactory, userId: string) =>
	factory.organisation?.members?.some((member) => member.user?.id === userId) ??
	false;

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
