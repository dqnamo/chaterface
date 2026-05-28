import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthSyncHash,
  handleWorkerAgentAuthSyncRequest,
  parseWorkerAgentAuthSyncBody,
  type SaveWorkerAgentAuthSyncInput,
  stableStringify,
  type WorkerAgentAuthSyncDeps,
  type WorkerAgentAuthSyncToken,
  type WorkerAgentAuthSyncWorker,
} from "../../apps/app/lib/codex/agent-auth-sync.ts";

test("auth sync hashing is stable for object key order", () => {
  const first = {
    tokens: {
      beta: "2",
      alpha: "1",
    },
    user: "codex",
  };
  const second = {
    user: "codex",
    tokens: {
      alpha: "1",
      beta: "2",
    },
  };

  assert.equal(stableStringify(first), stableStringify(second));
  assert.equal(createAuthSyncHash(first), createAuthSyncHash(second));
});

test("auth sync payload requires an authJson object", () => {
  assert.deepEqual(parseWorkerAgentAuthSyncBody({ authJson: { tokens: {} } }), {
    tokens: {},
  });
  assert.equal(parseWorkerAgentAuthSyncBody({ authJson: [] }), undefined);
  assert.equal(parseWorkerAgentAuthSyncBody({}), undefined);
  assert.equal(parseWorkerAgentAuthSyncBody(null), undefined);
});

test("worker auth sync rejects unauthorized requests", async () => {
  const result = await handleWorkerAgentAuthSyncRequest(
    createJsonRequest({ authJson: { tokens: {} } }),
    createDeps({ token: null }),
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Unauthorized");
});

test("worker auth sync rejects invalid auth JSON", async () => {
  const result = await handleWorkerAgentAuthSyncRequest(
    createJsonRequest({ authJson: [] }),
    createDeps(),
  );

  assert.equal(result.status, 400);
});

test("worker auth sync rejects workers without linked agents", async () => {
  const result = await handleWorkerAgentAuthSyncRequest(
    createJsonRequest({ authJson: { tokens: {} } }),
    createDeps({
      worker: {
        factory: { id: "factory-1" },
        id: "worker-1",
      },
    }),
  );

  assert.equal(result.status, 404);
  assert.equal(result.body.error, "Worker does not have an agent");
});

test("worker auth sync saves changed auth JSON", async () => {
  let saved: SaveWorkerAgentAuthSyncInput | undefined;
  const authJson = { tokens: { access: "new" } };
  const result = await handleWorkerAgentAuthSyncRequest(
    createJsonRequest({ authJson }),
    createDeps({
      now: () => new Date("2026-05-26T10:00:00.000Z"),
      saveAgentAuth: async (input) => {
        saved = input;
      },
    }),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.authSyncHash, createAuthSyncHash(authJson));
  assert.deepEqual(saved, {
    agentId: "agent-1",
    authJson,
    authSyncHash: createAuthSyncHash(authJson),
    authSyncedAt: "2026-05-26T10:00:00.000Z",
    workerId: "worker-1",
  });
});

test("worker auth sync skips duplicate hashes", async () => {
  let saveCount = 0;
  const authJson = { tokens: { access: "same" } };
  const authSyncHash = createAuthSyncHash(authJson);
  const result = await handleWorkerAgentAuthSyncRequest(
    createJsonRequest({ authJson }),
    createDeps({
      saveAgentAuth: async () => {
        saveCount += 1;
      },
      worker: {
        agent: {
          authSyncHash,
          authSyncedAt: "2026-05-26T09:00:00.000Z",
          id: "agent-1",
        },
        factory: { id: "factory-1" },
        id: "worker-1",
      },
    }),
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.authSyncHash, authSyncHash);
  assert.equal(result.body.authSyncedAt, "2026-05-26T09:00:00.000Z");
  assert.equal(saveCount, 0);
});

function createJsonRequest(body: unknown) {
  return new Request("https://factory.test/api/worker/agent-auth", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

function createDeps({
  now,
  saveAgentAuth,
  token = {
    factoryId: "factory-1",
    workerId: "worker-1",
  },
  worker = {
    agent: { id: "agent-1" },
    factory: { id: "factory-1" },
    id: "worker-1",
  },
}: {
  now?: () => Date;
  saveAgentAuth?: WorkerAgentAuthSyncDeps["saveAgentAuth"];
  token?: WorkerAgentAuthSyncToken | null;
  worker?: WorkerAgentAuthSyncWorker;
} = {}): WorkerAgentAuthSyncDeps {
  return {
    authenticate: async () => token,
    getWorker: async () => worker,
    now,
    saveAgentAuth: saveAgentAuth ?? (async () => undefined),
  };
}
