"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, CloudOff, Download, LogIn, LogOut, ImageUp } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { useSettingsSyncStore } from "@/lib/settingsSync";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAllCloudEntries, fetchCloudFile, type CloudEntry } from "@/lib/sync";
import { pickSaveLocation, writeFile } from "@/lib/fs/fileSystemAccess";
import { Button } from "@/components/ui";

export function AccountSettings() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const settingsSyncEnabled = useSettingsSyncStore((s) => s.enabled);
  const settingsSyncStatus = useSettingsSyncStore((s) => s.status);
  const setSettingsSyncEnabled = useSettingsSyncStore((s) => s.setEnabled);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const syncedEntries = useSyncStore((s) => s.syncedEntries);
  const unsync = useSyncStore((s) => s.unsync);

  const [cloudFiles, setCloudFiles] = useState<(CloudEntry & { workspaceName: string })[] | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const syncedList = useMemo(() => {
    return Object.entries(syncedEntries).map(([key, entry]) => {
      const [workspaceId, path] = key.split("::");
      const workspaceName = workspaces.find((w) => w.id === workspaceId)?.name ?? "Unknown workspace";
      return { workspaceId, path, workspaceName, isFolder: entry.isFolder };
    });
  }, [syncedEntries, workspaces]);

  useEffect(() => {
    if (status !== "signed-in" || !user) return;
    fetchAllCloudEntries(user.id)
      .then(setCloudFiles)
      .catch(() => setCloudFiles([]));
  }, [status, user]);

  async function handleDownload(entry: CloudEntry & { workspaceName: string }) {
    if (!user) return;
    const key = `${entry.workspaceName}::${entry.path}`;
    setDownloadingKey(key);
    try {
      const full = await fetchCloudFile(user.id, entry.workspaceName, entry.path);
      if (!full || full.content == null) return;
      const suggestedName = entry.path.split("/").pop() ?? entry.path;
      const picked = await pickSaveLocation(suggestedName);
      if (!picked) return;
      await writeFile(picked, full.content);
    } finally {
      setDownloadingKey(null);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Account</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark">
          Cloud sync isn't set up for this instance of Z-Note. Everything still works fully offline
          with no account.
        </p>
      </div>
    );
  }

  if (status !== "signed-in") {
    return (
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Account</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Login is entirely optional — Z-Note works fully offline without an account. Log in to sync
          files across devices.
        </p>
        <Button variant="primary" onClick={() => router.push("/login")}>
          <LogIn size={14} /> Log in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Account</h2>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm text-ink dark:text-inkDark">{user?.email}</p>
            <p className="text-xs text-graphite dark:text-graphiteDark">
              Signed in with {user?.provider === "google" ? "Google" : "email"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut size={13} /> Log out
          </Button>
        </div>
        <label className="inline-flex items-center gap-1.5 mt-2 text-xs text-accent dark:text-accentDark hover:underline cursor-pointer">
          <ImageUp size={13} />
          Upload avatar
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadAvatar(file);
            }}
          />
        </label>
      </div>

      <div className="pt-2 border-t border-line dark:border-lineDark">
        <label className="flex items-center justify-between text-sm">
          <span className="text-ink dark:text-inkDark">
            Sync settings across devices
            {settingsSyncStatus === "syncing" && (
              <span className="ml-1.5 text-xs text-graphite dark:text-graphiteDark">Syncing…</span>
            )}
          </span>
          <input
            type="checkbox"
            checked={settingsSyncEnabled}
            onChange={(e) => setSettingsSyncEnabled(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
        </label>
        <p className="text-xs text-graphite dark:text-graphiteDark mt-1">
          Syncs appearance, shortcuts, and Canvas preferences to your account — not your notes.
        </p>
      </div>

      <div className="pt-2 border-t border-line dark:border-lineDark">
        <h3 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Synced files &amp; folders</h3>
        {syncedList.length === 0 ? (
          <p className="text-xs text-graphite dark:text-graphiteDark">
            Nothing is synced yet. Right-click a file or folder in the Explorer and choose “Sync to
            Cloud”.
          </p>
        ) : (
          <ul className="divide-y divide-line dark:divide-lineDark border border-line dark:border-lineDark rounded-md overflow-hidden">
            {syncedList.map((item) => (
              <li key={`${item.workspaceId}::${item.path}`} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink dark:text-inkDark truncate">{item.path || item.workspaceName}</p>
                  <p className="text-[11px] text-graphite dark:text-graphiteDark truncate">{item.workspaceName}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => unsync(item.workspaceId, item.path, item.isFolder, { deleteCloud: false })}
                >
                  <CloudOff size={12} /> Stop syncing
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-2 border-t border-line dark:border-lineDark">
        <h3 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Cloud files</h3>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-2">
          Everything synced from any device on this account. Download a copy to view or edit it here.
        </p>
        {cloudFiles === null ? (
          <p className="text-xs text-graphite dark:text-graphiteDark">Loading…</p>
        ) : cloudFiles.length === 0 ? (
          <p className="text-xs text-graphite dark:text-graphiteDark">No cloud files yet.</p>
        ) : (
          <ul className="divide-y divide-line dark:divide-lineDark border border-line dark:border-lineDark rounded-md overflow-hidden max-h-64 overflow-y-auto zn-scroll">
            {cloudFiles
              .filter((f) => !f.isFolder)
              .map((file) => {
                const key = `${file.workspaceName}::${file.path}`;
                return (
                  <li key={key} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <Cloud size={13} className="shrink-0 text-graphite dark:text-graphiteDark" />
                      <div className="min-w-0">
                        <p className="text-sm text-ink dark:text-inkDark truncate">{file.path}</p>
                        <p className="text-[11px] text-graphite dark:text-graphiteDark truncate">{file.workspaceName}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleDownload(file)} disabled={downloadingKey === key}>
                      <Download size={12} /> {downloadingKey === key ? "Saving…" : "Download"}
                    </Button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
