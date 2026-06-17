export const TASK_STATUSES = [
	"idle",
	"in_progress",
	"failed",
	"complete",
] as const;

export type TaskDbStatus = (typeof TASK_STATUSES)[number];

export type TaskDotStatus = "idle" | "running" | "failed";

export function toTaskDotStatus(status: string | undefined): TaskDotStatus {
	if (status === "in_progress" || status === "running") {
		return "running";
	}

	if (status === "failed") {
		return "failed";
	}

	return "idle";
}

export function toAgentSessionDotStatus(
	taskStatus: string | undefined,
	sessionStatus: string | undefined,
): TaskDotStatus {
	if (taskStatus === "failed") {
		return "failed";
	}

	return toTaskDotStatus(sessionStatus);
}
