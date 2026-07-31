"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { useGhostText } from "@/lib/ai/useGhostText";
import type { Provider } from "@/lib/ai/providers";
import { complete } from "@/lib/ai/providers";
import { EditableFilename } from "@/components/editor/EditableFilename";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useActiveEditorStore } from "@/lib/store/useActiveEditorStore";
import { readFile, writeFile } from "@/lib/fs/fileSystemAccess";
import { highlightToReact } from "@/lib/editor/highlightToReact";
import type { Note } from "@/lib/types/note";

interface MarkdownEditorProps {
  note: Note;
  handle?: FileSystemFileHandle;
  initialContent?: string;
  provider: Provider;
  apiKey: string | null;
  model: string;
}

type ViewMode = "code" | "preview";

export function MarkdownEditor({
  note,
  handle,
  initialContent,
  provider,
  apiKey,
  model,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>("code");
  const [rewriting, setRewriting] = useState(false);
  const [content, setContent] = useState(initialContent ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  // Only markdown files get the highlight overlay — .txt is plain text by
  // definition, so highlighting it as markdown would be misleading.
  const isMarkdown = note.type === "md";

  const renameNote = useWorkspaceStore((s) => s.renameNote);
  const setNoteContent = useWorkspaceStore((s) => s.setNoteContent);
  const registerSave = useActiveEditorStore((s) => s.registerSave);

  const { suggestion, request, clear } = useGhostText({ provider, apiKey, model });

  // Load the real file's content once a handle is available.
  useEffect(() => {
    if (!handle) return;
    readFile(handle).then(setContent);
  }, [handle]);

  // Register Ctrl+S for whichever note is currently mounted.
  useEffect(() => {
    registerSave(async () => {
      if (handle) await writeFile(handle, content);
      else setNoteContent(note.id, content);
    });
    return () => registerSave(null);
  }, [handle, content, note.id, registerSave, setNoteContent]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setContent(next);
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
    setContent(next);
    clear();
  }

  function insertTab() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + "    " + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 4;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestion) acceptSuggestion();
      else insertTab();
    }
  }

  function syncGutterScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
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
      setContent(next);
    } catch (err) {
      console.error("Rewrite failed", err);
    } finally {
      setRewriting(false);
    }
  }

  const lineCount = Math.max(1, content.split("\n").length);
  const previewHtml = useMemo(() => marked.parse(content, { breaks: true }) as string, [content]);

  return (
    <div className="flex h-full flex-col border border-line dark:border-lineDark rounded-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-line dark:border-lineDark bg-white dark:bg-surfaceDark px-3 py-2">
        <EditableFilename
          title={note.title}
          path={note.path}
          type={note.type}
          onRename={(updates) => renameNote(note.id, updates)}
        />
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

      <div className="relative flex-1 min-h-0">
        {mode === "code" ? (
          <>
            <div className="flex h-full">
              <div
                ref={gutterRef}
                className="select-none overflow-hidden text-right pr-2 pl-3 py-4 text-sm font-mono text-graphite dark:text-graphiteDark bg-paper dark:bg-paperDark border-r border-line dark:border-lineDark"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="code-block-view relative flex-1">
                {isMarkdown && (
                  <pre
                    ref={highlightRef}
                    aria-hidden
                    style={{ scrollbarGutter: "stable" }}
                    className="pointer-events-none absolute inset-0 overflow-auto p-4 m-0 font-mono text-sm leading-6 whitespace-pre-wrap break-words"
                  >
                    <code>{highlightToReact(content, "markdown")}</code>
                  </pre>
                )}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onScroll={syncGutterScroll}
                  spellCheck={false}
                  style={isMarkdown ? { scrollbarGutter: "stable" } : undefined}
                  className={
                    isMarkdown
                      ? "relative w-full h-full resize-none p-4 font-mono text-sm leading-6 outline-none bg-transparent text-transparent caret-ink dark:caret-inkDark placeholder:text-graphite dark:placeholder:text-graphiteDark zn-scroll whitespace-pre-wrap break-words"
                      : "block w-full h-full resize-none p-4 font-mono text-sm leading-6 outline-none bg-paper dark:bg-paperDark text-ink dark:text-inkDark zn-scroll"
                  }
                  placeholder="Start writing…"
                />
              </div>
            </div>
            {suggestion && (
              <div className="pointer-events-none absolute bottom-2 left-16 text-xs ghost-text font-mono">
                Tab to accept: {suggestion}
              </div>
            )}
          </>
        ) : (
          <div
            className={
              "p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto h-full zn-scroll " +
              "prose-headings:text-ink dark:prose-headings:text-inkDark " +
              "prose-h1:text-2xl prose-h1:font-bold " +
              "prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 " +
              "prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:uppercase prose-h3:tracking-wide " +
              "prose-p:text-ink dark:prose-p:text-inkDark " +
              "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline " +
              "prose-strong:text-ink dark:prose-strong:text-inkDark " +
              "prose-code:text-accent dark:prose-code:text-accentDark prose-code:before:content-none prose-code:after:content-none " +
              "prose-pre:bg-paper dark:prose-pre:bg-paperDark prose-pre:border prose-pre:border-line dark:prose-pre:border-lineDark " +
              "prose-blockquote:border-l-accent dark:prose-blockquote:border-l-accentDark prose-blockquote:text-graphite dark:prose-blockquote:text-graphiteDark " +
              "prose-hr:border-line dark:prose-hr:border-lineDark " +
              "prose-li:text-ink dark:prose-li:text-inkDark"
            }
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>
    </div>
  );
}
