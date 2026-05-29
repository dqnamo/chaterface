export type WorkerStructuredResponse = {
  newActivityMessage?: null | string;
  response: string;
};

export const workerStructuredResponseSchema = {
  additionalProperties: false,
  properties: {
    newActivityMessage: {
      description:
        "A short replacement Worker Activity Message, or null when the existing activity message should stay unchanged.",
      maxLength: 120,
      type: ["string", "null"],
    },
    response: {
      description: "The markdown response to show to the supervisor.",
      type: "string",
    },
  },
  required: ["response", "newActivityMessage"],
  type: "object",
} as const;

export function getWorkerStructuredResponse(
  value: unknown,
): null | WorkerStructuredResponse {
  const directResponse = parseWorkerStructuredResponse(value);

  if (directResponse) {
    return directResponse;
  }

  const messageText = getCodexAgentMessageText(value);

  if (!messageText) {
    return null;
  }

  return parseWorkerStructuredResponse(parseJson(messageText));
}

function parseWorkerStructuredResponse(
  value: unknown,
): null | WorkerStructuredResponse {
  if (!isRecord(value) || typeof value.response !== "string") {
    return null;
  }

  const newActivityMessage =
    typeof value.newActivityMessage === "string"
      ? value.newActivityMessage.trim()
      : null;

  return {
    newActivityMessage: newActivityMessage || null,
    response: value.response,
  };
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

  if (
    isRecord(data) &&
    isRecord(data.msg) &&
    isAssistantLikeMessage(data.msg)
  ) {
    return [data.msg];
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

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
