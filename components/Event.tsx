"use client";

import type { InstaQLEntity } from "@instantdb/react";
import { Plug } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { type FormEvent, useId, useState } from "react";
import { Streamdown } from "streamdown";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";
import type schema from "@/instant.schema";

export type EventRecord = InstaQLEntity<typeof schema, "events">;

type EventAttachment = {
  id: string;
  path?: string;
  url?: string;
};

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
  attachments?: EventAttachment[];
  label: string;
  message: string;
};

type CodexJsonEventGroupProps = {
  events: EventRecord[];
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

function McpConnectionRequestEvent({
  factoryId,
  request,
  userRefreshToken,
}: {
  factoryId?: string;
  request: {
    authType: string;
    name: string;
    reason?: string;
    scopes?: string;
    url: string;
  };
  userRefreshToken?: string;
}) {
  const [authType, setAuthType] = useState(request.authType);
  const [bearerToken, setBearerToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const formId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(request.name);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [scopes, setScopes] = useState(request.scopes ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [url, setUrl] = useState(request.url);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!factoryId || !userRefreshToken) {
      setError("Sign in before connecting this MCP server.");
      return;
    }

    if (!name.trim() || !url.trim()) {
      setError("Name and URL are required.");
      return;
    }

    if (authType === "bearer_token" && !bearerToken.trim()) {
      setError("Bearer token is required for this MCP server.");
      return;
    }

    setError(null);
    setOauthUrl(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/factories/${factoryId}/mcp/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userRefreshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authType,
          bearerToken:
            authType === "bearer_token" ? bearerToken.trim() : undefined,
          name: name.trim(),
          scopes: scopes.trim() || undefined,
          url: url.trim(),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { authUrl?: string | null; status?: string }
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(getApiError(body) ?? "MCP setup could not be started.");
      }

      setBearerToken("");
      setOauthUrl(body && "authUrl" in body ? (body.authUrl ?? null) : null);
      setStatus(
        body && "status" in body ? (body.status ?? "started") : "started",
      );
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "MCP setup could not be started.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-grayscale-3 bg-grayscale-1 p-3"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-2 text-accent-11">
            <Plug size={16} weight="bold" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono font-medium text-grayscale-10 text-xs uppercase">
              MCP request
            </p>
            <h3 className="mt-1 truncate font-medium text-grayscale-12 text-sm">
              {request.name}
            </h3>
            <p className="mt-1 truncate text-grayscale-10 text-xs">
              {request.url}
            </p>
            <p className="mt-1 text-grayscale-10 text-xs">
              {request.authType === "bearer_token" ? "Bearer token" : "OAuth"}
              {request.scopes ? ` · ${request.scopes}` : ""}
            </p>
            {request.reason ? (
              <p className="mt-2 whitespace-pre-wrap text-grayscale-11 text-sm">
                {request.reason}
              </p>
            ) : null}
          </div>
        </div>

        <form className="mt-3 flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5" htmlFor={`${formId}-name`}>
              <span className="font-medium text-grayscale-11 text-xs">
                Name
              </span>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium text-grayscale-11 text-xs">
                Auth method
              </span>
              <select
                className="rounded-lg border border-grayscale-3 bg-grayscale-1 p-2 text-grayscale-12 text-sm outline-none focus:border-accent-9"
                value={authType}
                onChange={(event) => setAuthType(event.target.value)}
                disabled={isSubmitting}
              >
                <option value="oauth">OAuth</option>
                <option value="bearer_token">Bearer token</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5" htmlFor={`${formId}-url`}>
            <span className="font-medium text-grayscale-11 text-xs">
              HTTP URL
            </span>
            <Input
              id={`${formId}-url`}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-1.5" htmlFor={`${formId}-scopes`}>
            <span className="font-medium text-grayscale-11 text-xs">
              OAuth scopes
            </span>
            <Input
              id={`${formId}-scopes`}
              value={scopes}
              onChange={(event) => setScopes(event.target.value)}
              placeholder="Optional"
              disabled={isSubmitting}
            />
          </label>

          {authType === "bearer_token" ? (
            <label
              className="flex flex-col gap-1.5"
              htmlFor={`${formId}-bearer-token`}
            >
              <span className="font-medium text-grayscale-11 text-xs">
                Bearer token
              </span>
              <Input
                id={`${formId}-bearer-token`}
                value={bearerToken}
                onChange={(event) => setBearerToken(event.target.value)}
                placeholder="Upstream bearer token"
                type="password"
                autoComplete="off"
                disabled={isSubmitting}
              />
            </label>
          ) : null}

          {oauthUrl ? (
            <a
              href={oauthUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-accent-5 bg-accent-2 px-3 py-2 text-accent-11 text-sm hover:text-accent-12"
            >
              Open MCP OAuth login
            </a>
          ) : null}

          {status && !oauthUrl ? (
            <p className="rounded-lg border border-accent-5 bg-accent-2 px-3 py-2 text-accent-11 text-sm">
              MCP setup started.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-grayscale-5 bg-grayscale-2 px-3 py-2 text-grayscale-12 text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Starting..." : "Add MCP"}
            </Button>
          </div>
        </form>
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

function getMcpConnectionRequest(data: unknown) {
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

function getApiError(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return null;
}

function getUserPrompt(data: unknown) {
  if (!isRecord(data) || !("prompt" in data)) {
    return null;
  }

  return String(data.prompt ?? "");
}

function getEventAttachments(event: EventRecord) {
  const attachments = "attachments" in event ? event.attachments : undefined;

  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.filter(isEventAttachment);
}

function isEventAttachment(value: unknown): value is EventAttachment {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.url === "string" || value.url === undefined) &&
    (typeof value.path === "string" || value.path === undefined)
  );
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
    (type === "message" && !role) ||
    type === "response.output_text"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
