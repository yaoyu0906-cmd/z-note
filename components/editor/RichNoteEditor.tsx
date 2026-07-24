"use client";

import { useState } from "react";
import type { NoteDocument, NoteBlock } from "@/lib/fs/fileSystemAccess";
import { PageBlock } from "@/components/editor/PageBlock";
import { Button } from "@/components/ui";

const PLACEHOLDER_DOC: NoteDocument = {
  version: 1,
  blocks: [
    { type: "heading", level: 1, text: "Untitled" },
    { type: "paragraph", text: "Start writing, or insert a block below." },
  ],
};

function BlockView({ block, onChange }: { block: NoteBlock; onChange: (b: NoteBlock) => void }) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${block.level}` as unknown) as "h1" | "h2" | "h3";
      return (
        <Tag
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange({ ...block, text: e.currentTarget.textContent ?? "" })}
          className="font-semibold text-ink dark:text-inkDark outline-none"
        >
          {block.text}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onChange({ ...block, text: e.currentTarget.textContent ?? "" })}
          className="text-sm leading-relaxed text-ink dark:text-inkDark outline-none"
        >
          {block.text}
        </p>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={block.src} alt={block.alt ?? ""} className="rounded max-w-full" />;
    case "background":
      return (
        <div
          className="h-24 rounded"
          style={{ backgroundColor: block.color, backgroundImage: block.image ? `url(${block.image})` : undefined }}
        />
      );
    default:
      return null;
  }
}

const INSERTABLE_BLOCKS: { label: string; create: () => NoteBlock }[] = [
  { label: "+ Text", create: () => ({ type: "paragraph", text: "" }) },
  { label: "+ Heading", create: () => ({ type: "heading", level: 2, text: "" }) },
  { label: "+ Page", create: () => ({ type: "paragraph", text: "" }) }, // see note below
];

export function RichNoteEditor({ fileName }: { fileName: string }) {
  const [doc, setDoc] = useState<NoteDocument>(PLACEHOLDER_DOC);
  const [showPage, setShowPage] = useState(false);

  function updateBlock(index: number, next: NoteBlock) {
    setDoc((prev) => ({ ...prev, blocks: prev.blocks.map((b, i) => (i === index ? next : b)) }));
  }

  function insertBlock(create: () => NoteBlock) {
    setDoc((prev) => ({ ...prev, blocks: [...prev.blocks, create()] }));
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <p className="text-xs text-graphite font-mono">{fileName}</p>

      {doc.blocks.map((block, i) => (
        <BlockView key={i} block={block} onChange={(next) => updateBlock(i, next)} />
      ))}

      {showPage && <PageBlock />}

      <div className="flex gap-2 pt-4 border-t border-line dark:border-lineDark">
        {INSERTABLE_BLOCKS.map((b) => (
          <Button key={b.label} size="sm" onClick={() => (b.label === "+ Page" ? setShowPage(true) : insertBlock(b.create))}>
            {b.label}
          </Button>
        ))}
      </div>

      <p className="text-xs text-graphite pt-6">
        This is a structural placeholder. Swap in a Lexical or TipTap document
        model here for real rich-text editing, checklists, tables, code
        blocks, embeds, AI blocks, and drawings — the <code>NoteDocument</code>{" "}
        / <code>NoteBlock</code> schema in{" "}
        <code>lib/fs/fileSystemAccess.ts</code> is meant to grow to support
        those block types.
      </p>
    </div>
  );
}
