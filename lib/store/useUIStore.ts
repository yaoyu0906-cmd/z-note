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

  /** null = closed. workspaceId null means "use the active workspace" —
   *  used by the global "+" (Sidebar/Command Palette/shortcut), which
   *  isn't scoped to any one Explorer section. Explorer-driven opens
   *  always pass a concrete workspaceId + folderPath. */
  newFileDialogTarget: { workspaceId: string | null; folderPath: string } | null;
  openNewFileDialog: (target?: { workspaceId: string | null; folderPath: string }) => void;
  closeNewFileDialog: () => void;
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

  newFileDialogTarget: null,
  openNewFileDialog: (target) =>
    set({ newFileDialogTarget: target ?? { workspaceId: null, folderPath: "" } }),
  closeNewFileDialog: () => set({ newFileDialogTarget: null }),
}));
