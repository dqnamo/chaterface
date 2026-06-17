import { type NextRequest, NextResponse } from "next/server";
import db, { id } from "@/instant.admin";

const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_REASONING_EFFORT = "medium";
const DEFAULT_CODEX_SPEED = "standard";
const DEFAULT_TASK_NAMING_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_TASK_NAME = "New task";

type CreateTaskBody = {
	taskId?: string;
	workspaceId?: string;
	agentId?: string;
	name?: string;
	instructions?: string;
	attachments?: unknown;
	images?: unknown;
	agentModel: string;
	agentReasoningEffort: string;
	agentSpeed: string;
};

type Agent = {
	id: string;
};

type AuthenticatedWorkspace = {
	id: string;
	agents?: Agent[];
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

export async function POST(req: NextRequest) {
	const body = parseCreateTaskBody(await readJson(req));
	const instructions =
		body?.instructions ||
		buildAttachmentOnlyInstructions(body?.attachments, body?.images);

	if (!body?.workspaceId || !instructions) {
		return NextResponse.json(
			{ message: "workspaceId and instructions or attachments are required" },
			{ status: 400 },
		);
	}

	const authResult = await authenticateWorkspaceRequest(req, body.workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const agent = resolveAgent(authResult.workspace, body.agentId);

	if (!agent) {
		return NextResponse.json(
			{
				message: body.agentId
					? "Agent not found"
					: "No agent is configured for task creation",
			},
			{ status: body.agentId ? 400 : 409 },
		);
	}

	const taskId = body.taskId ?? id();
	const agentSessionId = id();
	const eventId = id();
	const createdAt = new Date().toISOString();
	const name = body.name ?? (await generateTaskName(instructions));

	await db.transact([
		taskTx(taskId)
			.create({
				name,
				status: "in_progress",
				instructions,
				createdAt,
				agentModel: body.agentModel,
				agentReasoningEffort: body.agentReasoningEffort,
				agentSpeed: body.agentSpeed,
			})
			.link({ workspace: authResult.workspace.id, agent: agent.id }),
		agentSessionTx(agentSessionId)
			.create({
				name: "Agent",
				status: "running",
				createdAt,
				updatedAt: createdAt,
			})
			.link({ task: taskId, agent: agent.id }),
		eventTx(eventId)
			.create({
				type: "factoryplane.new_task",
				data: {
					taskId,
					name,
					instructions,
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
			agentSessionId,
			name,
			status: "in_progress",
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
				agents: {
					$: {
						fields: ["name"],
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

const resolveAgent = (
	workspace: AuthenticatedWorkspace,
	agentId: string | undefined,
) => {
	const agents = workspace.agents ?? [];
	return agentId ? agents.find((agent) => agent.id === agentId) : agents[0];
};

const generateTaskName = async (instructions: string) => {
	const fallback = getFallbackTaskName(instructions) ?? DEFAULT_TASK_NAME;
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;

	if (!accountId || !apiToken) {
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

const buildAttachmentOnlyInstructions = (
	attachments: unknown,
	images: unknown,
) => {
	const names = [
		...getAttachmentNames(attachments),
		...getAttachmentNames(images),
	];

	if (names.length === 0) {
		return undefined;
	}

	return [
		"Use the attached file input.",
		"",
		"Attached files:",
		...names.map((name) => `- ${name}`),
	].join("\n");
};

const getAttachmentNames = (value: unknown) => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((attachment) => {
		if (!isRecord(attachment)) {
			return [];
		}

		const name = getOptionalString(attachment.name);
		return name ? [name] : [];
	});
};

const parseCreateTaskBody = (
	value: Record<string, unknown>,
): CreateTaskBody => ({
	taskId: getOptionalString(value.taskId),
	workspaceId: getOptionalString(value.workspaceId),
	agentId: getOptionalString(value.agentId),
	name: getOptionalString(value.name),
	instructions: getOptionalString(value.instructions),
	attachments: Array.isArray(value.attachments) ? value.attachments : undefined,
	images: Array.isArray(value.images) ? value.images : undefined,
	agentModel: getOptionalString(value.agentModel) ?? DEFAULT_CODEX_MODEL,
	agentReasoningEffort:
		getOptionalString(value.agentReasoningEffort) ??
		DEFAULT_CODEX_REASONING_EFFORT,
	agentSpeed: getOptionalString(value.agentSpeed) ?? DEFAULT_CODEX_SPEED,
});

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
