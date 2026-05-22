import "server-only";

import { CommandExitError, Sandbox } from "e2b";
import type {
  AppSandbox,
  SandboxCheckpoint,
  SandboxCommandResult,
  SandboxPreviewAuthOptions,
  SandboxPreviewUrl,
  SandboxProvider,
  SandboxStreamChunk,
} from "@/lib/sandbox/service";

const sandboxWorkspace = "/home/user/workspace";
const sandboxIdleTimeoutMs = 120_000;
const sandboxStreamTimeoutMs = 0;

function getSandboxTemplate() {
  return process.env.E2B_SANDBOX_TEMPLATE?.trim() || undefined;
}

function toAppSandbox(sandbox: Sandbox): AppSandbox {
  return {
    id: sandbox.sandboxId,
    provider: "e2b",
    raw: sandbox,
  };
}

function unwrapSandbox(sandbox: AppSandbox) {
  if (sandbox.provider !== "e2b" || !(sandbox.raw instanceof Sandbox)) {
    throw new Error("Unsupported sandbox provider.");
  }

  return sandbox.raw;
}

export const e2bSandboxProvider: SandboxProvider = {
  async connectSandbox(sandboxId) {
    return toAppSandbox(
      await Sandbox.connect(sandboxId, {
        timeoutMs: sandboxIdleTimeoutMs,
      }),
    );
  },

  async createFactorySandbox(factoryId) {
    const template = getSandboxTemplate();
    const options = {
      metadata: {
        factoryId,
        purpose: "factory-default",
      },
      timeoutMs: sandboxIdleTimeoutMs,
    };

    return toAppSandbox(
      template
        ? await Sandbox.create(template, options)
        : await Sandbox.create(options),
    );
  },

  async createWorkerSandbox(input) {
    const { checkpointId, env } = input;

    return toAppSandbox(
      await Sandbox.create(checkpointId, {
        envs: env,
        timeoutMs: sandboxIdleTimeoutMs,
      }),
    );
  },

  async runSandboxCommand(sandbox, command, timeoutMs) {
    const e2bSandbox = unwrapSandbox(sandbox);

    try {
      const result = await e2bSandbox.commands.run(
        createWorkspaceCommand(command),
        {
          cwd: undefined,
          timeoutMs,
        },
      );

      return toCommandResult(result);
    } catch (error) {
      return toCaughtCommandResult(error);
    }
  },

  async streamSandboxCommand(sandbox, command) {
    const e2bSandbox = unwrapSandbox(sandbox);
    const queue: SandboxStreamChunk[] = [];
    let done = false;
    let error: unknown;
    let notify: (() => void) | undefined;

    const push = (chunk: SandboxStreamChunk) => {
      queue.push(chunk);
      notify?.();
      notify = undefined;
    };

    void e2bSandbox.commands
      .run(createWorkspaceCommand(command), {
        cwd: undefined,
        onStderr: (data) => {
          push({ data, type: "output" });
        },
        onStdout: (data) => {
          push({ data, type: "output" });
        },
        timeoutMs: sandboxStreamTimeoutMs,
      })
      .then((result) => {
        push({ exitCode: result.exitCode, type: "exit" });
        done = true;
        notify?.();
        notify = undefined;
      })
      .catch((streamError: unknown) => {
        if (streamError instanceof CommandExitError) {
          push({ exitCode: streamError.exitCode, type: "exit" });
        } else {
          error = streamError;
        }

        done = true;
        notify?.();
        notify = undefined;
      });

    return {
      async *[Symbol.asyncIterator]() {
        while (!done || queue.length > 0) {
          if (queue.length > 0) {
            const chunk = queue.shift();

            if (chunk) {
              yield chunk;
            }
            continue;
          }

          if (error) {
            throw error;
          }

          await new Promise<void>((resolve) => {
            notify = resolve;
          });
        }

        if (error) {
          throw error;
        }
      },
    };
  },

  async createCheckpoint(sandbox, name) {
    const snapshot = await unwrapSandbox(sandbox).createSnapshot({ name });

    return {
      id: snapshot.snapshotId,
      name,
    } satisfies SandboxCheckpoint;
  },

  async createPreviewUrl(sandbox, port) {
    return toPreviewUrl(unwrapSandbox(sandbox), port);
  },

  async listPreviewUrls() {
    return [];
  },

  async deletePreviewUrl() {
    // E2B exposes deterministic hosts with getHost(port); there is no provider
    // URL object to delete.
  },
};

function toCommandResult(result: {
  error?: string;
  exitCode: number;
  stderr: string;
  stdout: string;
}): SandboxCommandResult {
  return {
    exitCode: result.exitCode,
    output: [result.stdout, result.stderr, result.error]
      .filter(Boolean)
      .join(""),
    success: result.exitCode === 0,
  };
}

function toCaughtCommandResult(error: unknown): SandboxCommandResult {
  if (error instanceof CommandExitError) {
    return toCommandResult(error);
  }

  throw error;
}

function toPreviewUrl(
  sandbox: Sandbox,
  port: number,
  _authOptions?: SandboxPreviewAuthOptions,
): SandboxPreviewUrl {
  return {
    port,
    url: `https://${sandbox.getHost(port)}`,
  };
}

function createWorkspaceCommand(command: string) {
  return `mkdir -p ${shellQuote(sandboxWorkspace)} && cd ${shellQuote(sandboxWorkspace)} && ${command}`;
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
