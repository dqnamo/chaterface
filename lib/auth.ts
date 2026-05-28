import { canAccessFactory, type FactoryAccessRecord } from "@/lib/auth-access";
import { getAdminDb } from "@/lib/db.server";

export type { FactoryAccessRecord };
export { canAccessFactory };

export type CurrentUser = {
  email?: string;
  id: string;
};

type AuthUser = {
  email?: null | string;
  id?: null | string;
};

export async function getCurrentUserForApiRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  const db = getAdminDb();
  const user = (await db.auth.verifyToken(token)) as AuthUser | null;

  if (!user?.id) {
    return null;
  }

  return {
    email: user.email ?? undefined,
    id: user.id,
  } satisfies CurrentUser;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function getOwnedFactory<
  TFactory extends { owner?: { id?: string } },
>(factoryId: string, user: CurrentUser, include: Record<string, unknown> = {}) {
  const db = getAdminDb();
  const result = await db.query({
    factories: {
      $: { where: { id: factoryId } },
      owner: {},
      ...include,
    },
  });
  const factory = result.factories[0] as TFactory | undefined;

  if (!factory || factory.owner?.id !== user.id) {
    return undefined;
  }

  return factory;
}

export async function getAccessibleFactory<
  TFactory extends FactoryAccessRecord,
>(factoryId: string, user: CurrentUser, include: Record<string, unknown> = {}) {
  const db = getAdminDb();
  const result = await db.query({
    factories: {
      $: { where: { id: factoryId } },
      ...include,
      owner: {},
      supervisors: {
        user: {},
      },
    },
  });
  const factory = result.factories[0] as TFactory | undefined;

  if (!canAccessFactory(factory, user)) {
    return undefined;
  }

  return factory;
}
