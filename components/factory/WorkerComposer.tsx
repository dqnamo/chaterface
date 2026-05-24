"use client";

import { id } from "@instantdb/react";
import { ImageSquare, X } from "@phosphor-icons/react";
import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";
import { useRef, useState } from "react";
import Button from "@/components/public/Button";
import Card from "@/components/public/Card";
import { cn } from "@/helpers/classname-helper";

export type ImageAttachment = {
  file: File;
  id: string;
  previewUrl: string;
};

export type WorkerComposerPresenceControls = {
  onAfterSend?: () => void;
  onPromptBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onPromptFocus?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onPromptKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  status?: ReactNode;
};

export type QueuedComposerMessage = {
  attachmentCount?: number;
  id: string;
  message: string;
};

const maxImageAttachments = 5;
const maxImageAttachmentBytes = 20 * 1024 * 1024;
const supportedImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function WorkerComposer({
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
  presence,
  prompt,
  queuedMessages = [],
  setPrompt,
  startActions,
  submitLabel,
  topSection,
  uploadingLabel,
}: {
  attachments: ImageAttachment[];
  disabled?: boolean;
  endActions?: ReactNode;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  onAddAttachment: (files: File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  presence?: WorkerComposerPresenceControls;
  prompt: string;
  queuedMessages?: QueuedComposerMessage[];
  setPrompt: Dispatch<SetStateAction<string>>;
  startActions?: ReactNode;
  submitLabel: string;
  topSection?: ReactNode;
  uploadingLabel: string;
}) {
  const isSubmitDisabled = disabled || isSending;
  const attachmentDisabled = disabled || isSending;
  const displayedSubmitLabel =
    isSending && attachments.length > 0 ? uploadingLabel : submitLabel;
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function onAttachmentInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    onAddAttachment(selectedFiles);
  }

  function onDragEnter(event: DragEvent<HTMLFormElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!attachmentDisabled) {
      setIsDraggingFiles(true);
    }
  }

  function onDragOver(event: DragEvent<HTMLFormElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = attachmentDisabled ? "none" : "copy";

    if (!attachmentDisabled) {
      setIsDraggingFiles(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLFormElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);
  }

  function onDrop(event: DragEvent<HTMLFormElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);

    if (!attachmentDisabled) {
      onAddAttachment(Array.from(event.dataTransfer.files));
    }
  }

  function onTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    presence?.onPromptKeyDown?.(event);
    submitTextareaOnEnter(event);
  }

  function onQueuedMessageClick(message: string) {
    setPrompt(message);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(message.length, message.length);
    });
  }

  return (
    <Card
      layer={0}
      className={cn(
        "mx-auto w-full max-w-2xl bg-white dark:bg-grayscale-2 p-0 transition-colors",
        isDraggingFiles &&
          "border-accent-8 bg-accent-2 dark:bg-accent-3 ring-2 ring-accent-5",
      )}
    >
      <form
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSubmit={onSubmit}
        className="flex flex-col"
      >
        {topSection ? (
          <div className="border-grayscale-3 border-b">{topSection}</div>
        ) : null}
        <QueuedMessageBadges
          disabled={disabled}
          messages={queuedMessages}
          onSelect={onQueuedMessageClick}
        />
        <textarea
          id="worker-task"
          ref={textareaRef}
          value={prompt}
          className="resize-none p-3 text-grayscale-12 text-sm outline-none focus:border-accent-9 disabled:cursor-not-allowed disabled:text-grayscale-10"
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setPrompt(event.target.value)}
          onBlur={presence?.onPromptBlur}
          onFocus={presence?.onPromptFocus}
          onKeyDown={onTextareaKeyDown}
          rows={4}
        />
        <ImageAttachmentPreviews
          attachments={attachments}
          disabled={attachmentDisabled}
          onRemove={onRemoveAttachment}
        />
        {presence?.status ? (
          <div className="border-grayscale-3 border-t px-3 py-1.5">
            {presence.status}
          </div>
        ) : null}
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
              onChange={onAttachmentInputChange}
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
              className="flex flex-row items-center gap-1.5"
            >
              <ImageSquare size={16} weight="bold" aria-hidden="true" />
              {attachments.length > 0 ? "Add image" : "Attach image"}
            </Button>
            {startActions}
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

function QueuedMessageBadges({
  disabled,
  messages,
  onSelect,
}: {
  disabled?: boolean;
  messages: QueuedComposerMessage[];
  onSelect: (message: string) => void;
}) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2 border-grayscale-3 border-b px-3 py-2">
      {messages.map((message) => (
        <li className="min-w-0 max-w-full" key={message.id}>
          <button
            aria-label={`Use queued message: ${message.message}`}
            className="flex max-w-full items-center gap-1.5 rounded-full border border-grayscale-3 bg-grayscale-1 px-2.5 py-1 text-left text-xs text-grayscale-11 transition hover:border-grayscale-5 hover:bg-grayscale-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-grayscale-3 dark:hover:bg-grayscale-4"
            disabled={disabled}
            onClick={() => onSelect(message.message)}
            title={message.message}
            type="button"
          >
            <span className="shrink-0 font-medium text-grayscale-10">
              Queued
            </span>
            <span className="min-w-0 max-w-64 truncate text-grayscale-12 sm:max-w-96">
              {message.message}
            </span>
            {message.attachmentCount ? (
              <span className="shrink-0 rounded-full bg-grayscale-3 px-1.5 py-0.5 text-grayscale-10 dark:bg-grayscale-4">
                {message.attachmentCount}{" "}
                {message.attachmentCount === 1 ? "image" : "images"}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function addImageAttachments({
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

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function removeImageAttachment(
  attachments: ImageAttachment[],
  attachmentId: string,
) {
  const attachment = attachments.find((item) => item.id === attachmentId);

  if (attachment) {
    URL.revokeObjectURL(attachment.previewUrl);
  }

  return attachments.filter((item) => item.id !== attachmentId);
}

export function cleanupAttachments(attachments: ImageAttachment[]) {
  for (const attachment of attachments) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
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
