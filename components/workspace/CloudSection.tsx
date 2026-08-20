"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen as FolderOpenIcon,
  FileText,
  File,
  NotebookText,
  LayoutGrid,
  RefreshCw,
  Download,
  CloudOff,
  Cloud as CloudIcon,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { fetchAllCloudEntries, fetchCloudFile, moveCloudEntry, createCloudFile, createCloudFolder, type CloudEntry } from "@/lib/sync";
import { buildCloudNoteId, isFileSystemAccessSupported } from "@/lib/cloudNote";
import { pickSaveLocation, writeFile } from "@/lib/fs/fileSystemAccess";
import { IconButton } from "@/components/ui";
import { CloudContextMenu } from "@/components/workspace/CloudContextMenu";
import { CloudFolderContextMenu } from "@/components/workspace/CloudFolderContextMenu";
import { CloudNewItemDialog } from "@/components/workspace/CloudNewItemDialog";
import type { NoteFileType } from "@/lib/fs/fileSystemAccess";

// Mirrors FileTree's TYPE_ICON — duplicated rather than imported since
// FileTree's version is a private module constant tied to a local Note,
// and this section renders directly from cloud rows instead.
const TYPE_ICON: Record<NoteFileType, typeof FileText> = {
  md: FileText,
  txt: File,
  note: NotebookText,
  canvas: LayoutGrid,
};

interface CloudNode {
  name: string;
  path: string;
  isFolder: boolean;
  fileType: NoteFileType | null;
  children: CloudNode[];
}

interface DragPayload {
  workspaceName: string;
  path: string;
  isFolder: boolean;
}

const DRAG_MIME = "application/x-znote-cloud-item";

function buildTree(entries: CloudEntry[]): CloudNode {
  const root: CloudNode = { name: "", path: "", isFolder: true, fileType: null, children: [] };
  const byPath = new Map<string, CloudNode>([["", root]]);

  for (const entry of entries) {
    const segments = entry.path.split("/");
    let acc = "";
    let parent = root;
    for (let i = 0; i < segments.length; i++) {
      acc = acc ? `${acc}/${segments[i]}` : segments[i];
      const isLast = i === segments.length - 1;
      let node = byPath.get(acc);
      if (!node) {
        node = { name: segments[i], path: acc, isFolder: isLast ? entry.isFolder : true, fileType: isLast ? entry.fileType : null, children: [] };
        byPath.set(acc, node);
        parent.children.push(node);
      } else if (isLast) {
        node.isFolder = entry.isFolder;
        node.fileType = entry.fileType;
      }
      parent = node;
    }
  }
  return root;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Matches the local Explorer's inline folder-creation row (FileTree.tsx's
 *  InlineCreateRow) exactly — same placeholder, same submit/cancel
 *  behavior, same styling — rather than a popup. */
function CloudInlineCreateRow({
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

function CloudFileRow({
  workspaceName,
  node,
  onChanged,
}: {
  workspaceName: string;
  node: CloudNode;
  onChanged: () => void;
}) {
  const router = useRouter();
  const notes = useWorkspaceStore((s) => s.notes);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const localNote = useMemo(() => {
    const localWorkspaceId = workspaces.find((w) => w.name === workspaceName)?.id;
    if (!localWorkspaceId) return null;
    return notes.find((n) => n.workspaceId === localWorkspaceId && n.path === node.path) ?? null;
  }, [notes, workspaces, workspaceName, node.path]);

  const Icon = node.fileType ? TYPE_ICON[node.fileType] : FileText;

  function open() {
    if (localNote) {
      const base = localNote.type === "canvas" ? "/canvas" : "/note";
      router.push(`${base}/${encodeURIComponent(localNote.id)}`);
      return;
    }
    const base = node.fileType === "canvas" ? "/canvas" : "/note";
    router.push(`${base}/${encodeURIComponent(buildCloudNoteId(workspaceName, node.path))}`);
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    setBusy(true);
    try {
      const full = await fetchCloudFile(userId, workspaceName, node.path);
      if (!full || full.content == null) return;
      const picked = await pickSaveLocation(node.name);
      if (!picked) return;
      await writeFile(picked, full.content);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={open}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        draggable
        onDragStart={(e) => {
          const payload: DragPayload = { workspaceName, path: node.path, isFolder: false };
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
          e.dataTransfer.effectAllowed = "move";
        }}
        className="w-full flex items-center gap-1.5 py-1 pr-2 text-sm hover:bg-accentSoft dark:hover:bg-accentSoftDark group"
        style={{ paddingLeft: `${8 + node.path.split("/").length * 12}px` }}
      >
        <Icon size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
        <span className="truncate text-ink dark:text-inkDark flex-1 text-left">{node.name}</span>
        {!localNote && isFileSystemAccessSupported() && (
          <span
            role="button"
            onClick={handleDownload}
            title="Download locally"
            className="opacity-0 group-hover:opacity-100 shrink-0 text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark"
          >
            <Download size={12} className={busy ? "animate-pulse" : ""} />
          </span>
        )}
      </button>

      {menu && (
        <CloudContextMenu
          workspaceName={workspaceName}
          path={node.path}
          name={node.name}
          hasLocalCopy={!!localNote}
          position={menu}
          onClose={() => setMenu(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function CloudFolderRow({
  workspaceName,
  node,
  depth,
  isRoot,
  expanded,
  onToggle,
  onChanged,
  onNewFile,
  onNewFolder,
  creatingFolder,
  onSubmitFolder,
  onCancelFolder,
}: {
  workspaceName: string;
  node: CloudNode;
  depth: number;
  isRoot: boolean;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  onChanged: () => void;
  onNewFile: (workspaceName: string, parentPath: string) => void;
  onNewFolder: (workspaceName: string, parentPath: string) => void;
  creatingFolder: { workspaceName: string; parentPath: string } | null;
  onSubmitFolder: (name: string) => void;
  onCancelFolder: () => void;
}) {
  const isOpen = expanded[node.path] ?? depth === 0;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const isCreatingHere = creatingFolder?.workspaceName === workspaceName && creatingFolder?.parentPath === node.path;

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    if (payload.workspaceName !== workspaceName) return;
    if (payload.path === node.path) return;
    if (payload.isFolder && (node.path === payload.path || node.path.startsWith(`${payload.path}/`))) return;
    const name = basename(payload.path);
    const newPath = node.path ? `${node.path}/${name}` : name;
    if (newPath === payload.path) return;
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    await moveCloudEntry(userId, workspaceName, payload.path, newPath, payload.isFolder);
    onChanged();
  }

  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        draggable={!isRoot}
        onDragStart={(e) => {
          if (isRoot) return;
          const payload: DragPayload = { workspaceName, path: node.path, isFolder: true };
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_MIME)) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`w-full flex items-center gap-1 py-1 pr-2 text-sm hover:bg-accentSoft dark:hover:bg-accentSoftDark ${
          dragOver ? "bg-accentSoft dark:bg-accentSoftDark ring-1 ring-accent dark:ring-accentDark" : ""
        }`}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {isOpen ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
        {isOpen ? (
          <FolderOpenIcon size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
        ) : (
          <Folder size={14} className="text-graphite dark:text-graphiteDark shrink-0" />
        )}
        <span className="truncate text-ink dark:text-inkDark">{node.name}</span>
      </button>

      {menu && (
        <CloudFolderContextMenu
          workspaceName={workspaceName}
          path={node.path}
          name={node.name}
          isRoot={isRoot}
          position={menu}
          onClose={() => setMenu(null)}
          onChanged={onChanged}
          onNewFile={(parentPath) => onNewFile(workspaceName, parentPath)}
          onNewFolder={(parentPath) => onNewFolder(workspaceName, parentPath)}
        />
      )}

      {isOpen && (
        <div>
          {isCreatingHere && <CloudInlineCreateRow depth={depth + 1} onSubmit={onSubmitFolder} onCancel={onCancelFolder} />}
          {node.children.map((child) =>
            child.isFolder ? (
              <CloudFolderRow
                key={child.path}
                workspaceName={workspaceName}
                node={child}
                depth={depth + 1}
                isRoot={false}
                expanded={expanded}
                onToggle={onToggle}
                onChanged={onChanged}
                onNewFile={onNewFile}
                onNewFolder={onNewFolder}
                creatingFolder={creatingFolder}
                onSubmitFolder={onSubmitFolder}
                onCancelFolder={onCancelFolder}
              />
            ) : (
              <CloudFileRow key={child.path} workspaceName={workspaceName} node={child} onChanged={onChanged} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export function CloudSection() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [entries, setEntries] = useState<(CloudEntry & { workspaceName: string })[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState<{ workspaceName: string; parentPath: string } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState<{ workspaceName: string; parentPath: string } | null>(null);

  function refresh() {
    if (!userId) return;
    setLoading(true);
    fetchAllCloudEntries(userId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === "signed-in" && userId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  const syncedEntries = useSyncStore((s) => s.syncedEntries);
  useEffect(() => {
    if (status === "signed-in" && userId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedEntries]);

  if (status !== "signed-in") return null;

  const byWorkspace = new Map<string, (CloudEntry & { workspaceName: string })[]>();
  for (const entry of entries ?? []) {
    const list = byWorkspace.get(entry.workspaceName) ?? [];
    list.push(entry);
    byWorkspace.set(entry.workspaceName, list);
  }

  function toggle(path: string) {
    setExpanded((prev) => ({ ...prev, [path]: !(prev[path] ?? true) }));
  }

  function defaultWorkspaceName(): string {
    const active = workspaces.find((w) => w.id === activeWorkspaceId)?.name;
    if (active) return active;
    const first = [...byWorkspace.keys()][0];
    return first ?? "My Files";
  }

  function startCreatingFolder(workspaceName: string, parentPath: string) {
    setCreatingFolder({ workspaceName, parentPath });
    if (parentPath && !(expanded[parentPath] ?? true)) toggle(parentPath);
  }

  async function submitCreateFolder(name: string) {
    if (!creatingFolder || !userId) return;
    const { workspaceName, parentPath } = creatingFolder;
    setCreatingFolder(null);
    const path = parentPath ? `${parentPath}/${name}` : name;
    await createCloudFolder(userId, workspaceName, path);
    refresh();
  }

  async function handleCreateFile(name: string, fileType: NoteFileType) {
    if (!newItem || !userId) return;
    const path = newItem.parentPath ? `${newItem.parentPath}/${name}` : name;
    await createCloudFile(userId, newItem.workspaceName, path, fileType);
    setNewItem(null);
    refresh();
  }

  return (
    <div className="px-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark flex items-center gap-1.5">
          <CloudIcon size={12} />
          Cloud
        </p>
        <div className="flex items-center gap-0.5">
          <IconButton label="New cloud file" onClick={() => setNewItem({ workspaceName: defaultWorkspaceName(), parentPath: "" })}>
            <FilePlus size={13} />
          </IconButton>
          <IconButton label="New cloud folder" onClick={() => startCreatingFolder(defaultWorkspaceName(), "")}>
            <FolderPlus size={13} />
          </IconButton>
          <IconButton label="Refresh cloud files" onClick={refresh}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </IconButton>
        </div>
      </div>

      <div className="border border-line dark:border-lineDark rounded-md overflow-hidden py-1">
        {creatingFolder?.parentPath === "" && !byWorkspace.has(creatingFolder.workspaceName) && (
          <CloudInlineCreateRow depth={0} onSubmit={submitCreateFolder} onCancel={() => setCreatingFolder(null)} />
        )}
        {entries !== null && byWorkspace.size === 0 && !creatingFolder && (
          <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-graphite dark:text-graphiteDark">
            <CloudOff size={12} className="shrink-0" />
            Nothing synced yet.
          </p>
        )}
        {[...byWorkspace.entries()].map(([workspaceName, wsEntries]) => {
          const tree = buildTree(wsEntries);
          return (
            <CloudFolderRow
              key={workspaceName}
              workspaceName={workspaceName}
              node={{ name: workspaceName, path: "", isFolder: true, fileType: null, children: tree.children }}
              depth={0}
              isRoot
              expanded={expanded}
              onToggle={toggle}
              onChanged={refresh}
              onNewFile={(ws, parentPath) => setNewItem({ workspaceName: ws, parentPath })}
              onNewFolder={startCreatingFolder}
              creatingFolder={creatingFolder}
              onSubmitFolder={submitCreateFolder}
              onCancelFolder={() => setCreatingFolder(null)}
            />
          );
        })}
      </div>

      <CloudNewItemDialog
        open={newItem !== null}
        kind="file"
        onClose={() => setNewItem(null)}
        onCreate={handleCreateFile}
      />
    </div>
  );
}
