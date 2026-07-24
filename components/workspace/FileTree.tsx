"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { Button } from "@/components/ui";
import type { Note } from "@/lib/types/note";

const TYPE_ICON: Record<Note["type"], string> = {
  md: "M↓",
  txt: "T",
  note: "N",
  canvas: "C",
};

export function FileTree() {
  const notes = useWorkspaceStore((s) => s.notes);
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const isSupported = useWorkspaceStore((s) => s.isSupported);
  const dirHandle = useWorkspaceStore((s) => s.dirHandle);
  const openTab = useTabsStore((s) => s.openTab);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark">
          {dirHandle ? dirHandle.name : "No folder open"}
        </p>
        <Button size="sm" onClick={() => openFolder()} disabled={!isSupported}>
          {dirHandle ? "Change folder" : "Open folder"}
        </Button>
      </div>

      {!isSupported && (
        <p className="text-xs text-red-600">
          File System Access requires Chrome or Edge — local folder browsing isn't available in this browser.
        </p>
      )}

      <ul className="divide-y divide-line dark:divide-lineDark border border-line dark:border-lineDark rounded-md overflow-hidden">
        {notes.map((note) => (
          <li key={note.id}>
            <button
              onClick={() => {
                openTab(note);
                router.push(`${note.type === "canvas" ? "/canvas" : "/note"}/${note.id}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accentSoft dark:hover:bg-accentSoftDark"
            >
              <span className="text-[10px] font-mono text-graphite w-6 shrink-0">
                {TYPE_ICON[note.type]}
              </span>
              <span className="truncate text-ink dark:text-inkDark">{note.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
