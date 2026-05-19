"use client";

import { faker } from "@faker-js/faker";
import { id } from "@instantdb/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

export type WorkerRecord = {
  activePid?: number;
  codexSessionId?: string;
  createdAt?: string;
  id: string;
  name?: string;
  status: string;
  updatedAt?: string;
};

export function NewWorkerForm({ factoryId }: { factoryId: string }) {
  if (!db) {
    return <p>InstantDB is not configured.</p>;
  }

  return <NewWorkerFormContent factoryId={factoryId} instantDb={db} />;
}

function NewWorkerFormContent({
  factoryId,
  instantDb,
}: {
  factoryId: string;
  instantDb: AppDb;
}) {
  const router = useRouter();
  const { user } = instantDb.useAuth();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError("Enter a task before sending it to a worker.");
      return;
    }

    if (!user?.refresh_token) {
      setError("You must be signed in to run a worker.");
      return;
    }

    const workerId = id();

    setError(null);
    setPrompt("");
    router.push(`/factory/${factoryId}/workers/${workerId}`);

    triggerWorkerRun({
      factoryId,
      instantDb,
      prompt: trimmedPrompt,
      userRefreshToken: user.refresh_token,
      workerId,
      onError: setError,
    });
  }

  return (
    <Card layer={0} className="max-w-2xl mx-auto p-0 w-full">
      <form onSubmit={onSubmit} className="flex flex-col">
        <textarea
          id="worker-task"
          value={prompt}
          className="outline-none resize-none focus:border-accent-9 p-3 text-sm text-grayscale-12"
          placeholder="Send a message to the worker..."
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
        />
        {error ? <p>{error}</p> : null}
        <div className="flex flex-row items-center justify-between p-2">
          <div className="flex flex-row items-center gap-2">
            {/*<p className="text-sm text-grayscale-11">Create more</p>
            <Switch />*/}
          </div>
          <Button type="submit" className="ml-auto">
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function WorkerPromptForm({ worker }: { worker: WorkerRecord }) {
  if (!db) {
    return <p>InstantDB is not configured.</p>;
  }

  return <WorkerPromptFormContent instantDb={db} worker={worker} />;
}

function WorkerPromptFormContent({
  instantDb,
  worker,
}: {
  instantDb: AppDb;
  worker: WorkerRecord;
}) {
  const { user } = instantDb.useAuth();
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<
    "error" | "idle" | "saving" | "saved"
  >("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const workerId = await triggerWorkerRun({
      instantDb,
      prompt,
      userRefreshToken: user?.refresh_token,
      worker,
      onError: setError,
    });

    if (workerId) {
      setPrompt("");
    }
  }

  async function onMakeDefault() {
    if (!user?.refresh_token) {
      setError("You must be signed in.");
      return;
    }

    setSnapshotStatus("saving");
    setError(null);

    try {
      const response = await fetch(`/api/workers/${worker.id}/snapshot`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.refresh_token}`,
        },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(body?.error ?? "Could not save snapshot.");
      }

      setSnapshotStatus("saved");
    } catch (snapshotError) {
      console.error(snapshotError);
      setSnapshotStatus("error");
      setError(
        snapshotError instanceof Error
          ? snapshotError.message
          : "Could not save snapshot.",
      );
    }
  }

  const snapshotLabel =
    snapshotStatus === "saving"
      ? "Saving snapshot…"
      : snapshotStatus === "saved"
        ? "Snapshot saved"
        : "Make worker state default";

  return (
    <Card layer={0} className="max-w-2xl mx-auto p-0 ">
      <form onSubmit={onSubmit} className="flex flex-col">
        <textarea
          id="worker-task"
          value={prompt}
          className="outline-none resize-none focus:border-accent-9 p-3 text-sm text-grayscale-12"
          placeholder="Send a message to the worker..."
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
        />
        {error ? <p>{error}</p> : null}
        <div className="flex flex-row items-center justify-between p-2">
          <div className="flex flex-row items-center gap-2">
            <Button
              type="button"
              className="ml-auto"
              variant="secondary"
              disabled={snapshotStatus === "saving"}
              onClick={onMakeDefault}
            >
              {snapshotLabel}
            </Button>
          </div>
          <Button type="submit" className="ml-auto">
            {worker.status === "running" ? "Interrupt and send" : "Send"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

async function triggerWorkerRun({
  factoryId,
  instantDb,
  onError,
  prompt,
  userRefreshToken,
  worker,
  workerId: preGeneratedWorkerId,
}: {
  factoryId?: string;
  instantDb: AppDb;
  onError: (error: string | null) => void;
  prompt: string;
  userRefreshToken?: string;
  worker?: WorkerRecord;
  workerId?: string;
}) {
  if (!prompt.trim()) {
    onError("Enter a task before sending it to a worker.");
    return null;
  }

  if (!userRefreshToken) {
    onError("You must be signed in to run a worker.");
    return null;
  }

  const now = new Date().toISOString();
  const workerId = preGeneratedWorkerId ?? worker?.id ?? id();
  const eventId = id();
  const isNewWorker = !worker;
  const nextStatus = worker?.status === "running" ? "running" : "queued";

  onError(null);

  try {
    const transactions = [
      instantDb.tx.events[eventId].update({
        createdAt: now,
        data: {
          prompt,
        },
        source: "factory",
        type: "user_message",
      }),
      instantDb.tx.events[eventId].link({
        worker: workerId,
      }),
      instantDb.tx.workers[workerId].update({
        status: nextStatus,
        updatedAt: now,
        ...(isNewWorker
          ? {
              createdAt: now,
              name: faker.person.firstName(),
            }
          : {}),
      }),
    ];

    if (isNewWorker) {
      if (!factoryId) {
        throw new Error("Factory id is missing.");
      }

      transactions.push(
        instantDb.tx.workers[workerId].link({
          factory: factoryId,
        }),
      );
    }

    await instantDb.transact(transactions);

    const response = await fetch(`/api/workers/${workerId}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userRefreshToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessageEventId: eventId,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      throw new Error(body?.error ?? "Worker could not be started.");
    }

    return workerId;
  } catch (runError) {
    console.error(runError);
    onError(
      runError instanceof Error
        ? runError.message
        : "Worker could not be started.",
    );
    return null;
  }
}
