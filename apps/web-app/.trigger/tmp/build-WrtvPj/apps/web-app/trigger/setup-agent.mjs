import {
  require_dist
} from "../../../chunk-IJP64K7S.mjs";
import {
  task
} from "../../../chunk-5XX2QOVU.mjs";
import "../../../chunk-FKU2LNMO.mjs";
import "../../../chunk-7H7M4ORF.mjs";
import "../../../chunk-GROY7YFJ.mjs";
import "../../../chunk-QDCQOHL3.mjs";
import {
  admin_default,
  syncAgentAuthFromSandbox
} from "../../../chunk-TZYUXHDO.mjs";
import "../../../chunk-HZ3XIZM7.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-5VFD3YHA.mjs";

// trigger/setup-agent.ts
init_esm();
var import_e2b = __toESM(require_dist(), 1);
function agentTx(agentId) {
  const tx = admin_default.tx.agents[agentId];
  if (!tx) {
    throw new Error(`Agent transaction builder ${agentId} not found`);
  }
  return tx;
}
__name(agentTx, "agentTx");
var setupAgentTask = task({
  id: "setup-agent",
  retry: {
    maxAttempts: 3
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    await admin_default.transact(
      agentTx(payload.agentId).update({
        status: "setting_up"
      })
    );
    try {
      const { agents } = await admin_default.query({
        agents: {
          $: {
            where: {
              id: payload.agentId
            }
          }
        }
      });
      const agent = agents[0];
      if (!agent) {
        throw new Error(`Agent ${payload.agentId} not found`);
      }
      if (!agent.auth) {
        throw new Error(`Agent ${payload.agentId} is missing auth`);
      }
      const sandbox = await import_e2b.Sandbox.create("codex", {
        timeoutMs: 10 * 60 * 1e3,
        lifecycle: {
          onTimeout: "pause",
          autoResume: true
        }
      });
      await sandbox.files.write(
        "~/.codex/auth.json",
        JSON.stringify(agent.auth)
      );
      const codexUpdate = await sandbox.commands.run(
        "npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
        { timeoutMs: 0 }
      );
      console.log(codexUpdate);
      const result = await sandbox.commands.run(
        'codex exec --yolo --model gpt-5.5 --skip-git-repo-check "Respond with PING and nothing else"'
      );
      console.log(result);
      await syncAgentAuthFromSandbox(sandbox, payload.agentId);
      await admin_default.transact(
        agentTx(payload.agentId).update({
          sandboxId: sandbox.sandboxId,
          status: "ready"
        })
      );
    } catch (error) {
      await admin_default.transact(
        agentTx(payload.agentId).update({
          status: "setup_failed"
        })
      );
      throw error;
    }
  }, "run")
});
export {
  setupAgentTask
};
//# sourceMappingURL=setup-agent.mjs.map
