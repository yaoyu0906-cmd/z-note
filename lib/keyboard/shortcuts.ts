import type { ShortcutBinding, CanvasShortcutBinding } from "@/lib/types/shortcuts";

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: "new-note", label: "New Note", keys: "Ctrl+N", editable: true },
  { id: "quick-note", label: "Quick Note", keys: "Ctrl+Shift+N", editable: true },
  { id: "scratch-pad", label: "Scratch Pad", keys: "Ctrl+Shift+S", editable: true },
  { id: "command-palette", label: "Command Palette", keys: "Ctrl+P", editable: true },
  { id: "ai-panel", label: "AI", keys: "Ctrl+K", editable: true },
  { id: "toggle-page-view", label: "Toggle Page Code/Preview", keys: "Ctrl+`", editable: true },
  { id: "split-editor", label: "Split Editor", keys: "Ctrl+\\", editable: true },
  { id: "toggle-sidebar", label: "Toggle Sidebar", keys: "Ctrl+B", editable: true },
  { id: "close-tab", label: "Close Tab", keys: "Ctrl+W", editable: true },
  { id: "save-note", label: "Save Note", keys: "Ctrl+S", editable: true },
  { id: "next-tab", label: "Next Tab", keys: "Ctrl+Tab", editable: true },
  { id: "prev-tab", label: "Previous Tab", keys: "Ctrl+Shift+Tab", editable: true },
];

/** Defaults for Canvas's own tool/action bindings — mirrors the labels
 *  shown in CanvasToolPalette's tooltips and CanvasEditor's shortcut map,
 *  so the Settings screen, the palette tooltips, and the actual key
 *  handling in CanvasEditor can never silently drift apart. */
export const DEFAULT_CANVAS_SHORTCUTS: CanvasShortcutBinding[] = [
  { id: "tool-move", label: "Move Tool", keys: "V", editable: true },
  { id: "tool-lasso", label: "Lasso Tool", keys: "M", editable: true },
  { id: "tool-pan", label: "Pan Tool", keys: "H", editable: true },
  { id: "tool-text", label: "Text Tool", keys: "T", editable: true },
  { id: "tool-sticky", label: "Sticky Note Tool", keys: "S", editable: true },
  { id: "tool-rectangle", label: "Rectangle Tool", keys: "R", editable: true },
  { id: "tool-ellipse", label: "Ellipse Tool", keys: "O", editable: true },
  { id: "tool-diamond", label: "Diamond Tool", keys: "D", editable: true },
  { id: "tool-arrow", label: "Arrow Tool", keys: "A", editable: true },
  { id: "tool-line", label: "Line Tool", keys: "L", editable: true },
  { id: "tool-freehand", label: "Draw Tool", keys: "P", editable: true },
  { id: "tool-highlighter", label: "Highlighter Tool", keys: "G", editable: true },
  { id: "tool-eraser", label: "Eraser Tool", keys: "E", editable: true },
  { id: "tool-table", label: "Table Tool", keys: "K", editable: true },
  { id: "tool-file-link", label: "File Link Tool", keys: "F", editable: true },
  { id: "tool-image", label: "Insert Image", keys: "I", editable: true },
  { id: "canvas-undo", label: "Undo", keys: "Ctrl+Z", editable: true },
  { id: "canvas-redo", label: "Redo", keys: "Ctrl+Shift+Z", editable: true },
  { id: "canvas-copy", label: "Copy", keys: "Ctrl+C", editable: true },
  { id: "canvas-paste", label: "Paste", keys: "Ctrl+V", editable: true },
  { id: "canvas-duplicate", label: "Duplicate", keys: "Ctrl+D", editable: true },
  { id: "canvas-select-all", label: "Select All", keys: "Ctrl+A", editable: true },
  { id: "canvas-delete", label: "Delete", keys: "Delete", editable: true },
  { id: "canvas-zoom-in", label: "Zoom In", keys: "Ctrl+=", editable: true },
  { id: "canvas-zoom-out", label: "Zoom Out", keys: "Ctrl+-", editable: true },
  { id: "canvas-reset-zoom", label: "Reset Zoom", keys: "Ctrl+0", editable: true },
];
