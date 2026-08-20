import { create } from "zustand";
import { useTabsStore } from "@/lib/store/useTabsStore";

/**
 * One shared cache for "what's currently in each open editor" (keyed by
 * note id), independent of whether that editor is actually mounted right
 * now. Switching tabs used to unmount the editor and throw its local
 * `content` state away; this store is what each editor reads from on
 * mount instead of always re-reading disk/cloud content, and writes to on
 * every change — so switching away and back resumes exactly where you
 * left off.
 *
 * The same content-string representation each editor already saves with
 * (markdown/plain text, HTML, or the canvas doc's JSON) doubles as the
 * dirty-check: a note is "dirty" whenever its cached draft differs from
 * the content last confirmed saved. This is what the close-tab dialog,
 * the browser beforeunload warning, and Autosave all key off of.
 */
interface DraftState {
  drafts: Record<string, string>;
  savedContent: Record<string, string>;

  /** Records a fresh load from disk/cloud/props as the known-good
   *  baseline — call this when content is loaded, not typed, so a
   *  freshly-opened note never shows as dirty. */
  markSaved: (noteId: string, content: string) => void;
  /** Records an in-progress edit. */
  setDraft: (noteId: string, content: string) => void;
  getDraft: (noteId: string) => string | undefined;
  hasDraft: (noteId: string) => boolean;
  isDirty: (noteId: string) => boolean;
  dirtyNoteIds: () => string[];
  /** Drops all cached state for a note — after it's deleted, or the user
   *  explicitly discards unsaved changes when closing its tab. */
  clear: (noteId: string) => void;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: {},
  savedContent: {},

  markSaved: (noteId, content) => {
    set((s) => ({
      drafts: { ...s.drafts, [noteId]: content },
      savedContent: { ...s.savedContent, [noteId]: content },
    }));
    // The tab bar's dirty dot (lib/store/useTabsStore.ts) already existed
    // but had nothing driving it — mirroring dirty state here, in the one
    // place content actually changes, means every editor gets a working
    // indicator (and the close-tab/beforeunload checks that key off it)
    // without each of them separately calling two different stores.
    useTabsStore.getState().setDirty(noteId, false);
  },

  setDraft: (noteId, content) => {
    set((s) => ({ drafts: { ...s.drafts, [noteId]: content } }));
    const dirty = content !== (get().savedContent[noteId] ?? "");
    useTabsStore.getState().setDirty(noteId, dirty);
  },

  getDraft: (noteId) => get().drafts[noteId],
  hasDraft: (noteId) => noteId in get().drafts,

  isDirty: (noteId) => {
    const { drafts, savedContent } = get();
    if (!(noteId in drafts)) return false;
    return drafts[noteId] !== (savedContent[noteId] ?? "");
  },

  dirtyNoteIds: () => {
    const { drafts, savedContent } = get();
    return Object.keys(drafts).filter((id) => drafts[id] !== (savedContent[id] ?? ""));
  },

  clear: (noteId) => {
    set((s) => {
      const drafts = { ...s.drafts };
      delete drafts[noteId];
      const savedContent = { ...s.savedContent };
      delete savedContent[noteId];
      return { drafts, savedContent };
    });
    useTabsStore.getState().setDirty(noteId, false);
  },
}));
