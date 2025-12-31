"use client";

import { useEffect } from "react";
import { DataProvider } from "../providers/DataProvider";
import { useThemeStore } from "../providers/ThemeProvider";
import DqnamoSignature from "./DqnamoSignature";
import Sidebar from "./Sidebar";
import { useModal } from "../providers/ModalProvider";
import WelcomeModal from "./WelcomeModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const { showModal } = useModal();

  // Sync theme class to html element for proper dark mode
  useEffect(() => {
    const body = document.body;
    if (theme === "dark") {
      body.classList.add("dark");
    } else {
      body.classList.remove("dark");
    }
  }, [theme]);

  // Show welcome modal if first time
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcomeModal");
    if (!hasSeenWelcome) {
      showModal(<WelcomeModal />, "content");
    }
  }, [showModal]);

  return (
    <div className="bg-gray-2 dark:bg-gray-1 h-dvh overflow-y-auto flex flex-col">
      <DataProvider>
        <Sidebar />
        {children}
      </DataProvider>
    </div>
  );
}
