import { getAppPublicUrl } from "@/lib/app-url";
import { factoryWorkerTokenHeader } from "@/lib/factory/worker-api-auth";
import {
  type AppSandbox,
  createCheckpoint,
  runSandboxCommand,
  type SandboxCommandResult,
  type SandboxStreamChunk,
  streamSandboxCommand,
} from "@/lib/sandbox/service";

export type { SandboxCommandResult };

export const sandboxWorkspace = "/home/user/workspace";

export const sandboxFactoryDir = "/home/user/.factoryplane";

const factoryDir = sandboxFactoryDir;
const factoryBinDir = `${factoryDir}/bin`;
const codexNpmPrefix = `${factoryDir}/npm-global`;
const codexBinDir = `${codexNpmPrefix}/bin`;
const codexAuthArchivePath = `${factoryDir}/codex-auth.tgz`;
const codexHomeArchivePath = `${factoryDir}/codex-home.tgz`;
const codexModel = "gpt-5.5";
const factoryWorkerInstructions = `You are running inside a Software Factory worker sandbox.

You have access to the repository workspace at /home/user/workspace.
When a local web server or previewable service is useful, start it inside the sandbox and run factory expose <port>. The factory will create a public URL and show it in the worker UI.
Use factory ports to inspect currently exposed ports and factory delete-port <port> to remove a public URL.
When you need an external MCP server or integration that is not currently available, run factory request-mcp --name <name> --url <http-mcp-url> --auth <oauth|bearer_token> with optional --scopes and --reason. The factory owner will complete connection from the worker chat.
Do not ask for or handle sandbox provider API keys. The factory CLI authenticates with FACTORY_WORKER_API_TOKEN; do not print or expose that token.
`;

export async function createDefaultFactoryCheckpoint({
  codexAuthJson,
  factoryId,
  sandbox,
}: {
  codexAuthJson?: string;
  factoryId: string;
  sandbox: AppSandbox;
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
  prompt,
  resume,
  sandbox,
  secrets,
  sessionId,
  workerId,
}: {
  imagePaths?: string[];
  mcpConfig?: {
    gatewayUrl: string;
    token: string;
  };
  prompt: string;
  resume: boolean;
  sandbox: AppSandbox;
  secrets?: Record<string, string>;
  sessionId?: string;
  workerId: string;
}) {
  return streamSandboxCommand(
    sandbox,
    createCodexExecCommand({
      imagePaths,
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
  prompt,
  resume,
  secrets = {},
  sessionId,
  workerId,
}: {
  imagePaths?: string[];
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
  const factoryCliPath = `${factoryBinDir}/factory`;
  const factoryCliScript = createFactoryCliScript(getAppPublicUrl());
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
  const imageArgs = imagePaths
    .map((imagePath) => `--image ${shellQuote(imagePath)}`)
    .join(" ");
  const codexCommand = resume
    ? [
        "codex exec resume",
        sessionId ? shellQuote(sessionId) : "--last",
        "--model",
        shellQuote(codexModel),
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
        imageArgs,
        mcpArgs,
        "--dangerously-bypass-approvals-and-sandbox",
        "--skip-git-repo-check",
        "--json",
        "-",
      ].join(" ");

  return [
    `mkdir -p ${shellQuote(workerDir)}`,
    `mkdir -p ${shellQuote(factoryBinDir)}`,
    `printf %s ${shellQuote(factoryCliScript)} > ${shellQuote(factoryCliPath)} && chmod +x ${shellQuote(factoryCliPath)}`,
    `rm -f ${shellQuote(pidPath)}`,
    `printf %s ${shellQuote(workerPrompt)} > ${shellQuote(promptPath)}`,
    secretEnv
      ? `printf %s ${shellQuote(secretEnv)} > ${shellQuote(secretsPath)} && chmod 600 ${shellQuote(secretsPath)}`
      : `rm -f ${shellQuote(secretsPath)}`,
    `setsid /bin/bash -lc ${shellQuote(`${createCodexPathExport()} ${secretEnv ? `. ${shellQuote(secretsPath)} && ` : ""}${mcpEnv ? `${mcpEnv} && ` : ""}cd ${shellQuote(sandboxWorkspace)} && ${codexCommand} < ${shellQuote(promptPath)}`)} &`,
    "pid=$!",
    `echo "$pid" > ${shellQuote(pidPath)}`,
    'wait "$pid"',
  ].join("\n");
}

function createCodexPathExport() {
  return `export PATH=${shellQuote(factoryBinDir)}:${shellQuote(codexBinDir)}:$PATH;`;
}

function createFactoryCliScript(factoryApiBaseUrl: string) {
  return `#!/usr/bin/env node
const factoryApiBaseUrl = process.env.FACTORY_API_URL || ${JSON.stringify(factoryApiBaseUrl)};
const factoryWorkerApiToken = process.env.FACTORY_WORKER_API_TOKEN || "";
const factoryWorkerTokenHeader = ${JSON.stringify(factoryWorkerTokenHeader)};

function usage() {
  console.error(\`Usage:
  factory expose <port> [--bearer-token] [--basic-auth]
  factory ports
  factory delete-port <port>
  factory request-mcp --name <name> --url <url> [--auth oauth|bearer_token] [--scopes <scopes>] [--reason <reason>]\`);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(\`\${name} requires a value\`);
  }
  return value;
}

function hasFlag(args, name) {
  return args.includes(name);
}

async function request(path, options = {}) {
  const response = await fetch(\`\${factoryApiBaseUrl}\${path}\`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(factoryWorkerApiToken ? { [factoryWorkerTokenHeader]: factoryWorkerApiToken } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || \`Factory API request failed: \${response.status}\`);
  }

  return body;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === "expose") {
    const port = Number(args[0]);
    const result = await request("/api/worker/ports", {
      method: "POST",
      body: JSON.stringify({
        basicAuth: hasFlag(args, "--basic-auth"),
        bearerToken: hasFlag(args, "--bearer-token"),
        port,
      }),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "ports") {
    const result = await request("/api/worker/ports");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "delete-port") {
    const port = Number(args[0]);
    const result = await request(\`/api/worker/ports/\${port}\`, {
      method: "DELETE",
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "request-mcp") {
    const result = await request("/api/worker/mcp-requests", {
      method: "POST",
      body: JSON.stringify({
        authType: readOption(args, "--auth") || "oauth",
        name: readOption(args, "--name"),
        reason: readOption(args, "--reason"),
        scopes: readOption(args, "--scopes"),
        url: readOption(args, "--url"),
      }),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
`;
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
