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
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { fetchAllCloudEntries, fetchCloudFile, type CloudEntry } from "@/lib/sync";
import { buildCloudNoteId, isFileSystemAccessSupported } from "@/lib/cloudNote";
import { pickSaveLocation, writeFile } from "@/lib/fs/fileSystemAccess";
import { IconButton } from "@/components/ui";
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
        // Ancestor folders are synthesized on the fly when a lone file was
        // synced without its parent folder ever being explicitly synced —
        // syncFile() only writes a row for that one file.
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

function CloudFileRow({ workspaceName, node }: { workspaceName: string; node: CloudNode }) {
  const router = useRouter();
  const notes = useWorkspaceStore((s) => s.notes);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [busy, setBusy] = useState(false);

  // If this exact file already has a local copy (same workspace name +
  // path), open that instead of a cloud-only view — one file shouldn't
  // fork into two independently-edited copies when a perfectly good local
  // one already exists.
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
    <button
      onClick={open}
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
  );
}

function CloudFolderRow({
  workspaceName,
  node,
  depth,
  expanded,
  onToggle,
}: {
  workspaceName: string;
  node: CloudNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
}) {
  const isOpen = expanded[node.path] ?? depth === 0;
  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        className="w-full flex items-center gap-1 py-1 pr-2 text-sm hover:bg-accentSoft dark:hover:bg-accentSoftDark"
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
      {isOpen && (
        <div>
          {node.children.map((child) =>
            child.isFolder ? (
              <CloudFolderRow key={child.path} workspaceName={workspaceName} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
            ) : (
              <CloudFileRow key={child.path} workspaceName={workspaceName} node={child} />
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
  const [entries, setEntries] = useState<(CloudEntry & { workspaceName: string })[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  // Also refresh whenever a sync action elsewhere completes, so a file
  // synced from the Explorer shows up here without a manual reload.
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

  return (
    <div className="px-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-graphite dark:text-graphiteDark flex items-center gap-1.5">
          <CloudIcon size={12} />
          Cloud
        </p>
        <IconButton label="Refresh cloud files" onClick={refresh}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </IconButton>
      </div>

      <div className="border border-line dark:border-lineDark rounded-md overflow-hidden py-1">
        {entries !== null && byWorkspace.size === 0 && (
          <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-graphite dark:text-graphiteDark">
            <CloudOff size={12} className="shrink-0" />
            Nothing synced yet.
          </p>
        )}
        {[...byWorkspace.entries()].map(([workspaceName, wsEntries]) => {
          const tree = buildTree(wsEntries);
          return (
            <div key={workspaceName}>
              <CloudFolderRow
                workspaceName={workspaceName}
                node={{ name: workspaceName, path: "", isFolder: true, fileType: null, children: tree.children }}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
