import { useDraftStore } from "@/lib/store/useDraftStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";

// Exactly one autosave pass every 5 seconds while something is dirty —
// not on every keystroke, and not more often than this even if several
// notes are being edited at once. This same cadence is what keeps
// synced/cloud files from writing to Supabase any more frequently than a
// plain local save would: cloud pushes only ever happen from inside a
// note's own save function (see MarkdownEditor/RichNoteEditor/
// CanvasEditor's registerSave callbacks), and this timer is the only
// thing that calls those functions on its own initiative. Overlapping
// saves for the same note (e.g. a slow cloud push still running from the
// last tick) are guarded centrally in useActiveEditorStore.registerSave,
// not here.
const AUTOSAVE_INTERVAL_MS = 5_000;

let timer: ReturnType<typeof setInterval> | null = null;

/** Starts the autosave timer for the app's lifetime — call once. Each
 *  tick only saves notes that are actually dirty (useDraftStore) and
 *  currently mounted (useActiveEditorStore's registered save functions),
 *  so it's a no-op most of the time rather than unconditionally
 *  rewriting every open file. */
export function startAutosave(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (!useSettingsStore.getState().autosaveEnabled) return;
    const dirtyIds = useDraftStore.getState().dirtyNoteIds();
    if (dirtyIds.length === 0) return;
    const { saveFns } = useActiveEditorStore.getState();
    dirtyIds.forEach((id) => saveFns[id]?.());
  }, AUTOSAVE_INTERVAL_MS);
}
