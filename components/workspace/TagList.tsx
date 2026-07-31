"use client";

import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

export function TagList() {
  const notes = useWorkspaceStore((s) => s.notes);
  const tags = useWorkspaceStore((s) => s.tags);
  const activeTagFilter = useWorkspaceStore((s) => s.activeTagFilter);
  const setActiveTagFilter = useWorkspaceStore((s) => s.setActiveTagFilter);

  if (tags.length === 0) {
    return (
      <p className="text-xs text-graphite dark:text-graphiteDark">
        No tags yet — right-click a note to create one.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const count = notes.filter((n) => n.tagIds.includes(tag.id)).length;
        const active = activeTagFilter === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => setActiveTagFilter(active ? null : tag.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              active
                ? "border-accent dark:border-accentDark bg-accentSoft dark:bg-accentSoftDark text-accent dark:text-accentDark"
                : "border-line dark:border-lineDark text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.label}
            <span className="text-graphite dark:text-graphiteDark">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
