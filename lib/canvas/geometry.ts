import type { CanvasCamera, CanvasElement, Point } from "@/lib/canvas/types";

export function screenToCanvas(camera: CanvasCamera, screenX: number, screenY: number): Point {
  return { x: screenX / camera.zoom + camera.x, y: screenY / camera.zoom + camera.y };
}

export function canvasToScreen(camera: CanvasCamera, canvasX: number, canvasY: number): Point {
  return { x: (canvasX - camera.x) * camera.zoom, y: (canvasY - camera.y) * camera.zoom };
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getElementBounds(el: CanvasElement): Bounds {
  if (el.type === "arrow" || el.type === "line" || el.type === "freehand" || el.type === "highlighter") {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    // Guarantee a non-zero hit area for perfectly horizontal/vertical strokes.
    const pad = Math.max(el.strokeWidth, 6);
    return { x: minX - pad / 2, y: minY - pad / 2, width: Math.max(maxX - minX, 1) + pad, height: Math.max(maxY - minY, 1) + pad };
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}

export function getCombinedBounds(elements: CanvasElement[]): Bounds | null {
  if (elements.length === 0) return null;
  const boxes = elements.map(getElementBounds);
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Hit-tests a canvas-space point against an element, respecting each
 *  type's actual shape (not just its bounding box) where practical. */
export function hitTestElement(el: CanvasElement, point: Point): boolean {
  if (el.type === "arrow" || el.type === "line" || el.type === "freehand" || el.type === "highlighter") {
    const threshold = Math.max(el.strokeWidth, 8);
    for (let i = 0; i < el.points.length - 1; i++) {
      if (distanceToSegment(point, el.points[i], el.points[i + 1]) <= threshold) return true;
    }
    return false;
  }

  const { x, y, width, height } = el;
  if (point.x < x || point.x > x + width || point.y < y || point.y > y + height) return false;

  if (el.type === "ellipse") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2 || 1;
    const ry = height / 2 || 1;
    const nx = (point.x - cx) / rx;
    const ny = (point.y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  if (el.type === "diamond") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const nx = Math.abs(point.x - cx) / (width / 2 || 1);
    const ny = Math.abs(point.y - cy) / (height / 2 || 1);
    return nx + ny <= 1;
  }

  // rectangle, text, sticky, image — plain bounding-box hit test
  return true;
}

export function rectsIntersect(a: Bounds, b: Bounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function getResizeHandles(bounds: Bounds): Record<HandleId, Point> {
  const { x, y, width, height } = bounds;
  return {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 },
  };
}

/** Recomputes a bounding box being dragged from one of its 8 handles. */
export function applyResize(original: Bounds, handle: HandleId, dx: number, dy: number): Bounds {
  let { x, y, width, height } = original;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes("w")) {
    x = original.x + dx;
    width = right - x;
  }
  if (handle.includes("e")) {
    width = original.width + dx;
  }
  if (handle.includes("n")) {
    y = original.y + dy;
    height = bottom - y;
  }
  if (handle.includes("s")) {
    height = original.height + dy;
  }

  // Normalize negative sizes (dragged past the opposite edge) instead of
  // flipping the element inside-out.
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }

  return { x, y, width: Math.max(width, 1), height: Math.max(height, 1) };
}

/** Simplifies a freehand point path (Douglas-Peucker-lite via distance
 *  thresholding) so strokes stay smooth without accumulating an unbounded
 *  number of points per pixel of mouse movement. */
export function simplifyPoints(points: Point[], minDistance = 2): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    if (Math.hypot(points[i].x - last.x, points[i].y - last.y) >= minDistance) {
      result.push(points[i]);
    }
  }
  return result;
}

/** Standard even-odd point-in-polygon test — used by the Lasso tool to
 *  decide which elements fall inside a freeform selection loop. */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Whether an element should be considered "inside" a lasso loop — true if
 *  its bounds center is inside the polygon, or (for point-path elements)
 *  if any point along the path is inside it. Center-point testing alone
 *  is the common, simple approach for box elements; path elements get the
 *  extra check since a long line's center can sit outside the loop even
 *  when a real segment of it is clearly inside. */
export function elementInPolygon(el: CanvasElement, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  const bounds = getElementBounds(el);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  if (pointInPolygon(center, polygon)) return true;
  if ("points" in el) {
    return el.points.some((p) => pointInPolygon(p, polygon));
  }
  return false;
}

/** Whether a point-path element (freehand/highlighter) passes within
 *  `radius` of the given canvas-space point — used by the Eraser tool. */
export function pathNearPoint(points: Point[], point: Point, radius: number): boolean {
  if (points.length === 1) return Math.hypot(points[0].x - point.x, points[0].y - point.y) <= radius;
  for (let i = 0; i < points.length - 1; i++) {
    if (distanceToSegment(point, points[i], points[i + 1]) <= radius) return true;
  }
  return false;
}

/** Builds a smooth SVG path string through a set of points using quadratic
 *  curves between successive midpoints — a simple, well-known technique
 *  for turning a raw polyline into a natural-looking stroke. */
export function smoothPathD(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}
