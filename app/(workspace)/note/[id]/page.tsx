"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { NoteEditorRouter } from "@/components/editor/NoteEditorRouter";
import type { Note } from "@/lib/types/note";

function draftNote(id: string): Note {
  const now = new Date().toISOString();
  return {
    id,
    title: "Untitled",
    type: "md",
    path: `${id}.md`,
    tags: [],
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    hasLocalHandle: false,
  };
}

export default function NotePage() {
  const params = useParams<{ id: string }>();
  const notes = useWorkspaceStore((s) => s.notes);
  const touchRecent = useWorkspaceStore((s) => s.touchRecent);
  const openTab = useTabsStore((s) => s.openTab);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);

  const note = useMemo(
    () => (params.id === "new" ? draftNote("new") : notes.find((n) => n.id === params.id) ?? draftNote(params.id)),
    [notes, params.id]
  );

  useEffect(() => {
    openTab(note);
    setActiveTab(note.id);
    if (params.id !== "new") touchRecent(note.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  return <NoteEditorRouter note={note} />;
}
