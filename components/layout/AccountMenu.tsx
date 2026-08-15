"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Cloud, CloudOff, ImageUp } from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useSyncStore } from "@/lib/store/useSyncStore";
import { formatBytes } from "@/lib/sync";
import { IconButton } from "@/components/ui";

/** The existing avatar placeholder in TopBar, now wired up: a real photo
 *  when one's available (custom upload or Google), otherwise the same
 *  initials-circle look it always had. */
function AvatarGlyph({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth next/image's overhead here
    return <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />;
  }
  return (
    <span className="h-5 w-5 rounded-full bg-accentSoft dark:bg-accentSoftDark flex items-center justify-center text-[10px] text-accent dark:text-accentDark">
      {initial}
    </span>
  );
}

export function AccountMenu() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const usageBytes = useSyncStore((s) => s.usageBytes);
  const quotaBytes = useSyncStore((s) => s.quotaBytes);
  const quotaMessage = useSyncStore((s) => s.quotaMessage);
  const refreshUsage = useSyncStore((s) => s.refreshUsage);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && status === "signed-in") refreshUsage();
  }, [open, status, refreshUsage]);

  const initial = (user?.email ?? "U").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <IconButton label="Account" onClick={() => setOpen((v) => !v)}>
        <AvatarGlyph avatarUrl={user?.avatarUrl ?? null} initial={initial} />
      </IconButton>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark shadow-lg py-1.5 z-50">
          {status === "signed-in" && user ? (
            <>
              <div className="px-3 py-1.5">
                <p className="text-sm text-ink dark:text-inkDark truncate">{user.email}</p>
                <p className="flex items-center gap-1.5 text-xs text-graphite dark:text-graphiteDark mt-0.5">
                  <Cloud size={12} className="shrink-0" />
                  Synced
                </p>
              </div>

              <div className="px-3 py-1.5 border-t border-line dark:border-lineDark">
                <div className="flex items-center justify-between text-[11px] text-graphite dark:text-graphiteDark mb-1">
                  <span>Cloud storage</span>
                  <span>
                    {formatBytes(usageBytes)} / {formatBytes(quotaBytes)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-line dark:bg-lineDark overflow-hidden">
                  <div
                    className={`h-full rounded-full ${usageBytes / quotaBytes > 0.9 ? "bg-red-500" : "bg-accent dark:bg-accentDark"}`}
                    style={{ width: `${Math.min(100, (usageBytes / quotaBytes) * 100)}%` }}
                  />
                </div>
                {quotaMessage && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{quotaMessage}</p>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark border-t border-line dark:border-lineDark"
              >
                <ImageUp size={14} className="shrink-0" />
                Upload avatar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) uploadAvatar(file);
                }}
              />

              {/* Kept intentionally minimal — room for account settings,
                  storage usage, etc. later without redesigning this menu. */}

              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark"
              >
                <LogOut size={14} className="shrink-0" />
                Log out
              </button>
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs text-graphite dark:text-graphiteDark">
                <CloudOff size={12} className="shrink-0" />
                Not signed in
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/login");
                }}
                disabled={status === "unavailable"}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark disabled:opacity-40"
              >
                <LogIn size={14} className="shrink-0" />
                Log in
              </button>
              {status === "unavailable" && (
                <p className="px-3 pt-1 text-[11px] text-graphite dark:text-graphiteDark">
                  Cloud sync isn't set up for this instance.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
