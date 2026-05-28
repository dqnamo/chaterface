import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldProcessSupervisorInvite,
  shouldTriggerWorkerRunForEvent,
} from "../../apps/app/lib/instant-webhook-events.ts";

test("worker run webhooks only react to factory user messages", () => {
  assert.equal(
    shouldTriggerWorkerRunForEvent({
      source: "factory",
      type: "user_message",
    }),
    true,
  );
  assert.equal(
    shouldTriggerWorkerRunForEvent({
      source: "codex",
      type: "user_message",
    }),
    false,
  );
  assert.equal(
    shouldTriggerWorkerRunForEvent({
      source: "factory",
      type: "queued_user_message",
    }),
    false,
  );
  assert.equal(shouldTriggerWorkerRunForEvent(null), false);
});

test("supervisor invite webhooks only send emails for new invited addresses", () => {
  assert.equal(
    shouldProcessSupervisorInvite({
      email: "teammate@example.com",
      status: "invited",
    }),
    true,
  );
  assert.equal(
    shouldProcessSupervisorInvite({
      email: "teammate@example.com",
      status: "active",
    }),
    false,
  );
  assert.equal(shouldProcessSupervisorInvite({ status: "invited" }), false);
});
