import type { NoteType } from "@/lib/types/note";

export interface Tab {
  id: string; // matches Note.id
  title: string;
  type: NoteType;
  isPinned: boolean;
  isDirty: boolean;
}

export type PaneId = "primary" | "secondary";

export interface SplitState {
  isSplit: boolean;
  /** Which tab is active in each visible pane. */
  activeTabByPane: Record<PaneId, string | null>;
}
