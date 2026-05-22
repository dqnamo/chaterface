export type WorkerStatusTone = {
  className: string;
  isSpinner?: boolean;
  label: string;
};

export function getWorkerStatusTone(status: string): WorkerStatusTone {
  switch (status) {
    case "failed":
      return {
        className: "bg-red-9",
        label: "Failed",
      };
    case "idle":
      return {
        className: "bg-accent-9",
        label: "Idle and awaiting input",
      };
    case "retired":
      return {
        className: "bg-grayscale-8",
        label: "Retired",
      };
    case "queued":
    case "running":
      return {
        className: "text-green-9",
        isSpinner: true,
        label: "Working",
      };
    default:
      return {
        className: "bg-grayscale-8",
        label: status || "Status unknown",
      };
  }
}
