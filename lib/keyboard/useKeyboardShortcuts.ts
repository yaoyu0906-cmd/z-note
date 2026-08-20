"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/useUIStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";
import type { ShortcutAction } from "@/lib/types/shortcuts";

import { eventToKeyString } from "@/lib/keyboard/keyString";
import { SCRATCH_PAD_NOTE_ID } from "@/lib/scratchPad";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const { setCommandPaletteOpen, setQuickNoteOpen, openNewFileDialog, toggleSidebar, setAIPanelOpen } =
    useUIStore();
  const { toggleSplit, closeTab, activeTabByPane, tabs, setActiveTab } = useTabsStore();

  function goToTab(tabId: string, type: string) {
    setActiveTab(tabId);
    router.push(`${type === "canvas" ? "/canvas" : "/note"}/${encodeURIComponent(tabId)}`);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const pressed = eventToKeyString(e);
      const match = shortcuts.find((s) => s.keys === pressed);
      if (!match) return;

      e.preventDefault();
      const action: ShortcutAction = match.id;

      switch (action) {
        case "new-note":
          openNewFileDialog();
          break;
        case "quick-note":
          setQuickNoteOpen(true);
          break;
        case "scratch-pad":
          router.push(`/note/${SCRATCH_PAD_NOTE_ID}`);
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
          if (!activeId) break;
          const activeTab = tabs.find((t) => t.id === activeId);
          if (activeTab?.isDirty) {
            // Same confirmation the tab bar's close button uses — shared
            // via useUIStore so both trigger the identical dialog.
            useUIStore.getState().setPendingTabClose({ id: activeId, type: activeTab.type, label: activeTab.title });
            break;
          }
          closeTab(activeId);
          const { tabs: remaining, activeTabByPane: nextActive } = useTabsStore.getState();
          if (remaining.length === 0) {
            router.push("/");
          } else {
            const nextId = nextActive.primary;
            const nextTab = remaining.find((t) => t.id === nextId);
            if (nextTab) {
              router.push(`${nextTab.type === "canvas" ? "/canvas" : "/note"}/${nextTab.id}`);
            }
          }
          break;
        }
        case "toggle-page-view":
          // Handled locally by the focused PageBlock instance via a custom event,
          // since only one Page block should react at a time.
          window.dispatchEvent(new CustomEvent("z-note:toggle-page-view"));
          break;
        case "save-note":
          useActiveEditorStore.getState().triggerSave();
          break;
        case "next-tab":
        case "prev-tab": {
          if (tabs.length < 2) break;
          const currentId = activeTabByPane.primary;
          const idx = tabs.findIndex((t) => t.id === currentId);
          const delta = action === "next-tab" ? 1 : -1;
          const nextIdx = idx === -1 ? 0 : (idx + delta + tabs.length) % tabs.length;
          const nextTab = tabs[nextIdx];
          if (nextTab) goToTab(nextTab.id, nextTab.type);
          break;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    shortcuts,
    router,
    setCommandPaletteOpen,
    setQuickNoteOpen,
    openNewFileDialog,
    setAIPanelOpen,
    toggleSplit,
    toggleSidebar,
    closeTab,
    activeTabByPane,
    tabs,
    setActiveTab,
  ]);
}
