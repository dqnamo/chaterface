import { type NextRequest, NextResponse } from "next/server";
import { encryptAgentAuth } from "@/agent-auth-storage";
import db, { id } from "@/instant.admin";
import { E2BSandbox as Sandbox } from "@/trigger/e2b-sandbox";

type AuthenticatedOrganisation = {
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
	organisation?: AuthenticatedOrganisation;
};

const CODEX_AUTH_PATH = "~/.codex/auth.json";

const agentTx = (agentId: string) => {
	const tx = db.tx.agents[agentId];

	if (!tx) {
		throw new Error(`Agent transaction builder ${agentId} not found`);
	}

	return tx;
};

const terminalSessionTx = (terminalSessionId: string) => {
	const tx = db.tx.terminalSessions[terminalSessionId];

	if (!tx) {
		throw new Error(
			`Terminal session transaction builder ${terminalSessionId} not found`,
		);
	}

	return tx;
};

export async function POST(req: NextRequest) {
	const body = await readJson(req);
	const organisationId = getNonEmptyString(body.organisationId);
	const name = getNonEmptyString(body.name);
	const authResult = await authenticateOrganisationRequest(req, organisationId);

	if (!authResult.ok) {
		return NextResponse.json(
			{ message: authResult.message },
			{ status: authResult.status },
		);
	}

	if (!name) {
		return NextResponse.json({ message: "name is required" }, { status: 400 });
	}

	const sandbox = await Sandbox.create("codex", {
		timeoutMs: 10 * 60 * 1000,
	});
	const agentId = id();
	const terminalSessionId = id();
	const createdAt = new Date().toISOString();

	await db.transact([
		agentTx(agentId)
			.create({
				name,
				provider: "codex",
				createdAt,
				status: "auth_pending",
				sandboxId: sandbox.sandboxId,
				settings: getAgentSettings(body.settings),
			})
			.link({ organisation: authResult.organisation.id }),
		terminalSessionTx(terminalSessionId)
			.create({
				name: "Codex device auth",
				command: "codex login --device-auth",
				cwd: "/home/user",
				status: "starting",
				startedAt: createdAt,
				lastActivityAt: createdAt,
			})
			.link({ agent: agentId }),
	]);

	try {
		const process = await sandbox.pty.create({
			cols: 80,
			rows: 24,
			cwd: "/home/user",
			timeoutMs: 0,
			onData: () => {},
		});
		await sandbox.pty.sendInput(
			process.pid,
			new TextEncoder().encode(
				`exec bash -lc ${shellQuote(buildCodexDeviceAuthCommand())}\n`,
			),
		);
		await process.disconnect();

		await db.transact(
			terminalSessionTx(terminalSessionId).update({
				pid: process.pid,
				status: "running",
				lastActivityAt: new Date().toISOString(),
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
				terminalSessionId,
			},
			{ status: 201 },
		);
	} catch (error) {
		const now = new Date().toISOString();
		const message = getErrorMessage(error);

		await db.transact([
			agentTx(agentId).update({
				status: "auth_failed",
			}),
			terminalSessionTx(terminalSessionId).update({
				status: "failed",
				error: message,
				stoppedAt: now,
				lastActivityAt: now,
			}),
		]);

		return NextResponse.json(
			{ message: "Failed to start Codex device auth", error: message },
			{ status: 500 },
		);
	}
}

export async function PATCH(req: NextRequest) {
	const body = await readJson(req);
	const agentId = getNonEmptyString(body.agentId);
	const terminalSessionId = getNonEmptyString(body.terminalSessionId);
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
			{ message: "Agent auth sandbox is missing" },
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

	await db.transact([
		agentTx(authResult.agent.id).update({
			auth: await encryptAgentAuth(auth),
			status: "ready",
		}),
		...(terminalSessionId
			? [
					terminalSessionTx(terminalSessionId).update({
						status: "completed",
						stoppedAt: new Date().toISOString(),
						lastActivityAt: new Date().toISOString(),
					}),
				]
			: []),
	]);

	return NextResponse.json({
		agent: {
			id: authResult.agent.id,
			status: "ready",
		},
	});
}

const authenticateOrganisationRequest = async (
	req: NextRequest,
	organisationId: string | undefined,
) => {
	if (!organisationId) {
		return {
			ok: false as const,
			status: 400,
			message: "organisationId is required",
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

	const organisation = await db
		.query({
			organisations: {
				$: {
					where: {
						id: organisationId,
					},
				},
				members: {
					user: {},
				},
			},
		})
		.then(
			(result) =>
				result.organisations[0] as AuthenticatedOrganisation | undefined,
		);

	if (!organisation) {
		return {
			ok: false as const,
			status: 404,
			message: "Organisation not found",
		};
	}

	if (!hasOrganisationAccess(organisation, user.id)) {
		return {
			ok: false as const,
			status: 403,
			message: "Forbidden",
		};
	}

	return { ok: true as const, organisation };
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
				organisation: {
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

	if (
		!agent.organisation ||
		!hasOrganisationAccess(agent.organisation, user.id)
	) {
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

const buildCodexDeviceAuthCommand = () =>
	[
		"set -e",
		"mkdir -p ~/.codex",
		`printf '%s\n' ${shellQuote('cli_auth_credentials_store = "file"')} > ~/.codex/config.toml`,
		"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
		"codex login --device-auth",
	].join("\n");

const hasOrganisationAccess = (
	organisation: AuthenticatedOrganisation,
	userId: string,
) =>
	organisation.members?.some((member) => member.user?.id === userId) ?? false;

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

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

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
