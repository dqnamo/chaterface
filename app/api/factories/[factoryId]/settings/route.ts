import { isFactoryColor } from "@/helpers/factory-colors";
import {
  getCurrentUserForApiRequest,
  getOwnedFactory,
  unauthorizedResponse,
} from "@/lib/auth";
import { getAdminDb } from "@/lib/db.server";

export const runtime = "nodejs";

type UpdateFactorySettingsRequest = {
  color?: unknown;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ factoryId: string }> },
) {
  const user = await getCurrentUserForApiRequest(request);

  if (!user) {
    return unauthorizedResponse();
  }

  let body: UpdateFactorySettingsRequest;

  try {
    body = (await request.json()) as UpdateFactorySettingsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isFactoryColor(body.color)) {
    return Response.json(
      { error: "Factory color is not supported" },
      { status: 400 },
    );
  }

  const { factoryId } = await context.params;
  const factory = await getOwnedFactory(factoryId, user);

  if (!factory) {
    return Response.json({ error: "Factory not found" }, { status: 404 });
  }

  const db = getAdminDb();

  await db.transact(
    db.tx.factories[factoryId].update({
      color: body.color,
    }),
  );

  return Response.json({ color: body.color });
}
