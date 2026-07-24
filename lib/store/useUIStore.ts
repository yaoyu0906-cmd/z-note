import { create } from "zustand";

interface UIState {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  quickNoteOpen: boolean;
  setQuickNoteOpen: (open: boolean) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  aiPanelOpen: boolean;
  setAIPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

  quickNoteOpen: false,
  setQuickNoteOpen: (quickNoteOpen) => set({ quickNoteOpen }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  aiPanelOpen: false,
  setAIPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),
}));
