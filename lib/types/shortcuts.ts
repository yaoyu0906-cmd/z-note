export type ShortcutAction =
  | "new-note"
  | "quick-note"
  | "command-palette"
  | "ai-panel"
  | "toggle-page-view"
  | "split-editor"
  | "toggle-sidebar"
  | "close-tab";

export interface ShortcutBinding {
  id: ShortcutAction;
  label: string;
  keys: string; // display form, e.g. "Ctrl+P"
  editable: boolean;
}
