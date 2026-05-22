"use client";

import { useParams } from "next/navigation";
import FactorySettingsShell from "@/components/factory/FactorySettingsShell";
import { FactorySecretsPanel } from "../factory-secrets-panel";

export default function FactorySecretsPage() {
  const { factoryId } = useParams<{ factoryId: string }>();

  return (
    <FactorySettingsShell factoryId={factoryId}>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col py-2">
          <h1>Factory secrets</h1>
          <p className="text-gray-500 text-sm">
            These are exposed as environment variables during Codex worker runs.
          </p>
        </div>
        <FactorySecretsPanel factoryId={factoryId} />
      </div>
    </FactorySettingsShell>
  );
}
