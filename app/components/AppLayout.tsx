"use client";

import { useThemeStore } from "../providers/ThemeProvider";
import DqnamoSignature from "./DqnamoSignature";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  return (
    <div
      className={`bg-gray-2 dark:bg-neutral-950 ${
        theme === "light" ? "" : "dark"
      }`}
    >
      {children}
      <DqnamoSignature className="fixed bottom-4 right-4 z-10 lg:block hidden" />
    </div>
  );
}
