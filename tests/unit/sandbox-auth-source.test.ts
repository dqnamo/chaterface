import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sandboxAuthSource = readFileSync(
  join(process.cwd(), "app/lib/codex/sandbox-auth.ts"),
  "utf8",
);

test("Codex exec command starts the auth watcher with worker API env", () => {
  assert.match(sandboxAuthSource, /watchCodexAuth && workerApiConfig/);
  assert.match(sandboxAuthSource, /FACTORY_API_URL/);
  assert.match(sandboxAuthSource, /FACTORY_WORKER_API_TOKEN/);
  assert.match(sandboxAuthSource, /FACTORY_WORKER_TOKEN_HEADER/);
  assert.match(sandboxAuthSource, /\/api\/worker\/agent-auth/);
  assert.match(sandboxAuthSource, /watch\(authDir/);
  assert.match(sandboxAuthSource, /codex-auth-watcher\.log/);
});
