import { create } from "zustand";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string | null;
  /** Resolved avatar to display — a custom upload if one exists in
   *  user_metadata, otherwise the Google profile photo when signed in
   *  with Google, otherwise null (falls back to the initials placeholder). */
  avatarUrl: string | null;
  provider: "email" | "google";
}

function toAuthUser(supabaseUser: {
  id: string;
  email?: string | null;
  app_metadata?: { provider?: string };
  user_metadata?: { avatar_url?: string; picture?: string };
}): AuthUser {
  const provider = supabaseUser.app_metadata?.provider === "google" ? "google" : "email";
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    // Custom uploads are written to user_metadata.avatar_url on our end;
    // a fresh Google sign-in populates user_metadata.picture instead —
    // prefer the custom upload if the user has set one.
    avatarUrl: supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture ?? null,
    provider,
  };
}

interface AuthState {
  /** "unavailable" = no Supabase project configured at all (default,
   *  local-only setup) — the account UI should quietly not offer login. */
  status: "loading" | "signed-out" | "signed-in" | "unavailable";
  user: AuthUser | null;
  error: string | null;

  initialize: () => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  clearError: () => void;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: isSupabaseConfigured() ? "loading" : "unavailable",
  user: null,
  error: null,

  initialize: () => {
    if (initialized || !isSupabaseConfigured()) return;
    initialized = true;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      set({
        status: data.session ? "signed-in" : "signed-out",
        user: data.session ? toAuthUser(data.session.user) : null,
      });
    });

    // Keeps the store (and every component reading it) in sync with
    // Supabase's own session state — including the session Supabase
    // already persists across reloads by default, which is what gives us
    // "stay signed in until you log out" for free.
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        status: session ? "signed-in" : "signed-out",
        user: session ? toAuthUser(session.user) : null,
      });
    });
  },

  signInWithPassword: async (email, password) => {
    const supabase = createClient();
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message });
  },

  signUpWithPassword: async (email, password) => {
    const supabase = createClient();
    set({ error: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ error: error.message });
  },

  signInWithGoogle: async () => {
    const supabase = createClient();
    set({ error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) set({ error: error.message });
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ status: "signed-out", user: null });
  },

  uploadAvatar: async (file) => {
    const { user } = get();
    if (!user) return;
    const supabase = createClient();
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() ?? "png"}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (uploadError) {
      set({ error: uploadError.message });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: data.publicUrl },
    });
    if (updateError) {
      set({ error: updateError.message });
      return;
    }
    set({ user: { ...user, avatarUrl: data.publicUrl } });
  },

  clearError: () => set({ error: null }),
}));
