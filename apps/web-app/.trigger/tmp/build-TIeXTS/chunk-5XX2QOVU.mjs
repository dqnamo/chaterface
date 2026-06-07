import {
  TriggerTracer
} from "./chunk-7H7M4ORF.mjs";
import {
  ApiError,
  InputStreamOncePromise,
  ManualWaitpointPromise,
  RateLimitError,
  SemanticInternalAttributes,
  TaskRunPromise,
  WaitpointTimeoutError,
  accessoryAttributes,
  apiClientManager,
  conditionallyImportAndParsePacket,
  conditionallyImportPacket,
  createErrorTaskError,
  defaultRetryOptions,
  flattenIdempotencyKey,
  getEnvVar,
  getIdempotencyKeyOptions,
  inputStreams,
  lifecycleHooks,
  makeIdempotencyKey,
  mergeRequestOptions,
  parsePacket,
  realtimeStreams,
  resourceCatalog,
  runMetadata,
  runtime,
  stringifyIO,
  taskContext,
  timeout
} from "./chunk-GROY7YFJ.mjs";
import {
  SpanKind,
  SpanStatusCode,
  init_esm as init_esm2
} from "./chunk-QDCQOHL3.mjs";
import {
  __name,
  init_esm
} from "./chunk-5VFD3YHA.mjs";

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/config.js
init_esm();
function defineConfig(config) {
  return config;
}
__name(defineConfig, "defineConfig");

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tasks.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/hooks.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/shared.js
init_esm();
init_esm2();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tracer.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/version.js
init_esm();
var VERSION = "4.4.6";

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tracer.js
var tracer = new TriggerTracer({ name: "@trigger.dev/sdk", version: VERSION });

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/shared.js
function createTask(params) {
  const task2 = {
    id: params.id,
    description: params.description,
    jsonSchema: params.jsonSchema,
    trigger: /* @__PURE__ */ __name(async (payload, options) => {
      return await trigger_internal("trigger()", params.id, payload, void 0, {
        queue: params.queue?.name,
        ...options
      });
    }, "trigger"),
    batchTrigger: /* @__PURE__ */ __name(async (items, options) => {
      return await batchTrigger_internal("batchTrigger()", params.id, items, options, void 0, void 0, params.queue?.name);
    }, "batchTrigger"),
    triggerAndWait: /* @__PURE__ */ __name((payload, options, requestOptions) => {
      return new TaskRunPromise((resolve, reject) => {
        triggerAndWait_internal("triggerAndWait()", params.id, payload, void 0, {
          queue: params.queue?.name,
          ...options
        }, requestOptions).then((result) => {
          resolve(result);
        }).catch((error) => {
          reject(error);
        });
      }, params.id);
    }, "triggerAndWait"),
    batchTriggerAndWait: /* @__PURE__ */ __name(async (items, options) => {
      return await batchTriggerAndWait_internal("batchTriggerAndWait()", params.id, items, void 0, options, void 0, params.queue?.name);
    }, "batchTriggerAndWait")
  };
  registerTaskLifecycleHooks(params.id, params);
  resourceCatalog.registerTaskMetadata({
    id: params.id,
    description: params.description,
    queue: params.queue,
    retry: params.retry ? { ...defaultRetryOptions, ...params.retry } : void 0,
    machine: typeof params.machine === "string" ? { preset: params.machine } : params.machine,
    maxDuration: params.maxDuration,
    ttl: params.ttl,
    payloadSchema: params.jsonSchema,
    fns: {
      run: params.run
    }
  });
  const queue2 = params.queue;
  if (queue2 && typeof queue2.name === "string") {
    resourceCatalog.registerQueueMetadata({
      name: queue2.name,
      concurrencyLimit: queue2.concurrencyLimit
    });
  }
  task2[Symbol.for("trigger.dev/task")] = true;
  return task2;
}
__name(createTask, "createTask");
async function executeBatchTwoPhase(apiClient, items, options, requestOptions) {
  let batch;
  try {
    batch = await apiClient.createBatch({
      runCount: items.length,
      parentRunId: options.parentRunId,
      resumeParentOnCompletion: options.resumeParentOnCompletion,
      idempotencyKey: options.idempotencyKey,
      idempotencyKeyOptions: options.idempotencyKeyOptions
    }, { spanParentAsLink: options.spanParentAsLink }, requestOptions);
  } catch (error) {
    throw new BatchTriggerError(`Failed to create batch with ${items.length} items`, {
      cause: error,
      phase: "create",
      itemCount: items.length
    });
  }
  if (!batch.isCached) {
    try {
      await apiClient.streamBatchItems(batch.id, items, requestOptions);
    } catch (error) {
      throw new BatchTriggerError(`Failed to stream items for batch ${batch.id} (${items.length} items)`, { cause: error, phase: "stream", batchId: batch.id, itemCount: items.length });
    }
  }
  return {
    id: batch.id,
    runCount: batch.runCount,
    publicAccessToken: batch.publicAccessToken,
    taskIdentifiers: items.map((item) => item.task)
  };
}
__name(executeBatchTwoPhase, "executeBatchTwoPhase");
var BatchTriggerError = class extends Error {
  static {
    __name(this, "BatchTriggerError");
  }
  phase;
  batchId;
  itemCount;
  /** True if the error was caused by rate limiting (HTTP 429) */
  isRateLimited;
  /** Milliseconds until the rate limit resets. Only set when `isRateLimited` is true. */
  retryAfterMs;
  /** The underlying API error, if the cause was an ApiError */
  apiError;
  /** The underlying cause of the error */
  cause;
  constructor(message, options) {
    const fullMessage = buildBatchErrorMessage(message, options.cause);
    super(fullMessage, { cause: options.cause });
    this.name = "BatchTriggerError";
    this.cause = options.cause;
    this.phase = options.phase;
    this.batchId = options.batchId;
    this.itemCount = options.itemCount;
    if (options.cause instanceof RateLimitError) {
      this.isRateLimited = true;
      this.retryAfterMs = options.cause.millisecondsUntilReset;
      this.apiError = options.cause;
    } else if (options.cause instanceof ApiError) {
      this.isRateLimited = options.cause.status === 429;
      this.apiError = options.cause;
    } else {
      this.isRateLimited = false;
    }
  }
};
function buildBatchErrorMessage(baseMessage, cause) {
  if (!cause) {
    return baseMessage;
  }
  if (cause instanceof RateLimitError) {
    const retryMs = cause.millisecondsUntilReset;
    if (retryMs !== void 0) {
      const retrySeconds = Math.ceil(retryMs / 1e3);
      return `${baseMessage}: Rate limit exceeded - retry after ${retrySeconds}s`;
    }
    return `${baseMessage}: Rate limit exceeded`;
  }
  if (cause instanceof ApiError) {
    return `${baseMessage}: ${cause.message}`;
  }
  if (cause instanceof Error) {
    return `${baseMessage}: ${cause.message}`;
  }
  return baseMessage;
}
__name(buildBatchErrorMessage, "buildBatchErrorMessage");
async function executeBatchTwoPhaseStreaming(apiClient, items, options, requestOptions) {
  const itemsArray = [];
  for await (const item of items) {
    itemsArray.push(item);
  }
  return executeBatchTwoPhase(apiClient, itemsArray, options, requestOptions);
}
__name(executeBatchTwoPhaseStreaming, "executeBatchTwoPhaseStreaming");
function isReadableStream(value) {
  return value != null && typeof value === "object" && "getReader" in value && typeof value.getReader === "function";
}
__name(isReadableStream, "isReadableStream");
async function* readableStreamToAsyncIterable(stream2) {
  const reader = stream2.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      yield value;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
    }
    reader.releaseLock();
  }
}
__name(readableStreamToAsyncIterable, "readableStreamToAsyncIterable");
function normalizeToAsyncIterable(input2) {
  if (isReadableStream(input2)) {
    return readableStreamToAsyncIterable(input2);
  }
  return input2;
}
__name(normalizeToAsyncIterable, "normalizeToAsyncIterable");
async function* transformSingleTaskBatchItemsStream(taskIdentifier, items, parsePayload, options, queue2) {
  let index = 0;
  for await (const item of items) {
    const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
    const payloadPacket = await stringifyIO(parsedPayload);
    const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
    yield {
      index: index++,
      task: taskIdentifier,
      payload: payloadPacket.data,
      options: {
        queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
        concurrencyKey: item.options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: item.options?.delay,
        ttl: item.options?.ttl,
        tags: item.options?.tags,
        maxAttempts: item.options?.maxAttempts,
        metadata: item.options?.metadata,
        maxDuration: item.options?.maxDuration,
        idempotencyKey: await makeIdempotencyKey(item.options?.idempotencyKey) ?? batchItemIdempotencyKey,
        idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
        machine: item.options?.machine,
        priority: item.options?.priority,
        region: item.options?.region,
        lockToVersion: item.options?.version ?? getEnvVar("TRIGGER_VERSION"),
        debounce: item.options?.debounce
      }
    };
  }
}
__name(transformSingleTaskBatchItemsStream, "transformSingleTaskBatchItemsStream");
async function* transformSingleTaskBatchItemsStreamForWait(taskIdentifier, items, parsePayload, options, queue2) {
  let index = 0;
  for await (const item of items) {
    const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
    const payloadPacket = await stringifyIO(parsedPayload);
    const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
    const itemIdempotencyKey = await makeIdempotencyKey(item.options?.idempotencyKey);
    const finalIdempotencyKey = itemIdempotencyKey ?? batchItemIdempotencyKey;
    const idempotencyKeyOptions = itemIdempotencyKey ? getIdempotencyKeyOptions(itemIdempotencyKey) : void 0;
    yield {
      index: index++,
      task: taskIdentifier,
      payload: payloadPacket.data,
      options: {
        lockToVersion: taskContext.worker?.version,
        queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
        concurrencyKey: item.options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: item.options?.delay,
        ttl: item.options?.ttl,
        tags: item.options?.tags,
        maxAttempts: item.options?.maxAttempts,
        metadata: item.options?.metadata,
        maxDuration: item.options?.maxDuration,
        idempotencyKey: finalIdempotencyKey?.toString(),
        idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
        idempotencyKeyOptions,
        machine: item.options?.machine,
        priority: item.options?.priority,
        region: item.options?.region,
        debounce: item.options?.debounce
      }
    };
  }
}
__name(transformSingleTaskBatchItemsStreamForWait, "transformSingleTaskBatchItemsStreamForWait");
async function trigger_internal(name2, id, payload, parsePayload, options, requestOptions) {
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  const parsedPayload = parsePayload ? await parsePayload(payload) : payload;
  const payloadPacket = await stringifyIO(parsedPayload);
  const processedIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
  const idempotencyKeyOptions = processedIdempotencyKey ? getIdempotencyKeyOptions(processedIdempotencyKey) : void 0;
  const handle = await apiClient.triggerTask(id, {
    payload: payloadPacket.data,
    options: {
      queue: options?.queue ? { name: options.queue } : void 0,
      concurrencyKey: options?.concurrencyKey,
      test: taskContext.ctx?.run.isTest,
      payloadType: payloadPacket.dataType,
      idempotencyKey: processedIdempotencyKey?.toString(),
      idempotencyKeyTTL: options?.idempotencyKeyTTL,
      idempotencyKeyOptions,
      delay: options?.delay,
      ttl: options?.ttl,
      tags: options?.tags,
      maxAttempts: options?.maxAttempts,
      metadata: options?.metadata,
      maxDuration: options?.maxDuration,
      parentRunId: taskContext.ctx?.run.id,
      machine: options?.machine,
      priority: options?.priority,
      region: options?.region,
      lockToVersion: options?.version ?? getEnvVar("TRIGGER_VERSION"),
      debounce: options?.debounce
    }
  }, {
    spanParentAsLink: true
  }, {
    name: name2,
    tracer,
    icon: "trigger",
    onResponseBody: /* @__PURE__ */ __name((body, span) => {
      if (body && typeof body === "object" && !Array.isArray(body)) {
        if ("id" in body && typeof body.id === "string") {
          span.setAttribute("runId", body.id);
        }
      }
    }, "onResponseBody"),
    ...requestOptions
  });
  return handle;
}
__name(trigger_internal, "trigger_internal");
async function batchTrigger_internal(name2, taskIdentifier, items, options, parsePayload, requestOptions, queue2) {
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  const ctx = taskContext.ctx;
  if (Array.isArray(items)) {
    const ndJsonItems = await Promise.all(items.map(async (item, index) => {
      const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
      const payloadPacket = await stringifyIO(parsedPayload);
      const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
      const itemIdempotencyKey = await makeIdempotencyKey(item.options?.idempotencyKey);
      const finalIdempotencyKey = itemIdempotencyKey ?? batchItemIdempotencyKey;
      const idempotencyKeyOptions = itemIdempotencyKey ? getIdempotencyKeyOptions(itemIdempotencyKey) : void 0;
      return {
        index,
        task: taskIdentifier,
        payload: payloadPacket.data,
        options: {
          queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
          concurrencyKey: item.options?.concurrencyKey,
          test: taskContext.ctx?.run.isTest,
          payloadType: payloadPacket.dataType,
          delay: item.options?.delay,
          ttl: item.options?.ttl,
          tags: item.options?.tags,
          maxAttempts: item.options?.maxAttempts,
          metadata: item.options?.metadata,
          maxDuration: item.options?.maxDuration,
          idempotencyKey: finalIdempotencyKey?.toString(),
          idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
          idempotencyKeyOptions,
          machine: item.options?.machine,
          priority: item.options?.priority,
          region: item.options?.region,
          lockToVersion: item.options?.version ?? getEnvVar("TRIGGER_VERSION")
        }
      };
    }));
    const batchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const batchIdempotencyKeyOptions = batchIdempotencyKey ? getIdempotencyKeyOptions(batchIdempotencyKey) : void 0;
    const response = await tracer.startActiveSpan(name2, async (span) => {
      const result = await executeBatchTwoPhase(apiClient, ndJsonItems, {
        parentRunId: ctx?.run.id,
        idempotencyKey: batchIdempotencyKey?.toString(),
        idempotencyKeyOptions: batchIdempotencyKeyOptions,
        spanParentAsLink: true
        // Fire-and-forget: child runs get separate trace IDs
      }, requestOptions);
      span.setAttribute("batchId", result.id);
      span.setAttribute("runCount", result.runCount);
      return result;
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: taskIdentifier,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
    const handle = {
      batchId: response.id,
      runCount: response.runCount,
      publicAccessToken: response.publicAccessToken
    };
    return handle;
  } else {
    const asyncItems = normalizeToAsyncIterable(items);
    const transformedItems = transformSingleTaskBatchItemsStream(taskIdentifier, asyncItems, parsePayload, options, queue2);
    const streamBatchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const streamBatchIdempotencyKeyOptions = streamBatchIdempotencyKey ? getIdempotencyKeyOptions(streamBatchIdempotencyKey) : void 0;
    const response = await tracer.startActiveSpan(name2, async (span) => {
      const result = await executeBatchTwoPhaseStreaming(apiClient, transformedItems, {
        parentRunId: ctx?.run.id,
        idempotencyKey: streamBatchIdempotencyKey?.toString(),
        idempotencyKeyOptions: streamBatchIdempotencyKeyOptions,
        spanParentAsLink: true
        // Fire-and-forget: child runs get separate trace IDs
      }, requestOptions);
      span.setAttribute("batchId", result.id);
      span.setAttribute("runCount", result.runCount);
      return result;
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: taskIdentifier,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
    const handle = {
      batchId: response.id,
      runCount: response.runCount,
      publicAccessToken: response.publicAccessToken
    };
    return handle;
  }
}
__name(batchTrigger_internal, "batchTrigger_internal");
async function triggerAndWait_internal(name2, id, payload, parsePayload, options, requestOptions) {
  const ctx = taskContext.ctx;
  if (!ctx) {
    throw new Error("triggerAndWait can only be used from inside a task.run()");
  }
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  const parsedPayload = parsePayload ? await parsePayload(payload) : payload;
  const payloadPacket = await stringifyIO(parsedPayload);
  const processedIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
  const idempotencyKeyOptions = processedIdempotencyKey ? getIdempotencyKeyOptions(processedIdempotencyKey) : void 0;
  return await tracer.startActiveSpan(name2, async (span) => {
    const response = await apiClient.triggerTask(id, {
      payload: payloadPacket.data,
      options: {
        lockToVersion: taskContext.worker?.version,
        // Lock to current version because we're waiting for it to finish
        queue: options?.queue ? { name: options.queue } : void 0,
        concurrencyKey: options?.concurrencyKey,
        test: taskContext.ctx?.run.isTest,
        payloadType: payloadPacket.dataType,
        delay: options?.delay,
        ttl: options?.ttl,
        tags: options?.tags,
        maxAttempts: options?.maxAttempts,
        metadata: options?.metadata,
        maxDuration: options?.maxDuration,
        resumeParentOnCompletion: true,
        parentRunId: ctx.run.id,
        idempotencyKey: processedIdempotencyKey?.toString(),
        idempotencyKeyTTL: options?.idempotencyKeyTTL,
        idempotencyKeyOptions,
        machine: options?.machine,
        priority: options?.priority,
        region: options?.region,
        debounce: options?.debounce
      }
    }, {}, requestOptions);
    span.setAttribute("runId", response.id);
    const result = await runtime.waitForTask({
      id: response.id,
      ctx
    });
    return await handleTaskRunExecutionResult(result, id);
  }, {
    kind: SpanKind.PRODUCER,
    attributes: {
      [SemanticInternalAttributes.STYLE_ICON]: "trigger",
      ...accessoryAttributes({
        items: [
          {
            text: id,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
}
__name(triggerAndWait_internal, "triggerAndWait_internal");
async function batchTriggerAndWait_internal(name2, id, items, parsePayload, options, requestOptions, queue2) {
  const ctx = taskContext.ctx;
  if (!ctx) {
    throw new Error("batchTriggerAndWait can only be used from inside a task.run()");
  }
  const apiClient = apiClientManager.clientOrThrow(requestOptions?.clientConfig);
  if (Array.isArray(items)) {
    const ndJsonItems = await Promise.all(items.map(async (item, index) => {
      const parsedPayload = parsePayload ? await parsePayload(item.payload) : item.payload;
      const payloadPacket = await stringifyIO(parsedPayload);
      const batchItemIdempotencyKey = await makeIdempotencyKey(flattenIdempotencyKey([options?.idempotencyKey, `${index}`]));
      const itemIdempotencyKey = await makeIdempotencyKey(item.options?.idempotencyKey);
      const finalIdempotencyKey = itemIdempotencyKey ?? batchItemIdempotencyKey;
      const idempotencyKeyOptions = itemIdempotencyKey ? getIdempotencyKeyOptions(itemIdempotencyKey) : void 0;
      return {
        index,
        task: id,
        payload: payloadPacket.data,
        options: {
          lockToVersion: taskContext.worker?.version,
          queue: item.options?.queue ? { name: item.options.queue } : queue2 ? { name: queue2 } : void 0,
          concurrencyKey: item.options?.concurrencyKey,
          test: taskContext.ctx?.run.isTest,
          payloadType: payloadPacket.dataType,
          delay: item.options?.delay,
          ttl: item.options?.ttl,
          tags: item.options?.tags,
          maxAttempts: item.options?.maxAttempts,
          metadata: item.options?.metadata,
          maxDuration: item.options?.maxDuration,
          idempotencyKey: finalIdempotencyKey?.toString(),
          idempotencyKeyTTL: item.options?.idempotencyKeyTTL ?? options?.idempotencyKeyTTL,
          idempotencyKeyOptions,
          machine: item.options?.machine,
          priority: item.options?.priority,
          region: item.options?.region
        }
      };
    }));
    const batchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const batchIdempotencyKeyOptions = batchIdempotencyKey ? getIdempotencyKeyOptions(batchIdempotencyKey) : void 0;
    return await tracer.startActiveSpan(name2, async (span) => {
      const response = await executeBatchTwoPhase(apiClient, ndJsonItems, {
        parentRunId: ctx.run.id,
        resumeParentOnCompletion: true,
        idempotencyKey: batchIdempotencyKey?.toString(),
        idempotencyKeyOptions: batchIdempotencyKeyOptions,
        spanParentAsLink: false
        // Waiting: child runs share parent's trace ID
      }, requestOptions);
      span.setAttribute("batchId", response.id);
      span.setAttribute("runCount", response.runCount);
      const result = await runtime.waitForBatch({
        id: response.id,
        runCount: response.runCount,
        ctx
      });
      const runs2 = await handleBatchTaskRunExecutionResult(result.items, id);
      return {
        id: result.id,
        runs: runs2
      };
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: id,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
  } else {
    const asyncItems = normalizeToAsyncIterable(items);
    const transformedItems = transformSingleTaskBatchItemsStreamForWait(id, asyncItems, parsePayload, options, queue2);
    const streamBatchIdempotencyKey = await makeIdempotencyKey(options?.idempotencyKey);
    const streamBatchIdempotencyKeyOptions = streamBatchIdempotencyKey ? getIdempotencyKeyOptions(streamBatchIdempotencyKey) : void 0;
    return await tracer.startActiveSpan(name2, async (span) => {
      const response = await executeBatchTwoPhaseStreaming(apiClient, transformedItems, {
        parentRunId: ctx.run.id,
        resumeParentOnCompletion: true,
        idempotencyKey: streamBatchIdempotencyKey?.toString(),
        idempotencyKeyOptions: streamBatchIdempotencyKeyOptions,
        spanParentAsLink: false
        // Waiting: child runs share parent's trace ID
      }, requestOptions);
      span.setAttribute("batchId", response.id);
      span.setAttribute("runCount", response.runCount);
      const result = await runtime.waitForBatch({
        id: response.id,
        runCount: response.runCount,
        ctx
      });
      const runs2 = await handleBatchTaskRunExecutionResult(result.items, id);
      return {
        id: result.id,
        runs: runs2
      };
    }, {
      kind: SpanKind.PRODUCER,
      attributes: {
        [SemanticInternalAttributes.STYLE_ICON]: "trigger",
        ...accessoryAttributes({
          items: [
            {
              text: id,
              variant: "normal"
            }
          ],
          style: "codepath"
        })
      }
    });
  }
}
__name(batchTriggerAndWait_internal, "batchTriggerAndWait_internal");
async function handleBatchTaskRunExecutionResult(items, taskIdentifier) {
  const someObjectStoreOutputs = items.some((item) => item.ok && item.outputType === "application/store");
  if (!someObjectStoreOutputs) {
    const results = await Promise.all(items.map(async (item) => {
      return await handleTaskRunExecutionResult(item, taskIdentifier);
    }));
    return results;
  }
  return await tracer.startActiveSpan("store.downloadPayloads", async (span) => {
    const results = await Promise.all(items.map(async (item) => {
      return await handleTaskRunExecutionResult(item, taskIdentifier);
    }));
    return results;
  }, {
    kind: SpanKind.INTERNAL,
    [SemanticInternalAttributes.STYLE_ICON]: "cloud-download"
  });
}
__name(handleBatchTaskRunExecutionResult, "handleBatchTaskRunExecutionResult");
async function handleTaskRunExecutionResult(execution, taskIdentifier) {
  if (execution.ok) {
    const outputPacket = { data: execution.output, dataType: execution.outputType };
    const importedPacket = await conditionallyImportPacket(outputPacket, tracer);
    return {
      ok: true,
      id: execution.id,
      taskIdentifier: execution.taskIdentifier ?? taskIdentifier,
      output: await parsePacket(importedPacket)
    };
  } else {
    return {
      ok: false,
      id: execution.id,
      taskIdentifier: execution.taskIdentifier ?? taskIdentifier,
      error: createErrorTaskError(execution.error)
    };
  }
}
__name(handleTaskRunExecutionResult, "handleTaskRunExecutionResult");
function registerTaskLifecycleHooks(taskId, params) {
  if (params.init) {
    lifecycleHooks.registerTaskInitHook(taskId, {
      fn: params.init
    });
  }
  if (params.onStart) {
    lifecycleHooks.registerTaskStartHook(taskId, {
      fn: params.onStart
    });
  }
  if (params.onStartAttempt) {
    lifecycleHooks.registerTaskStartAttemptHook(taskId, {
      fn: params.onStartAttempt
    });
  }
  if (params.onFailure) {
    lifecycleHooks.registerTaskFailureHook(taskId, {
      fn: params.onFailure
    });
  }
  if (params.onSuccess) {
    lifecycleHooks.registerTaskSuccessHook(taskId, {
      fn: params.onSuccess
    });
  }
  if (params.onComplete) {
    lifecycleHooks.registerTaskCompleteHook(taskId, {
      fn: params.onComplete
    });
  }
  if (params.onWait) {
    lifecycleHooks.registerTaskWaitHook(taskId, {
      fn: params.onWait
    });
  }
  if (params.onResume) {
    lifecycleHooks.registerTaskResumeHook(taskId, {
      fn: params.onResume
    });
  }
  if (params.catchError) {
    lifecycleHooks.registerTaskCatchErrorHook(taskId, {
      fn: params.catchError
    });
  }
  if (params.handleError) {
    lifecycleHooks.registerTaskCatchErrorHook(taskId, {
      fn: params.handleError
    });
  }
  if (params.middleware) {
    lifecycleHooks.registerTaskMiddlewareHook(taskId, {
      fn: params.middleware
    });
  }
  if (params.cleanup) {
    lifecycleHooks.registerTaskCleanupHook(taskId, {
      fn: params.cleanup
    });
  }
  if (params.onCancel) {
    lifecycleHooks.registerTaskCancelHook(taskId, {
      fn: params.onCancel
    });
  }
}
__name(registerTaskLifecycleHooks, "registerTaskLifecycleHooks");

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tasks.js
var task = createTask;

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/index.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/cache.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/retry.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/wait.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/batch.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/waitUntil.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/usage.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/idempotencyKeys.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/tags.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/metadata.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/streams.js
init_esm();
init_esm2();
var DEFAULT_STREAM_KEY = "default";
function pipe(keyOrValue, valueOrOptions, options) {
  let key;
  let value;
  let opts;
  if (typeof keyOrValue === "string") {
    key = keyOrValue;
    value = valueOrOptions;
    opts = options;
  } else {
    key = DEFAULT_STREAM_KEY;
    value = keyOrValue;
    opts = valueOrOptions;
  }
  return pipeInternal(key, value, opts, "streams.pipe()");
}
__name(pipe, "pipe");
function pipeInternal(key, value, opts, spanName) {
  const runId = getRunIdForOptions(opts);
  if (!runId) {
    throw new Error("Could not determine the target run ID for the realtime stream. Please specify a target run ID using the `target` option or use this function from inside a task.");
  }
  const span = tracer.startSpan(spanName, {
    attributes: {
      key,
      runId,
      [SemanticInternalAttributes.ENTITY_TYPE]: "realtime-stream",
      [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${key}`,
      [SemanticInternalAttributes.STYLE_ICON]: "streams",
      ...accessoryAttributes({
        items: [
          {
            text: key,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
  const requestOptions = mergeRequestOptions({}, opts?.requestOptions);
  try {
    const instance = realtimeStreams.pipe(key, value, {
      signal: opts?.signal,
      target: runId,
      requestOptions
    });
    instance.wait().finally(() => {
      span.end();
    });
    return {
      stream: instance.stream,
      waitUntilComplete: /* @__PURE__ */ __name(() => instance.wait(), "waitUntilComplete")
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      span.end();
      throw error;
    }
    if (error instanceof Error || typeof error === "string") {
      span.recordException(error);
    } else {
      span.recordException(String(error));
    }
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw error;
  }
}
__name(pipeInternal, "pipeInternal");
async function read(runId, keyOrOptions, options) {
  let key;
  let opts;
  if (typeof keyOrOptions === "string") {
    key = keyOrOptions;
    opts = options;
  } else {
    key = DEFAULT_STREAM_KEY;
    opts = keyOrOptions;
  }
  return readStreamImpl(runId, key, opts);
}
__name(read, "read");
async function readStreamImpl(runId, key, options) {
  const apiClient = apiClientManager.clientOrThrow();
  const span = tracer.startSpan("streams.read()", {
    attributes: {
      key,
      runId,
      [SemanticInternalAttributes.ENTITY_TYPE]: "realtime-stream",
      [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${key}`,
      [SemanticInternalAttributes.ENTITY_METADATA]: JSON.stringify({
        startIndex: options?.startIndex
      }),
      [SemanticInternalAttributes.STYLE_ICON]: "streams",
      ...accessoryAttributes({
        items: [
          {
            text: key,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
  return await apiClient.fetchStream(runId, key, {
    signal: options?.signal,
    timeoutInSeconds: options?.timeoutInSeconds ?? 60,
    lastEventId: options?.startIndex ? (options.startIndex - 1).toString() : void 0,
    onComplete: /* @__PURE__ */ __name(() => {
      span.end();
    }, "onComplete"),
    onError: /* @__PURE__ */ __name((error) => {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
    }, "onError")
  });
}
__name(readStreamImpl, "readStreamImpl");
function append(keyOrValue, valueOrOptions, options) {
  if (typeof keyOrValue === "string" && typeof valueOrOptions === "string") {
    return appendInternal(keyOrValue, valueOrOptions, options);
  }
  if (typeof keyOrValue === "string") {
    if (isAppendStreamOptions(valueOrOptions)) {
      return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, valueOrOptions);
    } else {
      if (!valueOrOptions) {
        return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, options);
      }
      return appendInternal(keyOrValue, valueOrOptions, options);
    }
  } else {
    if (isAppendStreamOptions(valueOrOptions)) {
      return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, valueOrOptions);
    } else {
      return appendInternal(DEFAULT_STREAM_KEY, keyOrValue, options);
    }
  }
}
__name(append, "append");
async function appendInternal(key, part, options) {
  const runId = getRunIdForOptions(options);
  if (!runId) {
    throw new Error("Could not determine the target run ID for the realtime stream. Please specify a target run ID using the `target` option or use this function from inside a task.");
  }
  const span = tracer.startSpan("streams.append()", {
    attributes: {
      key,
      runId,
      [SemanticInternalAttributes.ENTITY_TYPE]: "realtime-stream",
      [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${key}`,
      [SemanticInternalAttributes.STYLE_ICON]: "streams",
      ...accessoryAttributes({
        items: [
          {
            text: key,
            variant: "normal"
          }
        ],
        style: "codepath"
      })
    }
  });
  try {
    await realtimeStreams.append(key, part, options);
    span.end();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      span.end();
      throw error;
    }
    if (error instanceof Error || typeof error === "string") {
      span.recordException(error);
    } else {
      span.recordException(String(error));
    }
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw error;
  }
}
__name(appendInternal, "appendInternal");
function isAppendStreamOptions(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val) && ("target" in val && typeof val.target === "string" || "requestOptions" in val && typeof val.requestOptions === "object");
}
__name(isAppendStreamOptions, "isAppendStreamOptions");
function writer(keyOrOptions, valueOrOptions) {
  if (typeof keyOrOptions === "string") {
    return writerInternal(keyOrOptions, valueOrOptions);
  }
  return writerInternal(DEFAULT_STREAM_KEY, keyOrOptions);
}
__name(writer, "writer");
function writerInternal(key, options) {
  let controller;
  const ongoingStreamPromises = [];
  const stream2 = new ReadableStream({
    start(controllerArg) {
      controller = controllerArg;
    }
  });
  function safeEnqueue(data) {
    try {
      controller.enqueue(data);
    } catch (error) {
    }
  }
  __name(safeEnqueue, "safeEnqueue");
  try {
    const result = options.execute({
      write(part) {
        safeEnqueue(part);
      },
      merge(streamArg) {
        ongoingStreamPromises.push((async () => {
          const reader = streamArg.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            safeEnqueue(value);
          }
        })().catch((error) => {
          console.error(error);
        }));
      }
    });
    if (result) {
      ongoingStreamPromises.push(result.catch((error) => {
        console.error(error);
      }));
    }
  } catch (error) {
    console.error(error);
  }
  const waitForStreams = new Promise((resolve, reject) => {
    (async () => {
      while (ongoingStreamPromises.length > 0) {
        await ongoingStreamPromises.shift();
      }
      resolve();
    })().catch(reject);
  });
  waitForStreams.finally(() => {
    try {
      controller.close();
    } catch (error) {
    }
  });
  return pipeInternal(key, stream2, options, "streams.writer()");
}
__name(writerInternal, "writerInternal");
function define(opts) {
  return {
    id: opts.id,
    pipe(value, options) {
      return pipe(opts.id, value, options);
    },
    read(runId, options) {
      return read(runId, opts.id, options);
    },
    append(value, options) {
      return append(opts.id, value, options);
    },
    writer(options) {
      return writer(opts.id, options);
    }
  };
}
__name(define, "define");
function input(opts) {
  return {
    id: opts.id,
    on(handler) {
      return inputStreams.on(opts.id, handler);
    },
    once(options) {
      const ctx = taskContext.ctx;
      const runId = ctx?.run.id;
      const innerPromise = inputStreams.once(opts.id, options);
      return new InputStreamOncePromise((resolve, reject) => {
        tracer.startActiveSpan(`inputStream.once()`, async () => {
          const result = await innerPromise;
          resolve(result);
        }, {
          attributes: {
            [SemanticInternalAttributes.STYLE_ICON]: "streams",
            [SemanticInternalAttributes.ENTITY_TYPE]: "input-stream",
            ...runId ? { [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${opts.id}` } : {},
            streamId: opts.id,
            ...accessoryAttributes({
              items: [{ text: opts.id, variant: "normal" }],
              style: "codepath"
            })
          }
        }).catch(reject);
      });
    },
    peek() {
      return inputStreams.peek(opts.id);
    },
    wait(options) {
      return new ManualWaitpointPromise(async (resolve, reject) => {
        try {
          const ctx = taskContext.ctx;
          if (!ctx) {
            throw new Error("inputStream.wait() can only be used from inside a task.run()");
          }
          const apiClient = apiClientManager.clientOrThrow();
          const result = await tracer.startActiveSpan(`inputStream.wait()`, async (span) => {
            const response = await apiClient.createInputStreamWaitpoint(ctx.run.id, {
              streamId: opts.id,
              timeout: options?.timeout,
              idempotencyKey: options?.idempotencyKey,
              idempotencyKeyTTL: options?.idempotencyKeyTTL,
              tags: options?.tags,
              lastSeqNum: inputStreams.lastSeqNum(opts.id)
            });
            span.setAttribute(SemanticInternalAttributes.ENTITY_ID, response.waitpointId);
            const waitResponse = await apiClient.waitForWaitpointToken({
              runFriendlyId: ctx.run.id,
              waitpointFriendlyId: response.waitpointId
            });
            if (!waitResponse.success) {
              throw new Error("Failed to block on input stream waitpoint");
            }
            const waitResult = await runtime.waitUntil(response.waitpointId);
            const data = waitResult.output !== void 0 ? await conditionallyImportAndParsePacket({
              data: waitResult.output,
              dataType: waitResult.outputType ?? "application/json"
            }, apiClient) : void 0;
            if (waitResult.ok) {
              return { ok: true, output: data };
            } else {
              const error = new WaitpointTimeoutError(data?.message ?? "Timed out");
              span.recordException(error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              return { ok: false, error };
            }
          }, {
            attributes: {
              [SemanticInternalAttributes.STYLE_ICON]: "wait",
              [SemanticInternalAttributes.ENTITY_TYPE]: "waitpoint",
              streamId: opts.id,
              ...accessoryAttributes({
                items: [
                  {
                    text: opts.id,
                    variant: "normal"
                  }
                ],
                style: "codepath"
              })
            }
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    },
    async send(runId, data, options) {
      return tracer.startActiveSpan(`inputStream.send()`, async () => {
        const apiClient = apiClientManager.clientOrThrow();
        await apiClient.sendInputStream(runId, opts.id, data, options?.requestOptions);
      }, {
        attributes: {
          [SemanticInternalAttributes.STYLE_ICON]: "streams",
          [SemanticInternalAttributes.ENTITY_TYPE]: "input-stream",
          [SemanticInternalAttributes.ENTITY_ID]: `${runId}:${opts.id}`,
          streamId: opts.id,
          runId,
          ...accessoryAttributes({
            items: [{ text: opts.id, variant: "normal" }],
            style: "codepath"
          })
        }
      });
    }
  };
}
__name(input, "input");
var streams = {
  pipe,
  read,
  append,
  writer,
  define,
  input
};
function getRunIdForOptions(options) {
  if (options?.target) {
    if (options.target === "parent") {
      return taskContext.ctx?.run?.parentTaskRunId ?? taskContext.ctx?.run?.id;
    }
    if (options.target === "root") {
      return taskContext.ctx?.run?.rootTaskRunId ?? taskContext.ctx?.run?.id;
    }
    if (options.target === "self") {
      return taskContext.ctx?.run?.id;
    }
    return options.target;
  }
  return taskContext.ctx?.run?.id;
}
__name(getRunIdForOptions, "getRunIdForOptions");

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/metadata.js
var parentMetadataUpdater = runMetadata.parent;
var rootMetadataUpdater = runMetadata.root;
var metadataUpdater = {
  set: setMetadataKey,
  del: deleteMetadataKey,
  append: appendMetadataKey,
  remove: removeMetadataKey,
  increment: incrementMetadataKey,
  decrement: decrementMetadataKey,
  flush: flushMetadata
};
var metadata = {
  current: currentMetadata,
  get: getMetadataKey,
  save: saveMetadata,
  replace: replaceMetadata,
  stream,
  fetchStream,
  parent: parentMetadataUpdater,
  root: rootMetadataUpdater,
  refresh: refreshMetadata,
  ...metadataUpdater
};
function currentMetadata() {
  return runMetadata.current();
}
__name(currentMetadata, "currentMetadata");
function getMetadataKey(key) {
  return runMetadata.getKey(key);
}
__name(getMetadataKey, "getMetadataKey");
function setMetadataKey(key, value) {
  runMetadata.set(key, value);
  return metadataUpdater;
}
__name(setMetadataKey, "setMetadataKey");
function deleteMetadataKey(key) {
  runMetadata.del(key);
  return metadataUpdater;
}
__name(deleteMetadataKey, "deleteMetadataKey");
function replaceMetadata(metadata2) {
  runMetadata.update(metadata2);
}
__name(replaceMetadata, "replaceMetadata");
function saveMetadata(metadata2) {
  runMetadata.update(metadata2);
}
__name(saveMetadata, "saveMetadata");
function incrementMetadataKey(key, value = 1) {
  runMetadata.increment(key, value);
  return metadataUpdater;
}
__name(incrementMetadataKey, "incrementMetadataKey");
function decrementMetadataKey(key, value = 1) {
  runMetadata.decrement(key, value);
  return metadataUpdater;
}
__name(decrementMetadataKey, "decrementMetadataKey");
function appendMetadataKey(key, value) {
  runMetadata.append(key, value);
  return metadataUpdater;
}
__name(appendMetadataKey, "appendMetadataKey");
function removeMetadataKey(key, value) {
  runMetadata.remove(key, value);
  return metadataUpdater;
}
__name(removeMetadataKey, "removeMetadataKey");
async function flushMetadata(requestOptions) {
  const $requestOptions = mergeRequestOptions({
    tracer,
    name: "metadata.flush()",
    icon: "code-plus"
  }, requestOptions);
  await runMetadata.flush($requestOptions);
}
__name(flushMetadata, "flushMetadata");
async function refreshMetadata(requestOptions) {
  const $requestOptions = mergeRequestOptions({
    tracer,
    name: "metadata.refresh()",
    icon: "code-plus"
  }, requestOptions);
  await runMetadata.refresh($requestOptions);
}
__name(refreshMetadata, "refreshMetadata");
async function stream(key, value, signal) {
  const streamInstance = await streams.pipe(key, value, {
    signal
  });
  return streamInstance.stream;
}
__name(stream, "stream");
async function fetchStream(key, signal) {
  return runMetadata.fetchStream(key, signal);
}
__name(fetchStream, "fetchStream");

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/timeout.js
init_esm();
var MAXIMUM_MAX_DURATION = 2147483647;
var timeout2 = {
  None: MAXIMUM_MAX_DURATION,
  signal: timeout.signal
};

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/webhooks.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/imports/uncrypto.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/locals.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/otel.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/schemas.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/heartbeats.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/query.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/runs.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/schedules/index.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/envvars.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/queues.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/auth.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/prompts.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/prompt.js
init_esm();

// ../../node_modules/.pnpm/@trigger.dev+sdk@4.4.6_zod@3.25.76/node_modules/@trigger.dev/sdk/dist/esm/v3/promptManagement.js
init_esm();

export {
  defineConfig,
  task
};
//# sourceMappingURL=chunk-5XX2QOVU.mjs.map
