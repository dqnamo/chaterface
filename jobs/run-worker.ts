import { id } from "@instantdb/admin";
import { logger, metadata, task, tasks } from "@trigger.dev/sdk";
import { getAppPublicUrl, getFactoryMcpGatewayUrl } from "@/lib/app-url";
import {
  cleanCommandOutput,
  ensureLatestCodexOnSandbox,
  getSandboxStreamChunkText,
  killWorkerPid,
  sandboxFactoryDir,
  shellQuote,
  streamCodexExec,
  waitForWorkerPid,
} from "@/lib/codex/sandbox-auth";
import {
  normalizeWorkerModel,
  normalizeWorkerReasoningLevel,
  normalizeWorkerSpeed,
} from "@/lib/codex/worker-options";
import { decryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";
import {
  createFactoryWorkerApiToken,
  factoryWorkerTokenHeader,
} from "@/lib/factory/worker-api-auth";
import { listEnabledMcpCapabilitiesForFactory } from "@/lib/mcp/records";
import { createMcpWorkerToken } from "@/lib/mcp/run-tokens";
import {
  type AppSandbox,
  connectSandbox,
  createWorkerSandbox,
  runSandboxCommand,
} from "@/lib/sandbox/service";
import {
  findCodexSessionId,
  getFinalWorkerStatus,
  getNextQueuedEvent,
  isMissingSandboxError,
  shouldFinalizeWorker,
} from "@/lib/worker-run-lifecycle";

type RunWorkerPayload = {
  userMessageEventId: string;
  workerId: string;
};

type WorkerRecord = {
  activeCommandId?: string;
  activePid?: number;
  codexSessionId?: string;
  codexModel?: string;
  codexReasoningLevel?: string;
  codexSpeed?: string;
  factory?: {
    defaultSandboxCheckpointId?: string;
    id: string;
    secrets?: SecretRecord[];
  };
  id: string;
  sandboxId?: string;
  status?: string;
};

type SecretRecord = {
  name?: string;
  valueEncrypted?: string;
};

type EventRecord = {
  attachments?: AttachmentRecord[];
  createdAt?: string;
  data?: Record<string, unknown> & {
    prompt?: string;
  };
  id: string;
  source?: string;
  type?: string;
};

type AttachmentRecord = {
  id: string;
  path?: string;
  url?: string;
};

type JsonValue =
  | JsonValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: JsonValue };

type LogLevel = "debug" | "error" | "info" | "warn";

export const runWorkerTask = task({
  id: "run-worker",
  run: async (payload: RunWorkerPayload, { ctx }) => {
    let shouldMarkWorkerFailed = false;
    let workerAlreadyFailed = false;

    try {
      setRunMetadata("started", {
        attempt: ctx.attempt.number,
        runId: ctx.run.id,
        userMessageEventId: payload.userMessageEventId,
        workerId: payload.workerId,
      });
      logTaskStep("info", "run-worker started", {
        attempt: ctx.attempt.number,
        environment: ctx.environment.slug,
        runId: ctx.run.id,
        userMessageEventId: payload.userMessageEventId,
        workerId: payload.workerId,
      });

      const db = getAdminDb();
      const now = new Date().toISOString();
      const worker = await getWorker(payload.workerId);
      const userMessageEvent = await getUserMessageEvent(
        payload.userMessageEventId,
      );
      const prompt = userMessageEvent?.data?.prompt?.trim();

      shouldMarkWorkerFailed = Boolean(worker);

      logTaskStep("info", "Loaded worker run inputs", {
        hasFactory: Boolean(worker?.factory),
        hasPrompt: Boolean(prompt),
        hasSandbox: Boolean(worker?.sandboxId),
        promptLength: prompt?.length ?? 0,
        status: worker?.status,
        userMessageEventId: payload.userMessageEventId,
        workerFound: Boolean(worker),
        workerId: payload.workerId,
      });

      if (!worker?.factory) {
        throw new Error("Worker not found");
      }

      if (!prompt) {
        throw new Error("Worker prompt not found");
      }

      if (worker.status === "retired") {
        await db.transact(
          db.tx.workers[worker.id].update({
            activeCommandId: null,
            activePid: null,
            retiredAt: null,
            status: "queued",
            updatedAt: now,
          }),
        );
        worker.status = "queued";
        setRunMetadata("unretired", {
          userMessageEventId: payload.userMessageEventId,
          workerId: worker.id,
        });
        logTaskStep("info", "Worker unretired by run task", {
          userMessageEventId: payload.userMessageEventId,
          workerId: worker.id,
        });
      }

      const defaultCheckpointId = worker.factory.defaultSandboxCheckpointId;
      const secrets = getFactorySecrets(worker.factory.secrets ?? []);
      const mcpConfig = await getWorkerMcpConfig({
        factoryId: worker.factory.id,
        workerId: worker.id,
      });
      const factoryApiToken = await createFactoryWorkerApiToken({
        factoryId: worker.factory.id,
        workerId: worker.id,
      });
      const workerApiConfig = {
        apiUrl: getAppPublicUrl(),
        token: factoryApiToken,
        tokenHeader: factoryWorkerTokenHeader,
      };

      if (!worker.sandboxId && !defaultCheckpointId) {
        await failWorker(
          payload.workerId,
          "Factory default sandbox checkpoint is missing",
        );
        workerAlreadyFailed = true;
        logTaskStep("error", "Factory default sandbox checkpoint is missing", {
          factoryId: worker.factory.id,
          workerId: payload.workerId,
        });
        throw new Error("Factory default sandbox checkpoint is missing");
      }

      setRunMetadata("creating_sandbox", {
        factoryId: worker.factory.id,
        resume: Boolean(worker.sandboxId),
        workerId: worker.id,
      });

      const sandboxEnv = {
        FACTORY_API_URL: workerApiConfig.apiUrl,
        FACTORY_WORKER_API_TOKEN: workerApiConfig.token,
        FACTORY_WORKER_TOKEN_HEADER: workerApiConfig.tokenHeader,
      };
      const { resumeCodexSession, sandbox, sandboxRecreated } =
        await getOrCreateWorkerSandbox({
          defaultCheckpointId,
          env: sandboxEnv,
          factoryId: worker.factory.id,
          sandboxId: worker.sandboxId,
          workerId: worker.id,
        });
      const sandboxId = sandbox.id;
      const shouldInterrupt =
        resumeCodexSession &&
        worker.status === "running" &&
        typeof worker.activePid === "number";

      logTaskStep("info", "Sandbox ready", {
        resume: resumeCodexSession,
        sandboxRecreated,
        sandboxId,
        shouldInterrupt,
        workerId: worker.id,
      });

      if (shouldInterrupt && worker.activePid) {
        logTaskStep("warn", "Interrupting active worker process", {
          pid: worker.activePid,
          sandboxId,
          workerId: worker.id,
        });
        await killWorkerPid({ pid: worker.activePid, sandbox });
        await appendWorkerEvent(worker.id, {
          createdAt: now,
          data: {
            killedPid: worker.activePid,
            prompt,
          },
          source: "factory",
          type: "worker_interrupted",
        });
      }

      setRunMetadata("setting_up_sandbox", {
        sandboxId,
        workerId: worker.id,
      });
      logTaskStep("info", "Installing latest Codex CLI in sandbox", {
        sandboxId,
        workerId: worker.id,
      });
      const codexSetupOutput = await ensureLatestCodexOnSandbox(sandbox);
      logTaskStep("info", "Codex CLI setup complete", {
        output: truncateForLog(codexSetupOutput),
        sandboxId,
        workerId: worker.id,
      });
      const imagePaths = await stageWorkerImageAttachments({
        attachments: userMessageEvent?.attachments ?? [],
        eventId: payload.userMessageEventId,
        sandbox,
        workerId: worker.id,
      });

      logTaskStep("info", "Worker image attachments staged", {
        attachmentCount: imagePaths.length,
        sandboxId,
        workerId: worker.id,
      });

      await db.transact(
        db.tx.workers[worker.id].update({
          activeCommandId: payload.userMessageEventId,
          activePid: null,
          codexSessionId: resumeCodexSession ? worker.codexSessionId : null,
          sandboxId,
          status: "running",
          updatedAt: now,
        }),
      );

      setRunMetadata("streaming_codex", {
        sandboxId,
        workerId: worker.id,
      });
      logTaskStep("info", "Worker marked running; starting Codex stream", {
        codexModel: normalizeWorkerModel(worker.codexModel),
        codexReasoningLevel: normalizeWorkerReasoningLevel(
          worker.codexReasoningLevel,
        ),
        codexSpeed: normalizeWorkerSpeed({
          model: worker.codexModel,
          speed: worker.codexSpeed,
        }),
        sandboxId,
        secretsCount: Object.keys(secrets).length,
        mcpEnabled: Boolean(mcpConfig),
        workerApiEnabled: true,
        workerId: worker.id,
      });

      const stream = await streamCodexExec({
        imagePaths,
        mcpConfig,
        model: worker.codexModel,
        prompt,
        reasoningLevel: worker.codexReasoningLevel,
        resume: resumeCodexSession,
        sandbox,
        secrets,
        sessionId: resumeCodexSession ? worker.codexSessionId : undefined,
        speed: worker.codexSpeed,
        workerId: worker.id,
        workerApiConfig,
      });
      const pid = await waitForWorkerPid({ sandbox, workerId: worker.id });

      if (pid) {
        await db.transact(
          db.tx.workers[worker.id].update({
            activePid: pid,
            updatedAt: new Date().toISOString(),
          }),
        );
        logTaskStep("info", "Worker PID captured", {
          pid,
          sandboxId,
          workerId: worker.id,
        });
      } else {
        logTaskStep("warn", "Worker PID was not captured", {
          sandboxId,
          workerId: worker.id,
        });
      }

      let buffer = "";
      let exitCode = 0;
      let outputBytes = 0;
      let outputChunks = 0;
      let outputLines = 0;

      try {
        for await (const chunk of stream) {
          if (chunk.type === "exit") {
            exitCode = chunk.exitCode;
            logTaskStep("info", "Codex stream exited", {
              exitCode,
              outputBytes,
              outputChunks,
              outputLines,
              sandboxId,
              workerId: worker.id,
            });
            continue;
          }

          const chunkText = getSandboxStreamChunkText(chunk);

          if (chunkText) {
            outputBytes += chunkText.length;
            outputChunks += 1;
            logTaskStep("info", "Codex stream chunk received", {
              bytes: chunkText.length,
              outputBytes,
              outputChunks,
              preview: truncateForLog(chunkText),
              workerId: worker.id,
            });
          }

          buffer += chunkText;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            outputLines += 1;
            logTaskStep("debug", "Codex stream line received", {
              lineNumber: outputLines,
              preview: truncateForLog(line),
              workerId: worker.id,
            });
            await persistCodexLine(worker.id, line);
          }
        }

        if (buffer.trim()) {
          outputLines += 1;
          logTaskStep("debug", "Codex stream trailing line received", {
            lineNumber: outputLines,
            preview: truncateForLog(buffer),
            workerId: worker.id,
          });
          await persistCodexLine(worker.id, buffer);
        }
      } catch (error) {
        logTaskStep("error", "Codex stream failed", {
          error: serializeError(error),
          outputBytes,
          outputChunks,
          outputLines,
          workerId: worker.id,
        });
        await appendWorkerEvent(worker.id, {
          createdAt: new Date().toISOString(),
          data: {
            message:
              error instanceof Error ? error.message : "Codex stream failed",
          },
          source: "codex",
          type: "codex_event",
        });
        exitCode = 1;
      }

      await finalizeWorker({
        exitCode,
        userMessageEventId: payload.userMessageEventId,
        workerId: worker.id,
      });

      setRunMetadata(exitCode === 0 ? "completed" : "failed", {
        exitCode,
        outputBytes,
        outputChunks,
        outputLines,
        sandboxId,
        workerId: worker.id,
      });
      logTaskStep(exitCode === 0 ? "info" : "error", "run-worker completed", {
        exitCode,
        outputBytes,
        outputChunks,
        outputLines,
        sandboxId,
        workerId: worker.id,
      });

      return {
        exitCode,
        sandboxId,
        workerId: worker.id,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Worker task failed";

      setRunMetadata("failed", {
        error: message,
        userMessageEventId: payload.userMessageEventId,
        workerId: payload.workerId,
      });
      logTaskStep("error", "run-worker failed", {
        error: serializeError(error),
        userMessageEventId: payload.userMessageEventId,
        workerId: payload.workerId,
      });

      if (shouldMarkWorkerFailed && !workerAlreadyFailed) {
        try {
          await failWorker(payload.workerId, message);
        } catch (failError) {
          logTaskStep("error", "Could not mark worker failed", {
            error: serializeError(failError),
            workerId: payload.workerId,
          });
        }
      }

      throw error;
    } finally {
      await flushRunMetadata();
    }
  },
});

async function getWorker(workerId: string) {
  const db = getAdminDb();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      factory: {
        secrets: {},
      },
    },
  });

  return result.workers[0] as WorkerRecord | undefined;
}

async function getUserMessageEvent(eventId: string) {
  const db = getAdminDb();
  const result = await db.query({
    events: {
      $: { where: { id: eventId } },
      attachments: {},
    },
  });

  return result.events[0] as EventRecord | undefined;
}

async function getOrCreateWorkerSandbox({
  defaultCheckpointId,
  env,
  factoryId,
  sandboxId,
  workerId,
}: {
  defaultCheckpointId?: string;
  env: Record<string, string>;
  factoryId: string;
  sandboxId?: string;
  workerId: string;
}) {
  if (sandboxId) {
    try {
      const sandbox = await connectSandbox(sandboxId);

      return {
        resumeCodexSession: true,
        sandbox,
        sandboxRecreated: false,
      };
    } catch (error) {
      if (!isMissingSandboxError(error)) {
        throw error;
      }

      logTaskStep("warn", "Worker sandbox was missing; creating replacement", {
        error: serializeError(error),
        sandboxId,
        workerId,
      });
    }
  }

  if (!defaultCheckpointId) {
    throw new Error("Factory default sandbox checkpoint is missing");
  }

  const sandbox = await createWorkerSandbox({
    checkpointId: defaultCheckpointId,
    env,
    factoryId,
    workerId,
  });

  return {
    resumeCodexSession: false,
    sandbox,
    sandboxRecreated: Boolean(sandboxId),
  };
}

async function stageWorkerImageAttachments({
  attachments,
  eventId,
  sandbox,
  workerId,
}: {
  attachments: AttachmentRecord[];
  eventId: string;
  sandbox: AppSandbox;
  workerId: string;
}) {
  const imageAttachments = attachments.filter(isImageAttachment);

  if (imageAttachments.length === 0) {
    return [];
  }

  const attachmentDir = `${sandboxFactoryDir}/workers/${workerId}/attachments/${eventId}`;
  const stagedAttachments = imageAttachments.map((attachment, index) => ({
    path: `${attachmentDir}/image-${index + 1}${getAttachmentExtension(attachment)}`,
    url: attachment.url,
  }));
  const script = `
const fs = require("node:fs/promises");
const items = JSON.parse(process.argv[1]);

async function main() {
  for (const item of items) {
    const response = await fetch(item.url);

    if (!response.ok) {
      throw new Error(\`Could not download attachment: \${response.status}\`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(item.path, Buffer.from(arrayBuffer));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
`.trim();
  const result = await runSandboxCommand(
    sandbox,
    [
      `mkdir -p ${shellQuote(attachmentDir)}`,
      `node -e ${shellQuote(script)} ${shellQuote(JSON.stringify(stagedAttachments))}`,
    ].join(" && "),
    120_000,
  );

  if (!result.success) {
    throw new Error(
      `Could not stage image attachments: ${
        cleanCommandOutput(result.output) || "No output"
      }`,
    );
  }

  return stagedAttachments.map((attachment) => attachment.path);
}

function isImageAttachment(attachment: AttachmentRecord) {
  return (
    typeof attachment.url === "string" &&
    attachment.url.length > 0 &&
    /\.(avif|gif|jpe?g|png|webp)$/i.test(attachment.path ?? attachment.url)
  );
}

function getAttachmentExtension(attachment: AttachmentRecord) {
  const source = attachment.path ?? attachment.url ?? "";
  const match = source.match(/\.(avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i);

  return match ? `.${match[1].toLowerCase()}` : ".png";
}

async function persistCodexLine(workerId: string, line: string) {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return;
  }

  let data: unknown;

  try {
    data = JSON.parse(trimmedLine) as unknown;
  } catch {
    data = { raw: trimmedLine };
  }

  await appendWorkerEvent(workerId, {
    createdAt: new Date().toISOString(),
    data,
    source: "codex",
    type: "codex_event",
  });

  const sessionId = findCodexSessionId(data);

  if (sessionId) {
    const db = getAdminDb();
    await db.transact(
      db.tx.workers[workerId].update({
        codexSessionId: sessionId,
        updatedAt: new Date().toISOString(),
      }),
    );
  }
}

async function appendWorkerEvent(
  workerId: string,
  event: {
    createdAt: string;
    data: unknown;
    source: string;
    type: string;
  },
) {
  const db = getAdminDb();
  const eventId = id();

  await db.transact([
    db.tx.events[eventId].update(event),
    db.tx.events[eventId].link({
      worker: workerId,
    }),
  ]);
}

async function failWorker(workerId: string, message: string) {
  const db = getAdminDb();

  await appendWorkerEvent(workerId, {
    createdAt: new Date().toISOString(),
    data: { message },
    source: "factory",
    type: "codex_event",
  });
  await db.transact(
    db.tx.workers[workerId].update({
      activeCommandId: null,
      activePid: null,
      status: "failed",
      updatedAt: new Date().toISOString(),
    }),
  );
}

async function finalizeWorker({
  exitCode,
  userMessageEventId,
  workerId,
}: {
  exitCode: number;
  userMessageEventId: string;
  workerId: string;
}) {
  const db = getAdminDb();
  const currentWorker = await getWorker(workerId);

  if (!shouldFinalizeWorker(currentWorker, userMessageEventId)) {
    return;
  }

  await db.transact(
    db.tx.workers[workerId].update({
      activeCommandId: null,
      activePid: null,
      status: getFinalWorkerStatus(exitCode),
      updatedAt: new Date().toISOString(),
    }),
  );

  await triggerNextQueuedWorkerRun(workerId);
}

async function triggerNextQueuedWorkerRun(workerId: string) {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const queuedEvent = await getNextQueuedUserMessageEvent(workerId);

  if (!queuedEvent) {
    return;
  }

  await db.transact([
    db.tx.events[queuedEvent.id].update({
      createdAt: queuedEvent.createdAt ?? now,
      data: {
        ...queuedEvent.data,
        startedAt: now,
      },
      source: queuedEvent.source ?? "factory",
      type: "user_message",
    }),
    db.tx.workers[workerId].update({
      status: "queued",
      updatedAt: now,
    }),
  ]);

  try {
    const handle = await tasks.trigger<typeof runWorkerTask>(
      "run-worker",
      {
        userMessageEventId: queuedEvent.id,
        workerId,
      },
      {
        metadata: {
          requestedAt: now,
          userMessageEventId: queuedEvent.id,
          workerId,
        },
        tags: [`worker:${workerId}`],
      },
    );

    logTaskStep("info", "Queued worker message triggered", {
      runId: handle.id,
      userMessageEventId: queuedEvent.id,
      workerId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Queued worker message could not be started.";

    logTaskStep("error", "Queued worker message trigger failed", {
      error: serializeError(error),
      userMessageEventId: queuedEvent.id,
      workerId,
    });
    await appendWorkerEvent(workerId, {
      createdAt: new Date().toISOString(),
      data: { message },
      source: "factory",
      type: "codex_event",
    });
    await db.transact(
      db.tx.workers[workerId].update({
        status: "failed",
        updatedAt: new Date().toISOString(),
      }),
    );
  }
}

async function getNextQueuedUserMessageEvent(workerId: string) {
  const db = getAdminDb();
  const result = await db.query({
    workers: {
      $: { where: { id: workerId } },
      events: {
        $: { where: { type: "queued_user_message" } },
      },
    },
  });
  const worker = result.workers[0] as { events?: EventRecord[] } | undefined;

  return getNextQueuedEvent(worker?.events ?? []);
}

function getFactorySecrets(secrets: SecretRecord[]) {
  return Object.fromEntries(
    secrets.flatMap((secret) => {
      if (!secret.name || !isValidSecretName(secret.name)) {
        return [];
      }

      const value = decryptSecretValue<unknown>(secret.valueEncrypted);

      return typeof value === "string" ? [[secret.name, value]] : [];
    }),
  );
}

function isValidSecretName(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

async function getWorkerMcpConfig({
  factoryId,
  workerId,
}: {
  factoryId: string;
  workerId: string;
}) {
  const capabilities = await listEnabledMcpCapabilitiesForFactory(factoryId);

  if (capabilities.length === 0) {
    return undefined;
  }

  if (!process.env.APP_PUBLIC_URL?.trim()) {
    throw new Error("APP_PUBLIC_URL is required for MCP-enabled workers");
  }

  const gatewayUrl = getFactoryMcpGatewayUrl();

  if (!gatewayUrl.startsWith("https://")) {
    throw new Error("APP_PUBLIC_URL must be HTTPS for MCP-enabled workers");
  }

  return {
    gatewayUrl,
    token: await createMcpWorkerToken({
      capabilityIds: capabilities.map((capability) => capability.id),
      factoryId,
      workerId,
    }),
  };
}

function logTaskStep(
  level: LogLevel,
  message: string,
  details: Record<string, unknown>,
) {
  logger[level](message, details);
  console[level](`[run-worker] ${message}`, details);
}

function setRunMetadata(stage: string, details: Record<string, unknown>) {
  metadata
    .set("stage", stage)
    .set("lastUpdatedAt", new Date().toISOString())
    .set("lastDetails", toJsonValue(details));
}

async function flushRunMetadata() {
  try {
    await metadata.flush();
  } catch (error) {
    logTaskStep("warn", "Could not flush Trigger.dev metadata", {
      error: serializeError(error),
    });
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return Object.fromEntries(
      Object.entries({
        ...error,
        cause: "cause" in error ? error.cause : undefined,
        message: error.message,
        name: error.name,
        stack: error.stack,
      }).filter(([, value]) => value !== undefined),
    );
  }

  if (typeof error === "object" && error !== null) {
    return toJsonValue(error);
  }

  return { message: String(error) };
}

function truncateForLog(value: string, maxLength = 2_000) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`
    : value;
}

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return toJsonValue(serializeError(value));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        toJsonValue(nestedValue),
      ]),
    );
  }

  return String(value);
}
