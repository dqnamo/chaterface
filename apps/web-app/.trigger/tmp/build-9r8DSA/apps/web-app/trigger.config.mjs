import {
  defineConfig
} from "../../chunk-5XX2QOVU.mjs";
import "../../chunk-FKU2LNMO.mjs";
import "../../chunk-7H7M4ORF.mjs";
import "../../chunk-GROY7YFJ.mjs";
import "../../chunk-QDCQOHL3.mjs";
import "../../chunk-HZ3XIZM7.mjs";
import {
  init_esm
} from "../../chunk-5VFD3YHA.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_set_in_env_local",
  dirs: ["./trigger"],
  maxDuration: 900,
  legacyDevProcessCwdBehaviour: false,
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
