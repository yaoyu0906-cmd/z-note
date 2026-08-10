import type { FileLinkElement } from "@/lib/canvas/types";
import { saveFileHandle, getFileHandle, ensureFilePermission } from "@/lib/fs/handleStore";

/** Extensions the browser can render natively in a new tab. Everything
 *  else falls back to a download, since there's no browser API to hand a
 *  file to the OS's default application directly. */
const BROWSER_OPENABLE_EXTENSIONS = new Set([
  "html", "htm", "pdf", "txt", "md", "json", "csv",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico",
  "mp3", "wav", "ogg", "m4a", "flac", "aac",
  "mp4", "webm", "mov", "ogv",
]);

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx + 1).toLowerCase();
}

export function isBrowserOpenable(extension: string): boolean {
  return BROWSER_OPENABLE_EXTENSIONS.has(extension.toLowerCase());
}

export interface PickedFile {
  handle: FileSystemFileHandle | null;
  file: File;
}

/**
 * Opens the browser's native file picker. Uses the File System Access API
 * when available so the resulting handle can be persisted and reopened
 * later without asking again; falls back to a plain `<input type="file">`
 * on browsers without it (Firefox/Safari) — which only yields a `File`,
 * good for one open this session, since there's no handle to persist.
 */
export async function pickFile(): Promise<PickedFile | null> {
  if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
    try {
      // @ts-expect-error showOpenFilePicker isn't in stable lib.dom types yet
      const [handle] = await window.showOpenFilePicker({ multiple: false });
      const file = await handle.getFile();
      return { handle, file };
    } catch {
      return null; // user cancelled the picker
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { handle: null, file } : null);
    };
    // No 'cancel' event is fired reliably cross-browser, so a cancelled
    // picker here just never resolves — acceptable since the caller is a
    // one-shot "insert a file link" action, not something awaiting a
    // required result.
    input.click();
  });
}

export type OpenLinkResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "permission" | "error" };

/** Resolves the persisted FileSystemFileHandle for a File Link element, if
 *  the browser supports the File System Access API and a handle was
 *  cached for it. Returns null (never throws) if nothing's available —
 *  callers should treat that as "ask the user to relocate the file". */
export async function resolveFileLinkHandle(el: FileLinkElement): Promise<FileSystemFileHandle | null> {
  try {
    return await getFileHandle(el.handleKey);
  } catch {
    return null;
  }
}

export async function saveFileLinkHandle(el: FileLinkElement, handle: FileSystemFileHandle): Promise<void> {
  await saveFileHandle(el.handleKey, handle);
}

/** Opens a File Link element's target: browser-openable types (html, pdf,
 *  text, image, audio, video) open in a new tab; everything else falls
 *  back to a native download so the OS can hand it to whatever's
 *  registered as its default app. Fails gracefully (returns a reason
 *  instead of throwing) when the handle is missing or permission was
 *  revoked, since a `.canvas` file can be opened on a machine/session that
 *  never had access to the linked file at all. */
export async function openLinkedFile(el: FileLinkElement): Promise<OpenLinkResult> {
  const handle = await resolveFileLinkHandle(el);
  if (!handle) return { ok: false, reason: "not-found" };

  try {
    const granted = await ensureFilePermission(handle);
    if (!granted) return { ok: false, reason: "permission" };

    const file = await handle.getFile();
    const url = URL.createObjectURL(file);

    if (isBrowserOpenable(el.extension)) {
      // Revoking immediately would race the new tab's load, so the object
      // URL is left for the browser/GC to reclaim — the same trade-off
      // already made for embedded image data: URLs elsewhere in Canvas.
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = el.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}
