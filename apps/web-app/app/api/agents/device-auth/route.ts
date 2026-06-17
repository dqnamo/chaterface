import { type NextRequest, NextResponse } from "next/server";
import { encryptAgentAuth } from "@/agent-auth-storage";
import db, { id } from "@/instant.admin";
import { E2BSandbox as Sandbox } from "@/trigger/e2b-sandbox";

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
const DEVICE_AUTH_OUTPUT_TIMEOUT_MS = 120_000;

type CodexDeviceAuthInstructions = {
	verificationUri: string;
	userCode: string;
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

	const sandbox = await Sandbox.create("codex", {
		timeoutMs: 10 * 60 * 1000,
	});
	const agentId = id();
	const createdAt = new Date().toISOString();

	await db.transact(
		agentTx(agentId)
			.create({
				name,
				provider: "codex",
				createdAt,
				status: "auth_pending",
				sandboxId: sandbox.sandboxId,
				settings: getAgentSettings(body.settings),
			})
			.link({ workspace: authResult.workspace.id }),
	);

	try {
		const output = new DeviceAuthOutputBuffer();
		const process = await sandbox.pty.create({
			cols: 80,
			rows: 24,
			cwd: "/home/user",
			timeoutMs: 0,
			onData: (data) => {
				output.append(data);
			},
		});
		await sandbox.pty.sendInput(
			process.pid,
			new TextEncoder().encode(
				`exec bash -lc ${shellQuote(buildCodexDeviceAuthCommand())}\n`,
			),
		);
		const deviceAuth = await output.waitForInstructions(
			DEVICE_AUTH_OUTPUT_TIMEOUT_MS,
		);
		await process.disconnect();

		return NextResponse.json(
			{
				agent: {
					id: agentId,
					name,
					provider: "codex",
					createdAt,
					status: "auth_pending",
				},
				deviceAuth,
			},
			{ status: 201 },
		);
	} catch (error) {
		const message = getErrorMessage(error);

		await db.transact([
			agentTx(agentId).update({
				status: "auth_failed",
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

	await db.transact(
		agentTx(authResult.agent.id).update({
			auth: await encryptAgentAuth(auth),
			status: "ready",
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

const buildCodexDeviceAuthCommand = () =>
	[
		"set -e",
		"mkdir -p ~/.codex",
		`printf '%s\n' ${shellQuote('cli_auth_credentials_store = "file"')} > ~/.codex/config.toml`,
		"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
		"codex login --device-auth",
	].join("\n");

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

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

class DeviceAuthOutputBuffer {
	private readonly decoder = new TextDecoder();
	private output = "";
	private instructions: CodexDeviceAuthInstructions | undefined;
	private rejected = false;
	private resolve:
		| ((instructions: CodexDeviceAuthInstructions) => void)
		| undefined;

	append(data: unknown) {
		if (this.rejected || this.instructions) {
			return;
		}

		this.output += decodePtyData(data, this.decoder);

		const instructions = parseCodexDeviceAuthInstructions(this.output);

		if (!instructions) {
			return;
		}

		this.instructions = instructions;
		this.resolve?.(instructions);
	}

	waitForInstructions(timeoutMs: number) {
		if (this.instructions) {
			return Promise.resolve(this.instructions);
		}

		return new Promise<CodexDeviceAuthInstructions>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.rejected = true;
				reject(
					new Error(
						"Codex device auth did not print a sign-in link and code before timing out.",
					),
				);
			}, timeoutMs);

			this.resolve = (instructions) => {
				clearTimeout(timeout);
				resolve(instructions);
			};
		});
	}
}

const parseCodexDeviceAuthInstructions = (
	output: string,
): CodexDeviceAuthInstructions | undefined => {
	const text = stripAnsi(output);
	const verificationUri = findVerificationUri(text);
	const userCode = findUserCode(text) ?? findUserCodeInUrl(verificationUri);

	if (!verificationUri || !userCode) {
		return undefined;
	}

	return {
		verificationUri,
		userCode,
	};
};

const findVerificationUri = (text: string) => {
	const urls = [...text.matchAll(/https?:\/\/[^\s"'<>]+/gi)]
		.map((match) => cleanUrl(match[0]))
		.filter(Boolean);

	return (
		urls.find((url) =>
			/(^https?:\/\/([^/]+\.)?(openai|chatgpt)\.com\b|device|verify|activate|login|oauth)/i.test(
				url,
			),
		) ?? urls.at(-1)
	);
};

const findUserCode = (text: string) => {
	const labeledCode = text.match(
		/(?:[Uu][Ss][Ee][Rr]\s*)?[Cc][Oo][Dd][Ee][^\nA-Z0-9]*([A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}|[A-Z0-9]{6,12})(?![a-z])/,
	)?.[1];

	if (labeledCode) {
		return labeledCode.toUpperCase();
	}

	return text.match(/\b[A-Z0-9]{4}(?:-[A-Z0-9]{4}){1,3}\b/)?.[0].toUpperCase();
};

const findUserCodeInUrl = (url: string | undefined) => {
	if (!url) {
		return undefined;
	}

	try {
		const parsed = new URL(url);
		return (
			parsed.searchParams.get("user_code") ??
			parsed.searchParams.get("code") ??
			undefined
		)?.toUpperCase();
	} catch {
		return undefined;
	}
};

const decodePtyData = (data: unknown, decoder: TextDecoder) => {
	if (typeof data === "string") {
		return data;
	}

	if (data instanceof Uint8Array) {
		return decoder.decode(data, { stream: true });
	}

	if (isRecord(data) && typeof data.data === "string") {
		return data.data;
	}

	return "";
};

const cleanUrl = (value: string) => value.replace(/[),.;\]]+$/g, "").trim();

const stripAnsi = (value: string) =>
	value.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape parsing requires control characters.
		/[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
		"",
	);

class ResponseError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}
