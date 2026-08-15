import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { useAuthStore } from "@/lib/store/useAuthStore";

/**
 * Mirrors the *whole* useSettingsStore object to one JSONB row per user —
 * deliberately one opaque blob rather than a column-per-setting schema, so
 * this doesn't need updating every time a new setting is added to the
 * store. Supabase's client serializes the value to JSON before sending
 * it, which naturally drops the store's action functions and leaves only
 * plain data — that data is exactly what `useSettingsStore.setState(...)`
 * expects on the way back in (zustand's setState does a shallow merge, so
 * the existing action functions are left untouched).
 *
 * Off by default, opt-in from Settings → Account, and — like everything
 * else here — the *preference itself* ("do I want this on") lives in the
 * same cloud row (the `enabled` flag), not in local storage, so logging
 * into a second device picks the preference back up automatically instead
 * of defaulting to off every time.
 */

interface SettingsSyncState {
  enabled: boolean;
  status: "idle" | "syncing" | "error";
  loaded: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  loadFromCloud: () => Promise<void>;
}

export const useSettingsSyncStore = create<SettingsSyncState>((set, get) => ({
  enabled: false,
  status: "idle",
  loaded: false,

  loadFromCloud: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_settings")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle<{ data: { enabled?: boolean; settings?: Record<string, unknown> } }>();
    if (error) {
      set({ loaded: true });
      return;
    }
    const blob = data?.data;
    if (blob?.enabled) {
      if (blob.settings) useSettingsStore.setState(blob.settings);
      set({ enabled: true, loaded: true });
    } else {
      set({ loaded: true });
    }
  },

  setEnabled: async (enabled) => {
    set({ enabled });
    await pushSettingsSnapshot(enabled);
  },
}));

async function pushSettingsSnapshot(enabled: boolean): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  useSettingsSyncStore.setState({ status: "syncing" });
  const supabase = createClient();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      data: { enabled, settings: useSettingsStore.getState() },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  useSettingsSyncStore.setState({ status: error ? "error" : "idle" });
}

let watching = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Pushes a fresh snapshot (debounced) whenever settings change while
 *  sync is enabled. Call once for the app's lifetime — see
 *  ThemeProvider, which already owns other one-time global setup. */
export function startSettingsSyncWatcher(): void {
  if (watching) return;
  watching = true;
  useSettingsStore.subscribe(() => {
    if (!useSettingsSyncStore.getState().enabled) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => pushSettingsSnapshot(true), 800);
  });
}
