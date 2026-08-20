"use client";

import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useSettingsSyncStore, startSettingsSyncWatcher } from "@/lib/settingsSync";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { startAutosave } from "@/lib/autosave";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const authStatus = useAuthStore((s) => s.status);
  const loadSettingsFromCloud = useSettingsSyncStore((s) => s.loadFromCloud);
  const workspaceIds = useWorkspaceStore((s) => s.workspaces.map((w) => w.id).join(","));

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    // "custom" themes will set CSS variables directly once the theme
    // editor ships; class toggling only covers light/dark for now.
  }, [themeMode]);

  // Runs once for the whole app (login page and OAuth callback included,
  // not just the main workspace shell) — safe to call from multiple
  // places since useAuthStore.initialize() no-ops after the first call.
  useEffect(() => {
    initializeAuth();
    startSettingsSyncWatcher();
    startAutosave();
  }, [initializeAuth]);

  // Pulls the "sync settings across devices" preference (and, if it was
  // left on, the settings themselves) as soon as a session is available —
  // covers both a fresh login and a page reload that restores an existing
  // session.
  useEffect(() => {
    if (authStatus === "signed-in") loadSettingsFromCloud();
  }, [authStatus, loadSettingsFromCloud]);

  // Pulls the synced-files set for every open workspace whenever a
  // session becomes available or a new workspace is opened — this is what
  // makes cloud badges/"already synced" state correct without a separate
  // local persistence layer (the cloud rows are the source of truth for
  // "what's marked synced").
  useEffect(() => {
    if (authStatus !== "signed-in") return;
    const ids = workspaceIds ? workspaceIds.split(",") : [];
    ids.forEach((id) => useSyncStore.getState().refreshWorkspace(id));
    useSyncStore.getState().refreshUsage();
  }, [authStatus, workspaceIds]);

  // The browser's own warning for closing/reloading the whole page —
  // distinct from Z-Note's own close-tab dialog, which only applies to
  // closing a single tab from within the app and can't intercept a page
  // unload at all. Registered once; checks current dirty state at fire
  // time rather than re-subscribing on every draft change.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (useDraftStore.getState().dirtyNoteIds().length === 0) return;
      e.preventDefault();
      // Chrome ignores any custom string and shows its own generic
      // message, but returnValue still needs setting for the prompt to
      // appear at all in some browsers.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return <>{children}</>;
}
