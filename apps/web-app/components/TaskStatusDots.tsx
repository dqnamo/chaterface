import { cn } from "@/helpers/classname-helper";
import type { TaskDotStatus } from "@/helpers/task-status-helper";

const FAILED_PATTERN = [true, true, true, true, true, true] as const;
const DOT_INDICES = [0, 1, 2, 3, 4, 5] as const;

const statusLabels: Record<TaskDotStatus, string> = {
	idle: "Idle",
	running: "In progress",
	failed: "Failed",
};

type TaskStatusDotsProps = {
	status: TaskDotStatus;
	size?: number;
	gap?: number;
	className?: string;
	label?: string;
};

export default function TaskStatusDots({
	status,
	size = 3,
	gap = 1,
	className,
	label,
}: TaskStatusDotsProps) {
	const pattern = status === "failed" ? FAILED_PATTERN : null;
	const cellStyle = { width: size, height: size };

	return (
		<div
			aria-label={label ?? `Task ${statusLabels[status].toLowerCase()}`}
			className={cn("grid w-max shrink-0 grid-cols-2", className)}
			role="status"
			style={{ gap }}
		>
			{DOT_INDICES.map((index) => {
				const isFilled = pattern ? pattern[index] : true;
				const isRunning = status === "running";
				const isIdle = status === "idle";

				return (
					<div
						key={`task-status-dot-${index}`}
						className={cn(
							"task-status-dot rounded-[1px]",
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
