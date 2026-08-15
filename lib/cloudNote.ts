import { useAuthStore } from "@/lib/store/useAuthStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { fetchCloudFile, pushFileEntry, QuotaExceededError } from "@/lib/sync";
import type { Note } from "@/lib/types/note";
import type { NoteFileType } from "@/lib/fs/fileSystemAccess";

/**
 * Ids for cloud-only notes — files that are synced but have no local copy
 * on this device, either because they were never downloaded, or because
 * this device can't use the File System Access API at all (Safari/iOS/
 * any browser without it). Mirrors useWorkspaceStore's own
 * `${workspaceId}::${path}` composite id scheme, just prefixed so it can
 * never collide with a real local workspace id (those are always
 * generated ids, never literally "cloud").
 */
const CLOUD_NOTE_PREFIX = "cloud::";

export function buildCloudNoteId(workspaceName: string, path: string): string {
  return `${CLOUD_NOTE_PREFIX}${workspaceName}::${path}`;
}

export function isCloudNoteId(id: string): boolean {
  return id.startsWith(CLOUD_NOTE_PREFIX);
}

export function parseCloudNoteId(id: string): { workspaceName: string; path: string } | null {
  if (!isCloudNoteId(id)) return null;
  const rest = id.slice(CLOUD_NOTE_PREFIX.length);
  const sep = rest.indexOf("::");
  if (sep === -1) return null;
  return { workspaceName: rest.slice(0, sep), path: rest.slice(sep + 2) };
}

/** Whether this device can use the File System Access API at all — when
 *  it can't (Safari, iOS, older browsers), synced files fall back to
 *  cloud-only editing instead of the normal "open a local folder" flow. */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

function titleFromPath(path: string): string {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Fetches a cloud-only file's content and builds the Note object the
 * existing editors already know how to render. This is the key reuse:
 * every editor already supports "no local handle, load initial content
 * from noteContents" (that's how quick notes and the Scratch Pad work
 * before they have a handle) — so viewing a cloud file needed no editor
 * changes at all, only a Note + noteContents entry constructed up front.
 */
export async function loadCloudNote(id: string): Promise<Note | null> {
  const parsed = parseCloudNoteId(id);
  if (!parsed) return null;
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;

  const file = await fetchCloudFile(userId, parsed.workspaceName, parsed.path);
  if (!file || file.isFolder || file.content == null || !file.fileType) return null;

  useWorkspaceStore.getState().setNoteContent(id, file.content);

  return {
    id,
    title: titleFromPath(parsed.path),
    type: file.fileType,
    path: parsed.path,
    tagIds: [],
    isFavorite: false,
    createdAt: file.updatedAt,
    updatedAt: file.updatedAt,
    hasLocalHandle: false,
  };
}

/** Saves a cloud-only note's new content straight to Supabase — there's
 *  no local file to write to, so this bypasses useSyncStore's normal
 *  local-workspace-scoped push helpers (which all key off a real local
 *  workspace id) and calls the cloud write directly. Still goes through
 *  the same quota-enforcing pushFileEntry every other sync path uses. */
export async function pushCloudOnlyNote(
  id: string,
  fileType: NoteFileType,
  content: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const parsed = parseCloudNoteId(id);
  const userId = useAuthStore.getState().user?.id;
  if (!parsed) return { ok: false, reason: "Not a cloud file." };
  if (!userId) return { ok: false, reason: "Not signed in." };
  try {
    await pushFileEntry(userId, parsed.workspaceName, parsed.path, fileType, content);
    return { ok: true };
  } catch (err) {
    if (err instanceof QuotaExceededError) return { ok: false, reason: err.message };
    return { ok: false, reason: err instanceof Error ? err.message : "Failed to save to the cloud." };
  }
}
