"use client";

import {
  Move,
  Lasso,
  Type,
  StickyNote,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Minus,
  Pencil,
  Highlighter,
  Eraser,
  Table2,
  Link2,
  ImagePlus,
} from "lucide-react";
import type { CanvasToolId } from "@/lib/canvas/types";
import type { CanvasShortcutBinding } from "@/lib/types/shortcuts";

const TOOLS: { id: CanvasToolId; label: string; icon: typeof Move; shortcutId: CanvasShortcutBinding["id"] }[] = [
  { id: "move", label: "Move", icon: Move, shortcutId: "tool-move" },
  { id: "lasso", label: "Lasso", icon: Lasso, shortcutId: "tool-lasso" },
  { id: "text", label: "Text", icon: Type, shortcutId: "tool-text" },
  { id: "sticky", label: "Sticky note", icon: StickyNote, shortcutId: "tool-sticky" },
  { id: "rectangle", label: "Rectangle", icon: Square, shortcutId: "tool-rectangle" },
  { id: "ellipse", label: "Ellipse", icon: Circle, shortcutId: "tool-ellipse" },
  { id: "diamond", label: "Diamond", icon: Diamond, shortcutId: "tool-diamond" },
  { id: "arrow", label: "Arrow", icon: ArrowRight, shortcutId: "tool-arrow" },
  { id: "line", label: "Line", icon: Minus, shortcutId: "tool-line" },
  { id: "freehand", label: "Draw", icon: Pencil, shortcutId: "tool-freehand" },
  { id: "highlighter", label: "Highlighter", icon: Highlighter, shortcutId: "tool-highlighter" },
  { id: "eraser", label: "Eraser", icon: Eraser, shortcutId: "tool-eraser" },
  { id: "table", label: "Table", icon: Table2, shortcutId: "tool-table" },
  { id: "file-link", label: "File link", icon: Link2, shortcutId: "tool-file-link" },
  { id: "image", label: "Image", icon: ImagePlus, shortcutId: "tool-image" },
];

interface CanvasToolPaletteProps {
  tool: CanvasToolId;
  onSelectTool: (tool: CanvasToolId) => void;
  onInsertImage: () => void;
  onInsertFileLink: () => void;
  shortcuts: CanvasShortcutBinding[];
}

export function CanvasToolPalette({ tool, onSelectTool, onInsertImage, onInsertFileLink, shortcuts }: CanvasToolPaletteProps) {
  function shortcutFor(id: CanvasShortcutBinding["id"]): string {
    return shortcuts.find((s) => s.id === id)?.keys ?? "";
  }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 rounded-lg border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-md px-1.5 py-1.5 flex-wrap max-w-[92%]">
      {TOOLS.map(({ id, label, icon: Icon, shortcutId }) => (
        <button
          key={id}
          onClick={() => {
            if (id === "image") onInsertImage();
            else if (id === "file-link") onInsertFileLink();
            else onSelectTool(id);
          }}
          title={`${label} (${shortcutFor(shortcutId)})`}
          aria-label={label}
          aria-pressed={tool === id}
          className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
            tool === id
              ? "bg-accent text-white dark:bg-accentDark dark:text-ink"
              : "text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark hover:text-ink dark:hover:text-inkDark"
          }`}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
