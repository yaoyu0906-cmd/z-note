"use client";

import { useCallback, useRef, useState } from "react";
import type { CanvasElement, CanvasToolId, Point, TableElement, FileLinkElement, ImageElement } from "@/lib/canvas/types";
import { isPathElement, isTextEditable, isDrawingElement } from "@/lib/canvas/types";
import {
  applyResize,
  elementInPolygon,
  getCombinedBounds,
  getResizeHandles,
  hitTestElement,
  pathNearPoint,
  screenToCanvas,
  simplifyPoints,
  type Bounds,
  type HandleId,
} from "@/lib/canvas/geometry";
import { createBoxElement, createPathElement, type CanvasStyle } from "@/lib/canvas/elementFactory";
import { CanvasElementView } from "@/components/editor/canvas/CanvasElementView";
import type { CanvasEditorState } from "@/lib/canvas/useCanvasEditorState";
import type { CanvasSettings } from "@/lib/store/useSettingsStore";

const GRID_SIZE = 24;
const HANDLE_HIT_RADIUS = 8;
const ERASER_RADIUS = 12;
// Below this many screen pixels of movement, a pointerdown→pointerup on an
// element counts as a "click" rather than a drag — used to distinguish
// "open this File Link" from "I was just repositioning it".
const CLICK_DISTANCE_THRESHOLD = 4;

interface CanvasSurfaceProps {
  state: CanvasEditorState;
  settings: CanvasSettings;
  onContextMenu: (screenPoint: Point) => void;
  onOpenFileLink: (element: FileLinkElement) => void;
  onViewImageFullscreen: (element: ImageElement) => void;
}

type DragMode = "none" | "pan" | "draw-box" | "draw-path" | "move" | "resize" | "lasso" | "erase";

interface DragState {
  mode: DragMode;
  startScreen: Point;
  startCanvas: Point;
  elementId: string | null;
  handle: HandleId | null;
  originalBounds: Bounds | null;
  originalPositions: Map<string, { x: number; y: number; width: number; height: number; points?: Point[] }>;
}

export function CanvasSurface({ state, settings, onContextMenu, onOpenFileLink, onViewImageFullscreen }: CanvasSurfaceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lassoPoints, setLassoPoints] = useState<Point[] | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingCell, setEditingCell] = useState<{ elementId: string; row: number; col: number } | null>(null);
  const [cellEditValue, setCellEditValue] = useState("");
  const erasedThisGesture = useRef<Set<string>>(new Set());
  const drag = useRef<DragState>({
    mode: "none",
    startScreen: { x: 0, y: 0 },
    startCanvas: { x: 0, y: 0 },
    elementId: null,
    handle: null,
    originalBounds: null,
    originalPositions: new Map(),
  });
  const spaceHeld = useRef(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);

  const {
    elements,
    camera,
    gridEnabled,
    tool,
    selectedIds,
    selectedElements,
    editingTextId,
    style,
    setTool,
    setCamera,
    addElement,
    updateElement,
    updateElementLive,
    updateManyLive,
    removeElementsLive,
    selectOnly,
    toggleSelection,
    selectMany,
    clearSelection,
    beginInteraction,
    commitInteraction,
    zoomAt,
    setEditingTextId,
  } = state;

  const getScreenPoint = useCallback((e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const topmostHitAt = useCallback(
    (canvasPoint: Point): CanvasElement | null => {
      for (let i = elements.length - 1; i >= 0; i--) {
        if (hitTestElement(elements[i], canvasPoint)) return elements[i];
      }
      return null;
    },
    [elements]
  );

  const handleHitAt = useCallback(
    (screenPoint: Point): HandleId | null => {
      const box = getCombinedBounds(selectedElements);
      if (!box) return null;
      const handles = getResizeHandles(box);
      for (const [id, point] of Object.entries(handles) as [HandleId, Point][]) {
        const screen = {
          x: (point.x - camera.x) * camera.zoom,
          y: (point.y - camera.y) * camera.zoom,
        };
        if (Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y) <= HANDLE_HIT_RADIUS) return id;
      }
      return null;
    },
    [selectedElements, camera]
  );

  function startTextEdit(el: CanvasElement) {
    if (!isTextEditable(el)) return;
    setEditValue(el.text);
    setEditingTextId(el.id);
  }

  function commitTextEdit() {
    if (editingTextId) {
      updateElement(editingTextId, { text: editValue } as Partial<CanvasElement>);
    }
    setEditingTextId(null);
  }

  function commitCellEdit() {
    if (!editingCell) return;
    const table = elements.find((e) => e.id === editingCell.elementId);
    if (table && table.type === "table") {
      const cells = table.cells.map((row) => [...row]);
      cells[editingCell.row][editingCell.col] = cellEditValue;
      updateElement(editingCell.elementId, { cells } as Partial<CanvasElement>);
    }
    setEditingCell(null);
  }

  function tableCellAt(tableEl: TableElement, canvasPoint: Point): { row: number; col: number } {
    const localX = canvasPoint.x - tableEl.x;
    const localY = canvasPoint.y - tableEl.y;
    const col = Math.min(tableEl.cols - 1, Math.max(0, Math.floor((localX / tableEl.width) * tableEl.cols)));
    const row = Math.min(tableEl.rows - 1, Math.max(0, Math.floor((localY / tableEl.height) * tableEl.rows)));
    return { row, col };
  }

  function eraseNear(canvasPoint: Point) {
    const hits = elements.filter((el) => isDrawingElement(el) && pathNearPoint(el.points, canvasPoint, ERASER_RADIUS / camera.zoom));
    if (hits.length === 0) return;
    hits.forEach((el) => erasedThisGesture.current.add(el.id));
    removeElementsLive(new Set(hits.map((el) => el.id)));
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (editingTextId) commitTextEdit();
      if (editingCell) commitCellEdit();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const screen = getScreenPoint(e);
      const canvasPoint = screenToCanvas(camera, screen.x, screen.y);

      // Middle-click on an image opens the fullscreen viewer instead of
      // panning; middle-click anywhere else still pans as before.
      if (e.button === 1) {
        const hit = topmostHitAt(canvasPoint);
        if (hit && hit.type === "image") {
          onViewImageFullscreen(hit);
          return;
        }
      }

      // Middle-click, space-held, or the dedicated pan tool always pans.
      if (e.button === 1 || spaceHeld.current || tool === "pan") {
        drag.current = { ...drag.current, mode: "pan", startScreen: screen, startCanvas: canvasPoint, elementId: null, handle: null, originalBounds: null, originalPositions: new Map() };
        return;
      }

      if (tool === "eraser") {
        erasedThisGesture.current = new Set();
        beginInteraction();
        drag.current = { mode: "erase", startScreen: screen, startCanvas: canvasPoint, elementId: null, handle: null, originalBounds: null, originalPositions: new Map() };
        eraseNear(canvasPoint);
        return;
      }

      if (tool === "lasso") {
        setLassoPoints([canvasPoint]);
        drag.current = { mode: "lasso", startScreen: screen, startCanvas: canvasPoint, elementId: null, handle: null, originalBounds: null, originalPositions: new Map() };
        return;
      }

      if (tool === "move") {
        const handle = selectedElements.length > 0 ? handleHitAt(screen) : null;
        if (handle) {
          const box = getCombinedBounds(selectedElements)!;
          beginInteraction();
          drag.current = {
            mode: "resize",
            startScreen: screen,
            startCanvas: canvasPoint,
            elementId: selectedElements.length === 1 ? selectedElements[0].id : null,
            handle,
            originalBounds: box,
            originalPositions: new Map(
              selectedElements.map((el) => [
                el.id,
                { x: el.x, y: el.y, width: el.width, height: el.height, points: isPathElement(el) ? el.points : undefined },
              ])
            ),
          };
          return;
        }

        const hit = topmostHitAt(canvasPoint);
        if (hit) {
          if (e.shiftKey) {
            toggleSelection(hit.id);
          } else if (!selectedIds.has(hit.id)) {
            selectOnly(hit.id);
          }
          beginInteraction();
          const idsToMove = e.shiftKey || selectedIds.has(hit.id) ? new Set([...selectedIds, hit.id]) : new Set([hit.id]);
          drag.current = {
            mode: "move",
            startScreen: screen,
            startCanvas: canvasPoint,
            elementId: hit.id,
            handle: null,
            originalBounds: null,
            originalPositions: new Map(
              elements
                .filter((el) => idsToMove.has(el.id))
                .map((el) => [
                  el.id,
                  { x: el.x, y: el.y, width: el.width, height: el.height, points: isPathElement(el) ? el.points : undefined },
                ])
            ),
          };
        } else {
          // Move tool no longer marquee-selects over empty space — dragging
          // empty space pans instead (multi-select now lives in Lasso).
          if (!e.shiftKey) clearSelection();
          drag.current = { mode: "pan", startScreen: screen, startCanvas: canvasPoint, elementId: null, handle: null, originalBounds: null, originalPositions: new Map() };
        }
        return;
      }

      // Drawing tools
      if (tool === "text" || tool === "sticky") {
        const el = createBoxElement(tool, canvasPoint, style);
        if (el) {
          addElement(el);
          commitInteraction(); // no-op push, but keeps history consistent
          if (settings.switchToMoveAfterTool) setTool("move");
          startTextEdit(el);
        }
        return;
      }

      if (tool === "rectangle" || tool === "ellipse" || tool === "diamond" || tool === "table") {
        const el = createBoxElement(tool, canvasPoint, style);
        if (!el) return;
        beginInteraction();
        addElement(el);
        drag.current = { mode: "draw-box", startScreen: screen, startCanvas: canvasPoint, elementId: el.id, handle: "se", originalBounds: { x: canvasPoint.x, y: canvasPoint.y, width: 0, height: 0 }, originalPositions: new Map() };
        return;
      }

      if (tool === "line" || tool === "arrow" || tool === "freehand" || tool === "highlighter") {
        const el = createPathElement(tool, canvasPoint, style);
        beginInteraction();
        addElement(el);
        drag.current = { mode: "draw-path", startScreen: screen, startCanvas: canvasPoint, elementId: el.id, handle: null, originalBounds: null, originalPositions: new Map() };
        return;
      }
    },
    [
      camera, tool, spaceHeld, selectedElements, selectedIds, elements, style, editingTextId, editingCell,
      settings.switchToMoveAfterTool, getScreenPoint, handleHitAt, topmostHitAt, beginInteraction, commitInteraction,
      addElement, toggleSelection, selectOnly, clearSelection, setTool, onViewImageFullscreen,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      if (d.mode === "none") return;
      const screen = getScreenPoint(e);
      const canvasPoint = screenToCanvas(camera, screen.x, screen.y);

      if (d.mode === "pan") {
        const dxScreen = screen.x - d.startScreen.x;
        const dyScreen = screen.y - d.startScreen.y;
        setCamera((prev) => ({ ...prev, x: prev.x - dxScreen / prev.zoom, y: prev.y - dyScreen / prev.zoom }));
        drag.current = { ...d, startScreen: screen };
        return;
      }

      if (d.mode === "erase") {
        eraseNear(canvasPoint);
        return;
      }

      if (d.mode === "lasso") {
        setLassoPoints((prev) => (prev ? [...prev, canvasPoint] : [canvasPoint]));
        return;
      }

      if (d.mode === "move") {
        const dx = canvasPoint.x - d.startCanvas.x;
        const dy = canvasPoint.y - d.startCanvas.y;
        const patches = new Map<string, Partial<CanvasElement>>();
        d.originalPositions.forEach((orig, id) => {
          if (orig.points) {
            patches.set(id, { points: orig.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) } as Partial<CanvasElement>);
          } else {
            patches.set(id, { x: orig.x + dx, y: orig.y + dy } as Partial<CanvasElement>);
          }
        });
        updateManyLive(patches);
        return;
      }

      if (d.mode === "draw-box" && d.elementId) {
        const next = applyResize(d.originalBounds!, "se", canvasPoint.x - d.startCanvas.x, canvasPoint.y - d.startCanvas.y);
        updateElementLive(d.elementId, next as Partial<CanvasElement>);
        return;
      }

      if (d.mode === "draw-path" && d.elementId) {
        const current = elements.find((el) => el.id === d.elementId);
        if (!current || !isPathElement(current)) return;
        if (current.type === "freehand" || current.type === "highlighter") {
          const points = simplifyPoints([...current.points, canvasPoint]);
          updateElementLive(d.elementId, { points } as Partial<CanvasElement>);
        } else {
          updateElementLive(d.elementId, { points: [d.startCanvas, canvasPoint] } as Partial<CanvasElement>);
        }
        return;
      }

      if (d.mode === "resize" && d.originalBounds) {
        const dx = canvasPoint.x - d.startCanvas.x;
        const dy = canvasPoint.y - d.startCanvas.y;
        const newBox = applyResize(d.originalBounds, d.handle!, dx, dy);
        const scaleX = d.originalBounds.width === 0 ? 1 : newBox.width / d.originalBounds.width;
        const scaleY = d.originalBounds.height === 0 ? 1 : newBox.height / d.originalBounds.height;
        const patches = new Map<string, Partial<CanvasElement>>();
        d.originalPositions.forEach((orig, id) => {
          if (orig.points) {
            const points = orig.points.map((p) => ({
              x: d.originalBounds!.x + (p.x - d.originalBounds!.x) * scaleX,
              y: d.originalBounds!.y + (p.y - d.originalBounds!.y) * scaleY,
            }));
            patches.set(id, { points } as Partial<CanvasElement>);
          } else {
            patches.set(id, {
              x: newBox.x + (orig.x - d.originalBounds!.x) * scaleX,
              y: newBox.y + (orig.y - d.originalBounds!.y) * scaleY,
              width: orig.width * scaleX,
              height: orig.height * scaleY,
            } as Partial<CanvasElement>);
          }
        });
        updateManyLive(patches);
      }
    },
    [camera, elements, getScreenPoint, setCamera, updateManyLive, updateElementLive]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      const screen = getScreenPoint(e);
      const moveDistance = Math.hypot(screen.x - d.startScreen.x, screen.y - d.startScreen.y);

      if (d.mode === "draw-box" && d.elementId) {
        const el = elements.find((e2) => e2.id === d.elementId);
        if (el && el.width < 4 && el.height < 4 && el.type !== "table") {
          updateElement(d.elementId, { width: 100, height: el.type === "diamond" ? 80 : 60 } as Partial<CanvasElement>, { history: false });
        }
        commitInteraction();
        // Drawings intentionally aren't auto-selected — no selection box
        // pops up immediately after drawing; select it afterward (via
        // Move or Lasso) to see one.
        clearSelection();
        if (settings.switchToMoveAfterTool) setTool("move");
      } else if (d.mode === "draw-path" && d.elementId) {
        commitInteraction();
        clearSelection();
        if (settings.switchToMoveAfterTool) setTool("move");
      } else if (d.mode === "move") {
        if (d.elementId && moveDistance < CLICK_DISTANCE_THRESHOLD) {
          const el = elements.find((e2) => e2.id === d.elementId);
          if (el && el.type === "file-link") {
            commitInteraction();
            onOpenFileLink(el as FileLinkElement);
            drag.current = { mode: "none", startScreen: { x: 0, y: 0 }, startCanvas: { x: 0, y: 0 }, elementId: null, handle: null, originalBounds: null, originalPositions: new Map() };
            return;
          }
        }
        commitInteraction();
      } else if (d.mode === "resize") {
        commitInteraction();
      } else if (d.mode === "erase") {
        if (erasedThisGesture.current.size > 0) commitInteraction();
        erasedThisGesture.current = new Set();
      } else if (d.mode === "lasso") {
        if (lassoPoints && lassoPoints.length > 2) {
          const hits = elements.filter((el) => elementInPolygon(el, lassoPoints)).map((el) => el.id);
          if (e.shiftKey) selectMany([...selectedIds, ...hits]);
          else selectMany(hits);
        }
        setLassoPoints(null);
      }
      drag.current = { mode: "none", startScreen: { x: 0, y: 0 }, startCanvas: { x: 0, y: 0 }, elementId: null, handle: null, originalBounds: null, originalPositions: new Map() };
    },
    [elements, commitInteraction, setTool, clearSelection, updateElement, settings.switchToMoveAfterTool, getScreenPoint, lassoPoints, selectMany, selectedIds, onOpenFileLink]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const screen = getScreenPoint(e);
      const canvasPoint = screenToCanvas(camera, screen.x, screen.y);
      const hit = topmostHitAt(canvasPoint);
      if (!hit) return;
      if (hit.type === "table") {
        selectOnly(hit.id);
        const { row, col } = tableCellAt(hit, canvasPoint);
        setEditingCell({ elementId: hit.id, row, col });
        setCellEditValue(hit.cells[row]?.[col] ?? "");
        return;
      }
      if (isTextEditable(hit)) {
        selectOnly(hit.id);
        startTextEdit(hit);
      }
    },
    [camera, getScreenPoint, topmostHitAt, selectOnly]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const screen = getScreenPoint(e);
      // Wheel always zooms now — panning is done by dragging empty space
      // (Move tool) or the arrow keys, not the scroll wheel.
      const factor = Math.exp(-e.deltaY * 0.01);
      zoomAt(screen, factor);
    },
    [getScreenPoint, zoomAt]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      const screen = getScreenPoint(e);
      const canvasPoint = screenToCanvas(camera, screen.x, screen.y);
      const hit = topmostHitAt(canvasPoint);
      if (hit && !selectedIds.has(hit.id)) selectOnly(hit.id);
      onContextMenu({ x: e.clientX, y: e.clientY });
    },
    [camera, getScreenPoint, topmostHitAt, selectedIds, selectOnly, onContextMenu]
  );

  // Space bar = temporary pan mode, without changing the active tool.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === "Space" && !spaceHeld.current) {
      spaceHeld.current = true;
      setIsSpacePanning(true);
    }
  }, []);
  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      spaceHeld.current = false;
      setIsSpacePanning(false);
    }
  }, []);

  const selectionBox = getCombinedBounds(selectedElements);
  const handles = selectionBox && tool === "move" ? getResizeHandles(selectionBox) : null;

  const gridOffsetX = ((-camera.x * camera.zoom) % (GRID_SIZE * camera.zoom) + GRID_SIZE * camera.zoom) % (GRID_SIZE * camera.zoom);
  const gridOffsetY = ((-camera.y * camera.zoom) % (GRID_SIZE * camera.zoom) + GRID_SIZE * camera.zoom) % (GRID_SIZE * camera.zoom);

  const cursor =
    isSpacePanning || tool === "pan" || drag.current.mode === "pan"
      ? "grab"
      : tool === "move"
        ? "default"
        : tool === "eraser"
          ? "cell"
          : tool === "lasso"
            ? "crosshair"
            : "crosshair";

  return (
    <svg
      ref={svgRef}
      data-canvas-surface
      className="w-full h-full touch-none select-none"
      style={{ cursor }}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <defs>
        <pattern
          id="canvas-grid"
          width={GRID_SIZE * camera.zoom}
          height={GRID_SIZE * camera.zoom}
          patternUnits="userSpaceOnUse"
          x={gridOffsetX}
          y={gridOffsetY}
        >
          <circle cx={1} cy={1} r={1} className="fill-graphite dark:fill-graphiteDark" opacity={0.35} />
        </pattern>
        {elements
          .filter((el) => el.type === "arrow")
          .map((el) => (
            <marker
              key={el.id}
              id={`arrowhead-${el.id}`}
              markerWidth={10}
              markerHeight={10}
              refX={8}
              refY={5}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L10,5 L0,10 Z" fill={el.strokeColor} />
            </marker>
          ))}
      </defs>

      {gridEnabled && <rect x={0} y={0} width="100%" height="100%" fill="url(#canvas-grid)" />}

      <g transform={`translate(${-camera.x * camera.zoom} ${-camera.y * camera.zoom}) scale(${camera.zoom})`}>
        {elements.map((el) => (
          <CanvasElementView
            key={el.id}
            element={el}
            isEditing={editingTextId === el.id}
            editValue={editValue}
            onEditChange={setEditValue}
            onCommitEdit={commitTextEdit}
            editingCell={editingCell}
            cellEditValue={cellEditValue}
            onCellEditChange={setCellEditValue}
            onCommitCellEdit={commitCellEdit}
            onOpenFileLink={(target) => onOpenFileLink(target as FileLinkElement)}
          />
        ))}

        {/* Selection outline, drawn in the same world-space group so it tracks elements 1:1 */}
        {selectionBox && (
          <rect
            x={selectionBox.x - 4}
            y={selectionBox.y - 4}
            width={selectionBox.width + 8}
            height={selectionBox.height + 8}
            fill="none"
            stroke="currentColor"
            className="text-accent dark:text-accentDark"
            strokeWidth={1.5 / camera.zoom}
            strokeDasharray={selectedElements.length > 1 ? `${4 / camera.zoom} ${3 / camera.zoom}` : undefined}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {lassoPoints && lassoPoints.length > 1 && (
          <polyline
            points={lassoPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            className="text-accent dark:text-accentDark"
            strokeWidth={1.5 / camera.zoom}
            strokeDasharray={`${4 / camera.zoom} ${3 / camera.zoom}`}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </g>

      {/* Resize handles are drawn in screen space (constant pixel size regardless of zoom) */}
      <g>
        {handles &&
          Object.entries(handles).map(([id, point]) => {
            const screen = { x: (point.x - camera.x) * camera.zoom, y: (point.y - camera.y) * camera.zoom };
            return (
              <rect
                key={id}
                x={screen.x - 4}
                y={screen.y - 4}
                width={8}
                height={8}
                className="fill-white dark:fill-surfaceDark stroke-accent dark:stroke-accentDark"
                strokeWidth={1.5}
              />
            );
          })}
      </g>
    </svg>
  );
}
