import {
  __name,
  init_esm
} from "./chunk-5VFD3YHA.mjs";

// trigger/codex-system-prompt.ts
init_esm();
import { readFileSync } from "node:fs";
import path from "node:path";
var SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  "trigger/prompts/system.md"
);
var getCodexDeveloperInstructions = /* @__PURE__ */ __name(() => {
  return readFileSync(SYSTEM_PROMPT_PATH, "utf8").trim();
}, "getCodexDeveloperInstructions");
var formatCodexDeveloperInstructionsConfig = /* @__PURE__ */ __name((instructions) => {
  return `developer_instructions="""
${instructions}
"""`;
}, "formatCodexDeveloperInstructionsConfig");

export {
  getCodexDeveloperInstructions,
  formatCodexDeveloperInstructionsConfig
};
//# sourceMappingURL=chunk-VMQ3ISWR.mjs.map
