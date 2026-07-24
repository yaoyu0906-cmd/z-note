"use client";

import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { ApiKeySettings } from "@/components/Settings/ApiKeySettings";
import { DEMO_USER_ID } from "@/lib/constants";
import type { AIFeatureFlags } from "@/lib/types/ai";

const FEATURE_LABELS: Record<keyof AIFeatureFlags, string> = {
  chat: "AI Chat",
  inline: "Inline AI",
  slashCommands: "Slash Commands",
  autocomplete: "Autocomplete (ghost text)",
  quickActions: "Quick Actions",
};

export function AISettings() {
  const flags = useSettingsStore((s) => s.aiFeatureFlags);
  const toggleFlag = useSettingsStore((s) => s.toggleAIFeature);
  const selectedModels = useSettingsStore((s) => s.selectedModels);
  const setModel = useSettingsStore((s) => s.setModel);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">AI features</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Each surface can be turned off independently — AI should feel optional, not intrusive.
        </p>
        <div className="space-y-2">
          {(Object.keys(FEATURE_LABELS) as (keyof AIFeatureFlags)[]).map((key) => (
            <label key={key} className="flex items-center justify-between text-sm">
              <span className="text-ink dark:text-inkDark">{FEATURE_LABELS[key]}</span>
              <input
                type="checkbox"
                checked={flags[key]}
                onChange={() => toggleFlag(key)}
                className="h-4 w-4 accent-accent"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Providers &amp; keys</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Bring your own key — encrypted client-side before it's stored. See
          the README for the full security model.
        </p>
        <ApiKeySettings
          userId={DEMO_USER_ID}
          selectedModels={selectedModels}
          onModelChange={setModel}
        />
      </div>
    </div>
  );
}
