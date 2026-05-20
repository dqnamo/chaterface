import { Box, type ExecStreamChunk } from "@upstash/box";

export type BoxCommandResult = {
  exitCode: number;
  output: string;
  success: boolean;
};

export const boxWorkspace = "/workspace/home";

const factoryDir = `${boxWorkspace}/.factory`;
const codexNpmPrefix = `${factoryDir}/npm-global`;
const codexBinDir = `${codexNpmPrefix}/bin`;
const codexAuthArchivePath = `${factoryDir}/codex-auth.tgz`;
const codexHomeArchivePath = `${factoryDir}/codex-home.tgz`;
const codexModel = "gpt-5.5";
const factoryWorkerInstructions = `You are running inside a Software Factory worker sandbox.

You have access to the repository workspace at /workspace/home.
When a local web server or previewable service is useful, start it inside the sandbox and use the factory MCP tool factory__expose_port with the listening port. The factory will create a public URL and show it in the worker UI.
Use factory__list_public_urls to inspect currently exposed ports and factory__delete_public_url to remove a public URL.
When you need an external MCP server or integration that is not currently available, use factory__request_mcp_connection with the server name, HTTP MCP URL, auth type, optional scopes, and a short reason. The factory owner will complete connection from the worker chat.
Do not ask for or handle the Upstash Box API key. Factory MCP tools perform host-side operations for you.
`;

export async function createFactoryBox(factoryId: string) {
  return Box.create({
    apiKey: process.env.UPSTASH_BOX_API_KEY,
    name: `factory-${factoryId.slice(0, 8)}-default`,
    runtime: "node",
  });
}

export async function getBox(boxId: string) {
  return Box.get(boxId, {
    apiKey: process.env.UPSTASH_BOX_API_KEY,
  });
}

export async function createWorkerBox({
  factoryId,
  snapshotId,
  workerId,
}: {
  factoryId: string;
  snapshotId: string;
  workerId: string;
}) {
  return Box.fromSnapshot(snapshotId, {
    apiKey: process.env.UPSTASH_BOX_API_KEY,
    name: `factory-${factoryId.slice(0, 8)}-worker-${workerId.slice(0, 8)}`,
    runtime: "node",
  });
}

export async function createDefaultFactorySnapshot({
  box,
  codexAuthJson,
  factoryId,
}: {
  box: Box;
  codexAuthJson?: string;
  factoryId: string;
}) {
  const preparedAt = new Date().toISOString();
  const marker = JSON.stringify({ factoryId, preparedAt });
  const commands = [
    `mkdir -p ${shellQuote(factoryDir)}`,
    `printf %s ${shellQuote(marker)} > ${shellQuote(`${factoryDir}/factory.json`)}`,
  ];

  if (codexAuthJson) {
    commands.push(
      'mkdir -p "$HOME/.codex"',
      `printf %s ${shellQuote(codexAuthJson)} > "$HOME/.codex/auth.json"`,
      'chmod 600 "$HOME/.codex/auth.json"',
    );
  }

  const result = await runBoxCommand(box, commands.join(" && "), 30_000);

  if (!result.success) {
    throw new Error(
      `Could not prepare factory snapshot: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }

  return box.snapshot({ name: `factory-${factoryId.slice(0, 8)}-default` });
}

export async function runBoxCommand(
  box: Box,
  command: string,
  timeoutMs?: number,
): Promise<BoxCommandResult> {
  const wrapped = createBoxCommand(command, timeoutMs);
  const run = await box.exec.command(wrapped);
  const output = String(run.result ?? "");
  const exitCode = run.exitCode ?? (run.status === "completed" ? 0 : 1);

  return {
    exitCode,
    output,
    success: run.status === "completed" && exitCode === 0,
  };
}

export async function ensureLatestCodexOnBox(box: Box) {
  const result = await runBoxCommand(
    box,
    [
      `mkdir -p ${shellQuote(codexBinDir)}`,
      `npm install -g --prefix ${shellQuote(codexNpmPrefix)} --cache ${shellQuote(`${factoryDir}/npm-cache`)} @openai/codex@latest`,
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

export async function ensureCodexCli(box: Box) {
  await ensureLatestCodexOnBox(box);
}

export async function snapshotCodexHome(box: Box, factoryId: string) {
  const archiveResult = await runBoxCommand(
    box,
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

  return box.snapshot({ name: `factory-${factoryId.slice(0, 8)}-codex-home` });
}

export async function restoreCodexHome(box: Box) {
  const result = await runBoxCommand(
    box,
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
  box,
  mcpConfig,
  prompt,
  resume,
  secrets,
  sessionId,
  workerId,
}: {
  box: Box;
  mcpConfig?: {
    gatewayUrl: string;
    token: string;
  };
  prompt: string;
  resume: boolean;
  secrets?: Record<string, string>;
  sessionId?: string;
  workerId: string;
}) {
  return box.exec.stream(
    createCodexExecCommand({
      mcpConfig,
      prompt,
      resume,
      secrets,
      sessionId,
      workerId,
    }),
  );
}

export async function waitForWorkerPid({
  box,
  workerId,
}: {
  box: Box;
  workerId: string;
}) {
  const pidPath = getWorkerPidPath(workerId);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await runBoxCommand(
      box,
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

export async function killWorkerPid({ box, pid }: { box: Box; pid: number }) {
  await runBoxCommand(
    box,
    [
      `kill -TERM -${pid} 2>/dev/null || kill -TERM ${pid} 2>/dev/null || true`,
      "sleep 1",
      `kill -KILL -${pid} 2>/dev/null || kill -KILL ${pid} 2>/dev/null || true`,
    ].join("; "),
    5_000,
  );
}

export function getExecStreamChunkText(chunk: ExecStreamChunk) {
  return chunk.type === "output" ? chunk.data : "";
}

function createBoxCommand(command: string, timeoutMs?: number) {
  const timeoutSeconds = timeoutMs
    ? Math.max(1, Math.ceil(timeoutMs / 1_000))
    : null;
  const timeoutPrefix = timeoutSeconds ? `timeout ${timeoutSeconds}s ` : "";

  return [
    `cd ${shellQuote(boxWorkspace)}`,
    `${timeoutPrefix}sh -lc ${shellQuote(command)}`,
  ].join(" && ");
}

function createCodexExecCommand({
  mcpConfig,
  prompt,
  resume,
  secrets = {},
  sessionId,
  workerId,
}: {
  mcpConfig?: {
    gatewayUrl: string;
    token: string;
  };
  prompt: string;
  resume: boolean;
  secrets?: Record<string, string>;
  sessionId?: string;
  workerId: string;
}) {
  const workerDir = `${factoryDir}/workers/${workerId}`;
  const pidPath = getWorkerPidPath(workerId);
  const promptPath = `${workerDir}/prompt.txt`;
  const workerPrompt = `${factoryWorkerInstructions}\n\nUser task:\n${prompt}`;
  const secretsPath = `${factoryDir}/secrets.env`;
  const secretEnv = createSecretsEnv(secrets);
  const mcpEnv = mcpConfig
    ? `export FACTORY_MCP_WORKER_TOKEN=${shellQuote(mcpConfig.token)}`
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
  const codexCommand = resume
    ? [
        "codex exec resume",
        sessionId ? shellQuote(sessionId) : "--last",
        "--model",
        shellQuote(codexModel),
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
    `setsid sh -lc ${shellQuote(`${createCodexPathExport()} ${secretEnv ? `. ${shellQuote(secretsPath)} && ` : ""}${mcpEnv ? `${mcpEnv} && ` : ""}cd ${shellQuote(boxWorkspace)} && ${codexCommand} < ${shellQuote(promptPath)}`)} &`,
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
