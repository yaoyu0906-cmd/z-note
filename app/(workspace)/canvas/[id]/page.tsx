"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { NoteEditorRouter } from "@/components/editor/NoteEditorRouter";
import { isCloudNoteId, loadCloudNote } from "@/lib/cloudNote";
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
  const isCloudOnly = isCloudNoteId(decodedId);
  const localNote = notes.find((n) => n.id === decodedId);

  const [cloudNote, setCloudNote] = useState<Note | null>(null);
  const [cloudLoading, setCloudLoading] = useState(isCloudOnly);
  const [cloudMissing, setCloudMissing] = useState(false);

  useEffect(() => {
    if (!isCloudOnly || localNote) return;
    let cancelled = false;
    setCloudLoading(true);
    setCloudMissing(false);
    loadCloudNote(decodedId).then((note) => {
      if (cancelled) return;
      setCloudNote(note);
      setCloudMissing(!note);
      setCloudLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [decodedId, isCloudOnly, localNote]);

  const note = isCloudOnly ? localNote ?? cloudNote : localNote ?? draftCanvas(decodedId);

  useEffect(() => {
    if (!note) return;
    openTab(note);
    setActiveTab(note.id);
    if (!isCloudOnly) touchRecent(note.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (isCloudOnly && !localNote && cloudLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-graphite dark:text-graphiteDark">Loading from the cloud…</div>;
  }
  if (isCloudOnly && !localNote && cloudMissing) {
    return <div className="flex h-full items-center justify-center text-sm text-graphite dark:text-graphiteDark">This canvas isn't available — it may have been removed from the cloud.</div>;
  }
  if (!note) return null;

  return <NoteEditorRouter note={note} />;
}
