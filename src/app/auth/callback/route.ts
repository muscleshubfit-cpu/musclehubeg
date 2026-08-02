import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * OAuth callback handler.
 *
 * After Google (or any OAuth provider) redirects back to Supabase, Supabase
 * exchanges the provider code for a session and redirects the user to this
 * route with a `?code=...` query param (the PKCE auth code).
 *
 * This server-side route exchanges that code for a session cookie, then
 * redirects the user to the home page where the client will pick up the
 * authenticated session via the cookie.
 *
 * This is the standard Supabase + Next.js App Router OAuth flow. Without it,
 * the code param is never exchanged and the user appears logged-out.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // If Supabase/Google returned an error, send the user home with a flag.
  if (error) {
    console.error("[auth/callback] OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${requestUrl.origin}/?auth_error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    });

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("[auth/callback] Code exchange failed:", exchangeError.message);
        return NextResponse.redirect(
          `${requestUrl.origin}/?auth_error=${encodeURIComponent(exchangeError.message)}`,
        );
      }
      // Success — session cookie is now set. Redirect to home (or `next`).
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (e: any) {
      console.error("[auth/callback] Exception:", e?.message || e);
      return NextResponse.redirect(
        `${requestUrl.origin}/?auth_error=${encodeURIComponent(e?.message || "unknown")}`,
      );
    }
  }

  // No code present — just redirect home.
  return NextResponse.redirect(`${requestUrl.origin}/`);
}
