/**
 * Thin wrapper around the browser's File System Access API.
 * Chromium-only (Chrome, Edge, Arc). No fallback yet for Safari/Firefox —
 * scoped out for v1; a desktop app (Tauri/Electron) is the planned path
 * for full cross-platform local file access later.
 */

export type NoteFileType = "md" | "txt" | "note" | "canvas";

export interface OpenFile {
  handle: FileSystemFileHandle;
  name: string;
  type: NoteFileType;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function inferType(fileName: string): NoteFileType | null {
  if (fileName.endsWith(".md")) return "md";
  if (fileName.endsWith(".txt")) return "txt";
  if (fileName.endsWith(".note")) return "note";
  if (fileName.endsWith(".canvas")) return "canvas";
  return null;
}

async function nameExists(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  kind: "file" | "folder"
): Promise<boolean> {
  try {
    if (kind === "file") await dirHandle.getFileHandle(name);
    else await dirHandle.getDirectoryHandle(name);
    return true;
  } catch {
    return false;
  }
}

/** Picks a name that doesn't already exist in the target folder, appending
 *  " (2)", " (3)", etc. before the extension — used when moving/copying a
 *  file or folder into a destination that already has something with the
 *  same name, so the move never silently overwrites it. */
export async function getUniqueName(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  kind: "file" | "folder"
): Promise<string> {
  if (!(await nameExists(dirHandle, name, kind))) return name;
  const dotIdx = kind === "file" ? name.lastIndexOf(".") : -1;
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const ext = dotIdx > 0 ? name.slice(dotIdx) : "";
  let i = 2;
  while (await nameExists(dirHandle, `${base} (${i})${ext}`, kind)) i++;
  return `${base} (${i})${ext}`;
}

interface PickDirectoryOptions {
  /** Lets the browser remember the last folder used for this picker id. */
  id?: string;
  /** Suggests where the picker opens — "documents" is used for first-run setup. */
  startIn?: "documents" | "desktop" | "downloads";
}

export async function pickDirectory(
  options: PickDirectoryOptions = {}
): Promise<FileSystemDirectoryHandle> {
  // @ts-expect-error - showDirectoryPicker options aren't fully typed in all TS versions
  return window.showDirectoryPicker({ mode: "readwrite", ...options });
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

/**
 * Recursive folder/file tree used by the Explorer UI. `path` is always
 * the "/"-joined path relative to the workspace root — this is what we
 * use as the stable Note id/path so files with the same name in
 * different folders don't collide.
 */
export interface TreeFileNode {
  kind: "file";
  name: string;
  path: string;
  type: NoteFileType;
  handle: FileSystemFileHandle;
}

export interface TreeFolderNode {
  kind: "folder";
  name: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  children: TreeNode[];
}

export type TreeNode = TreeFileNode | TreeFolderNode;

const IGNORED_ENTRY_NAMES = new Set([".git", ".DS_Store", "node_modules"]);

/**
 * Walks a directory recursively, building a full folder/file tree. Files
 * with an unrecognized extension are skipped (same as listNotesInDirectory)
 * but their containing folders are still included so empty/other-content
 * folders remain visible and navigable, like in a real file explorer.
 */
export async function buildWorkspaceTree(
  dirHandle: FileSystemDirectoryHandle,
  parentPath = ""
): Promise<TreeFolderNode> {
  const children: TreeNode[] = [];

  // @ts-expect-error - async iterator typing varies by TS lib version
  for await (const [name, handle] of dirHandle.entries()) {
    if (IGNORED_ENTRY_NAMES.has(name)) continue;
    const path = parentPath ? `${parentPath}/${name}` : name;

    if (handle.kind === "directory") {
      children.push(await buildWorkspaceTree(handle as FileSystemDirectoryHandle, path));
    } else {
      const type = inferType(name);
      if (type) {
        children.push({ kind: "file", name, path, type, handle: handle as FileSystemFileHandle });
      }
    }
  }

  // Folders first, then files, both alphabetical — standard explorer sort.
  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { kind: "folder", name: dirHandle.name, path: parentPath, handle: dirHandle, children };
}

/** Flattens a tree into the file list shape the rest of the app expects. */
export function flattenTreeFiles(node: TreeFolderNode): OpenFile[] {
  const files: OpenFile[] = [];
  function walk(n: TreeNode) {
    if (n.kind === "file") {
      files.push({ handle: n.handle, name: n.path, type: n.type });
    } else {
      n.children.forEach(walk);
    }
  }
  node.children.forEach(walk);
  return files;
}

/** Collects every folder handle in the tree, keyed by relative path
 *  ("" for the workspace root). Used to resolve which directory handle
 *  to write into when creating/renaming a file inside a nested folder. */
export function collectFolderHandles(
  node: TreeFolderNode,
  root: FileSystemDirectoryHandle
): Record<string, FileSystemDirectoryHandle> {
  const map: Record<string, FileSystemDirectoryHandle> = { "": root };
  function walk(n: TreeNode) {
    if (n.kind === "folder") {
      map[n.path] = n.handle;
      n.children.forEach(walk);
    }
  }
  node.children.forEach(walk);
  return map;
}

/** Resolves (creating if necessary) the directory handle for a nested
 *  relative folder path like "Projects/Archive", walking one segment at
 *  a time from the workspace root. */
export async function getOrCreateNestedDirectory(
  root: FileSystemDirectoryHandle,
  folderPath: string
): Promise<FileSystemDirectoryHandle> {
  if (!folderPath) return root;
  let current = root;
  for (const segment of folderPath.split("/").filter(Boolean)) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

/** Every folder path in a tree, including "" for the root — used to build
 *  a flat "move to..." destination list in the Explorer's context menus. */
export function flattenFolderPaths(node: TreeFolderNode): string[] {
  const paths: string[] = [node.path];
  function walk(n: TreeNode) {
    if (n.kind === "folder") {
      paths.push(n.path);
      n.children.forEach(walk);
    }
  }
  node.children.forEach(walk);
  return paths;
}

export function pathDirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

export function pathBasename(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
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
 * Opens the native "Save As" dialog so the user picks where a file goes,
 * rather than writing into an already-open workspace folder. Used by the
 * Scratch Pad, which otherwise has no folder/path of its own. Returns the
 * chosen handle (not yet written to — pair with writeFile), or null if the
 * picker isn't supported or the user cancelled.
 */
const SAVE_TYPE_BY_EXTENSION: Record<string, { description: string; accept: Record<string, string[]> }> = {
  md: { description: "Markdown", accept: { "text/markdown": [".md"] } },
  txt: { description: "Plain Text", accept: { "text/plain": [".txt"] } },
  note: { description: "Z-Note", accept: { "text/html": [".note"] } },
  canvas: { description: "Z-Note Canvas", accept: { "application/json": [".canvas"] } },
};

/** Opens the native "Save As" dialog so the user picks where a file goes,
 *  rather than writing into an already-open workspace folder. Used by the
 *  Scratch Pad (which has no folder/path of its own) and by downloading a
 *  cloud file to a local destination. The file-type picker defaults to
 *  Markdown for backward compatibility with existing callers that don't
 *  pass a suggested name with a recognized extension. */
export async function pickSaveLocation(suggestedName: string): Promise<FileSystemFileHandle | null> {
  if (typeof window === "undefined" || !("showSaveFilePicker" in window)) return null;
  const ext = suggestedName.split(".").pop()?.toLowerCase() ?? "";
  const type = SAVE_TYPE_BY_EXTENSION[ext] ?? SAVE_TYPE_BY_EXTENSION.md;
  try {
    // @ts-expect-error showSaveFilePicker isn't in stable lib.dom types yet
    return await window.showSaveFilePicker({
      suggestedName,
      types: [type],
    });
  } catch {
    return null; // user cancelled
  }
}

export async function getOrCreateSubdirectory(
  dirHandle: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return dirHandle.getDirectoryHandle(name, { create: true });
}

/**
 * The File System Access API has no native "rename" — this reads the old
 * file, writes it under the new name, then removes the old entry. If the
 * name is unchanged this just returns the existing handle.
 */
export async function renameFile(
  dirHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileSystemFileHandle> {
  if (oldName === newName) {
    return dirHandle.getFileHandle(oldName);
  }
  const oldHandle = await dirHandle.getFileHandle(oldName);
  const contents = await readFile(oldHandle);
  const newHandle = await createFile(dirHandle, newName);
  await writeFile(newHandle, contents);
  await dirHandle.removeEntry(oldName);
  return newHandle;
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
