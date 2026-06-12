import { createHash, randomUUID } from "node:crypto";
import type { InstaQLEntity } from "@instantdb/react";
import db from "@repo/db/admin";
import { createEncryptionService } from "@repo/encryption";
import { task } from "@trigger.dev/sdk";
import { Sandbox } from "e2b/dist/index.mjs";
import {
	CODEX_REASONING_EFFORT_OPTIONS,
	DEFAULT_CODEX_MODEL,
	DEFAULT_CODEX_REASONING_EFFORT,
	getCodexSpeedConfigOverrides,
	getTaskAgentSpeed,
} from "@/codex-options";
import type { AppSchema } from "@/instant.schema";
import {
	formatCodexDeveloperInstructionsConfig,
	getCodexDeveloperInstructions,
} from "./codex-system-prompt";
import { syncAgentAuthFromSandbox } from "./sync-agent-auth";

type Event = InstaQLEntity<AppSchema, "events">;
type Task = InstaQLEntity<AppSchema, "tasks">;
type Agent = InstaQLEntity<AppSchema, "agents">;
type Factory = InstaQLEntity<AppSchema, "factories">;
type Repository = InstaQLEntity<AppSchema, "repositories">;
type EnvironmentFile = InstaQLEntity<AppSchema, "environmentFiles">;
type FactoryWithRepositories = Factory & {
	repositories?: Repository[];
	environmentFiles?: EnvironmentFile[];
};
type RepositorySecret = {
	id: string;
	name: string;
	valueEncrypted: string;
	createdAt?: string;
};
type TaskEnvironmentPackage = {
	command: string;
	aptPackage: string;
};
type ConfiguredTaskEnvironmentPackage = {
	aptPackage: string;
	command?: string;
};
type CodexEvent = {
	type: string;
	data: unknown;
};
type AgentProvider = "codex" | "cursor";
type FactorySetupScriptKind = "new_task" | "new_turn";

type RunCodexExecOptions = {
	resumeLast?: boolean;
};

type SetupStepOptions = {
	timeoutMs?: number;
};

const CODEX_AUTH_PATH = "~/.codex/auth.json";
const e2bPortPlaceholder = ["$", "{PORT}"].join("");
const DIFF_BASELINE_ROOT = "/tmp/factoryplane-baselines";
const DIFF_WORK_ROOT = "/tmp/factoryplane-diff-work";
const DIFF_STORAGE_CONTENT_TYPE = "text/x-patch";
const REPOSITORY_SECRETS_FINGERPRINT_PATH =
	".factoryplane/repository-secrets-fingerprint";
const FACTORYPLANE_SCRIPT_DIR = "/tmp/factoryplane-scripts";
const FACTORY_SETUP_SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_TASK_ENVIRONMENT_PACKAGES: TaskEnvironmentPackage[] = [
	{
		command: "rg",
		aptPackage: "ripgrep",
	},
];
const APT_PACKAGE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9+._:-]*$/;
const SANDBOX_DIFF_EXCLUDES = [
	".git",
	".codex",
	".factoryplane",
	".cache",
	".config",
	".npm",
	".next",
	".turbo",
	".vercel",
	"node_modules",
	"dist",
	"build",
	"coverage",
	"*.log",
	".env",
	".env.*",
];

const getAgentProvider = (agent: {
	provider?: string | null;
}): AgentProvider => (agent.provider === "cursor" ? "cursor" : "codex");

const getProviderLabel = (provider: AgentProvider) =>
	provider === "cursor" ? "Cursor" : "Codex";

const getCursorApiKey = (auth: unknown) => {
	if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
		return undefined;
	}

	const value = (auth as { apiKey?: unknown }).apiKey;
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: undefined;
};

const getCursorAuthEnvs = (agent: Agent): Record<string, string> => {
	const apiKey = getCursorApiKey(agent.auth);

	if (!apiKey) {
		throw new Error(`Cursor agent ${agent.id} is missing auth.apiKey`);
	}

	return { CURSOR_API_KEY: apiKey };
};

const getCursorPathPrefix = () =>
	'export PATH="$HOME/.cursor/bin:$HOME/.local/bin:$PATH"';

const buildCursorInstallCommand = () =>
	[
		getCursorPathPrefix(),
		"if ! command -v cursor-agent >/dev/null 2>&1; then",
		"  curl https://cursor.com/install -fsS | bash",
		"fi",
		"cursor-agent --version",
	].join("\n");

const taskTx = (taskId: string) => {
	const tx = db.tx.tasks[taskId];

	if (!tx) {
		throw new Error(`Task transaction builder ${taskId} not found`);
	}

	return tx;
};

const updateTaskStatus = async (
	taskId: string,
	status: "idle" | "in_progress" | "failed",
) => {
	await db.transact(
		taskTx(taskId).update({
			status,
		}),
	);
};

const eventTx = (eventId: string) => {
	const tx = db.tx.events[eventId];

	if (!tx) {
		throw new Error(`Event transaction builder ${eventId} not found`);
	}

	return tx;
};

export const processEventTask = task({
	id: "process-event",
	retry: {
		maxAttempts: 3,
	},
	run: async (payload: { eventId: string }) => {
		console.log("Processing event", payload);

		const event = await db
			.query({
				events: {
					$: {
						where: {
							id: payload.eventId,
						},
					},
					task: {
						agent: {},
						factory: {
							repositories: {},
							environmentFiles: {},
						},
					},
				},
			})
			.then((result) => result.events[0]);

		const task = event?.task;
		const agent = task?.agent;
		const factory = task?.factory;

		if (!event || !task || !agent || !factory) {
			console.log("Skipping event without task, agent, or factory", payload);
			return;
		}

		try {
			if (event?.type === "factoryplane.new_task") {
				await processNewTask(
					agent as Agent,
					task as Task,
					factory as FactoryWithRepositories,
				);
			} else if (event?.type === "factoryplane.new_user_message") {
				await processNewUserMessage(
					event as Event,
					task as Task,
					agent as Agent,
					factory as FactoryWithRepositories,
				);
			}
		} catch (error) {
			await updateTaskStatus(task.id, "failed");
			throw error;
		}
	},
});

const processNewTask = async (
	agent: Agent,
	task: Task,
	factory: FactoryWithRepositories,
) => {
	const { sandbox, diffWorkspacePath } = await setupTaskSandbox(
		agent,
		task,
		factory,
	);
	const message = `${task.name}. ${task.instructions ?? ""}.`;

	await runAgentExec(
		sandbox,
		{ ...task, diffWorkspacePath },
		agent,
		factory,
		message,
		{},
	);
};

const processNewUserMessage = async (
	event: Event,
	task: Task,
	agent: Agent,
	factory: FactoryWithRepositories,
) => {
	const content = getStringDataValue(event.data, "content");

	if (!content) {
		console.log("Skipping user message event without content", event.id);
		return;
	}

	if (!task.sandboxId) {
		throw new Error(`Task ${task.id} is missing sandboxId`);
	}

	const sandbox = await Sandbox.connect(task.sandboxId);
	await killTaskAgentProcess(sandbox, task);
	await syncRepositoryEnvFilesIfChanged(sandbox, task.id, factory);
	await runAgentExec(sandbox, task, agent, factory, content, {
		resumeLast: true,
	});
};

const setupTaskSandbox = async (
	agent: Agent,
	task: Task,
	factory: FactoryWithRepositories,
) => {
	if (!agent.auth || !factory) {
		throw new Error(`Agent ${agent.id} is missing auth or factory`);
	}

	const sandbox = await runSetupStep(
		task.id,
		"sandbox",
		"Create sandbox",
		() =>
			Sandbox.create("codex", {
				timeoutMs: 10 * 60 * 1000,
				lifecycle: {
					onTimeout: "pause",
					autoResume: true,
				},
				network: {
					allowPublicTraffic: false,
					maskRequestHost: `localhost:${e2bPortPlaceholder}`,
				},
			}),
		{ timeoutMs: 120_000 },
	);
	const provider = getAgentProvider(agent);

	await db.transact(
		taskTx(task.id).update({
			sandboxId: sandbox.sandboxId,
			sandboxTrafficAccessToken: sandbox.trafficAccessToken,
		}),
	);

	if (provider === "cursor") {
		getCursorAuthEnvs(agent);
		const cursorInstall = await runSetupStep(
			task.id,
			"cursor_update",
			"Install Cursor CLI",
			() =>
				sandbox.commands.run(buildCursorInstallCommand(), {
					timeoutMs: 120_000,
				}),
			{ timeoutMs: 130_000 },
		);
		console.log(cursorInstall);
	} else {
		await runSetupStep(task.id, "codex_auth", "Write Codex auth", () =>
			sandbox.files.write(CODEX_AUTH_PATH, JSON.stringify(agent.auth)),
		);

		const codexUpdate = await runSetupStep(
			task.id,
			"codex_update",
			"Update Codex",
			() =>
				sandbox.commands.run(
					"npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
					{ timeoutMs: 120_000 },
				),
			{ timeoutMs: 130_000 },
		);
		console.log(codexUpdate);
	}

	await installTaskEnvironmentPackages(sandbox, task.id, factory);

	const repositoryGithubEnvs = await setupRepositoryGithubAuth(
		sandbox,
		task.id,
		factory,
	);
	await cloneFactoryRepositories(
		sandbox,
		task.id,
		factory,
		repositoryGithubEnvs,
	);
	await writeFactoryEnvironmentFiles(sandbox, task.id, factory);
	await runFactorySetupScript(
		sandbox,
		task.id,
		factory,
		"new_task",
		factory.newTaskSetupScript,
		repositoryGithubEnvs,
	);

	const diffWorkspacePath = await runSetupStep(
		task.id,
		"diff_baseline",
		"Create diff baseline",
		() => createTaskWorkspaceBaseline(sandbox, task.id),
	);
	await db.transact(
		taskTx(task.id).update({
			diffWorkspacePath,
		}),
	);

	return { sandbox, diffWorkspacePath };
};

const installTaskEnvironmentPackages = async (
	sandbox: Sandbox,
	taskId: string,
	factory: Factory,
) => {
	const packages = getTaskEnvironmentPackages(factory);

	if (packages.length === 0) {
		return;
	}

	await runSetupStep(
		taskId,
		"environment_packages",
		"Install environment packages",
		() =>
			sandbox.commands.run(buildInstallEnvironmentPackagesCommand(packages), {
				timeoutMs: 180_000,
			}),
		{ timeoutMs: 190_000 },
	);
};

const getTaskEnvironmentPackages = (
	factory: Factory,
): ConfiguredTaskEnvironmentPackage[] => {
	const packages = new Map<string, ConfiguredTaskEnvironmentPackage>();

	for (const pkg of DEFAULT_TASK_ENVIRONMENT_PACKAGES) {
		packages.set(pkg.aptPackage, pkg);
	}

	for (const aptPackage of parseFactoryEnvironmentPackages(
		factory.environmentPackages,
	)) {
		packages.set(aptPackage, { aptPackage });
	}

	return [...packages.values()];
};

const parseFactoryEnvironmentPackages = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const packages: string[] = [];

	for (const item of value) {
		if (typeof item !== "string") {
			continue;
		}

		const packageName = item.trim();

		if (!APT_PACKAGE_NAME_PATTERN.test(packageName) || seen.has(packageName)) {
			continue;
		}

		seen.add(packageName);
		packages.push(packageName);
	}

	return packages;
};

const buildInstallEnvironmentPackagesCommand = (
	packages: ConfiguredTaskEnvironmentPackage[],
) => {
	const packageLines = packages.map((pkg) => {
		if (!pkg.command) {
			return `set -- "$@" ${shellQuote(pkg.aptPackage)}`;
		}

		return [
			`if ! command -v ${shellQuote(pkg.command)} >/dev/null 2>&1; then`,
			`  set -- "$@" ${shellQuote(pkg.aptPackage)}`,
			"fi",
		].join("\n");
	});

	return [
		"set -e",
		"set --",
		...packageLines,
		'if [ "$#" -eq 0 ]; then',
		"  exit 0",
		"fi",
		"export DEBIAN_FRONTEND=noninteractive",
		'if [ "$(id -u)" -eq 0 ]; then',
		'  SUDO=""',
		"elif command -v sudo >/dev/null 2>&1; then",
		'  SUDO="sudo"',
		"else",
		'  printf "Root privileges or sudo are required to install environment packages.\\n" >&2',
		"  exit 1",
		"fi",
		"$SUDO apt-get update",
		'$SUDO apt-get install -y --no-install-recommends "$@"',
	].join("\n");
};

const cloneFactoryRepositories = async (
	sandbox: Sandbox,
	taskId: string,
	factory: FactoryWithRepositories,
	envs: Record<string, string>,
) => {
	const repositories = factory.repositories ?? [];

	if (repositories.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runOptionalSetupStep(
		taskId,
		"repositories",
		"Clone repositories",
		() =>
			sandbox.commands.run(
				[
					"set -e",
					`cd ${shellQuote(workspacePath)}`,
					buildGithubAuthNoticeCommand(),
					buildGithubAuthHeaderCommand(),
					...repositories.map((repository) =>
						buildCloneRepositoryCommand(
							repository,
							Boolean(envs.GITHUB_ACCESS_TOKEN),
						),
					),
				].join("\n"),
				{ timeoutMs: 10 * 60 * 1000, envs },
			),
		{ timeoutMs: 11 * 60 * 1000 },
	);

	await runOptionalSetupStep(
		taskId,
		"repository_env_files",
		"Write repository .env files",
		() =>
			writeRepositoryEnvFilesAndFingerprint(
				sandbox,
				repositories,
				workspacePath,
			),
		{ timeoutMs: 60_000 },
	);
};

const writeFactoryEnvironmentFiles = async (
	sandbox: Sandbox,
	taskId: string,
	factory: FactoryWithRepositories,
) => {
	const environmentFiles = getFactoryEnvironmentFiles(factory.environmentFiles);

	if (environmentFiles.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runSetupStep(
		taskId,
		"environment_files",
		"Write environment files",
		async () => {
			await Promise.all(
				environmentFiles.map(async (file) => {
					const filePath = `${workspacePath}/${file.path}`;
					const parentPath = filePath.slice(0, filePath.lastIndexOf("/"));

					await sandbox.commands.run(`mkdir -p ${shellQuote(parentPath)}`, {
						timeoutMs: 30_000,
					});
					await sandbox.files.write(filePath, file.content);
				}),
			);
		},
		{ timeoutMs: 60_000 },
	);
};

const getFactoryEnvironmentFiles = (
	files: EnvironmentFile[] | undefined,
): Array<{ path: string; content: string }> => {
	if (!files) {
		return [];
	}

	const environmentFiles = new Map<string, { path: string; content: string }>();

	for (const file of [...files].sort(
		(a, b) =>
			new Date(a.createdAt ?? 0).getTime() -
			new Date(b.createdAt ?? 0).getTime(),
	)) {
		const path = normalizeEnvironmentFilePath(file.path);

		if (!path) {
			continue;
		}

		environmentFiles.set(path, {
			path,
			content: file.content,
		});
	}

	return [...environmentFiles.values()];
};

const setupRepositoryGithubAuth = async (
	sandbox: Sandbox,
	taskId: string,
	factory: Factory,
) => {
	const envs = await getFactoryGithubAuthEnvs(factory);

	if (!envs.GITHUB_ACCESS_TOKEN) {
		return envs;
	}

	const validatedEnvs = await runOptionalSetupStep(
		taskId,
		"repository_auth",
		"Validate repository GitHub token",
		async () => {
			await validateGithubToken(sandbox, envs);
			return envs;
		},
		{ timeoutMs: 35_000 },
	);

	return validatedEnvs ?? { GIT_TERMINAL_PROMPT: "0" };
};

const buildGithubAuthNoticeCommand = () =>
	[
		'if [ -z "$GITHUB_ACCESS_TOKEN" ]; then',
		'  printf "No factory GitHub token configured; private GitHub repositories will fail to clone. Add one in factory settings.\\n" >&2',
		"fi",
	].join("\n");

const buildGithubAuthHeaderCommand = () =>
	[
		'if [ -n "$GITHUB_ACCESS_TOKEN" ]; then',
		'  GITHUB_AUTH_HEADER="$(printf "x-access-token:%s" "$GITHUB_ACCESS_TOKEN" | base64 | tr -d "\\n")"',
		"fi",
	].join("\n");

const getFactoryGithubAuthEnvs = async (
	factory: Factory,
): Promise<Record<string, string>> => {
	if (!factory.githubAccessTokenEncrypted) {
		return {
			GIT_TERMINAL_PROMPT: "0",
		};
	}

	const encryptionService = createEncryptionService(
		process.env.SECRET_ENCRYPTION_KEY ?? "",
	);
	const githubAccessToken = await encryptionService.decrypt(
		factory.githubAccessTokenEncrypted,
	);

	return {
		GITHUB_ACCESS_TOKEN: githubAccessToken,
		GH_TOKEN: githubAccessToken,
		GIT_TERMINAL_PROMPT: "0",
	};
};

const validateGithubToken = async (
	sandbox: Sandbox,
	envs: Record<string, string>,
) => {
	let authStderr = "";

	try {
		const ghAuth = await sandbox.commands.run(
			[
				"set +e",
				'login="$(gh api user --jq .login 2>&1)"',
				"status=$?",
				'if [ "$status" -ne 0 ]; then',
				'  printf "GitHub CLI auth failed while validating factory GitHub token:\\n%s\\n" "$login" >&2',
				'  exit "$status"',
				"fi",
				'printf "Authenticated GitHub CLI as %s\\n" "$login"',
			].join("\n"),
			{
				timeoutMs: 30_000,
				envs,
				onStdout: (data) => {
					console.log(data);
				},
				onStderr: (data) => {
					authStderr += data;
					console.error(data);
				},
			},
		);
		console.log(ghAuth);
	} catch (error) {
		throw new Error(
			[
				"GitHub CLI auth failed",
				authStderr.trim() || getErrorMessage(error),
			].join(": "),
		);
	}
};

const buildCloneRepositoryCommand = (
	repository: Repository,
	hasGithubAccessToken: boolean,
) => {
	const path = getRepositoryPath(repository);
	const githubCloneUrl = getGithubHttpsCloneUrl(repository.url);
	const cloneUrl = githubCloneUrl ?? repository.url.trim();
	const args = ["git"];

	if (githubCloneUrl && hasGithubAccessToken) {
		args.push(
			"-c",
			`'http.https://github.com/.extraheader=Authorization: Basic '"$GITHUB_AUTH_HEADER"`,
		);
	}

	args.push("clone");

	if (repository.branch?.trim()) {
		args.push("--branch", shellQuote(repository.branch.trim()));
	}

	args.push(shellQuote(cloneUrl), shellQuote(path));
	return args.join(" ");
};

const writeRepositoryEnvFiles = async (
	sandbox: Sandbox,
	repositories: Repository[],
	workspacePath: string,
) => {
	const envFileOperations = await Promise.all(
		repositories.map(async (repository) => {
			const contents = await buildRepositoryEnvFileContents(repository);

			return {
				path: `${workspacePath}/${getRepositoryPath(repository)}/.env`,
				contents,
			};
		}),
	);

	await Promise.all(
		envFileOperations.map((envFile) =>
			envFile.contents === undefined
				? sandbox.commands.run(`rm -f ${shellQuote(envFile.path)}`, {
						timeoutMs: 30_000,
					})
				: sandbox.files.write(envFile.path, envFile.contents),
		),
	);
};

const writeRepositoryEnvFilesAndFingerprint = async (
	sandbox: Sandbox,
	repositories: Repository[],
	workspacePath: string,
) => {
	await writeRepositoryEnvFiles(sandbox, repositories, workspacePath);
	await writeRepositorySecretsFingerprint(
		sandbox,
		workspacePath,
		getRepositorySecretsFingerprint(repositories),
	);
};

const syncRepositoryEnvFilesIfChanged = async (
	sandbox: Sandbox,
	taskId: string,
	factory: FactoryWithRepositories,
) => {
	const repositories = factory.repositories ?? [];

	if (repositories.length === 0) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);

	await runOptionalSetupStep(
		taskId,
		"repository_env_files",
		"Refresh repository .env files",
		async () => {
			const nextFingerprint = getRepositorySecretsFingerprint(repositories);
			const currentFingerprint = await readRepositorySecretsFingerprint(
				sandbox,
				workspacePath,
			);

			if (currentFingerprint === nextFingerprint) {
				return;
			}

			await writeRepositoryEnvFilesAndFingerprint(
				sandbox,
				repositories,
				workspacePath,
			);
		},
		{ timeoutMs: 60_000 },
	);
};

const readRepositorySecretsFingerprint = async (
	sandbox: Sandbox,
	workspacePath: string,
) => {
	try {
		return (
			await sandbox.files.read(
				`${workspacePath}/${REPOSITORY_SECRETS_FINGERPRINT_PATH}`,
			)
		).trim();
	} catch {
		return undefined;
	}
};

const writeRepositorySecretsFingerprint = async (
	sandbox: Sandbox,
	workspacePath: string,
	fingerprint: string,
) => {
	await sandbox.commands.run(
		`mkdir -p ${shellQuote(`${workspacePath}/.factoryplane`)}`,
		{ timeoutMs: 30_000 },
	);
	await sandbox.files.write(
		`${workspacePath}/${REPOSITORY_SECRETS_FINGERPRINT_PATH}`,
		`${fingerprint}\n`,
	);
};

const getRepositorySecretsFingerprint = (repositories: Repository[]) => {
	const payload = repositories
		.map((repository) => ({
			id: repository.id,
			path: getRepositoryPath(repository),
			secrets: getRepositorySecrets(repository.secrets)
				.map((secret) => ({
					id: secret.id,
					name: secret.name,
					valueEncrypted: secret.valueEncrypted,
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

const buildRepositoryEnvFileContents = async (repository: Repository) => {
	const secrets = getRepositorySecrets(repository.secrets);

	if (secrets.length === 0) {
		return undefined;
	}

	const encryptionService = createEncryptionService(
		process.env.SECRET_ENCRYPTION_KEY ?? "",
	);
	const lines = await Promise.all(
		secrets.map(async (secret) => {
			const value = await encryptionService.decrypt(secret.valueEncrypted);
			return `${secret.name}=${JSON.stringify(value)}`;
		}),
	);

	return `${lines.join("\n")}\n`;
};

const getRepositorySecrets = (value: unknown): RepositorySecret[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isRepositorySecret);
};

const isRepositorySecret = (value: unknown): value is RepositorySecret => {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.valueEncrypted === "string" &&
		/^[A-Za-z_][A-Za-z0-9_]*$/.test(value.name)
	);
};

const getGithubHttpsCloneUrl = (url: string) => {
	const trimmed = url.trim();
	const httpsMatch = trimmed.match(
		/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (httpsMatch?.[1] && httpsMatch[2]) {
		return `https://github.com/${httpsMatch[1]}/${httpsMatch[2].replace(/\.git$/i, "")}.git`;
	}

	const sshMatch = trimmed.match(
		/^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
	);

	if (sshMatch?.[1] && sshMatch[2]) {
		return `https://github.com/${sshMatch[1]}/${sshMatch[2].replace(/\.git$/i, "")}.git`;
	}

	return undefined;
};

const getRepositoryDefaultPath = (url: string) => {
	const lastSegment = url.split("/").pop()?.trim() || "repository";
	return (
		normalizeRepositoryPath(lastSegment.replace(/\.git$/i, "")) ?? "repository"
	);
};

const getRepositoryPath = (repository: Repository) => {
	return (
		normalizeRepositoryPath(repository.path) ??
		getRepositoryDefaultPath(repository.url)
	);
};

const normalizeRepositoryPath = (value: string | undefined) => {
	if (!value) {
		return undefined;
	}

	const segments = value
		.trim()
		.replaceAll("\\", "/")
		.split("/")
		.filter(
			(segment) => segment.length > 0 && segment !== "." && segment !== "..",
		);

	return segments.length > 0 ? segments.join("/") : undefined;
};

const normalizeEnvironmentFilePath = (value: string | undefined) => {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim().replaceAll("\\", "/");

	if (normalized.startsWith("/")) {
		return undefined;
	}

	const segments = normalized.split("/");

	if (
		segments.some(
			(segment) => segment.length === 0 || segment === "." || segment === "..",
		)
	) {
		return undefined;
	}

	return segments.length > 0 ? segments.join("/") : undefined;
};

const runFactorySetupScript = async (
	sandbox: Sandbox,
	taskId: string,
	factory: Factory,
	kind: FactorySetupScriptKind,
	script: string | undefined | null,
	envs: Record<string, string>,
) => {
	const scriptContent = script?.trim();

	if (!scriptContent) {
		return;
	}

	const workspacePath = await getSandboxWorkspacePath(sandbox);
	const scriptPath = `${FACTORYPLANE_SCRIPT_DIR}/${kind}-${taskId}.sh`;
	const title =
		kind === "new_task"
			? "Run new task setup script"
			: "Run new turn setup script";

	await runSetupStep(
		taskId,
		`factory_${kind}_setup_script`,
		title,
		async () => {
			await sandbox.commands.run(
				`mkdir -p ${shellQuote(FACTORYPLANE_SCRIPT_DIR)}`,
				{ timeoutMs: 30_000 },
			);
			await sandbox.files.write(scriptPath, scriptContent);

			return sandbox.commands.run(
				buildRunFactorySetupScriptCommand(scriptPath, workspacePath),
				{
					timeoutMs: FACTORY_SETUP_SCRIPT_TIMEOUT_MS,
					envs: {
						...envs,
						FACTORYPLANE_FACTORY_ID: factory.id,
						FACTORYPLANE_TASK_ID: taskId,
						FACTORYPLANE_WORKSPACE: workspacePath,
					},
				},
			);
		},
		{ timeoutMs: FACTORY_SETUP_SCRIPT_TIMEOUT_MS + 30_000 },
	);
};

const buildRunFactorySetupScriptCommand = (
	scriptPath: string,
	workspacePath: string,
) =>
	[
		"set -e",
		`chmod 700 ${shellQuote(scriptPath)}`,
		`cd ${shellQuote(workspacePath)}`,
		`IFS= read -r first_line < ${shellQuote(scriptPath)} || true`,
		'case "$first_line" in',
		"  '#!'*)",
		`    ${shellQuote(scriptPath)}`,
		"    ;;",
		"  *)",
		`    bash ${shellQuote(scriptPath)}`,
		"    ;;",
		"esac",
	].join("\n");

const runAgentExec = async (
	sandbox: Sandbox,
	task: Task,
	agent: Agent,
	factory: Factory,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	const provider = getAgentProvider(agent);
	const { envs, agentToken } = await setupRun(sandbox, task, agent, factory);
	const output = createAgentOutputHandler(task.id, provider);
	const command = await runSetupStep(
		task.id,
		provider === "cursor" ? "cursor_launch" : "codex_launch",
		options.resumeLast
			? `Resume ${getProviderLabel(provider)}`
			: `Start ${getProviderLabel(provider)}`,
		() =>
			sandbox.commands.run(
				buildAgentExecCommand(provider, task, prompt, options),
				{
					background: true,
					timeoutMs: 0,
					envs,
					onStdout: output.append,
					onStderr: (data) => {
						console.error(data);
					},
				},
			),
	);

	await updateTaskAgentPid(task.id, command.pid);

	let wasInterrupted = false;

	try {
		const result = await command.wait();
		console.log(result);

		if (!wasInterrupted) {
			await updateTaskStatus(task.id, "idle");
		}
	} catch (error) {
		const currentPid = await getTaskAgentPid(task.id);

		if (currentPid !== command.pid) {
			console.log("Agent process was interrupted", {
				taskId: task.id,
				pid: command.pid,
				error,
			});
			wasInterrupted = true;
			return;
		}

		throw error;
	} finally {
		await output.flush();
		if (!wasInterrupted) {
			await persistTaskDiff(sandbox, task).catch((error) => {
				console.error("Failed to persist task diff", {
					taskId: task.id,
					error,
				});
			});
		}
		await clearTaskAgentPid(task.id, command.pid);
		await postRun(task.id, agentToken);
		if (provider === "codex") {
			await syncAgentAuthFromSandbox(sandbox, agent.id);
		}
	}
};

const createTaskWorkspaceBaseline = async (
	sandbox: Sandbox,
	taskId: string,
) => {
	const workspacePath = await getSandboxWorkspacePath(sandbox);
	const baselinePath = getTaskBaselinePath(taskId);

	await sandbox.commands.run(
		[
			"set -e",
			buildReplaceDirectoryFunction(),
			`replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(baselinePath)}`,
		].join("\n"),
		{ timeoutMs: 120_000 },
	);

	return workspacePath;
};

const persistTaskDiff = async (sandbox: Sandbox, task: Task) => {
	const workspacePath =
		typeof task.diffWorkspacePath === "string" &&
		task.diffWorkspacePath.length > 0
			? task.diffWorkspacePath
			: await getSandboxWorkspacePath(sandbox);
	const baselinePath = getTaskBaselinePath(task.id);

	const hasBaseline = await sandbox.commands.run(
		`test -d ${shellQuote(baselinePath)} && printf yes || printf no`,
		{ timeoutMs: 30_000 },
	);

	if (hasBaseline.stdout.trim() !== "yes") {
		console.warn("Task diff baseline missing; recreating baseline", {
			taskId: task.id,
			baselinePath,
		});
		const nextWorkspacePath = await createTaskWorkspaceBaseline(
			sandbox,
			task.id,
		);
		await db.transact(
			taskTx(task.id).update({
				diffWorkspacePath: nextWorkspacePath,
			}),
		);
		return;
	}

	const patch = await generateTaskPatch(sandbox, task.id, workspacePath);
	const latestDiffPath = `tasks/${task.id}/latest.patch`;
	const patchBuffer = Buffer.from(patch, "utf8");
	const { data: file } = await db.storage.uploadFile(
		latestDiffPath,
		patchBuffer,
		{
			contentType: DIFF_STORAGE_CONTENT_TYPE,
			contentDisposition: `inline; filename="${task.id}.patch"`,
		},
	);

	await db.transact(
		taskTx(task.id)
			.update({
				diffWorkspacePath: workspacePath,
				latestDiffPath,
				latestDiffGeneratedAt: new Date().toISOString(),
				latestDiffBytes: patchBuffer.byteLength,
			})
			.link({ latestDiffFile: file.id }),
	);
};

const generateTaskPatch = async (
	sandbox: Sandbox,
	taskId: string,
	workspacePath: string,
) => {
	const baselinePath = getTaskBaselinePath(taskId);
	const workPath = `${DIFF_WORK_ROOT}/${taskId}`;
	const repoPath = `${workPath}/repo`;
	const result = await sandbox.commands.run(
		[
			"set -e",
			buildReplaceDirectoryFunction(),
			`rm -rf ${shellQuote(workPath)}`,
			`mkdir -p ${shellQuote(repoPath)}`,
			`replace_factoryplane_dir ${shellQuote(baselinePath)} ${shellQuote(repoPath)}`,
			`cd ${shellQuote(repoPath)}`,
			"git init -q",
			"git config user.email factoryplane@example.com",
			"git config user.name Factoryplane",
			"git add -f -A",
			"git commit --allow-empty -qm baseline",
			`replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(repoPath)}`,
			"git add -f -A",
			"git diff --cached --binary --full-index HEAD",
		].join("\n"),
		{ timeoutMs: 120_000 },
	);

	return result.stdout;
};

const getSandboxWorkspacePath = async (sandbox: Sandbox) => {
	const result = await sandbox.commands.run("pwd -P", { timeoutMs: 30_000 });
	const workspacePath = result.stdout.trim();

	if (!workspacePath) {
		throw new Error("Failed to resolve sandbox workspace path");
	}

	return workspacePath;
};

const getTaskBaselinePath = (taskId: string) => {
	return `${DIFF_BASELINE_ROOT}/${taskId}`;
};

const buildReplaceDirectoryFunction = () => {
	const rsyncExcludes = SANDBOX_DIFF_EXCLUDES.map(
		(pattern) => `--exclude ${shellQuote(pattern)}`,
	).join(" ");
	const tarExcludes = SANDBOX_DIFF_EXCLUDES.map(
		(pattern) => `--exclude=${shellQuote(pattern)}`,
	).join(" ");

	return `
replace_factoryplane_dir() {
	src="$1"
	dest="$2"
	mkdir -p "$dest"
	if command -v rsync >/dev/null 2>&1; then
		rsync -a --delete ${rsyncExcludes} "$src"/ "$dest"/
	else
		find "$dest" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
		tar -C "$src" ${tarExcludes} -cf - . | tar -C "$dest" -xf -
	fi
}
`;
};

const setupRun = async (
	sandbox: Sandbox,
	task: Task,
	agent: Agent,
	factory: Factory,
) => {
	const agentToken = randomUUID();
	await db.transact(
		taskTx(task.id).update({
			agentToken,
		}),
	);

	const envs: Record<string, string> = {
		FACTORYPLANE_AUTH_TOKEN: agentToken,
	};

	if (getAgentProvider(agent) === "cursor") {
		Object.assign(envs, getCursorAuthEnvs(agent));
	}

	try {
		await runOptionalSetupStep(
			task.id,
			"github_auth",
			"Validate GitHub token",
			async () => {
				const githubEnvs = await getFactoryGithubAuthEnvs(factory);

				if (!githubEnvs.GITHUB_ACCESS_TOKEN) {
					throw new Error(
						`Factory ${factory.id} is missing GitHub access token`,
					);
				}

				Object.assign(envs, githubEnvs);
				await validateGithubToken(sandbox, envs);
			},
		);

		await runFactorySetupScript(
			sandbox,
			task.id,
			factory,
			"new_turn",
			factory.newTurnSetupScript,
			envs,
		);
	} catch (error) {
		await clearTaskAgentToken(task.id, agentToken);
		throw error;
	}

	return { envs, agentToken };
};

const postRun = async (taskId: string, agentToken: string) => {
	await clearTaskAgentToken(taskId, agentToken);
};

const buildAgentExecCommand = (
	provider: AgentProvider,
	task: Task,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	if (provider === "cursor") {
		return buildCursorExecCommand(task, prompt, options);
	}

	return buildCodexExecCommand(task, prompt, options);
};

const buildCodexExecCommand = (
	task: Task,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	const model = getTaskAgentModel(task);
	const reasoningEffort = getTaskAgentReasoningEffort(task);
	const speedConfigOverrides = getCodexSpeedConfigOverrides(
		getTaskAgentSpeed(task.agentSpeed),
	);
	const args = [
		"codex exec",
		"--json",
		"--yolo",
		`--model ${shellQuote(model)}`,
		`-c ${shellQuote(`model_reasoning_effort=${reasoningEffort}`)}`,
		...speedConfigOverrides.map((override) => `-c ${shellQuote(override)}`),
		"--skip-git-repo-check",
	];

	if (options.resumeLast) {
		args.push("resume --last");
	} else {
		args.push(
			`-c ${shellQuote(formatCodexDeveloperInstructionsConfig(getCodexDeveloperInstructions()))}`,
		);
	}

	args.push(shellQuote(prompt));
	return args.join(" ");
};

const buildCursorExecCommand = (
	task: Task,
	prompt: string,
	options: RunCodexExecOptions = {},
) => {
	const args = ["cursor-agent", "-p", "--force", "--output-format stream-json"];
	const model = task.agentModel?.trim();

	if (model) {
		args.push(`--model ${shellQuote(model)}`);
	}

	if (options.resumeLast) {
		args.push("--resume");
	}

	args.push(shellQuote(prompt));
	return [getCursorPathPrefix(), args.join(" ")].join("\n");
};

const getTaskAgentModel = (task: Task) => {
	return task.agentModel ?? DEFAULT_CODEX_MODEL;
};

const getTaskAgentReasoningEffort = (task: Task) => {
	const effort = task.agentReasoningEffort ?? DEFAULT_CODEX_REASONING_EFFORT;
	const isValid = CODEX_REASONING_EFFORT_OPTIONS.some(
		(option) => option.value === effort,
	);

	return isValid ? effort : DEFAULT_CODEX_REASONING_EFFORT;
};

const killTaskAgentProcess = async (sandbox: Sandbox, task: Task) => {
	if (typeof task.agentPid !== "number") {
		return;
	}

	try {
		const killed = await sandbox.commands.kill(task.agentPid);
		console.log("Killed previous agent process", {
			taskId: task.id,
			pid: task.agentPid,
			killed,
		});
	} catch (error) {
		console.log("Failed to kill previous agent process", {
			taskId: task.id,
			pid: task.agentPid,
			error,
		});
	}

	await clearTaskAgentPid(task.id, task.agentPid);
};

const updateTaskAgentPid = async (taskId: string, agentPid: number) => {
	await db.transact(
		taskTx(taskId).update({
			agentPid,
		}),
	);
};

const clearTaskAgentPid = async (taskId: string, agentPid: number) => {
	const currentPid = await getTaskAgentPid(taskId);

	if (currentPid !== agentPid) {
		return;
	}

	await db.transact(
		taskTx(taskId).update({
			agentPid: undefined,
		}),
	);
};

const getTaskAgentPid = async (taskId: string) => {
	const currentTask = await db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
			},
		})
		.then((result) => result.tasks[0]);

	return currentTask?.agentPid;
};

const clearTaskAgentToken = async (taskId: string, agentToken: string) => {
	const currentToken = await getTaskAgentToken(taskId);

	if (currentToken !== agentToken) {
		return;
	}

	await db.transact(
		taskTx(taskId).update({
			agentToken: undefined,
		}),
	);
};

const getTaskAgentToken = async (taskId: string) => {
	const currentTask = await db
		.query({
			tasks: {
				$: {
					where: {
						id: taskId,
					},
				},
			},
		})
		.then((result) => result.tasks[0]);

	return currentTask?.agentToken;
};

const createAgentOutputHandler = (taskId: string, provider: AgentProvider) => {
	let buffer = "";

	const append = async (chunk: string) => {
		buffer += chunk;

		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? "";

		await persistCodexEvents(taskId, parseAgentLines(lines, provider));
	};

	const flush = async () => {
		const finalLine = buffer.trim();
		buffer = "";

		if (!finalLine) {
			return;
		}

		const events = parseAgentLines([finalLine], provider);
		await persistCodexEvents(taskId, events);
	};

	return { append, flush };
};

const parseAgentLines = (lines: string[], provider: AgentProvider) => {
	const events: CodexEvent[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		events.push(parseAgentEvent(line, provider));
	}

	return events;
};

const parseAgentEvent = (line: string, provider: AgentProvider): CodexEvent => {
	try {
		const data = JSON.parse(line) as unknown;

		if (!isRecord(data)) {
			return {
				type: `${provider}.event`,
				data: {
					value: data,
					raw: line,
				},
			};
		}

		const rawType =
			typeof data.type === "string" && data.type.length > 0
				? data.type
				: "event";
		const typePrefix = `${provider}.`;

		return {
			type: rawType.startsWith(typePrefix) ? rawType : `${provider}.${rawType}`,
			data,
		};
	} catch (error) {
		return {
			type: `${provider}.unparsed`,
			data: {
				raw: line,
				error: error instanceof Error ? error.message : String(error),
			},
		};
	}
};

const persistCodexEvents = async (taskId: string, events: CodexEvent[]) => {
	if (events.length === 0) {
		return;
	}

	await db.transact(
		events.map((event) => {
			const eventTx = db.tx.events[randomUUID()];

			if (!eventTx) {
				throw new Error("Failed to create InstantDB event transaction");
			}

			return eventTx
				.create({
					type: event.type,
					data: event.data,
					createdAt: new Date().toISOString(),
				})
				.link({ task: taskId });
		}),
	);
};

const runSetupStep = async <T>(
	taskId: string,
	step: string,
	title: string,
	action: () => Promise<T>,
	options: SetupStepOptions = {},
) => {
	console.log("Setup step started", { taskId, step, title });
	await persistFactoryplaneEvent(taskId, "factoryplane.setup_step_started", {
		step,
		title,
		status: "started",
	});

	try {
		const result = await runWithTimeout(action(), title, options.timeoutMs);
		console.log("Setup step completed", { taskId, step, title });
		await persistFactoryplaneEvent(
			taskId,
			"factoryplane.setup_step_completed",
			{
				step,
				title,
				status: "completed",
			},
		);
		return result;
	} catch (error) {
		console.error("Setup step failed", {
			taskId,
			step,
			title,
			error,
		});
		await persistFactoryplaneEvent(taskId, "factoryplane.setup_step_failed", {
			step,
			title,
			status: "failed",
			error: getErrorMessage(error),
		});
		throw error;
	}
};

const runWithTimeout = async <T>(
	promise: Promise<T>,
	label: string,
	timeoutMs: number | undefined,
) => {
	if (!timeoutMs) {
		return promise;
	}

	let timeout: NodeJS.Timeout | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeout) {
			clearTimeout(timeout);
		}
	}
};

const runOptionalSetupStep = async <T>(
	taskId: string,
	step: string,
	title: string,
	action: () => Promise<T>,
	options: SetupStepOptions = {},
) => {
	try {
		return await runSetupStep(taskId, step, title, action, options);
	} catch (error) {
		console.warn("Optional setup step failed", {
			taskId,
			step,
			error,
		});
		return undefined;
	}
};

const persistFactoryplaneEvent = async (
	taskId: string,
	type: string,
	data: Record<string, unknown>,
) => {
	await db.transact(
		eventTx(randomUUID())
			.create({
				type,
				data,
				createdAt: new Date().toISOString(),
			})
			.link({ task: taskId }),
	);
};

const getErrorMessage = (error: unknown) => {
	return error instanceof Error ? error.message : String(error);
};

const getStringDataValue = (data: unknown, key: string) => {
	if (!isRecord(data)) {
		return undefined;
	}

	const value = data[key];
	return typeof value === "string" ? value : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const shellQuote = (value: string) => {
	return `'${value.replaceAll("'", "'\\''")}'`;
};
