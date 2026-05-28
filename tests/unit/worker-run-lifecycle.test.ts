import assert from "node:assert/strict";
import test from "node:test";
import {
  findCodexSessionId,
  getFinalWorkerStatus,
  getNextQueuedEvent,
  isMissingSandboxError,
  shouldFinalizeWorker,
} from "../../app/lib/worker-run-lifecycle.ts";

test("worker finalization ignores stale and retired workers", () => {
  assert.equal(
    shouldFinalizeWorker(
      { activeCommandId: "message-1", status: "running" },
      "message-1",
    ),
    true,
  );
  assert.equal(
    shouldFinalizeWorker(
      { activeCommandId: "message-1", status: "running" },
      "message-2",
    ),
    false,
  );
  assert.equal(
    shouldFinalizeWorker(
      { activeCommandId: "message-1", status: "retired" },
      "message-1",
    ),
    false,
  );
});

test("worker exit codes map to persisted status", () => {
  assert.equal(getFinalWorkerStatus(0), "idle");
  assert.equal(getFinalWorkerStatus(1), "failed");
  assert.equal(getFinalWorkerStatus(137), "failed");
});

test("queued worker events are selected oldest first", () => {
  const queuedEvent = getNextQueuedEvent([
    { createdAt: "2026-05-24T10:00:00.000Z", id: "second" },
    { createdAt: "2026-05-24T09:00:00.000Z", id: "first" },
  ]);

  assert.equal(queuedEvent?.id, "first");
});

test("missing sandbox errors are detected across provider messages", () => {
  assert.equal(
    isMissingSandboxError(
      Object.assign(new Error("Sandbox abc not found"), {
        name: "SandboxNotFoundError",
      }),
    ),
    true,
  );
  assert.equal(
    isMissingSandboxError(new Error("paused sandbox abc not found")),
    true,
  );
  assert.equal(isMissingSandboxError(new Error("permission denied")), false);
  assert.equal(isMissingSandboxError("sandbox not found"), false);
});

test("Codex session ids are found in nested JSON events", () => {
  const sessionId = "123e4567-e89b-42d3-a456-426614174000";

  assert.equal(
    findCodexSessionId({
      message: {
        conversation_id: sessionId,
      },
    }),
    sessionId,
  );
  assert.equal(
    findCodexSessionId({ conversation_id: "not-a-uuid" }),
    undefined,
  );
});
