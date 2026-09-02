/**
 * Queue helpers for the blog generation pipeline.
 *
 * PIPELINE V3 (2026-08-27 lang split): one queue row == ONE article in
 * ONE language (`language` column: 'en' | 'ar'). The two language
 * workflows run on their own GitHub Actions schedules and never share
 * rows. Each step still processes a single queue item identified by
 * its UUID; the queueId is threaded from P0 (which inserts the row and
 * returns its id) through every subsequent step via `?queueId=<uuid>`.
 *
 * This file centralizes:
 *   1. Reading the queueId + lang query params.
 *   2. Fetching the queue row by id (NOT by status).
 *   3. Resolving a row's pipeline language defensively.
 *   4. Validating the queue row is in the EXPECTED status.
 *   5. Performing UPDATEs with explicit error checking
 *      (see MH-QUEUE-HANDOFF-007 root cause).
 */

import type { NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type PipelineLang = "en" | "ar";

export type QueueItem = {
  id: string;
  topic: string;
  focus_keyword: string;
  // LEGACY dual-language columns — kept so old published rows render in
  // admin tooling, but V3 single-language rows leave them null until P1
  // of an 'ar' row mirrors its values in for reporting convenience.
  topic_ar?: string | null;
  focus_keyword_ar?: string | null;
  // LANGUAGE SPLIT (2026-08-27): mandatory since migration 0026 applied.
  language?: string | null;
  category: string;
  status: string;
  article_bundle: string | null;
  error_message: string | null;
  en_post_id: string | null;
  ar_post_id: string | null;
  created_at: string;
};

/**
 * Read the `queueId` query parameter from the request URL.
 *
 * Returns null if the parameter is missing or empty.
 */
export function getQueueIdParam(request: NextRequest): string | null {
  const url = new URL(request.url);
  const qid = url.searchParams.get("queueId");
  if (!qid || qid.trim().length === 0) return null;
  return qid.trim();
}

/**
 * Read + validate the `lang` query parameter ('en' | 'ar').
 *
 * P0 REQUIRES it (the language IS the run's identity). Later steps may
 * pass it too for logging symmetry, but they always derive truth from
 * the ROW (rowLang below), never from the URL — the URL only sets up
 * the row once, at P0 time.
 */
export function getLangParam(request: NextRequest): PipelineLang | null {
  const url = new URL(request.url);
  const raw = url.searchParams.get("lang");
  return raw === "en" || raw === "ar" ? raw : null;
}

/**
 * Defensive row-language resolution. Migration 0026 backfills every
 * legacy row, so a NULL here means the migration was not applied yet —
 * callers surface an actionable error instead of silently generating
 * the wrong language.
 */
export function rowLang(qi: Pick<QueueItem, "language">): PipelineLang {
  return qi.language === "ar" ? "ar" : qi.language === "en" ? "en" : (null as unknown as PipelineLang);
}

export function isLangColumnMissing(lang: PipelineLang | null): boolean {
  return lang !== "en" && lang !== "ar";
}

/**
 * Fetch a queue item by id. Returns null if the row doesn't exist
 * (e.g. queueId was malformed, or Step 1's INSERT silently failed).
 *
 * Throws an Error if Supabase returns an error (network / RLS / etc).
 */
export async function fetchQueueItem(
  queueId: string,
): Promise<{ data: QueueItem | null; error: string | null }> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return { data: null, error: "Supabase admin not configured." };
  }
  const { data, error } = await supabaseAdmin
    .from("blog_generation_queue")
    .select("*")
    .eq("id", queueId)
    .maybeSingle();
  if (error) return { data: null, error: `Queue read: ${error.message}` };
  return { data: (data as QueueItem | null) ?? null, error: null };
}

/**
 * Validate the queue item is in the EXPECTED status before processing.
 *
 * Defensive: if a prior step's UPDATE silently failed (e.g. column
 * doesn't exist — see MH-QUEUE-HANDOFF-007), the queue item would
 * still be in the prior step's status. This function catches that
 * case and returns a clear error message identifying the queueId +
 * actual vs expected status.
 *
 * Returns null if the status matches, or a descriptive error string
 * if it doesn't.
 */
export function validateQueueStatus(
  qi: QueueItem,
  expected: string,
): string | null {
  if (qi.status !== expected) {
    return (
      `Queue item ${qi.id} is in status "${qi.status}" but step expects "${expected}". ` +
      `This means a prior step's UPDATE silently failed (or the queueId was wrong). ` +
      `Investigate the prior step.`
    );
  }
  return null;
}

const MISSING_LANG_MSG =
  "Queue row has no `language` value — RUN_ON_SUPABASE_0026_LANG_SPLIT.sql was not applied to this database. Apply it first (AGENTS.md §6 has the link).";

/**
 * Throws when the row predates migration 0026. Centralizing the guard
 * keeps per-route boilerplate to one line while making the failure mode
 * loudly actionable.
 */
export function requireRowLang(qi: QueueItem): PipelineLang {
  const lang = rowLang(qi);
  if (isLangColumnMissing(lang)) throw new Error(MISSING_LANG_MSG);
  return lang;
}

/**
 * Update the queue item's status (and optionally article_bundle +
 * error_message). Returns null on success, or a descriptive error
 * string on failure.
 *
 * IMPORTANT: this function CAPTURES the UPDATE response's error field
 * (the previous code didn't — see MH-QUEUE-HANDOFF-007 root cause).
 * If the UPDATE fails (e.g. due to a column not existing in the
 * production schema), this function returns the error message and
 * the caller can throw or return a 500.
 */
export async function updateQueueItem(
  queueId: string,
  updates: { status: string; article_bundle?: string; error_message?: string; en_post_id?: string; ar_post_id?: string; topic?: string; topic_ar?: string; focus_keyword?: string; focus_keyword_ar?: string },
): Promise<string | null> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return "Supabase admin not configured.";
  }
  const { error } = await supabaseAdmin
    .from("blog_generation_queue")
    .update(updates)
    .eq("id", queueId);
  if (error) return `Queue update ${queueId}: ${error.message}`;
  return null;
}

/**
 * Mark a queue item as failed with a descriptive error message.
 * Best-effort — never throws (used in catch blocks).
 */
export async function markQueueItemFailed(
  queueId: string,
  errorMessage: string,
): Promise<void> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  try {
    await supabaseAdmin
      .from("blog_generation_queue")
      .update({
        status: "failed",
        error_message: errorMessage.slice(0, 2000), // cap to avoid DB column overflow
      })
      .eq("id", queueId);
  } catch {
    // Best-effort — the queue item stays in its current status if this fails.
  }
}
