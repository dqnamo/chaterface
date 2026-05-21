"use client";

import { faker } from "@faker-js/faker";
import { id } from "@instantdb/react";
import { ImageSquare, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
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

  function onAddImageFiles(files: File[]) {
    addImageAttachmentFiles({
      currentAttachments: attachments,
      files,
      onError: setError,
      setAttachments,
    });
  }

  return (
    <Card layer={0} className="max-w-2xl bg-white mx-auto p-0 w-full">
      <form
        onDragOver={(event) => handleImageDragOver(event, isSending)}
        onDrop={(event) => handleImageDrop(event, isSending, onAddImageFiles)}
        onSubmit={onSubmit}
        className="flex flex-col"
      >
        <textarea
          id="worker-task"
          value={prompt}
          className="outline-none resize-none focus:border-accent-9 p-3 text-sm text-grayscale-12"
          placeholder="Send a message to the worker..."
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={submitTextareaOnEnter}
          onPaste={(event) =>
            handleImagePaste(event, isSending, onAddImageFiles)
          }
          rows={4}
        />
        <ImageAttachmentTray
          attachments={attachments}
          disabled={isSending}
          fileInputRef={fileInputRef}
          onAdd={(event) =>
            addImageAttachmentsFromInput(event, onAddImageFiles)
          }
          onRemove={(attachmentId) =>
            setAttachments((current) =>
              removeImageAttachment(current, attachmentId),
            )
          }
        />
        {error ? <p>{error}</p> : null}
        <div className="flex flex-row items-center justify-between p-2">
          <div className="flex flex-row items-center gap-2">
            {/*<p className="text-sm text-grayscale-11">Create more</p>
            <Switch />*/}
          </div>
          <Button type="submit" className="ml-auto" disabled={isSending}>
            {isSending
              ? attachments.length > 0
                ? "Uploading..."
                : "Sending..."
              : "Send"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function WorkerPromptForm({
  factoryId,
  worker,
}: {
  factoryId?: string;
  worker: WorkerRecord;
}) {
  if (!db) {
    return <p>InstantDB is not configured.</p>;
  }

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
  const [snapshotStatus, setSnapshotStatus] = useState<
    "error" | "idle" | "saving" | "saved"
  >("idle");

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
  const isRetired = worker.status === "retired";
  const isInputDisabled = isRetired || isSending;

  function onAddImageFiles(files: File[]) {
    addImageAttachmentFiles({
      currentAttachments: attachments,
      files,
      onError: setError,
      setAttachments,
    });
  }

  return (
    <Card layer={0} className="max-w-2xl mx-auto p-0 ">
      <form
        onDragOver={(event) => handleImageDragOver(event, isInputDisabled)}
        onDrop={(event) =>
          handleImageDrop(event, isInputDisabled, onAddImageFiles)
        }
        onSubmit={onSubmit}
        className="flex flex-col"
      >
        <textarea
          id="worker-task"
          value={prompt}
          className="outline-none resize-none focus:border-accent-9 p-3 text-sm text-grayscale-12"
          disabled={isRetired}
          placeholder={
            isRetired
              ? "This worker has been retired."
              : "Send a message to the worker..."
          }
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={submitTextareaOnEnter}
          onPaste={(event) =>
            handleImagePaste(event, isInputDisabled, onAddImageFiles)
          }
          rows={4}
        />
        <ImageAttachmentTray
          attachments={attachments}
          disabled={isInputDisabled}
          fileInputRef={fileInputRef}
          onAdd={(event) =>
            addImageAttachmentsFromInput(event, onAddImageFiles)
          }
          onRemove={(attachmentId) =>
            setAttachments((current) =>
              removeImageAttachment(current, attachmentId),
            )
          }
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
          <Button type="submit" className="ml-auto" disabled={isInputDisabled}>
            {isSending
              ? attachments.length > 0
                ? "Uploading..."
                : "Sending..."
              : worker.status === "running"
                ? "Interrupt and send"
                : "Send"}
          </Button>
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

function ImageAttachmentTray({
  attachments,
  disabled,
  fileInputRef,
  onAdd,
  onRemove,
}: {
  attachments: ImageAttachment[];
  disabled?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAdd: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (attachmentId: string) => void;
}) {
  return (
    <div className="border-grayscale-3 border-t px-3 py-2">
      {attachments.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
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
      ) : null}
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        disabled={disabled}
        multiple
        onChange={onAdd}
        ref={fileInputRef}
        type="file"
      />
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || attachments.length >= maxImageAttachments}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageSquare size={16} weight="bold" aria-hidden="true" />
        {attachments.length > 0 ? "Add image" : "Attach image"}
      </Button>
    </div>
  );
}

function addImageAttachmentsFromInput(
  event: ChangeEvent<HTMLInputElement>,
  onAdd: (files: File[]) => void,
) {
  const selectedFiles = Array.from(event.target.files ?? []);
  event.target.value = "";
  onAdd(selectedFiles);
}

function handleImagePaste(
  event: ClipboardEvent<HTMLTextAreaElement>,
  disabled: boolean,
  onAdd: (files: File[]) => void,
) {
  if (disabled) {
    return;
  }

  const files = getImageFiles(Array.from(event.clipboardData.files));

  if (files.length === 0) {
    return;
  }

  event.preventDefault();
  onAdd(files);
}

function handleImageDragOver(
  event: DragEvent<HTMLFormElement>,
  disabled: boolean,
) {
  if (disabled || !hasImageTransfer(event.dataTransfer)) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

function handleImageDrop(
  event: DragEvent<HTMLFormElement>,
  disabled: boolean,
  onAdd: (files: File[]) => void,
) {
  if (disabled) {
    return;
  }

  const files = getImageFiles(Array.from(event.dataTransfer.files));

  if (files.length === 0) {
    return;
  }

  event.preventDefault();
  onAdd(files);
}

function hasImageTransfer(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.items).some(
    (item) => item.kind === "file" && item.type.startsWith("image/"),
  );
}

function getImageFiles(files: File[]) {
  return files.filter((file) => file.type.startsWith("image/"));
}

function addImageAttachmentFiles({
  currentAttachments,
  files,
  onError,
  setAttachments,
}: {
  currentAttachments: ImageAttachment[];
  files: File[];
  onError: (error: string | null) => void;
  setAttachments: Dispatch<SetStateAction<ImageAttachment[]>>;
}) {
  const selectedFiles = files;

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
