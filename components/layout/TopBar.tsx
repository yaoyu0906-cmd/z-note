"use client";

import { useUIStore } from "@/lib/store/useUIStore";
import { SidebarToggle } from "@/components/layout/Sidebar";
import { WorkspaceSwitcher } from "@/components/layout/WorkspaceSwitcher";
import { Kbd, IconButton } from "@/components/ui";

export function TopBar() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="flex items-center justify-between border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-2 gap-3">
      <div className="flex items-center gap-2">
        <SidebarToggle />
        <span className="text-sm font-semibold tracking-tight text-ink dark:text-inkDark">
          Z-Note
        </span>
      </div>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 flex-1 max-w-md mx-auto text-left text-sm text-graphite dark:text-graphiteDark border border-line dark:border-lineDark rounded px-3 py-1.5 hover:border-accent dark:hover:border-accentDark"
      >
        <span className="flex-1">Search notes, run commands…</span>
        <Kbd>Ctrl+P</Kbd>
      </button>

      <div className="flex items-center gap-2">
        <WorkspaceSwitcher />
        <IconButton label="Profile">
          <span className="h-5 w-5 rounded-full bg-accentSoft dark:bg-accentSoftDark flex items-center justify-center text-[10px] text-accent dark:text-accentDark">
            U
          </span>
        </IconButton>
      </div>
    </div>
  );
}
