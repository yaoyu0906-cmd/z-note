"use client";

import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@/components/ui";

type PageView = "preview" | "code" | "split";

const DEFAULT_HTML = `<div style="font-family: sans-serif; padding: 16px;">
  <h2>New Page</h2>
  <p>Edit the code to build something interactive.</p>
</div>`;

export function PageBlock() {
  const [view, setView] = useState<PageView>("split");
  const [code, setCode] = useState(DEFAULT_HTML);

  // Ctrl+` toggles Preview/Code for whichever Page block last received focus.
  useEffect(() => {
    function handleToggle() {
      setView((v) => (v === "preview" ? "code" : v === "code" ? "preview" : "code"));
    }
    window.addEventListener("z-note:toggle-page-view", handleToggle);
    return () => window.removeEventListener("z-note:toggle-page-view", handleToggle);
  }, []);

  const srcDoc = useMemo(() => code, [code]);

  return (
    <div className="border border-line dark:border-lineDark rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-paper dark:bg-paperDark px-2 py-1 border-b border-line dark:border-lineDark">
        <span className="text-[11px] text-graphite dark:text-graphiteDark">Page block</span>
        <div className="flex gap-1">
          {(["preview", "code", "split"] as PageView[]).map((v) => (
            <IconButton key={v} label={v} active={view === v} onClick={() => setView(v)}>
              {v[0].toUpperCase()}
            </IconButton>
          ))}
        </div>
      </div>

      <div className={`grid ${view === "split" ? "grid-cols-2" : "grid-cols-1"}`}>
        {(view === "code" || view === "split") && (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="min-h-[220px] p-3 font-mono text-xs outline-none bg-white dark:bg-surfaceDark text-ink dark:text-inkDark resize-none"
          />
        )}
        {(view === "preview" || view === "split") && (
          <iframe
            title="Page preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="min-h-[220px] w-full bg-white border-l border-line dark:border-lineDark"
          />
        )}
      </div>
    </div>
  );
}
