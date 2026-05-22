"use client";

import { faker } from "@faker-js/faker";
import { id } from "@instantdb/react";
import type { ImageAttachment } from "@/components/factory/WorkerComposer";
import type { AppDb } from "@/lib/db.client";
import type { WorkerRecord } from "./worker-run-form";

export async function triggerWorkerRun({
  attachments = [],
  factoryId,
  instantDb,
  onError,
  prompt,
  userId,
  userRefreshToken,
  worker,
  workerId: preGeneratedWorkerId,
}: {
  attachments?: ImageAttachment[];
  factoryId?: string;
  instantDb: AppDb;
  onError: (error: string | null) => void;
  prompt: string;
  userId?: string;
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

  if (!userId) {
    onError("You must be signed in to upload images.");
    return null;
  }

  const now = new Date().toISOString();
  const workerId = preGeneratedWorkerId ?? worker?.id ?? id();
  const eventId = id();
  const isNewWorker = !worker;
  const nextStatus = worker?.status === "running" ? "running" : "queued";

  onError(null);

  try {
    const attachmentFileIds = await uploadImageAttachments({
      attachments,
      eventId,
      factoryId,
      instantDb,
      userId,
      workerId,
    });
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
      ...attachmentFileIds.map((attachmentFileId) =>
        instantDb.tx.events[eventId].link({
          attachments: attachmentFileId,
        }),
      ),
      instantDb.tx.workers[workerId].update({
        retiredAt: null,
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

export async function queueWorkerMessage({
  attachments = [],
  factoryId,
  instantDb,
  onError,
  prompt,
  userId,
  userRefreshToken,
  worker,
}: {
  attachments?: ImageAttachment[];
  factoryId?: string;
  instantDb: AppDb;
  onError: (error: string | null) => void;
  prompt: string;
  userId?: string;
  userRefreshToken?: string;
  worker: WorkerRecord;
}) {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    onError("Enter a task before queueing it for this worker.");
    return false;
  }

  if (!userRefreshToken) {
    onError("You must be signed in to queue a message.");
    return false;
  }

  if (!userId) {
    onError("You must be signed in to upload images.");
    return false;
  }

  const now = new Date().toISOString();
  const eventId = id();

  onError(null);

  try {
    const attachmentFileIds = await uploadImageAttachments({
      attachments,
      eventId,
      factoryId,
      instantDb,
      userId,
      workerId: worker.id,
    });

    await instantDb.transact([
      instantDb.tx.events[eventId].update({
        createdAt: now,
        data: {
          prompt: trimmedPrompt,
          queuedAt: now,
        },
        source: "factory",
        type: "queued_user_message",
      }),
      instantDb.tx.events[eventId].link({
        worker: worker.id,
      }),
      ...attachmentFileIds.map((attachmentFileId) =>
        instantDb.tx.events[eventId].link({
          attachments: attachmentFileId,
        }),
      ),
      instantDb.tx.workers[worker.id].update({
        retiredAt: null,
        status: worker.status === "retired" ? "queued" : worker.status,
        updatedAt: now,
      }),
    ]);

    return true;
  } catch (queueError) {
    console.error(queueError);
    onError(
      queueError instanceof Error
        ? queueError.message
        : "Message could not be queued.",
    );
    return false;
  }
}

async function uploadImageAttachments({
  attachments,
  eventId,
  factoryId,
  instantDb,
  userId,
  workerId,
}: {
  attachments: ImageAttachment[];
  eventId: string;
  factoryId?: string;
  instantDb: AppDb;
  userId: string;
  workerId: string;
}) {
  return Promise.all(
    attachments.map(async (attachment) => {
      const extension = getImageExtension(attachment.file);
      const path = [
        userId,
        "factories",
        factoryId ?? "existing-worker",
        "workers",
        workerId,
        "events",
        eventId,
        `${attachment.id}.${extension}`,
      ].join("/");
      const response = await instantDb.storage.uploadFile(
        path,
        attachment.file,
        {
          contentDisposition: "inline",
          contentType: attachment.file.type || "application/octet-stream",
        },
      );

      return response.data.id;
    }),
  );
}

function getImageExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName;
  }

  return file.type.split("/")[1]?.replace(/\W/g, "") || "image";
}
