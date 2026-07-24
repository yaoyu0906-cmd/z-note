"use client";

import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/lib/store/useSettingsStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    // "custom" themes will set CSS variables directly once the theme
    // editor ships; class toggling only covers light/dark for now.
  }, [themeMode]);

  return <>{children}</>;
}
