"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ArrowSquareOut, Check, Copy, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  type LinkSafetyConfig,
  type LinkSafetyModalProps,
  Streamdown,
} from "streamdown";
import { CodexJsonEventGroup } from "@/components/events/CodexJsonEventGroup";
import {
  type EventAttachment,
  type EventRecord,
  getCodexAgentMessageText,
  getDiagnosticMessage,
  getEventAttachments,
  getEventFeedItems,
  getEventSender,
  getMcpConnectionRequest,
  getUserPrompt,
} from "@/components/events/event-utils";
import { McpConnectionRequestEvent } from "@/components/events/McpConnectionRequestEvent";
import Button from "@/components/public/Button";
import UserAvatar from "@/components/UserAvatar";
import {
  getUserAvatarSeed,
  getUserDisplayName,
  type UserIdentity,
} from "@/helpers/user-identity";

export type { EventRecord } from "@/components/events/event-utils";

const messageLinkSafety = {
  enabled: true,
  renderModal: (props) => <ExternalLinkSafetyModal {...props} />,
} satisfies LinkSafetyConfig;

type EventProps = {
  event: EventRecord;
  factoryId?: string;
  userRefreshToken?: string;
};

type EventFeedProps = {
  events: EventRecord[];
  factoryId?: string;
  userRefreshToken?: string;
};

type MessageEventProps = {
  attachments?: EventAttachment[];
  author?: UserIdentity | null;
  label: string;
  message: string;
};

export function EventFeed({
  events,
  factoryId,
  userRefreshToken,
}: EventFeedProps) {
  const items = getEventFeedItems(events);

  return (
    <ol className="flex flex-col gap-4">
      {items.map((item) =>
        item.kind === "codex-json-group" ? (
          <CodexJsonEventGroup events={item.events} key={item.id} />
        ) : (
          <Event
            event={item.event}
            factoryId={factoryId}
            key={item.id}
            userRefreshToken={userRefreshToken}
          />
        ),
      )}
    </ol>
  );
}

export default function Event({
  event,
  factoryId,
  userRefreshToken,
}: EventProps) {
  if (event.source === "codex") {
    const message = getCodexAgentMessageText(event.data);

    return message ? <MessageEvent label="Codex" message={message} /> : null;
  }

  if (event.type === "user_message") {
    const message = getUserPrompt(event.data);
    const attachments = getEventAttachments(event);
    const author = getEventSender(event.data);

    return message ? (
      <MessageEvent
        attachments={attachments}
        author={author ?? { name: "Supervisor" }}
        label="Supervisor"
        message={message}
      />
    ) : null;
  }

  if (event.type === "factory.mcp.connection.requested") {
    const request = getMcpConnectionRequest(event.data);

    return request ? (
      <McpConnectionRequestEvent
        factoryId={factoryId}
        request={request}
        userRefreshToken={userRefreshToken}
      />
    ) : null;
  }

  const message = getDiagnosticMessage(event.data);

  return message ? <MessageEvent label="System" message={message} /> : null;
}

export function MessageEvent({
  attachments = [],
  author,
  label,
  message,
}: MessageEventProps) {
  const authorName = author ? getUserDisplayName(author) : null;
  const authorSeed = author ? getUserAvatarSeed(author) : undefined;

  return (
    <li>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        {authorName ? (
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar
              className="rounded-md"
              name={authorName}
              seed={authorSeed}
              size={22}
            />
            <p className="min-w-0 truncate font-medium text-grayscale-11 text-xs">
              {authorName}
            </p>
          </div>
        ) : (
          <p className="font-mono text-grayscale-10 text-xs font-medium uppercase">
            {label}
          </p>
        )}
        <Streamdown
          className="text-sm text-grayscale-12 [overflow-wrap:anywhere]"
          linkSafety={messageLinkSafety}
          mode="static"
        >
          {message}
        </Streamdown>
        {attachments.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <li
                className="size-24 overflow-hidden rounded-lg border border-grayscale-3 bg-grayscale-2"
                key={attachment.id}
              >
                {attachment.url ? (
                  <div
                    aria-label={attachment.path ?? "Attached image"}
                    className="size-full bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${attachment.url})` }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </motion.div>
    </li>
  );
}

function ExternalLinkSafetyModal({
  isOpen,
  onClose,
  onConfirm,
  url,
}: LinkSafetyModalProps) {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    },
    [],
  );

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-grayscale-12/25 backdrop-blur-sm" />
        <Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-100 flex w-[calc(100vw-2rem)] max-w-lg flex-col gap-4 rounded-lg border border-grayscale-3 bg-white p-4 shadow-xl outline-none dark:border-grayscale-4 dark:bg-grayscale-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="flex items-center gap-2 font-semibold text-base text-grayscale-12">
                <ArrowSquareOut size={18} weight="bold" aria-hidden="true" />
                Open external link?
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-grayscale-11 text-sm">
                You are about to visit a website outside Factoryplane.
              </Dialog.Description>
            </div>
            <Dialog.Close className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-grayscale-3 bg-white text-grayscale-11 transition-colors hover:border-grayscale-4 hover:bg-grayscale-2 dark:border-grayscale-4 dark:bg-grayscale-3 dark:hover:border-grayscale-5 dark:hover:bg-grayscale-4">
              <X size={16} weight="bold" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <p className="max-h-32 overflow-auto rounded-lg border border-grayscale-3 bg-grayscale-2 p-3 font-mono text-grayscale-12 text-sm break-all dark:border-grayscale-4 dark:bg-grayscale-1">
            {url}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              className="justify-center"
              type="button"
              variant="secondary"
              onClick={copyLink}
            >
              {copied ? (
                <Check size={16} weight="bold" aria-hidden="true" />
              ) : (
                <Copy size={16} weight="bold" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              className="justify-center"
              type="button"
              onClick={onConfirm}
            >
              <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
              Open link
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
