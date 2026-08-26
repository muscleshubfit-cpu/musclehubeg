import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { safeNext } from "@/lib/safe-redirect";

/**
 * OAuth callback handler (server-side).
 *
 * Flow:
 * 1. User clicks "Continue with Google" on the client.
 * 2. Client calls supabase.auth.signInWithOAuth({ redirectTo: '/auth/callback' }).
 * This stores a PKCE code verifier in cookies (via @supabase/ssr + middleware).
 * 3. Browser redirects to Google → user consents → Google redirects to Supabase.
 * 4. Supabase exchanges Google's code for its own auth code, then redirects to
 * /auth/callback?code=XXX (our server route).
 * 5. THIS handler reads the code, exchanges it for a session (using the PKCE
 * verifier from the cookie), sets the session cookie, and redirects to /.
 * 6. The client's onAuthStateChange listener fires with the new session,
 * updating the UI (user lands on their dashboard).
 *
 * If anything goes wrong, the user is redirected to /?auth_error=... so the
 * client can display a friendly error message.
 */
export async function GET(request: Request) {
 const requestUrl = new URL(request.url);
 const code = requestUrl.searchParams.get("code");
 const next = requestUrl.searchParams.get("next") || "/";
 const error = requestUrl.searchParams.get("error");
 const errorDescription = requestUrl.searchParams.get("error_description");

 if (error) {
 console.error("[auth/callback] OAuth provider error:", error, errorDescription);
 return NextResponse.redirect(
 `${requestUrl.origin}/?auth_error=${encodeURIComponent(error)}`,
 );
 }

 if (!code) {
 return NextResponse.redirect(`${requestUrl.origin}/`);
 }

 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

 if (!supabaseUrl || !supabaseAnonKey) {
 console.error("[auth/callback] Missing Supabase env vars");
 return NextResponse.redirect(
 `${requestUrl.origin}/?auth_error=${encodeURIComponent("server-config")}`,
 );
 }

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
 // Called from a Server Component — middleware will refresh the session.
 }
 },
 },
 });

 try {
 const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
 if (exchangeError) {
 console.error("[auth/callback] Code exchange failed:", exchangeError.message);
 return NextResponse.redirect(
 `${requestUrl.origin}/?auth_error=${encodeURIComponent(exchangeError.message)}`,
 );
 }
 // Session is now set in cookies. Send the user home.
 // Do not log user email — PII violation per SECURITY.md §2.3 (C9 fix).
 return NextResponse.redirect(`${requestUrl.origin}${safeNext(next)}`);
 } catch (e: any) {
 console.error("[auth/callback] Exception:", e?.message || e);
 return NextResponse.redirect(
 `${requestUrl.origin}/?auth_error=${encodeURIComponent(e?.message || "unknown")}`,
 );
 }
}
