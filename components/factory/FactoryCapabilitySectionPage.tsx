"use client";

import { Plug, PuzzlePiece } from "@phosphor-icons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CapabilitiesPanel from "@/components/factory/CapabilitiesPanel";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type CapabilitySection = "mcp" | "skills";

const sectionCopy = {
  mcp: {
    description:
      "Connect MCP servers and control the tools available to workers.",
    icon: Plug,
    loading: "Loading MCP servers...",
    title: "MCP",
  },
  skills: {
    description: "Install skills that new workers should receive by default.",
    icon: PuzzlePiece,
    loading: "Loading skills...",
    title: "Skills",
  },
} satisfies Record<
  CapabilitySection,
  {
    description: string;
    icon: typeof Plug;
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
  const Icon = copy.icon;

  if (!db) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-grayscale-11 text-sm">
        InstantDB is not configured.
      </div>
    );
  }

  return (
    <FactoryCapabilitySectionPageContent
      factoryId={factoryId}
      Icon={Icon}
      copy={copy}
      instantDb={db}
      section={section}
    />
  );
}

function FactoryCapabilitySectionPageContent({
  copy,
  factoryId,
  Icon,
  instantDb,
  section,
}: {
  copy: (typeof sectionCopy)[CapabilitySection];
  factoryId: string;
  Icon: typeof Plug;
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
    <div className="px-4 py-5 sm:p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-grayscale-3 pb-6">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-grayscale-4 bg-grayscale-2 text-accent-11">
              <Icon size={20} weight="bold" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-md font-mono font-bold uppercase text-grayscale-12">
                {copy.title}
              </h1>
              <p className="mt-1 text-sm text-grayscale-11">
                {copy.description}
              </p>
            </div>
          </div>
        </header>

        <CapabilitiesPanel factoryId={factoryId} section={section} />
      </div>
    </div>
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
