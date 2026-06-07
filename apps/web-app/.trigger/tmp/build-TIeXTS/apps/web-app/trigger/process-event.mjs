import {
  formatCodexDeveloperInstructionsConfig,
  getCodexDeveloperInstructions
} from "../../../chunk-VMQ3ISWR.mjs";
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
} from "../../../chunk-XUORTWA2.mjs";
import "../../../chunk-HZ3XIZM7.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../chunk-5VFD3YHA.mjs";

// trigger/process-event.ts
init_esm();
import { randomUUID } from "node:crypto";

// ../../packages/encryption/src/index.ts
init_esm();
var ENCRYPTION_VERSION = "v1";
var IV_BYTE_LENGTH = 12;
var createEncryptionService = /* @__PURE__ */ __name((secretKey) => {
  if (secretKey.trim().length === 0) {
    throw new Error("Encryption secret key must not be empty");
  }
  return {
    async encrypt(value) {
      const crypto = getCrypto();
      const key = await importAesKey(secretKey);
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv
        },
        key,
        new TextEncoder().encode(value)
      );
      return [
        ENCRYPTION_VERSION,
        toBase64Url(iv),
        toBase64Url(new Uint8Array(encrypted))
      ].join(":");
    },
    async decrypt(value) {
      const [version, encodedIv, encodedEncryptedValue] = value.split(":");
      if (version !== ENCRYPTION_VERSION || !encodedIv || !encodedEncryptedValue) {
        throw new Error("Encrypted value has an invalid format");
      }
      const crypto = getCrypto();
      const key = await importAesKey(secretKey);
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: fromBase64Url(encodedIv)
        },
        key,
        fromBase64Url(encodedEncryptedValue)
      );
      return new TextDecoder().decode(decrypted);
    }
  };
}, "createEncryptionService");
var importAesKey = /* @__PURE__ */ __name(async (secretKey) => {
  const crypto = getCrypto();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secretKey)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt"
  ]);
}, "importAesKey");
var getCrypto = /* @__PURE__ */ __name(() => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is not available");
  }
  return globalThis.crypto;
}, "getCrypto");
var toBase64Url = /* @__PURE__ */ __name((bytes) => {
  let binary = "";
  const chunkSize = 32768;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}, "toBase64Url");
var fromBase64Url = /* @__PURE__ */ __name((value) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const paddedBase64 = base64.padEnd(
    base64.length + (4 - base64.length % 4) % 4,
    "="
  );
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}, "fromBase64Url");

// trigger/process-event.ts
var import_e2b = __toESM(require_dist(), 1);

// codex-options.ts
init_esm();
var DEFAULT_CODEX_MODEL = "gpt-5.5";
var DEFAULT_CODEX_REASONING_EFFORT = "medium";
var DEFAULT_CODEX_SPEED = "standard";
var CODEX_REASONING_EFFORT_OPTIONS = [
  { value: "minimal", label: "minimal" },
  { value: "low", label: "low" },
  { value: "medium", label: "medium" },
  { value: "high", label: "high" },
  { value: "xhigh", label: "xhigh" }
];
var CODEX_SPEED_OPTIONS = [
  { value: "standard", label: "standard" },
  { value: "fast", label: "fast" }
];
var getCodexSpeedConfigOverrides = /* @__PURE__ */ __name((speed) => {
  if (speed !== "fast") {
    return [];
  }
  return ["service_tier=fast", "features.fast_mode=true"];
}, "getCodexSpeedConfigOverrides");
var getTaskAgentSpeed = /* @__PURE__ */ __name((speed) => {
  const resolved = speed ?? DEFAULT_CODEX_SPEED;
  const isValid = CODEX_SPEED_OPTIONS.some((option) => option.value === resolved);
  return isValid ? resolved : DEFAULT_CODEX_SPEED;
}, "getTaskAgentSpeed");

// trigger/process-event.ts
var CODEX_AUTH_PATH = "~/.codex/auth.json";
var DIFF_BASELINE_ROOT = "/tmp/factoryplane-baselines";
var DIFF_WORK_ROOT = "/tmp/factoryplane-diff-work";
var DIFF_STORAGE_CONTENT_TYPE = "text/x-patch";
var SANDBOX_DIFF_EXCLUDES = [
  ".git",
  ".codex",
  ".factoryplane",
  ".cache",
  ".config",
  ".npm",
  ".next",
  ".turbo",
  ".vercel",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "*.log",
  ".env",
  ".env.*"
];
var taskTx = /* @__PURE__ */ __name((taskId) => {
  const tx = admin_default.tx.tasks[taskId];
  if (!tx) {
    throw new Error(`Task transaction builder ${taskId} not found`);
  }
  return tx;
}, "taskTx");
var eventTx = /* @__PURE__ */ __name((eventId) => {
  const tx = admin_default.tx.events[eventId];
  if (!tx) {
    throw new Error(`Event transaction builder ${eventId} not found`);
  }
  return tx;
}, "eventTx");
var processEventTask = task({
  id: "process-event",
  retry: {
    maxAttempts: 3
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    console.log("Processing event", payload);
    const event = await admin_default.query({
      events: {
        $: {
          where: {
            id: payload.eventId
          }
        },
        task: {
          agent: {},
          factory: {}
        }
      }
    }).then((result) => result.events[0]);
    const task2 = event?.task;
    const agent = task2?.agent;
    const factory = task2?.factory;
    if (!event || !task2 || !agent || !factory) {
      console.log("Skipping event without task, agent, or factory", payload);
      return;
    }
    if (event?.type === "factoryplane.new_task") {
      await processNewTask(agent, task2, factory);
    } else if (event?.type === "factoryplane.new_user_message") {
      await processNewUserMessage(
        event,
        task2,
        agent,
        factory
      );
    }
  }, "run")
});
var processNewTask = /* @__PURE__ */ __name(async (agent, task2, factory) => {
  const sandbox = await setupTaskSandbox(agent, task2, factory);
  const message = `${task2.name}. ${task2.instructions ?? ""}.`;
  await runCodexExec(sandbox, task2, factory, message, {}, agent.id);
}, "processNewTask");
var processNewUserMessage = /* @__PURE__ */ __name(async (event, task2, agent, factory) => {
  const content = getStringDataValue(event.data, "content");
  if (!content) {
    console.log("Skipping user message event without content", event.id);
    return;
  }
  if (!task2.sandboxId) {
    throw new Error(`Task ${task2.id} is missing sandboxId`);
  }
  const sandbox = await import_e2b.Sandbox.connect(task2.sandboxId);
  await killTaskCodexProcess(sandbox, task2);
  await runCodexExec(
    sandbox,
    task2,
    factory,
    content,
    { resumeLast: true },
    agent.id
  );
}, "processNewUserMessage");
var setupTaskSandbox = /* @__PURE__ */ __name(async (agent, task2, factory) => {
  if (!agent.auth || !factory) {
    throw new Error(`Agent ${agent.id} is missing auth or factory`);
  }
  const sandbox = await runSetupStep(
    task2.id,
    "sandbox",
    "Create sandbox",
    () => import_e2b.Sandbox.create("codex", {
      timeoutMs: 10 * 60 * 1e3,
      lifecycle: {
        onTimeout: "pause",
        autoResume: true
      }
    }),
    { timeoutMs: 12e4 }
  );
  await admin_default.transact(
    taskTx(task2.id).update({
      sandboxId: sandbox.sandboxId
    })
  );
  await runSetupStep(
    task2.id,
    "codex_auth",
    "Write Codex auth",
    () => sandbox.files.write(CODEX_AUTH_PATH, JSON.stringify(agent.auth))
  );
  const codexUpdate = await runSetupStep(
    task2.id,
    "codex_update",
    "Update Codex",
    () => sandbox.commands.run(
      "npm install -g @openai/codex@latest --no-audit --no-fund || codex --version",
      { timeoutMs: 12e4 }
    ),
    { timeoutMs: 13e4 }
  );
  console.log(codexUpdate);
  const diffWorkspacePath = await runSetupStep(
    task2.id,
    "diff_baseline",
    "Create diff baseline",
    () => createTaskWorkspaceBaseline(sandbox, task2.id)
  );
  await admin_default.transact(
    taskTx(task2.id).update({
      diffWorkspacePath
    })
  );
  return sandbox;
}, "setupTaskSandbox");
var runCodexExec = /* @__PURE__ */ __name(async (sandbox, task2, factory, prompt, options = {}, agentId) => {
  const { envs, agentToken } = await setupRun(sandbox, task2, factory);
  const output = createCodexOutputHandler(task2.id);
  const command = await runSetupStep(
    task2.id,
    "codex_launch",
    options.resumeLast ? "Resume Codex" : "Start Codex",
    () => sandbox.commands.run(buildCodexExecCommand(task2, prompt, options), {
      background: true,
      timeoutMs: 0,
      envs,
      onStdout: output.append,
      onStderr: /* @__PURE__ */ __name((data) => {
        console.error(data);
      }, "onStderr")
    })
  );
  await updateTaskAgentPid(task2.id, command.pid);
  let wasInterrupted = false;
  try {
    const result = await command.wait();
    console.log(result);
  } catch (error) {
    const currentPid = await getTaskAgentPid(task2.id);
    if (currentPid !== command.pid) {
      console.log("Codex process was interrupted", {
        taskId: task2.id,
        pid: command.pid,
        error
      });
      wasInterrupted = true;
      return;
    }
    throw error;
  } finally {
    await output.flush();
    if (!wasInterrupted) {
      await persistTaskDiff(sandbox, task2).catch((error) => {
        console.error("Failed to persist task diff", {
          taskId: task2.id,
          error
        });
      });
    }
    await clearTaskAgentPid(task2.id, command.pid);
    await postRun(task2.id, agentToken);
    await syncAgentAuthFromSandbox(sandbox, agentId);
  }
}, "runCodexExec");
var createTaskWorkspaceBaseline = /* @__PURE__ */ __name(async (sandbox, taskId) => {
  const workspacePath = await getSandboxWorkspacePath(sandbox);
  const baselinePath = getTaskBaselinePath(taskId);
  await sandbox.commands.run(
    [
      "set -e",
      buildReplaceDirectoryFunction(),
      `replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(baselinePath)}`
    ].join("\n"),
    { timeoutMs: 12e4 }
  );
  return workspacePath;
}, "createTaskWorkspaceBaseline");
var persistTaskDiff = /* @__PURE__ */ __name(async (sandbox, task2) => {
  const workspacePath = typeof task2.diffWorkspacePath === "string" && task2.diffWorkspacePath.length > 0 ? task2.diffWorkspacePath : await getSandboxWorkspacePath(sandbox);
  const baselinePath = getTaskBaselinePath(task2.id);
  const hasBaseline = await sandbox.commands.run(
    `test -d ${shellQuote(baselinePath)} && printf yes || printf no`,
    { timeoutMs: 3e4 }
  );
  if (hasBaseline.stdout.trim() !== "yes") {
    console.warn("Task diff baseline missing; recreating baseline", {
      taskId: task2.id,
      baselinePath
    });
    const nextWorkspacePath = await createTaskWorkspaceBaseline(
      sandbox,
      task2.id
    );
    await admin_default.transact(
      taskTx(task2.id).update({
        diffWorkspacePath: nextWorkspacePath
      })
    );
    return;
  }
  const patch = await generateTaskPatch(sandbox, task2.id, workspacePath);
  const latestDiffPath = `tasks/${task2.id}/latest.patch`;
  const patchBuffer = Buffer.from(patch, "utf8");
  const { data: file } = await admin_default.storage.uploadFile(
    latestDiffPath,
    patchBuffer,
    {
      contentType: DIFF_STORAGE_CONTENT_TYPE,
      contentDisposition: `inline; filename="${task2.id}.patch"`
    }
  );
  await admin_default.transact(
    taskTx(task2.id).update({
      diffWorkspacePath: workspacePath,
      latestDiffPath,
      latestDiffGeneratedAt: (/* @__PURE__ */ new Date()).toISOString(),
      latestDiffBytes: patchBuffer.byteLength
    }).link({ latestDiffFile: file.id })
  );
}, "persistTaskDiff");
var generateTaskPatch = /* @__PURE__ */ __name(async (sandbox, taskId, workspacePath) => {
  const baselinePath = getTaskBaselinePath(taskId);
  const workPath = `${DIFF_WORK_ROOT}/${taskId}`;
  const repoPath = `${workPath}/repo`;
  const result = await sandbox.commands.run(
    [
      "set -e",
      buildReplaceDirectoryFunction(),
      `rm -rf ${shellQuote(workPath)}`,
      `mkdir -p ${shellQuote(repoPath)}`,
      `replace_factoryplane_dir ${shellQuote(baselinePath)} ${shellQuote(repoPath)}`,
      `cd ${shellQuote(repoPath)}`,
      "git init -q",
      "git config user.email factoryplane@example.com",
      "git config user.name Factoryplane",
      "git add -A",
      "git commit --allow-empty -qm baseline",
      `replace_factoryplane_dir ${shellQuote(workspacePath)} ${shellQuote(repoPath)}`,
      "git add -A",
      "git diff --cached --binary --full-index HEAD"
    ].join("\n"),
    { timeoutMs: 12e4 }
  );
  return result.stdout;
}, "generateTaskPatch");
var getSandboxWorkspacePath = /* @__PURE__ */ __name(async (sandbox) => {
  const result = await sandbox.commands.run("pwd -P", { timeoutMs: 3e4 });
  const workspacePath = result.stdout.trim();
  if (!workspacePath) {
    throw new Error("Failed to resolve sandbox workspace path");
  }
  return workspacePath;
}, "getSandboxWorkspacePath");
var getTaskBaselinePath = /* @__PURE__ */ __name((taskId) => {
  return `${DIFF_BASELINE_ROOT}/${taskId}`;
}, "getTaskBaselinePath");
var buildReplaceDirectoryFunction = /* @__PURE__ */ __name(() => {
  const rsyncExcludes = SANDBOX_DIFF_EXCLUDES.map(
    (pattern) => `--exclude ${shellQuote(pattern)}`
  ).join(" ");
  const tarExcludes = SANDBOX_DIFF_EXCLUDES.map(
    (pattern) => `--exclude=${shellQuote(pattern)}`
  ).join(" ");
  return `
replace_factoryplane_dir() {
	src="$1"
	dest="$2"
	mkdir -p "$dest"
	if command -v rsync >/dev/null 2>&1; then
		rsync -a --delete ${rsyncExcludes} "$src"/ "$dest"/
	else
		find "$dest" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
		tar -C "$src" ${tarExcludes} -cf - . | tar -C "$dest" -xf -
	fi
}
`;
}, "buildReplaceDirectoryFunction");
var setupRun = /* @__PURE__ */ __name(async (sandbox, task2, factory) => {
  const agentToken = randomUUID();
  await admin_default.transact(
    taskTx(task2.id).update({
      agentToken
    })
  );
  const envs = {
    FACTORYPLANE_AUTH_TOKEN: agentToken
  };
  await runOptionalSetupStep(
    task2.id,
    "github_auth",
    "Validate GitHub token",
    async () => {
      const encryptionService = createEncryptionService(
        process.env.SECRET_ENCRYPTION_KEY ?? ""
      );
      if (!factory.githubAccessTokenEncrypted) {
        throw new Error(`Factory ${factory.id} is missing GitHub access token`);
      }
      const githubAccessToken = await encryptionService.decrypt(
        factory.githubAccessTokenEncrypted
      );
      envs.GITHUB_ACCESS_TOKEN = githubAccessToken;
      envs.GH_TOKEN = githubAccessToken;
      let authStderr = "";
      try {
        const ghAuth = await sandbox.commands.run(
          [
            "set +e",
            'login="$(gh api user --jq .login 2>&1)"',
            "status=$?",
            'if [ "$status" -ne 0 ]; then',
            '  printf "GitHub CLI auth failed while validating factory GitHub token:\\n%s\\n" "$login" >&2',
            '  exit "$status"',
            "fi",
            'printf "Authenticated GitHub CLI as %s\\n" "$login"'
          ].join("\n"),
          {
            timeoutMs: 3e4,
            envs,
            onStdout: /* @__PURE__ */ __name((data) => {
              console.log(data);
            }, "onStdout"),
            onStderr: /* @__PURE__ */ __name((data) => {
              authStderr += data;
              console.error(data);
            }, "onStderr")
          }
        );
        console.log(ghAuth);
      } catch (error) {
        delete envs.GITHUB_ACCESS_TOKEN;
        delete envs.GH_TOKEN;
        throw new Error(
          [
            "GitHub CLI auth failed",
            authStderr.trim() || getErrorMessage(error)
          ].join(": ")
        );
      }
    }
  );
  return { envs, agentToken };
}, "setupRun");
var postRun = /* @__PURE__ */ __name(async (taskId, agentToken) => {
  await clearTaskAgentToken(taskId, agentToken);
}, "postRun");
var buildCodexExecCommand = /* @__PURE__ */ __name((task2, prompt, options = {}) => {
  const model = getTaskAgentModel(task2);
  const reasoningEffort = getTaskAgentReasoningEffort(task2);
  const speedConfigOverrides = getCodexSpeedConfigOverrides(
    getTaskAgentSpeed(task2.agentSpeed)
  );
  const args = [
    "codex exec",
    "--json",
    "--yolo",
    `--model ${shellQuote(model)}`,
    `-c ${shellQuote(`model_reasoning_effort=${reasoningEffort}`)}`,
    ...speedConfigOverrides.map((override) => `-c ${shellQuote(override)}`),
    "--skip-git-repo-check"
  ];
  if (options.resumeLast) {
    args.push("resume --last");
  } else {
    args.push(
      `-c ${shellQuote(formatCodexDeveloperInstructionsConfig(getCodexDeveloperInstructions()))}`
    );
  }
  args.push(shellQuote(prompt));
  return args.join(" ");
}, "buildCodexExecCommand");
var getTaskAgentModel = /* @__PURE__ */ __name((task2) => {
  return task2.agentModel ?? DEFAULT_CODEX_MODEL;
}, "getTaskAgentModel");
var getTaskAgentReasoningEffort = /* @__PURE__ */ __name((task2) => {
  const effort = task2.agentReasoningEffort ?? DEFAULT_CODEX_REASONING_EFFORT;
  const isValid = CODEX_REASONING_EFFORT_OPTIONS.some(
    (option) => option.value === effort
  );
  return isValid ? effort : DEFAULT_CODEX_REASONING_EFFORT;
}, "getTaskAgentReasoningEffort");
var killTaskCodexProcess = /* @__PURE__ */ __name(async (sandbox, task2) => {
  if (typeof task2.agentPid !== "number") {
    return;
  }
  try {
    const killed = await sandbox.commands.kill(task2.agentPid);
    console.log("Killed previous Codex process", {
      taskId: task2.id,
      pid: task2.agentPid,
      killed
    });
  } catch (error) {
    console.log("Failed to kill previous Codex process", {
      taskId: task2.id,
      pid: task2.agentPid,
      error
    });
  }
  await clearTaskAgentPid(task2.id, task2.agentPid);
}, "killTaskCodexProcess");
var updateTaskAgentPid = /* @__PURE__ */ __name(async (taskId, agentPid) => {
  await admin_default.transact(
    taskTx(taskId).update({
      agentPid
    })
  );
}, "updateTaskAgentPid");
var clearTaskAgentPid = /* @__PURE__ */ __name(async (taskId, agentPid) => {
  const currentPid = await getTaskAgentPid(taskId);
  if (currentPid !== agentPid) {
    return;
  }
  await admin_default.transact(
    taskTx(taskId).update({
      agentPid: void 0
    })
  );
}, "clearTaskAgentPid");
var getTaskAgentPid = /* @__PURE__ */ __name(async (taskId) => {
  const currentTask = await admin_default.query({
    tasks: {
      $: {
        where: {
          id: taskId
        }
      }
    }
  }).then((result) => result.tasks[0]);
  return currentTask?.agentPid;
}, "getTaskAgentPid");
var clearTaskAgentToken = /* @__PURE__ */ __name(async (taskId, agentToken) => {
  const currentToken = await getTaskAgentToken(taskId);
  if (currentToken !== agentToken) {
    return;
  }
  await admin_default.transact(
    taskTx(taskId).update({
      agentToken: void 0
    })
  );
}, "clearTaskAgentToken");
var getTaskAgentToken = /* @__PURE__ */ __name(async (taskId) => {
  const currentTask = await admin_default.query({
    tasks: {
      $: {
        where: {
          id: taskId
        }
      }
    }
  }).then((result) => result.tasks[0]);
  return currentTask?.agentToken;
}, "getTaskAgentToken");
var createCodexOutputHandler = /* @__PURE__ */ __name((taskId) => {
  let buffer = "";
  const append = /* @__PURE__ */ __name(async (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    await persistCodexEvents(taskId, parseCodexLines(lines));
  }, "append");
  const flush = /* @__PURE__ */ __name(async () => {
    const finalLine = buffer.trim();
    buffer = "";
    if (!finalLine) {
      return;
    }
    const events = parseCodexLines([finalLine]);
    await persistCodexEvents(taskId, events);
  }, "flush");
  return { append, flush };
}, "createCodexOutputHandler");
var parseCodexLines = /* @__PURE__ */ __name((lines) => {
  const events = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    events.push(parseCodexEvent(line));
  }
  return events;
}, "parseCodexLines");
var parseCodexEvent = /* @__PURE__ */ __name((line) => {
  try {
    const data = JSON.parse(line);
    if (!isRecord(data)) {
      return {
        type: "codex.event",
        data: {
          value: data,
          raw: line
        }
      };
    }
    const rawType = typeof data.type === "string" && data.type.length > 0 ? data.type : "event";
    return {
      type: rawType.startsWith("codex.") ? rawType : `codex.${rawType}`,
      data
    };
  } catch (error) {
    return {
      type: "codex.unparsed",
      data: {
        raw: line,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}, "parseCodexEvent");
var persistCodexEvents = /* @__PURE__ */ __name(async (taskId, events) => {
  if (events.length === 0) {
    return;
  }
  await admin_default.transact(
    events.map((event) => {
      const eventTx2 = admin_default.tx.events[randomUUID()];
      if (!eventTx2) {
        throw new Error("Failed to create InstantDB event transaction");
      }
      return eventTx2.create({
        type: event.type,
        data: event.data,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }).link({ task: taskId });
    })
  );
}, "persistCodexEvents");
var runSetupStep = /* @__PURE__ */ __name(async (taskId, step, title, action, options = {}) => {
  console.log("Setup step started", { taskId, step, title });
  await persistFactoryplaneEvent(taskId, "factoryplane.setup_step_started", {
    step,
    title,
    status: "started"
  });
  try {
    const result = await runWithTimeout(action(), title, options.timeoutMs);
    console.log("Setup step completed", { taskId, step, title });
    await persistFactoryplaneEvent(
      taskId,
      "factoryplane.setup_step_completed",
      {
        step,
        title,
        status: "completed"
      }
    );
    return result;
  } catch (error) {
    console.error("Setup step failed", {
      taskId,
      step,
      title,
      error
    });
    await persistFactoryplaneEvent(taskId, "factoryplane.setup_step_failed", {
      step,
      title,
      status: "failed",
      error: getErrorMessage(error)
    });
    throw error;
  }
}, "runSetupStep");
var runWithTimeout = /* @__PURE__ */ __name(async (promise, label, timeoutMs) => {
  if (!timeoutMs) {
    return promise;
  }
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}, "runWithTimeout");
var runOptionalSetupStep = /* @__PURE__ */ __name(async (taskId, step, title, action) => {
  try {
    await runSetupStep(taskId, step, title, action);
  } catch (error) {
    console.warn("Optional setup step failed", {
      taskId,
      step,
      error
    });
  }
}, "runOptionalSetupStep");
var persistFactoryplaneEvent = /* @__PURE__ */ __name(async (taskId, type, data) => {
  await admin_default.transact(
    eventTx(randomUUID()).create({
      type,
      data,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }).link({ task: taskId })
  );
}, "persistFactoryplaneEvent");
var getErrorMessage = /* @__PURE__ */ __name((error) => {
  return error instanceof Error ? error.message : String(error);
}, "getErrorMessage");
var getStringDataValue = /* @__PURE__ */ __name((data, key) => {
  if (!isRecord(data)) {
    return void 0;
  }
  const value = data[key];
  return typeof value === "string" ? value : void 0;
}, "getStringDataValue");
var isRecord = /* @__PURE__ */ __name((value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}, "isRecord");
var shellQuote = /* @__PURE__ */ __name((value) => {
  return `'${value.replaceAll("'", "'\\''")}'`;
}, "shellQuote");
export {
  processEventTask
};
//# sourceMappingURL=process-event.mjs.map
