import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  getFactoryCapabilityBox,
  listSkillCandidates,
} from "@/lib/codex/factory-capabilities";

export const runtime = "nodejs";

type ListSkillsRequest = {
  repoUrl?: string;
};

type RouteContext = {
  params: Promise<{
    factoryId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId } = await context.params;
  let body: ListSkillsRequest;

  try {
    body = (await request.json()) as ListSkillsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const repoUrl = body.repoUrl?.trim();

  if (!repoUrl) {
    return Response.json({ error: "repoUrl is required" }, { status: 400 });
  }

  try {
    const factory = await getOwnedFactory<{
      capabilityBoxId?: string;
      defaultSanpshotId?: string;
      id: string;
      owner?: { id?: string };
    }>(factoryId, user);

    if (!factory) {
      return Response.json({ error: "Factory not found" }, { status: 404 });
    }

    const box = await getFactoryCapabilityBox({
      factory,
      factoryId,
    });
    const skills = await listSkillCandidates(box, repoUrl);

    return Response.json({ skills });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Skill repo could not be listed",
      },
      { status: 500 },
    );
  }
}
