import { createClient } from "@/lib/supabase/client";
import type { NoteFileType } from "@/lib/fs/fileSystemAccess";

/**
 * Cloud sync is opt-in per file/folder (see useSyncStore) and namespaced
 * by the local workspace folder's *name* rather than its internal id —
 * the id is randomly generated per local install and isn't meaningful
 * across devices, but two devices opening "the same" folder (by name)
 * naturally line up under the same cloud prefix. This is a deliberately
 * simple convention, not a guarantee of uniqueness — reasonable for a
 * local-first app where the cloud is a mirror, not the source of truth.
 */

export const CLOUD_QUOTA_BYTES = 2 * 1024 * 1024; // 2 MB per user — intentionally small; this is a mirror, not primary storage.

export class QuotaExceededError extends Error {
  constructor(public usedBytes: number, public quotaBytes: number) {
    super(
      `Cloud storage is full (${formatBytes(usedBytes)} / ${formatBytes(quotaBytes)}). Remove something from the cloud, or turn off sync for a file/folder, before syncing more.`
    );
    this.name = "QuotaExceededError";
  }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Sum of every synced file's content size for this user — the "actual
 *  synced-file usage" the quota is measured against. Folder marker rows
 *  have no content and don't count. 2 MB is small enough that fetching
 *  every content column to sum client-side is cheap; a server-side
 *  aggregate isn't worth the extra RPC function for this cap. */
export async function fetchCloudUsageBytes(userId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("synced_files")
    .select("content")
    .eq("user_id", userId)
    .eq("is_folder", false);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + byteLength((row as { content: string | null }).content ?? ""), 0);
}

export interface CloudEntry {
  path: string;
  isFolder: boolean;
  fileType: NoteFileType | null;
  updatedAt: string;
}

export interface CloudFile extends CloudEntry {
  content: string | null;
}

interface SyncedFileRow {
  path: string;
  is_folder: boolean;
  file_type: NoteFileType | null;
  content: string | null;
  updated_at: string;
}

function rowToEntry(row: SyncedFileRow): CloudFile {
  return { path: row.path, isFolder: row.is_folder, fileType: row.file_type, content: row.content, updatedAt: row.updated_at };
}

/** Every synced path for one workspace (files and folders), without
 *  content — used to build the local "is this synced" set and cloud
 *  indicators without pulling full file bodies. */
export async function fetchSyncedEntries(userId: string, workspaceName: string): Promise<CloudEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("synced_files")
    .select("path, is_folder, file_type, updated_at")
    .eq("user_id", userId)
    .eq("workspace_name", workspaceName);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    path: row.path,
    isFolder: row.is_folder,
    fileType: row.file_type,
    updatedAt: row.updated_at,
  }));
}

/** Every synced file across every workspace for this user — powers the
 *  "browse my cloud files" view on another device. Content is fetched
 *  separately (fetchCloudFile) only when the person actually downloads
 *  one, so this stays lightweight for accounts with a lot synced. */
export async function fetchAllCloudEntries(
  userId: string
): Promise<(CloudEntry & { workspaceName: string })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("synced_files")
    .select("workspace_name, path, is_folder, file_type, updated_at")
    .eq("user_id", userId)
    .order("workspace_name")
    .order("path");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    workspaceName: row.workspace_name,
    path: row.path,
    isFolder: row.is_folder,
    fileType: row.file_type,
    updatedAt: row.updated_at,
  }));
}

export async function fetchCloudFile(
  userId: string,
  workspaceName: string,
  path: string
): Promise<CloudFile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("synced_files")
    .select("path, is_folder, file_type, content, updated_at")
    .eq("user_id", userId)
    .eq("workspace_name", workspaceName)
    .eq("path", path)
    .maybeSingle<SyncedFileRow>();
  if (error) throw error;
  return data ? rowToEntry(data) : null;
}

/** Upserts a folder marker row (content-less) so the folder itself — and
 *  empty folders — show up when browsing cloud files, matching how the
 *  local Explorer always shows folders regardless of contents. */
export async function pushFolderEntry(userId: string, workspaceName: string, path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("synced_files").upsert(
    {
      user_id: userId,
      workspace_name: workspaceName,
      path,
      is_folder: true,
      file_type: null,
      content: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,workspace_name,path" }
  );
  if (error) throw error;
}

export async function pushFileEntry(
  userId: string,
  workspaceName: string,
  path: string,
  fileType: NoteFileType,
  content: string
): Promise<void> {
  const supabase = createClient();
  // Quota enforcement happens inside this RPC (sync_upsert_file, see
  // schema.sql), not here — a client-side "read usage, compare, then
  // write" check can't be made race-safe: two devices syncing at nearly
  // the same moment could each read a usage total that's still under the
  // cap and both write, pushing the account over it. The RPC serializes
  // concurrent calls for the same user with an advisory lock so that
  // can't happen.
  const { error } = await supabase.rpc("sync_upsert_file", {
    p_user_id: userId,
    p_workspace_name: workspaceName,
    p_path: path,
    p_file_type: fileType,
    p_content: content,
  });
  if (error) {
    const match = /quota_exceeded:(\d+):(\d+)/.exec(error.message);
    if (match) throw new QuotaExceededError(Number(match[1]), Number(match[2]));
    throw error;
  }
}

/** Removes one cloud entry, and — for a folder — every entry nested under
 *  it, mirroring how deleteFolder() removes everything inside locally. */
export async function removeCloudEntry(
  userId: string,
  workspaceName: string,
  path: string,
  isFolder: boolean
): Promise<void> {
  const supabase = createClient();
  if (isFolder) {
    const { error } = await supabase
      .from("synced_files")
      .delete()
      .eq("user_id", userId)
      .eq("workspace_name", workspaceName)
      .or(`path.eq.${path},path.like.${path}/%`);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("synced_files")
      .delete()
      .eq("user_id", userId)
      .eq("workspace_name", workspaceName)
      .eq("path", path);
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------
// Cloud-as-a-workspace: create/rename/move for items that live only in
// the cloud (created directly from the Cloud section, not synced down
// from a local file). Every one of these operates purely on synced_files
// — never on local files/notes — so an action taken on a cloud item only
// ever affects the cloud item, matching how syncing a *local* item is the
// only direction that cascades (local edit -> cloud update).
// ---------------------------------------------------------------------

/** Creates a new, empty cloud-only file — no local counterpart. Reuses
 *  the same quota-enforcing write every synced file goes through. */
export async function createCloudFile(
  userId: string,
  workspaceName: string,
  path: string,
  fileType: NoteFileType
): Promise<void> {
  await pushFileEntry(userId, workspaceName, path, fileType, "");
}

export async function createCloudFolder(userId: string, workspaceName: string, path: string): Promise<void> {
  await pushFolderEntry(userId, workspaceName, path);
}

interface SyncedFileFullRow {
  path: string;
  is_folder: boolean;
  file_type: NoteFileType | null;
  content: string | null;
}

/** Renames/moves a cloud item by rewriting its path (and, for a folder,
 *  every descendant's path) — Postgres/PostgREST has no "replace a prefix
 *  across matching rows" update, so this reads the affected rows, computes
 *  their new paths client-side, and rewrites them. Cloud file/folder
 *  counts under the 2 MB quota are small enough that this is cheap. */
export async function moveCloudEntry(
  userId: string,
  workspaceName: string,
  oldPath: string,
  newPath: string,
  isFolder: boolean
): Promise<void> {
  const supabase = createClient();

  if (!isFolder) {
    const { data, error } = await supabase
      .from("synced_files")
      .select("path, is_folder, file_type, content")
      .eq("user_id", userId)
      .eq("workspace_name", workspaceName)
      .eq("path", oldPath)
      .maybeSingle<SyncedFileFullRow>();
    if (error) throw error;
    if (!data) return;
    await pushFileEntry(userId, workspaceName, newPath, data.file_type ?? "md", data.content ?? "");
    await removeCloudEntry(userId, workspaceName, oldPath, false);
    return;
  }

  const { data, error } = await supabase
    .from("synced_files")
    .select("path, is_folder, file_type, content")
    .eq("user_id", userId)
    .eq("workspace_name", workspaceName)
    .or(`path.eq.${oldPath},path.like.${oldPath}/%`);
  if (error) throw error;

  for (const row of (data ?? []) as SyncedFileFullRow[]) {
    const rewritten = row.path === oldPath ? newPath : `${newPath}${row.path.slice(oldPath.length)}`;
    if (row.is_folder) await pushFolderEntry(userId, workspaceName, rewritten);
    else await pushFileEntry(userId, workspaceName, rewritten, row.file_type ?? "md", row.content ?? "");
  }
  await removeCloudEntry(userId, workspaceName, oldPath, true);
}
