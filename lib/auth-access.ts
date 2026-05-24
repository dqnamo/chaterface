export type FactoryAccessRecord = {
  owner?: { id?: string };
  supervisors?: {
    status?: string;
    user?: { id?: string };
  }[];
};

export type FactoryAccessUser = {
  id: string;
};

export function canAccessFactory(
  factory: FactoryAccessRecord | undefined,
  user: FactoryAccessUser,
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
