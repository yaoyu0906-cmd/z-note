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

  /** A tab close is pending confirmation because it has unsaved changes —
   *  shared so both the tab bar's close button and the Ctrl+W shortcut
   *  can trigger the same dialog instead of each needing their own copy
   *  of this state. */
  pendingTabClose: { id: string; type: string; label: string } | null;
  setPendingTabClose: (value: { id: string; type: string; label: string } | null) => void;
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

  pendingTabClose: null,
  setPendingTabClose: (pendingTabClose) => set({ pendingTabClose }),
}));
