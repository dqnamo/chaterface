"use client";

import { Facehash } from "facehash";
import { cn } from "@/helpers/classname-helper";
import {
  getUserAvatarColor,
  type UserAvatarColorValue,
} from "@/helpers/user-avatar-colors";

export default function UserAvatar({
  className,
  color,
  name,
  selected = true,
  size = 40,
}: {
  className?: string;
  color?: UserAvatarColorValue | null | string;
  name: string;
  selected?: boolean;
  size?: number;
}) {
  const avatarColor = getUserAvatarColor(color);

  return (
    <Facehash
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-lg border border-transparent font-semibold text-white uppercase transition-opacity",
        selected === false && "opacity-50 group-hover:opacity-75",
        className,
      )}
      colors={[`var(--${avatarColor}-9)`]}
      interactive={false}
      intensity3d="none"
      name={name}
      showInitial
      size={size}
      style={{ color: "white" }}
      variant="solid"
    />
  );
}
