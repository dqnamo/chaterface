"use client";

import { motion } from "motion/react";
import { Streamdown } from "streamdown";
import { CodexJsonEventGroup } from "@/components/events/CodexJsonEventGroup";
import {
  type EventAttachment,
  type EventRecord,
  getCodexAgentMessageText,
  getDiagnosticMessage,
  getEventAttachments,
  getEventFeedItems,
  getMcpConnectionRequest,
  getUserPrompt,
} from "@/components/events/event-utils";
import { McpConnectionRequestEvent } from "@/components/events/McpConnectionRequestEvent";

export type { EventRecord } from "@/components/events/event-utils";

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

    return message ? (
      <MessageEvent attachments={attachments} label="You" message={message} />
    ) : null;
  }

  if (event.type === "queued_user_message") {
    const message = getUserPrompt(event.data);
    const attachments = getEventAttachments(event);

    return message ? (
      <MessageEvent
        attachments={attachments}
        label="Queued"
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
  label,
  message,
}: MessageEventProps) {
  return (
    <li>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <p className="font-mono text-grayscale-10 text-xs font-medium uppercase">
          {label}
        </p>
        <Streamdown
          className="text-sm text-grayscale-12 [overflow-wrap:anywhere]"
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
