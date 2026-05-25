import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { canAccessFactory } from "../../lib/auth-access.ts";

const permissionsSource = readFileSync(
  join(process.cwd(), "instant.perms.ts"),
  "utf8",
);

test("factory access allows owners and active supervisors only", () => {
  const factory = {
    owner: { id: "owner-user" },
    supervisors: [
      { status: "active", user: { id: "active-supervisor" } },
      { status: "invited", user: { id: "invited-supervisor" } },
      { status: "removed", user: { id: "removed-supervisor" } },
    ],
  };

  assert.equal(canAccessFactory(factory, { id: "owner-user" }), true);
  assert.equal(canAccessFactory(factory, { id: "active-supervisor" }), true);
  assert.equal(canAccessFactory(factory, { id: "invited-supervisor" }), false);
  assert.equal(canAccessFactory(factory, { id: "removed-supervisor" }), false);
  assert.equal(canAccessFactory(undefined, { id: "owner-user" }), false);
});

test("permissions keep sensitive server-owned records private", () => {
  assert.match(permissionsSource, /valueEncrypted:\s+"false"/);
  assert.match(permissionsSource, /authEncrypted:\s+"false"/);
  assert.match(permissionsSource, /tokenEncrypted:\s+"false"/);
  assert.match(
    permissionsSource,
    /factoryStripeBillings:[\s\S]*?view:\s+"false"/,
  );
  assert.match(
    permissionsSource,
    /factoryMcpCredentials:[\s\S]*?view:\s+"false"/,
  );
  assert.match(
    permissionsSource,
    /factoryMcpOauthStates:[\s\S]*?view:\s+"false"/,
  );
  assert.match(
    permissionsSource,
    /factoryMcpWorkerTokens:[\s\S]*?view:\s+"false"/,
  );
});

test("permissions prevent direct creation of server-owned integrations", () => {
  assert.match(permissionsSource, /factories:[\s\S]*?create:\s+"false"/);
  assert.match(permissionsSource, /agents:[\s\S]*?create:\s+"false"/);
  assert.match(permissionsSource, /secrets:[\s\S]*?create:\s+"false"/);
  assert.match(permissionsSource, /factorySkills:[\s\S]*?create:\s+"false"/);
  assert.match(
    permissionsSource,
    /factoryMcpServers:[\s\S]*?create:\s+"false"/,
  );
  assert.match(
    permissionsSource,
    /factoryMcpCapabilities:[\s\S]*?update:\s+"false"/,
  );
});

test("supervisor invite acceptance can link the signed-in user", () => {
  assert.match(
    permissionsSource,
    /canAcceptInvite:[\s\S]*?\['acceptedAt', 'status', 'updatedAt', 'user'\]/,
  );
});

test("agent permissions allow owners to update supported settings only", () => {
  assert.match(
    permissionsSource,
    /agents:[\s\S]*?onlyUpdatesAgentSettings:[\s\S]*?\['codexModel', 'codexReasoningLevel', 'codexSpeed', 'gitEmail', 'gitName'\][\s\S]*?codexModelIsSupported && codexReasoningLevelIsSupported && codexSpeedIsSupported/,
  );
  assert.match(
    permissionsSource,
    /agents:[\s\S]*?update:\s+"isOwner && onlyUpdatesAgentSettings"/,
  );
});

test("worker permissions keep server-owned runtime fields out of client writes", () => {
  assert.match(
    permissionsSource,
    /onlyCreatesClientWorker:[\s\S]*?\['agent', 'codexModel', 'codexReasoningLevel', 'codexSpeed', 'createdAt', 'factory', 'name', 'retiredAt', 'status', 'updatedAt'\][\s\S]*?codexModelIsSupported && codexReasoningLevelIsSupported && codexSpeedIsSupported/,
  );
  assert.match(
    permissionsSource,
    /onlyQueuesClientWorker:[\s\S]*?\['codexModel', 'codexReasoningLevel', 'codexSpeed', 'retiredAt', 'status', 'updatedAt'\][\s\S]*?codexModelIsSupported && codexReasoningLevelIsSupported && codexSpeedIsSupported/,
  );
  assert.match(
    permissionsSource,
    /onlyRetiresClientWorker:[\s\S]*?\['activeCommandId', 'activePid', 'retiredAt', 'status', 'updatedAt'\]/,
  );
  assert.match(
    permissionsSource,
    /onlyUnretiresClientWorker:[\s\S]*?data\.status == 'retired'/,
  );
  assert.doesNotMatch(
    permissionsSource,
    /workers:[\s\S]*?update:\s+"isFactoryMember"/,
  );
});

test("event permissions allow only client message event types", () => {
  assert.match(
    permissionsSource,
    /onlyCreatesClientMessageEvent:[\s\S]*?\['attachments', 'createdAt', 'data', 'source', 'type', 'worker'\][\s\S]*?data\.source == 'factory' && data\.type in \['user_message', 'queued_user_message'\]/,
  );
  assert.match(
    permissionsSource,
    /events:[\s\S]*?create:\s+"isFactoryMember && onlyCreatesClientMessageEvent"/,
  );
});
