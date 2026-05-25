import {
  type AppSandbox,
  createCheckpoint,
  runSandboxCommand,
  type SandboxCommandResult,
  type SandboxStreamChunk,
  streamSandboxCommand,
} from "@/lib/sandbox/service";
import {
  defaultWorkerModel,
  defaultWorkerReasoningLevel,
  defaultWorkerSpeed,
  normalizeWorkerModel,
  normalizeWorkerReasoningLevel,
  normalizeWorkerSpeed,
  type WorkerReasoningLevel,
  type WorkerSpeed,
} from "./worker-options";

export type { SandboxCommandResult };

export const sandboxWorkspace = "/workspace/home";

export const sandboxFactoryDir = `${sandboxWorkspace}/.factoryplane`;

const factoryDir = sandboxFactoryDir;
const codexNpmPrefix = `${factoryDir}/npm-global`;
const codexBinDir = `${codexNpmPrefix}/bin`;
const codexAuthArchivePath = `${factoryDir}/codex-auth.tgz`;
const codexHomeArchivePath = `${factoryDir}/codex-home.tgz`;
const factoryWorkerInstructions = `You are running inside a Software Factory worker sandbox.

You have access to the repository workspace at /workspace/home.
When a local web server or previewable service is useful, start it as a long-lived background process, then expose it with the worker API. For Vite, use:
nohup npm run dev -- --host 0.0.0.0 > /tmp/factory-preview-5173.log 2>&1 &
Expose it with:
curl -sS -X POST "$FACTORY_API_URL/api/worker/ports" -H "Content-Type: application/json" -H "$FACTORY_WORKER_TOKEN_HEADER: $FACTORY_WORKER_API_TOKEN" -d '{"port":5173}'
The response includes url, origin, message, and allowedOriginsHint. Save the url, share it with the user, and if the app enforces host/origin checks add the returned origin to the app's allowed hosts or allowed origins configuration.
The factory will create a public URL and show it in the worker UI. You can pass "basicAuth": true or "bearerToken": true in the JSON body when the preview should require generated auth.
List exposed ports with:
curl -sS "$FACTORY_API_URL/api/worker/ports" -H "$FACTORY_WORKER_TOKEN_HEADER: $FACTORY_WORKER_API_TOKEN"
Delete a public URL with:
curl -sS -X DELETE "$FACTORY_API_URL/api/worker/ports/5173" -H "$FACTORY_WORKER_TOKEN_HEADER: $FACTORY_WORKER_API_TOKEN"
When you need an external MCP server or integration that is not currently available, request it with:
curl -sS -X POST "$FACTORY_API_URL/api/worker/mcp-requests" -H "Content-Type: application/json" -H "$FACTORY_WORKER_TOKEN_HEADER: $FACTORY_WORKER_API_TOKEN" -d '{"name":"GitHub","url":"https://example.com/mcp","authType":"oauth","reason":"Needed for this task"}'
Do not print or expose FACTORY_WORKER_API_TOKEN, and do not ask for or handle sandbox provider API keys.
`;

export async function createDefaultFactoryCheckpoint({
  factoryId,
  sandbox,
}: {
  factoryId: string;
  sandbox: AppSandbox;
}) {
  const preparedAt = new Date().toISOString();
  const marker = JSON.stringify({ factoryId, preparedAt });
  const commands = [
    `mkdir -p ${shellQuote(factoryDir)}`,
    `printf %s ${shellQuote(marker)} > ${shellQuote(`${factoryDir}/factory.json`)}`,
  ];

  const result = await runSandboxCommand(
    sandbox,
    commands.join(" && "),
    30_000,
  );

  if (!result.success) {
    throw new Error(
      `Could not prepare factory checkpoint: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }

  return createCheckpoint(sandbox, `factory-${factoryId.slice(0, 8)}-default`);
}

export async function installCodexAuthOnSandbox({
  codexAuthJson,
  sandbox,
}: {
  codexAuthJson: string;
  sandbox: AppSandbox;
}) {
  const result = await runSandboxCommand(
    sandbox,
    [
      'mkdir -p "$HOME/.codex"',
      `printf %s ${shellQuote(codexAuthJson)} > "$HOME/.codex/auth.json"`,
      'chmod 600 "$HOME/.codex/auth.json"',
    ].join(" && "),
    30_000,
  );

  if (!result.success) {
    throw new Error(
      `Could not install Codex auth: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }
}

export async function ensureLatestCodexOnSandbox(sandbox: AppSandbox) {
  const result = await runSandboxCommand(
    sandbox,
    [
      `mkdir -p ${shellQuote(codexBinDir)}`,
      `npm install -g --prefix ${shellQuote(codexNpmPrefix)} --cache ${shellQuote(`${factoryDir}/npm-cache`)} --registry=https://registry.npmjs.org/ @openai/codex@latest`,
      `${createCodexPathExport()} command -v codex && codex --version`,
    ].join(" && "),
    120_000,
  );

  if (!result.success) {
    throw new Error(
      `Could not install latest Codex CLI: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }

  return cleanCommandOutput(result.output);
}

export async function ensureCodexCli(sandbox: AppSandbox) {
  await ensureLatestCodexOnSandbox(sandbox);
}

export async function snapshotCodexHome(
  sandbox: AppSandbox,
  factoryId: string,
) {
  const archiveResult = await runSandboxCommand(
    sandbox,
    [
      `mkdir -p ${shellQuote(factoryDir)}`,
      `paths=""`,
      `if test -d "$HOME/.codex"; then paths="$paths .codex"; fi`,
      `if test -d "$HOME/.agents"; then paths="$paths .agents"; fi`,
      `if test -z "$paths"; then echo "Missing Codex home files"; exit 1; fi`,
      `tar -C "$HOME" -czf ${shellQuote(codexHomeArchivePath)} $paths`,
    ].join(" && "),
    30_000,
  );

  if (!archiveResult.success) {
    throw new Error(
      `Could not archive Codex home: ${
        cleanCommandOutput(archiveResult.output) || "No output"
      }`,
    );
  }

  return createCheckpoint(
    sandbox,
    `factory-${factoryId.slice(0, 8)}-codex-home`,
  );
}

export async function restoreCodexHome(sandbox: AppSandbox) {
  const result = await runSandboxCommand(
    sandbox,
    [
      `if test -f ${shellQuote(codexHomeArchivePath)}; then tar -C "$HOME" -xzf ${shellQuote(codexHomeArchivePath)}; elif test -f ${shellQuote(codexAuthArchivePath)}; then tar -C "$HOME" -xzf ${shellQuote(codexAuthArchivePath)}; elif test -d "$HOME/.codex"; then true; else echo "Missing Codex home archive"; exit 1; fi`,
      `test -d "$HOME/.codex"`,
    ].join(" && "),
    30_000,
  );

  if (!result.success) {
    throw new Error(
      `Codex home restore failed: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }
}

export async function streamCodexExec({
  imagePaths,
  mcpConfig,
  model = defaultWorkerModel,
  prompt,
  reasoningLevel = defaultWorkerReasoningLevel,
  resume,
  sandbox,
  secrets,
  sessionId,
  speed = defaultWorkerSpeed,
  workerId,
  workerApiConfig,
}: {
  imagePaths?: string[];
  mcpConfig?: {
    gatewayUrl: string;
    token: string;
  };
  model?: string;
  prompt: string;
  reasoningLevel?: string;
  resume: boolean;
  sandbox: AppSandbox;
  secrets?: Record<string, string>;
  sessionId?: string;
  speed?: string;
  workerId: string;
  workerApiConfig?: {
    apiUrl: string;
    token: string;
    tokenHeader: string;
  };
}) {
  return streamSandboxCommand(
    sandbox,
    createCodexExecCommand({
      imagePaths,
      mcpConfig,
      model,
      prompt,
      reasoningLevel,
      resume,
      secrets,
      sessionId,
      speed,
      workerId,
      workerApiConfig,
    }),
  );
}

export async function waitForWorkerPid({
  sandbox,
  workerId,
}: {
  sandbox: AppSandbox;
  workerId: string;
}) {
  const pidPath = getWorkerPidPath(workerId);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await runSandboxCommand(
      sandbox,
      `test -s ${shellQuote(pidPath)} && cat ${shellQuote(pidPath)}`,
      2_000,
    );
    const pid = Number.parseInt(result.output.trim(), 10);

    if (result.success && Number.isFinite(pid)) {
      return pid;
    }
  }

  return undefined;
}

export async function killWorkerPid({
  pid,
  sandbox,
}: {
  pid: number;
  sandbox: AppSandbox;
}) {
  await runSandboxCommand(
    sandbox,
    [
      `kill -TERM -${pid} 2>/dev/null || kill -TERM ${pid} 2>/dev/null || true`,
      "sleep 1",
      `kill -KILL -${pid} 2>/dev/null || kill -KILL ${pid} 2>/dev/null || true`,
    ].join("; "),
    5_000,
  );
}

export function getSandboxStreamChunkText(chunk: SandboxStreamChunk) {
  return chunk.type === "output" ? chunk.data : "";
}

function createCodexExecCommand({
  imagePaths = [],
  mcpConfig,
  model,
  prompt,
  reasoningLevel,
  resume,
  secrets = {},
  sessionId,
  speed,
  workerId,
  workerApiConfig,
}: {
  imagePaths?: string[];
  mcpConfig?: {
    gatewayUrl: string;
    token: string;
  };
  model?: string;
  prompt: string;
  reasoningLevel?: string;
  resume: boolean;
  secrets?: Record<string, string>;
  sessionId?: string;
  speed?: string;
  workerId: string;
  workerApiConfig?: {
    apiUrl: string;
    token: string;
    tokenHeader: string;
  };
}) {
  const workerDir = `${factoryDir}/workers/${workerId}`;
  const pidPath = getWorkerPidPath(workerId);
  const promptPath = `${workerDir}/prompt.txt`;
  const workerPrompt = `${factoryWorkerInstructions}\n\nUser task:\n${prompt}`;
  const secretsPath = `${factoryDir}/secrets.env`;
  const codexModel = normalizeWorkerModel(model);
  const codexReasoningLevel = normalizeWorkerReasoningLevel(reasoningLevel);
  const codexSpeed = normalizeWorkerSpeed({ model: codexModel, speed });
  const secretEnv = createSecretsEnv(secrets);
  const mcpEnv = mcpConfig
    ? `export FACTORY_MCP_WORKER_TOKEN=${shellQuote(mcpConfig.token)}`
    : "";
  const workerApiEnv = workerApiConfig
    ? [
        `export FACTORY_API_URL=${shellQuote(workerApiConfig.apiUrl)}`,
        `export FACTORY_WORKER_API_TOKEN=${shellQuote(workerApiConfig.token)}`,
        `export FACTORY_WORKER_TOKEN_HEADER=${shellQuote(workerApiConfig.tokenHeader)}`,
      ].join(" && ")
    : "";
  const mcpArgs = mcpConfig
    ? [
        "-c",
        shellQuote(`mcp_servers.factory.url="${mcpConfig.gatewayUrl}"`),
        "-c",
        shellQuote(
          'mcp_servers.factory.bearer_token_env_var="FACTORY_MCP_WORKER_TOKEN"',
        ),
      ].join(" ")
    : "";
  const imageArgs = imagePaths
    .map((imagePath) => `--image ${shellQuote(imagePath)}`)
    .join(" ");
  const speedArgs = createCodexSpeedArgs(codexSpeed);
  const reasoningLevelArgs = createCodexReasoningLevelArgs(codexReasoningLevel);
  const codexCommand = resume
    ? [
        "codex exec resume",
        sessionId ? shellQuote(sessionId) : "--last",
        "--model",
        shellQuote(codexModel),
        reasoningLevelArgs,
        speedArgs,
        imageArgs,
        mcpArgs,
        "--dangerously-bypass-approvals-and-sandbox",
        "--skip-git-repo-check",
        "--json",
        "-",
      ].join(" ")
    : [
        "codex exec",
        "--model",
        shellQuote(codexModel),
        reasoningLevelArgs,
        speedArgs,
        imageArgs,
        mcpArgs,
        "--dangerously-bypass-approvals-and-sandbox",
        "--skip-git-repo-check",
        "--json",
        "-",
      ].join(" ");

  return [
    `mkdir -p ${shellQuote(workerDir)}`,
    `rm -f ${shellQuote(pidPath)}`,
    `printf %s ${shellQuote(workerPrompt)} > ${shellQuote(promptPath)}`,
    secretEnv
      ? `printf %s ${shellQuote(secretEnv)} > ${shellQuote(secretsPath)} && chmod 600 ${shellQuote(secretsPath)}`
      : `rm -f ${shellQuote(secretsPath)}`,
    `setsid /bin/bash -lc ${shellQuote(`${createCodexPathExport()} ${secretEnv ? `. ${shellQuote(secretsPath)} && ` : ""}${workerApiEnv ? `${workerApiEnv} && ` : ""}${mcpEnv ? `${mcpEnv} && ` : ""}cd ${shellQuote(sandboxWorkspace)} && ${codexCommand} < ${shellQuote(promptPath)}`)} &`,
    "pid=$!",
    `echo "$pid" > ${shellQuote(pidPath)}`,
    'wait "$pid"',
  ].join("\n");
}

function createCodexPathExport() {
  return `export PATH=${shellQuote(codexBinDir)}:$PATH;`;
}

function getWorkerPidPath(workerId: string) {
  return `${factoryDir}/workers/${workerId}/codex.pid`;
}

function createCodexSpeedArgs(speed: WorkerSpeed) {
  if (speed !== "fast") {
    return [
      "-c",
      shellQuote("service_tier=null"),
      "-c",
      shellQuote("features.fast_mode=false"),
    ].join(" ");
  }

  return [
    "-c",
    shellQuote('service_tier="fast"'),
    "-c",
    shellQuote("features.fast_mode=true"),
  ].join(" ");
}

function createCodexReasoningLevelArgs(reasoningLevel: WorkerReasoningLevel) {
  return ["-c", shellQuote(`model_reasoning_effort="${reasoningLevel}"`)].join(
    " ",
  );
}

export function cleanCommandOutput(output: string) {
  return output
    .replace(/^data:\s?/gm, "")
    .replace(/^event:\s?.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function createSecretsEnv(secrets: Record<string, string>) {
  return Object.entries(secrets)
    .map(([name, value]) => `export ${name}=${shellQuote(value)}`)
    .join("\n");
}
