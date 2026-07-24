"use client";

import { useRef, useState } from "react";
import { useGhostText } from "@/lib/ai/useGhostText";
import type { Provider } from "@/lib/ai/providers";
import { complete } from "@/lib/ai/providers";

interface MarkdownEditorProps {
  fileName: string;
  content: string;
  onChange: (next: string) => void;
  provider: Provider;
  apiKey: string | null;
  model: string;
}

type ViewMode = "code" | "preview";

export function MarkdownEditor({
  fileName,
  content,
  onChange,
  provider,
  apiKey,
  model,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>("code");
  const [rewriting, setRewriting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { suggestion, request, clear } = useGhostText({ provider, apiKey, model });

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    onChange(next);
    clear();

    const cursor = e.target.selectionStart;
    const textBeforeCursor = next.slice(0, cursor);
    request(textBeforeCursor);
  }

  function acceptSuggestion() {
    if (!suggestion || !textareaRef.current) return;
    const el = textareaRef.current;
    const cursor = el.selectionStart;
    const next = content.slice(0, cursor) + suggestion + content.slice(cursor);
    onChange(next);
    clear();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  }

  async function rewriteSelection(instruction: "rewrite" | "expand" | "summarize") {
    const el = textareaRef.current;
    if (!el || !apiKey) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    if (!selected.trim()) return;

    setRewriting(true);
    try {
      const instructionText: Record<typeof instruction, string> = {
        rewrite: "Rewrite the following text for clarity, keeping the same meaning.",
        expand: "Expand the following text with more detail, keeping the same tone.",
        summarize: "Summarize the following text concisely.",
      };

      const result = await complete({
        provider,
        apiKey,
        model,
        system: instructionText[instruction],
        prompt: selected,
        maxTokens: 500,
      });

      const next = content.slice(0, start) + result.trim() + content.slice(end);
      onChange(next);
    } catch (err) {
      console.error("Rewrite failed", err);
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div className="flex h-full flex-col border border-line dark:border-lineDark rounded-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-2">
        <span className="text-sm text-graphite dark:text-graphiteDark font-mono">{fileName}</span>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-2 py-1 rounded ${
              mode === "code"
                ? "bg-accentSoft text-accent dark:bg-accentSoftDark dark:text-accentDark"
                : "text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark hover:text-ink dark:hover:text-inkDark"
            }`}
            onClick={() => setMode("code")}
          >
            Code
          </button>
          <button
            className={`text-xs px-2 py-1 rounded ${
              mode === "preview"
                ? "bg-accentSoft text-accent dark:bg-accentSoftDark dark:text-accentDark"
                : "text-graphite dark:text-graphiteDark hover:bg-accentSoft dark:hover:bg-accentSoftDark hover:text-ink dark:hover:text-inkDark"
            }`}
            onClick={() => setMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-1.5">
        <span className="text-xs text-graphite dark:text-graphiteDark">Selection:</span>
        {(["rewrite", "expand", "summarize"] as const).map((action) => (
          <button
            key={action}
            disabled={rewriting || !apiKey}
            onClick={() => rewriteSelection(action)}
            className="text-xs px-2 py-1 rounded border border-line dark:border-lineDark text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark disabled:opacity-40"
          >
            {action}
          </button>
        ))}
        {!apiKey && (
          <span className="text-xs text-graphite dark:text-graphiteDark ml-1">
            (add an API key in Settings)
          </span>
        )}
      </div>

      <div className="relative flex-1">
        {mode === "code" ? (
          <>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-full resize-none p-4 font-mono text-sm outline-none bg-paper dark:bg-paperDark text-ink dark:text-inkDark"
              placeholder="Start writing…"
            />
            {suggestion && (
              <div className="pointer-events-none absolute bottom-2 left-4 text-xs ghost-text font-mono">
                Tab to accept: {suggestion}
              </div>
            )}
          </>
        ) : (
          <div className="p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto h-full">
            {/* Swap for a real markdown renderer (e.g. react-markdown) once deps are installed */}
            <pre className="whitespace-pre-wrap font-sans text-ink dark:text-inkDark">{content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
