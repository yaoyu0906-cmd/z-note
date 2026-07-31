"use client";

import { useState } from "react";
import { EditableFilename } from "@/components/editor/EditableFilename";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import type { Note } from "@/lib/types/note";

/**
 * Structural placeholder for the .canvas infinite whiteboard.
 * Pan/zoom is faked with CSS transforms on a fixed-size plane; swap in a
 * real canvas engine (e.g. tldraw, or a custom WebGL/Canvas2D renderer)
 * once drawing + object manipulation are in scope. Keeping this as its
 * own component (rather than inline in the route) means that swap won't
 * touch routing, tabs, or the workspace store.
 */
export function CanvasEditor({ note }: { note: Note }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const renameNote = useWorkspaceStore((s) => s.renameNote);

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey) {
      e.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.25, z - e.deltaY * 0.001)));
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-line dark:border-lineDark text-xs text-graphite dark:text-graphiteDark">
        <EditableFilename
          title={note.title}
          path={note.path}
          type={note.type}
          onRename={(updates) => renameNote(note.id, updates)}
        />
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div
        className="flex-1 overflow-hidden bg-[radial-gradient(circle,theme(colors.line)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,theme(colors.lineDark)_1px,transparent_1px)] bg-[length:24px_24px] cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={() => setIsPanning(true)}
        onMouseUp={() => setIsPanning(false)}
        onMouseMove={(e) => {
          if (!isPanning) return;
          setPan((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
        }}
      >
        <div
          className="h-full w-full flex items-center justify-center"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <div className="rounded border border-dashed border-line dark:border-lineDark px-6 py-4 text-sm text-graphite dark:text-graphiteDark bg-white/60 dark:bg-surfaceDark/60">
            Canvas is empty — drawing tools (pen, highlighter, shapes, eraser,
            lasso) mount here once the drawing engine is wired in.
          </div>
        </div>
      </div>
    </div>
  );
}
