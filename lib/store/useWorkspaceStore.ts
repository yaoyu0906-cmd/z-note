import { create } from "zustand";
import type { Note } from "@/lib/types/note";
import { MOCK_NOTES } from "@/lib/mock/notes";
import {
  pickDirectory,
  listNotesInDirectory,
  isFileSystemAccessSupported,
  type OpenFile,
} from "@/lib/fs/fileSystemAccess";

interface WorkspaceState {
  dirHandle: FileSystemDirectoryHandle | null;
  localFiles: OpenFile[]; // real files, once a folder is opened
  notes: Note[]; // unified list shown in sidebar — mock until a folder is opened
  isSupported: boolean;

  openFolder: () => Promise<void>;
  getLocalFileByPath: (path: string) => OpenFile | undefined;

  toggleFavorite: (noteId: string) => void;
  recentNoteIds: string[];
  touchRecent: (noteId: string) => void;

  /** Signature "Quick Note" feature — saves instantly, no navigation. */
  addQuickNote: (text: string) => void;
}

function fileToNote(file: OpenFile): Note {
  return {
    id: file.name,
    title: file.name.replace(/\.(md|txt|note)$/, ""),
    type: file.type,
    path: file.name,
    tags: [],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasLocalHandle: true,
  };
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  dirHandle: null,
  localFiles: [],
  notes: MOCK_NOTES,
  isSupported: isFileSystemAccessSupported(),
  recentNoteIds: MOCK_NOTES.slice(0, 3).map((n) => n.id),

  openFolder: async () => {
    const handle = await pickDirectory();
    const files = await listNotesInDirectory(handle);
    set({
      dirHandle: handle,
      localFiles: files,
      notes: files.length > 0 ? files.map(fileToNote) : MOCK_NOTES,
    });
  },

  getLocalFileByPath: (path) => get().localFiles.find((f) => f.name === path),

  toggleFavorite: (noteId) =>
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n
      ),
    })),

  touchRecent: (noteId) =>
    set((state) => ({
      recentNoteIds: [noteId, ...state.recentNoteIds.filter((id) => id !== noteId)].slice(0, 8),
    })),

  addQuickNote: (text) => {
    const id = `quick-${Date.now()}`;
    const now = new Date().toISOString();
    const note: Note = {
      id,
      title: text.slice(0, 60) || "Untitled quick note",
      type: "md",
      path: `quick-notes/${id}.md`,
      tags: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      hasLocalHandle: false,
    };
    // TODO: once local FS + sync are wired up, persist this to a
    // "Quick Notes" folder / notes_sync row instead of only in memory.
    set((state) => ({ notes: [note, ...state.notes] }));
  },
}));
