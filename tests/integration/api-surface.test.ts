import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

test("demo Trigger endpoint is not exposed", () => {
  assert.equal(
    existsSync(join(repoRoot, "apps/app/app/api/hello-world/route.ts")),
    false,
  );
  assert.equal(existsSync(join(repoRoot, "apps/app/jobs/example.ts")), false);
});

test("deploy workflow gates production deploys on build and smoke checks", () => {
  const workflow = readFileSync(
    join(repoRoot, ".github/workflows/deploy.yml"),
    "utf8",
  );

  assert.match(workflow, /pnpm test:unit/);
  assert.match(workflow, /pnpm build/);
  assert.match(workflow, /Smoke test production server/);
  assert.match(workflow, /pnpm start:app/);
});
