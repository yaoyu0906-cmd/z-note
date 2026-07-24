"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TabBar } from "@/components/layout/TabBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { QuickNotePopup } from "@/components/layout/QuickNotePopup";
import { SplitPane } from "@/components/layout/SplitPane";
import { useKeyboardShortcuts } from "@/lib/keyboard/useKeyboardShortcuts";
import { useTabsStore } from "@/lib/store/useTabsStore";

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  const isSplit = useTabsStore((s) => s.isSplit);

  return (
    <div className="h-screen flex flex-col bg-paper dark:bg-paperDark">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TabBar />
          <main className="flex-1 overflow-hidden flex">
            <div className={isSplit ? "flex-1 overflow-auto border-r border-line dark:border-lineDark" : "flex-1 overflow-auto"}>
              {children}
            </div>
            {isSplit && (
              <div className="flex-1 overflow-auto">
                <SplitPane />
              </div>
            )}
          </main>
        </div>
      </div>
      <CommandPalette />
      <QuickNotePopup />
    </div>
  );
}
