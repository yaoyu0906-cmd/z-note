"use client";

import { useRouter } from "next/navigation";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { IconButton } from "@/components/ui";

export function TabBar() {
  const router = useRouter();
  const { tabs, activeTabByPane, setActiveTab, closeTab, isSplit, toggleSplit } = useTabsStore();

  function openTab(tabId: string, type: string) {
    setActiveTab(tabId);
    const base = type === "canvas" ? "/canvas" : "/note";
    router.push(`${base}/${tabId}`);
  }

  return (
    <div className="flex items-center border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-1">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = activeTabByPane.primary === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => openTab(tab.id, tab.type)}
              className={`group flex items-center gap-2 px-3 py-2 text-sm border-r border-line dark:border-lineDark cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-accentSoft dark:bg-accentSoftDark text-accent"
                  : "text-graphite dark:text-graphiteDark hover:bg-paper dark:hover:bg-paperDark"
              }`}
            >
              <span className="truncate max-w-[140px]">{tab.title}</span>
              {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-graphite hover:text-ink"
                aria-label={`Close ${tab.title}`}
              >
                ×
              </button>
            </div>
          );
        })}
        {tabs.length === 0 && (
          <div className="px-3 py-2 text-sm text-graphite dark:text-graphiteDark">No tabs open</div>
        )}
      </div>
      <IconButton label="Split editor" active={isSplit} onClick={toggleSplit}>
        ▥
      </IconButton>
    </div>
  );
}
