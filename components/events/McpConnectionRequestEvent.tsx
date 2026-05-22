"use client";

import { Plug } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { type FormEvent, useId, useState } from "react";
import Button from "@/components/public/Button";
import Input from "@/components/public/Input";

type McpConnectionRequest = {
  authType: string;
  name: string;
  reason?: string;
  scopes?: string;
  url: string;
};

export function McpConnectionRequestEvent({
  factoryId,
  request,
  userRefreshToken,
}: {
  factoryId?: string;
  request: McpConnectionRequest;
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
