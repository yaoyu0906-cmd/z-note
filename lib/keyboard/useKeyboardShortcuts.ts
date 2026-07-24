"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/useUIStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import type { ShortcutAction } from "@/lib/types/shortcuts";

/** Normalizes a KeyboardEvent into the same "Ctrl+Shift+N" style used in ShortcutBinding.keys. */
function eventToKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  const key = e.key === "`" ? "`" : e.key === "\\" ? "\\" : e.key.toUpperCase();
  parts.push(key);
  return parts.join("+");
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const { setCommandPaletteOpen, setQuickNoteOpen, toggleSidebar, setAIPanelOpen } = useUIStore();
  const { toggleSplit, closeTab, activeTabByPane } = useTabsStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const pressed = eventToKeyString(e);
      const match = shortcuts.find((s) => s.keys === pressed);
      if (!match) return;

      e.preventDefault();
      const action: ShortcutAction = match.id;

      switch (action) {
        case "new-note":
          router.push("/note/new");
          break;
        case "quick-note":
          setQuickNoteOpen(true);
          break;
        case "command-palette":
          setCommandPaletteOpen(true);
          break;
        case "ai-panel":
          setAIPanelOpen(true);
          break;
        case "split-editor":
          toggleSplit();
          break;
        case "toggle-sidebar":
          toggleSidebar();
          break;
        case "close-tab": {
          const activeId = activeTabByPane.primary;
          if (activeId) closeTab(activeId);
          break;
        }
        case "toggle-page-view":
          // Handled locally by the focused PageBlock instance via a custom event,
          // since only one Page block should react at a time.
          window.dispatchEvent(new CustomEvent("z-note:toggle-page-view"));
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    shortcuts,
    router,
    setCommandPaletteOpen,
    setQuickNoteOpen,
    setAIPanelOpen,
    toggleSplit,
    toggleSidebar,
    closeTab,
    activeTabByPane,
  ]);
}
