"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, Plus, Pencil, FolderInput, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { ColorPicker } from "@/components/editor/ColorPicker";
import { MoveDestinationList } from "@/components/workspace/MoveDestinationList";
import { CATPPUCCIN_MOCHA_COLORS } from "@/lib/editor/catppuccinMocha";
import type { Note } from "@/lib/types/note";

interface FileContextMenuProps {
  note: Note;
  position: { x: number; y: number };
  onClose: () => void;
}

export function FileContextMenu({ note, position, onClose }: FileContextMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const allTags = useWorkspaceStore((s) => s.tags);
  const tags = allTags.filter((t) => t.workspaceId === note.workspaceId);
  const assignTag = useWorkspaceStore((s) => s.assignTag);
  const unassignTag = useWorkspaceStore((s) => s.unassignTag);
  const createTag = useWorkspaceStore((s) => s.createTag);
  const renameTag = useWorkspaceStore((s) => s.renameTag);
  const recolorTag = useWorkspaceStore((s) => s.recolorTag);
  const moveNote = useWorkspaceStore((s) => s.moveNote);
  const deleteNote = useWorkspaceStore((s) => s.deleteNote);

  const [newTagLabel, setNewTagLabel] = useState("");
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [colorPickerTagId, setColorPickerTagId] = useState<string | null>(null);
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

  function toggleTag(tagId: string) {
    if (note.tagIds.includes(tagId)) unassignTag(note.id, tagId);
    else assignTag(note.id, tagId);
  }

  function submitNewTag() {
    if (!newTagLabel.trim()) return;
    const color = CATPPUCCIN_MOCHA_COLORS[tags.length % CATPPUCCIN_MOCHA_COLORS.length].hex;
    const id = createTag(newTagLabel.trim(), color, note.workspaceId);
    assignTag(note.id, id);
    setNewTagLabel("");
  }

  function commitRename(tagId: string) {
    if (renameValue.trim()) renameTag(tagId, renameValue.trim());
    setRenamingTagId(null);
  }

  async function handleMove(workspaceId: string, folderPath: string) {
    const wasActiveRoute = pathname === `/note/${encodeURIComponent(note.id)}`;
    await moveNote(note.id, workspaceId, folderPath);
    if (wasActiveRoute) {
      const activeId = useTabsStore.getState().activeTabByPane.primary;
      if (activeId && activeId !== note.id) router.replace(`/note/${encodeURIComponent(activeId)}`);
    }
    onClose();
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const wasActiveRoute = pathname === `/note/${encodeURIComponent(note.id)}`;
    await deleteNote(note.id);
    if (wasActiveRoute) router.push("/");
    onClose();
  }

  const activeColorTag = tags.find((t) => t.id === colorPickerTagId);

  return (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 w-56 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1.5"
    >
      <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-graphite dark:text-graphiteDark">
        Tags
      </p>
      <div className="max-h-48 overflow-y-auto">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="group flex items-center gap-1.5 px-3 py-1.5 hover:bg-accentSoft dark:hover:bg-accentSoftDark"
          >
            <button
              onClick={() => toggleTag(tag.id)}
              className="flex items-center gap-2 flex-1 text-left text-sm text-ink dark:text-inkDark min-w-0"
            >
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              {renamingTagId === tag.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(tag.id)}
                  onKeyDown={(e) => e.key === "Enter" && commitRename(tag.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent border-b border-line dark:border-lineDark outline-none text-sm text-ink dark:text-inkDark"
                />
              ) : (
                <span className="flex-1 truncate">{tag.label}</span>
              )}
              {note.tagIds.includes(tag.id) && (
                <Check size={13} className="shrink-0 text-accent dark:text-accentDark" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenamingTagId(tag.id);
                setRenameValue(tag.label);
              }}
              aria-label={`Rename ${tag.label}`}
              className="opacity-0 group-hover:opacity-100 text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark shrink-0"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setColorPickerTagId(tag.id);
              }}
              aria-label={`Recolor ${tag.label}`}
              className="opacity-0 group-hover:opacity-100 shrink-0"
            >
              <span
                className="block h-3 w-3 rounded-full border border-line dark:border-lineDark"
                style={{ backgroundColor: tag.color }}
              />
            </button>
          </div>
        ))}
        {tags.length === 0 && (
          <p className="px-3 py-2 text-xs text-graphite dark:text-graphiteDark">No tags yet.</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-3 pt-1.5 mt-1 border-t border-line dark:border-lineDark">
        <input
          value={newTagLabel}
          onChange={(e) => setNewTagLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNewTag()}
          placeholder="New tag…"
          className="flex-1 min-w-0 text-xs bg-transparent border border-line dark:border-lineDark rounded px-2 py-1 outline-none focus:border-accent dark:focus:border-accentDark text-ink dark:text-inkDark"
        />
        <button
          onClick={submitNewTag}
          aria-label="Create tag"
          className="text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark shrink-0"
        >
          <Plus size={14} />
        </button>
      </div>

      {note.hasLocalHandle && (
        <div className="border-t border-line dark:border-lineDark pt-1 mt-1">
          <button
            onClick={() => setShowMoveList((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
          >
            <FolderInput size={14} className="shrink-0" />
            Move to…
          </button>
          {showMoveList && <MoveDestinationList onSelect={handleMove} />}

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
            {confirmingDelete ? "Click again to delete" : "Delete"}
          </button>
        </div>
      )}

      {activeColorTag && (
        <ColorPicker
          open
          onClose={() => setColorPickerTagId(null)}
          currentColor={activeColorTag.color}
          onSelect={(hex) => recolorTag(activeColorTag.id, hex)}
          onClear={() => recolorTag(activeColorTag.id, "#89b4fa")}
        />
      )}
    </div>
  );
}
