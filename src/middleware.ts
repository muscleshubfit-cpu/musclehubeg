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

 // If Supabase isn't configured, skip middleware (demo mode).
 if (!supabaseUrl || !supabaseAnonKey) {
 return NextResponse.next();
 }

 let response = NextResponse.next({
 request: {
 headers: request.headers,
 },
 });

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
