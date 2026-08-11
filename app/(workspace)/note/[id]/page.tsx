"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { NoteEditorRouter } from "@/components/editor/NoteEditorRouter";
import { SCRATCH_PAD_NOTE_ID, SCRATCH_PAD_TITLE } from "@/lib/scratchPad";
import type { Note } from "@/lib/types/note";

function draftNote(id: string): Note {
  const now = new Date().toISOString();
  return {
    id,
    title: id === SCRATCH_PAD_NOTE_ID ? SCRATCH_PAD_TITLE : "Untitled",
    type: "md",
    path: `${id}.md`,
    tagIds: [],
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

  const decodedId = useMemo(() => decodeURIComponent(params.id), [params.id]);

  const note = useMemo(
    () => (decodedId === "new" ? draftNote("new") : notes.find((n) => n.id === decodedId) ?? draftNote(decodedId)),
    [notes, decodedId]
  );

  useEffect(() => {
    openTab(note);
    setActiveTab(note.id);
    if (params.id !== "new" && decodedId !== SCRATCH_PAD_NOTE_ID) touchRecent(note.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  return <NoteEditorRouter note={note} />;
}
