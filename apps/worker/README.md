# Chaterface Worker

Persistent Node worker for long-running agent jobs.

The web app enqueues BullMQ jobs into Redis. This service consumes those queues
and runs the existing workflow worker implementations from `apps/web-app`.

## Environment

Use the same server-side environment as `apps/web-app/.env.local`, plus one of:

```sh
WORKER_REDIS_URL=redis://localhost:6379
# or BULLMQ_REDIS_URL / REDIS_URL
```

Optional tuning:

```sh
PROCESS_EVENT_WORKER_CONCURRENCY=2
CODEX_DEVICE_AUTH_WORKER_CONCURRENCY=1
WORKER_JOB_ATTEMPTS=1
WORKER_JOB_BACKOFF_MS=5000
```

## Run

```sh
pnpm --filter worker dev
```
