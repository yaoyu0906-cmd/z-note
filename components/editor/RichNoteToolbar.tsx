"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
  ImagePlus,
  LayoutTemplate,
} from "lucide-react";
import { IconButton } from "@/components/ui";

interface RichNoteToolbarProps {
  editor: Editor | null;
  onInsertPage: () => void;
}

export function RichNoteToolbar({ editor, onInsertPage }: RichNoteToolbarProps) {
  if (!editor) return null;

  function insertImage() {
    const url = window.prompt("Image URL");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-2 py-1.5">
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
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={15} />
      </IconButton>

      <div className="mx-1 h-4 w-px bg-line dark:bg-lineDark" />

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

      <div className="mx-1 h-4 w-px bg-line dark:bg-lineDark" />

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
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={15} />
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
      <IconButton label="Insert image" onClick={insertImage}>
        <ImagePlus size={15} />
      </IconButton>
      <IconButton label="Insert Page block" onClick={onInsertPage}>
        <LayoutTemplate size={15} />
      </IconButton>

      <div className="mx-1 h-4 w-px bg-line dark:bg-lineDark" />

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
