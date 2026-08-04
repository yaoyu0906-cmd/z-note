"use client";

import { useState } from "react";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { Kbd, Button } from "@/components/ui";

export function ShortcutSettings() {
  const shortcuts = useSettingsStore((s) => s.shortcuts);
  const setShortcut = useSettingsStore((s) => s.setShortcut);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  function startRecording(id: string) {
    setRecordingId(id);

    function handler(e: KeyboardEvent) {
      e.preventDefault();
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      const key = e.key === "`" ? "`" : e.key === "\\" ? "\\" : e.key.toUpperCase();
      if (!["CONTROL", "SHIFT", "META", "ALT"].includes(key)) {
        parts.push(key);
        setShortcut(id as Parameters<typeof setShortcut>[0], parts.join("+"));
        setRecordingId(null);
        window.removeEventListener("keydown", handler);
      }
    }

    window.addEventListener("keydown", handler);
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Keyboard shortcuts</h2>
      <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
        Everything is keyboard accessible and every binding below is customizable.
      </p>
      <ul className="divide-y divide-line dark:divide-lineDark border border-line dark:border-lineDark rounded-md overflow-hidden">
        {shortcuts.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-ink dark:text-inkDark">{s.label}</span>
            <div className="flex items-center gap-2">
              {recordingId === s.id ? (
                <span className="text-xs text-accent">Press a key…</span>
              ) : (
                <Kbd>{s.keys}</Kbd>
              )}
              <Button size="sm" onClick={() => startRecording(s.id)}>
                Change
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
