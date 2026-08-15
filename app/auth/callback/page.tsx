"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Google sign-in redirects here with a `?code=...` param. Supabase's
 * browser client uses the PKCE flow, which (unlike the older implicit
 * grant) requires this explicit exchange step rather than picking the
 * session up from the URL automatically.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/");
    });
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center bg-paper dark:bg-paperDark">
      <div className="text-center space-y-2">
        <p className="text-sm text-ink dark:text-inkDark">
          {error ? "Sign-in failed." : "Signing you in…"}
        </p>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        {error && (
          <a href="/login" className="text-xs text-accent dark:text-accentDark hover:underline">
            Back to login
          </a>
        )}
      </div>
    </div>
  );
}
