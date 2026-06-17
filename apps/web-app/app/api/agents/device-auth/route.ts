import { tasks } from "@trigger.dev/sdk";
import { type NextRequest, NextResponse } from "next/server";
import db, { id } from "@/instant.admin";
import type { startCodexDeviceAuthTask } from "@/trigger/start-codex-device-auth";

type AuthenticatedWorkspace = {
	id: string;
	members?: Array<{
		user?: {
			id: string;
		};
	}>;
};

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
				status: "auth_queued",
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
					status: "auth_queued",
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

const authenticateUser = async (req: NextRequest) => {
	const token = getBearerToken(req.headers.get("Authorization"));

	if (!token) {
		return undefined;
	}

	return db.auth.verifyToken(token).catch(() => undefined);
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
