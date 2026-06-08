import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../lib/agent-auth.js";
import { getFactoryForApiKey } from "../../lib/factory-api-key-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";

const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_REASONING_EFFORT = "medium";
const DEFAULT_CODEX_SPEED = "standard";

type CreateTaskBody = {
	name: string;
	instructions?: string;
	factoryId?: string;
	agentId?: string;
	agentModel: string;
	agentReasoningEffort: string;
	agentSpeed: string;
};

type Agent = {
	id: string;
};

type FactoryWithAgents = {
	organisation?: {
		agents?: Agent[];
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

export const POST: RouteHandler = async (c) => {
	const token = getBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const authResult = await getFactoryForApiKey(token);

	if (!authResult) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = parseCreateTaskBody(await readJson(c.req.json()));

	if (!body) {
		return c.json(
			{
				error:
					"Expected name or instructions when creating a task. Optional fields: factoryId, agentId, agentModel, agentReasoningEffort, agentSpeed.",
			},
			400,
		);
	}

	if (body.factoryId && body.factoryId !== authResult.factoryId) {
		return c.json({ error: "API key is not scoped to this factory" }, 403);
	}

	const agent = await resolveAgent(authResult.factoryId, body.agentId);

	if (!agent) {
		return c.json(
			{
				error: body.agentId
					? "Agent not found"
					: "No agent is configured for task creation",
			},
			body.agentId ? 400 : 409,
		);
	}

	const taskId = id();
	const eventId = id();
	const createdAt = new Date().toISOString();

	await db.transact([
		taskTx(taskId)
			.create({
				name: body.name,
				status: "in_progress",
				instructions: body.instructions,
				createdAt,
				agentModel: body.agentModel,
				agentReasoningEffort: body.agentReasoningEffort,
				agentSpeed: body.agentSpeed,
			})
			.link({ factory: authResult.factoryId, agent: agent.id }),
		eventTx(eventId)
			.create({
				type: "factoryplane.new_task",
				data: {
					taskId,
					apiKeyId: authResult.apiKeyId,
				},
				createdAt,
			})
			.link({ task: taskId }),
	]);

	return c.json(
		{
			taskId,
			factoryId: authResult.factoryId,
			agentId: agent.id,
			status: "in_progress",
		},
		201,
	);
};

const parseCreateTaskBody = (value: unknown): CreateTaskBody | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}

	const instructions = getOptionalString(value.instructions);
	const providedName = getOptionalString(value.name);
	const name = providedName ?? getFallbackTaskName(instructions);

	if (!name) {
		return undefined;
	}

	return {
		name,
		instructions,
		factoryId: getOptionalString(value.factoryId),
		agentId: getOptionalString(value.agentId),
		agentModel: getOptionalString(value.agentModel) ?? DEFAULT_CODEX_MODEL,
		agentReasoningEffort:
			getOptionalString(value.agentReasoningEffort) ??
			DEFAULT_CODEX_REASONING_EFFORT,
		agentSpeed: getOptionalString(value.agentSpeed) ?? DEFAULT_CODEX_SPEED,
	};
};

const resolveAgent = async (factoryId: string, agentId: string | undefined) => {
	const agents = await db
		.query({
			factories: {
				$: {
					where: {
						id: factoryId,
					},
				},
				organisation: {
					agents: {},
				},
			},
		})
		.then((result) => {
			const factory = result.factories[0] as FactoryWithAgents | undefined;
			return factory?.organisation?.agents ?? [];
		});

	return agentId ? agents.find((agent) => agent.id === agentId) : agents[0];
};

const getFallbackTaskName = (instructions: string | undefined) => {
	if (!instructions) {
		return undefined;
	}

	const firstLine = instructions.split("\n")[0] ?? "";
	const normalized = firstLine.trim().replace(/\s+/g, " ");

	if (!normalized) {
		return undefined;
	}

	return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

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
