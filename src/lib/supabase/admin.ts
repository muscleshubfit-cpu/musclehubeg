import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Privileged, SERVER-ONLY Supabase client using the service-role key.
 * Bypasses RLS — never import this in any client component or expose
 * it to the browser. Used by trusted server contexts only: cron jobs,
 * admin API routes that already verified the caller.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseAdminConfigured = Boolean(supabaseUrl && serviceRoleKey);

export const supabaseAdmin = isSupabaseAdminConfigured
 ? createClient<Database>(supabaseUrl, serviceRoleKey, {
 auth: { autoRefreshToken: false, persistSession: false },
 })
 : null;
