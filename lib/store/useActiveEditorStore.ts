import { create } from "zustand";

/**
 * Registry of save functions, one per currently-mounted editor (keyed by
 * note id). Previously this was a single overwritable slot — with Split
 * Editor open, two editors can be mounted at once, and whichever
 * registered last silently won, so Ctrl+S/"Save Note" only ever saved one
 * of them. Keying by note id lets every mounted editor register
 * independently, and triggerSave() now saves all of them (which is also
 * the full, correct meaning of "every unsaved note" here — a tab that
 * isn't currently mounted has no live in-memory edits to save; its last
 * save already reflects everything it has).
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
      return { saveFns: { ...state.saveFns, [key]: fn } };
    }),
  triggerSave: () => {
    Object.values(get().saveFns).forEach((fn) => fn());
  },
}));
