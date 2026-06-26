import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type Job, Worker } from "bullmq";
import { config } from "dotenv";
import type {
	ProcessEventJobData,
	StartCodexDeviceAuthJobData,
} from "@/lib/workflow-queue";

loadEnvFiles();

const [
	{
		getWorkflowWorkerRedisConnection,
		PROCESS_EVENT_QUEUE_NAME,
		START_CODEX_DEVICE_AUTH_QUEUE_NAME,
	},
	{ runProcessEventWorkflow },
	{ runStartCodexDeviceAuthWorkflow },
] = await Promise.all([
	import("@/lib/workflow-queue"),
	import("@/workflow-workers/process-event"),
	import("@/workflow-workers/start-codex-device-auth"),
]);

const processEventConcurrency =
	getPositiveIntegerEnv("PROCESS_EVENT_WORKER_CONCURRENCY") ?? 2;
const deviceAuthConcurrency =
	getPositiveIntegerEnv("CODEX_DEVICE_AUTH_WORKER_CONCURRENCY") ?? 1;

const connection = getWorkflowWorkerRedisConnection();

const workers = [
	new Worker<ProcessEventJobData>(
		PROCESS_EVENT_QUEUE_NAME,
		async (job) => {
			logJobStarted(job);
			await runProcessEventWorkflow(job.data);
			logJobCompleted(job);
		},
		{
			connection,
			concurrency: processEventConcurrency,
		},
	),
	new Worker<StartCodexDeviceAuthJobData>(
		START_CODEX_DEVICE_AUTH_QUEUE_NAME,
		async (job) => {
			logJobStarted(job);
			return runStartCodexDeviceAuthWorkflow(job.data);
		},
		{
			connection,
			concurrency: deviceAuthConcurrency,
		},
	),
];

for (const worker of workers) {
	worker.on("completed", (job) => {
		console.log("Worker job completed", {
			queue: worker.name,
			jobId: job.id,
			name: job.name,
		});
	});

	worker.on("failed", (job, error) => {
		console.error("Worker job failed", {
			queue: worker.name,
			jobId: job?.id,
			name: job?.name,
			error: getErrorMessage(error),
		});
	});

	worker.on("error", (error) => {
		console.error("Worker error", {
			queue: worker.name,
			error: getErrorMessage(error),
		});
	});
}

await Promise.all(workers.map((worker) => worker.waitUntilReady()));

console.log("Chaterface worker started", {
	queues: workers.map((worker) => worker.name),
	processEventConcurrency,
	deviceAuthConcurrency,
});

const shutdown = async (signal: NodeJS.Signals) => {
	console.log("Shutting down worker", { signal });

	await Promise.all(workers.map((worker) => worker.close()));

	process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

function logJobStarted(job: Job) {
	console.log("Worker job started", {
		queue: job.queueName,
		jobId: job.id,
		name: job.name,
		attempt: job.attemptsMade + 1,
	});
}

function logJobCompleted(job: Job) {
	console.log("Worker job handler completed", {
		queue: job.queueName,
		jobId: job.id,
		name: job.name,
	});
}

function getPositiveIntegerEnv(key: string) {
	const value = process.env[key]?.trim();

	if (!value) {
		return undefined;
	}

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function loadEnvFiles() {
	loadEnvFile(resolve(process.cwd(), "../web-app/.env.local"));
	loadEnvFile(resolve(process.cwd(), ".env.local"), true);
}

function loadEnvFile(path: string, override = false) {
	if (!existsSync(path)) {
		return;
	}

	const result = config({ path, override, quiet: true });

	if (result.error) {
		throw result.error;
	}
}
