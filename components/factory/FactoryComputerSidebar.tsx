"use client";

import {
  FilesIcon,
  GithubLogoIcon,
  PlugsConnectedIcon,
} from "@phosphor-icons/react";
import { TextboxIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/helpers/classname-helper";

const computerSections = [
  {
    icon: <PlugsConnectedIcon aria-hidden="true" size={15} weight="bold" />,
    label: "Integrations",
    path: "mcp",
  },
  {
    icon: <FilesIcon aria-hidden="true" size={15} weight="bold" />,
    label: "Skills",
    path: "skills",
  },
  {
    icon: <TextboxIcon aria-hidden="true" size={15} weight="bold" />,
    label: "Secrets",
    path: "secrets",
  },
  {
    icon: <GithubLogoIcon aria-hidden="true" size={15} weight="bold" />,
    label: "GitHub",
    path: "github",
  },
];

export default function FactoryComputerSidebar({
  className,
  factoryId,
  onNavigate,
}: {
  className?: string;
  factoryId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-64 flex-col p-2 max-md:h-auto max-md:w-full max-md:flex-none",
        className,
      )}
    >
      <nav
        aria-label="Factory computer"
        className="flex flex-col gap-1 max-md:scrollbar-none max-md:min-w-0 max-md:flex-row max-md:items-center max-md:gap-2 max-md:overflow-x-auto max-md:overscroll-x-contain"
      >
        <h2 className="mt-2 px-2 pb-1 font-mono font-semibold text-grayscale-10 text-xs uppercase max-md:sr-only">
          Computer Setup
        </h2>
        {computerSections.map((section) => {
          const href = `/factory/${factoryId}/${section.path}`;
          const isActive = pathname === href;

          return (
            <Link
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1 text-grayscale-11 text-sm transition-colors hover:bg-grayscale-2 hover:text-grayscale-12 max-md:shrink-0",
                isActive &&
                  "bg-grayscale-3 text-grayscale-12 hover:bg-grayscale-3",
              )}
              href={href}
              key={section.path}
              onClick={onNavigate}
            >
              {section.icon}
              <span className="font-medium">{section.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
