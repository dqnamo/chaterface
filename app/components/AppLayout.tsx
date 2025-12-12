"use client";

import { useEffect } from "react";
import { DataProvider } from "../providers/DataProvider";
import { useThemeStore } from "../providers/ThemeProvider";
import DqnamoSignature from "./DqnamoSignature";
import Sidebar from "./Sidebar";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  // Sync theme class to html element for proper dark mode
  useEffect(() => {
    const body = document.body;
    if (theme === "dark") {
      body.classList.add("dark");
    } else {
      body.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="bg-gray-2 dark:bg-neutral-950 h-dvh overflow-y-auto flex flex-col">
      <DataProvider>
        <Sidebar />
        {children}
        <DqnamoSignature className="fixed bottom-4 right-4 z-10 lg:block hidden" />
      </DataProvider>
    </div>
  );
}
