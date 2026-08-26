import { NextRequest, NextResponse } from "next/server";
import { generateExternalResearch } from "@/lib/blog-generate";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Step 2a: External Web Research (ISOLATED STAGE).
 *
 * Reads the queue item identified by `?queueId=<uuid>` (passed from
 * Step 1's response), performs REAL external web search via z-ai
 * web_search API, saves the results to article_bundle, and sets
 * status to "research_done".
 *
 * This step does NOT call any LLM. It does NOT generate pseudo-research.
 * It does NOT share execution with Step 2b (article generation).
 * It performs ONLY: web search → normalize → deduplicate → store → exit.
 *
 * Queue-item threading (MH-QUEUE-HANDOFF-007):
 *   The queueId is REQUIRED as a query parameter. The previous code
 *   queried `eq("status", "topic_picked")` + `order created_at desc`
 *   + `limit 1` — this could pick a DIFFERENT queue item than the
 *   one Step 1 produced (e.g. an older stuck item, or a newer one
 *   from a concurrent cron run). Now we query by exact id.
 *
 * UPDATE error checking (MH-QUEUE-HANDOFF-007):
 *   The previous code did `await supabaseAdmin...update(...)` WITHOUT
 *   capturing the response. If the UPDATE silently failed (e.g.
 *   because the `generated_at` column doesn't exist in production —
 *   see MH-QUEUE-HANDOFF-007 root cause), Step 2a returned HTTP 200
 *   with `ok: true` even though the UPDATE never happened. The queue
 *   item stayed at `researching` status. Step 2b then queried for
 *   `research_done` items, found zero, and returned `no_research_done`.
 *   The `generated_at` write has been removed (it's not read anywhere
 *   and the column doesn't exist in the production schema). All
 *   UPDATEs now go through `updateQueueItem()` which captures the
 *   error and throws if the UPDATE fails.
 *
 * GET /api/cron/blog/step2a-research?queueId=<uuid>
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  // ────────────────────────────────────────────────────────────────
  // REQUIRE queueId — no fallback to global "topic_picked" lookup.
  // The workflow MUST pass the queueId from Step 1's response.
  // ────────────────────────────────────────────────────────────────
  const queueId = getQueueIdParam(request);
  if (!queueId) {
    return NextResponse.json(
      {
        error: "Missing queueId query parameter",
        message: "Step 2a requires ?queueId=<uuid> from Step 1's response. The workflow must thread this through every step.",
      },
      { status: 400 },
    );
  }

  let qi: QueueItem | null = null;

  try {
    // ──────────────────────────────────────────────────────────────
    // Fetch the EXACT queue item by id — no global "status" lookup.
    // ──────────────────────────────────────────────────────────────
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          step: "2a",
          queueId,
          skipped: true,
          reason: "queue_item_not_found",
          message: `Queue item ${queueId} does not exist. Step 1 may have failed to insert it.`,
        },
        { status: 404 },
      );
    }
    qi = data;

    // ──────────────────────────────────────────────────────────────
    // Validate the queue item is in the EXPECTED status.
    // If Step 1 succeeded, status should be "topic_picked".
    // If a prior Step 2a invocation already processed this item,
    // status could be "researching" (crashed mid-step) or "research_done"
    // (already completed). Each case needs a clear error.
    // ──────────────────────────────────────────────────────────────
    const statusErr = validateQueueStatus(qi, "topic_picked");
    if (statusErr) {
      // If already research_done, this is a re-run — return the existing
      // research without re-doing the search (idempotent).
      if (qi.status === "research_done") {
        return NextResponse.json({
          ok: true,
          step: "2a",
          queueId: qi.id,
          idempotent: true,
          message: `Queue item ${qi.id} is already research_done. Skipping re-search.`,
        });
      }
      // If researching (crashed mid-step), allow re-processing —
      // mark as failed first so the queue state is clean, then proceed.
      if (qi.status === "researching") {
        console.warn(`[blog/step2a-research] Queue item ${qi.id} was stuck in "researching" — re-processing.`);
      } else if (qi.status === "failed") {
        // Allow re-processing of failed items (idempotent retry).
        console.warn(`[blog/step2a-research] Queue item ${qi.id} was previously failed — re-processing.`);
      } else {
        // Any other status (e.g. en_done, ar_done, generated, published)
        // means this queue item has already progressed past Step 2a.
        return NextResponse.json(
          {
            ok: false,
            step: "2a",
            queueId: qi.id,
            skipped: true,
            reason: "wrong_status",
            actual_status: qi.status,
            expected_status: "topic_picked",
            message: statusErr,
          },
          { status: 409 },
        );
      }
    }

    // Mark as researching (defensive — proves we're processing)
    const researchingErr = await updateQueueItem(qi.id, { status: "researching" });
    if (researchingErr) throw new Error(researchingErr);

    // Perform REAL external web search (no LLM involved)
    const { research, source } = await generateExternalResearch({
      topic: qi.topic,
      focusKeyword: qi.focus_keyword,
      category: qi.category,
    });

    // Save research into article_bundle
    // NOTE: removed `generated_at` write — the column doesn't exist
    // in the production schema (PostgreSQL error 42703), and the
    // field isn't read anywhere. See MH-QUEUE-HANDOFF-007 root cause.
    const existingBundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};
    const updatedBundle = JSON.stringify({ ...existingBundle, research });

    const updateErr = await updateQueueItem(qi.id, {
      status: "research_done",
      article_bundle: updatedBundle,
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "2a",
      queueId: qi.id,
      articlesFound: research?.totalResults || 0,
      questionsFound: research?.relatedQuestions?.length || 0,
      keywordsFound: research?.trendingKeywords?.length || 0,
      queriesRun: research?.queryCount || 0,
      queriesSucceeded: research?.successfulQueries || 0,
      partialFailure: research?.partialFailure || false,
      source,
      firstError: research?.firstError || null,
    });
  } catch (e: any) {
    console.error("[blog/step2a-research] Error:", e?.message || e);
    if (queueId) {
      await markQueueItemFailed(queueId, `step2a: ${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
