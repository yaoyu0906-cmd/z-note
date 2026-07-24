"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { IconButton } from "@/components/ui";
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

function NoteRow({ note }: { note: Note }) {
  const router = useRouter();
  const openTab = useTabsStore((s) => s.openTab);
  const touchRecent = useWorkspaceStore((s) => s.touchRecent);

  function open() {
    openTab(note);
    touchRecent(note.id);
    const base = note.type === "canvas" ? "/canvas" : "/note";
    router.push(`${base}/${note.id}`);
  }

  return (
    <button
      onClick={open}
      className="w-full text-left px-3 py-1.5 text-sm truncate rounded hover:bg-accentSoft dark:hover:bg-accentSoftDark text-ink dark:text-inkDark"
    >
      {note.title}
    </button>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const notes = useWorkspaceStore((s) => s.notes);
  const recentIds = useWorkspaceStore((s) => s.recentNoteIds);

  const favorites = notes.filter((n) => n.isFavorite);
  const recent = recentIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is Note => Boolean(n));

  const allTags = Array.from(new Map(notes.flatMap((n) => n.tags).map((t) => [t.id, t])).values());

  if (collapsed) return null;

  return (
    <aside className="w-60 shrink-0 border-r border-line dark:border-lineDark bg-white dark:bg-surfaceDark overflow-y-auto py-4">
      <SidebarSection title="Favorites">
        {favorites.length === 0 && (
          <p className="px-3 text-xs text-graphite dark:text-graphiteDark">No favorites yet.</p>
        )}
        {favorites.map((n) => (
          <NoteRow key={n.id} note={n} />
        ))}
      </SidebarSection>

      <SidebarSection title="Recent">
        {recent.map((n) => (
          <NoteRow key={n.id} note={n} />
        ))}
      </SidebarSection>

      <SidebarSection title="Tags">
        {allTags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2 px-3 py-1 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
            <span className="text-ink dark:text-inkDark">{tag.label}</span>
          </div>
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
    </aside>
  );
}

export function SidebarToggle() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  return (
    <IconButton label="Toggle sidebar" onClick={toggleSidebar}>
      ☰
    </IconButton>
  );
}
