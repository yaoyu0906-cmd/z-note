/**
 * Tags and favorites are per-workspace metadata that doesn't belong in any
 * single note file, so they're kept in a small hidden JSON file at the
 * workspace root: `.z-note-meta.json`. Reading/writing this alongside the
 * notes (rather than stashing it in browser storage) is what lets tags
 * survive a page reload, a different browser, or a different machine —
 * anywhere the folder itself is opened from.
 */

export const META_FILENAME = ".z-note-meta.json";

export interface WorkspaceMeta {
  /** Generated once and persisted here so the workspace has a stable id
   *  across reloads — folder handles alone don't expose a stable string. */
  workspaceId: string;
  tags: { id: string; label: string; color: string }[];
  /** Note path -> tag ids assigned to it. */
  noteTags: Record<string, string[]>;
  /** Note paths marked as favorite. */
  favorites: string[];
  /** Folder paths marked as favorite. */
  favoriteFolders: string[];
}

export function emptyMeta(workspaceId: string): WorkspaceMeta {
  return { workspaceId, tags: [], noteTags: {}, favorites: [], favoriteFolders: [] };
}

export async function readWorkspaceMeta(dirHandle: FileSystemDirectoryHandle): Promise<WorkspaceMeta | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(META_FILENAME);
    const file = await fileHandle.getFile();
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed.workspaceId !== "string") return null;
    return {
      workspaceId: parsed.workspaceId,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      noteTags: parsed.noteTags && typeof parsed.noteTags === "object" ? parsed.noteTags : {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      favoriteFolders: Array.isArray(parsed.favoriteFolders) ? parsed.favoriteFolders : [],
    };
  } catch {
    // File doesn't exist yet, or isn't valid JSON — treat as "no metadata".
    return null;
  }
}

export async function writeWorkspaceMeta(
  dirHandle: FileSystemDirectoryHandle,
  meta: WorkspaceMeta
): Promise<void> {
  try {
    const fileHandle = await dirHandle.getFileHandle(META_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(meta, null, 2));
    await writable.close();
  } catch (err) {
    console.error("Failed to persist workspace metadata (tags/favorites).", err);
  }
}
