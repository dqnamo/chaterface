export type TaskDotStatus = "idle" | "running" | "failed" | "complete";

export function toTaskDotStatus(status: string | undefined): TaskDotStatus {
	if (status === "in_progress" || status === "running") {
		return "running";
	}

	if (status === "failed") {
		return "failed";
	}

	if (status === "complete" || status === "done") {
		return "complete";
	}

	return "idle";
}

export function isCompletedTask(
	status: string | undefined,
	completedAt?: unknown,
) {
	return Boolean(completedAt) || status === "complete" || status === "done";
}
