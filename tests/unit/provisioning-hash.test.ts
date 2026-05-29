import assert from "node:assert/strict";
import test from "node:test";
import {
  hashProvisioningInput,
  stableStringify,
} from "../../apps/app/lib/codex/provisioning-hash.ts";

test("stable provisioning stringify is independent of object key order", () => {
  assert.equal(
    stableStringify({
      github: { repositories: [{ path: "app", url: "https://example.com/a" }] },
      skills: [{ path: "skills/a/SKILL.md", repoUrl: "https://example.com/s" }],
    }),
    stableStringify({
      skills: [{ repoUrl: "https://example.com/s", path: "skills/a/SKILL.md" }],
      github: { repositories: [{ url: "https://example.com/a", path: "app" }] },
    }),
  );
});

test("provisioning hashes change when durable setup changes", () => {
  const baseHash = hashProvisioningInput({
    github: { repositories: [{ path: "app", url: "https://example.com/a" }] },
  });
  const nextHash = hashProvisioningInput({
    github: { repositories: [{ path: "app", url: "https://example.com/b" }] },
  });

  assert.notEqual(baseHash, nextHash);
});
