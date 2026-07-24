"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import { useSettingsStore } from "@/lib/store/useSettingsStore";

/**
 * Structural placeholder for the AI chat surface on Home. Wire this up to
 * `lib/ai/providers.ts` + the decrypted key from the vault once auth is in
 * place — mirrors the same complete() call used by MarkdownEditor's rewrite
 * actions and useGhostText, so there's one call path to keep consistent.
 */
export function AIChatEntry() {
  const [prompt, setPrompt] = useState("");
  const chatEnabled = useSettingsStore((s) => s.aiFeatureFlags.chat);

  if (!chatEnabled) return null;

  return (
    <div className="rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark p-3">
      <p className="text-xs text-graphite dark:text-graphiteDark mb-2">Ask AI anything about your notes</p>
      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Summarize my week, find related notes, draft an outline…"
        />
        <Button size="md" disabled>
          Ask
        </Button>
      </div>
    </div>
  );
}
