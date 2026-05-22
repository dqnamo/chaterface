"use client";

import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/helpers/classname-helper";

export type ApiError = {
  error?: string;
};

export type SkillCandidate = {
  description: string;
  name: string;
  path: string;
};

export type McpAuthType = "bearer_token" | "oauth";

export type McpCapability = {
  capabilityType: string;
  description?: string | null;
  enabled: boolean;
  id: string;
  mcpServerId: string;
  namespacedName: string;
  upstreamName: string;
};

export type McpServer = {
  authType?: McpAuthType | string;
  authStatus?: string;
  enabled?: boolean;
  id: string;
  lastError?: string | null;
  loginUrl?: string | null;
  name: string;
  status: string;
  syncStatus?: string;
  url: string;
};

export function Field({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-grayscale-11 text-xs">{label}</span>
      {children}
      {hint ? <span className="text-grayscale-10 text-xs">{hint}</span> : null}
    </div>
  );
}

export function Notice({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "accent" | "error" | "neutral";
}) {
  const toneClass =
    tone === "error"
      ? "border-grayscale-5 bg-grayscale-2 text-grayscale-12"
      : tone === "accent"
        ? "border-accent-5 bg-accent-2 text-accent-11"
        : "border-grayscale-4 bg-grayscale-2 text-grayscale-11";

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        toneClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-grayscale-3 bg-grayscale-1 text-center text-grayscale-10 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CapabilityList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: {
    action?: ReactNode;
    error?: string;
    id: string;
    meta: string;
    status: string;
    title: string;
  }[];
}) {
  if (items.length === 0) {
    return <EmptyState className="mt-4 px-3 py-4">{emptyText}</EmptyState>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-grayscale-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="border-b border-grayscale-3 p-3 last:border-b-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {item.status === "installed" ||
                item.status === "authenticated" ? (
                  <CheckCircle
                    size={14}
                    weight="fill"
                    className="text-accent-10"
                    aria-hidden="true"
                  />
                ) : item.status === "failed" ? (
                  <WarningCircle
                    size={14}
                    weight="fill"
                    className="text-grayscale-10"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="size-2 rounded-full bg-accent-9" />
                )}
                <span className="truncate text-sm font-medium">
                  {item.title}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-grayscale-10">
                {item.meta}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.action}
              <span className="rounded-lg bg-grayscale-3 px-2 py-1 text-xs text-grayscale-11">
                {item.status}
              </span>
            </div>
          </div>
          {item.error ? (
            <Notice className="mt-2 px-2 py-1 text-xs" tone="error">
              {item.error}
            </Notice>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function getAuthHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function getJsonAuthHeaders(token: string) {
  return {
    ...getAuthHeaders(token),
    "Content-Type": "application/json",
  };
}

export function getApiError(value: unknown) {
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
