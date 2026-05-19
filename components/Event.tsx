"use client";

import type { InstaQLEntity } from "@instantdb/react";
import { motion } from "motion/react";
import type schema from "@/instant.schema";

export type EventRecord = InstaQLEntity<typeof schema, "events">;

type EventProps = {
  event: EventRecord;
};

type MessageEventProps = {
  label: string;
  message: string;
};

export default function Event({ event }: EventProps) {
  if (event.source === "codex") {
    const message = getAgentMessageText(event.data);

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

function getUserPrompt(data: unknown) {
  if (!isRecord(data) || !("prompt" in data)) {
    return null;
  }

  return String(data.prompt ?? "");
}

function getAgentMessageText(data: unknown) {
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

  return messageText || getDiagnosticMessage(data);
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
