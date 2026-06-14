import db, { id } from "@/instant.admin";
import { type NextRequest, NextResponse } from "next/server";

type RouteContext = {
	params: Promise<{
		webhookId: string;
	}>;
};

type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		label?: string;
		webhookId?: string;
	};
};

type FactoryWithWorkflow = {
	id: string;
	floorWorkflow?: {
		nodes?: WorkflowNode[];
	};
};

type WorkflowWebhook = {
	id: string;
	name?: string;
	publicId?: string;
	nodeId?: string;
	secret?: string;
	enabled?: boolean;
	factory?: FactoryWithWorkflow;
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

const webhookTx = (webhookId: string) => {
	const tx = db.tx.webhooks[webhookId];

	if (!tx) {
		throw new Error(`Webhook transaction builder ${webhookId} not found`);
	}

	return tx;
};

export async function POST(req: NextRequest, context: RouteContext) {
	const { webhookId } = await context.params;
	const input = await readJson(req);
	const secret = getWebhookSecret(req, input);

	const webhook = await db
		.query({
			webhooks: {
				$: {
					where: {
						publicId: webhookId,
					},
				},
				factory: {},
			},
		})
		.then((result) => result.webhooks[0] as WorkflowWebhook | undefined);

	if (!webhook?.factory || webhook.enabled === false) {
		return NextResponse.json({ message: "Webhook not found" }, { status: 404 });
	}

	if (!webhook.secret || secret !== webhook.secret) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const webhookNode = webhook.factory.floorWorkflow?.nodes?.find(
		(node) =>
			node.id === webhook.nodeId &&
			node.data?.blockType === "webhook" &&
			node.data.webhookId === webhook.id,
	);

	if (!webhookNode) {
		return NextResponse.json({ message: "Webhook not found" }, { status: 404 });
	}

	const taskId = id();
	const eventId = id();
	const createdAt = new Date().toISOString();
	const name = `${webhook.name || webhookNode.data?.label || "Workflow webhook"} received`;

	await db.transact([
		taskTx(taskId)
			.create({
				name,
				status: "waiting",
				instructions: buildWebhookInstructions(input),
				createdAt,
				workflowState: "webhook_received",
				workflowInput: input,
				workflowNodeId: webhookNode.id,
			})
			.link({ factory: webhook.factory.id }),
		eventTx(eventId)
			.create({
				type: "factoryplane.workflow.webhook_received",
				data: {
					factoryId: webhook.factory.id,
					taskId,
					webhookId: webhook.id,
					webhookNodeId: webhookNode.id,
					input,
				},
				createdAt,
			})
			.link({ task: taskId }),
		webhookTx(webhook.id).update({
			lastTriggeredAt: createdAt,
			updatedAt: createdAt,
		}),
	]);

	return NextResponse.json(
		{
			taskId,
			factoryId: webhook.factory.id,
			webhookId: webhook.id,
			workflowState: "webhook_received",
		},
		{ status: 201 },
	);
}

const getWebhookSecret = (req: NextRequest, body: Record<string, unknown>) => {
	const headerSecret = req.headers.get("x-factoryplane-webhook-secret");

	if (headerSecret) {
		return headerSecret;
	}

	const [scheme, token] = req.headers.get("authorization")?.split(" ") ?? [];

	if (scheme === "Bearer" && token) {
		return token;
	}

	return typeof body.secret === "string" ? body.secret : undefined;
};

const buildWebhookInstructions = (input: Record<string, unknown>) =>
	`Workflow webhook received.\n\nInput:\n${JSON.stringify(input, null, 2)}`;

const readJson = async (req: NextRequest) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
