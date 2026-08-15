"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, getMarkRange } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Pencil, Eye, Columns2 } from "lucide-react";
import { RichNoteToolbar } from "@/components/editor/RichNoteToolbar";
import { LinkDialog } from "@/components/editor/LinkDialog";
import { ColorPicker } from "@/components/editor/ColorPicker";
import { EditableFilename } from "@/components/editor/EditableFilename";
import { IconButton } from "@/components/ui";
import { FontSize, TabIndent } from "@/lib/editor/extensions/customExtensions";
import { Quote, QuoteSpeaker } from "@/lib/editor/extensions/quote";
import { ThemedCodeBlock } from "@/lib/editor/extensions/codeBlock";
import { PageBlockNode } from "@/lib/editor/extensions/pageBlockNode";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { isCloudNoteId, pushCloudOnlyNote } from "@/lib/cloudNote";
import { useCloudRealtime } from "@/lib/useCloudRealtime";
import { readFile, writeFile } from "@/lib/fs/fileSystemAccess";
import type { Note } from "@/lib/types/note";

const STARTER_CONTENT = `
  <h1>Untitled</h1>
  <p>Start writing, or insert a block from the toolbar above.</p>
`;

// Shared so the editable pane and the read-only preview pane render
// identically — headings, links, and colors should look the same in
// both places, just with editing capability toggled.
const PROSE_CLASSES =
  "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[50vh] " +
  "prose-h1:text-2xl prose-h1:font-bold " +
  "prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 " +
  "prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:uppercase prose-h3:tracking-wide " +
  "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline prose-a:font-normal prose-a:cursor-pointer " +
  "prose-code:text-accent dark:prose-code:text-accentDark prose-code:before:content-none prose-code:after:content-none " +
  "prose-blockquote:border-l-0 prose-blockquote:pl-0 " +
  "prose-hr:border-line dark:prose-hr:border-lineDark " +
  "prose-mark:bg-yellow-200 dark:prose-mark:bg-yellow-500/40 prose-mark:text-inherit";

function sharedExtensions() {
  return [
    StarterKit.configure({ blockquote: false, codeBlock: false }),
    Placeholder.configure({
      placeholder: ({ node }: { node: { type: { name: string } } }) =>
        node.type.name === "speaker" ? "Attribution (optional)…" : "Write something…",
    }),
    ImageExtension.configure({ HTMLAttributes: { class: "rounded-md" } }),
    TextStyle,
    Color,
    FontSize,
    Underline,
    Highlight.configure({ multicolor: false }),
    TabIndent,
    Quote,
    QuoteSpeaker,
    ThemedCodeBlock,
    PageBlockNode,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
    }),
  ];
}

type Mode = "edit" | "view" | "split";

interface RichNoteEditorProps {
  note: Note;
  handle?: FileSystemFileHandle;
  initialContent?: string;
}

export function RichNoteEditor({ note, handle, initialContent }: RichNoteEditorProps) {
  const [mode, setMode] = useState<Mode>("edit");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [cloudSaveError, setCloudSaveError] = useState<string | null>(null);
  const renameNote = useWorkspaceStore((s) => s.renameNote);
  const setNoteContent = useWorkspaceStore((s) => s.setNoteContent);
  const registerSave = useActiveEditorStore((s) => s.registerSave);

  const editor = useEditor({
    extensions: sharedExtensions(),
    content: initialContent || STARTER_CONTENT,
    editorProps: { attributes: { class: PROSE_CLASSES } },
    immediatelyRender: false,
    onUpdate: ({ editor: updated }) => {
      // Keep the read-only split preview in sync without re-triggering
      // its own (nonexistent) update handler.
      viewEditor?.commands.setContent(updated.getJSON(), false);
    },
  });

  // Read-only mirror used only when mode === "split". Always instantiated
  // (hooks can't be conditional) but only mounted in the DOM when needed.
  const viewEditor = useEditor({
    extensions: sharedExtensions(),
    content: initialContent || STARTER_CONTENT,
    editable: false,
    editorProps: { attributes: { class: PROSE_CLASSES } },
    immediatelyRender: false,
  });

  // Load the real file's content once the editor + handle are both ready.
  useEffect(() => {
    if (!editor || !handle) return;
    readFile(handle).then((html) => {
      if (html) {
        editor.commands.setContent(html);
        viewEditor?.commands.setContent(html);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, handle]);

  // Cloud-only notes (no local File System Access handle — this device
  // can't use the API, e.g. Safari/iOS, or the file was never
  // downloaded) pick up edits saved from another device live.
  useCloudRealtime(
    note.id,
    () => editor?.getHTML() ?? "",
    (remoteHtml) => {
      editor?.commands.setContent(remoteHtml);
      viewEditor?.commands.setContent(remoteHtml);
    }
  );

  // Register Ctrl+S for whichever note is currently mounted.
  useEffect(() => {
    registerSave(async () => {
      if (!editor) return;
      const html = editor.getHTML();
      if (isCloudNoteId(note.id)) {
        const result = await pushCloudOnlyNote(note.id, note.type, html);
        setCloudSaveError(result.ok ? null : result.reason);
        return;
      }
      if (handle) await writeFile(handle, html);
      else setNoteContent(note.id, html);
      if (note.workspaceId) useSyncStore.getState().pushIfSynced(note.workspaceId, note, html);
    });
    return () => registerSave(null);
  }, [editor, handle, note.id, note.workspaceId, note.path, note.type, registerSave, setNoteContent]);

  useEffect(() => {
    editor?.setEditable(mode !== "view");
  }, [mode, editor]);

  // ---- Link dialog wiring ----
  function getLinkContext() {
    if (!editor) return { href: "", text: "", isEditingExisting: false };
    const isActive = editor.isActive("link");
    if (isActive) {
      const range = getMarkRange(editor.state.selection.$from, editor.schema.marks.link);
      if (range) {
        return {
          href: (editor.getAttributes("link").href as string) || "",
          text: editor.state.doc.textBetween(range.from, range.to),
          isEditingExisting: true,
        };
      }
    }
    const { from, to } = editor.state.selection;
    return { href: "", text: editor.state.doc.textBetween(from, to), isEditingExisting: false };
  }

  function applyLink({ href, text }: { href: string; text: string }) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (editor.isActive("link")) {
      const range = getMarkRange(editor.state.selection.$from, editor.schema.marks.link);
      if (range) chain.setTextSelection(range);
    }
    chain
      .insertContent({ type: "text", text: text || href, marks: [{ type: "link", attrs: { href } }] })
      .run();
  }

  function removeLink() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  // ---- Color picker wiring (inline text color) ----
  const currentColor = (editor?.getAttributes("textStyle").color as string) || null;

  function applyColor(hex: string) {
    editor?.chain().focus().setColor(hex).run();
  }

  function clearColor() {
    editor?.chain().focus().unsetColor().run();
  }

  const linkContext = linkDialogOpen ? getLinkContext() : null;
  const isSplit = mode === "split";

  return (
    <div className="flex h-full flex-col border border-line dark:border-lineDark rounded-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <EditableFilename
            title={note.title}
            path={note.path}
            type={note.type}
            onRename={(updates) => renameNote(note.id, updates)}
          />
          {cloudSaveError && (
            <span className="text-xs text-red-600 dark:text-red-400 truncate" title={cloudSaveError}>
              Cloud save failed: {cloudSaveError}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Edit mode" active={mode === "edit"} onClick={() => setMode("edit")}>
            <Pencil size={15} />
          </IconButton>
          <IconButton label="View mode" active={mode === "view"} onClick={() => setMode("view")}>
            <Eye size={15} />
          </IconButton>
          <IconButton label="Split editor" active={isSplit} onClick={() => setMode("split")}>
            <Columns2 size={15} />
          </IconButton>
        </div>
      </div>

      {mode !== "view" && (
        <RichNoteToolbar
          editor={editor}
          onOpenLink={() => setLinkDialogOpen(true)}
          onOpenColor={() => setColorPickerOpen(true)}
        />
      )}

      <div className={`flex-1 min-h-0 overflow-hidden flex zn-scroll ${isSplit ? "divide-x divide-line dark:divide-lineDark" : ""}`}>
        <div className="flex-1 min-h-0 min-w-0 overflow-auto zn-scroll bg-paper dark:bg-paperDark">
          <div className="max-w-2xl mx-auto p-8 space-y-4">
            <EditorContent editor={editor} />
          </div>
        </div>

        {isSplit && (
          <div className="flex-1 min-h-0 min-w-0 overflow-auto zn-scroll bg-paper dark:bg-paperDark">
            <div className="max-w-2xl mx-auto p-8">
              <p className="text-[11px] uppercase tracking-wide text-graphite dark:text-graphiteDark mb-3">
                View mode
              </p>
              <EditorContent editor={viewEditor} />
            </div>
          </div>
        )}
      </div>

      {editor && (
        <LinkDialog
          open={linkDialogOpen}
          onClose={() => setLinkDialogOpen(false)}
          initialHref={linkContext?.href}
          initialText={linkContext?.text}
          isEditingExisting={linkContext?.isEditingExisting ?? false}
          onSubmit={applyLink}
          onRemove={removeLink}
        />
      )}

      <ColorPicker
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        currentColor={currentColor}
        onSelect={applyColor}
        onClear={clearColor}
      />
    </div>
  );
}
