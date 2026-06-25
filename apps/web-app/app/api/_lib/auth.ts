import { type NextRequest, NextResponse } from "next/server";
import db from "@/instant.admin";

type AuthenticatedWorkspace = {
	id: string;
	members?: Array<{
		user?: {
			id: string;
		};
	}>;
};

type AuthError = {
	ok: false;
	status: 400 | 401 | 403 | 404;
	message: string;
};

type AuthSuccess<TEntity> = {
	ok: true;
	user: Awaited<ReturnType<typeof db.auth.verifyToken>>;
	entity: TEntity;
};

export type AuthResult<TEntity> = AuthSuccess<TEntity> | AuthError;

export const authErrorResponse = (result: AuthError) =>
	NextResponse.json({ message: result.message }, { status: result.status });

export const authenticateTaskRequest = async (
	req: NextRequest,
	taskId: string,
) =>
	authenticateWorkspaceEntityRequest(
		req,
		getRequiredId(taskId, "taskId is required"),
		"Task not found",
		(id) =>
			db
				.query({
					tasks: {
						$: {
							where: { id },
							fields: ["latestDiffPath", "sandboxId"],
						},
						workspace: workspaceMembershipQuery,
					},
				})
				.then((result) => result.tasks[0]),
		(task) => task.workspace,
	);

export const authenticateServiceRequest = async (
	req: NextRequest,
	serviceId: string,
) =>
	authenticateWorkspaceEntityRequest(
		req,
		getRequiredId(serviceId, "serviceId is required"),
		"Preview service not found",
		(id) =>
			db
				.query({
					services: {
						$: {
							where: { id },
							fields: ["e2bHost"],
						},
						task: {
							$: {
								fields: ["sandboxTrafficAccessToken"],
							},
							workspace: workspaceMembershipQuery,
						},
					},
				})
				.then((result) => result.services[0]),
		(service) => service.task?.workspace,
	);

export const authenticateRepositoryRequest = async (
	req: NextRequest,
	repositoryId: string,
) =>
	authenticateWorkspaceEntityRequest(
		req,
		getRequiredId(repositoryId, "repositoryId is required"),
		"Repository not found",
		(id) =>
			db
				.query({
					repositories: {
						$: {
							where: { id },
							fields: ["secrets"],
						},
						workspace: workspaceMembershipQuery,
					},
				})
				.then((result) => result.repositories[0]),
		(repository) => repository.workspace,
	);

export const authenticateMcpServerRequest = async (
	req: NextRequest,
	mcpServerId: string,
) =>
	authenticateWorkspaceEntityRequest(
		req,
		getRequiredId(mcpServerId, "mcpServerId is required"),
		"MCP server not found",
		(id) =>
			db
				.query({
					mcpServers: {
						$: {
							where: { id },
							fields: ["url", "auth"],
						},
						workspace: workspaceMembershipQuery,
					},
				})
				.then((result) => result.mcpServers[0]),
		(mcpServer) => mcpServer.workspace,
	);

const authenticateWorkspaceEntityRequest = async <TEntity>(
	req: NextRequest,
	idResult: { ok: true; id: string } | AuthError,
	notFoundMessage: string,
	loadEntity: (id: string) => Promise<TEntity | undefined>,
	getWorkspace: (entity: TEntity) => AuthenticatedWorkspace | undefined,
): Promise<AuthResult<TEntity>> => {
	if (!idResult.ok) {
		return idResult;
	}

	const user = await authenticateUser(req);

	if (!user) {
		return {
			ok: false,
			status: 401,
			message: "Unauthorized",
		};
	}

	const entity = await loadEntity(idResult.id);

	if (!entity) {
		return {
			ok: false,
			status: 404,
			message: notFoundMessage,
		};
	}

	const workspace = getWorkspace(entity);

	if (!workspace || !hasWorkspaceAccess(workspace, user.id)) {
		return {
			ok: false,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true, user, entity };
};

const authenticateUser = async (req: NextRequest) => {
	const token = getBearerToken(req.headers.get("Authorization"));

	if (!token) {
		return undefined;
	}

	return db.auth.verifyToken(token).catch(() => undefined);
};

const getBearerToken = (authorizationHeader: string | null) => {
	const [scheme, token] = authorizationHeader?.split(" ") ?? [];

	if (scheme !== "Bearer" || !token) {
		return undefined;
	}

	return token;
};

const getRequiredId = (id: string | undefined, message: string) => {
	const trimmed = id?.trim();

	if (!trimmed) {
		return {
			ok: false as const,
			status: 400 as const,
			message,
		};
	}

	return { ok: true as const, id: trimmed };
};

const hasWorkspaceAccess = (
	workspace: AuthenticatedWorkspace,
	userId: string,
) => workspace.members?.some((member) => member.user?.id === userId) ?? false;

const workspaceMembershipQuery = {
	members: {
		user: {},
	},
};
