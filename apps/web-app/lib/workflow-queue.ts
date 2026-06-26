import { type ConnectionOptions, type JobsOptions, Queue } from "bullmq";

export const PROCESS_EVENT_QUEUE_NAME = "chaterface:process-event";
export const START_CODEX_DEVICE_AUTH_QUEUE_NAME =
	"chaterface:start-codex-device-auth";

export type ProcessEventJobData = {
	eventId: string;
};
export type ProcessEventJobName = "process-event";

export type StartCodexDeviceAuthJobData = {
	agentId: string;
};
export type StartCodexDeviceAuthJobName = "start-codex-device-auth";

export type WorkflowQueueRun = {
	runId: string;
};

const DEFAULT_REMOVE_ON_COMPLETE = 1000;
const DEFAULT_REMOVE_ON_FAIL = 5000;

let processEventQueue:
	| Queue<ProcessEventJobData, void, ProcessEventJobName>
	| undefined;
let startCodexDeviceAuthQueue:
	| Queue<StartCodexDeviceAuthJobData, unknown, StartCodexDeviceAuthJobName>
	| undefined;

export const enqueueProcessEventWorkflow = async (
	payload: ProcessEventJobData,
): Promise<WorkflowQueueRun> => {
	const queue = createProcessEventQueue();
	const job = await queue.add("process-event", payload, {
		...getDefaultJobOptions(),
		jobId: `process-event:${payload.eventId}`,
	});

	return { runId: job.id ?? job.name };
};

export const enqueueStartCodexDeviceAuthWorkflow = async (
	payload: StartCodexDeviceAuthJobData,
): Promise<WorkflowQueueRun> => {
	const queue = createStartCodexDeviceAuthQueue();
	const job = await queue.add("start-codex-device-auth", payload, {
		...getDefaultJobOptions(),
		jobId: `start-codex-device-auth:${payload.agentId}`,
	});

	return { runId: job.id ?? job.name };
};

export const createProcessEventQueue = () =>
	(processEventQueue ??= new Queue<
		ProcessEventJobData,
		void,
		ProcessEventJobName
	>(PROCESS_EVENT_QUEUE_NAME, {
		connection: getWorkflowQueueRedisConnection(),
	}));

export const createStartCodexDeviceAuthQueue = () =>
	(startCodexDeviceAuthQueue ??= new Queue<
		StartCodexDeviceAuthJobData,
		unknown,
		StartCodexDeviceAuthJobName
	>(START_CODEX_DEVICE_AUTH_QUEUE_NAME, {
		connection: getWorkflowQueueRedisConnection(),
	}));

export const getWorkflowQueueRedisConnection = (): ConnectionOptions => {
	const url = getWorkflowQueueRedisUrl();

	return {
		url,
	};
};

export const getWorkflowWorkerRedisConnection = (): ConnectionOptions => {
	const url = getWorkflowQueueRedisUrl();

	return {
		url,
		maxRetriesPerRequest: null,
	};
};

const getWorkflowQueueRedisUrl = () => {
	const url =
		process.env.WORKER_REDIS_URL?.trim() ||
		process.env.BULLMQ_REDIS_URL?.trim() ||
		process.env.REDIS_URL?.trim();

	if (!url) {
		throw new Error(
			"WORKER_REDIS_URL, BULLMQ_REDIS_URL, or REDIS_URL is required to enqueue workflow jobs.",
		);
	}

	return url;
};

const getDefaultJobOptions = (): JobsOptions => ({
	attempts: getPositiveIntegerEnv("WORKER_JOB_ATTEMPTS") ?? 1,
	backoff: {
		type: "exponential",
		delay: getPositiveIntegerEnv("WORKER_JOB_BACKOFF_MS") ?? 5000,
	},
	removeOnComplete: getPositiveIntegerEnv("WORKER_REMOVE_ON_COMPLETE") ?? {
		count: DEFAULT_REMOVE_ON_COMPLETE,
	},
	removeOnFail: getPositiveIntegerEnv("WORKER_REMOVE_ON_FAIL") ?? {
		count: DEFAULT_REMOVE_ON_FAIL,
	},
});

const getPositiveIntegerEnv = (key: string) => {
	const value = process.env[key]?.trim();

	if (!value) {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
