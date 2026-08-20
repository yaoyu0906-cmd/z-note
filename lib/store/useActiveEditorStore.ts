import { create } from "zustand";
import { useTabsStore } from "@/lib/store/useTabsStore";

/**
 * Registry of save functions, one per currently-mounted editor (keyed by
 * note id) — with Split Editor open, two editors can be mounted at once,
 * so a single overwritable slot would mean Ctrl+S/"Save Note" only ever
 * saved whichever one registered last. Keying by note id lets every
 * mounted editor register independently, and triggerSave() saves all of
 * them, which is also the full, correct meaning of "every unsaved note"
 * here — a tab that isn't currently mounted has no live in-memory edits
 * to save; its last save already reflects everything it has.
 *
 * registerSave wraps the given function so every save — however it's
 * triggered (Ctrl+S, autosave, the close-tab dialog) — toggles the tab's
 * isSaving flag around the call, in one place, rather than every editor
 * needing to manage that itself. That flag (plus useDraftStore's dirty
 * tracking, mirrored onto the tab via useTabsStore.setDirty) is what
 * drives the tab bar's save-status dot.
 */
interface ActiveEditorState {
  saveFns: Record<string, () => void | Promise<void>>;
  registerSave: (key: string, fn: (() => void | Promise<void>) | null) => void;
  triggerSave: () => void;
}

export const useActiveEditorStore = create<ActiveEditorState>((set, get) => ({
  saveFns: {},
  registerSave: (key, fn) =>
    set((state) => {
      if (!fn) {
        if (!(key in state.saveFns)) return state;
        const next = { ...state.saveFns };
        delete next[key];
        return { saveFns: next };
      }
      const wrapped = async () => {
        // Guards against overlapping saves for the same note — e.g. a
        // slow cloud push still in flight from the last autosave tick
        // when the next tick (or a manual Ctrl+S) fires. Centralized here
        // so every trigger (Ctrl+S, autosave, the close-tab dialog) is
        // covered, not just autosave-vs-autosave.
        if (useTabsStore.getState().tabs.find((t) => t.id === key)?.isSaving) return;
        useTabsStore.getState().setSaving(key, true);
        try {
          await fn();
        } finally {
          useTabsStore.getState().setSaving(key, false);
        }
      };
      return { saveFns: { ...state.saveFns, [key]: wrapped } };
    }),
  triggerSave: () => {
    Object.values(get().saveFns).forEach((fn) => fn());
  },
}));
