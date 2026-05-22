import { getAdminDb } from "@/lib/db.server";

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

export function canAccessFactory(
  factory:
    | {
        owner?: { id?: string };
        supervisors?: { status?: string; user?: { id?: string } }[];
      }
    | undefined,
  user: CurrentUser,
) {
  if (!factory) {
    return false;
  }

  if (factory.owner?.id === user.id) {
    return true;
  }

  return Boolean(
    factory.supervisors?.some(
      (supervisor) =>
        supervisor.status === "active" && supervisor.user?.id === user.id,
    ),
  );
}
