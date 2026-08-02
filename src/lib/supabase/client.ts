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

export const supabase = isSupabaseConfigured
  ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;
