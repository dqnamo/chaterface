import { defineConfig } from "@trigger.dev/sdk";

const triggerProjectRefPlaceholder = "__TRIGGER_PROJECT_REF__";
const project = process.env.TRIGGER_PROJECT_REF ?? triggerProjectRefPlaceholder;

if (project === triggerProjectRefPlaceholder) {
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
