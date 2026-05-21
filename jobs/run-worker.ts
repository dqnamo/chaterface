import { id } from "@instantdb/admin";
import { logger, metadata, task, tasks } from "@trigger.dev/sdk";
import { getFactoryMcpGatewayUrl } from "@/lib/app-url";
import {
  cleanCommandOutput,
  createWorkerBox,
  ensureLatestCodexOnBox,
  getBox,
  getExecStreamChunkText,
  killWorkerPid,
  runBoxCommand,
  shellQuote,
  streamCodexExec,
  waitForWorkerPid,
} from "@/lib/codex/box-auth";
import { decryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";
import { createFactoryWorkerApiToken } from "@/lib/factory/worker-api-auth";
import { listEnabledMcpCapabilitiesForFactory } from "@/lib/mcp/records";
import { createMcpWorkerToken } from "@/lib/mcp/run-tokens";

type RunWorkerPayload = {
  userMessageEventId: string;
  workerId: string;
};

type WorkerRecord = {
  activeCommandId?: string;
  activePid?: number;
  codexSessionId?: string;
  factory?: {
    defaultSanpshotId?: string;
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
        setRunMetadata("retired", {
          userMessageEventId: payload.userMessageEventId,
          workerId: worker.id,
        });
        logTaskStep("info", "Worker is retired; skipping run", {
          userMessageEventId: payload.userMessageEventId,
          workerId: worker.id,
        });
        return {
          skipped: true,
          workerId: worker.id,
        };
      }

      const defaultSnapshotId = worker.factory.defaultSanpshotId;
      const secrets = getFactorySecrets(worker.factory.secrets ?? []);
      const mcpConfig = await getWorkerMcpConfig({
        factoryId: worker.factory.id,
        workerId: worker.id,
      });

      if (!worker.sandboxId && !defaultSnapshotId) {
        await failWorker(
          payload.workerId,
          "Factory default snapshot is missing",
        );
        workerAlreadyFailed = true;
        logTaskStep("error", "Factory default snapshot is missing", {
          factoryId: worker.factory.id,
          workerId: payload.workerId,
        });
        throw new Error("Factory default snapshot is missing");
      }

      setRunMetadata("creating_sandbox", {
        factoryId: worker.factory.id,
        resume: Boolean(worker.sandboxId),
        workerId: worker.id,
      });

      const factoryApiToken = worker.sandboxId
        ? undefined
        : await createFactoryWorkerApiToken({
            factoryId: worker.factory.id,
            workerId: worker.id,
          });
      const box = worker.sandboxId
        ? await getBox(worker.sandboxId)
        : await createWorkerBox({
            factoryApiToken,
            factoryId: worker.factory.id,
            snapshotId: defaultSnapshotId ?? "",
            workerId: worker.id,
          });
      const sandboxId = worker.sandboxId ?? box.id;
      const shouldInterrupt =
        worker.status === "running" && typeof worker.activePid === "number";

      logTaskStep("info", "Sandbox ready", {
        resume: Boolean(worker.sandboxId),
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
        await killWorkerPid({ box, pid: worker.activePid });
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

      setRunMetadata("setting_up_box", {
        sandboxId,
        workerId: worker.id,
      });
      logTaskStep("info", "Installing latest Codex CLI on box", {
        sandboxId,
        workerId: worker.id,
      });
      const codexSetupOutput = await ensureLatestCodexOnBox(box);
      logTaskStep("info", "Codex CLI setup complete", {
        output: truncateForLog(codexSetupOutput),
        sandboxId,
        workerId: worker.id,
      });
      const imagePaths = await stageWorkerImageAttachments({
        attachments: userMessageEvent?.attachments ?? [],
        box,
        eventId: payload.userMessageEventId,
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
        sandboxId,
        secretsCount: Object.keys(secrets).length,
        mcpEnabled: Boolean(mcpConfig),
        workerId: worker.id,
      });

      const stream = await streamCodexExec({
        box,
        imagePaths,
        mcpConfig,
        prompt,
        resume: Boolean(worker.sandboxId),
        secrets,
        sessionId: worker.codexSessionId,
        workerId: worker.id,
      });
      const pid = await waitForWorkerPid({ box, workerId: worker.id });

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

          const chunkText = getExecStreamChunkText(chunk);

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

async function stageWorkerImageAttachments({
  attachments,
  box,
  eventId,
  workerId,
}: {
  attachments: AttachmentRecord[];
  box: Awaited<ReturnType<typeof getBox>>;
  eventId: string;
  workerId: string;
}) {
  const imageAttachments = attachments.filter(isImageAttachment);

  if (imageAttachments.length === 0) {
    return [];
  }

  const attachmentDir = `/workspace/home/.factory/workers/${workerId}/attachments/${eventId}`;
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
  const result = await runBoxCommand(
    box,
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

  if (currentWorker?.activeCommandId !== userMessageEventId) {
    return;
  }

  if (currentWorker.status === "retired") {
    return;
  }

  await db.transact(
    db.tx.workers[workerId].update({
      activeCommandId: null,
      activePid: null,
      status: exitCode === 0 ? "idle" : "failed",
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

  return [...(worker?.events ?? [])].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  )[0];
}

function findCodexSessionId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      typeof nestedValue === "string" &&
      /(?:session|conversation).*id/i.test(key) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        nestedValue,
      )
    ) {
      return nestedValue;
    }

    const nestedSessionId = findCodexSessionId(nestedValue);

    if (nestedSessionId) {
      return nestedSessionId;
    }
  }

  return undefined;
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

  if (!process.env.APP_PUBLIC_URL?.trim() && capabilities.length === 0) {
    return undefined;
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
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
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
