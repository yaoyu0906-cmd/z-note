"use client";

import { useRef, useState } from "react";
import { Dialog } from "@/components/ui";
import { useUIStore } from "@/lib/store/useUIStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

export function QuickNotePopup() {
  const open = useUIStore((s) => s.quickNoteOpen);
  const setOpen = useUIStore((s) => s.setQuickNoteOpen);
  const addQuickNote = useWorkspaceStore((s) => s.addQuickNote);
  const [text, setText] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function save() {
    if (!text.trim()) {
      setOpen(false);
      return;
    }
    addQuickNote(text.trim());
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      setText("");
      setOpen(false);
    }, 500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} placement="top">
      <div className="p-3">
        <textarea
          ref={textareaRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Type a thought. Press Enter to save."
          className="w-full resize-none text-sm outline-none bg-transparent text-ink dark:text-inkDark placeholder:text-graphite dark:placeholder:text-graphiteDark"
        />
        <p className="text-[11px] text-graphite dark:text-graphiteDark mt-1">Enter to save · Shift+Enter for a new line</p>
      </div>
      {savedFlash && <div className="px-3 pb-2 text-xs text-accent dark:text-accentDark">Saved to Quick Notes.</div>}
    </Dialog>
  );
}
