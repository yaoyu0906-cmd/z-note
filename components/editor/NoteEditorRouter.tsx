"use client";

import type { Note } from "@/lib/types/note";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { RichNoteEditor } from "@/components/editor/RichNoteEditor";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

interface NoteEditorRouterProps {
  note: Note;
}

export function NoteEditorRouter({ note }: NoteEditorRouterProps) {
  const activeProvider = useSettingsStore((s) => s.activeProvider);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const handle = useWorkspaceStore((s) => s.getFileHandle(note.id));
  const initialContent = useWorkspaceStore((s) => s.noteContents[note.id]);

  switch (note.type) {
    case "canvas":
      return <CanvasEditor note={note} />;
    case "note":
      return <RichNoteEditor note={note} handle={handle} initialContent={initialContent} />;
    case "md":
    case "txt":
    default:
      return (
        <MarkdownEditor
          note={note}
          handle={handle}
          initialContent={initialContent}
          provider={activeProvider}
          apiKey={null} // wired up once the vault-unlock flow is mounted at the app shell level
          model={selectedModels[activeProvider]}
        />
      );
  }
}
