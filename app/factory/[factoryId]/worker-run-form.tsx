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
import { WorkerRunOptions } from "@/components/factory/WorkerRunOptions";
import Button from "@/components/public/Button";
import {
  defaultWorkerModel,
  defaultWorkerReasoningLevel,
  defaultWorkerSpeed,
  normalizeWorkerModel,
  normalizeWorkerReasoningLevel,
  normalizeWorkerSpeed,
  type WorkerModel,
  type WorkerReasoningLevel,
  type WorkerSpeed,
} from "@/lib/codex/worker-options";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";
import { queueWorkerMessage, triggerWorkerRun } from "./worker-message-client";

export type WorkerRecord = {
  activePid?: number;
  codexSessionId?: string;
  codexModel?: string;
  codexReasoningLevel?: string;
  codexSpeed?: string;
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
  const [workerModel, setWorkerModel] =
    useState<WorkerModel>(defaultWorkerModel);
  const [workerReasoningLevel, setWorkerReasoningLevel] =
    useState<WorkerReasoningLevel>(defaultWorkerReasoningLevel);
  const [workerSpeed, setWorkerSpeed] =
    useState<WorkerSpeed>(defaultWorkerSpeed);
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
      workerModel,
      workerReasoningLevel,
      workerSpeed,
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
      startActions={
        <WorkerRunOptions
          disabled={isSending}
          model={workerModel}
          setModel={setWorkerModel}
          reasoningLevel={workerReasoningLevel}
          setReasoningLevel={setWorkerReasoningLevel}
          setSpeed={setWorkerSpeed}
          speed={workerSpeed}
        />
      }
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
  const [workerModel, setWorkerModel] = useState<WorkerModel>(
    normalizeWorkerModel(worker.codexModel),
  );
  const [workerReasoningLevel, setWorkerReasoningLevel] =
    useState<WorkerReasoningLevel>(
      normalizeWorkerReasoningLevel(worker.codexReasoningLevel),
    );
  const [workerSpeed, setWorkerSpeed] = useState<WorkerSpeed>(
    normalizeWorkerSpeed({
      model: worker.codexModel,
      speed: worker.codexSpeed,
    }),
  );
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
      workerModel,
      workerReasoningLevel,
      workerSpeed,
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
      workerModel,
      workerReasoningLevel,
      workerSpeed,
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
      startActions={
        <WorkerRunOptions
          disabled={isInputDisabled}
          model={workerModel}
          setModel={setWorkerModel}
          reasoningLevel={workerReasoningLevel}
          setReasoningLevel={setWorkerReasoningLevel}
          setSpeed={setWorkerSpeed}
          speed={workerSpeed}
        />
      }
      submitLabel={isSending ? "Sending..." : isRunning ? "Send now" : "Send"}
      topSection={topSection}
      uploadingLabel="Uploading..."
    />
  );
}
