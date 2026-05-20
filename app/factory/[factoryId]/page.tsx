"use client";

import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { NewWorkerForm } from "./worker-run-form";

export default function FactoryPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return (
    <main className="min-h-dvh px-4 py-8 flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col py-2 items-center">
          <Logo className="w-10 h-10" />
          <h1 className="mt-5 font-medium text-grayscale-12">
            Spawn a new worker
          </h1>
          <p className="text-grayscale-11 text-sm max-w-md text-balance text-center">
            Describe the task you want to complete in the factory and a new
            worker will be spawned to do it.
          </p>
        </div>
        <NewWorkerForm factoryId={factoryId} />
      </div>
    </main>
  );
}
