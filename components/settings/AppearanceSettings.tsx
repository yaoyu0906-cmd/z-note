"use client";

import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { Button } from "@/components/ui";
import type { ThemeMode } from "@/lib/types/theme";

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "custom", label: "Custom (coming soon)" },
];

export function AppearanceSettings() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark">Theme</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mt-0.5">
          Inspired by Apple Notes and Notion. Custom themes are planned — this
          screen is the extension point for a future token editor.
        </p>
      </div>
      <div className="flex gap-2">
        {MODES.map((m) => (
          <Button
            key={m.id}
            variant={themeMode === m.id ? "primary" : "secondary"}
            size="md"
            disabled={m.id === "custom"}
            onClick={() => setThemeMode(m.id)}
          >
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
