"use client";

import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

export function TagList() {
  const notes = useWorkspaceStore((s) => s.notes);
  const tags = Array.from(new Map(notes.flatMap((n) => n.tags).map((t) => [t.id, t])).values());

  if (tags.length === 0) {
    return <p className="text-xs text-graphite dark:text-graphiteDark">No tags yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const count = notes.filter((n) => n.tags.some((t) => t.id === tag.id)).length;
        return (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-line dark:border-lineDark px-2.5 py-1 text-xs text-ink dark:text-inkDark"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.label}
            <span className="text-graphite dark:text-graphiteDark">{count}</span>
          </span>
        );
      })}
    </div>
  );
}
