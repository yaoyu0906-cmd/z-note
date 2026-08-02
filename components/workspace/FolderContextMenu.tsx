"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FilePlus, FolderPlus, FolderInput, Trash2, Star } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { MoveDestinationList } from "@/components/workspace/MoveDestinationList";

interface FolderContextMenuProps {
  workspaceId: string;
  path: string;
  name: string;
  position: { x: number; y: number };
  onClose: () => void;
  onRequestCreateFolder: () => void;
}

export function FolderContextMenu({
  workspaceId,
  path,
  name,
  position,
  onClose,
  onRequestCreateFolder,
}: FolderContextMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const openNewFileDialog = useUIStore((s) => s.openNewFileDialog);
  const moveFolder = useWorkspaceStore((s) => s.moveFolder);
  const deleteFolder = useWorkspaceStore((s) => s.deleteFolder);
  const toggleFolderFavorite = useWorkspaceStore((s) => s.toggleFolderFavorite);
  const isFavorite = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === workspaceId)?.favoriteFolders.includes(path) ?? false
  );

  const [showMoveList, setShowMoveList] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  async function handleMove(targetWorkspaceId: string, targetFolderPath: string) {
    // If the note currently on screen lives under this folder, follow it
    // to its new id/URL after the move (renameTabId already updated the
    // active tab in place by the time this resolves).
    const activeIdBefore = useTabsStore.getState().activeTabByPane.primary;
    const wasActiveRoute = activeIdBefore && pathname === `/note/${encodeURIComponent(activeIdBefore)}`;
    await moveFolder({ workspaceId, path }, targetWorkspaceId, targetFolderPath);
    if (wasActiveRoute) {
      const activeIdAfter = useTabsStore.getState().activeTabByPane.primary;
      if (activeIdAfter && activeIdAfter !== activeIdBefore) {
        router.replace(`/note/${encodeURIComponent(activeIdAfter)}`);
      }
    }
    onClose();
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const activeIdBefore = useTabsStore.getState().activeTabByPane.primary;
    const wasActiveRoute = activeIdBefore && pathname === `/note/${encodeURIComponent(activeIdBefore)}`;
    await deleteFolder(workspaceId, path);
    if (wasActiveRoute) router.push("/");
    onClose();
  }

  return (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 w-56 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1.5"
    >
      <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-graphite dark:text-graphiteDark truncate">
        {name}
      </p>

      <button
        onClick={() => {
          toggleFolderFavorite(workspaceId, path);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
      >
        <Star size={14} className={`shrink-0 ${isFavorite ? "fill-current text-accent dark:text-accentDark" : ""}`} />
        {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </button>

      <button
        onClick={() => {
          openNewFileDialog({ workspaceId, folderPath: path });
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
      >
        <FilePlus size={14} className="shrink-0" />
        New file
      </button>
      <button
        onClick={() => {
          onRequestCreateFolder();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
      >
        <FolderPlus size={14} className="shrink-0" />
        New folder
      </button>

      <div className="border-t border-line dark:border-lineDark pt-1 mt-1">
        <button
          onClick={() => setShowMoveList((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
        >
          <FolderInput size={14} className="shrink-0" />
          Move to…
        </button>
        {showMoveList && (
          <MoveDestinationList excludeWorkspaceId={workspaceId} excludePath={path} onSelect={handleMove} />
        )}

        <button
          onClick={handleDelete}
          onBlur={() => setConfirmingDelete(false)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${
            confirmingDelete
              ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
              : "text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
          }`}
        >
          <Trash2 size={14} className="shrink-0" />
          {confirmingDelete ? "Click again to delete folder" : "Delete folder"}
        </button>
      </div>
    </div>
  );
}
