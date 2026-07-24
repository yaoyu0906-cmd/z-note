import type { ShortcutBinding } from "@/lib/types/shortcuts";

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: "new-note", label: "New Note", keys: "Ctrl+N", editable: true },
  { id: "quick-note", label: "Quick Note", keys: "Ctrl+Shift+N", editable: true },
  { id: "command-palette", label: "Command Palette", keys: "Ctrl+P", editable: true },
  { id: "ai-panel", label: "AI", keys: "Ctrl+K", editable: true },
  { id: "toggle-page-view", label: "Toggle Page Code/Preview", keys: "Ctrl+`", editable: true },
  { id: "split-editor", label: "Split Editor", keys: "Ctrl+\\", editable: true },
  { id: "toggle-sidebar", label: "Toggle Sidebar", keys: "Ctrl+B", editable: true },
  { id: "close-tab", label: "Close Tab", keys: "Ctrl+W", editable: true },
];
