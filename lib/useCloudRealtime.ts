import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { parseCloudNoteId } from "@/lib/cloudNote";

/**
 * Subscribes to Supabase Realtime for one cloud-only file (see
 * lib/cloudNote.ts), calling `onRemoteChange` with the new content
 * whenever *another* device saves an update to this exact row while it's
 * open here. This is what gives cloud-only editing (devices without File
 * System Access — Safari, iOS, etc.) live multi-device updates without
 * polling.
 *
 * No-ops entirely for a non-cloud note id, so editors can call this
 * unconditionally rather than needing their own branch just to opt in.
 *
 * This intentionally doesn't attempt operational-transform-style merging
 * — conflicts still resolve last-write-wins, consistent with the rest of
 * sync. `getLocalContent` lets it skip applying an update that matches
 * what's already on screen (the echo of this device's own save).
 */
export function useCloudRealtime(noteId: string, getLocalContent: () => string, onRemoteChange: (content: string) => void) {
  const getLocalRef = useRef(getLocalContent);
  getLocalRef.current = getLocalContent;
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  useEffect(() => {
    const parsed = parseCloudNoteId(noteId);
    const userId = useAuthStore.getState().user?.id;
    if (!parsed || !userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`synced_files:${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "synced_files", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { workspace_name: string; path: string; content: string | null };
          if (row.workspace_name !== parsed.workspaceName || row.path !== parsed.path) return;
          if (row.content == null || row.content === getLocalRef.current()) return;
          onRemoteChangeRef.current(row.content);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);
}
