import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google sign-in redirects here with a `?code=...` param. This runs
 * server-side (a Route Handler, not a client component) specifically to
 * reliably read the PKCE code verifier cookie the browser client wrote
 * before redirecting to Google — doing the exchange in a client component
 * instead relies on the browser re-reading its own just-set cookie after
 * a full-page redirect round trip, which is exactly the kind of
 * timing-dependent read that intermittently fails with "PKCE code
 * verifier not found in storage".
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/", url.origin));
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=Missing%20authorization%20code", url.origin));
}
