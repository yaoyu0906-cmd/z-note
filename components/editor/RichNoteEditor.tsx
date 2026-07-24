"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { RichNoteToolbar } from "@/components/editor/RichNoteToolbar";
import { PageBlock } from "@/components/editor/PageBlock";

const STARTER_CONTENT = `
  <h1>Untitled</h1>
  <p>Start writing, or insert a block from the toolbar above.</p>
`;

export function RichNoteEditor({ fileName }: { fileName: string }) {
  const [pageBlocks, setPageBlocks] = useState<number[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write something…" }),
      ImageExtension.configure({ HTMLAttributes: { class: "rounded-md" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "cursor-pointer" } }),
    ],
    content: STARTER_CONTENT,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none " +
          "prose-headings:font-semibold prose-a:text-accent dark:prose-a:text-accentDark " +
          "prose-code:text-accent dark:prose-code:text-accentDark prose-code:before:content-none prose-code:after:content-none " +
          "prose-blockquote:border-l-accent dark:prose-blockquote:border-l-accentDark " +
          "prose-hr:border-line dark:prose-hr:border-lineDark min-h-[60vh]",
      },
    },
    // Avoids an SSR/CSR content mismatch warning — the doc is only ever
    // populated client-side for now (no persistence layer yet).
    immediatelyRender: false,
  });

  function insertPageBlock() {
    setPageBlocks((prev) => [...prev, Date.now()]);
  }

  return (
    <div className="flex h-full flex-col border border-line dark:border-lineDark rounded-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-2">
        <span className="text-sm text-graphite dark:text-graphiteDark font-mono">{fileName}</span>
      </div>

      <RichNoteToolbar editor={editor} onInsertPage={insertPageBlock} />

      <div className="flex-1 overflow-auto bg-paper dark:bg-paperDark">
        <div className="max-w-2xl mx-auto p-8 space-y-4">
          <EditorContent editor={editor} />

          {pageBlocks.map((id) => (
            <PageBlock key={id} />
          ))}
        </div>
      </div>
    </div>
  );
}
