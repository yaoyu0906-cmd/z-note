"use client";

import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";
import { CODE_LANGUAGES } from "@/lib/editor/extensions/codeBlock";
import { Select } from "@/components/ui/Select";

export function CodeBlockView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const lineCount = Math.max(1, node.textContent.split("\n").length);
  const language = (node.attrs.language as string) || "plaintext";
  const title = (node.attrs.title as string) || "";
  // Computed inside the component (not at module scope) — codeBlock.ts and
  // this file import each other (the extension renders this view; this
  // view reads the extension's language list), and evaluating this at
  // module load time hit a temporal-dead-zone error during that cycle.
  const languageOptions = CODE_LANGUAGES.map((lang) => ({ value: lang, label: lang }));

  return (
    <NodeViewWrapper className="code-block-view not-prose rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark overflow-hidden my-3">
      <div
        contentEditable={false}
        className="flex items-center gap-2 px-2 py-1 border-b border-line dark:border-lineDark bg-paper dark:bg-paperDark"
      >
        <input
          value={title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="Untitled snippet"
          className="flex-1 min-w-0 bg-transparent text-xs text-ink dark:text-inkDark placeholder:text-graphite dark:placeholder:text-graphiteDark outline-none px-1 py-0.5 rounded hover:bg-white dark:hover:bg-surfaceDark focus:bg-white dark:focus:bg-surfaceDark focus:ring-1 focus:ring-accent dark:focus:ring-accentDark"
        />
        <Select
          value={language}
          options={languageOptions}
          onChange={(next) => updateAttributes({ language: next })}
          aria-label="Code block language"
        />
        <button
          onClick={deleteNode}
          aria-label="Delete code block"
          className="text-graphite dark:text-graphiteDark hover:text-ink dark:hover:text-inkDark shrink-0"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex">
        <div
          contentEditable={false}
          className="select-none text-right pr-2 pl-3 py-3 text-xs font-mono text-graphite dark:text-graphiteDark bg-paper dark:bg-paperDark border-r border-line dark:border-lineDark"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="leading-5">
              {i + 1}
            </div>
          ))}
        </div>
        <pre className="flex-1 overflow-x-auto py-3 pl-3 pr-4 m-0 bg-transparent">
          <NodeViewContent as="code" className={`language-${language} font-mono text-xs leading-5`} />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
