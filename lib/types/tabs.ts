import type { NoteType } from "@/lib/types/note";

export interface Tab {
  id: string; // matches Note.id
  title: string;
  type: NoteType;
  isPinned: boolean;
  isDirty: boolean;
  /** True only while a save (local write and/or cloud push) is actually
   *  in flight — distinct from isDirty, which reflects "content differs
   *  from what's saved" regardless of whether a save is running. */
  isSaving: boolean;
}

export type PaneId = "primary" | "secondary";

export interface SplitState {
  isSplit: boolean;
  /** Which tab is active in each visible pane. */
  activeTabByPane: Record<PaneId, string | null>;
}
