import { create } from "zustand";
import type { Tab, PaneId } from "@/lib/types/tabs";
import type { Note } from "@/lib/types/note";

interface TabsState {
  tabs: Tab[];
  activeTabByPane: Record<PaneId, string | null>;
  isSplit: boolean;

  openTab: (note: Note, pane?: PaneId) => void;
  closeTab: (tabId: string) => void;
  /** Closes every tab whose id matches the predicate — used when a
   *  workspace is closed or its folder is changed, since those tabs would
   *  otherwise keep pointing at notes that no longer exist. */
  closeTabsMatching: (predicate: (tabId: string) => boolean) => void;
  /** Swaps an open tab's id/title in place — used after a move (drag into
   *  a different folder or workspace changes a note's id) so its tab
   *  keeps pointing at the right note instead of going stale. No-op if
   *  that tab isn't currently open. */
  renameTabId: (oldId: string, newId: string, newTitle?: string) => void;
  setActiveTab: (tabId: string, pane?: PaneId) => void;
  toggleSplit: () => void;
  setDirty: (tabId: string, isDirty: boolean) => void;
  togglePin: (tabId: string) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabByPane: { primary: null, secondary: null },
  isSplit: false,

  openTab: (note, pane = "primary") => {
    const { tabs } = get();
    const exists = tabs.find((t) => t.id === note.id);

    set((state) => ({
      tabs: exists
        ? state.tabs
        : [
            ...state.tabs,
            { id: note.id, title: note.title, type: note.type, isPinned: false, isDirty: false },
          ],
      activeTabByPane: { ...state.activeTabByPane, [pane]: note.id },
    }));
  },

  closeTab: (tabId) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== tabId);
      const activeTabByPane = { ...state.activeTabByPane };
      (Object.keys(activeTabByPane) as PaneId[]).forEach((pane) => {
        if (activeTabByPane[pane] === tabId) {
          activeTabByPane[pane] = tabs[tabs.length - 1]?.id ?? null;
        }
      });
      return { tabs, activeTabByPane };
    }),

  closeTabsMatching: (predicate) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => !predicate(t.id));
      const activeTabByPane = { ...state.activeTabByPane };
      (Object.keys(activeTabByPane) as PaneId[]).forEach((pane) => {
        const current = activeTabByPane[pane];
        if (current && predicate(current)) {
          activeTabByPane[pane] = tabs[tabs.length - 1]?.id ?? null;
        }
      });
      return { tabs, activeTabByPane };
    }),

  renameTabId: (oldId, newId, newTitle) =>
    set((state) => {
      if (!state.tabs.some((t) => t.id === oldId)) return state;
      const tabs = state.tabs.map((t) =>
        t.id === oldId ? { ...t, id: newId, title: newTitle ?? t.title } : t
      );
      const activeTabByPane = { ...state.activeTabByPane };
      (Object.keys(activeTabByPane) as PaneId[]).forEach((pane) => {
        if (activeTabByPane[pane] === oldId) activeTabByPane[pane] = newId;
      });
      return { tabs, activeTabByPane };
    }),

  setActiveTab: (tabId, pane = "primary") =>
    set((state) => ({ activeTabByPane: { ...state.activeTabByPane, [pane]: tabId } })),

  toggleSplit: () =>
    set((state) => ({
      isSplit: !state.isSplit,
      activeTabByPane: {
        ...state.activeTabByPane,
        secondary: state.isSplit ? null : state.activeTabByPane.primary,
      },
    })),

  setDirty: (tabId, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    })),

  togglePin: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isPinned: !t.isPinned } : t)),
    })),
}));
