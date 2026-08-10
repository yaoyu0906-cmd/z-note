import type { CanvasElement, CanvasToolId, Point } from "@/lib/canvas/types";

export function newElementId(): string {
  return `el-${crypto.randomUUID()}`;
}

/** Default style carried forward for newly-drawn shapes — kept as a plain
 *  object (not per-tool) so "last used style" could easily be wired in
 *  later without changing this factory's shape. Colors default to the
 *  same Catppuccin Mocha palette offered for `.note` text (see
 *  lib/editor/catppuccinMocha.ts / components/editor/ColorPicker.tsx) so
 *  Canvas reuses the app's one color system instead of a separate one. */
export interface CanvasStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
}

export const DEFAULT_STYLE: CanvasStyle = {
  strokeColor: "#cba6f7", // Catppuccin Mocha — Mauve
  fillColor: "transparent",
  strokeWidth: 2,
  opacity: 1,
  fontSize: 16,
};

/** Default highlighter color/opacity — a translucent Catppuccin Mocha
 *  Yellow, close to a real highlighter pen, with a custom color still
 *  available via the same picker used everywhere else in Canvas. */
export const DEFAULT_HIGHLIGHTER_COLOR = "#f9e2af"; // Catppuccin Mocha — Yellow
export const DEFAULT_HIGHLIGHTER_OPACITY = 0.4;
export const DEFAULT_HIGHLIGHTER_WIDTH = 16;

const DEFAULT_TABLE_ROWS = 3;
const DEFAULT_TABLE_COLS = 3;

/** Creates a zero-size element at a point for tools that draw by dragging
 *  (shapes, text, sticky, table) — the caller resizes it as the drag
 *  continues. Path-based tools (line/arrow/freehand/highlighter) are
 *  created via createPathElement instead, since they're defined by
 *  points, not a box. Image and file-link are inserted via a file
 *  picker, not drag-drawn, so they return null here. */
export function createBoxElement(
  tool: Exclude<CanvasToolId, "move" | "lasso" | "pan" | "line" | "arrow" | "freehand" | "highlighter" | "eraser" | "file-link">,
  point: Point,
  style: CanvasStyle
): CanvasElement | null {
  const base = {
    id: newElementId(),
    x: point.x,
    y: point.y,
    width: 0,
    height: 0,
    rotation: 0,
    strokeColor: style.strokeColor,
    fillColor: style.fillColor,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
  };

  switch (tool) {
    case "rectangle":
    case "ellipse":
    case "diamond":
      return { ...base, type: tool };
    case "text":
      return { ...base, type: "text", text: "", fontSize: style.fontSize, textAlign: "left", width: 160, height: style.fontSize * 1.4 };
    case "sticky":
      return { ...base, type: "sticky", text: "", fontSize: style.fontSize, fillColor: "#f9e2af", width: 180, height: 180 };
    case "table":
      return {
        ...base,
        type: "table",
        fillColor: "transparent",
        width: 240,
        height: 120,
        rows: DEFAULT_TABLE_ROWS,
        cols: DEFAULT_TABLE_COLS,
        cells: Array.from({ length: DEFAULT_TABLE_ROWS }, () => Array.from({ length: DEFAULT_TABLE_COLS }, () => "")),
      };
    case "image":
      return null; // images are inserted via file picker, not drag-drawn
    default:
      return null;
  }
}

export function createPathElement(
  tool: "line" | "arrow" | "freehand" | "highlighter",
  point: Point,
  style: CanvasStyle
): CanvasElement {
  const isHighlighter = tool === "highlighter";
  return {
    id: newElementId(),
    type: tool,
    x: point.x,
    y: point.y,
    width: 0,
    height: 0,
    rotation: 0,
    strokeColor: isHighlighter ? style.strokeColor : style.strokeColor,
    fillColor: "transparent",
    strokeWidth: isHighlighter ? Math.max(style.strokeWidth, DEFAULT_HIGHLIGHTER_WIDTH) : style.strokeWidth,
    opacity: isHighlighter ? DEFAULT_HIGHLIGHTER_OPACITY : style.opacity,
    points: [point],
    startArrow: false,
    endArrow: tool === "arrow",
  } as CanvasElement;
}

export function createImageElement(src: string, point: Point, width: number, height: number): CanvasElement {
  return {
    id: newElementId(),
    type: "image",
    x: point.x,
    y: point.y,
    width,
    height,
    rotation: 0,
    strokeColor: "transparent",
    fillColor: "transparent",
    strokeWidth: 0,
    opacity: 1,
    src,
  };
}

/** Storage key used to persist a File Link's FileSystemFileHandle in
 *  IndexedDB (see lib/fs/handleStore.ts) — derived from the element id so
 *  it's always reproducible without needing to store the key twice. */
export function fileLinkHandleKey(id: string): string {
  return `filelink:${id}`;
}

export function createFileLinkElement(
  point: Point,
  fileName: string,
  extension: string,
  relPath?: string
): CanvasElement {
  const id = newElementId();
  return {
    id,
    type: "file-link",
    x: point.x,
    y: point.y,
    width: 220,
    height: 56,
    rotation: 0,
    strokeColor: "#89b4fa", // Catppuccin Mocha — Blue
    fillColor: "transparent",
    strokeWidth: 1,
    opacity: 1,
    fileName,
    extension,
    relPath,
    handleKey: fileLinkHandleKey(id),
  };
}
