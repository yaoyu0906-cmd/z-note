"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import { DEFAULT_PAGE_BLOCK_HTML } from "@/lib/editor/pageBlockTemplate";
import {
  Type,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote as QuoteIcon,
  Code,
  Minus,
  Undo2,
  Redo2,
  ImagePlus,
  LayoutTemplate,
  Link as LinkIcon,
  Palette,
} from "lucide-react";
import { IconButton } from "@/components/ui";

interface RichNoteToolbarProps {
  editor: Editor | null;
  onOpenLink: () => void;
  onOpenColor: () => void;
}

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "" },
  { label: "Large", value: "20px" },
  { label: "Huge", value: "28px" },
];

function Divider() {
  return <div className="mx-1 h-4 w-px bg-line dark:bg-lineDark" />;
}

export function RichNoteToolbar({ editor, onOpenLink, onOpenColor }: RichNoteToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        editor?.chain().focus().setImage({ src: reader.result }).run();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow choosing the same file again later
  }

  function appendTextBlock() {
    if (!editor) return;
    const endPos = editor.state.doc.content.size;
    editor.chain().insertContentAt(endPos, { type: "paragraph" }).focus("end").run();
  }

  function handleFontSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const size = e.target.value;
    if (size) editor?.chain().focus().setFontSize(size).run();
    else editor?.chain().focus().unsetFontSize().run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-2 py-1.5">
      <IconButton label="Add text block at the end" onClick={appendTextBlock}>
        <Type size={15} />
      </IconButton>

      <select
        onChange={handleFontSizeChange}
        defaultValue=""
        className="text-xs border border-line dark:border-lineDark rounded px-1 py-1 bg-white dark:bg-surfaceDark text-ink dark:text-inkDark"
        aria-label="Text size (applies to selection)"
      >
        {FONT_SIZES.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Divider />

      <IconButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </IconButton>
      <IconButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </IconButton>
      <IconButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={15} />
      </IconButton>
      <IconButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={15} />
      </IconButton>
      <IconButton
        label="Highlight"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={15} />
      </IconButton>
      <IconButton label="Text color" onClick={onOpenColor}>
        <Palette size={15} />
      </IconButton>
      <IconButton label="Link" active={editor.isActive("link")} onClick={onOpenLink}>
        <LinkIcon size={15} />
      </IconButton>

      <Divider />

      <IconButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={15} />
      </IconButton>
      <IconButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={15} />
      </IconButton>
      <IconButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={15} />
      </IconButton>

      <Divider />

      <IconButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} />
      </IconButton>
      <IconButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} />
      </IconButton>
      <IconButton
        label="Quote"
        active={editor.isActive("quote")}
        onClick={() => editor.chain().focus().toggleQuote().run()}
      >
        <QuoteIcon size={15} />
      </IconButton>
      <IconButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code size={15} />
      </IconButton>
      <IconButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={15} />
      </IconButton>

      <IconButton label="Insert image" onClick={() => fileInputRef.current?.click()}>
        <ImagePlus size={15} />
      </IconButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChosen}
        className="hidden"
      />

      <IconButton
        label="Insert Page block"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent({ type: "pageBlock", attrs: { html: DEFAULT_PAGE_BLOCK_HTML } })
            .run()
        }
      >
        <LayoutTemplate size={15} />
      </IconButton>

      <Divider />

      <IconButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 size={15} />
      </IconButton>
      <IconButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 size={15} />
      </IconButton>
    </div>
  );
}
