"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Columns2, X } from "lucide-react";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { IconButton } from "@/components/ui";
import { UnsavedChangesDialog } from "@/components/layout/UnsavedChangesDialog";

export function TabBar() {
  const router = useRouter();
  const { tabs, activeTabByPane, setActiveTab, closeTab, isSplit, toggleSplit } = useTabsStore();
  const notes = useWorkspaceStore((s) => s.notes);
  const pendingClose = useUIStore((s) => s.pendingTabClose);
  const setPendingClose = useUIStore((s) => s.setPendingTabClose);
  const [saving, setSaving] = useState(false);

  function openTab(tabId: string, type: string) {
    setActiveTab(tabId);
    const base = type === "canvas" ? "/canvas" : "/note";
    router.push(`${base}/${encodeURIComponent(tabId)}`);
  }

  function finishCloseTab(tabId: string) {
    const wasActive = activeTabByPane.primary === tabId;
    closeTab(tabId);
    useDraftStore.getState().clear(tabId);
    if (!wasActive) return;

    const { tabs: remaining, activeTabByPane: nextActive } = useTabsStore.getState();
    if (remaining.length === 0) {
      router.push("/");
      return;
    }
    const nextTab = remaining.find((t) => t.id === nextActive.primary);
    if (nextTab) {
      router.push(`${nextTab.type === "canvas" ? "/canvas" : "/note"}/${encodeURIComponent(nextTab.id)}`);
    }
  }

  function requestCloseTab(e: React.MouseEvent, tabId: string, type: string, label: string) {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.isDirty) {
      setPendingClose({ id: tabId, type, label });
      return;
    }
    finishCloseTab(tabId);
  }

  async function handleDialogSave() {
    if (!pendingClose) return;
    setSaving(true);
    try {
      let saveFn = useActiveEditorStore.getState().saveFns[pendingClose.id];
      if (!saveFn) {
        // The editor isn't currently mounted (a background tab, or the
        // inactive side of a split) — its live save function only exists
        // while it's mounted, so open it first and give it a moment to
        // register, then try again.
        openTab(pendingClose.id, pendingClose.type);
        await new Promise((resolve) => setTimeout(resolve, 200));
        saveFn = useActiveEditorStore.getState().saveFns[pendingClose.id];
      }
      await saveFn?.();
      finishCloseTab(pendingClose.id);
    } finally {
      setSaving(false);
      setPendingClose(null);
    }
  }

  function handleDialogDiscard() {
    if (!pendingClose) return;
    useDraftStore.getState().clear(pendingClose.id);
    finishCloseTab(pendingClose.id);
    setPendingClose(null);
  }

  return (
    <div className="flex items-center border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-1">
      <div className="flex flex-1 overflow-x-auto zn-scroll">
        {tabs.map((tab) => {
          const active = activeTabByPane.primary === tab.id;
          const label = notes.find((n) => n.id === tab.id)?.title ?? tab.title;
          return (
            <div
              key={tab.id}
              onClick={() => openTab(tab.id, tab.type)}
              className={`group flex items-center gap-2 px-3 py-2 text-sm border-r border-line dark:border-lineDark cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-accentSoft dark:bg-accentSoftDark text-accent dark:text-accentDark"
                  : "text-graphite dark:text-graphiteDark hover:bg-paper dark:hover:bg-paperDark"
              }`}
            >
              <span className="truncate max-w-[140px]">{label}</span>
              {tab.isSaving ? (
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" title="Saving…" />
              ) : (
                tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-green-500" title="Unsaved changes" />
              )}
              <button
                onClick={(e) => requestCloseTab(e, tab.id, tab.type, label)}
                className="opacity-0 group-hover:opacity-100 text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark"
                aria-label={`Close ${label}`}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
        {tabs.length === 0 && (
          <div className="px-3 py-2 text-sm text-graphite dark:text-graphiteDark">No tabs open</div>
        )}
      </div>
      <IconButton label="Split editor" active={isSplit} onClick={toggleSplit}>
        <Columns2 size={15} />
      </IconButton>

      <UnsavedChangesDialog
        open={pendingClose !== null}
        name={pendingClose?.label ?? ""}
        saving={saving}
        onSave={handleDialogSave}
        onDiscard={handleDialogDiscard}
        onCancel={() => setPendingClose(null)}
      />
    </div>
  );
}
