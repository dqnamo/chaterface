import { getCurrentUserForApiRequest, unauthorizedResponse } from "@/lib/auth";
import { getAdminDb } from "@/lib/db.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    factoryId: string;
    secretId: string;
  }>;
};

type SecretRecord = {
  factory?: {
    id?: string;
    owner?: { id?: string };
  };
  id: string;
};

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  const { factoryId, secretId } = await context.params;
  const db = getAdminDb();
  const result = await db.query({
    secrets: {
      $: { where: { id: secretId } },
      factory: {
        owner: {},
      },
    },
  });
  const secret = result.secrets[0] as SecretRecord | undefined;

  if (
    !secret ||
    secret.factory?.id !== factoryId ||
    secret.factory?.owner?.id !== user.id
  ) {
    return Response.json({ error: "Secret not found" }, { status: 404 });
  }

  await db.transact(db.tx.secrets[secretId].delete());

  return Response.json({ ok: true });
}
