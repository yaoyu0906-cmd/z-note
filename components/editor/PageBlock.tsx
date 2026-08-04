"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Code2, Columns2, X } from "lucide-react";
import { IconButton } from "@/components/ui";
import { highlightToReact, trailingLineFiller } from "@/lib/editor/highlightToReact";

type PageView = "preview" | "code" | "split";

interface PageBlockProps {
  /** Controlled mode (used by the TipTap node view so undo/redo works). */
  value?: string;
  onChange?: (next: string) => void;
  title?: string;
  onTitleChange?: (next: string) => void;
  onDelete?: () => void;
}

export function PageBlock({ value, onChange, title, onTitleChange, onDelete }: PageBlockProps) {
  const [view, setView] = useState<PageView>("split");
  const [internalCode, setInternalCode] = useState("");
  const [internalTitle, setInternalTitle] = useState("");
  const isControlled = value !== undefined;
  const code = isControlled ? value! : internalCode;
  const displayTitle = onTitleChange ? title ?? "" : internalTitle;

  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function setCode(next: string) {
    if (isControlled) onChange?.(next);
    else setInternalCode(next);
  }

  function setTitle(next: string) {
    if (onTitleChange) onTitleChange(next);
    else setInternalTitle(next);
  }

  // Ctrl+` toggles Preview/Code for whichever Page block last received focus.
  useEffect(() => {
    function handleToggle() {
      setView((v) => (v === "preview" ? "code" : v === "code" ? "preview" : "code"));
    }
    window.addEventListener("z-note:toggle-page-view", handleToggle);
    return () => window.removeEventListener("z-note:toggle-page-view", handleToggle);
  }, []);

  function syncScroll() {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  }

  const lineCount = Math.max(1, code.split("\n").length);

  return (
    <div className="border border-line dark:border-lineDark rounded-md overflow-hidden">
      <div className="flex items-center justify-between gap-2 bg-paper dark:bg-paperDark px-2 py-1 border-b border-line dark:border-lineDark">
        <input
          value={displayTitle}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page block"
          className="flex-1 min-w-0 bg-transparent text-[11px] text-ink dark:text-inkDark placeholder:text-graphite dark:placeholder:text-graphiteDark outline-none px-1 py-0.5 rounded hover:bg-white dark:hover:bg-surfaceDark focus:bg-white dark:focus:bg-surfaceDark focus:ring-1 focus:ring-accent dark:focus:ring-accentDark"
        />
        <div className="flex gap-1 items-center shrink-0">
          <IconButton label="Preview" active={view === "preview"} onClick={() => setView("preview")}>
            <Eye size={14} />
          </IconButton>
          <IconButton label="Code" active={view === "code"} onClick={() => setView("code")}>
            <Code2 size={14} />
          </IconButton>
          <IconButton label="Split" active={view === "split"} onClick={() => setView("split")}>
            <Columns2 size={14} />
          </IconButton>
          {onDelete && (
            <IconButton label="Delete page block" onClick={onDelete}>
              <X size={14} />
            </IconButton>
          )}
        </div>
      </div>

      <div className={`grid ${view === "split" ? "grid-cols-2" : "grid-cols-1"}`}>
        {(view === "code" || view === "split") && (
          <div className="flex h-[420px] bg-white dark:bg-surfaceDark">
            <div
              ref={gutterRef}
              className="select-none overflow-hidden text-right pr-2 pl-3 py-3 text-xs font-mono text-graphite dark:text-graphiteDark bg-paper dark:bg-paperDark border-r border-line dark:border-lineDark"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="leading-5">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="code-block-view code-overlay relative flex-1">
              <pre
                ref={highlightRef}
                aria-hidden
                style={{ scrollbarGutter: "stable" }}
                className="pointer-events-none absolute inset-0 overflow-auto zn-scroll p-3 m-0 font-mono text-xs leading-5 whitespace-pre"
              >
                <code>
                  {highlightToReact(code, "xml")}
                  {trailingLineFiller(code)}
                </code>
              </pre>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  requestAnimationFrame(syncScroll);
                }}
                onScroll={syncScroll}
                spellCheck={false}
                wrap="off"
                placeholder="<!-- Write HTML, CSS, and JS here -->"
                style={{ scrollbarGutter: "stable" }}
                className="relative w-full h-full min-h-[420px] resize-none p-3 font-mono text-xs leading-5 whitespace-pre outline-none bg-transparent text-transparent caret-ink dark:caret-inkDark placeholder:text-graphite dark:placeholder:text-graphiteDark zn-scroll"
              />
            </div>
          </div>
        )}
        {(view === "preview" || view === "split") && (
          <iframe
            title="Page preview"
            srcDoc={code}
            sandbox="allow-scripts"
            className="h-[420px] w-full bg-white border-l border-line dark:border-lineDark"
          />
        )}
      </div>
    </div>
  );
}
