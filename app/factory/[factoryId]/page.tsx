"use client";

import { useParams } from "next/navigation";
import { NewWorkerForm } from "./worker-run-form";

export default function FactoryPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return (
    <main className="min-h-dvh px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col py-2">
          <h1>Let's build something!</h1>
          <p className="text-gray-500 text-sm">
            This will spawn a new worker to do the task.
          </p>
        </div>
        <NewWorkerForm factoryId={factoryId} />
      </div>
    </main>
  );
}
