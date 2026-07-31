"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import type { Note } from "@/lib/types/note";

function draftCanvas(id: string): Note {
  const now = new Date().toISOString();
  return {
    id,
    title: "Untitled Canvas",
    type: "canvas",
    path: `${id}.canvas`,
    tagIds: [],
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    hasLocalHandle: false,
  };
}

export default function CanvasPage() {
  const params = useParams<{ id: string }>();
  const notes = useWorkspaceStore((s) => s.notes);
  const touchRecent = useWorkspaceStore((s) => s.touchRecent);
  const openTab = useTabsStore((s) => s.openTab);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);

  const decodedId = useMemo(() => decodeURIComponent(params.id), [params.id]);

  const note = useMemo(
    () => notes.find((n) => n.id === decodedId) ?? draftCanvas(decodedId),
    [notes, decodedId]
  );

  useEffect(() => {
    openTab(note);
    setActiveTab(note.id);
    touchRecent(note.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  return <CanvasEditor note={note} />;
}
