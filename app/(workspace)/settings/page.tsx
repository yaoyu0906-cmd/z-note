"use client";

import { useState } from "react";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { AISettings } from "@/components/settings/AISettings";
import { ShortcutSettings } from "@/components/settings/ShortcutSettings";
import { CanvasSettings } from "@/components/settings/CanvasSettings";
import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";

const SECTIONS = [
  { id: "appearance", label: "Appearance" },
  { id: "ai", label: "AI" },
  { id: "shortcuts", label: "Keyboard Shortcuts" },
  { id: "canvas", label: "Canvas" },
  { id: "workspace", label: "Workspace" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const [section, setSection] = useState<SectionId>("appearance");

  return (
    <div className="flex h-full">
      <nav className="w-48 shrink-0 border-r border-line dark:border-lineDark p-4 space-y-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded ${
              section === s.id
                ? "bg-accentSoft dark:bg-accentSoftDark text-accent dark:text-accentDark"
                : "text-graphite dark:text-graphiteDark hover:bg-paper dark:hover:bg-paperDark"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 p-6 max-w-2xl">
        {section === "appearance" && <AppearanceSettings />}
        {section === "ai" && <AISettings />}
        {section === "shortcuts" && <ShortcutSettings />}
        {section === "canvas" && <CanvasSettings />}
        {section === "workspace" && <WorkspaceSettings />}
      </div>
    </div>
  );
}
