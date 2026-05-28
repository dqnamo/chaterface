import "server-only";

import { Box, type ExecStreamChunk, type PublicURL } from "@upstash/box";
import type {
  AppSandbox,
  SandboxCheckpoint,
  SandboxCommandResult,
  SandboxPreviewUrl,
  SandboxProvider,
  SandboxStreamChunk,
} from "@/lib/sandbox/service";

const sandboxWorkspace = "/workspace/home";

function toAppSandbox(box: Box): AppSandbox {
  return {
    id: box.id,
    provider: "upstash-box",
    raw: box,
  };
}

function unwrapBox(sandbox: AppSandbox) {
  if (sandbox.provider !== "upstash-box" || !(sandbox.raw instanceof Box)) {
    throw new Error("Unsupported sandbox provider.");
  }

  return sandbox.raw;
}

export const upstashBoxProvider: SandboxProvider = {
  async connectSandbox(sandboxId) {
    return toAppSandbox(await Box.get(sandboxId));
  },

  async createFactorySandbox(factoryId) {
    return toAppSandbox(
      await Box.create({
        name: `factory-${factoryId.slice(0, 8)}-default`,
        runtime: "node",
      }),
    );
  },

  async createWorkerSandbox(input) {
    const { checkpointId, env, factoryId, workerId } = input;

    return toAppSandbox(
      await Box.fromSnapshot(checkpointId, {
        env,
        name: `factory-${factoryId.slice(0, 8)}-worker-${workerId.slice(0, 8)}`,
        runtime: "node",
      }),
    );
  },

  async runSandboxCommand(sandbox, command, timeoutMs) {
    const box = unwrapBox(sandbox);
    const run = await box.exec.command(
      createWorkspaceCommand(command, timeoutMs),
    );
    const output = String(run.result ?? "");
    const exitCode = run.exitCode ?? (run.status === "completed" ? 0 : 1);

    return {
      exitCode,
      output,
      success: run.status === "completed" && exitCode === 0,
    } satisfies SandboxCommandResult;
  },

  async streamSandboxCommand(sandbox, command) {
    const box = unwrapBox(sandbox);
    const stream = await box.exec.stream(createWorkspaceCommand(command));

    return {
      async *[Symbol.asyncIterator]() {
        for await (const chunk of stream) {
          yield toStreamChunk(chunk);
        }
      },
    };
  },

  async createCheckpoint(sandbox, name) {
    const snapshot = await unwrapBox(sandbox).snapshot({ name });

    return {
      id: snapshot.id,
      name: snapshot.name,
      status: snapshot.status,
    } satisfies SandboxCheckpoint;
  },

  async createPreviewUrl(sandbox, port, authOptions) {
    return toPreviewUrl(
      await unwrapBox(sandbox).getPublicURL(port, {
        basicAuth: authOptions?.basicAuth,
        bearerToken: authOptions?.bearerToken,
      }),
    );
  },

  async listPreviewUrls(sandbox) {
    const result = await unwrapBox(sandbox).listPublicURLs();

    return result.publicURLs.map(toPreviewUrl);
  },

  async deletePreviewUrl(sandbox, port) {
    await unwrapBox(sandbox).deletePublicURL(port);
  },
};

function toStreamChunk(chunk: ExecStreamChunk): SandboxStreamChunk {
  if (chunk.type === "exit") {
    return {
      exitCode: chunk.exitCode,
      type: "exit",
    };
  }

  return chunk;
}

function toPreviewUrl(publicUrl: PublicURL): SandboxPreviewUrl {
  const authConfig: Record<string, unknown> = {};

  if (publicUrl.token) {
    authConfig.token = publicUrl.token;
  }

  if (publicUrl.username) {
    authConfig.username = publicUrl.username;
  }

  if (publicUrl.password) {
    authConfig.password = publicUrl.password;
  }

  return {
    authConfig: Object.keys(authConfig).length > 0 ? authConfig : undefined,
    port: publicUrl.port,
    url: publicUrl.url,
  };
}

function createWorkspaceCommand(command: string, timeoutMs?: number) {
  const timeoutSeconds = timeoutMs
    ? Math.max(1, Math.ceil(timeoutMs / 1_000))
    : null;
  const timeoutPrefix = timeoutSeconds ? `timeout ${timeoutSeconds}s ` : "";

  return [
    `mkdir -p ${shellQuote(sandboxWorkspace)}`,
    `cd ${shellQuote(sandboxWorkspace)}`,
    `${timeoutPrefix}sh -lc ${shellQuote(command)}`,
  ].join(" && ");
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
