"use client";

import { faker } from "@faker-js/faker";
import { id } from "@instantdb/react";
import { ImageSquare, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from "react";
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
  retiredAt?: string;
  status: string;
  updatedAt?: string;
};

type ImageAttachment = {
  file: File;
  id: string;
  previewUrl: string;
};

const maxImageAttachments = 5;
const maxImageAttachmentBytes = 20 * 1024 * 1024;
const supportedImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
      onAddAttachment={(event) =>
        addImageAttachments({
          currentAttachments: attachments,
          event,
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
  worker,
}: {
  factoryId?: string;
  worker: WorkerRecord;
}) {
  return (
    <WorkerPromptFormContent
      factoryId={factoryId}
      instantDb={db}
      worker={worker}
    />
  );
}

function WorkerPromptFormContent({
  factoryId,
  instantDb,
  worker,
}: {
  factoryId?: string;
  instantDb: AppDb;
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
      userId: user?.id,
      userRefreshToken: user?.refresh_token,
      worker,
      onError: setError,
    });

    setIsSending(false);

    if (workerId) {
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
      userId: user?.id,
      userRefreshToken: user?.refresh_token,
      worker,
      onError: setError,
    });

    setIsSending(false);

    if (queued) {
      cleanupAttachments(attachments);
      setAttachments([]);
      setPrompt("");
    }
  }

  const isRetired = worker.status === "retired";
  const isRunning = worker.status === "running";
  const isInputDisabled = isRetired || isSending;

  return (
    <WorkerComposer
      attachments={attachments}
      disabled={isRetired}
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
      onAddAttachment={(event) =>
        addImageAttachments({
          currentAttachments: attachments,
          event,
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
          ? "This worker has been retired."
          : "Send a message to the worker..."
      }
      prompt={prompt}
      setPrompt={setPrompt}
      submitLabel={isSending ? "Sending..." : isRunning ? "Send now" : "Send"}
      uploadingLabel="Uploading..."
    />
  );
}

function WorkerComposer({
  attachments,
  disabled = false,
  endActions,
  error,
  fileInputRef,
  isSending,
  onAddAttachment,
  onRemoveAttachment,
  onSubmit,
  placeholder = "Send a message to the worker...",
  prompt,
  setPrompt,
  submitLabel,
  uploadingLabel,
}: {
  attachments: ImageAttachment[];
  disabled?: boolean;
  endActions?: ReactNode;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  onAddAttachment: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  submitLabel: string;
  uploadingLabel: string;
}) {
  const isSubmitDisabled = disabled || isSending;
  const attachmentDisabled = disabled || isSending;
  const displayedSubmitLabel =
    isSending && attachments.length > 0 ? uploadingLabel : submitLabel;

  return (
    <Card
      layer={0}
      className="mx-auto w-full max-w-2xl bg-white dark:bg-grayscale-2 p-0"
    >
      <form onSubmit={onSubmit} className="flex flex-col">
        <textarea
          id="worker-task"
          value={prompt}
          className="resize-none p-3 text-grayscale-12 text-sm outline-none focus:border-accent-9 disabled:cursor-not-allowed disabled:text-grayscale-10"
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={submitTextareaOnEnter}
          rows={4}
        />
        <ImageAttachmentPreviews
          attachments={attachments}
          disabled={attachmentDisabled}
          onRemove={onRemoveAttachment}
        />
        {error ? (
          <p className="border-grayscale-3 border-t px-3 py-2 text-red-11 text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex flex-row items-center justify-between gap-2 border-grayscale-3 border-t p-2">
          <div className="flex flex-row items-center gap-2">
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={attachmentDisabled}
              multiple
              onChange={onAddAttachment}
              ref={fileInputRef}
              type="file"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={
                attachmentDisabled || attachments.length >= maxImageAttachments
              }
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageSquare size={16} weight="bold" aria-hidden="true" />
              {attachments.length > 0 ? "Add image" : "Attach image"}
            </Button>
          </div>
          <div className="ml-auto flex flex-row items-center gap-2">
            {endActions}
            <Button type="submit" disabled={isSubmitDisabled}>
              {displayedSubmitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function submitTextareaOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (
    event.key !== "Enter" ||
    event.shiftKey ||
    event.nativeEvent.isComposing
  ) {
    return;
  }

  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

async function triggerWorkerRun({
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

  if (worker?.status === "retired") {
    onError("This worker has been retired.");
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

async function queueWorkerMessage({
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

  if (worker.status === "retired") {
    onError("This worker has been retired.");
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

function ImageAttachmentPreviews({
  attachments,
  disabled,
  onRemove,
}: {
  attachments: ImageAttachment[];
  disabled?: boolean;
  onRemove: (attachmentId: string) => void;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2 border-grayscale-3 border-t px-3 py-2">
      {attachments.map((attachment) => (
        <li
          className="group relative size-16 overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-2"
          key={attachment.id}
        >
          <div
            aria-hidden="true"
            className="size-full bg-cover bg-center"
            style={{ backgroundImage: `url(${attachment.previewUrl})` }}
          />
          <button
            aria-label={`Remove ${attachment.file.name}`}
            className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full border border-grayscale-5 bg-white/90 text-grayscale-11 shadow-sm transition hover:bg-grayscale-1 hover:text-grayscale-12"
            disabled={disabled}
            onClick={() => onRemove(attachment.id)}
            type="button"
          >
            <X size={12} weight="bold" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function addImageAttachments({
  currentAttachments,
  event,
  onError,
  setAttachments,
}: {
  currentAttachments: ImageAttachment[];
  event: ChangeEvent<HTMLInputElement>;
  onError: (error: string | null) => void;
  setAttachments: Dispatch<SetStateAction<ImageAttachment[]>>;
}) {
  const selectedFiles = Array.from(event.target.files ?? []);
  event.target.value = "";

  if (selectedFiles.length === 0) {
    return;
  }

  const remainingSlots = maxImageAttachments - currentAttachments.length;
  const validAttachments: ImageAttachment[] = [];

  for (const file of selectedFiles.slice(0, remainingSlots)) {
    if (!supportedImageTypes.has(file.type)) {
      onError("Attach PNG, JPEG, WebP, or GIF images.");
      continue;
    }

    if (file.size > maxImageAttachmentBytes) {
      onError("Images must be 20 MB or smaller.");
      continue;
    }

    validAttachments.push({
      file,
      id: id(),
      previewUrl: URL.createObjectURL(file),
    });
  }

  if (selectedFiles.length > remainingSlots) {
    onError(`Attach up to ${maxImageAttachments} images.`);
  } else if (validAttachments.length > 0) {
    onError(null);
  }

  if (validAttachments.length > 0) {
    setAttachments((current) => [...current, ...validAttachments]);
  }
}

function removeImageAttachment(
  attachments: ImageAttachment[],
  attachmentId: string,
) {
  const attachment = attachments.find((item) => item.id === attachmentId);

  if (attachment) {
    URL.revokeObjectURL(attachment.previewUrl);
  }

  return attachments.filter((item) => item.id !== attachmentId);
}

function cleanupAttachments(attachments: ImageAttachment[]) {
  for (const attachment of attachments) {
    URL.revokeObjectURL(attachment.previewUrl);
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
