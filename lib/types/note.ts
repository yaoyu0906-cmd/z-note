import type { NoteFileType } from "@/lib/fs/fileSystemAccess";

/** Re-exported so feature code can import a single "note" domain type
 *  instead of reaching into the fs layer directly. */
export type NoteType = NoteFileType | "canvas";

export interface Tag {
  id: string;
  label: string;
  color?: string;
}

export interface Note {
  id: string; // stable id — derived from file path/name for local files
  title: string;
  type: NoteType;
  path: string; // relative path within the open workspace folder
  tags: Tag[];
  isFavorite: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  /** True once a real FileSystemFileHandle has been resolved for this note. */
  hasLocalHandle: boolean;
}
