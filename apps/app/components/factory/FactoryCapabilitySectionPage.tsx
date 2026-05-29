"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import CapabilitiesPanel from "@/components/factory/CapabilitiesPanel";
import { FactorySectionPageShell } from "@/components/factory/FactorySectionLayout";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type CapabilitySection = "mcp" | "skills";

const sectionCopy = {
  mcp: {
    description:
      "Connect MCP servers and control the tools available to workers.",
    loading: "Loading integrations...",
    title: "Integrations",
  },
  skills: {
    description: "Install skills that workers should receive before they run.",
    loading: "Loading skills...",
    title: "Skills",
  },
} satisfies Record<
  CapabilitySection,
  {
    description: string;
    loading: string;
    title: string;
  }
>;

export default function FactoryCapabilitySectionPage({
  section,
}: {
  section: CapabilitySection;
}) {
  const { factoryId } = useParams<{ factoryId: string }>();
  const copy = sectionCopy[section];

  return (
    <FactoryCapabilitySectionPageContent
      factoryId={factoryId}
      copy={copy}
      instantDb={db}
      section={section}
    />
  );
}

function FactoryCapabilitySectionPageContent({
  copy,
  factoryId,
  instantDb,
  section,
}: {
  copy: (typeof sectionCopy)[CapabilitySection];
  factoryId: string;
  instantDb: AppDb;
  section: CapabilitySection;
}) {
  const { isLoading, error, data } = instantDb.useQuery(
    factoryId
      ? {
          factories: {
            $: { where: { id: factoryId } },
          },
        }
      : null,
  );

  const factory = data?.factories[0];

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-grayscale-11">
        {copy.loading}
      </div>
    );
  }

  if (error) {
    return (
      <FactoryLoadState
        title={`${copy.title} could not be loaded`}
        detail={error.message}
      />
    );
  }

  if (!factory) {
    return (
      <FactoryLoadState
        title="Factory not found"
        detail="This factory may have been deleted or the link may be wrong."
      />
    );
  }

  return (
    <FactorySectionPageShell title={copy.title} description={copy.description}>
      <CapabilitiesPanel
        factoryId={factoryId}
        section={section}
        variant="computer"
      />
    </FactorySectionPageShell>
  );
}

function FactoryLoadState({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-base font-semibold text-grayscale-12">{title}</h1>
        <p className="mt-2 text-sm text-grayscale-11">{detail}</p>
        <Link
          href="/"
          className="mt-4 inline-flex text-sm font-medium text-accent-11 hover:text-accent-12"
        >
          Back to factories
        </Link>
      </div>
    </div>
  );
}
