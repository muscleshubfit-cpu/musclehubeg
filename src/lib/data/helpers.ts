"use client";

// Shared helpers + re-exports for the data layer.
// All domain modules under src/lib/data/ import from here.

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { swapLimitFor } from "@/lib/plans";
import { trackReferral, awardCommission } from "@/lib/referral";
import { processSubscriptionInitialPayment } from "@/lib/affiliate-engine";
import { getReferralCookie, clearReferralCookie } from "@/lib/referral-cookie";

// Re-export shared dependencies so consumers of "@/lib/data" can still
// access them, and so domain modules can import everything from "./helpers".
export { supabase, isSupabaseConfigured };
export type { Profile };
export { swapLimitFor, trackReferral, awardCommission, processSubscriptionInitialPayment, getReferralCookie, clearReferralCookie };

/* -------------------------------------------------------------------------- */
/* Upload validation helper (M7 fix) */
/* -------------------------------------------------------------------------- */

const MAX_FILE_SIZE_LABEL = (bytes: number) =>
 bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))}MB` : `${Math.round(bytes / 1024)}KB`;

/**
 * Validate a file's type + size before uploading to Supabase Storage.
 * Throws a user-friendly error if validation fails.
 */
export function validateUploadFile(file: File, allowedTypes: string[], maxSize: number) {
 if (!file) throw new Error("No file provided");
 if (!allowedTypes.includes(file.type)) {
 throw new Error(
 `Invalid file type: ${file.type || "unknown"}. Allowed: ${allowedTypes.join(", ")}`,
 );
 }
 if (file.size > maxSize) {
 throw new Error(
 `File too large: ${MAX_FILE_SIZE_LABEL(file.size)}. Maximum: ${MAX_FILE_SIZE_LABEL(maxSize)}`,
 );
 }
}

/* -------------------------------------------------------------------------- */
/* Local fallback store — used when Supabase env vars are missing. */
/* Keeps the app fully usable in preview / demo mode. */
/* -------------------------------------------------------------------------- */

export const LS_USERS = "mhe:users";
export const LS_SESSION = "mhe:session";
export const LS_PROFILES = "mhe:profiles";
export const LS_SUBS = "mhe:subs";
export const LS_PROGRESS = "mhe:progress";
export const LS_PLANS = "mhe:plans";
export const LS_TICKETS = "mhe:tickets";
export const LS_TICKET_MSGS = "mhe:ticket_msgs";
export const LS_NUTRI_Q = "mhe:nutri_q";
export const LS_FIT_Q = "mhe:fit_q";
export const LS_CHAT = "mhe:chat";

export const LS_PREFIX = "mhe:";

export type StoredUser = { id: string; email: string; password: string };
export type Session = { userId: string; email: string } | null;

export function read<T>(key: string, fallback: T): T {
 try {
 const raw = localStorage.getItem(key);
 return raw ? (JSON.parse(raw) as T) : fallback;
 } catch {
 return fallback;
 }
}
export function write<T>(key: string, val: T) {
 try {
 localStorage.setItem(key, JSON.stringify(val));
 } catch {}
}

export function uid() {
 return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
