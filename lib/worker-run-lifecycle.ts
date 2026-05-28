export type WorkerFinalizeRecord = {
  activeCommandId?: null | string;
  status?: null | string;
};

export type QueuedWorkerEvent = {
  createdAt?: string;
  id: string;
};

export function shouldFinalizeWorker(
  currentWorker: WorkerFinalizeRecord | undefined,
  userMessageEventId: string,
) {
  return (
    currentWorker?.activeCommandId === userMessageEventId &&
    currentWorker.status !== "retired"
  );
}

export function getFinalWorkerStatus(exitCode: number) {
  return exitCode === 0 ? "idle" : "failed";
}

export function getNextQueuedEvent<TEvent extends QueuedWorkerEvent>(
  events: TEvent[],
) {
  return [...events].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  )[0];
}

export function isMissingSandboxError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "SandboxNotFoundError" ||
    /box .*not found/i.test(error.message) ||
    /sandbox .*not found/i.test(error.message) ||
    /paused sandbox .*not found/i.test(error.message)
  );
}

export function findCodexSessionId(value: unknown): string | undefined {
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
