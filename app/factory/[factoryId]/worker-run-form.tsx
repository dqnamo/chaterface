"use client";

import { id } from "@instantdb/react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import {
  addImageAttachments,
  cleanupAttachments,
  type ImageAttachment,
  type QueuedComposerMessage,
  removeImageAttachment,
  WorkerComposer,
  type WorkerComposerPresenceControls,
} from "@/components/factory/WorkerComposer";
import Button from "@/components/public/Button";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { queueWorkerMessage, triggerWorkerRun } from "./worker-message-client";

export type WorkerRecord = {
  activePid?: number;
  codexSessionId?: string;
  createdAt?: string;
  id: string;
  name?: string;
  retiredAt?: string;
  status: string;
  updatedAt?: string;
};

export function NewWorkerForm({ factoryId }: { factoryId: string }) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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
    setIsSending(true);

    const startedWorkerId = await triggerWorkerRun({
      attachments,
      factoryId,
      instantDb,
      prompt: trimmedPrompt,
      userEmail: user.email,
      userId: user.id,
      userRefreshToken: user.refresh_token,
      workerId,
      onError: setError,
    });

    setIsSending(false);

    if (startedWorkerId) {
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
      router.push(`/factory/${factoryId}/workers/${workerId}`);
    }
  }

  return (
    <WorkerComposer
      attachments={attachments}
      error={error}
      fileInputRef={fileInputRef}
      isSending={isSending}
      onAddAttachment={(files) =>
        addImageAttachments({
          currentAttachments: attachments,
          files,
          onError: setError,
          setAttachments,
        })
      }
      onRemoveAttachment={(attachmentId) =>
        setAttachments((current) =>
          removeImageAttachment(current, attachmentId),
        )
      }
      onSubmit={onSubmit}
      prompt={prompt}
      setPrompt={setPrompt}
      submitLabel={isSending ? "Sending..." : "Send"}
      uploadingLabel="Uploading..."
    />
  );
}

export function WorkerPromptForm({
  factoryId,
  presence,
  queuedMessages,
  topSection,
  worker,
}: {
  factoryId?: string;
  presence?: WorkerComposerPresenceControls;
  queuedMessages?: QueuedComposerMessage[];
  topSection?: ReactNode;
  worker: WorkerRecord;
}) {
  return (
    <WorkerPromptFormContent
      factoryId={factoryId}
      instantDb={db}
      presence={presence}
      queuedMessages={queuedMessages}
      topSection={topSection}
      worker={worker}
    />
  );
}

function WorkerPromptFormContent({
  factoryId,
  instantDb,
  presence,
  queuedMessages,
  topSection,
  worker,
}: {
  factoryId?: string;
  instantDb: AppDb;
  presence?: WorkerComposerPresenceControls;
  queuedMessages?: QueuedComposerMessage[];
  topSection?: ReactNode;
  worker: WorkerRecord;
}) {
  const { user } = instantDb.useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);

    const workerId = await triggerWorkerRun({
      attachments,
      factoryId,
      instantDb,
      prompt,
      userEmail: user?.email,
      userId: user?.id,
      userRefreshToken: user?.refresh_token,
      worker,
      onError: setError,
    });

    setIsSending(false);

    if (workerId) {
      presence?.onAfterSend?.();
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
    }
  }

  async function onQueueMessage() {
    setIsSending(true);

    const queued = await queueWorkerMessage({
      attachments,
      factoryId,
      instantDb,
      prompt,
      userEmail: user?.email,
      userId: user?.id,
      userRefreshToken: user?.refresh_token,
      worker,
      onError: setError,
    });

    setIsSending(false);

    if (queued) {
      presence?.onAfterSend?.();
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
    }
  }

  const isRetired = worker.status === "retired";
  const isRunning = worker.status === "running";
  const isInputDisabled = isSending;

  return (
    <WorkerComposer
      attachments={attachments}
      disabled={isSending}
      endActions={
        isRunning ? (
          <Button
            type="button"
            variant="secondary"
            disabled={isInputDisabled}
            onClick={onQueueMessage}
          >
            Queue message
          </Button>
        ) : null
      }
      error={error}
      fileInputRef={fileInputRef}
      isSending={isSending}
      onAddAttachment={(files) =>
        addImageAttachments({
          currentAttachments: attachments,
          files,
          onError: setError,
          setAttachments,
        })
      }
      onRemoveAttachment={(attachmentId) =>
        setAttachments((current) =>
          removeImageAttachment(current, attachmentId),
        )
      }
      onSubmit={onSubmit}
      placeholder={
        isRetired
          ? "Send a message to unretire this worker..."
          : "Send a message to the worker..."
      }
      presence={presence}
      prompt={prompt}
      queuedMessages={queuedMessages}
      setPrompt={setPrompt}
      submitLabel={isSending ? "Sending..." : isRunning ? "Send now" : "Send"}
      topSection={topSection}
      uploadingLabel="Uploading..."
    />
  );
}
