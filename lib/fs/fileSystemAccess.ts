/**
 * Thin wrapper around the browser's File System Access API.
 * Chromium-only (Chrome, Edge, Arc). No fallback yet for Safari/Firefox —
 * scoped out for v1; a desktop app (Tauri/Electron) is the planned path
 * for full cross-platform local file access later.
 */

export type NoteFileType = "md" | "txt" | "note";

export interface OpenFile {
  handle: FileSystemFileHandle;
  name: string;
  type: NoteFileType;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function inferType(fileName: string): NoteFileType | null {
  if (fileName.endsWith(".md")) return "md";
  if (fileName.endsWith(".txt")) return "txt";
  if (fileName.endsWith(".note")) return "note";
  return null;
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error - showDirectoryPicker is not yet in lib.dom.d.ts fully typed in all TS versions
  return window.showDirectoryPicker({ mode: "readwrite" });
}

export async function listNotesInDirectory(
  dirHandle: FileSystemDirectoryHandle
): Promise<OpenFile[]> {
  const files: OpenFile[] = [];
  // @ts-expect-error - async iterator typing varies by TS lib version
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== "file") continue;
    const type = inferType(name);
    if (type) files.push({ handle, name, type });
  }
  return files;
}

export async function readFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFile(handle: FileSystemFileHandle, contents: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}

export async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<FileSystemFileHandle> {
  return dirHandle.getFileHandle(fileName, { create: true });
}

/**
 * .note files are JSON under the hood (block-based rich content), just
 * with a distinct extension so the app can route them to the rich-text
 * editor instead of the plain markdown/text views. This keeps the format
 * genuinely portable — any tool can `JSON.parse()` a .note file.
 */
export interface NoteDocument {
  version: 1;
  blocks: NoteBlock[];
}

export type NoteBlock =
  | { type: "paragraph"; text: string; formatting?: Record<string, unknown> }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "background"; color?: string; image?: string };

export function serializeNote(doc: NoteDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function parseNote(raw: string): NoteDocument {
  const parsed = JSON.parse(raw);
  if (parsed.version !== 1) throw new Error("Unsupported .note file version");
  return parsed;
}
