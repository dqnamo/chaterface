import { type NextRequest, NextResponse } from "next/server";
import db, { id } from "@/instant.admin";

type RouteContext = {
	params: Promise<{
		taskId: string;
	}>;
};

type Agent = {
	id: string;
};

type TaskForStart = {
	id: string;
	name: string;
	status?: string;
	instructions?: string;
	agentModel?: string;
	agentReasoningEffort?: string;
	agentSpeed?: string;
	agent?: Agent;
	agentSessions?: Array<{ id: string }>;
	factory?: {
		id: string;
		organisation?: {
			agents?: Agent[];
			members?: Array<{
				user?: {
					id: string;
				};
			}>;
		};
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

export async function POST(req: NextRequest, context: RouteContext) {
	const { taskId } = await context.params;
	const authResult = await authenticateTaskRequest(req, taskId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const { task } = authResult;
	const agent = task.agent ?? task.factory?.organisation?.agents?.[0];

	if (!agent) {
		return NextResponse.json(
			{ message: "No agent is configured for this task" },
			{ status: 409 },
		);
	}

	const now = new Date().toISOString();
	const existingSession = task.agentSessions?.[0];

	if (existingSession) {
		await db.transact([
			taskTx(task.id).update({
				status: "in_progress",
				completedAt: undefined,
			}),
			agentSessionTx(existingSession.id).update({
				status: "running",
				updatedAt: now,
			}),
		]);

		return NextResponse.json({
			taskId: task.id,
			agentId: agent.id,
			agentSessionId: existingSession.id,
			status: "in_progress",
		});
	}

	if (!task.instructions) {
		return NextResponse.json(
			{ message: "Task instructions are required to start an agent session" },
			{ status: 400 },
		);
	}

	const agentSessionId = id();
	const eventId = id();

	await db.transact([
		taskTx(task.id).update({
			status: "in_progress",
			completedAt: undefined,
		}),
		agentSessionTx(agentSessionId)
			.create({
				name: "Agent",
				status: "running",
				createdAt: now,
				updatedAt: now,
			})
			.link({ task: task.id, agent: agent.id }),
		eventTx(eventId)
			.create({
				type: "factoryplane.new_task",
				data: {
					taskId: task.id,
					name: task.name,
					instructions: task.instructions,
				},
				createdAt: now,
			})
			.link({ task: task.id, agentSession: agentSessionId }),
	]);

	return NextResponse.json(
		{
			taskId: task.id,
			agentId: agent.id,
			agentSessionId,
			status: "in_progress",
		},
		{ status: 201 },
	);
}

const authenticateTaskRequest = async (req: NextRequest, taskId: string) => {
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

	const task = await db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
				agent: {},
				agentSessions: {},
				factory: {
					organisation: {
						agents: {},
						members: {
							user: {},
						},
					},
				},
			},
		})
		.then((result) => result.tasks[0] as TaskForStart | undefined);

	if (!task) {
		return {
			ok: false as const,
			status: 404,
			message: "Task not found",
		};
	}

	if (!hasTaskAccess(task, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, task };
};

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const hasTaskAccess = (task: TaskForStart, userId: string) =>
	task.factory?.organisation?.members?.some(
		(member) => member.user?.id === userId,
	) ?? false;
