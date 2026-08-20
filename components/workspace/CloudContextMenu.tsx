"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Download, Trash2, Check, X as XIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { fetchCloudFile, moveCloudEntry, removeCloudEntry } from "@/lib/sync";
import { isFileSystemAccessSupported } from "@/lib/cloudNote";
import { pickSaveLocation, writeFile } from "@/lib/fs/fileSystemAccess";

interface CloudContextMenuProps {
  workspaceName: string;
  path: string;
  name: string;
  hasLocalCopy: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onChanged: () => void;
}

/** Right-click actions for a cloud-only file. Everything here operates on
 *  the cloud row alone via lib/sync.ts — never on a local file, even when
 *  one happens to exist for the same path (see hasLocalCopy), matching
 *  "actions performed on a cloud item affect only the cloud item". */
export function CloudContextMenu({ workspaceName, path, name, hasLocalCopy, position, onClose, onChanged }: CloudContextMenuProps) {
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
      await moveCloudEntry(userId, workspaceName, path, newPath, false);
      onChanged();
    } finally {
      setBusy(false);
      onClose();
    }
  }

  async function handleDownload() {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    setBusy(true);
    try {
      const file = await fetchCloudFile(userId, workspaceName, path);
      if (!file || file.content == null) return;
      const picked = await pickSaveLocation(name);
      if (!picked) return;
      await writeFile(picked, file.content);
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
      await removeCloudEntry(userId, workspaceName, path, false);
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

      {!hasLocalCopy && isFileSystemAccessSupported() && (
        <button onClick={handleDownload} disabled={busy} className={item}>
          <Download size={14} className="shrink-0" /> Download locally
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
        {confirmingDelete ? "Click again to delete" : "Delete from cloud"}
      </button>
    </div>
  );
}
