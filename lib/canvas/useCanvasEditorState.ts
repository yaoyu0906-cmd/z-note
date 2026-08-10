import { useCallback, useMemo, useRef, useState } from "react";
import type { CanvasCamera, CanvasDocument, CanvasElement, CanvasToolId, Point } from "@/lib/canvas/types";
import { DEFAULT_CAMERA, emptyCanvasDocument, isPathElement } from "@/lib/canvas/types";
import { DEFAULT_STYLE, newElementId, type CanvasStyle } from "@/lib/canvas/elementFactory";
import { getCombinedBounds } from "@/lib/canvas/geometry";

const MAX_HISTORY = 100;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

interface HistorySnapshot {
  elements: CanvasElement[];
}

export function useCanvasEditorState(initialDocument: CanvasDocument) {
  const [elements, setElementsInternal] = useState<CanvasElement[]>(initialDocument.elements);
  const [camera, setCamera] = useState<CanvasCamera>(initialDocument.camera ?? DEFAULT_CAMERA);
  const [gridEnabled, setGridEnabled] = useState(initialDocument.gridEnabled ?? true);
  const [tool, setTool] = useState<CanvasToolId>("move");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [style, setStyle] = useState<CanvasStyle>(DEFAULT_STYLE);
  const [isDirty, setIsDirty] = useState(false);

  const past = useRef<HistorySnapshot[]>([]);
  const future = useRef<HistorySnapshot[]>([]);
  // Avoids pushing a history entry for every intermediate frame of a drag —
  // callers wrap a gesture in beginInteraction()/commitInteraction().
  const interactionStartSnapshot = useRef<HistorySnapshot | null>(null);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const pushHistory = useCallback((snapshot: HistorySnapshot) => {
    past.current.push(snapshot);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
  }, []);

  /** Call at the start of a drag/draw gesture so the whole gesture becomes
   *  a single undo step instead of one step per pointer-move frame. */
  const beginInteraction = useCallback(() => {
    interactionStartSnapshot.current = { elements };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  const commitInteraction = useCallback(() => {
    if (interactionStartSnapshot.current) {
      pushHistory(interactionStartSnapshot.current);
      interactionStartSnapshot.current = null;
    }
  }, [pushHistory]);

  /** For discrete (non-drag) mutations — pushes history immediately. */
  const setElements = useCallback(
    (updater: (prev: CanvasElement[]) => CanvasElement[], opts: { history?: boolean } = { history: true }) => {
      setElementsInternal((prev) => {
        const next = updater(prev);
        if (opts.history !== false) pushHistory({ elements: prev });
        return next;
      });
      markDirty();
    },
    [pushHistory, markDirty]
  );

  /** For continuous mutations during a drag — no history push per call;
   *  pair with beginInteraction/commitInteraction. */
  const setElementsLive = useCallback(
    (updater: (prev: CanvasElement[]) => CanvasElement[]) => {
      setElementsInternal(updater);
      markDirty();
    },
    [markDirty]
  );

  /** For the Eraser tool — removes elements without pushing history per
   *  call (the whole erase gesture is one undo step via
   *  beginInteraction/commitInteraction, same pattern as a drag). */
  const removeElementsLive = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) return;
      setElementsLive((prev) => prev.filter((el) => !ids.has(el.id)));
      setSelectedIds((prev) => {
        if (![...ids].some((id) => prev.has(id))) return prev;
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    },
    [setElementsLive]
  );

  const undo = useCallback(() => {
    setElementsInternal((current) => {
      const snapshot = past.current.pop();
      if (!snapshot) return current;
      future.current.push({ elements: current });
      markDirty();
      return snapshot.elements;
    });
  }, [markDirty]);

  const redo = useCallback(() => {
    setElementsInternal((current) => {
      const snapshot = future.current.pop();
      if (!snapshot) return current;
      past.current.push({ elements: current });
      markDirty();
      return snapshot.elements;
    });
  }, [markDirty]);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const addElement = useCallback(
    (el: CanvasElement) => {
      setElements((prev) => [...prev, el]);
      setSelectedIds(new Set([el.id]));
    },
    [setElements]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>, opts: { history?: boolean } = {}) => {
      setElements(
        (prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as CanvasElement) : el)),
        opts
      );
    },
    [setElements]
  );

  const updateElementLive = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      setElementsLive((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as CanvasElement) : el)));
    },
    [setElementsLive]
  );

  const updateManyLive = useCallback(
    (patches: Map<string, Partial<CanvasElement>>) => {
      setElementsLive((prev) =>
        prev.map((el) => (patches.has(el.id) ? ({ ...el, ...patches.get(el.id) } as CanvasElement) : el))
      );
    },
    [setElementsLive]
  );

  const deleteElements = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) return;
      setElements((prev) => prev.filter((el) => !ids.has(el.id)));
      setSelectedIds(new Set());
    },
    [setElements]
  );

  const duplicateElements = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) return;
      const offset = 16;
      const newIds = new Set<string>();
      setElements((prev) => {
        const toDuplicate = prev.filter((el) => ids.has(el.id));
        const copies = toDuplicate.map((el) => {
          const id = newElementId();
          newIds.add(id);
          if ("points" in el) {
            return { ...el, id, points: el.points.map((p) => ({ x: p.x + offset, y: p.y + offset })) };
          }
          return { ...el, id, x: el.x + offset, y: el.y + offset };
        });
        return [...prev, ...copies];
      });
      setSelectedIds(newIds);
    },
    [setElements]
  );

  // In-memory clipboard — intentionally not synced to the OS clipboard
  // (Canvas elements aren't representable as text/HTML in a way anything
  // else could paste), so Ctrl+C/V here only round-trips within Canvas.
  const clipboard = useRef<CanvasElement[]>([]);
  const [hasClipboard, setHasClipboard] = useState(false);

  const copySelection = useCallback(
    (ids: Set<string>) => {
      const toCopy = elements.filter((el) => ids.has(el.id));
      if (toCopy.length === 0) return;
      // Structural clone so later edits to the live elements never leak
      // into what's sitting in the clipboard.
      clipboard.current = JSON.parse(JSON.stringify(toCopy));
      setHasClipboard(true);
    },
    [elements]
  );

  /** Pastes the clipboard centered on `point` (typically the current
   *  viewport center), preserving every property and assigning fresh ids
   *  so pasted copies never collide with their source. */
  const pasteAtPoint = useCallback(
    (point: Point) => {
      const clip = clipboard.current;
      if (clip.length === 0) return;
      const bounds = getCombinedBounds(clip);
      const centerX = bounds ? bounds.x + bounds.width / 2 : point.x;
      const centerY = bounds ? bounds.y + bounds.height / 2 : point.y;
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const newIds: string[] = [];
      const copies = clip.map((el) => {
        const id = newElementId();
        newIds.push(id);
        if (isPathElement(el)) {
          return { ...el, id, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
        }
        return { ...el, id, x: el.x + dx, y: el.y + dy };
      });
      setElements((prev) => [...prev, ...copies]);
      setSelectedIds(new Set(newIds));
    },
    [setElements]
  );

  const reorder = useCallback(
    (ids: Set<string>, direction: "front" | "back" | "forward" | "backward") => {
      if (ids.size === 0) return;
      setElements((prev) => {
        const selected = prev.filter((el) => ids.has(el.id));
        const rest = prev.filter((el) => !ids.has(el.id));
        if (direction === "front") return [...rest, ...selected];
        if (direction === "back") return [...selected, ...rest];

        // forward/backward: move each selected element one step past its
        // nearest unselected neighbor, preserving relative order.
        const next = [...prev];
        const indices = next.map((el, i) => (ids.has(el.id) ? i : -1)).filter((i) => i !== -1);
        const step = direction === "forward" ? 1 : -1;
        const order = step === 1 ? [...indices].reverse() : indices;
        for (const i of order) {
          const j = i + step;
          if (j < 0 || j >= next.length || ids.has(next[j].id)) continue;
          [next[i], next[j]] = [next[j], next[i]];
        }
        return next;
      });
    },
    [setElements]
  );

  const selectOnly = useCallback((id: string | null) => setSelectedIds(id ? new Set([id]) : new Set()), []);
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectMany = useCallback((ids: string[]) => setSelectedIds(new Set(ids)), []);
  const selectAll = useCallback(() => setSelectedIds(new Set(elements.map((el) => el.id))), [elements]);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const zoomAt = useCallback((screenPoint: { x: number; y: number }, factor: number) => {
    setCamera((prev) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom * factor));
      // Keep the point under the cursor stationary while zooming.
      const worldX = screenPoint.x / prev.zoom + prev.x;
      const worldY = screenPoint.y / prev.zoom + prev.y;
      return { zoom: nextZoom, x: worldX - screenPoint.x / nextZoom, y: worldY - screenPoint.y / nextZoom };
    });
  }, []);

  const resetZoom = useCallback(() => setCamera({ x: 0, y: 0, zoom: 1 }), []);
  const pan = useCallback((dx: number, dy: number) => {
    setCamera((prev) => ({ ...prev, x: prev.x - dx / prev.zoom, y: prev.y - dy / prev.zoom }));
  }, []);

  const selectedElements = useMemo(
    () => elements.filter((el) => selectedIds.has(el.id)),
    [elements, selectedIds]
  );

  const toDocument = useCallback(
    (): CanvasDocument => ({ version: 1, elements, camera, gridEnabled, background: "paper" }),
    [elements, camera, gridEnabled]
  );

  const loadDocument = useCallback((doc: CanvasDocument) => {
    setElementsInternal(doc.elements);
    setCamera(doc.camera ?? DEFAULT_CAMERA);
    setGridEnabled(doc.gridEnabled ?? true);
    past.current = [];
    future.current = [];
    setIsDirty(false);
  }, []);

  return {
    elements,
    camera,
    gridEnabled,
    tool,
    selectedIds,
    selectedElements,
    editingTextId,
    style,
    isDirty,
    canUndo,
    canRedo,
    hasClipboard,

    setTool,
    setCamera,
    setGridEnabled: (v: boolean) => {
      setGridEnabled(v);
      markDirty();
    },
    setStyle,
    setEditingTextId,
    markSaved: () => setIsDirty(false),

    addElement,
    updateElement,
    updateElementLive,
    updateManyLive,
    deleteElements,
    duplicateElements,
    removeElementsLive,
    copySelection,
    pasteAtPoint,
    reorder,
    beginInteraction,
    commitInteraction,
    undo,
    redo,

    selectOnly,
    toggleSelection,
    selectMany,
    selectAll,
    clearSelection,

    zoomAt,
    resetZoom,
    pan,

    toDocument,
    loadDocument,
  };
}

export type CanvasEditorState = ReturnType<typeof useCanvasEditorState>;

export function parseCanvasDocument(raw: string): CanvasDocument {
  if (!raw.trim()) return emptyCanvasDocument();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.elements)) return emptyCanvasDocument();
    return {
      version: 1,
      elements: parsed.elements,
      camera: parsed.camera ?? DEFAULT_CAMERA,
      gridEnabled: parsed.gridEnabled ?? true,
      background: parsed.background ?? "paper",
    };
  } catch {
    return emptyCanvasDocument();
  }
}
