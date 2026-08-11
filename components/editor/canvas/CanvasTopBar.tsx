"use client";

import { Undo2, Redo2, Grid3x3, ZoomIn, ZoomOut, Maximize, Pencil, Eye } from "lucide-react";
import { EditableFilename } from "@/components/editor/EditableFilename";
import { IconButton } from "@/components/ui";
import type { Note } from "@/lib/types/note";

type CanvasMode = "edit" | "view";

interface CanvasTopBarProps {
  note: Note;
  onRename: (updates: { title?: string; path?: string }) => void;
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDirty: boolean;
}

export function CanvasTopBar({
  note,
  onRename,
  mode,
  onModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  gridEnabled,
  onToggleGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
}: CanvasTopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-2 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <EditableFilename title={note.title} path={note.path} type={note.type} onRename={onRename} />
        {isDirty && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent dark:bg-accentDark shrink-0"
            title="Unsaved changes"
          />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton label="Edit mode" active={mode === "edit"} onClick={() => onModeChange("edit")}>
          <Pencil size={15} />
        </IconButton>
        <IconButton label="View mode" active={mode === "view"} onClick={() => onModeChange("view")}>
          <Eye size={15} />
        </IconButton>

        <div className="w-px h-5 bg-line dark:bg-lineDark mx-1" />

        <IconButton label="Undo" onClick={onUndo}>
          <Undo2 size={15} className={canUndo ? "" : "opacity-35"} />
        </IconButton>
        <IconButton label="Redo" onClick={onRedo}>
          <Redo2 size={15} className={canRedo ? "" : "opacity-35"} />
        </IconButton>

        <div className="w-px h-5 bg-line dark:bg-lineDark mx-1" />

        <IconButton label="Toggle grid" onClick={onToggleGrid}>
          <Grid3x3 size={15} className={gridEnabled ? "text-accent dark:text-accentDark" : ""} />
        </IconButton>

        <div className="w-px h-5 bg-line dark:bg-lineDark mx-1" />

        <IconButton label="Zoom out" onClick={onZoomOut}>
          <ZoomOut size={15} />
        </IconButton>
        <button
          onClick={onResetZoom}
          title="Reset view"
          className="text-xs tabular-nums text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark w-11 text-center"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label="Zoom in" onClick={onZoomIn}>
          <ZoomIn size={15} />
        </IconButton>
        <IconButton label="Reset view" onClick={onResetZoom}>
          <Maximize size={14} />
        </IconButton>
      </div>
    </div>
  );
}
