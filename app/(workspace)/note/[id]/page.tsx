"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { NoteEditorRouter } from "@/components/editor/NoteEditorRouter";
import { SCRATCH_PAD_NOTE_ID, SCRATCH_PAD_TITLE } from "@/lib/scratchPad";
import { isCloudNoteId, loadCloudNote } from "@/lib/cloudNote";
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
  const isCloudOnly = isCloudNoteId(decodedId);

  const localNote = decodedId === "new" ? draftNote("new") : notes.find((n) => n.id === decodedId);

  // Cloud-only notes (synced but with no local copy on this device —
  // either never downloaded, or this browser can't use File System
  // Access at all, e.g. Safari/iOS) need an async fetch before there's a
  // Note to render, unlike the local/draft cases which resolve
  // synchronously above.
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

  const note = isCloudOnly ? localNote ?? cloudNote : localNote ?? draftNote(decodedId);

  useEffect(() => {
    if (!note) return;
    openTab(note);
    setActiveTab(note.id);
    if (params.id !== "new" && decodedId !== SCRATCH_PAD_NOTE_ID && !isCloudOnly) touchRecent(note.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (isCloudOnly && !localNote && cloudLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-graphite dark:text-graphiteDark">Loading from the cloud…</div>;
  }
  if (isCloudOnly && !localNote && cloudMissing) {
    return <div className="flex h-full items-center justify-center text-sm text-graphite dark:text-graphiteDark">This file isn't available — it may have been removed from the cloud.</div>;
  }
  if (!note) return null;

  return <NoteEditorRouter note={note} />;
}
