import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/helpers/classname-helper";

export default function FactorySidebarNavLink({
  currentPathname,
  href,
  icon,
  label,
  onNavigate,
}: {
  currentPathname: string;
  href: string;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  const isActive = currentPathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex w-full flex-row items-center gap-2 rounded-md px-2 py-1 text-grayscale-11 hover:bg-grayscale-2",
        isActive && "bg-grayscale-3 text-grayscale-12 hover:bg-grayscale-3",
      )}
    >
      {icon}
      <p className="text-sm font-medium">{label}</p>
    </Link>
  );
}
