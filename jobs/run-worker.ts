import { id } from "@instantdb/admin";
import { task } from "@trigger.dev/sdk";
import {
  createWorkerBox,
  getBox,
  getExecStreamChunkText,
  killWorkerPid,
  streamCodexExec,
  waitForWorkerPid,
} from "@/lib/codex/box-auth";
import { decryptSecretValue } from "@/lib/crypto.server";
import { getAdminDb } from "@/lib/db.server";

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
  data?: {
    prompt?: string;
  };
  id: string;
};

export const runWorkerTask = task({
  id: "run-worker",
  run: async (payload: RunWorkerPayload) => {
    const db = getAdminDb();
    const now = new Date().toISOString();
    const worker = await getWorker(payload.workerId);
    const userMessageEvent = await getUserMessageEvent(
      payload.userMessageEventId,
    );
    const prompt = userMessageEvent?.data?.prompt?.trim();

    if (!worker?.factory) {
      throw new Error("Worker not found");
    }

    if (!prompt) {
      throw new Error("Worker prompt not found");
    }

    const defaultSnapshotId = worker.factory.defaultSanpshotId;
    const secrets = getFactorySecrets(worker.factory.secrets ?? []);

    if (!worker.sandboxId && !defaultSnapshotId) {
      await failWorker(payload.workerId, "Factory default snapshot is missing");
      throw new Error("Factory default snapshot is missing");
    }

    const box = worker.sandboxId
      ? await getBox(worker.sandboxId)
      : await createWorkerBox({
          factoryId: worker.factory.id,
          snapshotId: defaultSnapshotId ?? "",
          workerId: worker.id,
        });
    const sandboxId = worker.sandboxId ?? box.id;
    const shouldInterrupt =
      worker.status === "running" && typeof worker.activePid === "number";

    if (shouldInterrupt && worker.activePid) {
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

    await db.transact(
      db.tx.workers[worker.id].update({
        activeCommandId: payload.userMessageEventId,
        sandboxId,
        status: "running",
        updatedAt: now,
      }),
    );

    const stream = await streamCodexExec({
      box,
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
    }

    let buffer = "";
    let exitCode = 0;

    try {
      for await (const chunk of stream) {
        if (chunk.type === "exit") {
          exitCode = chunk.exitCode;
          continue;
        }

        buffer += getExecStreamChunkText(chunk);
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          await persistCodexLine(worker.id, line);
        }
      }

      if (buffer.trim()) {
        await persistCodexLine(worker.id, buffer);
      }
    } catch (error) {
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

    return {
      exitCode,
      sandboxId,
      workerId: worker.id,
    };
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
    },
  });

  return result.events[0] as EventRecord | undefined;
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

  await db.transact(
    db.tx.workers[workerId].update({
      activeCommandId: null,
      activePid: null,
      status: exitCode === 0 ? "idle" : "failed",
      updatedAt: new Date().toISOString(),
    }),
  );
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
