/**
 * Fixed id for the Scratch Pad's ephemeral draft note. It's never added to
 * useWorkspaceStore.notes, so reopening `/note/{SCRATCH_PAD_NOTE_ID}`
 * always falls back to a fresh, blank draft (see the `draftNote` fallback
 * in app/(workspace)/note/[id]/page.tsx) unless the pad was saved earlier
 * in this session, in which case a handle is already registered for this
 * id and its content gets reloaded from disk instead.
 */
export const SCRATCH_PAD_NOTE_ID = "scratchpad";
export const SCRATCH_PAD_TITLE = "Scratch Pad";
