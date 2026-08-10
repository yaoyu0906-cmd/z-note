"use client";

import { useEffect, useRef } from "react";
import { Copy, ClipboardPaste, Trash2, BringToFront, SendToBack, ChevronUp, ChevronDown } from "lucide-react";

interface CanvasContextMenuProps {
  position: { x: number; y: number };
  hasSelection: boolean;
  canPaste: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (direction: "front" | "back" | "forward" | "backward") => void;
  onSelectAll: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

export function CanvasContextMenu({
  position,
  hasSelection,
  canPaste,
  onClose,
  onDuplicate,
  onDelete,
  onReorder,
  onSelectAll,
  onCopy,
  onPaste,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const item = "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark";
  const itemDisabled = "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-graphite dark:text-graphiteDark opacity-50 cursor-not-allowed";

  return (
    <div
      ref={ref}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 w-48 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1.5"
    >
      {hasSelection ? (
        <>
          <button onClick={() => { onCopy(); onClose(); }} className={item}>
            <Copy size={14} /> Copy
          </button>
          <button onClick={() => { onDuplicate(); onClose(); }} className={item}>
            <Copy size={14} /> Duplicate
          </button>
          <div className="my-1 border-t border-line dark:border-lineDark" />
          <button onClick={() => { onReorder("front"); onClose(); }} className={item}>
            <BringToFront size={14} /> Bring to front
          </button>
          <button onClick={() => { onReorder("forward"); onClose(); }} className={item}>
            <ChevronUp size={14} /> Bring forward
          </button>
          <button onClick={() => { onReorder("backward"); onClose(); }} className={item}>
            <ChevronDown size={14} /> Send backward
          </button>
          <button onClick={() => { onReorder("back"); onClose(); }} className={item}>
            <SendToBack size={14} /> Send to back
          </button>
          <div className="my-1 border-t border-line dark:border-lineDark" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 size={14} /> Delete
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { onSelectAll(); onClose(); }} className={item}>
            Select all
          </button>
          <button
            onClick={() => { if (canPaste) { onPaste(); onClose(); } }}
            className={canPaste ? item : itemDisabled}
            disabled={!canPaste}
          >
            <ClipboardPaste size={14} /> Paste
          </button>
        </>
      )}
    </div>
  );
}
