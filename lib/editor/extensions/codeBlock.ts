import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { createLowlight, common } from "lowlight";
import { CodeBlockView } from "@/components/editor/CodeBlockView";

export const lowlight = createLowlight(common);

// Common, human-friendly language choices for the code block picker —
// a subset of what `common` registers, in a sensible order.
export const CODE_LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "sql",
  "shell",
  "yaml",
  "json",
  "xml",
  "css",
  "markdown",
];

export const ThemedCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: { default: "" },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  // Without this, a code block with no explicit language attribute falls
  // back to lowlight's highlightAuto() guesswork, which is frequently
  // wrong on short snippets — that was the "incorrect syntax highlighting"
  // bug. Defaulting to plaintext means "no highlighting" instead of
  // "wrong highlighting" until the user picks a language.
  defaultLanguage: "plaintext",
});
