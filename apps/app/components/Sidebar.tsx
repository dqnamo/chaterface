"use client";

import {
  GitForkIcon,
  GithubLogoIcon,
  TriangleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/helpers/classname-helper";

const GITHUB_REPO_URL = "https://github.com/dqnamo/factory";
const VERCEL_DEPLOY_URL = `https://vercel.com/new/clone?repository-url=${encodeURIComponent(
  GITHUB_REPO_URL,
)}`;

function SidebarNavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          "uppercase font-semibold text-xs font-mono text-grayscale-12 px-2 py-1",
          pathname === "/" ? "text-grayscale-11" : "text-grayscale-9",
        )}
      >
        Home
      </Link>
      <div className="mt-4 flex flex-col gap-px border-t border-grayscale-3 pt-4 dark:border-grayscale-2">
        <a
          href={GITHUB_REPO_URL}
          onClick={onNavigate}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1 font-mono text-xs font-semibold text-grayscale-9 uppercase transition-colors duration-200 hover:text-grayscale-11"
        >
          <GithubLogoIcon size={14} weight="bold" />
          GitHub
        </a>
        <a
          href={VERCEL_DEPLOY_URL}
          onClick={onNavigate}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1 font-mono text-xs font-semibold text-grayscale-9 uppercase transition-colors duration-200 hover:text-grayscale-11"
        >
          <TriangleIcon
            size={14}
            weight="fill"
            className="text-black dark:text-white"
          />
          Deploy
        </a>
        <a
          href={GITHUB_REPO_URL}
          onClick={onNavigate}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1 font-mono text-xs font-semibold text-grayscale-9 uppercase transition-colors duration-200 hover:text-grayscale-11"
        >
          <GitForkIcon size={14} weight="bold" />
          Clone Repo
        </a>
      </div>

      <div className="flex flex-col mt-8 px-2">
        <div className="flex flex-row items-center gap-2">
          <span className="text-xs font-mono text-grayscale-9 font-medium uppercase">
            Dark Mode
          </span>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 z-100 hidden h-full w-64 shrink-0 flex-col gap-px px-4 py-4 xl:flex">
      <SidebarNavContent />
    </aside>
  );
}

export { SidebarNavContent };
