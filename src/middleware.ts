import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase session middleware.
 *
 * CRITICAL for OAuth: @supabase/ssr's browser client stores the PKCE code
 * verifier in localStorage by default. But the /auth/callback route handler
 * runs on the server, which can't read localStorage. The fix is to use
 * @supabase/ssr's createServerClient in middleware — it syncs the auth
 * session (and PKCE verifier) to cookies, so both client and server share
 * the same storage.
 *
 * Without this middleware, Google OAuth fails with:
 * "PKCE code verifier not found in storage. This can happen if the auth
 * flow was initiated in a different browser or device, or if the storage
 * was cleared."
 *
 * This middleware also refreshes expired sessions on every request.
 */
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ──────────────────────────────────────────────────────────────────
  // H1 fix (Option B): Locale detection — ALWAYS runs, even in demo
  // mode (when Supabase env vars are not set). This is critical because
  // the root layout (`src/app/layout.tsx`) depends on the `x-pathname`
  // header + `mhe:locale` cookie to render `<html lang dir>` correctly.
  //
  // Precedence (enforced in the root layout, NOT here):
  //   1. URL pathname (`/ar/...` → `ar`) — always wins
  //   2. `mhe:locale` cookie (fallback for non-`/ar` routes)
  //   3. Default `en`
  //
  // The cookie is always set to match the current pathname so that:
  //   - `/ar/*` requests always get `mhe:locale=ar` (cookie can NOT override)
  //   - English requests get `mhe:locale=en` (resets any stale `ar` cookie)
  // ──────────────────────────────────────────────────────────────────
  const pathname = request.nextUrl.pathname;
  const isArabic = pathname.startsWith("/ar");

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Content-Language header — additional crawler signal (kept from
  // original implementation, now always set even in demo mode).
  response.headers.set("Content-Language", isArabic ? "ar-EG" : "en-US");

  // Expose the pathname to the root layout via a custom header. The
  // root layout cannot receive `params` (it's the parent of all routes,
  // not a dynamic segment), so `headers().get('x-pathname')` is the
  // cleanest server-side way to know which URL the user requested.
  response.headers.set("x-pathname", pathname);

  // Write a `mhe:locale` cookie on every request so the root layout can
  // read it via `cookies()` as a fallback when the pathname doesn't
  // determine the locale.
  response.cookies.set("mhe:locale", isArabic ? "ar" : "en", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year — survives browser restarts
  });

  // If Supabase isn't configured, skip session refresh (demo mode).
  // The locale headers/cookies above are already set — return now.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        // Re-apply locale headers/cookies on the new response object
        // (the `setAll` callback creates a new `NextResponse` that
        // replaces the original, so we must re-set our locale headers
        // on it to avoid losing them).
        const isAr = pathname.startsWith("/ar");
        response.headers.set("Content-Language", isAr ? "ar-EG" : "en-US");
        response.headers.set("x-pathname", pathname);
        response.cookies.set("mhe:locale", isAr ? "ar" : "en", {
          path: "/",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session (this also sets the cookies via setAll above).
  // IMPORTANT: do not run any code between createServerClient and
  // supabase.auth.getUser — the session refresh depends on this ordering.
  await supabase.auth.getUser();

  return response;
}

export const config = {
 matcher: [
 // Run on all routes except static assets and Next internals.
 "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|js|css)$).*)",
 ],
};
