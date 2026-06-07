import type { TaskDotStatus } from "@/helpers/task-status-helper";
import { cn } from "@/helpers/classname-helper";

const FAILED_PATTERN = [true, false, false, false, false, true] as const;

const statusLabels: Record<TaskDotStatus, string> = {
	idle: "Task idle",
	running: "Task in progress",
	failed: "Task failed",
};

type TaskStatusDotsProps = {
	status: TaskDotStatus;
	size?: number;
	gap?: number;
	className?: string;
};

export default function TaskStatusDots({
	status,
	size = 3,
	gap = 1,
	className,
}: TaskStatusDotsProps) {
	const pattern = status === "failed" ? FAILED_PATTERN : null;
	const cellStyle = { width: size, height: size };

	return (
		<div
			aria-label={statusLabels[status]}
			className={cn("grid w-max shrink-0 grid-cols-2", className)}
			role="status"
			style={{ gap }}
		>
			{Array.from({ length: 6 }, (_, index) => {
				const isFilled = pattern ? pattern[index] : true;
				const isRunning = status === "running";
				const isIdle = status === "idle";

				return (
					<div
						key={index}
						className={cn(
							"task-status-dot",
							isRunning && "task-status-dot--running",
							isFilled
								? status === "failed"
									? "bg-red-9"
									: isRunning
										? "bg-accent-9"
										: isIdle
											? "bg-green-9"
											: "bg-grayscale-8"
								: "bg-transparent",
						)}
						style={{
							...cellStyle,
							...(isRunning && {
								animationDelay: `${index * 0.12}s`,
							}),
						}}
					/>
				);
			})}
		</div>
	);
}
