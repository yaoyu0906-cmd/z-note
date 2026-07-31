"use client";

import { useRouter } from "next/navigation";
import { Columns2, X } from "lucide-react";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { IconButton } from "@/components/ui";

export function TabBar() {
  const router = useRouter();
  const { tabs, activeTabByPane, setActiveTab, closeTab, isSplit, toggleSplit } = useTabsStore();
  const notes = useWorkspaceStore((s) => s.notes);

  function openTab(tabId: string, type: string) {
    setActiveTab(tabId);
    const base = type === "canvas" ? "/canvas" : "/note";
    router.push(`${base}/${encodeURIComponent(tabId)}`);
  }

  function handleCloseTab(e: React.MouseEvent, tabId: string) {
    e.stopPropagation();
    const wasActive = activeTabByPane.primary === tabId;
    closeTab(tabId);
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
              {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
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
    </div>
  );
}
