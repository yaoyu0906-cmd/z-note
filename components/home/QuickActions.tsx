"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useUIStore } from "@/lib/store/useUIStore";

export function QuickActions() {
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addDefaultWorkspace = useWorkspaceStore((s) => s.addDefaultWorkspace);
  const hasWorkspace = useWorkspaceStore((s) => s.workspaces.length > 0);
  const openNewFileDialog = useUIStore((s) => s.openNewFileDialog);

  // Detect File System Access support after mount to avoid SSR/hydration mismatch.
  // SSR renders with isSupported = false; after mount, we detect the real value.
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported(typeof window !== "undefined" && "showDirectoryPicker" in window);
  }, []);

  return (
    <div className="space-y-3">
      {!hasWorkspace && isSupported && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-line dark:border-lineDark bg-accentSoft dark:bg-accentSoftDark px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink dark:text-inkDark">
            <FolderPlus size={16} className="text-accent dark:text-accentDark shrink-0" />
            First time here? Set up a Z-Note folder on your Desktop.
          </div>
          <Button variant="primary" size="sm" onClick={() => addDefaultWorkspace()}>
            Set up my folder
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => openNewFileDialog()}>
          Create New
        </Button>
        <Button
          variant="secondary"
          onClick={() => addWorkspace()}
          disabled={!isSupported}
          title={isSupported ? undefined : "File System Access requires Chrome or Edge"}
        >
          Open Folder
        </Button>
      </div>
    </div>
  );
}
