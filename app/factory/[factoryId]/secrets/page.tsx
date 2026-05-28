"use client";

import { useParams } from "next/navigation";
import { FactorySecretsPanel } from "../factory-secrets-panel";

export default function FactorySecretsPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col p-2">
          <h1 className="font-medium text-grayscale-12">Secrets</h1>
          <p className="text-grayscale-10 text-sm">
            These are added to the coding agents computer environment.
          </p>
        </div>
        <FactorySecretsPanel factoryId={factoryId} />
      </div>
    </div>
  );
}
