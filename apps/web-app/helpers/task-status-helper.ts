export const TASK_STATUSES = ["idle", "in_progress", "failed"] as const;

export type TaskDbStatus = (typeof TASK_STATUSES)[number];

export type TaskDotStatus = "idle" | "running" | "failed";

export function toTaskDotStatus(
	status: string | undefined,
): TaskDotStatus {
	if (status === "in_progress") {
		return "running";
	}

	if (status === "failed") {
		return "failed";
	}

	return "idle";
}
