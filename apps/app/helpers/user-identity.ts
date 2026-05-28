export type UserIdentity = {
  avatarSeed?: null | string;
  email?: null | string;
  id?: null | string;
  name?: null | string;
};

export function getUserDisplayName(identity: UserIdentity) {
  const explicitName = identity.name?.trim();

  if (explicitName) {
    return explicitName;
  }

  const email = identity.email?.trim();

  if (email) {
    return email.split("@")[0] || email;
  }

  return "Supervisor";
}

export function getUserAvatarSeed(identity: UserIdentity) {
  return (
    identity.avatarSeed?.trim() ||
    identity.id?.trim() ||
    identity.email?.trim() ||
    identity.name?.trim() ||
    "Supervisor"
  );
}

export function getDiceBearGlassAvatarUrl(identity: UserIdentity, size = 64) {
  const params = new URLSearchParams({
    seed: getUserAvatarSeed(identity),
    size: String(size),
  });

  return `https://api.dicebear.com/9.x/glass/svg?${params.toString()}`;
}

export function createSupervisorMessageSender({
  userEmail,
  userId,
}: {
  userEmail?: null | string;
  userId?: null | string;
}) {
  return {
    email: userEmail ?? undefined,
    id: userId ?? undefined,
    name: getUserDisplayName({ email: userEmail }),
  };
}
