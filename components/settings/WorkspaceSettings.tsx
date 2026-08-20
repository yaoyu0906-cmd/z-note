"use client";

import { FileTree } from "@/components/workspace/FileTree";
import { TagList } from "@/components/workspace/TagList";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { useSettingsStore } from "@/lib/store/useSettingsStore";

export function WorkspaceSettings() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const setAutosaveEnabled = useSettingsStore((s) => s.setAutosaveEnabled);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Autosave</h2>
        <label className="flex items-center justify-between text-sm mt-2">
          <span className="text-ink dark:text-inkDark">Automatically save unsaved changes</span>
          <input
            type="checkbox"
            checked={autosaveEnabled}
            onChange={(e) => setAutosaveEnabled(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <p className="text-xs text-graphite dark:text-graphiteDark mt-1">
          Periodically saves every open note or canvas with unsaved changes — including pushing to
          the cloud for anything you've synced.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-ink dark:text-inkDark">Local folders</h2>
          <button
            onClick={() => addWorkspace()}
            className="text-xs text-accent dark:text-accentDark hover:underline"
          >
            + Add workspace
          </button>
        </div>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Notes live on disk in the folders you grant access to — Z-Note never uploads file contents
          unless you enable Supabase sync. You can have several workspace folders open at once.
        </p>
        <div className="space-y-4">
          {workspaces.length === 0 && (
            <p className="text-xs text-graphite dark:text-graphiteDark">No workspace open yet.</p>
          )}
          {workspaces.map((ws) => (
            <FileTree key={ws.id} workspaceId={ws.id} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Tags</h2>
        <TagList />
      </div>
    </div>
  );
}
