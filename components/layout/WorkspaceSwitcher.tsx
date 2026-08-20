"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FolderOpen, FolderPlus, Folder } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

export function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addDefaultWorkspace = useWorkspaceStore((s) => s.addDefaultWorkspace);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Detect File System Access support after mount to avoid SSR/hydration mismatch.
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "showDirectoryPicker" in window);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Several workspaces can be open at once now — this button's job is
  // "add another one", not "switch to a single active folder". Each
  // workspace gets its own Explorer section (and its own "Change folder"/
  // close controls) in the Sidebar.
  const label =
    workspaces.length === 0
      ? "No workspace"
      : workspaces.length === 1
        ? workspaces[0].name
        : `${workspaces.length} workspaces`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm px-2 py-1 rounded hover:bg-accentSoft dark:hover:bg-accentSoftDark text-ink dark:text-inkDark"
      >
        <Folder size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDown size={13} className="text-graphite dark:text-graphiteDark shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1 z-50">
          <button
            onClick={async () => {
              setOpen(false);
              await addWorkspace();
            }}
            disabled={!isSupported}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark disabled:opacity-40"
          >
            <FolderOpen size={14} /> Add a folder as workspace…
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              await addDefaultWorkspace();
            }}
            disabled={!isSupported}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark disabled:opacity-40"
          >
            <FolderPlus size={14} /> Set up Desktop/Z-Note
          </button>
          {!isSupported && (
            <p className="px-3 py-1.5 text-[11px] text-red-600 dark:text-red-400">
              Requires Chrome or Edge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
