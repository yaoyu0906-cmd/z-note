"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus, FolderPlus, Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { moveCloudEntry, removeCloudEntry } from "@/lib/sync";

interface CloudFolderContextMenuProps {
  workspaceName: string;
  path: string;
  name: string;
  /** Root workspace-name group folders can't be renamed/deleted as a unit
   *  — they're just the namespace, not a real folder row. */
  isRoot: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onChanged: () => void;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
}

/** Right-click actions for a cloud folder. Everything here operates on
 *  cloud rows alone via lib/sync.ts — never on local files/folders. */
export function CloudFolderContextMenu({
  workspaceName,
  path,
  name,
  isRoot,
  position,
  onClose,
  onChanged,
  onNewFile,
  onNewFolder,
}: CloudFolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function commitRename() {
    const trimmed = renameValue.trim();
    setRenaming(false);
    if (!trimmed || trimmed === name) return;
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    setBusy(true);
    try {
      const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      const newPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
      await moveCloudEntry(userId, workspaceName, path, newPath, true);
      onChanged();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    setBusy(true);
    try {
      await removeCloudEntry(userId, workspaceName, path, true);
      onChanged();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  const item = "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark disabled:opacity-40";

  return (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 w-52 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1.5"
    >
      <button onClick={() => { onNewFile(path); onClose(); }} className={item}>
        <FilePlus size={14} className="shrink-0" /> New File
      </button>
      <button onClick={() => { onNewFolder(path); onClose(); }} className={item}>
        <FolderPlus size={14} className="shrink-0" /> New Folder
      </button>

      {!isRoot && (
        <>
          <div className="my-1 border-t border-line dark:border-lineDark" />
          {renaming ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitRename()}
                className="flex-1 min-w-0 text-sm bg-transparent border-b border-line dark:border-lineDark outline-none text-ink dark:text-inkDark"
              />
              <button onClick={commitRename} className="text-accent dark:text-accentDark shrink-0">
                <Check size={14} />
              </button>
              <button onClick={() => setRenaming(false)} className="text-graphite dark:text-graphiteDark shrink-0">
                <XIcon size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setRenaming(true)} disabled={busy} className={item}>
              <Pencil size={14} className="shrink-0" /> Rename
            </button>
          )}

          <button
            onClick={handleDelete}
            onBlur={() => setConfirmingDelete(false)}
            disabled={busy}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left disabled:opacity-40 ${
              confirmingDelete
                ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
                : "text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
            }`}
          >
            <Trash2 size={14} className="shrink-0" />
            {confirmingDelete ? "Click again to delete folder" : "Delete folder from cloud"}
          </button>
        </>
      )}
    </div>
  );
}
