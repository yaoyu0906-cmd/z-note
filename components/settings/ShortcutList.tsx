"use client";

import { useState } from "react";
import { Kbd, Button } from "@/components/ui";
import { eventToKeyString, isModifierOnly } from "@/lib/keyboard/keyString";

interface GenericBinding {
  id: string;
  label: string;
  keys: string;
  editable: boolean;
}

interface ShortcutListProps<T extends GenericBinding> {
  bindings: T[];
  onChange: (id: T["id"], keys: string) => void;
}

/** Presentational + interaction logic for "press a key to rebind" lists.
 *  Used by both the app-level Keyboard Shortcuts screen and the Canvas
 *  section's tool/action keybinds, so the two never drift into separate
 *  look-and-feel or recording behavior. */
export function ShortcutList<T extends GenericBinding>({ bindings, onChange }: ShortcutListProps<T>) {
  const [recordingId, setRecordingId] = useState<string | null>(null);

  function startRecording(id: T["id"]) {
    setRecordingId(id);

    function handler(e: KeyboardEvent) {
      e.preventDefault();
      if (isModifierOnly(e)) return;
      onChange(id, eventToKeyString(e));
      setRecordingId(null);
      window.removeEventListener("keydown", handler);
    }

    window.addEventListener("keydown", handler);
  }

  return (
    <ul className="divide-y divide-line dark:divide-lineDark border border-line dark:border-lineDark rounded-md overflow-hidden">
      {bindings.map((b) => (
        <li key={b.id} className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-ink dark:text-inkDark">{b.label}</span>
          <div className="flex items-center gap-2">
            {recordingId === b.id ? (
              <span className="text-xs text-accent dark:text-accentDark">Press a key…</span>
            ) : (
              <Kbd>{b.keys}</Kbd>
            )}
            <Button size="sm" onClick={() => startRecording(b.id)}>
              Change
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
