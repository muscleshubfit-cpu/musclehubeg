/**
 * Queue helpers for the blog generation pipeline.
 *
 * Each blog pipeline step (Step 2a, 2b, 2c, 2d, 3) processes a single
 * queue item identified by its UUID. The queueId is threaded from
 * Step 1 (which inserts the row and returns its id in the JSON
 * response) through every subsequent step via the `?queueId=<uuid>`
 * query parameter.
 *
 * This file centralizes:
 *   1. Reading the queueId from the request URL.
 *   2. Fetching the queue row by id (NOT by status — querying by
 *      status would pick the latest matching row, which could be a
 *      different queue item than the one Step 1 produced).
 *   3. Validating the queue row is in the EXPECTED status before
 *      processing (defensive — catches silent UPDATE failures from
 *      the prior step).
 *   4. Performing UPDATEs with explicit error checking (the previous
 *      code swallowed UPDATE errors because it didn't capture the
 *      response — see MH-QUEUE-HANDOFF-007 root cause).
 */

import type { NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type QueueItem = {
  id: string;
  topic: string;
  focus_keyword: string;
  // EN/AR SEPARATION: separate AR topic fields (nullable — old queue rows
  // don't have these; step2c falls back to EN topic if missing).
  topic_ar?: string | null;
  focus_keyword_ar?: string | null;
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
 * Returns null if the parameter is missing or empty. The caller is
 * responsible for returning an appropriate error response (we don't
 * throw here because Next.js route handlers need to return
 * NextResponse.json, not throw).
 */
export function getQueueIdParam(request: NextRequest): string | null {
  const url = new URL(request.url);
  const qid = url.searchParams.get("queueId");
  if (!qid || qid.trim().length === 0) return null;
  return qid.trim();
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
    .from("blog_generation_queue" as any)
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
    .from("blog_generation_queue" as any)
    .update(updates as any)
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
      .from("blog_generation_queue" as any)
      .update({
        status: "failed",
        error_message: errorMessage.slice(0, 2000), // cap to avoid DB column overflow
      })
      .eq("id", queueId);
  } catch {
    // Best-effort — the queue item stays in its current status if this fails.
  }
}
