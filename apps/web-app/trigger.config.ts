import { additionalFiles } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
	project: process.env.TRIGGER_PROJECT_REF ?? "proj_set_in_env_local",
	dirs: ["./trigger"],
	maxDuration: 900,
	legacyDevProcessCwdBehaviour: false,
	build: {
		extensions: [additionalFiles({ files: ["./trigger/prompts/**"] })],
	},
});
