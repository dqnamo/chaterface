"use client";

import type { InstaQLEntity } from "@instantdb/react";
import { motion } from "motion/react";
import type schema from "@/instant.schema";

export type EventRecord = InstaQLEntity<typeof schema, "events">;

type EventProps = {
  event: EventRecord;
};

type EventFeedProps = {
  events: EventRecord[];
};

type EventFeedItem =
  | {
      event: EventRecord;
      id: string;
      kind: "event";
    }
  | {
      events: EventRecord[];
      id: string;
      kind: "codex-json-group";
    };

type MessageEventProps = {
  label: string;
  message: string;
};

type CodexJsonEventGroupProps = {
  events: EventRecord[];
};

export function EventFeed({ events }: EventFeedProps) {
  const items = getEventFeedItems(events);

  return (
    <ol className="flex flex-col gap-4">
      {items.map((item) =>
        item.kind === "codex-json-group" ? (
          <CodexJsonEventGroup events={item.events} key={item.id} />
        ) : (
          <Event event={item.event} key={item.id} />
        ),
      )}
    </ol>
  );
}

export default function Event({ event }: EventProps) {
  if (event.source === "codex") {
    const message = getCodexAgentMessageText(event.data);

    return message ? <MessageEvent label="Codex" message={message} /> : null;
  }

  if (event.type === "user_message") {
    const message = getUserPrompt(event.data);

    return message ? <MessageEvent label="You" message={message} /> : null;
  }

  const message = getDiagnosticMessage(event.data);

  return message ? <MessageEvent label="System" message={message} /> : null;
}

export function MessageEvent({ label, message }: MessageEventProps) {
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
        <div className="whitespace-pre-wrap text-sm text-grayscale-12">
          {message}
        </div>
      </motion.div>
    </li>
  );
}

function CodexJsonEventGroup({ events }: CodexJsonEventGroupProps) {
  return (
    <li>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <details className="rounded-lg border border-grayscale-3 bg-grayscale-1">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm text-grayscale-11">
            <span className="inline-flex max-w-full items-center gap-2 align-middle">
              <span className="font-mono font-medium text-grayscale-10 text-xs uppercase">
                Codex JSON
              </span>
              <span className="text-grayscale-9 text-xs">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </span>
          </summary>
          <ul className="flex flex-col gap-2 border-grayscale-3 border-t p-2">
            {events.map((event) => (
              <li key={event.id}>
                <details className="rounded-md border border-grayscale-3 bg-grayscale-2">
                  <summary className="cursor-pointer select-none px-2 py-1.5">
                    <span className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-mono text-grayscale-11 text-xs">
                        {getCodexEventTitle(event)}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-grayscale-9">
                        {getShortEventId(event.id)}
                      </span>
                    </span>
                  </summary>
                  <pre className="max-h-96 overflow-auto border-grayscale-3 border-t p-3 font-mono text-[11px] text-grayscale-12 leading-relaxed">
                    {formatJson(event.data)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </details>
      </motion.div>
    </li>
  );
}

function getUserPrompt(data: unknown) {
  if (!isRecord(data) || !("prompt" in data)) {
    return null;
  }

  return String(data.prompt ?? "");
}

function getCodexAgentMessageText(data: unknown) {
  if (isRecord(data) && isAssistantLikeMessage(data)) {
    const directText = getTextValue(data);

    if (directText) {
      return directText;
    }
  }

  const messageItems = getMessageItems(data);
  const messageText = messageItems
    .map((item) => getTextValue(item))
    .filter(Boolean)
    .join("\n\n");

  return messageText || null;
}

function getMessageItems(data: unknown) {
  if (
    isRecord(data) &&
    isRecord(data.item) &&
    data.item.type === "agent_message"
  ) {
    return [data.item];
  }

  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items.filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && item.type === "agent_message",
    );
  }

  if (isRecord(data) && data.type === "agent_message") {
    return [data];
  }

  return [];
}

function getTextValue(item: Record<string, unknown>) {
  if (typeof item.text === "string") {
    return item.text;
  }

  if (typeof item.message === "string") {
    return item.message;
  }

  if (typeof item.content === "string") {
    return item.content;
  }

  if (Array.isArray(item.content)) {
    return item.content
      .map((part) => {
        if (!isRecord(part)) {
          return null;
        }

        if (typeof part.text === "string") {
          return part.text;
        }

        if (typeof part.output_text === "string") {
          return part.output_text;
        }

        if (typeof part.content === "string") {
          return part.content;
        }

        return null;
      })
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

function getDiagnosticMessage(data: unknown) {
  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.raw === "string") {
    return data.raw;
  }

  if (isRecord(data.error) && typeof data.error.message === "string") {
    return data.error.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  return null;
}

function getEventFeedItems(events: EventRecord[]) {
  const items: EventFeedItem[] = [];
  let codexJsonEvents: EventRecord[] = [];

  function flushCodexJsonEvents() {
    if (codexJsonEvents.length === 0) {
      return;
    }

    items.push({
      events: codexJsonEvents,
      id: `codex-json-${codexJsonEvents[0]?.id ?? items.length}`,
      kind: "codex-json-group",
    });
    codexJsonEvents = [];
  }

  for (const event of events) {
    if (isCodexJsonEvent(event)) {
      codexJsonEvents.push(event);
      continue;
    }

    flushCodexJsonEvents();
    items.push({ event, id: event.id, kind: "event" });
  }

  flushCodexJsonEvents();

  return items;
}

function isCodexJsonEvent(event: EventRecord) {
  return (
    event.source === "codex" && getCodexAgentMessageText(event.data) === null
  );
}

function getCodexEventTitle(event: EventRecord) {
  const payloadType = getPayloadType(event.data);
  const diagnosticMessage = getDiagnosticMessage(event.data);
  const title = payloadType ?? event.type ?? "codex_event";

  if (!diagnosticMessage) {
    return title;
  }

  return `${title}: ${diagnosticMessage}`;
}

function getPayloadType(data: unknown): string | null {
  if (!isRecord(data)) {
    return null;
  }

  if (isRecord(data.item) && typeof data.item.type === "string") {
    return data.item.type;
  }

  if (isRecord(data.msg) && typeof data.msg.type === "string") {
    return data.msg.type;
  }

  if (typeof data.type === "string") {
    return data.type;
  }

  return null;
}

function getShortEventId(eventId: string) {
  return eventId.slice(0, 8);
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isAssistantLikeMessage(item: Record<string, unknown>) {
  const type = typeof item.type === "string" ? item.type : "";
  const role = typeof item.role === "string" ? item.role : "";

  return (
    role === "assistant" ||
    type === "agent_message" ||
    type === "assistant_message" ||
    type === "message" ||
    type === "response.output_text"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
