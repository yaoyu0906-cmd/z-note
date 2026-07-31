import type { NoteFileType } from "@/lib/fs/fileSystemAccess";

/** Re-exported so feature code can import a single "note" domain type
 *  instead of reaching into the fs layer directly. */
export type NoteType = NoteFileType | "canvas";

export interface Tag {
  id: string;
  label: string;
  color: string;
  /** Which workspace this tag belongs to (and is persisted alongside), or
   *  undefined for the ephemeral demo tags shown before any workspace is
   *  open. */
  workspaceId?: string;
}

export interface Note {
  /** Globally unique across every open workspace: `${workspaceId}::${path}`
   *  for real on-disk notes, or a plain synthetic id (e.g. "canvas-123")
   *  for in-memory-only notes that aren't tied to a workspace folder. */
  id: string;
  title: string;
  type: NoteType;
  path: string; // relative path within its own workspace folder
  /** Which workspace this note's file lives in, or undefined for
   *  in-memory-only notes (canvas, demo/mock notes). */
  workspaceId?: string;
  tagIds: string[]; // references Tag.id in the tag registry
  isFavorite: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  /** True once a real FileSystemFileHandle has been resolved for this note. */
  hasLocalHandle: boolean;
}
