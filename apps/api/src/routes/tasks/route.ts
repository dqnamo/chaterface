import db, { id } from "@repo/db/admin";
import { getBearerToken } from "../../lib/agent-auth.js";
import type { RouteHandler } from "../../lib/file-router.js";
import { getWorkspaceForApiKey } from "../../lib/workspace-api-key-auth.js";

const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_REASONING_EFFORT = "medium";
const DEFAULT_CODEX_SPEED = "standard";
const DEFAULT_TASK_NAMING_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_TASK_NAME = "New task";

type CreateTaskBody = {
	name?: string;
	instructions?: string;
	workspaceId?: string;
	agentId?: string;
	agentModel: string;
	agentReasoningEffort: string;
	agentSpeed: string;
};

type Agent = {
	id: string;
};

type WorkspaceWithAgents = {
	agents?: Agent[];
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

	const authResult = await getWorkspaceForApiKey(token);

	if (!authResult) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = parseCreateTaskBody(await readJson(c.req.json()));

	if (!body) {
		return c.json(
			{
				error:
					"Expected name or instructions when creating a task. Optional fields: workspaceId, agentId, agentModel, agentReasoningEffort, agentSpeed.",
			},
			400,
		);
	}

	if (body.workspaceId && body.workspaceId !== authResult.workspaceId) {
		return c.json({ error: "API key is not scoped to this workspace" }, 403);
	}

	const agent = await resolveAgent(authResult.workspaceId, body.agentId);

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
	const name = body.name ?? (await generateTaskName(body.instructions));

	await db.transact([
		taskTx(taskId)
			.create({
				name,
				status: "in_progress",
				instructions: body.instructions,
				createdAt,
				agentModel: body.agentModel,
				agentReasoningEffort: body.agentReasoningEffort,
				agentSpeed: body.agentSpeed,
			})
			.link({ workspace: authResult.workspaceId, agent: agent.id }),
		eventTx(eventId)
			.create({
				type: "chaterface.new_task",
				data: {
					taskId,
					apiKeyId: authResult.apiKeyId,
					name,
					instructions: body.instructions,
				},
				createdAt,
			})
			.link({ task: taskId }),
	]);

	return c.json(
		{
			taskId,
			workspaceId: authResult.workspaceId,
			agentId: agent.id,
			name,
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

	if (!providedName && !instructions) {
		return undefined;
	}

	return {
		name: providedName,
		instructions,
		workspaceId: getOptionalString(value.workspaceId),
		agentId: getOptionalString(value.agentId),
		agentModel: getOptionalString(value.agentModel) ?? DEFAULT_CODEX_MODEL,
		agentReasoningEffort:
			getOptionalString(value.agentReasoningEffort) ??
			DEFAULT_CODEX_REASONING_EFFORT,
		agentSpeed: getOptionalString(value.agentSpeed) ?? DEFAULT_CODEX_SPEED,
	};
};

const resolveAgent = async (
	workspaceId: string,
	agentId: string | undefined,
) => {
	const agents = await db
		.query({
			workspaces: {
				$: {
					where: {
						id: workspaceId,
					},
				},
				agents: {},
			},
		})
		.then((result) => {
			const workspace = result.workspaces?.[0] as
				| WorkspaceWithAgents
				| undefined;
			return workspace?.agents ?? [];
		});

	return agentId ? agents.find((agent) => agent.id === agentId) : agents[0];
};

const generateTaskName = async (instructions: string | undefined) => {
	const fallback = getFallbackTaskName(instructions) ?? DEFAULT_TASK_NAME;
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;

	if (!accountId || !apiToken || !instructions) {
		return fallback;
	}

	const gatewayId =
		process.env.CLOUDFLARE_AI_GATEWAY_ID ??
		process.env.CF_AI_GATEWAY_ID ??
		"default";
	const model =
		process.env.CLOUDFLARE_TASK_NAMING_MODEL ?? DEFAULT_TASK_NAMING_MODEL;

	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
					"cf-aig-gateway-id": gatewayId,
				},
				body: JSON.stringify({
					model,
					temperature: 0.2,
					max_tokens: 16,
					messages: [
						{
							role: "system",
							content:
								"Name software engineering tasks. Return only a concise title, no punctuation, no quotes.",
						},
						{
							role: "user",
							content: `Task instructions:\n${instructions}`,
						},
					],
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Cloudflare task naming failed: ${response.status}`);
		}

		const data = (await response.json()) as unknown;
		return cleanTaskName(getChatCompletionText(data)) ?? fallback;
	} catch (error) {
		console.warn("Falling back to deterministic task name", error);
		return fallback;
	}
};

const getChatCompletionText = (value: unknown) => {
	if (!isRecord(value)) {
		return undefined;
	}

	const choices = Array.isArray(value.choices)
		? value.choices
		: isRecord(value.result) && Array.isArray(value.result.choices)
			? value.result.choices
			: undefined;
	const firstChoice = choices?.[0];

	if (!isRecord(firstChoice)) {
		return undefined;
	}

	if (isRecord(firstChoice.message)) {
		return getOptionalString(firstChoice.message.content);
	}

	return getOptionalString(firstChoice.text);
};

const cleanTaskName = (value: string | undefined) => {
	if (!value) {
		return undefined;
	}

	const normalized = value
		.trim()
		.replace(/^["'`]+|["'`.]+$/g, "")
		.replace(/\s+/g, " ");

	if (!normalized) {
		return undefined;
	}

	return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
};

const getFallbackTaskName = (instructions: string | undefined) => {
	if (!instructions) {
		return undefined;
	}

	const firstLine = instructions.split("\n")[0] ?? "";
	return cleanTaskName(firstLine);
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
