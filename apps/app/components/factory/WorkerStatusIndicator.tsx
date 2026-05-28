import { CircleNotchIcon } from "@phosphor-icons/react";
import { cn } from "@/helpers/classname-helper";
import { getWorkerStatusTone } from "@/helpers/worker-status";

export default function WorkerStatusIndicator({
  className,
  showLabel = false,
  status,
}: {
  className?: string;
  showLabel?: boolean;
  status: string;
}) {
  const tone = getWorkerStatusTone(status);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {tone.isSpinner ? (
        <CircleNotchIcon
          aria-label={tone.label}
          className={cn("size-3 shrink-0 animate-spin", tone.className)}
          role="img"
          weight="bold"
        />
      ) : (
        <span
          aria-label={tone.label}
          className={cn("size-2 shrink-0 rounded-full", tone.className)}
          role="img"
          title={tone.label}
        />
      )}
      {showLabel ? (
        <span className="shrink-0 text-grayscale-10 text-xs">{tone.label}</span>
      ) : null}
    </span>
  );
}
