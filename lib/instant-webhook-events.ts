export type InstantEventRecord = {
  source?: string;
  type?: string;
};

export type SupervisorInviteRecord = {
  email?: string;
  status?: string;
};

export function shouldTriggerWorkerRunForEvent(
  event: InstantEventRecord | null | undefined,
): event is InstantEventRecord & { source: "factory"; type: "user_message" } {
  return event?.source === "factory" && event.type === "user_message";
}

export function shouldProcessSupervisorInvite(
  supervisor: SupervisorInviteRecord | null | undefined,
): supervisor is SupervisorInviteRecord & {
  email: string;
  status: "invited";
} {
  return supervisor?.status === "invited" && Boolean(supervisor.email);
}
