"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Plus, FolderPlus } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { IconButton } from "@/components/ui";
import { FileContextMenu } from "@/components/workspace/FileContextMenu";
import { FileTree } from "@/components/workspace/FileTree";
import type { Note } from "@/lib/types/note";

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function NoteRow({
  note,
  onContextMenu,
}: {
  note: Note;
  onContextMenu: (e: React.MouseEvent, note: Note) => void;
}) {
  const router = useRouter();
  const openTab = useTabsStore((s) => s.openTab);
  const touchRecent = useWorkspaceStore((s) => s.touchRecent);

  function open() {
    openTab(note);
    touchRecent(note.id);
    const base = note.type === "canvas" ? "/canvas" : "/note";
    router.push(`${base}/${encodeURIComponent(note.id)}`);
  }

  return (
    <button
      onClick={open}
      onContextMenu={(e) => onContextMenu(e, note)}
      className="w-full text-left px-3 py-1.5 text-sm truncate rounded hover:bg-accentSoft dark:hover:bg-accentSoftDark text-ink dark:text-inkDark"
    >
      {note.title}
    </button>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const notes = useWorkspaceStore((s) => s.notes);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const recentIds = useWorkspaceStore((s) => s.recentNoteIds);
  const tags = useWorkspaceStore((s) => s.tags);
  const activeTagFilter = useWorkspaceStore((s) => s.activeTagFilter);
  const setActiveTagFilter = useWorkspaceStore((s) => s.setActiveTagFilter);
  const openNewFileDialog = useUIStore((s) => s.openNewFileDialog);

  const [contextMenu, setContextMenu] = useState<{ note: Note; x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent, note: Note) {
    e.preventDefault();
    setContextMenu({ note, x: e.clientX, y: e.clientY });
  }

  const favorites = notes.filter((n) => n.isFavorite);
  const recent = recentIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is Note => Boolean(n));
  const filteredByTag = activeTagFilter ? notes.filter((n) => n.tagIds.includes(activeTagFilter)) : [];

  if (collapsed) return null;

  return (
    <aside className="w-60 shrink-0 border-r border-line dark:border-lineDark bg-white dark:bg-surfaceDark overflow-y-auto zn-scroll py-4 flex flex-col">
      <div className="flex items-center justify-between px-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark">
          Workspace
        </span>
        <div className="flex items-center gap-1">
          <IconButton label="Add workspace folder" onClick={() => addWorkspace()}>
            <FolderPlus size={14} />
          </IconButton>
          <IconButton label="New file" onClick={() => openNewFileDialog()}>
            <Plus size={14} />
          </IconButton>
        </div>
      </div>

      <div className="px-3 mb-4 space-y-4">
        {workspaces.length === 0 && (
          <p className="text-xs text-graphite dark:text-graphiteDark">
            No workspace open yet — use the folder icon above to add one.
          </p>
        )}
        {workspaces.map((ws) => (
          <FileTree key={ws.id} workspaceId={ws.id} />
        ))}
      </div>

      {activeTagFilter && (
        <SidebarSection title={`Tagged: ${tags.find((t) => t.id === activeTagFilter)?.label ?? ""}`}>
          {filteredByTag.length === 0 && (
            <p className="px-3 text-xs text-graphite dark:text-graphiteDark">No notes with this tag.</p>
          )}
          {filteredByTag.map((n) => (
            <NoteRow key={n.id} note={n} onContextMenu={handleContextMenu} />
          ))}
        </SidebarSection>
      )}

      <SidebarSection title="Favorites">
        {favorites.length === 0 && (
          <p className="px-3 text-xs text-graphite dark:text-graphiteDark">No favorites yet.</p>
        )}
        {favorites.map((n) => (
          <NoteRow key={n.id} note={n} onContextMenu={handleContextMenu} />
        ))}
      </SidebarSection>

      <SidebarSection title="Recent">
        {recent.map((n) => (
          <NoteRow key={n.id} note={n} onContextMenu={handleContextMenu} />
        ))}
      </SidebarSection>

      <SidebarSection title="Tags">
        {tags.length === 0 && (
          <p className="px-3 text-xs text-graphite dark:text-graphiteDark">
            Right-click a note to create one.
          </p>
        )}
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
            className={`w-full flex items-center gap-2 px-3 py-1 text-sm rounded ${
              activeTagFilter === tag.id
                ? "bg-accentSoft dark:bg-accentSoftDark text-accent dark:text-accentDark"
                : "text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
            }`}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
            <span className="truncate">{tag.label}</span>
          </button>
        ))}
      </SidebarSection>

      <div className="px-3 mt-auto">
        <Link
          href="/settings"
          className="text-sm text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark"
        >
          Settings
        </Link>
      </div>

      {contextMenu && (
        <FileContextMenu
          note={contextMenu.note}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
}

export function SidebarToggle() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  return (
    <IconButton label="Toggle sidebar" onClick={toggleSidebar}>
      <Menu size={16} />
    </IconButton>
  );
}
