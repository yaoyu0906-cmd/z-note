import { create } from "zustand";
import type { Note, Tag, NoteType } from "@/lib/types/note";
import { MOCK_NOTES, MOCK_TAGS } from "@/lib/mock/notes";
import {
  pickDirectory,
  isFileSystemAccessSupported,
  readFile,
  writeFile,
  createFile,
  renameFile,
  getOrCreateSubdirectory,
  buildWorkspaceTree,
  flattenTreeFiles,
  collectFolderHandles,
  getOrCreateNestedDirectory,
  getUniqueName,
  inferType,
  pathDirname,
  pathBasename,
  type OpenFile,
  type TreeFolderNode,
} from "@/lib/fs/fileSystemAccess";
import { saveHandleList, getHandleList, ensurePermission } from "@/lib/fs/handleStore";
import { readWorkspaceMeta, writeWorkspaceMeta, emptyMeta, type WorkspaceMeta } from "@/lib/fs/metaStore";
import { useTabsStore } from "@/lib/store/useTabsStore";

const WORKSPACES_KEY = "open-workspaces";

const WELCOME_HTML = `
  <h1>Welcome to Z-Note</h1>
  <p>This is your Z-Note workspace. Notes you create live right here on disk, in this folder — nothing leaves your device unless you turn on sync.</p>
  <p>Press <code>Ctrl+N</code> for a new note, <code>Ctrl+Shift+N</code> for a quick note, and <code>Ctrl+P</code> to search or run a command any time.</p>
`;

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function newWorkspaceId(): string {
  // crypto.randomUUID is available in every browser this app already
  // requires (File System Access is Chromium-only), so no fallback needed.
  return crypto.randomUUID();
}

/** Note ids must be globally unique now that several workspaces can be
 *  open at once — composed as "<workspaceId>::<relative path>" for real
 *  on-disk notes. In-memory-only notes (canvas, quick notes with no
 *  folder open yet) keep a plain synthetic id and no workspaceId. */
function compositeId(workspaceId: string, path: string): string {
  return `${workspaceId}::${path}`;
}

interface WorkspaceEntry {
  id: string;
  dirHandle: FileSystemDirectoryHandle;
  name: string;
  folderTree: TreeFolderNode | null;
  /** Every folder's directory handle, keyed by its relative path ("" = root). */
  folderHandles: Record<string, FileSystemDirectoryHandle>;
  /** Which folder paths are expanded in this workspace's Explorer section. */
  expandedFolders: Record<string, boolean>;
}

/** Walks a folder, reads (or creates) its `.z-note-meta.json` sidecar for
 *  tags/favorites, and returns everything needed to add it as an open
 *  workspace: the entry itself plus the notes/tags/handles it contributes
 *  to the app's global lists. Shared by every code path that opens a
 *  workspace folder so they can never drift out of sync with each other. */
async function loadWorkspaceContents(dirHandle: FileSystemDirectoryHandle) {
  const tree = await buildWorkspaceTree(dirHandle);
  const folderHandles = collectFolderHandles(tree, dirHandle);

  let meta = await readWorkspaceMeta(dirHandle);
  if (!meta) {
    meta = emptyMeta(newWorkspaceId());
    await writeWorkspaceMeta(dirHandle, meta);
  }
  const workspaceId = meta.workspaceId;

  const files = flattenTreeFiles(tree);
  const fileHandles: Record<string, FileSystemFileHandle> = {};
  const notes: Note[] = files.map((f) => {
    const id = compositeId(workspaceId, f.name);
    fileHandles[id] = f.handle;
    return {
      id,
      title: pathBasename(f.name).replace(/\.(md|txt|note)$/, ""),
      type: f.type,
      path: f.name,
      workspaceId,
      tagIds: meta!.noteTags[f.name] ?? [],
      isFavorite: meta!.favorites.includes(f.name),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasLocalHandle: true,
    };
  });
  const tags: Tag[] = meta.tags.map((t) => ({ ...t, workspaceId }));

  const entry: WorkspaceEntry = {
    id: workspaceId,
    dirHandle,
    name: dirHandle.name,
    folderTree: tree,
    folderHandles,
    expandedFolders: {},
  };

  return { entry, notes, tags, fileHandles };
}

/** Rebuilds ONE workspace's metadata file from the current global state —
 *  called after any tag/favorite change so it's never lost on reload or
 *  when reopening the folder later (in this or any other browser). */
async function persistWorkspaceMeta(workspaceId: string | undefined, state: WorkspaceState) {
  if (!workspaceId) return; // ephemeral (no folder open) — nothing to persist to
  const entry = state.workspaces.find((w) => w.id === workspaceId);
  if (!entry) return;

  const tags = state.tags
    .filter((t) => t.workspaceId === workspaceId)
    .map(({ id, label, color }) => ({ id, label, color }));
  const noteTags: Record<string, string[]> = {};
  const favorites: string[] = [];
  for (const n of state.notes) {
    if (n.workspaceId !== workspaceId) continue;
    if (n.tagIds.length > 0) noteTags[n.path] = n.tagIds;
    if (n.isFavorite) favorites.push(n.path);
  }
  const meta: WorkspaceMeta = { workspaceId, tags, noteTags, favorites };
  await writeWorkspaceMeta(entry.dirHandle, meta);
}

async function persistOpenWorkspaceHandles(state: WorkspaceState) {
  await saveHandleList(WORKSPACES_KEY, state.workspaces.map((w) => w.dirHandle)).catch(() => {});
}

interface WorkspaceState {
  workspaces: WorkspaceEntry[];
  /** Default target workspace for actions that aren't scoped to a specific
   *  Explorer section (New File dialog, Quick Note, Command Palette). */
  activeWorkspaceId: string | null;
  fileHandles: Record<string, FileSystemFileHandle>; // noteId (global) -> handle
  /** In-memory content for notes without a real file yet (e.g. quick notes
   *  saved before any folder was opened). Falls back to disk otherwise. */
  noteContents: Record<string, string>;
  notes: Note[]; // unified list across every open workspace — mock until one is opened
  tags: Tag[]; // tag registry across every open workspace
  activeTagFilter: string | null;
  isSupported: boolean;

  addWorkspace: () => Promise<void>;
  addDefaultWorkspace: () => Promise<void>;
  changeWorkspaceFolder: (workspaceId: string) => Promise<void>;
  removeWorkspace: (workspaceId: string) => Promise<void>;
  restoreWorkspaces: () => Promise<void>;
  refreshWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaceTreeOnly: (workspaceId: string) => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => void;
  getFileHandle: (noteId: string) => FileSystemFileHandle | undefined;
  toggleFolder: (workspaceId: string, path: string) => void;
  createFolder: (workspaceId: string, parentPath: string, name: string) => Promise<void>;
  /** Moves a single note into a folder — same workspace or a different
   *  one. A no-op destination (dropped back where it already was) is
   *  ignored. */
  moveNote: (noteId: string, targetWorkspaceId: string, targetFolderPath: string) => Promise<void>;
  /** Moves an entire folder (and everything inside it, recursively) into
   *  another folder — same workspace or a different one. */
  moveFolder: (
    source: { workspaceId: string; path: string },
    targetWorkspaceId: string,
    targetFolderPath: string
  ) => Promise<void>;

  toggleFavorite: (noteId: string) => void;
  recentNoteIds: string[];
  touchRecent: (noteId: string) => void;

  /** Signature "Quick Note" feature — saves instantly as a real .note, no navigation. */
  addQuickNote: (text: string) => Promise<void>;

  createNote: (title: string, type: NoteType, workspaceId?: string, folderPath?: string) => Promise<Note>;
  renameNote: (noteId: string, updates: { title?: string; path?: string }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  deleteFolder: (workspaceId: string, path: string) => Promise<void>;

  createTag: (label: string, color: string, workspaceId?: string) => string;
  renameTag: (tagId: string, label: string) => void;
  recolorTag: (tagId: string, color: string) => void;
  deleteTag: (tagId: string) => void;
  assignTag: (noteId: string, tagId: string) => void;
  unassignTag: (noteId: string, tagId: string) => void;
  setActiveTagFilter: (tagId: string | null) => void;

  setNoteContent: (noteId: string, content: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  fileHandles: {},
  noteContents: {},
  notes: MOCK_NOTES,
  tags: MOCK_TAGS,
  activeTagFilter: null,
  isSupported: isFileSystemAccessSupported(),
  recentNoteIds: MOCK_NOTES.slice(0, 3).map((n) => n.id),

  addWorkspace: async () => {
    const dirHandle = await pickDirectory({ id: "z-note-workspace" });
    const { entry, notes, tags, fileHandles } = await loadWorkspaceContents(dirHandle);
    set((s) => {
      // First real workspace replaces the demo/mock notes; after that,
      // every additional workspace just adds its own notes alongside.
      const hadRealWorkspace = s.workspaces.length > 0;
      return {
        workspaces: [...s.workspaces.filter((w) => w.id !== entry.id), entry],
        activeWorkspaceId: entry.id,
        notes: [...(hadRealWorkspace ? s.notes : []).filter((n) => n.workspaceId !== entry.id), ...notes],
        tags: [...(hadRealWorkspace ? s.tags : []).filter((t) => t.workspaceId !== entry.id), ...tags],
        fileHandles: { ...s.fileHandles, ...fileHandles },
        recentNoteIds: hadRealWorkspace ? s.recentNoteIds : [],
      };
    });
    await persistOpenWorkspaceHandles(get());
  },

  addDefaultWorkspace: async () => {
    const root = await pickDirectory({ id: "z-note-workspace", startIn: "documents" });
    const zNoteDir = await getOrCreateSubdirectory(root, "Z-Note");
    let { entry, notes, tags, fileHandles } = await loadWorkspaceContents(zNoteDir);
    if (notes.length === 0) {
      const welcomeHandle = await createFile(zNoteDir, "Welcome.note");
      await writeFile(welcomeHandle, WELCOME_HTML);
      ({ entry, notes, tags, fileHandles } = await loadWorkspaceContents(zNoteDir));
    }
    set((s) => {
      const hadRealWorkspace = s.workspaces.length > 0;
      return {
        workspaces: [...s.workspaces.filter((w) => w.id !== entry.id), entry],
        activeWorkspaceId: entry.id,
        notes: [...(hadRealWorkspace ? s.notes : []).filter((n) => n.workspaceId !== entry.id), ...notes],
        tags: [...(hadRealWorkspace ? s.tags : []).filter((t) => t.workspaceId !== entry.id), ...tags],
        fileHandles: { ...s.fileHandles, ...fileHandles },
        recentNoteIds: hadRealWorkspace ? s.recentNoteIds : [],
      };
    });
    await persistOpenWorkspaceHandles(get());
  },

  changeWorkspaceFolder: async (workspaceId) => {
    const dirHandle = await pickDirectory({ id: "z-note-workspace" });
    const { entry, notes, tags, fileHandles } = await loadWorkspaceContents(dirHandle);
    set((s) => ({
      // Swap this slot's folder for a new one. The new folder may carry an
      // entirely different id (ids live in each folder's own metadata
      // file), so drop anything tied to either the old or new id first.
      workspaces: s.workspaces.map((w) => (w.id === workspaceId ? entry : w)),
      notes: [
        ...s.notes.filter((n) => n.workspaceId !== workspaceId && n.workspaceId !== entry.id),
        ...notes,
      ],
      tags: [
        ...s.tags.filter((t) => t.workspaceId !== workspaceId && t.workspaceId !== entry.id),
        ...tags,
      ],
      fileHandles: {
        ...Object.fromEntries(
          Object.entries(s.fileHandles).filter(([id]) => !id.startsWith(`${workspaceId}::`))
        ),
        ...fileHandles,
      },
      activeWorkspaceId: entry.id,
    }));
    // Tabs pointing at the old workspace's notes are now stale.
    useTabsStore.getState().closeTabsMatching((id) => id.startsWith(`${workspaceId}::`));
    await persistOpenWorkspaceHandles(get());
  },

  removeWorkspace: async (workspaceId) => {
    set((s) => ({
      workspaces: s.workspaces.filter((w) => w.id !== workspaceId),
      notes: s.notes.filter((n) => n.workspaceId !== workspaceId),
      tags: s.tags.filter((t) => t.workspaceId !== workspaceId),
      fileHandles: Object.fromEntries(
        Object.entries(s.fileHandles).filter(([id]) => !id.startsWith(`${workspaceId}::`))
      ),
      activeWorkspaceId:
        s.activeWorkspaceId === workspaceId
          ? s.workspaces.find((w) => w.id !== workspaceId)?.id ?? null
          : s.activeWorkspaceId,
    }));
    useTabsStore.getState().closeTabsMatching((id) => id.startsWith(`${workspaceId}::`));
    await persistOpenWorkspaceHandles(get());
  },

  restoreWorkspaces: async () => {
    if (!isFileSystemAccessSupported()) return;
    try {
      const handles = await getHandleList(WORKSPACES_KEY);
      if (handles.length === 0) return;

      const loaded: { entry: WorkspaceEntry; notes: Note[]; tags: Tag[]; fileHandles: Record<string, FileSystemFileHandle> }[] = [];
      for (const handle of handles) {
        try {
          const granted = await ensurePermission(handle);
          if (!granted) continue;
          loaded.push(await loadWorkspaceContents(handle));
        } catch {
          // This one folder is gone or inaccessible — skip it, keep the rest.
        }
      }
      if (loaded.length === 0) return;

      set({
        workspaces: loaded.map((l) => l.entry),
        activeWorkspaceId: loaded[0].entry.id,
        notes: loaded.flatMap((l) => l.notes),
        tags: loaded.flatMap((l) => l.tags),
        fileHandles: Object.assign({}, ...loaded.map((l) => l.fileHandles)),
        recentNoteIds: [],
      });
    } catch {
      // Nothing remembered, or permission silently denied — fall back to
      // the mock/demo state, which is already the default.
    }
  },

  /** Re-walks one workspace's folder from disk. Called after any operation
   *  that adds/removes/renames a file or folder in it so its Explorer
   *  section always mirrors what's actually on disk. */
  refreshWorkspace: async (workspaceId) => {
    const state = get();
    const entry = state.workspaces.find((w) => w.id === workspaceId);
    if (!entry) return;

    const tree = await buildWorkspaceTree(entry.dirHandle);
    const folderHandles = collectFolderHandles(tree, entry.dirHandle);
    const files = flattenTreeFiles(tree);
    const meta = (await readWorkspaceMeta(entry.dirHandle)) ?? emptyMeta(workspaceId);

    const fileHandles: Record<string, FileSystemFileHandle> = {};
    const prevById = new Map(state.notes.map((n) => [n.id, n]));
    const freshNotes: Note[] = files.map((f) => {
      const id = compositeId(workspaceId, f.name);
      fileHandles[id] = f.handle;
      const prev = prevById.get(id);
      return {
        id,
        title: pathBasename(f.name).replace(/\.(md|txt|note)$/, ""),
        type: f.type,
        path: f.name,
        workspaceId,
        tagIds: prev ? prev.tagIds : meta.noteTags[f.name] ?? [],
        isFavorite: prev ? prev.isFavorite : meta.favorites.includes(f.name),
        createdAt: prev ? prev.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasLocalHandle: true,
      };
    });

    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, folderTree: tree, folderHandles } : w
      ),
      notes: [...s.notes.filter((n) => n.workspaceId !== workspaceId), ...freshNotes],
      fileHandles: {
        ...Object.fromEntries(Object.entries(s.fileHandles).filter(([id]) => !id.startsWith(`${workspaceId}::`))),
        ...fileHandles,
      },
    }));
  },

  /** Like refreshWorkspace, but only touches the folder tree — used after a
   *  rename/move, where regenerating `notes` wholesale (which would
   *  reassign ids from the new on-disk paths) would orphan the tab/route
   *  that's currently showing that note. */
  refreshWorkspaceTreeOnly: async (workspaceId) => {
    const entry = get().workspaces.find((w) => w.id === workspaceId);
    if (!entry) return;
    const tree = await buildWorkspaceTree(entry.dirHandle);
    const folderHandles = collectFolderHandles(tree, entry.dirHandle);
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === workspaceId ? { ...w, folderTree: tree, folderHandles } : w)),
    }));
  },

  setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),

  toggleFolder: (workspaceId, path) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, expandedFolders: { ...w.expandedFolders, [path]: !w.expandedFolders[path] } } : w
      ),
    })),

  createFolder: async (workspaceId, parentPath, name) => {
    const safeName = sanitizeFileName(name);
    if (!safeName) return;
    const entry = get().workspaces.find((w) => w.id === workspaceId);
    if (!entry) return;
    await getOrCreateNestedDirectory(entry.dirHandle, parentPath ? `${parentPath}/${safeName}` : safeName);
    await get().refreshWorkspace(workspaceId);
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, expandedFolders: { ...w.expandedFolders, [parentPath]: true } } : w
      ),
    }));
  },

  getFileHandle: (noteId) => get().fileHandles[noteId],

  moveNote: async (noteId, targetWorkspaceId, targetFolderPath) => {
    const state = get();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note || !note.hasLocalHandle || !note.workspaceId) return;
    const sourceEntry = state.workspaces.find((w) => w.id === note.workspaceId);
    const targetEntry = state.workspaces.find((w) => w.id === targetWorkspaceId);
    if (!sourceEntry || !targetEntry) return;

    const sameWorkspace = note.workspaceId === targetWorkspaceId;
    const sourceParentPath = pathDirname(note.path);
    if (sameWorkspace && sourceParentPath === targetFolderPath) return; // dropped back in place

    try {
      const targetDir =
        targetEntry.folderHandles[targetFolderPath] ??
        (await getOrCreateNestedDirectory(targetEntry.dirHandle, targetFolderPath));
      const baseName = pathBasename(note.path);
      const finalName = await getUniqueName(targetDir, baseName, "file");

      const sourceHandle = state.fileHandles[noteId];
      const contents = sourceHandle ? await readFile(sourceHandle) : "";
      const newHandle = await createFile(targetDir, finalName);
      await writeFile(newHandle, contents);

      const sourceParentHandle = sourceEntry.folderHandles[sourceParentPath] ?? sourceEntry.dirHandle;
      await sourceParentHandle.removeEntry(baseName);

      const newPath = targetFolderPath ? `${targetFolderPath}/${finalName}` : finalName;
      const newId = compositeId(targetWorkspaceId, newPath);
      const newTitle = finalName.replace(/\.(md|txt|note)$/, "");

      set((s) => {
        const fileHandles = { ...s.fileHandles };
        delete fileHandles[noteId];
        fileHandles[newId] = newHandle;
        return {
          notes: [
            {
              ...note,
              id: newId,
              path: newPath,
              workspaceId: targetWorkspaceId,
              title: newTitle,
              // Tags are workspace-scoped — moving to a different workspace
              // would leave the note pointing at tags that don't exist there.
              tagIds: sameWorkspace ? note.tagIds : [],
              updatedAt: new Date().toISOString(),
            },
            ...s.notes.filter((n) => n.id !== noteId),
          ],
          fileHandles,
        };
      });

      useTabsStore.getState().renameTabId(noteId, newId, newTitle);
      await get().refreshWorkspaceTreeOnly(sourceEntry.id);
      if (targetEntry.id !== sourceEntry.id) await get().refreshWorkspaceTreeOnly(targetEntry.id);
      await persistWorkspaceMeta(sourceEntry.id, get());
      if (targetEntry.id !== sourceEntry.id) await persistWorkspaceMeta(targetEntry.id, get());
    } catch (err) {
      console.error("Failed to move file.", err);
    }
  },

  moveFolder: async (source, targetWorkspaceId, targetFolderPath) => {
    const state = get();
    const sourceEntry = state.workspaces.find((w) => w.id === source.workspaceId);
    const targetEntry = state.workspaces.find((w) => w.id === targetWorkspaceId);
    if (!sourceEntry || !targetEntry) return;

    // Refuse to move a folder into itself or one of its own descendants.
    if (
      targetWorkspaceId === source.workspaceId &&
      (targetFolderPath === source.path || targetFolderPath.startsWith(`${source.path}/`))
    ) {
      return;
    }
    const sourceParentPath = pathDirname(source.path);
    if (targetWorkspaceId === source.workspaceId && sourceParentPath === targetFolderPath) return;

    const sourceDirHandle = sourceEntry.folderHandles[source.path];
    if (!sourceDirHandle) return;

    try {
      const targetParentDir =
        targetEntry.folderHandles[targetFolderPath] ??
        (await getOrCreateNestedDirectory(targetEntry.dirHandle, targetFolderPath));
      const baseName = pathBasename(source.path);
      const finalName = await getUniqueName(targetParentDir, baseName, "folder");
      const newRootDir = await targetParentDir.getDirectoryHandle(finalName, { create: true });
      const newRootPath = targetFolderPath ? `${targetFolderPath}/${finalName}` : finalName;

      const idMap: { oldId: string; newId: string; newPath: string; newTitle: string }[] = [];
      const newFileHandles: Record<string, FileSystemFileHandle> = {};

      // Recursively copies every file and subfolder into the new location,
      // skipping anything that isn't a recognized note file — matching
      // what the Explorer tree itself shows.
      async function copyRecursive(
        srcDir: FileSystemDirectoryHandle,
        destDir: FileSystemDirectoryHandle,
        srcRelPath: string,
        destRelPath: string
      ) {
        // @ts-expect-error - async iterator typing varies by TS lib version
        for await (const [name, handle] of srcDir.entries()) {
          const childSrcPath = srcRelPath ? `${srcRelPath}/${name}` : name;
          const childDestPath = destRelPath ? `${destRelPath}/${name}` : name;
          if (handle.kind === "directory") {
            const childDestDir = await destDir.getDirectoryHandle(name, { create: true });
            await copyRecursive(handle as FileSystemDirectoryHandle, childDestDir, childSrcPath, childDestPath);
          } else {
            if (!inferType(name)) continue;
            const file = await (handle as FileSystemFileHandle).getFile();
            const contents = await file.text();
            const newFileHandle = await destDir.getFileHandle(name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(contents);
            await writable.close();
            const oldId = compositeId(source.workspaceId, childSrcPath);
            const newId = compositeId(targetWorkspaceId, childDestPath);
            newFileHandles[newId] = newFileHandle;
            idMap.push({ oldId, newId, newPath: childDestPath, newTitle: name.replace(/\.(md|txt|note)$/, "") });
          }
        }
      }

      await copyRecursive(sourceDirHandle, newRootDir, source.path, newRootPath);

      // Only remove the original after every file has been copied successfully.
      const sourceParentHandle = sourceEntry.folderHandles[sourceParentPath] ?? sourceEntry.dirHandle;
      await sourceParentHandle.removeEntry(baseName, { recursive: true });

      const sameWorkspace = targetWorkspaceId === source.workspaceId;
      set((s) => {
        const idMapByOld = new Map(idMap.map((m) => [m.oldId, m]));
        const notes = s.notes.map((n) => {
          const m = idMapByOld.get(n.id);
          if (!m) return n;
          return {
            ...n,
            id: m.newId,
            path: m.newPath,
            workspaceId: targetWorkspaceId,
            title: m.newTitle,
            tagIds: sameWorkspace ? n.tagIds : [],
            updatedAt: new Date().toISOString(),
          };
        });
        const fileHandles = { ...s.fileHandles };
        for (const m of idMap) delete fileHandles[m.oldId];
        Object.assign(fileHandles, newFileHandles);
        return { notes, fileHandles };
      });

      for (const m of idMap) useTabsStore.getState().renameTabId(m.oldId, m.newId, m.newTitle);

      const workspacesToRefresh = new Set([sourceEntry.id, targetEntry.id]);
      for (const id of workspacesToRefresh) await get().refreshWorkspaceTreeOnly(id);
      for (const id of workspacesToRefresh) await persistWorkspaceMeta(id, get());
    } catch (err) {
      console.error("Failed to move folder.", err);
    }
  },

  toggleFavorite: (noteId) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n)),
    }));
    const note = get().notes.find((n) => n.id === noteId);
    persistWorkspaceMeta(note?.workspaceId, get());
  },

  touchRecent: (noteId) =>
    set((state) => ({
      recentNoteIds: [noteId, ...state.recentNoteIds.filter((id) => id !== noteId)].slice(0, 8),
    })),

  addQuickNote: async (text) => {
    const id = `quick-${Date.now()}`;
    const now = new Date().toISOString();
    const title = text.slice(0, 60) || "Untitled quick note";
    const html = `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;

    const state = get();
    const entry = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? state.workspaces[0];
    let path = `${id}.note`;
    let hasLocalHandle = false;
    let noteId = id;
    let workspaceId: string | undefined;

    if (entry) {
      try {
        const quickDir = await getOrCreateSubdirectory(entry.dirHandle, "Quick Notes");
        const fileName = `${sanitizeFileName(title) || id}.note`;
        const handle = await createFile(quickDir, fileName);
        await writeFile(handle, html);
        hasLocalHandle = true;
        path = `Quick Notes/${fileName}`;
        workspaceId = entry.id;
        noteId = compositeId(entry.id, path);
        set((s) => ({ fileHandles: { ...s.fileHandles, [noteId]: handle } }));
      } catch (err) {
        console.error("Failed to write quick note to disk, keeping it in-memory only.", err);
      }
    }

    const note: Note = {
      id: noteId,
      title,
      type: "note",
      path,
      workspaceId,
      tagIds: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      hasLocalHandle,
    };

    set((s) => ({
      notes: [note, ...s.notes],
      noteContents: { ...s.noteContents, [noteId]: html },
    }));
    if (hasLocalHandle && workspaceId) await get().refreshWorkspace(workspaceId);
  },

  createNote: async (title, type, workspaceId, folderPath = "") => {
    const id =
      type === "canvas" ? `canvas-${Date.now()}` : type === "note" ? `note-${Date.now()}` : `md-${Date.now()}`;
    const now = new Date().toISOString();
    const extension = type === "canvas" ? "canvas" : type;
    const state = get();
    const targetWorkspaceId = workspaceId ?? state.activeWorkspaceId ?? undefined;
    const entry = targetWorkspaceId ? state.workspaces.find((w) => w.id === targetWorkspaceId) : undefined;
    let path = `${id}.${extension}`;
    let hasLocalHandle = false;
    let noteId = id;

    if (entry && type !== "canvas") {
      try {
        // Resolve (or create) the target folder so notes can be created
        // directly inside a nested Explorer folder, not just the root.
        const targetDir =
          entry.folderHandles[folderPath] ?? (await getOrCreateNestedDirectory(entry.dirHandle, folderPath));
        const fileName = `${sanitizeFileName(title) || id}.${extension}`;
        const handle = await createFile(targetDir, fileName);
        await writeFile(handle, "");
        hasLocalHandle = true;
        path = folderPath ? `${folderPath}/${fileName}` : fileName;
        noteId = compositeId(entry.id, path);
        set((s) => ({ fileHandles: { ...s.fileHandles, [noteId]: handle } }));
      } catch (err) {
        console.error("Failed to create file on disk, keeping it in-memory only.", err);
      }
    }

    const note: Note = {
      id: noteId,
      title,
      type,
      path,
      workspaceId: hasLocalHandle ? entry?.id : undefined,
      tagIds: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      hasLocalHandle,
    };
    set((s) => ({ notes: [note, ...s.notes.filter((n) => n.id !== noteId)] }));
    if (hasLocalHandle && entry) await get().refreshWorkspace(entry.id);
    return note;
  },

  renameNote: async (noteId, updates) => {
    const state = get();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;
    const entry = note.workspaceId ? state.workspaces.find((w) => w.id === note.workspaceId) : undefined;

    let newPath = updates.path ?? note.path;

    if (note.hasLocalHandle && entry && newPath !== note.path) {
      const oldParentPath = pathDirname(note.path);
      const newParentPath = pathDirname(newPath);
      const newName = pathBasename(newPath);
      try {
        if (oldParentPath === newParentPath) {
          // Simple rename within the same folder.
          const parentHandle = entry.folderHandles[oldParentPath] ?? entry.dirHandle;
          const newHandle = await renameFile(parentHandle, pathBasename(note.path), newName);
          set((s) => ({ fileHandles: { ...s.fileHandles, [noteId]: newHandle } }));
        } else {
          // The target folder changed too — move the file: write its
          // contents into the new folder, then remove the old entry.
          const oldHandle = state.fileHandles[noteId];
          const contents = oldHandle ? await readFile(oldHandle) : "";
          const newParentHandle =
            entry.folderHandles[newParentPath] ?? (await getOrCreateNestedDirectory(entry.dirHandle, newParentPath));
          const newHandle = await createFile(newParentHandle, newName);
          await writeFile(newHandle, contents);
          const oldParentHandle = entry.folderHandles[oldParentPath] ?? entry.dirHandle;
          await oldParentHandle.removeEntry(pathBasename(note.path));
          set((s) => ({ fileHandles: { ...s.fileHandles, [noteId]: newHandle } }));
        }
      } catch (err) {
        console.error("Failed to rename/move file on disk, keeping the old filename.", err);
        newPath = note.path;
      }
    }

    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId
          ? { ...n, title: updates.title ?? n.title, path: newPath, updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    if (note.hasLocalHandle && entry) get().refreshWorkspaceTreeOnly(entry.id);
    if (note.workspaceId) persistWorkspaceMeta(note.workspaceId, get());
  },

  deleteNote: async (noteId) => {
    const state = get();
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;

    if (note.hasLocalHandle && note.workspaceId) {
      const entry = state.workspaces.find((w) => w.id === note.workspaceId);
      if (entry) {
        const parentPath = pathDirname(note.path);
        const parentHandle = entry.folderHandles[parentPath] ?? entry.dirHandle;
        try {
          await parentHandle.removeEntry(pathBasename(note.path));
        } catch (err) {
          console.error("Failed to delete file from disk.", err);
          return;
        }
      }
    }

    set((s) => {
      const fileHandles = { ...s.fileHandles };
      delete fileHandles[noteId];
      return {
        notes: s.notes.filter((n) => n.id !== noteId),
        fileHandles,
        recentNoteIds: s.recentNoteIds.filter((id) => id !== noteId),
      };
    });
    useTabsStore.getState().closeTabsMatching((id) => id === noteId);

    if (note.workspaceId) {
      await get().refreshWorkspaceTreeOnly(note.workspaceId);
      await persistWorkspaceMeta(note.workspaceId, get());
    }
  },

  deleteFolder: async (workspaceId, path) => {
    const state = get();
    const entry = state.workspaces.find((w) => w.id === workspaceId);
    if (!entry) return;

    const parentPath = pathDirname(path);
    const parentHandle = entry.folderHandles[parentPath] ?? entry.dirHandle;
    try {
      await parentHandle.removeEntry(pathBasename(path), { recursive: true });
    } catch (err) {
      console.error("Failed to delete folder from disk.", err);
      return;
    }

    const removedIds = new Set(
      state.notes
        .filter((n) => n.workspaceId === workspaceId && (n.path === path || n.path.startsWith(`${path}/`)))
        .map((n) => n.id)
    );
    set((s) => {
      const fileHandles = { ...s.fileHandles };
      for (const id of removedIds) delete fileHandles[id];
      return {
        notes: s.notes.filter((n) => !removedIds.has(n.id)),
        fileHandles,
        recentNoteIds: s.recentNoteIds.filter((id) => !removedIds.has(id)),
      };
    });
    useTabsStore.getState().closeTabsMatching((id) => removedIds.has(id));

    await get().refreshWorkspaceTreeOnly(workspaceId);
    await persistWorkspaceMeta(workspaceId, get());
  },

  createTag: (label, color, workspaceId) => {
    const targetWorkspaceId = workspaceId ?? get().activeWorkspaceId ?? undefined;
    const id = `tag-${Date.now()}`;
    set((s) => ({ tags: [...s.tags, { id, label, color, workspaceId: targetWorkspaceId }] }));
    persistWorkspaceMeta(targetWorkspaceId, get());
    return id;
  },

  renameTag: (tagId, label) => {
    set((s) => ({ tags: s.tags.map((t) => (t.id === tagId ? { ...t, label } : t)) }));
    const tag = get().tags.find((t) => t.id === tagId);
    persistWorkspaceMeta(tag?.workspaceId, get());
  },

  recolorTag: (tagId, color) => {
    set((s) => ({ tags: s.tags.map((t) => (t.id === tagId ? { ...t, color } : t)) }));
    const tag = get().tags.find((t) => t.id === tagId);
    persistWorkspaceMeta(tag?.workspaceId, get());
  },

  deleteTag: (tagId) => {
    const workspaceId = get().tags.find((t) => t.id === tagId)?.workspaceId;
    set((s) => ({
      tags: s.tags.filter((t) => t.id !== tagId),
      notes: s.notes.map((n) => ({ ...n, tagIds: n.tagIds.filter((id) => id !== tagId) })),
      activeTagFilter: s.activeTagFilter === tagId ? null : s.activeTagFilter,
    }));
    persistWorkspaceMeta(workspaceId, get());
  },

  assignTag: (noteId, tagId) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === noteId && !n.tagIds.includes(tagId) ? { ...n, tagIds: [...n.tagIds, tagId] } : n
      ),
    }));
    const note = get().notes.find((n) => n.id === noteId);
    persistWorkspaceMeta(note?.workspaceId, get());
  },

  unassignTag: (noteId, tagId) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === noteId ? { ...n, tagIds: n.tagIds.filter((id) => id !== tagId) } : n)),
    }));
    const note = get().notes.find((n) => n.id === noteId);
    persistWorkspaceMeta(note?.workspaceId, get());
  },

  setActiveTagFilter: (tagId) => set({ activeTagFilter: tagId }),

  setNoteContent: (noteId, content) =>
    set((s) => ({ noteContents: { ...s.noteContents, [noteId]: content } })),
}));
