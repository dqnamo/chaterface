import "server-only";

import { e2bSandboxProvider } from "@/lib/sandbox/providers/e2b";

export type SandboxCommandResult = {
  exitCode: number;
  output: string;
  success: boolean;
};

export type SandboxStreamChunk =
  | { data: string; type: "output" }
  | { exitCode: number; type: "exit" };

export type SandboxCheckpoint = {
  id: string;
  name?: string;
  status?: string;
};

export type SandboxPreviewUrl = {
  authConfig?: Record<string, unknown>;
  port: number;
  url: string;
};

export type SandboxPreviewAuthOptions = {
  basicAuth?: boolean;
  bearerToken?: boolean;
};

export type AppSandbox = {
  id: string;
  provider: "e2b";
  raw: unknown;
};

export type SandboxProvider = {
  connectSandbox(sandboxId: string): Promise<AppSandbox>;
  createFactorySandbox(factoryId: string): Promise<AppSandbox>;
  createWorkerSandbox(input: {
    checkpointId: string;
    env?: Record<string, string>;
    factoryId: string;
    workerId: string;
  }): Promise<AppSandbox>;
  createCheckpoint(
    sandbox: AppSandbox,
    name: string,
  ): Promise<SandboxCheckpoint>;
  createPreviewUrl(
    sandbox: AppSandbox,
    port: number,
    authOptions?: SandboxPreviewAuthOptions,
  ): Promise<SandboxPreviewUrl>;
  deletePreviewUrl(sandbox: AppSandbox, port: number): Promise<void>;
  listPreviewUrls(sandbox: AppSandbox): Promise<SandboxPreviewUrl[]>;
  runSandboxCommand(
    sandbox: AppSandbox,
    command: string,
    timeoutMs?: number,
  ): Promise<SandboxCommandResult>;
  streamSandboxCommand(
    sandbox: AppSandbox,
    command: string,
  ): Promise<AsyncIterable<SandboxStreamChunk>>;
};

const provider = e2bSandboxProvider;

export function connectSandbox(sandboxId: string) {
  return provider.connectSandbox(sandboxId);
}

export function createFactorySandbox(factoryId: string) {
  return provider.createFactorySandbox(factoryId);
}

export function createWorkerSandbox(input: {
  checkpointId: string;
  env?: Record<string, string>;
  factoryId: string;
  workerId: string;
}) {
  return provider.createWorkerSandbox(input);
}

export function runSandboxCommand(
  sandbox: AppSandbox,
  command: string,
  timeoutMs?: number,
) {
  return provider.runSandboxCommand(sandbox, command, timeoutMs);
}

export function streamSandboxCommand(sandbox: AppSandbox, command: string) {
  return provider.streamSandboxCommand(sandbox, command);
}

export function createCheckpoint(sandbox: AppSandbox, name: string) {
  return provider.createCheckpoint(sandbox, name);
}

export function createPreviewUrl(
  sandbox: AppSandbox,
  port: number,
  authOptions?: SandboxPreviewAuthOptions,
) {
  return provider.createPreviewUrl(sandbox, port, authOptions);
}

export function listPreviewUrls(sandbox: AppSandbox) {
  return provider.listPreviewUrls(sandbox);
}

export function deletePreviewUrl(sandbox: AppSandbox, port: number) {
  return provider.deletePreviewUrl(sandbox, port);
}
