"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, Input } from "@/components/ui";
import { useUIStore } from "@/lib/store/useUIStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";

interface CommandCtx {
  router: ReturnType<typeof useRouter>;
  openQuickNote: () => void;
  openNewFile: () => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  toggleSplit: () => void;
  addWorkspace: () => void;
  save: () => void;
}

const COMMANDS: { id: string; label: string; run: (ctx: CommandCtx) => void }[] = [
  { id: "cmd-new-note", label: "New Note…", run: ({ openNewFile }) => openNewFile() },
  { id: "cmd-quick-note", label: "New Quick Note", run: ({ openQuickNote }) => openQuickNote() },
  { id: "cmd-save", label: "Save Note", run: ({ save }) => save() },
  { id: "cmd-open-folder", label: "Add Workspace Folder…", run: ({ addWorkspace }) => addWorkspace() },
  { id: "cmd-toggle-sidebar", label: "Toggle Sidebar", run: ({ toggleSidebar }) => toggleSidebar() },
  { id: "cmd-toggle-theme", label: "Toggle Light/Dark Theme", run: ({ toggleTheme }) => toggleTheme() },
  { id: "cmd-split-editor", label: "Toggle Split Editor", run: ({ toggleSplit }) => toggleSplit() },
  { id: "cmd-settings", label: "Open Settings", run: ({ router }) => router.push("/settings") },
  { id: "cmd-home", label: "Go to Home", run: ({ router }) => router.push("/") },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setQuickNoteOpen = useUIStore((s) => s.setQuickNoteOpen);
  const openNewFileDialog = useUIStore((s) => s.openNewFileDialog);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const notes = useWorkspaceStore((s) => s.notes);
  const openTab = useTabsStore((s) => s.openTab);
  const toggleSplit = useTabsStore((s) => s.toggleSplit);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredQuickNotes = useMemo(
    () =>
      notes
        .filter((n) => n.id.startsWith("quick-") && n.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6),
    [notes, query]
  );
  const filteredNotes = useMemo(
    () =>
      notes
        .filter((n) => !n.id.startsWith("quick-") && n.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6),
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
    router.push(`${type === "canvas" ? "/canvas" : "/note"}/${encodeURIComponent(noteId)}`);
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
      <div className="max-h-80 overflow-y-auto zn-scroll py-1">
        {filteredCommands.length > 0 && (
          <div className="px-2 py-1">
            <p className="px-1 text-[11px] uppercase tracking-wide text-graphite dark:text-graphiteDark">Commands</p>
            {filteredCommands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.run({
                    router,
                    openQuickNote: () => setQuickNoteOpen(true),
                    openNewFile: () => openNewFileDialog(),
                    toggleSidebar,
                    toggleTheme: () => setThemeMode(themeMode === "dark" ? "light" : "dark"),
                    toggleSplit,
                    addWorkspace,
                    save: () => useActiveEditorStore.getState().triggerSave(),
                  });
                  close();
                }}
                className="w-full text-left px-2 py-1.5 text-sm rounded text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        )}
        {filteredQuickNotes.length > 0 && (
          <div className="px-2 py-1">
            <p className="px-1 text-[11px] uppercase tracking-wide text-graphite dark:text-graphiteDark">
              Quick Notes
            </p>
            {filteredQuickNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => openNote(note.id, note.type)}
                className="w-full text-left px-2 py-1.5 text-sm rounded text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
              >
                {note.title}
              </button>
            ))}
          </div>
        )}
        {filteredNotes.length > 0 && (
          <div className="px-2 py-1">
            <p className="px-1 text-[11px] uppercase tracking-wide text-graphite dark:text-graphiteDark">Notes</p>
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => openNote(note.id, note.type)}
                className="w-full text-left px-2 py-1.5 text-sm rounded text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
              >
                {note.title}
              </button>
            ))}
          </div>
        )}
        {filteredCommands.length === 0 && filteredNotes.length === 0 && filteredQuickNotes.length === 0 && (
          <p className="px-3 py-4 text-sm text-graphite dark:text-graphiteDark">No matches.</p>
        )}
      </div>
    </Dialog>
  );
}
