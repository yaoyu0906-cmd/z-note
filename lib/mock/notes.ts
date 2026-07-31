import type { Note, Tag } from "@/lib/types/note";

export const MOCK_TAGS: Tag[] = [
  { id: "tag-work", label: "Work", color: "#2F5D50" },
  { id: "tag-ideas", label: "Ideas", color: "#8A6D3B" },
  { id: "tag-journal", label: "Journal", color: "#5B6FA8" },
];

export const MOCK_NOTES: Note[] = [
  {
    id: "welcome",
    title: "Welcome to Z-Note",
    type: "note",
    path: "welcome.note",
    tagIds: ["tag-ideas"],
    isFavorite: true,
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-20T14:32:00.000Z",
    hasLocalHandle: false,
  },
  {
    id: "project-roadmap",
    title: "Project Roadmap",
    type: "md",
    path: "work/project-roadmap.md",
    tagIds: ["tag-work"],
    isFavorite: true,
    createdAt: "2026-06-18T10:00:00.000Z",
    updatedAt: "2026-07-19T08:12:00.000Z",
    hasLocalHandle: false,
  },
  {
    id: "daily-journal-07-21",
    title: "Daily Journal — Jul 21",
    type: "md",
    path: "journal/2026-07-21.md",
    tagIds: ["tag-journal"],
    isFavorite: false,
    createdAt: "2026-07-21T07:05:00.000Z",
    updatedAt: "2026-07-21T07:40:00.000Z",
    hasLocalHandle: false,
  },
  {
    id: "system-sketch",
    title: "System Sketch",
    type: "canvas",
    path: "ideas/system-sketch.canvas",
    tagIds: ["tag-ideas"],
    isFavorite: false,
    createdAt: "2026-07-15T11:00:00.000Z",
    updatedAt: "2026-07-18T16:20:00.000Z",
    hasLocalHandle: false,
  },
];

export function getMockNoteById(id: string): Note | undefined {
  return MOCK_NOTES.find((n) => n.id === id);
}
