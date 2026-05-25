import { id } from "@instantdb/admin";
import { getAdminDb } from "@/lib/admin-db";
import {
  type FactoryAccessRecord,
  getAccessibleFactory,
  getCurrentUserForApiRequest,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  getFactoryCapabilitySandbox,
  installSkills,
  type SkillCandidate,
  snapshotFactoryCapabilities,
} from "@/lib/codex/factory-capabilities";

export const runtime = "nodejs";

type InstallSkillsRequest = {
  repoUrl?: string;
  skills?: SkillCandidate[];
};

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

type CapabilityFactoryRecord = FactoryAccessRecord & {
  capabilitySandboxId?: string;
  defaultSandboxCheckpointId?: string;
  id: string;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId } = await context.params;
  let body: InstallSkillsRequest;

  try {
    body = (await request.json()) as InstallSkillsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repoUrl = body.repoUrl?.trim();
  const skills = (body.skills ?? []).filter(
    (skill) => skill.name?.trim() && skill.path?.trim(),
  );

  if (!repoUrl || skills.length === 0) {
    return Response.json(
      { error: "repoUrl and at least one skill are required" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  let canRecordFailure = false;

  try {
    const factory = await getAccessibleFactory<CapabilityFactoryRecord>(
      factoryId,
      user,
    );

    if (!factory) {
      return Response.json({ error: "Factory not found" }, { status: 404 });
    }
    canRecordFailure = true;

    const sandbox = await getFactoryCapabilitySandbox({
      factory,
      factoryId,
    });

    await installSkills({
      repoUrl,
      sandbox,
      skillPaths: skills.map((skill) => skill.path),
    });
    await snapshotFactoryCapabilities({
      factoryId,
      sandbox,
    });

    const installedAt = new Date().toISOString();
    const skillIds = skills.map(() => id());

    await db.transact([
      ...skills.map((skill, index) =>
        db.tx.factorySkills[skillIds[index]].update({
          installedAt,
          name: skill.name.trim(),
          repoUrl,
          skillPath: skill.path,
          status: "installed",
        }),
      ),
      ...skillIds.map((skillId) =>
        db.tx.factories[factoryId].link({ skills: skillId }),
      ),
    ]);

    return Response.json({
      installedAt,
      installed: skills.map((skill) => ({
        name: skill.name,
        path: skill.path,
      })),
    });
  } catch (error) {
    console.error(error);
    const lastError =
      error instanceof Error ? error.message : "Skills could not be installed";
    const failedAt = new Date().toISOString();
    const failedSkillIds = skills.map(() => id());

    if (canRecordFailure) {
      try {
        await db.transact([
          ...skills.map((skill, index) =>
            db.tx.factorySkills[failedSkillIds[index]].update({
              installedAt: failedAt,
              lastError,
              name: skill.name.trim(),
              repoUrl: repoUrl ?? "",
              skillPath: skill.path,
              status: "failed",
            }),
          ),
          ...failedSkillIds.map((skillId) =>
            db.tx.factories[factoryId].link({ skills: skillId }),
          ),
        ]);
      } catch (writeError) {
        console.error(writeError);
      }
    }

    return Response.json({ error: lastError }, { status: 500 });
  }
}
