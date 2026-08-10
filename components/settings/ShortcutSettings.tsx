"use client";

import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { ShortcutList } from "@/components/settings/ShortcutList";

export function ShortcutSettings() {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const setShortcut = useSettingsStore((s) => s.setShortcut);

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Keyboard shortcuts</h2>
      <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
        Everything is keyboard accessible and every binding below is customizable.
      </p>
      <ShortcutList bindings={shortcuts} onChange={setShortcut} />
    </div>
  );
}
