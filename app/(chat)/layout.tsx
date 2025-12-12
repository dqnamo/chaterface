"use client";
import Sidebar from "@/app/components/Sidebar";
import { DataProvider } from "@/app/providers/DataProvider";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <div className="relative h-dvh">
        <Sidebar />

        <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </DataProvider>
  );
}
