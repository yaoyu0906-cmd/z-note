"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, File, NotebookText, LayoutGrid } from "lucide-react";
import { Dialog, Input, Button } from "@/components/ui";
import { useUIStore } from "@/lib/store/useUIStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import type { NoteType } from "@/lib/types/note";

const FILE_TYPES: { type: NoteType; label: string; hint: string; icon: typeof FileText }[] = [
  { type: "md", label: "Markdown", hint: ".md", icon: FileText },
  { type: "txt", label: "Plain Text", hint: ".txt", icon: File },
  { type: "note", label: "Rich Note", hint: ".note", icon: NotebookText },
  { type: "canvas", label: "Canvas", hint: ".canvas", icon: LayoutGrid },
];

export function NewFileDialog() {
  const target = useUIStore((s) => s.newFileDialogTarget);
  const closeDialog = useUIStore((s) => s.closeNewFileDialog);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const createNote = useWorkspaceStore((s) => s.createNote);
  const openTab = useTabsStore((s) => s.openTab);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<NoteType>("md");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const open = target !== null;
  // A folder-scoped open (from an Explorer "+") always pins a specific
  // workspace; only the unscoped global "+" lets the person pick one.
  const isFolderScoped = !!target?.workspaceId;
  const folderPath = target?.folderPath ?? "";
  const resolvedWorkspaceId = target?.workspaceId ?? workspaceId ?? activeWorkspaceId ?? workspaces[0]?.id ?? null;
  const resolvedWorkspace = workspaces.find((w) => w.id === resolvedWorkspaceId);

  useEffect(() => {
    if (open) setWorkspaceId(target?.workspaceId ?? activeWorkspaceId ?? workspaces[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    closeDialog();
    setTitle("");
    setType("md");
  }

  async function handleCreate() {
    setCreating(true);
    try {
      // Root of that workspace unless opened from a specific Explorer folder.
      const note = await createNote(title.trim() || "Untitled", type, resolvedWorkspaceId ?? undefined, folderPath);
      openTab(note);
      router.push(`${note.type === "canvas" ? "/canvas" : "/note"}/${encodeURIComponent(note.id)}`);
      close();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onClose={close}>
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark">New file</h2>

        {workspaces.length > 1 && !isFolderScoped ? (
          <div>
            <label className="text-xs text-graphite dark:text-graphiteDark mb-1 block">Workspace</label>
            <select
              value={resolvedWorkspaceId ?? ""}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="w-full text-sm bg-transparent border border-line dark:border-lineDark rounded-md px-2 py-1.5 outline-none text-ink dark:text-inkDark"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          resolvedWorkspace && (
            <p className="text-xs text-graphite dark:text-graphiteDark">
              Creating in <span className="font-medium text-ink dark:text-inkDark">{resolvedWorkspace.name}</span>
              {folderPath ? ` / ${folderPath}` : " (root)"}
            </p>
          )
        )}

        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Title"
        />
        <div className="grid grid-cols-2 gap-2">
          {FILE_TYPES.map(({ type: t, label, hint, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                type === t
                  ? "border-accent dark:border-accentDark bg-accentSoft dark:bg-accentSoftDark text-accent dark:text-accentDark"
                  : "border-line dark:border-lineDark text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1">{label}</span>
              <span className="text-xs text-graphite dark:text-graphiteDark">{hint}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
