"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CanvasTopBar } from "@/components/editor/canvas/CanvasTopBar";
import { CanvasToolPalette } from "@/components/editor/canvas/CanvasToolPalette";
import { CanvasPropertiesPanel } from "@/components/editor/canvas/CanvasPropertiesPanel";
import { CanvasContextMenu } from "@/components/editor/canvas/CanvasContextMenu";
import { CanvasSurface } from "@/components/editor/canvas/CanvasSurface";
import { CanvasImageViewer } from "@/components/editor/canvas/CanvasImageViewer";
import { useCanvasEditorState, parseCanvasDocument } from "@/lib/canvas/useCanvasEditorState";
import { createImageElement, createFileLinkElement } from "@/lib/canvas/elementFactory";
import { pickFile, getExtension, openLinkedFile, saveFileLinkHandle } from "@/lib/canvas/fileLink";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { isCloudNoteId, pushCloudOnlyNote } from "@/lib/cloudNote";
import { useCloudRealtime } from "@/lib/useCloudRealtime";
import { readFile, writeFile } from "@/lib/fs/fileSystemAccess";
import { eventToKeyString } from "@/lib/keyboard/keyString";
import type { CanvasToolId, FileLinkElement, ImageElement } from "@/lib/canvas/types";
import type { CanvasShortcutAction } from "@/lib/types/shortcuts";
import type { Note } from "@/lib/types/note";

interface CanvasEditorProps {
  note: Note;
  handle?: FileSystemFileHandle;
  initialContent?: string;
}

// Every tool-* Canvas shortcut just switches the active tool; file-link and
// image are handled separately below since they open a file picker instead.
const TOOL_ACTION_TO_TOOL: Partial<Record<CanvasShortcutAction, CanvasToolId>> = {
  "tool-move": "move",
  "tool-lasso": "lasso",
  "tool-pan": "pan",
  "tool-text": "text",
  "tool-sticky": "sticky",
  "tool-rectangle": "rectangle",
  "tool-ellipse": "ellipse",
  "tool-diamond": "diamond",
  "tool-arrow": "arrow",
  "tool-line": "line",
  "tool-freehand": "freehand",
  "tool-highlighter": "highlighter",
  "tool-eraser": "eraser",
  "tool-table": "table",
};

export function CanvasEditor({ note, handle, initialContent }: CanvasEditorProps) {
  const renameNote = useWorkspaceStore((s) => s.renameNote);
  const setNoteContent = useWorkspaceStore((s) => s.setNoteContent);
  const registerSave = useActiveEditorStore((s) => s.registerSave);
  const canvasSettings = useSettingsStore((s) => s.canvasSettings);
  const canvasShortcuts = useSettingsStore((s) => s.canvasShortcuts);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedContent, setLoadedContent] = useState<string | undefined>(initialContent);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<ImageElement | null>(null);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [cloudSaveError, setCloudSaveError] = useState<string | null>(null);

  const initialDocument = useRef(parseCanvasDocument(loadedContent ?? "")).current;
  const state = useCanvasEditorState(initialDocument);
  const {
    tool, setTool, selectedIds, selectedElements, style, setStyle,
    deleteElements, duplicateElements, selectAll, clearSelection, reorder,
    undo, redo, canUndo, canRedo, camera, setCamera, gridEnabled, setGridEnabled,
    zoomAt, resetZoom, addElement, updateElement, isDirty, markSaved, toDocument,
    copySelection, pasteAtPoint, pan, hasClipboard,
  } = state;

  // Load real file content once the handle resolves (mirrors RichNoteEditor/MarkdownEditor).
  useEffect(() => {
    if (!handle) return;
    readFile(handle).then((text) => {
      if (text) setLoadedContent(text);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  // Re-seed the editor state if the loaded content changes after the
  // initial mount (e.g. the handle resolved a moment after first paint,
  // or — for a cloud-only canvas — another device just saved a change).
  const seededRef = useRef(loadedContent);
  useEffect(() => {
    if (loadedContent && loadedContent !== seededRef.current) {
      seededRef.current = loadedContent;
      const doc = parseCanvasDocument(loadedContent);
      state.loadDocument(doc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedContent]);

  // Cloud-only canvases (no local File System Access handle) pick up
  // edits saved from another device live, reusing the same "re-seed on
  // loadedContent change" path above rather than a separate mechanism.
  useCloudRealtime(
    note.id,
    () => JSON.stringify(toDocument()),
    (remoteJson) => setLoadedContent(remoteJson)
  );

  useEffect(() => {
    registerSave(note.id, async () => {
      const json = JSON.stringify(toDocument());
      if (isCloudNoteId(note.id)) {
        const result = await pushCloudOnlyNote(note.id, note.type, json);
        setCloudSaveError(result.ok ? null : result.reason);
        markSaved();
        return;
      }
      if (handle) await writeFile(handle, json);
      else setNoteContent(note.id, json);
      markSaved();
      if (note.workspaceId) useSyncStore.getState().pushIfSynced(note.workspaceId, note, json);
    });
    return () => registerSave(note.id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, note.id, note.workspaceId, note.path, note.type, toDocument, registerSave, setNoteContent, markSaved]);

  // Matches RichNoteEditor's view-mode behavior: no stray selection UI
  // (outline/handles) should persist once editing is disabled.
  useEffect(() => {
    if (mode === "view") clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const viewportCenterCanvasPoint = useCallback(() => {
    const w = containerRef.current?.clientWidth ?? 0;
    const h = containerRef.current?.clientHeight ?? 0;
    return { x: camera.x + w / 2 / camera.zoom, y: camera.y + h / 2 / camera.zoom };
  }, [camera]);

  const handleInsertImage = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChosen = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 320;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const width = img.width * scale;
          const height = img.height * scale;
          addElement(createImageElement(src, viewportCenterCanvasPoint(), width, height));
          setTool("move");
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [addElement, setTool, viewportCenterCanvasPoint]
  );

  const handleInsertFileLink = useCallback(async () => {
    const picked = await pickFile();
    if (!picked) return;
    const fileName = picked.file.name;
    const extension = getExtension(fileName);
    const el = createFileLinkElement(viewportCenterCanvasPoint(), fileName, extension) as FileLinkElement;
    if (picked.handle) {
      try {
        await saveFileLinkHandle(el, picked.handle);
      } catch {
        // IndexedDB unavailable/blocked — the link is still added, it just
        // won't survive a reload without being relocated.
      }
    }
    addElement(el);
    setTool("move");
  }, [addElement, setTool, viewportCenterCanvasPoint]);

  const handleRelocateFileLink = useCallback(
    async (el: FileLinkElement) => {
      const picked = await pickFile();
      if (!picked || !picked.handle) return;
      try {
        await saveFileLinkHandle(el, picked.handle);
      } catch {
        return;
      }
      updateElement(el.id, { fileName: picked.file.name, extension: getExtension(picked.file.name) } as never);
    },
    [updateElement]
  );

  const handleOpenFileLink = useCallback(
    async (el: FileLinkElement) => {
      const result = await openLinkedFile(el);
      if (!result.ok) {
        // Browser sandboxing means a link can outlive access to its target
        // (different session, different machine, permission revoked) — fail
        // quietly rather than throwing, and let the properties panel's
        // "Locate file…" flow recover it.
        handleRelocateFileLink(el);
      }
    },
    [handleRelocateFileLink]
  );

  // Canvas-only keyboard shortcuts, scoped to this editor. Tool/action
  // bindings come from Settings → Canvas (useSettingsStore.canvasShortcuts)
  // rather than a hardcoded map, so every one of them is user-configurable.
  // Ignored while typing in any input/textarea, including the canvas's own
  // inline text- and cell-editing overlays.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    }

    function handleKeyDown(e: KeyboardEvent) {
      // While a text/sticky/table-cell element is being edited, never treat
      // keystrokes as shortcuts — regardless of what document.activeElement
      // reports. Focus on a <textarea>/<input> inside an SVG
      // <foreignObject> isn't always reliably reflected there (a real,
      // observed timing quirk), so this state check is the only fully
      // trustworthy guard here.
      if (state.editingTextId) return;
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const keyString = eventToKeyString(e);
      const action = canvasShortcuts.find((s) => s.keys === keyString)?.id;

      // View mode is read-only: only navigation (zoom, arrow-key pan,
      // Escape) is available — no tool switches or mutations.
      if (mode === "view") {
        if (action === "canvas-zoom-in") {
          e.preventDefault();
          zoomAt({ x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 }, 1.2);
        } else if (action === "canvas-zoom-out") {
          e.preventDefault();
          zoomAt({ x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 }, 1 / 1.2);
        } else if (action === "canvas-reset-zoom") {
          e.preventDefault();
          resetZoom();
        } else if (!mod && canvasSettings.arrowKeyPanEnabled && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          const step = (e.shiftKey ? 3 : 1) * canvasSettings.panAmount;
          // Arrow-key pan moves the camera in the pressed direction (like a
          // scrollbar): Right reveals content further right, so the content
          // itself shifts left on screen — the opposite of the drag-to-pan
          // convention, where content follows the pointer directly.
          const dx = e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0;
          const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
          pan(dx, dy);
        }
        return;
      }

      if (action) {
        switch (action) {
          case "canvas-undo":
            e.preventDefault();
            undo();
            return;
          case "canvas-redo":
            e.preventDefault();
            redo();
            return;
          case "canvas-select-all":
            e.preventDefault();
            selectAll();
            return;
          case "canvas-duplicate":
            e.preventDefault();
            duplicateElements(selectedIds);
            return;
          case "canvas-copy":
            e.preventDefault();
            copySelection(selectedIds);
            return;
          case "canvas-paste":
            e.preventDefault();
            pasteAtPoint(viewportCenterCanvasPoint());
            return;
          case "canvas-zoom-in":
            e.preventDefault();
            zoomAt({ x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 }, 1.2);
            return;
          case "canvas-zoom-out":
            e.preventDefault();
            zoomAt({ x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 }, 1 / 1.2);
            return;
          case "canvas-reset-zoom":
            e.preventDefault();
            resetZoom();
            return;
          case "canvas-delete":
            if (selectedIds.size > 0) {
              e.preventDefault();
              deleteElements(selectedIds);
            }
            return;
          case "tool-image":
            e.preventDefault();
            handleInsertImage();
            return;
          case "tool-file-link":
            e.preventDefault();
            void handleInsertFileLink();
            return;
          default: {
            const nextTool = TOOL_ACTION_TO_TOOL[action];
            if (nextTool) {
              e.preventDefault();
              setTool(nextTool);
            }
          }
        }
        return;
      }

      if (mod) return; // don't swallow other browser/app shortcuts

      if (e.key === "Escape") {
        clearSelection();
        setTool("move");
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          selectedElements.forEach((el) => {
            if ("points" in el) {
              updateElement(el.id, { points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) } as never);
            } else {
              updateElement(el.id, { x: el.x + dx, y: el.y + dy } as never);
            }
          });
        } else if (canvasSettings.arrowKeyPanEnabled) {
          e.preventDefault();
          const step = (e.shiftKey ? 3 : 1) * canvasSettings.panAmount;
          // See the view-mode branch above for why these signs are flipped
          // relative to a plain drag-to-pan.
          const dx = e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0;
          const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
          pan(dx, dy);
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo, redo, selectAll, duplicateElements, selectedIds, selectedElements, deleteElements,
    clearSelection, setTool, updateElement, zoomAt, resetZoom, state.editingTextId,
    canvasShortcuts, canvasSettings, copySelection, pasteAtPoint, viewportCenterCanvasPoint,
    pan, handleInsertImage, handleInsertFileLink, mode,
  ]);

  function handleContextMenu(point: { x: number; y: number }) {
    if (mode === "view") return;
    setContextMenu(point);
  }

  function handleStyleChange(patch: Partial<typeof style>) {
    setStyle((prev) => ({ ...prev, ...patch }));
  }

  function handleElementChange(patch: Record<string, unknown>) {
    selectedElements.forEach((el) => updateElement(el.id, patch as never));
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col border border-line dark:border-lineDark rounded-md overflow-hidden">
      <CanvasTopBar
        note={note}
        onRename={(updates) => renameNote(note.id, updates)}
        mode={mode}
        onModeChange={setMode}
        zoom={camera.zoom}
        onZoomIn={() => zoomAt({ x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 }, 1.2)}
        onZoomOut={() => zoomAt({ x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 }, 1 / 1.2)}
        onResetZoom={resetZoom}
        gridEnabled={gridEnabled}
        onToggleGrid={() => setGridEnabled(!gridEnabled)}
        canUndo={mode === "edit" && canUndo}
        canRedo={mode === "edit" && canRedo}
        onUndo={mode === "edit" ? undo : () => {}}
        onRedo={mode === "edit" ? redo : () => {}}
        isDirty={isDirty}
        cloudSaveError={cloudSaveError}
      />

      <div className="relative flex-1 min-h-0 flex">
        <div className="relative flex-1 min-h-0 min-w-0 bg-paper dark:bg-paperDark">
          {mode === "edit" && (
            <CanvasToolPalette
              tool={tool}
              onSelectTool={setTool}
              onInsertImage={handleInsertImage}
              onInsertFileLink={handleInsertFileLink}
              shortcuts={canvasShortcuts}
            />
          )}
          <CanvasSurface
            state={state}
            settings={canvasSettings}
            readOnly={mode === "view"}
            onContextMenu={handleContextMenu}
            onOpenFileLink={handleOpenFileLink}
            onViewImageFullscreen={setFullscreenImage}
          />
        </div>

        {mode === "edit" && (
          <CanvasPropertiesPanel
            selectedElements={selectedElements}
            style={style}
            onStyleChange={handleStyleChange}
            onElementChange={handleElementChange}
            onReorder={(direction) => reorder(selectedIds, direction)}
            onDelete={() => deleteElements(selectedIds)}
            onViewImageFullscreen={setFullscreenImage}
            onRelocateFileLink={handleRelocateFileLink}
          />
        )}
      </div>

      {contextMenu && mode === "edit" && (
        <CanvasContextMenu
          position={contextMenu}
          hasSelection={selectedIds.size > 0}
          canPaste={hasClipboard}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicateElements(selectedIds)}
          onDelete={() => deleteElements(selectedIds)}
          onReorder={(direction) => reorder(selectedIds, direction)}
          onSelectAll={selectAll}
          onCopy={() => copySelection(selectedIds)}
          onPaste={() => pasteAtPoint(viewportCenterCanvasPoint())}
        />
      )}

      {fullscreenImage && <CanvasImageViewer element={fullscreenImage} onClose={() => setFullscreenImage(null)} />}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChosen} className="hidden" />
    </div>
  );
}
