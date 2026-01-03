"use client";

import { useEffect } from "react";
import { ThemeSynchronizer } from "../providers/ThemeProvider";
import DqnamoSignature from "./DqnamoSignature";
import Sidebar from "./Sidebar";
import { useModal } from "../providers/ModalProvider";
import WelcomeModal from "./WelcomeModal";
import InfoBar from "./InfoBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { showModal } = useModal();

  // Show welcome modal if first time
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcomeModal");
    if (!hasSeenWelcome) {
      showModal(<WelcomeModal />, "content");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-gray-scale-2 dark:bg-gray-scale-1 h-dvh overflow-y-auto overflow-x-hidden flex flex-col">
      <ThemeSynchronizer />
      <Sidebar />
      {children}
      <InfoBar />
    </div>
  );
}
