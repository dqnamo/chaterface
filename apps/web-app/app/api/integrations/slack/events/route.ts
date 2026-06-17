import { type NextRequest, NextResponse } from "next/server";
import { getAgentDefaultOptions } from "@/codex-options";
import db, { id } from "@/instant.admin";
import {
	getSlackSigningSecret,
	SLACK_MESSAGE_RECEIVED_TRIGGER,
	SLACK_PROVIDER,
	verifySlackSignature,
} from "@/integrations/slack";

export const runtime = "nodejs";

type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		provider?: string;
		trigger?: string;
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

type FloorWorkflow = {
	nodes?: WorkflowNode[];
	edges?: WorkflowEdge[];
};

type Agent = {
	id: string;
	settings?: unknown;
};

type Subscription = {
	id: string;
	nodeId?: string;
	externalId?: string;
	enabled?: boolean;
	integrationConnection?: {
		id: string;
		externalId?: string;
	};
	workspace?: {
		id: string;
		floorWorkflow?: FloorWorkflow;
		agents?: Agent[];
	};
};

type SlackEventEnvelope = {
	type?: string;
	challenge?: string;
	team_id?: string;
	event_id?: string;
	event?: {
		type?: string;
		subtype?: string;
		channel?: string;
		user?: string;
		text?: string;
		ts?: string;
		thread_ts?: string;
		bot_id?: string;
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

const agentSessionTx = (agentSessionId: string) => {
	const tx = db.tx.agentSessions[agentSessionId];

	if (!tx) {
		throw new Error(
			`Agent session transaction builder ${agentSessionId} not found`,
		);
	}

	return tx;
};

const eventReceiptTx = (receiptId: string) => {
	const tx = db.tx.integrationEventReceipts[receiptId];

	if (!tx) {
		throw new Error(`Integration event receipt ${receiptId} not found`);
	}

	return tx;
};

const triggerSubscriptionTx = (subscriptionId: string) => {
	const tx = db.tx.integrationTriggerSubscriptions[subscriptionId];

	if (!tx) {
		throw new Error(
			`Integration trigger subscription ${subscriptionId} not found`,
		);
	}

	return tx;
};

export async function POST(req: NextRequest) {
	const rawBody = await req.text();

	try {
		const signingSecret = getSlackSigningSecret();
		const verified = verifySlackSignature({
			rawBody,
			timestamp: req.headers.get("x-slack-request-timestamp"),
			signature: req.headers.get("x-slack-signature"),
			signingSecret,
		});

		if (!verified) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
		}
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? error.message
						: "Slack signing secret is not configured.",
			},
			{ status: 500 },
		);
	}

	const envelope = parseSlackEventEnvelope(rawBody);

	if (!envelope) {
		return NextResponse.json(
			{ message: "Invalid Slack event" },
			{ status: 400 },
		);
	}

	if (envelope.type === "url_verification" && envelope.challenge) {
		return new NextResponse(envelope.challenge, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	if (envelope.type !== "event_callback") {
		return NextResponse.json({ ok: true });
	}

	const slackEvent = envelope.event;

	if (
		!envelope.team_id ||
		!envelope.event_id ||
		!slackEvent ||
		slackEvent.type !== "message" ||
		!slackEvent.channel ||
		!slackEvent.ts ||
		slackEvent.bot_id ||
		slackEvent.subtype
	) {
		return NextResponse.json({ ok: true });
	}

	const externalEventId = `${SLACK_PROVIDER}:${envelope.event_id}`;
	const existingReceipt = await getEventReceipt(externalEventId);

	if (existingReceipt) {
		return NextResponse.json({ ok: true, duplicate: true });
	}

	const subscriptions = await getMatchingSubscriptions(
		envelope.team_id,
		slackEvent.channel,
	);
	const now = new Date().toISOString();

	if (subscriptions[0]?.integrationConnection?.id) {
		await db.transact(
			eventReceiptTx(id())
				.create({
					provider: SLACK_PROVIDER,
					externalEventId,
					receivedAt: now,
				})
				.link({
					integrationConnection: subscriptions[0].integrationConnection.id,
				}),
		);
	}

	await Promise.all(
		subscriptions.map((subscription) =>
			startWorkflowForSubscription(subscription, envelope, slackEvent),
		),
	);

	return NextResponse.json({ ok: true });
}

const getEventReceipt = async (externalEventId: string) =>
	db
		.query({
			integrationEventReceipts: {
				$: {
					where: {
						externalEventId,
					},
				},
			},
		})
		.then((result) => result.integrationEventReceipts[0]);

const getMatchingSubscriptions = async (teamId: string, channelId: string) => {
	const subscriptions = await db
		.query({
			integrationTriggerSubscriptions: {
				$: {
					where: {
						provider: SLACK_PROVIDER,
						trigger: SLACK_MESSAGE_RECEIVED_TRIGGER,
						externalId: channelId,
					},
				},
				integrationConnection: {},
				workspace: {
					agents: {},
				},
			},
		})
		.then((result) => result.integrationTriggerSubscriptions as Subscription[]);

	return subscriptions.filter(
		(subscription) =>
			subscription.enabled !== false &&
			subscription.integrationConnection?.externalId === teamId,
	);
};

const startWorkflowForSubscription = async (
	subscription: Subscription,
	envelope: SlackEventEnvelope,
	slackEvent: NonNullable<SlackEventEnvelope["event"]>,
) => {
	const workspace = subscription.workspace;
	const workflow = parseWorkflow(workspace?.floorWorkflow);
	const triggerNode = workflow.nodes.find(
		(node) =>
			node.id === subscription.nodeId &&
			node.data?.blockType === "integrationTrigger" &&
			node.data.provider === SLACK_PROVIDER &&
			node.data.trigger === SLACK_MESSAGE_RECEIVED_TRIGGER,
	);

	if (!workspace || !triggerNode) {
		return;
	}

	const text = slackEvent.text ?? "";
	const workflowInput = {
		message: text,
		integration: {
			provider: SLACK_PROVIDER,
			trigger: SLACK_MESSAGE_RECEIVED_TRIGGER,
			connectionId: subscription.integrationConnection?.id,
			subscriptionId: subscription.id,
			receivedAt: new Date().toISOString(),
		},
		slack: {
			teamId: envelope.team_id,
			channelId: slackEvent.channel,
			userId: slackEvent.user,
			text,
			ts: slackEvent.ts,
			threadTs: slackEvent.thread_ts,
			eventId: envelope.event_id,
		},
		workflowSnapshot: workflow,
	};
	const start = findNextAgentRunStart(
		workflow,
		triggerNode.id,
		workflowInput,
		triggerNode,
	);

	if (!start) {
		return;
	}

	const requestedAgentId = getOptionalString(start.agentRunNode.data?.agentId);
	const agent = resolveAgent(workspace, requestedAgentId);

	if (!agent) {
		return;
	}

	const taskId = id();
	const agentSessionId = id();
	const triggerEventId = id();
	const newTaskEventId = id();
	const createdAt = new Date().toISOString();
	const workflowSessionKey = getWorkflowSessionKey(start.agentRunNode);
	const name = `${triggerNode.data?.label || "Slack message"} received`;
	const instructions =
		start.prompt ||
		`Slack message received.\n\nInput:\n${JSON.stringify(workflowInput, null, 2)}`;
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
				workflowNodeId: start.agentRunNode.id,
			})
			.link({ workspace: workspace.id, agent: agent.id }),
		agentSessionTx(agentSessionId)
			.create({
				name: getAgentSessionName(workflowSessionKey),
				status: "idle",
				createdAt,
				updatedAt: createdAt,
				workflowNodeId: start.agentRunNode.id,
				workflowSessionKey,
			})
			.link({ task: taskId, agent: agent.id }),
		eventTx(triggerEventId)
			.create({
				type: "factoryplane.workflow.integration_triggered",
				data: {
					workspaceId: workspace.id,
					taskId,
					provider: SLACK_PROVIDER,
					trigger: SLACK_MESSAGE_RECEIVED_TRIGGER,
					connectionId: subscription.integrationConnection?.id,
					subscriptionId: subscription.id,
					triggerNodeId: triggerNode.id,
					agentRunNodeId: start.agentRunNode.id,
					input: workflowInput,
				},
				createdAt,
			})
			.link({ task: taskId, agentSession: agentSessionId }),
		eventTx(newTaskEventId)
			.create({
				type: "factoryplane.new_task",
				data: {
					taskId,
					name,
					instructions,
					workflow: {
						state: "agent_running",
						input: workflowInput,
						startNodeId: triggerNode.id,
						agentRunNodeId: start.agentRunNode.id,
						sessionKey: workflowSessionKey,
					},
				},
				createdAt,
			})
			.link({ task: taskId, agentSession: agentSessionId }),
		triggerSubscriptionTx(subscription.id).update({
			lastTriggeredAt: createdAt,
			updatedAt: createdAt,
		}),
	]);
};

const findNextAgentRunStart = (
	workflow: Required<FloorWorkflow>,
	startNodeId: string,
	input: Record<string, unknown>,
	startNode: WorkflowNode,
) => {
	const nodes = workflow.nodes;
	let currentNodeId = startNodeId;
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

const parseWorkflow = (value: unknown): Required<FloorWorkflow> => {
	if (!isRecord(value)) {
		return { nodes: [], edges: [] };
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

const resolveAgent = (
	workspace: NonNullable<Subscription["workspace"]>,
	agentId: string | undefined,
) => {
	const agents = workspace.agents ?? [];
	return agentId ? agents.find((agent) => agent.id === agentId) : agents[0];
};

const getWorkflowSessionKey = (agentRunNode: WorkflowNode) =>
	getOptionalString(agentRunNode.data?.sessionKey) ?? agentRunNode.id;

const getAgentSessionName = (sessionKey: string) =>
	`Agent conversation ${sessionKey}`;

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

const parseSlackEventEnvelope = (rawBody: string) => {
	try {
		const value = JSON.parse(rawBody) as unknown;
		return isRecord(value) ? (value as SlackEventEnvelope) : undefined;
	} catch {
		return undefined;
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
