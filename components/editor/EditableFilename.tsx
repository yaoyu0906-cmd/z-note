"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { NoteType } from "@/lib/types/note";

interface EditableFilenameProps {
  title: string;
  path: string;
  /** Fixes which extension this note keeps — editing the path only ever
   *  changes the folder/name portion, never the type of file it is. */
  type: NoteType;
  onRename: (updates: { title?: string; path?: string }) => void;
}

const EXTENSION: Record<NoteType, string> = {
  md: ".md",
  txt: ".txt",
  note: ".note",
  canvas: ".canvas",
};

/** Strips a trailing recognized-or-not extension so the editable field
 *  only ever shows/accepts the folder+name portion of the path. */
function stripExtension(path: string): string {
  return path.replace(/\.[^./\\]+$/, "");
}

export function EditableFilename({ title, path, type, onRename }: EditableFilenameProps) {
  const extension = EXTENSION[type];
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [pathValue, setPathValue] = useState(stripExtension(path));

  function commit() {
    setEditing(false);
    const updates: { title?: string; path?: string } = {};
    if (titleValue.trim() && titleValue !== title) updates.title = titleValue.trim();

    // Whatever the person typed (including any extension-looking suffix),
    // the file always keeps its original type — only the name/folder can
    // change here.
    const cleanBase = stripExtension(pathValue.trim());
    const newPath = cleanBase ? `${cleanBase}${extension}` : path;
    if (cleanBase && newPath !== path) updates.path = newPath;

    if (Object.keys(updates).length > 0) onRename(updates);
  }

  function cancel() {
    setTitleValue(title);
    setPathValue(stripExtension(path));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="text-sm font-medium bg-transparent border-b border-accent dark:border-accentDark outline-none text-ink dark:text-inkDark w-40"
          placeholder="Title"
        />
        <div className="flex items-center gap-0.5">
          <input
            value={pathValue}
            onChange={(e) => setPathValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            onBlur={commit}
            className="text-xs font-mono bg-transparent border-b border-line dark:border-lineDark outline-none text-graphite dark:text-graphiteDark w-32"
            placeholder="filename"
          />
          {/* Extension is fixed to the note's type — shown, not editable. */}
          <span className="text-xs font-mono text-graphite dark:text-graphiteDark select-none">
            {extension}
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left"
      title="Click to rename"
    >
      <span className="text-sm text-graphite dark:text-graphiteDark font-mono">{path}</span>
      <Pencil
        size={11}
        className="text-graphite dark:text-graphiteDark opacity-0 group-hover:opacity-100"
      />
    </button>
  );
}
