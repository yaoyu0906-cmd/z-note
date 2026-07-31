/**
 * Persists FileSystemDirectoryHandle objects in IndexedDB so the last
 * open workspace can be restored on the next visit. localStorage can't
 * hold a handle (not JSON-serializable), but IndexedDB can store it
 * directly since handles are structured-cloneable.
 */

const DB_NAME = "z-note-handles";
const STORE_NAME = "handles";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  const result = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearHandle(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Stores an ordered list of directory handles under one key — used to
 *  restore every workspace that was open last time, not just one. */
export async function saveHandleList(key: string, handles: FileSystemDirectoryHandle[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handles, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getHandleList(key: string): Promise<FileSystemDirectoryHandle[]> {
  const db = await openDb();
  const result = await new Promise<FileSystemDirectoryHandle[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

/** Re-requests read/write permission for a restored handle — required by
 *  the spec since permission grants don't persist across sessions. */
export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  // @ts-expect-error queryPermission/requestPermission aren't in the
  // stable lib.dom types yet but are implemented by Chromium.
  if ((await handle.queryPermission(opts)) === "granted") return true;
  // @ts-expect-error see above
  return (await handle.requestPermission(opts)) === "granted";
}
