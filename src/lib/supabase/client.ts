"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Returns true when real Supabase credentials are configured.
 * When false, the app falls back to a local-only demo mode backed by
 * localStorage so the UI is fully usable without a backend.
 */
export const isSupabaseConfigured = Boolean(
 supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"),
);

/**
 * Browser Supabase client.
 *
 * IMPORTANT: this is @supabase/ssr's createBrowserClient (not the regular
 * createClient). It syncs the auth session + PKCE verifier to COOKIES
 * (not localStorage), which is required for the server-side /auth/callback
 * route handler to be able to exchange the OAuth code.
 *
 * The matching middleware.ts uses createServerClient with the same cookie
 * strategy, so client and server share the same storage.
 */
export const supabase = isSupabaseConfigured
 ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
 auth: {
 detectSessionInUrl: false, // /auth/callback handles this server-side
 flowType: "pkce",
 persistSession: true,
 autoRefreshToken: true,
 },
 })
 : null;
