export const defaultWorkerActivityMessage = "Getting onboarded...";

export function getWorkerFallbackName(worker: {
  id: string;
  name?: null | string;
}) {
  const name = worker.name?.trim();

  return name || `Worker ${worker.id.slice(0, 8)}`;
}
