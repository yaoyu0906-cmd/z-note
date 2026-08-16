"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  useEffect(() => {
    if (status === "signed-in") router.replace("/");
  }, [status, router]);

  // Surfaces a failed OAuth callback (e.g. the Google flow) — the route
  // handler redirects errors back here as ?error=... rather than showing
  // its own page, so this reuses the exact same error display already
  // used for email/password sign-in below.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get("error");
    if (callbackError) {
      useAuthStore.setState({ error: decodeURIComponent(callbackError) });
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    clearError();
    if (mode === "login") {
      await signInWithPassword(email, password);
    } else {
      await signUpWithPassword(email, password);
      // Supabase sends a confirmation email by default; there's no session
      // yet at this point, so tell the person to go check their inbox
      // rather than silently doing nothing.
      if (!useAuthStore.getState().error) setSignupSent(true);
    }
    setSubmitting(false);
  }

  return (
    <div className="h-screen flex items-center justify-center bg-paper dark:bg-paperDark px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold text-ink dark:text-inkDark">Z-Note</h1>
          <p className="text-sm text-graphite dark:text-graphiteDark">
            {mode === "login" ? "Log in to sync across devices" : "Create an account to sync across devices"}
          </p>
        </div>

        {!isSupabaseConfigured() ? (
          <div className="rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark p-4 text-sm text-graphite dark:text-graphiteDark">
            Cloud sync isn't set up for this instance of Z-Note yet. You can still use Z-Note fully
            offline with no account —{" "}
            <a href="/" className="text-accent dark:text-accentDark hover:underline">
              go back
            </a>
            .
          </div>
        ) : signupSent ? (
          <div className="rounded-md border border-line dark:border-lineDark bg-white dark:bg-surfaceDark p-4 text-sm text-ink dark:text-inkDark space-y-2">
            <p>Check your inbox to confirm {email}, then come back and log in.</p>
            <button
              onClick={() => {
                setSignupSent(false);
                setMode("login");
              }}
              className="text-xs text-accent dark:text-accentDark hover:underline"
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => signInWithGoogle()}
            >
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-line dark:bg-lineDark" />
              <span className="text-[11px] text-graphite dark:text-graphiteDark">or</span>
              <div className="flex-1 h-px bg-line dark:bg-lineDark" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
              />
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" variant="primary" className="w-full justify-center" disabled={submitting}>
                {mode === "login" ? "Log in" : "Sign up"}
              </Button>
            </form>

            <p className="text-center text-xs text-graphite dark:text-graphiteDark">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  clearError();
                  setMode(mode === "login" ? "signup" : "login");
                }}
                className="text-accent dark:text-accentDark hover:underline"
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-graphite dark:text-graphiteDark">
          <a href="/" className="hover:underline">
            Continue without an account
          </a>
        </p>
      </div>
    </div>
  );
}
