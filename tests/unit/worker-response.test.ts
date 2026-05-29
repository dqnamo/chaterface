import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorkerStructuredResponse,
  workerStructuredResponseSchema,
} from "../../apps/app/lib/codex/worker-response.ts";

test("worker structured responses are parsed from direct schema output", () => {
  assert.deepEqual(
    getWorkerStructuredResponse({
      newActivityMessage: "Fixing sidebar labels",
      response: "Done.",
    }),
    {
      newActivityMessage: "Fixing sidebar labels",
      response: "Done.",
    },
  );
});

test("worker structured responses are parsed from Codex assistant text", () => {
  assert.deepEqual(
    getWorkerStructuredResponse({
      item: {
        content: [
          {
            text: JSON.stringify({
              newActivityMessage: null,
              response: "Still working through this.",
            }),
          },
        ],
        role: "assistant",
        type: "message",
      },
    }),
    {
      newActivityMessage: null,
      response: "Still working through this.",
    },
  );
});

test("worker structured response schema requires activity and response fields", () => {
  assert.deepEqual(workerStructuredResponseSchema.required, [
    "response",
    "newActivityMessage",
  ]);
});
