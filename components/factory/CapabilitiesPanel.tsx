"use client";

import { useMemo } from "react";
import { McpServersPanel } from "@/components/factory/capabilities/McpServersPanel";
import { SkillsPanel } from "@/components/factory/capabilities/SkillsPanel";
import type {
  McpCapability,
  McpServer,
} from "@/components/factory/capabilities/shared";
import type { AppDb } from "@/lib/db.client";
import { db } from "@/lib/db.client";

type McpServerWithCapabilities = McpServer & {
  capabilities?: McpCapability[];
};

export default function CapabilitiesPanel({
  factoryId,
  section = "all",
  variant = "default",
}: {
  factoryId: string;
  section?: "all" | "mcp" | "skills";
  variant?: "computer" | "default";
}) {
  return (
    <CapabilitiesPanelContent
      factoryId={factoryId}
      instantDb={db}
      section={section}
      variant={variant}
    />
  );
}

function CapabilitiesPanelContent({
  factoryId,
  instantDb,
  section,
  variant,
}: {
  factoryId: string;
  instantDb: AppDb;
  section: "all" | "mcp" | "skills";
  variant: "computer" | "default";
}) {
  const { data } = instantDb.useQuery(
    factoryId
      ? {
          factories: {
            $: { where: { id: factoryId } },
            skills: {},
            mcpServers: {
              capabilities: {},
            },
          },
        }
      : null,
  );
  const factory = data?.factories[0];
  const skills = useMemo(
    () =>
      [...(factory?.skills ?? [])].sort((a, b) =>
        (a.installedAt ?? "").localeCompare(b.installedAt ?? ""),
      ),
    [factory?.skills],
  );
  const mcpServers = useMemo(() => {
    return ([...(factory?.mcpServers ?? [])] as McpServerWithCapabilities[])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((server) => ({
        ...server,
        capabilities: [...(server.capabilities ?? [])].sort((a, b) =>
          a.upstreamName.localeCompare(b.upstreamName),
        ),
      }));
  }, [factory?.mcpServers]);
  const showSkills = section === "all" || section === "skills";
  const showMcp = section === "all" || section === "mcp";

  return (
    <section className="flex flex-col gap-4">
      {section === "all" ? (
        <div>
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-wide text-grayscale-10">
            Capabilities
          </h2>
          <p className="mt-1 text-sm text-grayscale-11">
            Skills and MCP servers are applied to new workers.
          </p>
        </div>
      ) : null}

      <div
        className={
          section === "all" ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"
        }
      >
        {showSkills ? (
          <SkillsPanel
            factoryId={factoryId}
            instantDb={instantDb}
            variant={section === "all" ? "default" : variant}
            skills={skills}
          />
        ) : null}
        {showMcp ? (
          <McpServersPanel
            factoryId={factoryId}
            instantDb={instantDb}
            variant={section === "all" ? "default" : variant}
            servers={mcpServers}
          />
        ) : null}
      </div>
    </section>
  );
}
