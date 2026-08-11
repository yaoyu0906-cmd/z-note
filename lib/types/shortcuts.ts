export type ShortcutAction =
  | "new-note"
  | "quick-note"
  | "scratch-pad"
  | "command-palette"
  | "ai-panel"
  | "toggle-page-view"
  | "split-editor"
  | "toggle-sidebar"
  | "close-tab"
  | "save-note"
  | "next-tab"
  | "prev-tab";

export interface ShortcutBinding {
  id: ShortcutAction;
  label: string;
  keys: string; // display form, e.g. "Ctrl+P"
  editable: boolean;
}

/** Canvas-scoped tool/action bindings — configurable separately from the
 *  app-level shortcuts above since they only apply while a Canvas editor
 *  has focus. Same shape/UI pattern, kept as its own action union so a
 *  Canvas binding can never collide with (or be edited from) the app list. */
export type CanvasShortcutAction =
  | "tool-move"
  | "tool-lasso"
  | "tool-pan"
  | "tool-text"
  | "tool-sticky"
  | "tool-rectangle"
  | "tool-ellipse"
  | "tool-diamond"
  | "tool-arrow"
  | "tool-line"
  | "tool-freehand"
  | "tool-highlighter"
  | "tool-eraser"
  | "tool-table"
  | "tool-file-link"
  | "tool-image"
  | "canvas-undo"
  | "canvas-redo"
  | "canvas-copy"
  | "canvas-paste"
  | "canvas-duplicate"
  | "canvas-select-all"
  | "canvas-delete"
  | "canvas-zoom-in"
  | "canvas-zoom-out"
  | "canvas-reset-zoom";

export interface CanvasShortcutBinding {
  id: CanvasShortcutAction;
  label: string;
  keys: string;
  editable: boolean;
}
