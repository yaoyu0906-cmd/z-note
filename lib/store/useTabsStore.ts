import { create } from "zustand";
import type { Tab, PaneId } from "@/lib/types/tabs";
import type { Note } from "@/lib/types/note";

interface TabsState {
  tabs: Tab[];
  activeTabByPane: Record<PaneId, string | null>;
  isSplit: boolean;

  openTab: (note: Note, pane?: PaneId) => void;
  closeTab: (tabId: string) => void;
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
