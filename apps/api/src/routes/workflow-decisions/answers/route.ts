import db, { id } from "@repo/db/admin";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../lib/file-router.js";

type DecisionOption = {
	id: string;
	label?: string;
};

type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		options?: DecisionOption[];
	};
};

type WorkflowEdge = {
	source?: string;
	sourceHandle?: string | null;
	target?: string;
	targetHandle?: string | null;
};

type FloorWorkflow = {
	nodes?: WorkflowNode[];
	edges?: WorkflowEdge[];
};

type PendingAgentDecision = {
	questionId: string;
	workflowNodeId: string;
	agentSessionId?: string;
	options: DecisionOption[];
};

type AnswerDecisionBody = {
	questionId: string;
	answerId: string;
	additionalInformation?: unknown;
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

export const POST: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.workspace) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = parseAnswerDecisionBody(await readJson(c.req.json()));

	if (!body) {
		return c.json(
			{
				error:
					"Expected questionId and answerId. Optional: additionalInformation.",
			},
			400,
		);
	}

	const workflowInput = getWorkflowInput(task.workflowInput);
	const pendingDecision = getPendingAgentDecision(workflowInput);

	if (!pendingDecision || pendingDecision.questionId !== body.questionId) {
		return c.json({ error: "No matching pending decision question" }, 409);
	}

	const workflowSnapshot = workflowInput.workflowSnapshot;
	const workflow = parseFloorWorkflow(
		workflowSnapshot ?? task.workspace.floorWorkflow,
	);
	const decisionNode = workflow.nodes.find(
		(node) => node.id === pendingDecision.workflowNodeId,
	);

	if (decisionNode?.data?.blockType !== "agentDecision") {
		return c.json({ error: "Pending decision node was not found" }, 409);
	}

	const validOptions =
		decisionNode.data.options?.length && decisionNode.data.options.length > 0
			? decisionNode.data.options
			: pendingDecision.options;
	const selectedOption = validOptions.find(
		(option) => option.id === body.answerId,
	);

	if (!selectedOption) {
		return c.json({ error: "answerId is not a valid option" }, 400);
	}

	const edge = findWorkflowEdgeFromHandle(
		workflow,
		decisionNode.id,
		selectedOption.id,
	);

	if (!edge?.target) {
		return c.json(
			{ error: "Selected answer has no connected workflow edge" },
			409,
		);
	}

	const now = new Date().toISOString();
	const nextWorkflowInput: Record<string, unknown> = {
		...workflowInput,
		decision: {
			questionId: pendingDecision.questionId,
			workflowNodeId: pendingDecision.workflowNodeId,
			route: selectedOption.id,
			answerId: selectedOption.id,
			answerLabel: selectedOption.label,
			additionalInformation: body.additionalInformation,
			answeredAt: now,
		},
	};
	delete nextWorkflowInput.pendingAgentDecision;

	const eventId = id();
	const eventTransaction = eventTx(eventId).create({
		type: "chaterface.workflow.decision_answered",
		data: {
			taskId: task.id,
			workflowNodeId: pendingDecision.workflowNodeId,
			agentSessionId: pendingDecision.agentSessionId,
			questionId: pendingDecision.questionId,
			answerId: selectedOption.id,
			answerLabel: selectedOption.label,
			additionalInformation: body.additionalInformation,
			nextNodeId: edge.target,
		},
		createdAt: now,
	});

	await db.transact([
		taskTx(task.id).update({
			status: "idle",
			workflowState: "decision_answered",
			workflowNodeId: pendingDecision.workflowNodeId,
			workflowInput: nextWorkflowInput,
		}),
		eventTransaction.link(
			pendingDecision.agentSessionId
				? { task: task.id, agentSession: pendingDecision.agentSessionId }
				: { task: task.id },
		),
	]);

	return c.json({
		status: "accepted",
		questionId: pendingDecision.questionId,
		answerId: selectedOption.id,
		nextNodeId: edge.target,
	});
};

const parseAnswerDecisionBody = (
	value: unknown,
): AnswerDecisionBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const questionId = getOptionalString(value.questionId);
	const answerId = getOptionalString(value.answerId);

	if (!questionId || !answerId) {
		return undefined;
	}

	return {
		questionId,
		answerId,
		additionalInformation: value.additionalInformation,
	};
};

const getPendingAgentDecision = (
	input: Record<string, unknown>,
): PendingAgentDecision | undefined => {
	const value = input.pendingAgentDecision;

	if (
		!isRecord(value) ||
		typeof value.questionId !== "string" ||
		typeof value.workflowNodeId !== "string" ||
		!Array.isArray(value.options)
	) {
		return undefined;
	}

	return {
		questionId: value.questionId,
		workflowNodeId: value.workflowNodeId,
		agentSessionId:
			typeof value.agentSessionId === "string"
				? value.agentSessionId
				: undefined,
		options: value.options.filter(isDecisionOption),
	};
};

const getWorkflowInput = (value: unknown): Record<string, unknown> =>
	isRecord(value) ? value : {};

const parseFloorWorkflow = (value: unknown): Required<FloorWorkflow> => {
	if (!isRecord(value)) {
		return { nodes: [], edges: [] };
	}

	return {
		nodes: Array.isArray(value.nodes) ? value.nodes.filter(isWorkflowNode) : [],
		edges: Array.isArray(value.edges) ? value.edges.filter(isWorkflowEdge) : [],
	};
};

const findWorkflowEdgeFromHandle = (
	workflow: Required<FloorWorkflow>,
	sourceNodeId: string,
	sourceHandle: string,
) =>
	workflow.edges.find(
		(currentEdge) =>
			currentEdge.source === sourceNodeId &&
			(currentEdge.sourceHandle === undefined ||
				currentEdge.sourceHandle === null ||
				currentEdge.sourceHandle === sourceHandle) &&
			(currentEdge.targetHandle === undefined ||
				currentEdge.targetHandle === null ||
				currentEdge.targetHandle === "input"),
	);

const isWorkflowNode = (value: unknown): value is WorkflowNode =>
	isRecord(value) && typeof value.id === "string";

const isWorkflowEdge = (value: unknown): value is WorkflowEdge =>
	isRecord(value) &&
	(typeof value.source === "string" || value.source === undefined) &&
	(typeof value.target === "string" || value.target === undefined);

const isDecisionOption = (value: unknown): value is DecisionOption =>
	isRecord(value) && typeof value.id === "string";

const getOptionalString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readJson = async (value: Promise<unknown>) => {
	try {
		return await value;
	} catch {
		return undefined;
	}
};
