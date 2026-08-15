"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen as FolderOpenIcon,
  FileText,
  File,
  NotebookText,
  LayoutGrid,
  FilePlus,
  FolderPlus,
  Cloud,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useTabsStore } from "@/lib/store/useTabsStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { useSyncStore, computeIsSynced } from "@/lib/store/useSyncStore";
import { IconButton } from "@/components/ui";
import { FileContextMenu } from "@/components/workspace/FileContextMenu";
import { FolderContextMenu } from "@/components/workspace/FolderContextMenu";
import type { Note } from "@/lib/types/note";
import type { TreeNode } from "@/lib/fs/fileSystemAccess";

const TYPE_ICON: Record<Note["type"], typeof FileText> = {
  md: FileText,
  txt: File,
  note: NotebookText,
  canvas: LayoutGrid,
};

/** What's on the clipboard-ish drag payload — a file (a Note id) or a
 *  whole folder (a workspace + path), draggable between folders and
 *  between different open workspaces. */
type DragPayload =
  | { kind: "file"; noteId: string }
  | { kind: "folder"; workspaceId: string; path: string };

const DRAG_MIME = "application/x-znote-item";

function readDragPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

interface InlineCreate {
  parentPath: string;
}

function InlineCreateRow({
  depth,
  onSubmit,
  onCancel,
}: {
  depth: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => (value.trim() ? onSubmit(value.trim()) : onCancel())}
      onKeyDown={(e) => {
        if (e.key === "Enter") (value.trim() ? onSubmit(value.trim()) : onCancel());
        if (e.key === "Escape") onCancel();
      }}
      placeholder="Folder name"
      style={{ paddingLeft: `${depth * 14 + 28}px` }}
      className="w-full text-sm bg-white dark:bg-surfaceDark border border-accent dark:border-accentDark rounded-sm py-1 pr-2 outline-none text-ink dark:text-inkDark"
    />
  );
}

interface TreeProps {
  workspaceId: string;
  nodes: TreeNode[];
  depth: number;
  notesByPath: Map<string, Note>;
  onContextMenu: (e: React.MouseEvent, note: Note) => void;
  onFolderContextMenu: (e: React.MouseEvent, path: string, name: string) => void;
  creating: InlineCreate | null;
  setCreating: (v: InlineCreate | null) => void;
  onDropInto: (targetPath: string, payload: DragPayload) => void;
}

function Tree({
  workspaceId,
  nodes,
  depth,
  notesByPath,
  onContextMenu,
  onFolderContextMenu,
  creating,
  setCreating,
  onDropInto,
}: TreeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const openTab = useTabsStore((s) => s.openTab);
  const touchRecent = useWorkspaceStore((s) => s.touchRecent);
  const workspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const toggleFolder = useWorkspaceStore((s) => s.toggleFolder);
  const createFolder = useWorkspaceStore((s) => s.createFolder);
  const openNewFileDialog = useUIStore((s) => s.openNewFileDialog);
  const syncedEntries = useSyncStore((s) => s.syncedEntries);
  const expandedFolders = workspace?.expandedFolders ?? {};
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  return (
    <>
      {nodes.map((node) => {
        if (node.kind === "folder") {
          // Root-level folders default open on first paint; deeper ones
          // default collapsed, matching typical explorer expectations.
          const expanded = expandedFolders[node.path] ?? depth === 0;
          const isCreatingHere = creating?.parentPath === node.path;
          const isDragOver = dragOverPath === node.path;

          return (
            <div key={node.path}>
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: "folder", workspaceId, path: node.path }));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverPath(node.path);
                }}
                onDragLeave={() => setDragOverPath((p) => (p === node.path ? null : p))}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverPath(null);
                  const payload = readDragPayload(e);
                  if (payload) onDropInto(node.path, payload);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onFolderContextMenu(e, node.path, node.name);
                }}
                className={`group flex items-center gap-1 pr-1 rounded-sm ${
                  isDragOver
                    ? "bg-accentSoft dark:bg-accentSoftDark ring-1 ring-inset ring-accent dark:ring-accentDark"
                    : "hover:bg-accentSoft dark:hover:bg-accentSoftDark"
                }`}
                style={{ paddingLeft: `${depth * 14 + 4}px` }}
              >
                <button
                  onClick={() => toggleFolder(workspaceId, node.path)}
                  className="flex flex-1 items-center gap-1 py-1 text-sm text-left min-w-0"
                >
                  {expanded ? (
                    <ChevronDown size={13} className="text-graphite dark:text-graphiteDark shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-graphite dark:text-graphiteDark shrink-0" />
                  )}
                  {expanded ? (
                    <FolderOpenIcon size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
                  ) : (
                    <Folder size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
                  )}
                  <span className="truncate text-ink dark:text-inkDark">{node.name}</span>
                  {computeIsSynced(syncedEntries, workspaceId, node.path) && (
                    <Cloud size={11} className="text-accent dark:text-accentDark shrink-0" />
                  )}
                </button>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <IconButton
                    label="New file"
                    onClick={() => {
                      openNewFileDialog({ workspaceId, folderPath: node.path });
                      if (!expanded) toggleFolder(workspaceId, node.path);
                    }}
                  >
                    <FilePlus size={12} />
                  </IconButton>
                  <IconButton
                    label="New folder"
                    onClick={() => {
                      setCreating({ parentPath: node.path });
                      if (!expanded) toggleFolder(workspaceId, node.path);
                    }}
                  >
                    <FolderPlus size={12} />
                  </IconButton>
                </div>
              </div>

              {expanded && (
                <div>
                  {isCreatingHere && (
                    <InlineCreateRow
                      depth={depth + 1}
                      onCancel={() => setCreating(null)}
                      onSubmit={async (name) => {
                        setCreating(null);
                        await createFolder(workspaceId, node.path, name);
                      }}
                    />
                  )}
                  <Tree
                    workspaceId={workspaceId}
                    nodes={node.children}
                    depth={depth + 1}
                    notesByPath={notesByPath}
                    onContextMenu={onContextMenu}
                    onFolderContextMenu={onFolderContextMenu}
                    creating={creating}
                    setCreating={setCreating}
                    onDropInto={onDropInto}
                  />
                </div>
              )}
            </div>
          );
        }

        // File node — look up the corresponding Note (carries tags/title/etc.)
        const note = notesByPath.get(node.path);
        if (!note) return null;
        const Icon = TYPE_ICON[note.type];

        return (
          <button
            key={node.path}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: "file", noteId: note.id }));
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => {
              openTab(note);
              touchRecent(note.id);
              router.push(`${note.type === "canvas" ? "/canvas" : "/note"}/${encodeURIComponent(note.id)}`);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(e, note);
            }}
            style={{ paddingLeft: `${depth * 14 + 24}px` }}
            className="w-full flex items-center gap-2 py-1 pr-2 text-sm text-left hover:bg-accentSoft dark:hover:bg-accentSoftDark rounded-sm"
          >
            <Icon size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
            <span className="truncate text-ink dark:text-inkDark">{note.title}</span>
            {computeIsSynced(syncedEntries, workspaceId, node.path) && (
              <Cloud size={11} className="text-accent dark:text-accentDark shrink-0" />
            )}
          </button>
        );
      })}
    </>
  );
}

interface FileTreeProps {
  workspaceId: string;
}

/** One workspace's Explorer section — real folder hierarchy, expand/
 *  collapse, inline folder creation, a type-and-name dialog for new
 *  files, and drag-and-drop moves (within or across workspaces). */
export function FileTree({ workspaceId }: FileTreeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const notes = useWorkspaceStore((s) => s.notes);
  const workspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId));
  const changeWorkspaceFolder = useWorkspaceStore((s) => s.changeWorkspaceFolder);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const createFolder = useWorkspaceStore((s) => s.createFolder);
  const moveNote = useWorkspaceStore((s) => s.moveNote);
  const moveFolder = useWorkspaceStore((s) => s.moveFolder);
  const openNewFileDialog = useUIStore((s) => s.openNewFileDialog);
  const [contextMenu, setContextMenu] = useState<{ note: Note; x: number; y: number } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<
    { path: string; name: string; x: number; y: number } | null
  >(null);
  // A single piece of state drives inline folder creation at any depth
  // (root included, where parentPath === "").
  const [creating, setCreating] = useState<InlineCreate | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  if (!workspace) return null;

  const notesByPath = new Map(
    notes.filter((n) => n.workspaceId === workspaceId).map((n) => [n.path, n])
  );

  async function handleDrop(targetPath: string, payload: DragPayload) {
    // If the moved note (or something inside a moved folder) was the note
    // currently on screen, follow it to its new id/URL — renameTabId
    // already swapped the tab's id in place, so the tab store's active id
    // reflects the new one right after the move resolves.
    if (payload.kind === "file") {
      const wasActiveRoute = pathname === `/note/${encodeURIComponent(payload.noteId)}`;
      await moveNote(payload.noteId, workspaceId, targetPath);
      if (wasActiveRoute) {
        const activeId = useTabsStore.getState().activeTabByPane.primary;
        if (activeId && activeId !== payload.noteId) router.replace(`/note/${encodeURIComponent(activeId)}`);
      }
    } else {
      const activeIdBefore = useTabsStore.getState().activeTabByPane.primary;
      const wasActiveRoute = activeIdBefore && pathname === `/note/${encodeURIComponent(activeIdBefore)}`;
      await moveFolder({ workspaceId: payload.workspaceId, path: payload.path }, workspaceId, targetPath);
      if (wasActiveRoute) {
        const activeIdAfter = useTabsStore.getState().activeTabByPane.primary;
        if (activeIdAfter && activeIdAfter !== activeIdBefore) {
          router.replace(`/note/${encodeURIComponent(activeIdAfter)}`);
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark truncate">
          {workspace.name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <IconButton label="New file" onClick={() => openNewFileDialog({ workspaceId, folderPath: "" })}>
            <FilePlus size={13} />
          </IconButton>
          <IconButton label="New folder" onClick={() => setCreating({ parentPath: "" })}>
            <FolderPlus size={13} />
          </IconButton>
          <button
            onClick={() => changeWorkspaceFolder(workspaceId)}
            className="text-xs text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark px-1.5 py-0.5 rounded hover:bg-accentSoft dark:hover:bg-accentSoftDark"
          >
            Change folder
          </button>
          <button
            onClick={() => removeWorkspace(workspaceId)}
            aria-label={`Close ${workspace.name} workspace`}
            title="Close workspace"
            className="text-xs text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark px-1 py-0.5 rounded hover:bg-accentSoft dark:hover:bg-accentSoftDark"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setRootDragOver(true);
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setRootDragOver(false);
          const payload = readDragPayload(e);
          if (payload) handleDrop("", payload);
        }}
        className={`border rounded-md overflow-hidden py-1 ${
          rootDragOver
            ? "border-accent dark:border-accentDark ring-1 ring-inset ring-accent dark:ring-accentDark"
            : "border-line dark:border-lineDark"
        }`}
      >
        {creating?.parentPath === "" && (
          <InlineCreateRow
            depth={0}
            onCancel={() => setCreating(null)}
            onSubmit={async (name) => {
              setCreating(null);
              await createFolder(workspaceId, "", name);
            }}
          />
        )}

        {workspace.folderTree && (
          <Tree
            workspaceId={workspaceId}
            nodes={workspace.folderTree.children}
            depth={0}
            notesByPath={notesByPath}
            onContextMenu={(e, note) => setContextMenu({ note, x: e.clientX, y: e.clientY })}
            onFolderContextMenu={(e, path, name) => setFolderContextMenu({ path, name, x: e.clientX, y: e.clientY })}
            creating={creating}
            setCreating={setCreating}
            onDropInto={handleDrop}
          />
        )}

        {workspace.folderTree && workspace.folderTree.children.length === 0 && !creating && (
          <p className="px-3 py-2 text-xs text-graphite dark:text-graphiteDark">
            This folder is empty. Use the buttons above to add a note or subfolder — or drag one in from
            another workspace.
          </p>
        )}
      </div>

      {contextMenu && (
        <FileContextMenu
          note={contextMenu.note}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {folderContextMenu && (
        <FolderContextMenu
          workspaceId={workspaceId}
          path={folderContextMenu.path}
          name={folderContextMenu.name}
          position={{ x: folderContextMenu.x, y: folderContextMenu.y }}
          onClose={() => setFolderContextMenu(null)}
          onRequestCreateFolder={() => setCreating({ parentPath: folderContextMenu.path })}
        />
      )}
    </div>
  );
}
