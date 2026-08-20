"use client";

import { useState } from "react";
import { FileText, File, NotebookText, LayoutGrid } from "lucide-react";
import { Dialog, Input, Button } from "@/components/ui";
import type { NoteFileType } from "@/lib/fs/fileSystemAccess";

interface CloudNewItemDialogProps {
  open: boolean;
  kind: "file" | "folder";
  onClose: () => void;
  onCreate: (name: string, fileType: NoteFileType) => void;
}

// Same set/order/icons as NewFileDialog's FILE_TYPES — kept as its own
// list (rather than imported) since NewFileDialog's uses NoteType, which
// includes values Cloud items can't be created as here.
const FILE_TYPES: { type: NoteFileType; label: string; hint: string; icon: typeof FileText }[] = [
  { type: "md", label: "Markdown", hint: ".md", icon: FileText },
  { type: "txt", label: "Plain Text", hint: ".txt", icon: File },
  { type: "note", label: "Rich Note", hint: ".note", icon: NotebookText },
  { type: "canvas", label: "Canvas", hint: ".canvas", icon: LayoutGrid },
];

/** Same shape/behavior as the local Explorer's "New File"/"New Folder"
 *  entry points, just targeting a cloud-only item — created purely via
 *  lib/sync.ts, no local file involved at all. Styled to match
 *  NewFileDialog (the local workspace's equivalent popup). */
export function CloudNewItemDialog({ open, kind, onClose, onCreate }: CloudNewItemDialogProps) {
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState<NoteFileType>("md");

  function close() {
    onClose();
    setName("");
    setFileType("md");
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, fileType);
    setName("");
    setFileType("md");
  }

  return (
    <Dialog open={open} onClose={close}>
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark">
          New {kind === "file" ? "file" : "folder"}
        </h2>
        <p className="text-xs text-graphite dark:text-graphiteDark">
          Creating in <span className="font-medium text-ink dark:text-inkDark">the cloud</span> — no local copy.
        </p>

        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Title"
        />

        {kind === "file" && (
          <div className="grid grid-cols-2 gap-2">
            {FILE_TYPES.map(({ type: t, label, hint, icon: Icon }) => (
              <button
                key={t}
                onClick={() => setFileType(t)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${
                  fileType === t
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
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
