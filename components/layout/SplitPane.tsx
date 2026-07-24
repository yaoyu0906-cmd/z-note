"use client";

import { useTabsStore } from "@/lib/store/useTabsStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { NoteEditorRouter } from "@/components/editor/NoteEditorRouter";

/**
 * NOTE ON ARCHITECTURE: the primary pane's content comes from Next.js
 * routing (app/(workspace)/note/[id]/page.tsx etc.), which is what keeps
 * the URL, browser back/forward, and deep links working. A second pane
 * can't also own the URL, so it reads its active note straight from
 * useTabsStore/useWorkspaceStore instead. This means the secondary pane
 * doesn't currently get its own shareable URL or history entry — flagged
 * as a known gap, not a bug. If deep-linkable split views become a
 * requirement, the likely fix is a `?secondary=<id>` search param synced
 * from this component rather than a second dynamic route.
 */
export function SplitPane() {
  const secondaryId = useTabsStore((s) => s.activeTabByPane.secondary);
  const notes = useWorkspaceStore((s) => s.notes);

  const note = notes.find((n) => n.id === secondaryId);

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-graphite dark:text-graphiteDark">
        Select a tab for the second pane.
      </div>
    );
  }

  return <NoteEditorRouter note={note} />;
}
