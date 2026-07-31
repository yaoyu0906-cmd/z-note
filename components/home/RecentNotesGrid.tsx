"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";

export function RecentNotesGrid() {
  const router = useRouter();
  const notes = useWorkspaceStore((s) => s.notes);
  const recentIds = useWorkspaceStore((s) => s.recentNoteIds);
  const touchRecent = useWorkspaceStore((s) => s.touchRecent);
  const openTab = useTabsStore((s) => s.openTab);

  const recent = recentIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  if (recent.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark mb-2">
        Recent Notes
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {recent.map((note) => (
          <button
            key={note.id}
            onClick={() => {
              openTab(note);
              touchRecent(note.id);
              router.push(`${note.type === "canvas" ? "/canvas" : "/note"}/${encodeURIComponent(note.id)}`);
            }}
            className="text-left rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark p-3 hover:border-accent transition-colors"
          >
            <p className="text-sm font-medium truncate text-ink dark:text-inkDark">{note.title}</p>
            <p className="text-xs text-graphite dark:text-graphiteDark mt-1">
              {new Date(note.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
