"use client";

import {
  FadersIcon,
  FilesIcon,
  LockKeyIcon,
  PlugsConnectedIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/helpers/classname-helper";

const settingsSections = [
  {
    icon: <FadersIcon aria-hidden="true" size={15} weight="bold" />,
    label: "Settings",
    path: "settings",
  },
  {
    icon: <LockKeyIcon aria-hidden="true" size={15} weight="bold" />,
    label: "Secrets",
    path: "secrets",
  },
  {
    icon: <FilesIcon aria-hidden="true" size={15} weight="bold" />,
    label: "Skills",
    path: "skills",
  },
  {
    icon: <PlugsConnectedIcon aria-hidden="true" size={15} weight="bold" />,
    label: "MCP",
    path: "mcp",
  },
];

export default function FactorySettingsShell({
  children,
  factoryId,
}: {
  children: ReactNode;
  factoryId: string;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-dvh px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-start">
        <aside className="md:sticky md:top-8 md:w-44 md:shrink-0">
          <nav
            aria-label="Factory settings"
            className="flex gap-1 overflow-x-auto border-grayscale-3 border-b pb-2 md:flex-col md:overflow-visible md:border-b-0 md:pb-0"
          >
            {settingsSections.map((section) => {
              const href = `/factory/${factoryId}/${section.path}`;
              const isActive = pathname === href;

              return (
                <Link
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-md px-2 text-grayscale-11 text-sm transition-colors hover:bg-grayscale-2 hover:text-grayscale-12",
                    isActive &&
                      "bg-grayscale-3 text-grayscale-12 hover:bg-grayscale-3",
                  )}
                  href={href}
                  key={section.path}
                >
                  {section.icon}
                  <span className="font-medium">{section.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
