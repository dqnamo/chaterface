import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "@trigger.dev/sdk";

if (existsSync(".env.local")) {
  loadEnvFile(".env.local");
}

const stampedProjectRef = "__TRIGGER_PROJECT_REF_VALUE__";
const project =
  stampedProjectRef === "__TRIGGER_PROJECT_REF_VALUE__"
    ? process.env.TRIGGER_PROJECT_REF
    : stampedProjectRef;

if (!project) {
  throw new Error("Missing TRIGGER_PROJECT_REF");
}

export default defineConfig({
  project,
  dirs: ["./jobs"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3600,
});
