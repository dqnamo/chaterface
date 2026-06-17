import { tasks } from "@trigger.dev/sdk";
import { type NextRequest, NextResponse } from "next/server";
import { encryptAgentAuth } from "@/agent-auth-storage";
import db, { id } from "@/instant.admin";
import { E2BSandbox as Sandbox } from "@/trigger/e2b-sandbox";
import type { startCodexDeviceAuthTask } from "@/trigger/start-codex-device-auth";

type AuthenticatedWorkspace = {
	id: string;
	members?: Array<{
		user?: {
			id: string;
		};
	}>;
};

type AuthenticatedAgent = {
	id: string;
	provider?: string;
	sandboxId?: string;
	workspace?: AuthenticatedWorkspace;
};

const CODEX_AUTH_PATH = "~/.codex/auth.json";

const agentTx = (agentId: string) => {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
};

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const workspaceId = getNonEmptyString(body.workspaceId);
	const name = getNonEmptyString(body.name);
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	if (!name) {
		return NextResponse.json({ message: "name is required" }, { status: 400 });
	}

	const agentId = id();
	const createdAt = new Date().toISOString();

	await db.transact(
		agentTx(agentId)
			.create({
				name,
				provider: "codex",
				createdAt,
				status: "auth_pending",
				authState: {
					type: "codex_device_auth",
					status: "queued",
					queuedAt: createdAt,
				},
				settings: getAgentSettings(body.settings),
			})
			.link({ workspace: authResult.workspace.id }),
	);

	try {
		const handle = await tasks.trigger<typeof startCodexDeviceAuthTask>(
			"start-codex-device-auth",
			{ agentId },
			{
				idempotencyKey: `codex-device-auth-${agentId}`,
				idempotencyKeyTTL: "1h",
			},
		);

		await db.transact(
			agentTx(agentId).update({
				authState: {
					type: "codex_device_auth",
					status: "queued",
					triggerRunId: handle.id,
					queuedAt: createdAt,
				},
			}),
		);

		return NextResponse.json(
			{
				agent: {
					id: agentId,
					name,
					provider: "codex",
					createdAt,
					status: "auth_pending",
				},
				triggerRunId: handle.id,
			},
			{ status: 202 },
		);
	} catch (error) {
		const message = getErrorMessage(error);

		await db.transact(
			agentTx(agentId).update({
				status: "auth_failed",
				authState: {
					type: "codex_device_auth",
					status: "failed",
					error: message,
					updatedAt: new Date().toISOString(),
				},
			}),
		);

		return NextResponse.json(
			{ message: "Failed to start Codex device auth", error: message },
			{ status: 500 },
		);
	}
}

export async function PATCH(req: NextRequest) {
	const body = await readJson(req);
	const agentId = getNonEmptyString(body.agentId);
	const authResult = await authenticateAgentRequest(req, agentId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	if (authResult.agent.provider === "cursor") {
		return NextResponse.json(
			{ message: "Cursor agents do not use Codex device auth" },
			{ status: 400 },
		);
	}

	if (!authResult.agent.sandboxId) {
		return NextResponse.json(
			{ message: "Agent auth sandbox is still starting." },
			{ status: 409 },
		);
	}

	const sandbox = await Sandbox.connect(authResult.agent.sandboxId);
	const auth = await readCodexAuth(sandbox).catch((error) => {
		if (error instanceof ResponseError) {
			return error;
		}

		throw error;
	});

	if (auth instanceof ResponseError) {
		return NextResponse.json(
			{ message: auth.message },
			{ status: auth.status },
		);
	}

	await db.transact(
		agentTx(authResult.agent.id).update({
			auth: await encryptAgentAuth(auth),
			status: "ready",
			authState: {
				type: "codex_device_auth",
				status: "completed",
				updatedAt: new Date().toISOString(),
			},
		}),
	);

	return NextResponse.json({
		agent: {
			id: authResult.agent.id,
			status: "ready",
		},
	});
}

const authenticateWorkspaceRequest = async (
	req: NextRequest,
	workspaceId: string | undefined,
) => {
	if (!workspaceId) {
		return {
			ok: false as const,
			status: 400,
			message: "workspaceId is required",
		};
	}

	const user = await authenticateUser(req);

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
				members: {
					user: {},
				},
			},
		})
		.then(
			(result) => result.workspaces[0] as AuthenticatedWorkspace | undefined,
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

const authenticateAgentRequest = async (
	req: NextRequest,
	agentId: string | undefined,
) => {
	if (!agentId) {
		return {
			ok: false as const,
			status: 400,
			message: "agentId is required",
		};
	}

	const user = await authenticateUser(req);

	if (!user) {
		return {
			ok: false as const,
			status: 401,
			message: "Unauthorized",
		};
	}

	const agent = await db
		.query({
			agents: {
				$: {
					fields: ["provider", "sandboxId"],
					where: {
						id: agentId,
					},
				},
				workspace: {
					members: {
						user: {},
					},
				},
			},
		})
		.then((result) => result.agents[0] as AuthenticatedAgent | undefined);

	if (!agent) {
		return {
			ok: false as const,
			status: 404,
			message: "Agent not found",
		};
	}

	if (!agent.workspace || !hasWorkspaceAccess(agent.workspace, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, agent };
};

const authenticateUser = async (req: NextRequest) => {
	const token = getBearerToken(req.headers.get("Authorization"));

	if (!token) {
		return undefined;
	}

	return db.auth.verifyToken(token).catch(() => undefined);
};

const readCodexAuth = async (sandbox: Sandbox) => {
	let raw: string;

	try {
		raw = await sandbox.files.read(CODEX_AUTH_PATH);
	} catch {
		throw new ResponseError(
			409,
			"Finish the Codex device login before completing auth.",
		);
	}

	let auth: unknown;

	try {
		auth = JSON.parse(raw);
	} catch {
		throw new ResponseError(409, "Codex auth cache is not valid JSON.");
	}

	if (!isRecord(auth) || Object.keys(auth).length === 0) {
		throw new ResponseError(409, "Codex auth cache is empty.");
	}

	return auth;
};

const hasWorkspaceAccess = (
	workspace: AuthenticatedWorkspace,
	userId: string,
) => workspace.members?.some((member) => member.user?.id === userId) ?? false;

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const readJson = async (req: NextRequest) => {
	try {
		const value = (await req.json()) as unknown;
		return isRecord(value) ? value : {};
	} catch {
		return {};
	}
};

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getAgentSettings = (value: unknown) => (isRecord(value) ? value : {});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

class ResponseError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}
