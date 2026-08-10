/**
 * Canvas data model. Kept deliberately flat and JSON-serializable (this is
 * exactly what gets written to a `.canvas` file) so it's easy to extend
 * later — new element types just add a variant to CanvasElement, new
 * document-level settings just add a field to CanvasDocument.
 */

export type CanvasToolId =
  | "move" // was "select" — pans on empty space, moves/selects a single element on click
  | "lasso" // freeform multi-select
  | "pan"
  | "text"
  | "sticky"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "freehand"
  | "highlighter"
  | "eraser"
  | "table"
  | "file-link"
  | "image";

export interface Point {
  x: number;
  y: number;
}

interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians; not exposed in the UI yet, reserved for later
  strokeColor: string;
  fillColor: string; // "transparent" is a valid value
  strokeWidth: number;
  opacity: number; // 0-1
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  textAlign: "left" | "center" | "right";
}

export interface StickyElement extends BaseElement {
  type: "sticky";
  text: string;
  fontSize: number;
}

export interface ShapeElement extends BaseElement {
  type: "rectangle" | "ellipse" | "diamond";
}

export interface LineElement extends BaseElement {
  type: "arrow" | "line";
  points: Point[]; // absolute canvas coordinates; x/y/width/height are the bounding box
  startArrow: boolean;
  endArrow: boolean;
}

export interface FreehandElement extends BaseElement {
  type: "freehand";
  points: Point[];
}

/** A translucent freehand stroke rendered with a flat cap and a multiply
 *  blend so overlapping strokes darken like a real highlighter, instead of
 *  just stacking flat semi-transparent fills. */
export interface HighlighterElement extends BaseElement {
  type: "highlighter";
  points: Point[];
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string; // data: URL — embedded directly, matching the app's local-first model
}

/** A simple grid of editable text cells. Column/row widths aren't
 *  persisted individually — the grid is always divided evenly across the
 *  element's width/height, which keeps the saved shape simple and the
 *  resize behavior identical to every other box element. */
export interface TableElement extends BaseElement {
  type: "table";
  rows: number;
  cols: number;
  cells: string[][]; // cells[row][col], always rows x cols
}

/** A link to a file on the user's machine. Rendered as a small card;
 *  clicking it opens the file. Because the browser can't persist arbitrary
 *  file access across reloads on its own, `handleKey` points at a
 *  FileSystemFileHandle cached in IndexedDB (see lib/canvas/fileLink.ts) —
 *  the element itself only stores display metadata, so the .canvas JSON
 *  stays plain and portable. */
export interface FileLinkElement extends BaseElement {
  type: "file-link";
  fileName: string;
  extension: string; // lowercase, no leading dot; "" if none
  /** Path relative to the workspace root, when the linked file lives
   *  inside the currently open workspace — used to try to silently
   *  re-resolve the handle on load before falling back to "Locate file…". */
  relPath?: string;
  handleKey: string;
}

export type CanvasElement =
  | TextElement
  | StickyElement
  | ShapeElement
  | LineElement
  | FreehandElement
  | HighlighterElement
  | ImageElement
  | TableElement
  | FileLinkElement;

export interface CanvasCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasDocument {
  version: 1;
  elements: CanvasElement[];
  camera: CanvasCamera;
  gridEnabled: boolean;
  background: string;
}

export const DEFAULT_CAMERA: CanvasCamera = { x: 0, y: 0, zoom: 1 };

export function emptyCanvasDocument(): CanvasDocument {
  return { version: 1, elements: [], camera: { ...DEFAULT_CAMERA }, gridEnabled: true, background: "paper" };
}

/** Element types that hold freeform text the user can double-click to edit. */
export function isTextEditable(el: CanvasElement): el is TextElement | StickyElement {
  return el.type === "text" || el.type === "sticky";
}

/** Element types defined by a point path rather than a width/height box. */
export function isPathElement(el: CanvasElement): el is LineElement | FreehandElement | HighlighterElement {
  return el.type === "arrow" || el.type === "line" || el.type === "freehand" || el.type === "highlighter";
}

/** "Drawings" in the Eraser-tool sense — freehand ink, either plain or
 *  highlighter. Shapes, text, tables, images, and file links are never
 *  erased by the Eraser tool, only deleted explicitly. */
export function isDrawingElement(el: CanvasElement): el is FreehandElement | HighlighterElement {
  return el.type === "freehand" || el.type === "highlighter";
}

export function isTableElement(el: CanvasElement): el is TableElement {
  return el.type === "table";
}

export function isFileLinkElement(el: CanvasElement): el is FileLinkElement {
  return el.type === "file-link";
}

export function isImageElement(el: CanvasElement): el is ImageElement {
  return el.type === "image";
}
