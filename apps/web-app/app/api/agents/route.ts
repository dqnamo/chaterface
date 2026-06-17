import { type NextRequest, NextResponse } from "next/server";
import {
	encryptAgentAuth,
	getAgentAuthProviderAccountId,
} from "@/agent-auth-storage";
import db, { id } from "@/instant.admin";

type AgentProvider = "codex" | "cursor";

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
	const provider = getAgentProvider(body.provider);
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

	if (!isValidAgentAuth(provider, body.auth)) {
		return NextResponse.json(
			{ message: getInvalidAuthMessage(provider) },
			{ status: 400 },
		);
	}

	const agentId = id();
	const createdAt = new Date().toISOString();
	const providerAccountId = getAgentAuthProviderAccountId(provider, body.auth);

	await db.transact(
		agentTx(agentId)
			.create({
				name,
				provider,
				providerAccountId,
				createdAt,
				status: "ready",
				auth: await encryptAgentAuth(body.auth),
				settings: getAgentSettings(body.settings),
			})
			.link({
				workspace: authResult.workspace.id,
				creator: authResult.user.id,
			}),
	);

	return NextResponse.json(
		{
			agent: {
				id: agentId,
				name,
				provider,
				createdAt,
				status: "ready",
			},
		},
		{ status: 201 },
	);
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

	return { ok: true as const, workspace, user };
};

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

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const getAgentProvider = (value: unknown): AgentProvider =>
	value === "cursor" ? "cursor" : "codex";

const isValidAgentAuth = (provider: AgentProvider, auth: unknown) => {
	if (!isRecord(auth)) {
		return false;
	}

	if (provider === "cursor") {
		return getNonEmptyString(auth.apiKey) !== undefined;
	}

	return Object.keys(auth).length > 0;
};

const getInvalidAuthMessage = (provider: AgentProvider) =>
	provider === "cursor"
		? "Cursor agents require auth.apiKey"
		: "Codex auth must be a non-empty JSON object";

const getAgentSettings = (value: unknown) => (isRecord(value) ? value : {});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
