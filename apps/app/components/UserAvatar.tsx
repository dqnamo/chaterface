"use client";

import Image from "next/image";
import { cn } from "@/helpers/classname-helper";
import type { UserAvatarColorValue } from "@/helpers/user-avatar-colors";
import { getDiceBearGlassAvatarUrl } from "@/helpers/user-identity";

export default function UserAvatar({
  className,
  name,
  selected = true,
  seed,
  size = 40,
}: {
  className?: string;
  color?: UserAvatarColorValue | null | string;
  name: string;
  seed?: string;
  selected?: boolean;
  size?: number;
}) {
  const src = getDiceBearGlassAvatarUrl({ name, avatarSeed: seed }, size);

  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-lg border border-grayscale-3 bg-grayscale-2 object-cover transition-opacity dark:border-grayscale-4",
        selected === false && "opacity-50 group-hover:opacity-75",
        className,
      )}
      draggable={false}
      height={size}
      unoptimized
      src={src}
      width={size}
    />
  );
}
