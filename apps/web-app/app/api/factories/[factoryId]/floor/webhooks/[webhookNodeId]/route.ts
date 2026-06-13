import db, { id } from "@repo/db/admin";
import { type NextRequest, NextResponse } from "next/server";

type RouteContext = {
	params: Promise<{
		factoryId: string;
		webhookNodeId: string;
	}>;
};

type WorkflowNode = {
	id: string;
	data?: {
		blockType?: string;
		label?: string;
		webhookSecret?: string;
	};
};

type FactoryWithWorkflow = {
	id: string;
	floorWorkflow?: {
		nodes?: WorkflowNode[];
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
	const { factoryId, webhookNodeId } = await context.params;
	const input = await readJson(req);
	const secret = getWebhookSecret(req, input);

	const factory = await db
		.query({
			factories: {
				$: {
					where: {
						id: factoryId,
					},
				},
			},
		})
		.then((result) => result.factories[0] as FactoryWithWorkflow | undefined);

	if (!factory) {
		return NextResponse.json({ message: "Factory not found" }, { status: 404 });
	}

	const webhookNode = factory.floorWorkflow?.nodes?.find(
		(node) => node.id === webhookNodeId && node.data?.blockType === "webhook",
	);

	if (!webhookNode?.data?.webhookSecret) {
		return NextResponse.json(
			{ message: "Webhook block not found" },
			{ status: 404 },
		);
	}

	if (secret !== webhookNode.data.webhookSecret) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const taskId = id();
	const eventId = id();
	const createdAt = new Date().toISOString();
	const name = `${webhookNode.data.label || "Workflow webhook"} received`;

	await db.transact([
		taskTx(taskId)
			.create({
				name,
				status: "waiting",
				instructions: buildWebhookInstructions(input),
				createdAt,
				workflowState: "webhook_received",
				workflowInput: input,
				workflowNodeId: webhookNodeId,
			})
			.link({ factory: factory.id }),
		eventTx(eventId)
			.create({
				type: "factoryplane.workflow.webhook_received",
				data: {
					factoryId: factory.id,
					taskId,
					webhookNodeId,
					input,
				},
				createdAt,
			})
			.link({ task: taskId }),
	]);

	return NextResponse.json(
		{
			taskId,
			factoryId: factory.id,
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
