import assert from "node:assert/strict";
import test from "node:test";
import {
  getCodexAgentMessageText,
  getEventFeedItems,
  getEventSender,
} from "../../apps/app/components/events/event-utils.ts";

test("event feed items skip queued user messages", () => {
  const items = getEventFeedItems([
    {
      data: { prompt: "Run this after the current task." },
      id: "queued-event",
      source: "factory",
      type: "queued_user_message",
    },
    {
      data: { prompt: "Visible sent message." },
      id: "sent-event",
      source: "factory",
      type: "user_message",
    },
  ] as Parameters<typeof getEventFeedItems>[0]);

  assert.deepEqual(
    items.map((item) => item.id),
    ["sent-event"],
  );
});

test("event sender reads supervisor snapshots", () => {
  assert.deepEqual(
    getEventSender({
      prompt: "Can you check this?",
      supervisor: {
        email: "ruthie@example.com",
        id: "user-1",
        name: "ruthie",
      },
    }),
    {
      avatarSeed: undefined,
      email: "ruthie@example.com",
      id: "user-1",
      name: "ruthie",
    },
  );
});

test("Codex event text unwraps worker structured responses", () => {
  assert.equal(
    getCodexAgentMessageText({
      item: {
        content: [
          {
            text: JSON.stringify({
              newActivityMessage: "Reviewing permissions",
              response: "I found one issue.",
            }),
          },
        ],
        role: "assistant",
        type: "message",
      },
    }),
    "I found one issue.",
  );
});
