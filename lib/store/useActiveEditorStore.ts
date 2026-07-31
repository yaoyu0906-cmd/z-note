import { create } from "zustand";

interface ActiveEditorState {
  saveFn: (() => void | Promise<void>) | null;
  registerSave: (fn: (() => void | Promise<void>) | null) => void;
  triggerSave: () => void;
}

export const useActiveEditorStore = create<ActiveEditorState>((set, get) => ({
  saveFn: null,
  registerSave: (saveFn) => set({ saveFn }),
  triggerSave: () => {
    get().saveFn?.();
  },
}));
