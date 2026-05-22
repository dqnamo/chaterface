import type { InstaQLEntity } from "@instantdb/react";
import type schema from "@/instant.schema";

export type EventRecord = InstaQLEntity<typeof schema, "events">;

export type EventAttachment = {
  id: string;
  path?: string;
  url?: string;
};

export type EventFeedItem =
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

export function getUserPrompt(data: unknown) {
  if (!isRecord(data) || !("prompt" in data)) {
    return null;
  }

  return String(data.prompt ?? "");
}

export function getEventAttachments(event: EventRecord) {
  const attachments = "attachments" in event ? event.attachments : undefined;

  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.filter(isEventAttachment);
}

export function getMcpConnectionRequest(data: unknown) {
  if (!isRecord(data)) {
    return null;
  }

  const name = typeof data.name === "string" ? data.name : "";
  const url = typeof data.url === "string" ? data.url : "";

  if (!name || !url) {
    return null;
  }

  return {
    authType: data.authType === "bearer_token" ? "bearer_token" : "oauth",
    name,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    scopes: typeof data.scopes === "string" ? data.scopes : undefined,
    url,
  };
}

export function getCodexAgentMessageText(data: unknown) {
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

export function getDiagnosticMessage(data: unknown) {
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

export function getEventFeedItems(events: EventRecord[]) {
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

export function getCodexEventTitle(event: EventRecord) {
  const payloadType = getPayloadType(event.data);
  const diagnosticMessage = getDiagnosticMessage(event.data);
  const title = payloadType ?? event.type ?? "codex_event";

  if (!diagnosticMessage) {
    return title;
  }

  return `${title}: ${diagnosticMessage}`;
}

export function getShortEventId(eventId: string) {
  return eventId.slice(0, 8);
}

export function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getMessageItems(data: unknown) {
  if (
    isRecord(data) &&
    isRecord(data.item) &&
    isAssistantLikeMessage(data.item)
  ) {
    return [data.item];
  }

  if (
    isRecord(data) &&
    isRecord(data.message) &&
    isAssistantLikeMessage(data.message)
  ) {
    return [data.message];
  }

  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items.filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && isAssistantLikeMessage(item),
    );
  }

  if (isRecord(data) && Array.isArray(data.output)) {
    return data.output.filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && isAssistantLikeMessage(item),
    );
  }

  return [];
}

function getTextValue(item: Record<string, unknown>): string | null {
  if (typeof item.text === "string") {
    return item.text;
  }

  if (typeof item.message === "string") {
    return item.message;
  }

  if (isRecord(item.message)) {
    const messageText = getTextValue(item.message);

    if (messageText) {
      return messageText;
    }
  }

  if (typeof item.content === "string") {
    return item.content;
  }

  if (isRecord(item.content)) {
    const contentText = getTextValue(item.content);

    if (contentText) {
      return contentText;
    }
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

function isCodexJsonEvent(event: EventRecord) {
  return (
    event.source === "codex" && getCodexAgentMessageText(event.data) === null
  );
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

function isAssistantLikeMessage(item: Record<string, unknown>) {
  const type = typeof item.type === "string" ? item.type : "";
  const role = typeof item.role === "string" ? item.role : "";

  return (
    role === "assistant" ||
    type === "agent_message" ||
    type === "assistant_message" ||
    (type === "message" && !role) ||
    type === "response.output_text"
  );
}

function isEventAttachment(value: unknown): value is EventAttachment {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.url === "string" || value.url === undefined) &&
    (typeof value.path === "string" || value.path === undefined)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
