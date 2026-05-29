import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultWorkerActivityMessage,
  getWorkerActivityMessage,
  getWorkerFallbackName,
} from "../../apps/app/helpers/worker-activity.ts";

test("worker activity falls back to the default onboarding message", () => {
  assert.equal(getWorkerActivityMessage({}), defaultWorkerActivityMessage);
  assert.equal(
    getWorkerActivityMessage({ activityMessage: "   " }),
    defaultWorkerActivityMessage,
  );
});

test("worker activity trims persisted messages", () => {
  assert.equal(
    getWorkerActivityMessage({ activityMessage: "  Reviewing logs  " }),
    "Reviewing logs",
  );
});

test("worker fallback name prefers a trimmed worker name", () => {
  assert.equal(
    getWorkerFallbackName({ id: "worker-123456789", name: "  Ruth  " }),
    "Ruth",
  );
  assert.equal(
    getWorkerFallbackName({ id: "worker-123456789", name: "   " }),
    "Worker worker-1",
  );
});
