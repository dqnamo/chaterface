"use client";

import { motion } from "motion/react";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { NewWorkerForm } from "./worker-run-form";

export default function FactoryPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return (
    <main className="min-h-dvh px-4 py-8 flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col py-2 items-center"
        >
          <Logo className="w-10 h-10" />
          <h1 className="mt-5 font-medium text-grayscale-12">
            Spawn a new worker
          </h1>
          <p className="text-grayscale-11 text-sm max-w-md text-balance text-center">
            Describe the task you want to complete in the factory and a new
            worker will be spawned to do it.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <NewWorkerForm factoryId={factoryId} />
        </motion.div>
      </div>
    </main>
  );
}
