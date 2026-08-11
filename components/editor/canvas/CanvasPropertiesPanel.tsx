"use client";

import { useState } from "react";
import {
  AlignLeft, AlignCenter, AlignRight, BringToFront, SendToBack, ChevronUp, ChevronDown,
  Trash2, Maximize2, FolderSearch, Plus, Minus,
} from "lucide-react";
import type { CanvasElement, TableElement, FileLinkElement, ImageElement } from "@/lib/canvas/types";
import { isTextEditable } from "@/lib/canvas/types";
import type { CanvasStyle } from "@/lib/canvas/elementFactory";
import { CATPPUCCIN_MOCHA_COLORS } from "@/lib/editor/catppuccinMocha";
import { ColorPicker } from "@/components/editor/ColorPicker";

// Canvas reuses the exact same Catppuccin Mocha palette offered for
// `.note` text color (see lib/editor/catppuccinMocha.ts), instead of its
// own arbitrary swatch set, so the two color pickers always stay in sync.
const STROKE_SWATCHES = [...CATPPUCCIN_MOCHA_COLORS.map((c) => c.hex), "transparent"];
const FILL_SWATCHES = ["transparent", ...CATPPUCCIN_MOCHA_COLORS.map((c) => c.hex), "#FFFFFF"];

interface CanvasPropertiesPanelProps {
  selectedElements: CanvasElement[];
  style: CanvasStyle;
  onStyleChange: (patch: Partial<CanvasStyle>) => void;
  onElementChange: (patch: Partial<CanvasElement>) => void;
  onReorder: (direction: "front" | "back" | "forward" | "backward") => void;
  onDelete: () => void;
  onViewImageFullscreen: (element: ImageElement) => void;
  onRelocateFileLink: (element: FileLinkElement) => void;
}

function Swatch({ color, active, onClick, title }: { color: string; active: boolean; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title ?? color}
      aria-label={title ?? color}
      className={`h-6 w-6 rounded-full border ${active ? "ring-2 ring-accent dark:ring-accentDark ring-offset-1 ring-offset-white dark:ring-offset-surfaceDark" : "border-line dark:border-lineDark"}`}
      style={{
        background:
          color === "transparent"
            ? "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 8px 8px"
            : color,
      }}
    />
  );
}

/** Resizes a table's cell grid to a new row/col count, preserving whatever
 *  text already exists in cells that still fall inside the new bounds. */
function resizeTableCells(table: TableElement, rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => table.cells[r]?.[c] ?? ""));
}

export function CanvasPropertiesPanel({
  selectedElements,
  style,
  onStyleChange,
  onElementChange,
  onReorder,
  onDelete,
  onViewImageFullscreen,
  onRelocateFileLink,
}: CanvasPropertiesPanelProps) {
  const [strokePickerOpen, setStrokePickerOpen] = useState(false);
  const [fillPickerOpen, setFillPickerOpen] = useState(false);
  const [tableTextColorPickerOpen, setTableTextColorPickerOpen] = useState(false);

  const hasSelection = selectedElements.length > 0;
  const single = selectedElements.length === 1 ? selectedElements[0] : null;

  // When multiple elements are selected we still edit via onElementChange,
  // which the parent applies to every selected element.
  const effective = single ?? {
    strokeColor: style.strokeColor,
    fillColor: style.fillColor,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
  };

  const showFill =
    !hasSelection ||
    selectedElements.some((el) => !["arrow", "line", "freehand", "highlighter", "file-link"].includes(el.type));
  // Table cell text reuses the same font-size control as text/sticky
  // elements; only the alignment buttons stay text-only (tables don't
  // have a textAlign field — cells are always left-aligned).
  const showFontSize = single && (isTextEditable(single) || single.type === "table");
  const showTextAlign = single?.type === "text";
  const showTableTextColor = single?.type === "table";
  const showStroke = !hasSelection || selectedElements.some((el) => el.type !== "image");
  const showTableControls = single?.type === "table";
  const showImageControls = single?.type === "image";
  const showFileLinkControls = single?.type === "file-link";

  function patch(p: Partial<CanvasElement>) {
    if (hasSelection) onElementChange(p);
    else onStyleChange(p as Partial<CanvasStyle>);
  }

  function changeTableSize(table: TableElement, rows: number, cols: number) {
    const clampedRows = Math.max(1, Math.min(20, rows));
    const clampedCols = Math.max(1, Math.min(12, cols));
    onElementChange({ rows: clampedRows, cols: clampedCols, cells: resizeTableCells(table, clampedRows, clampedCols) } as Partial<CanvasElement>);
  }

  return (
    <div className="w-56 shrink-0 border-l border-line dark:border-lineDark bg-white dark:bg-surfaceDark overflow-y-auto zn-scroll p-3 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark">
        {hasSelection ? `${selectedElements.length} selected` : "Style"}
      </p>

      {showStroke && (
        <div className="space-y-1.5">
          <p className="text-xs text-graphite dark:text-graphiteDark">Stroke</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {STROKE_SWATCHES.map((c) => (
              <Swatch key={c} color={c} active={effective.strokeColor === c} onClick={() => patch({ strokeColor: c })} />
            ))}
            <button
              onClick={() => setStrokePickerOpen(true)}
              title="Custom color"
              className="h-6 w-6 rounded-full border border-dashed border-graphite dark:border-graphiteDark flex items-center justify-center text-[10px] text-graphite dark:text-graphiteDark"
            >
              +
            </button>
          </div>
          <ColorPicker
            open={strokePickerOpen}
            onClose={() => setStrokePickerOpen(false)}
            currentColor={effective.strokeColor}
            onSelect={(hex) => patch({ strokeColor: hex })}
            onClear={() => patch({ strokeColor: STROKE_SWATCHES[0] })}
          />
        </div>
      )}

      {showFill && (
        <div className="space-y-1.5">
          <p className="text-xs text-graphite dark:text-graphiteDark">Fill</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {FILL_SWATCHES.map((c) => (
              <Swatch key={c} color={c} active={effective.fillColor === c} onClick={() => patch({ fillColor: c })} />
            ))}
            <button
              onClick={() => setFillPickerOpen(true)}
              title="Custom color"
              className="h-6 w-6 rounded-full border border-dashed border-graphite dark:border-graphiteDark flex items-center justify-center text-[10px] text-graphite dark:text-graphiteDark"
            >
              +
            </button>
          </div>
          <ColorPicker
            open={fillPickerOpen}
            onClose={() => setFillPickerOpen(false)}
            currentColor={effective.fillColor}
            onSelect={(hex) => patch({ fillColor: hex })}
            onClear={() => patch({ fillColor: "transparent" })}
          />
        </div>
      )}

      {showStroke && (
        <div className="space-y-1.5">
          <p className="text-xs text-graphite dark:text-graphiteDark">Stroke width</p>
          <input
            type="range"
            min={1}
            max={single?.type === "highlighter" ? 40 : 12}
            value={effective.strokeWidth}
            onChange={(e) => patch({ strokeWidth: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs text-graphite dark:text-graphiteDark">Opacity</p>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={effective.opacity}
          onChange={(e) => patch({ opacity: Number(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      {showFontSize && single && (isTextEditable(single) || single.type === "table") && (
        <div className="space-y-1.5">
          <p className="text-xs text-graphite dark:text-graphiteDark">Text</p>
          <input
            type="range"
            min={10}
            max={64}
            value={single.fontSize}
            onChange={(e) => onElementChange({ fontSize: Number(e.target.value) } as Partial<CanvasElement>)}
            className="w-full accent-accent"
          />
          {showTextAlign && (
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => {
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                const isActive = single.type === "text" && single.textAlign === align;
                return (
                  <button
                    key={align}
                    onClick={() => onElementChange({ textAlign: align } as Partial<CanvasElement>)}
                    className={`flex-1 flex items-center justify-center h-7 rounded border ${
                      isActive
                        ? "border-accent text-accent dark:border-accentDark dark:text-accentDark"
                        : "border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
                    }`}
                  >
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showTableTextColor && single?.type === "table" && (
        <div className="space-y-1.5">
          <p className="text-xs text-graphite dark:text-graphiteDark">Text color</p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {STROKE_SWATCHES.filter((c) => c !== "transparent").map((c) => (
              <Swatch key={c} color={c} active={single.textColor === c} onClick={() => onElementChange({ textColor: c } as Partial<CanvasElement>)} />
            ))}
            <button
              onClick={() => setTableTextColorPickerOpen(true)}
              title="Custom color"
              className="h-6 w-6 rounded-full border border-dashed border-graphite dark:border-graphiteDark flex items-center justify-center text-[10px] text-graphite dark:text-graphiteDark"
            >
              +
            </button>
          </div>
          <ColorPicker
            open={tableTextColorPickerOpen}
            onClose={() => setTableTextColorPickerOpen(false)}
            currentColor={single.textColor}
            onSelect={(hex) => onElementChange({ textColor: hex } as Partial<CanvasElement>)}
            onClear={() => onElementChange({ textColor: STROKE_SWATCHES[0] } as Partial<CanvasElement>)}
          />
        </div>
      )}

      {showTableControls && single?.type === "table" && (
        <div className="space-y-1.5 pt-2 border-t border-line dark:border-lineDark">
          <p className="text-xs text-graphite dark:text-graphiteDark">Table</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-graphite dark:text-graphiteDark w-10">Rows</span>
            <button onClick={() => changeTableSize(single, single.rows - 1, single.cols)} className="h-6 w-6 flex items-center justify-center rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <Minus size={12} />
            </button>
            <span className="text-xs text-ink dark:text-inkDark w-4 text-center">{single.rows}</span>
            <button onClick={() => changeTableSize(single, single.rows + 1, single.cols)} className="h-6 w-6 flex items-center justify-center rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <Plus size={12} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-graphite dark:text-graphiteDark w-10">Cols</span>
            <button onClick={() => changeTableSize(single, single.rows, single.cols - 1)} className="h-6 w-6 flex items-center justify-center rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <Minus size={12} />
            </button>
            <span className="text-xs text-ink dark:text-inkDark w-4 text-center">{single.cols}</span>
            <button onClick={() => changeTableSize(single, single.rows, single.cols + 1)} className="h-6 w-6 flex items-center justify-center rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <Plus size={12} />
            </button>
          </div>
          <p className="text-[10px] text-graphite dark:text-graphiteDark">Double-click a cell to edit it.</p>
        </div>
      )}

      {showImageControls && single?.type === "image" && (
        <div className="space-y-1.5 pt-2 border-t border-line dark:border-lineDark">
          <button
            onClick={() => onViewImageFullscreen(single)}
            className="w-full flex items-center justify-center gap-1.5 h-7 rounded border border-line dark:border-lineDark text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark text-xs"
          >
            <Maximize2 size={13} /> View fullscreen
          </button>
          <p className="text-[10px] text-graphite dark:text-graphiteDark">Middle-click the image to do this too.</p>
        </div>
      )}

      {showFileLinkControls && single?.type === "file-link" && (
        <div className="space-y-1.5 pt-2 border-t border-line dark:border-lineDark">
          <p className="text-xs text-graphite dark:text-graphiteDark truncate" title={single.fileName}>{single.fileName}</p>
          <button
            onClick={() => onRelocateFileLink(single)}
            className="w-full flex items-center justify-center gap-1.5 h-7 rounded border border-line dark:border-lineDark text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark text-xs"
          >
            <FolderSearch size={13} /> Locate file…
          </button>
          <p className="text-[10px] text-graphite dark:text-graphiteDark">
            If this link stops opening (e.g. after reloading in a browser without persistent file access), relocate it here.
          </p>
        </div>
      )}

      {hasSelection && (
        <div className="space-y-1.5 pt-2 border-t border-line dark:border-lineDark">
          <p className="text-xs text-graphite dark:text-graphiteDark">Arrange</p>
          <div className="grid grid-cols-4 gap-1">
            <button onClick={() => onReorder("front")} title="Bring to front" className="flex items-center justify-center h-7 rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <BringToFront size={13} />
            </button>
            <button onClick={() => onReorder("forward")} title="Bring forward" className="flex items-center justify-center h-7 rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <ChevronUp size={13} />
            </button>
            <button onClick={() => onReorder("backward")} title="Send backward" className="flex items-center justify-center h-7 rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <ChevronDown size={13} />
            </button>
            <button onClick={() => onReorder("back")} title="Send to back" className="flex items-center justify-center h-7 rounded border border-line dark:border-lineDark text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark">
              <SendToBack size={13} />
            </button>
          </div>
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-1.5 h-7 rounded border border-line dark:border-lineDark text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}

      {!hasSelection && (
        <p className="text-[11px] text-graphite dark:text-graphiteDark pt-2 border-t border-line dark:border-lineDark">
          Select an element to see its properties, or pick a tool above to start drawing.
        </p>
      )}
    </div>
  );
}
