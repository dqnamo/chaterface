import db, { id } from "@repo/db/admin";
import {
	getBearerToken,
	getTaskForAgentToken,
} from "../../../lib/agent-auth.js";
import type { RouteHandler } from "../../../lib/file-router.js";

type FloorWorkflow = {
	nodes: unknown[];
	edges: unknown[];
};

type CreateFloorProposalBody = {
	title: string;
	summary?: string;
	workflow: FloorWorkflow;
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

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export const POST: RouteHandler = async (c) => {
	const body = parseCreateFloorProposalBody(await c.req.json());

	if (!body) {
		return c.json(
			{
				error:
					"Expected workflow with nodes and edges, plus optional title and summary",
			},
			400,
		);
	}

	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const task = await getTaskForAgentToken(token);

	if (!task?.factory) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const proposalId = id();
	const createdAt = new Date().toISOString();

	await db.transact([
		floorChangeProposalTx(proposalId)
			.create({
				title: body.title,
				summary: body.summary,
				workflow: body.workflow,
				status: "pending",
				createdAt,
			})
			.link({ factory: task.factory.id, task: task.id }),
		eventTx(id())
			.create({
				type: "factoryplane.floor_change_proposed",
				data: {
					proposalId,
					title: body.title,
					summary: body.summary,
				},
				createdAt,
			})
			.link({ task: task.id }),
	]);

	return c.json(
		{
			proposalId,
			status: "pending",
			title: body.title,
			summary: body.summary,
		},
		201,
	);
};

const parseCreateFloorProposalBody = (
	value: unknown,
): CreateFloorProposalBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const workflow = parseWorkflow(value.workflow);

	if (!workflow) {
		return undefined;
	}

	return {
		title: getOptionalString(value.title) ?? "Factory floor change",
		summary: getOptionalString(value.summary),
		workflow,
	};
};

const parseWorkflow = (value: unknown): FloorWorkflow | undefined => {
	if (
		!isRecord(value) ||
		!Array.isArray(value.nodes) ||
		!Array.isArray(value.edges)
	) {
		return undefined;
	}

	return {
		nodes: value.nodes,
		edges: value.edges,
	};
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
