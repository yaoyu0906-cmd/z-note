import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side counterpart to lib/supabase/client.ts's browser client —
 * used only by the OAuth callback route handler. The browser client
 * writes the PKCE code verifier to a cookie before redirecting to the
 * provider; exchanging the code for a session has to read that same
 * cookie back reliably, and doing that from a Server Component/Route
 * Handler via next/headers is the documented, reliable way (a client
 * component re-reading its own just-set cookie after a full-page
 * redirect round trip is exactly the kind of timing-dependent read that
 * produces "PKCE code verifier not found in storage").
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
