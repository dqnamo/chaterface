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

export default function CapabilitiesPanel({
  factoryId,
  section = "all",
}: {
  factoryId: string;
  section?: "all" | "mcp" | "skills";
}) {
  return (
    <CapabilitiesPanelContent
      factoryId={factoryId}
      instantDb={db}
      section={section}
    />
  );
}

function CapabilitiesPanelContent({
  factoryId,
  instantDb,
  section,
}: {
  factoryId: string;
  instantDb: AppDb;
  section: "all" | "mcp" | "skills";
}) {
  const { data } = instantDb.useQuery(
    factoryId
      ? {
          factories: {
            $: { where: { id: factoryId } },
            skills: {},
            mcpServers: {},
          },
          factoryMcpCapabilities: {},
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
    const capabilities = (data?.factoryMcpCapabilities ??
      []) as McpCapability[];

    return ([...(factory?.mcpServers ?? [])] as McpServer[])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((server) => ({
        ...server,
        capabilities: capabilities
          .filter((capability) => capability.mcpServerId === server.id)
          .sort((a, b) => a.upstreamName.localeCompare(b.upstreamName)),
      }));
  }, [data?.factoryMcpCapabilities, factory?.mcpServers]);
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
            skills={skills}
          />
        ) : null}
        {showMcp ? (
          <McpServersPanel
            factoryId={factoryId}
            instantDb={instantDb}
            servers={mcpServers}
          />
        ) : null}
      </div>
    </section>
  );
}
