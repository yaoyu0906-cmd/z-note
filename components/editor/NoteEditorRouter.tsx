"use client";

import { useState } from "react";
import type { Note } from "@/lib/types/note";
import { MarkdownEditor } from "@/components/Editor/MarkdownEditor";
import { RichNoteEditor } from "@/components/editor/RichNoteEditor";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { useSettingsStore } from "@/lib/store/useSettingsStore";

interface NoteEditorRouterProps {
  note: Note;
  initialContent?: string;
}

export function NoteEditorRouter({ note, initialContent = "" }: NoteEditorRouterProps) {
  const [content, setContent] = useState(initialContent);
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);

  switch (note.type) {
    case "canvas":
      return <CanvasEditor fileName={note.path} />;
    case "note":
      return <RichNoteEditor fileName={note.path} />;
    case "md":
    case "txt":
    default:
      return (
        <MarkdownEditor
          fileName={note.path}
          content={content}
          onChange={setContent}
          provider={activeProvider}
          apiKey={null} // wired up once the vault-unlock flow is mounted at the app shell level
          model={selectedModels[activeProvider]}
        />
      );
  }
}
