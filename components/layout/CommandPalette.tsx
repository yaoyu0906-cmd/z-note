"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, Input } from "@/components/ui";
import { useUIStore } from "@/lib/store/useUIStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";

const COMMANDS = [
  { id: "cmd-new-note", label: "New Note", run: (router: ReturnType<typeof useRouter>) => router.push("/note/new") },
  { id: "cmd-settings", label: "Open Settings", run: (router: ReturnType<typeof useRouter>) => router.push("/settings") },
  { id: "cmd-home", label: "Go to Home", run: (router: ReturnType<typeof useRouter>) => router.push("/") },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const notes = useWorkspaceStore((s) => s.notes);
  const openTab = useTabsStore((s) => s.openTab);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredNotes = useMemo(
    () => notes.filter((n) => n.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6),
    [notes, query]
  );
  const filteredCommands = useMemo(
    () => COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  function close() {
    setOpen(false);
    setQuery("");
  }

  function openNote(noteId: string, type: string) {
    const note = notes.find((n) => n.id === noteId);
    if (note) openTab(note);
    router.push(`${type === "canvas" ? "/canvas" : "/note"}/${noteId}`);
    close();
  }

  return (
    <Dialog open={open} onClose={close} placement="top">
      <div className="p-2">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes or type a command…"
        />
      </div>
      <div className="max-h-80 overflow-y-auto py-1">
        {filteredCommands.length > 0 && (
          <div className="px-2 py-1">
            <p className="px-1 text-[11px] uppercase tracking-wide text-graphite">Commands</p>
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.run(router);
                  close();
                }}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accentSoft"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        )}
        {filteredNotes.length > 0 && (
          <div className="px-2 py-1">
            <p className="px-1 text-[11px] uppercase tracking-wide text-graphite">Notes</p>
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => openNote(note.id, note.type)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accentSoft"
              >
                {note.title}
              </button>
            ))}
          </div>
        )}
        {filteredCommands.length === 0 && filteredNotes.length === 0 && (
          <p className="px-3 py-4 text-sm text-graphite">No matches.</p>
        )}
      </div>
    </Dialog>
  );
}
