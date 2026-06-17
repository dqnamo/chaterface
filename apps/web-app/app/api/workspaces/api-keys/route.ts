import { type NextRequest, NextResponse } from "next/server";
import { generateSecretToken, hashSecretValue } from "@/encryption";
import db, { id } from "@/instant.admin";

type ApiKeyRecord = {
	id: string;
	name: string;
	tokenPrefix: string;
	createdAt?: string | Date;
	lastUsedAt?: string | Date;
	revokedAt?: string | Date;
};

type AuthenticatedWorkspace = {
	id: string;
	members?: Array<{
		user?: {
			id: string;
		};
	}>;
};

const apiKeyTx = (apiKeyId: string) => {
	const tx = db.tx.apiKeys[apiKeyId];

	if (!tx) {
		throw new Error(`API key transaction builder ${apiKeyId} not found`);
	}

	return tx;
};

export async function GET(req: NextRequest) {
	const workspaceId = req.nextUrl.searchParams.get("workspaceId")?.trim();
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const apiKeys = await db
		.query({
			apiKeys: {
				$: {
					where: {
						workspace: authResult.workspaceId,
					},
				},
			},
		})
		.then((result) => result.apiKeys as ApiKeyRecord[]);

	return NextResponse.json({
		apiKeys: apiKeys
			.filter((apiKey) => !apiKey.revokedAt)
			.sort(
				(first, second) =>
					new Date(second.createdAt ?? 0).getTime() -
					new Date(first.createdAt ?? 0).getTime(),
			)
			.map(toApiKeyResponse),
	});
}

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const workspaceId = getNonEmptyString(body.workspaceId);
	const name = getNonEmptyString(body.name) ?? "API key";
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	const token = generateSecretToken("fp_live");
	const tokenHash = await hashSecretValue(token);
	const apiKeyId = id();
	const createdAt = new Date().toISOString();

	await db.transact(
		apiKeyTx(apiKeyId)
			.create({
				name,
				tokenHash,
				tokenPrefix: token.slice(0, 14),
				createdAt,
			})
			.link({ workspace: authResult.workspaceId }),
	);

	return NextResponse.json({
		apiKey: {
			id: apiKeyId,
			name,
			tokenPrefix: token.slice(0, 14),
			createdAt,
		},
		token,
	});
}

export async function DELETE(req: NextRequest) {
	const body = await readJson(req);
	const workspaceId = getNonEmptyString(body.workspaceId);
	const apiKeyId = getNonEmptyString(body.apiKeyId);
	const authResult = await authenticateWorkspaceRequest(req, workspaceId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	if (!apiKeyId) {
		return NextResponse.json(
			{ message: "apiKeyId is required" },
			{ status: 400 },
		);
	}

	const apiKey = await db
		.query({
			apiKeys: {
				$: {
					where: {
						id: apiKeyId,
					},
				},
				workspace: {},
			},
		})
		.then((result) => result.apiKeys[0]);

	if (!apiKey || apiKey.workspace?.id !== authResult.workspaceId) {
		return NextResponse.json({ message: "API key not found" }, { status: 404 });
	}

	await db.transact(
		apiKeyTx(apiKeyId).update({
			revokedAt: new Date().toISOString(),
		}),
	);

	return NextResponse.json({ apiKeyId });
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

	return { ok: true as const, user, workspaceId: workspace.id };
};

const toApiKeyResponse = (apiKey: ApiKeyRecord) => ({
	id: apiKey.id,
	name: apiKey.name,
	tokenPrefix: apiKey.tokenPrefix,
	createdAt: apiKey.createdAt,
	lastUsedAt: apiKey.lastUsedAt,
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

const getNonEmptyString = (value: unknown) => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
