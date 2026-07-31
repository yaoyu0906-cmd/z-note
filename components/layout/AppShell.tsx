"use client";

import { useEffect, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TabBar } from "@/components/layout/TabBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { QuickNotePopup } from "@/components/layout/QuickNotePopup";
import { NewFileDialog } from "@/components/workspace/NewFileDialog";
import { SplitPane } from "@/components/layout/SplitPane";
import { useKeyboardShortcuts } from "@/lib/keyboard/useKeyboardShortcuts";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

export function AppShell({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  const isSplit = useTabsStore((s) => s.isSplit);
  const restoreWorkspaces = useWorkspaceStore((s) => s.restoreWorkspaces);

  useEffect(() => {
    restoreWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen flex flex-col bg-paper dark:bg-paperDark">
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <TabBar />
          <main className="flex-1 min-h-0 overflow-hidden flex">
            <div
              className={
                isSplit
                  ? "flex-1 min-h-0 min-w-0 overflow-auto zn-scroll border-r border-line dark:border-lineDark"
                  : "flex-1 min-h-0 min-w-0 overflow-auto zn-scroll"
              }
            >
              {children}
            </div>
            {isSplit && (
              <div className="flex-1 min-h-0 min-w-0 overflow-auto zn-scroll">
                <SplitPane />
              </div>
            )}
          </main>
        </div>
      </div>
      <CommandPalette />
      <QuickNotePopup />
      <NewFileDialog />
    </div>
  );
}
