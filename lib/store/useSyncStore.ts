import { create } from "zustand";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { readFile, writeFile } from "@/lib/fs/fileSystemAccess";
import {
  fetchSyncedEntries,
  pushFileEntry,
  pushFolderEntry,
  removeCloudEntry,
  fetchCloudFile,
  fetchCloudUsageBytes,
  CLOUD_QUOTA_BYTES,
  QuotaExceededError,
  type CloudEntry,
} from "@/lib/sync";
import type { Note } from "@/lib/types/note";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "quota-exceeded";

export interface SyncedEntry {
  isFolder: boolean;
}

function entryKey(workspaceId: string, path: string): string {
  return `${workspaceId}::${path}`;
}

/** Pure lookup extracted so components that need to re-render reactively
 *  (like FileTree's cloud badges) can subscribe to `syncedEntries`
 *  directly via the hook and call this, rather than reading `isSynced`
 *  through `getState()` inside a loop — hooks can't be called per-item
 *  in a `.map()`, so the store's own `isSynced` action (below) can't be
 *  used as a per-row hook itself. */
export function computeIsSynced(entries: Record<string, SyncedEntry>, workspaceId: string, path: string): boolean {
  if (entries[entryKey(workspaceId, path)]) return true;
  const segments = path.split("/");
  for (let i = segments.length - 1; i > 0; i--) {
    const ancestor = segments.slice(0, i).join("/");
    const entry = entries[entryKey(workspaceId, ancestor)];
    if (entry?.isFolder) return true;
  }
  return false;
}

interface SyncState {
  /** Keyed by "<workspaceId>::<path>" — every path explicitly marked for
   *  sync (files and folders). A file under a synced *folder* isn't its
   *  own key here; membership is derived via isSynced()'s prefix check
   *  instead, so newly-added files under a synced folder are covered
   *  automatically without having to backfill this map. */
  syncedEntries: Record<string, SyncedEntry>;
  statusByKey: Record<string, SyncStatus>;
  loadedWorkspaces: Record<string, boolean>;

  /** Cloud storage usage — see lib/sync.ts's fetchCloudUsageBytes/
   *  CLOUD_QUOTA_BYTES. quotaMessage is set (account-wide, not per-file)
   *  whenever the most recent push hit the cap, so the UI can show a
   *  clear "storage full" explanation wherever it makes sense — the
   *  account dropdown's usage bar, or right where the sync action was
   *  attempted. */
  usageBytes: number;
  quotaBytes: number;
  quotaMessage: string | null;
  refreshUsage: () => Promise<void>;

  isSynced: (workspaceId: string, path: string) => boolean;
  statusFor: (workspaceId: string, path: string) => SyncStatus;

  /** Pulls the current synced set for a workspace from the cloud — call
   *  once when a workspace opens (and after login) so cloud indicators
   *  and "already synced" state are correct without a separate local
   *  persistence layer; the cloud rows themselves are the source of truth
   *  for "what's marked synced". */
  refreshWorkspace: (workspaceId: string) => Promise<void>;

  syncFile: (workspaceId: string, note: Note) => Promise<void>;
  syncFolder: (workspaceId: string, folderPath: string) => Promise<void>;
  unsync: (workspaceId: string, path: string, isFolder: boolean, opts: { deleteCloud: boolean }) => Promise<void>;

  /** Called after any local save — pushes the new content to the cloud if
   *  (and only if) this note's path is covered by a synced file/folder. */
  pushIfSynced: (workspaceId: string, note: Note, content: string) => Promise<void>;
}

function cloudWorkspaceName(workspaceId: string): string | null {
  return useWorkspaceStore.getState().workspaces.find((w) => w.id === workspaceId)?.name ?? null;
}

/** Reconciles one file against last-write-wins: pushes local content if
 *  it's newer (or there's no cloud copy yet), otherwise pulls the cloud
 *  copy down to disk. Returns the content that ended up "winning", or
 *  null if nothing needed writing either way (already resolved). */
async function reconcileFile(
  note: Note,
  localContent: string,
  cloudWorkspaceNameValue: string,
  existing: CloudEntry | undefined
): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  if (!existing) {
    await pushFileEntry(userId, cloudWorkspaceNameValue, note.path, note.type, localContent);
    return;
  }

  const cloudIsNewer = new Date(existing.updatedAt).getTime() > new Date(note.updatedAt).getTime();
  if (!cloudIsNewer) {
    await pushFileEntry(userId, cloudWorkspaceNameValue, note.path, note.type, localContent);
    return;
  }

  // Cloud copy wins — pull it down to the local file so both sides match.
  const full = await fetchCloudFile(userId, cloudWorkspaceNameValue, note.path);
  if (!full || full.content == null) return;
  const entry = useWorkspaceStore.getState();
  const handle = entry.getFileHandle(note.id);
  if (handle) {
    await writeFile(handle, full.content);
  } else {
    entry.setNoteContent(note.id, full.content);
  }
}

export const useSyncStore = create<SyncState>((set, get) => ({
  syncedEntries: {},
  statusByKey: {},
  loadedWorkspaces: {},
  usageBytes: 0,
  quotaBytes: CLOUD_QUOTA_BYTES,
  quotaMessage: null,

  refreshUsage: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    try {
      const usageBytes = await fetchCloudUsageBytes(userId);
      set({ usageBytes });
    } catch (err) {
      console.error("Failed to load cloud storage usage.", err);
    }
  },

  isSynced: (workspaceId, path) => computeIsSynced(get().syncedEntries, workspaceId, path),

  statusFor: (workspaceId, path) => get().statusByKey[entryKey(workspaceId, path)] ?? "idle",

  refreshWorkspace: async (workspaceId) => {
    const userId = useAuthStore.getState().user?.id;
    const name = cloudWorkspaceName(workspaceId);
    if (!userId || !name) return;
    try {
      const rows = await fetchSyncedEntries(userId, name);
      set((state) => {
        const next = { ...state.syncedEntries };
        for (const row of rows) next[entryKey(workspaceId, row.path)] = { isFolder: row.isFolder };
        return { syncedEntries: next, loadedWorkspaces: { ...state.loadedWorkspaces, [workspaceId]: true } };
      });
    } catch (err) {
      console.error("Failed to load cloud sync state for workspace.", err);
    }
  },

  syncFile: async (workspaceId, note) => {
    const userId = useAuthStore.getState().user?.id;
    const name = cloudWorkspaceName(workspaceId);
    if (!userId || !name) return;
    const key = entryKey(workspaceId, note.path);
    set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "syncing" }, quotaMessage: null }));
    try {
      const handle = useWorkspaceStore.getState().getFileHandle(note.id);
      const localContent = handle
        ? await readFile(handle)
        : useWorkspaceStore.getState().noteContents[note.id] ?? "";
      const existing = await fetchCloudFile(userId, name, note.path);
      await reconcileFile(note, localContent, name, existing ?? undefined);
      set((state) => ({
        syncedEntries: { ...state.syncedEntries, [key]: { isFolder: false } },
        statusByKey: { ...state.statusByKey, [key]: "synced" },
      }));
      get().refreshUsage();
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "quota-exceeded" }, quotaMessage: err.message }));
        return;
      }
      console.error("Failed to sync file to cloud.", err);
      set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "error" } }));
    }
  },

  syncFolder: async (workspaceId, folderPath) => {
    const userId = useAuthStore.getState().user?.id;
    const name = cloudWorkspaceName(workspaceId);
    if (!userId || !name) return;
    const key = entryKey(workspaceId, folderPath);
    set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "syncing" }, quotaMessage: null }));
    try {
      await pushFolderEntry(userId, name, folderPath);
      const descendants = useWorkspaceStore
        .getState()
        .notes.filter((n) => n.workspaceId === workspaceId && (n.path === folderPath || n.path.startsWith(`${folderPath}/`)));

      for (const note of descendants) {
        const handle = useWorkspaceStore.getState().getFileHandle(note.id);
        const localContent = handle
          ? await readFile(handle)
          : useWorkspaceStore.getState().noteContents[note.id] ?? "";
        const existing = await fetchCloudFile(userId, name, note.path);
        await reconcileFile(note, localContent, name, existing ?? undefined);
      }

      set((state) => ({
        syncedEntries: { ...state.syncedEntries, [key]: { isFolder: true } },
        statusByKey: { ...state.statusByKey, [key]: "synced" },
      }));
      get().refreshUsage();
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        // Whatever synced before hitting the cap stays synced (each file
        // is pushed individually) — only the item that tipped it over,
        // and anything after, is left unsynced.
        set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "quota-exceeded" }, quotaMessage: err.message }));
        get().refreshUsage();
        return;
      }
      console.error("Failed to sync folder to cloud.", err);
      set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "error" } }));
    }
  },

  unsync: async (workspaceId, path, isFolder, opts) => {
    const key = entryKey(workspaceId, path);
    if (opts.deleteCloud) {
      const userId = useAuthStore.getState().user?.id;
      const name = cloudWorkspaceName(workspaceId);
      if (userId && name) {
        try {
          await removeCloudEntry(userId, name, path, isFolder);
        } catch (err) {
          console.error("Failed to remove cloud copy.", err);
        }
      }
    }
    set((state) => {
      const entries = { ...state.syncedEntries };
      delete entries[key];
      // A folder's own children were never individual keys (see isSynced),
      // so there's nothing else to clean up here for the folder case.
      const status = { ...state.statusByKey };
      delete status[key];
      return { syncedEntries: entries, statusByKey: status };
    });
  },

  pushIfSynced: async (workspaceId, note, content) => {
    if (!get().isSynced(workspaceId, note.path)) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const userId = useAuthStore.getState().user?.id;
    const name = cloudWorkspaceName(workspaceId);
    if (!userId || !name) return;
    const key = entryKey(workspaceId, note.path);
    set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "syncing" } }));
    try {
      await pushFileEntry(userId, name, note.path, note.type, content);
      set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "synced" } }));
      get().refreshUsage();
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "quota-exceeded" }, quotaMessage: err.message }));
        return;
      }
      console.error("Failed to push save to cloud.", err);
      set((state) => ({ statusByKey: { ...state.statusByKey, [key]: "error" } }));
    }
  },
}));

/** Renames a synced item's cloud path in place (delete + re-push under
 *  the new path) — called after a local move/rename so the cloud copy
 *  doesn't silently go stale under its old path. Best-effort: failures
 *  are logged, not surfaced, since the local move already succeeded and
 *  shouldn't be blocked or rolled back by a cloud hiccup. */
export async function resyncAfterMove(
  workspaceId: string,
  oldPath: string,
  newWorkspaceId: string,
  newPath: string,
  isFolder: boolean
): Promise<void> {
  const store = useSyncStore.getState();
  if (!store.isSynced(workspaceId, oldPath)) return;
  await store.unsync(workspaceId, oldPath, isFolder, { deleteCloud: true });

  if (isFolder) {
    await useSyncStore.getState().syncFolder(newWorkspaceId, newPath);
  } else {
    const note = useWorkspaceStore.getState().notes.find((n) => n.workspaceId === newWorkspaceId && n.path === newPath);
    if (note) await useSyncStore.getState().syncFile(newWorkspaceId, note);
  }
}
