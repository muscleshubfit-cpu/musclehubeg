import { NextRequest, NextResponse } from "next/server";
import { generateLinksAndSocial } from "@/lib/blog-generate";
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
 * Step 2d: Internal/external links + image prompts + social posts.
 *
 * Reads the queue item identified by `?queueId=<uuid>` (passed from
 * Step 2c's response, which got it from Step 1), generates links +
 * images + social in a single AI call, saves to article_bundle, sets
 * status to "generated".
 *
 * The links generator receives both article texts for anchor matching
 * (P1-6 fix).
 *
 * Queue-item threading (MH-QUEUE-HANDOFF-007): queueId is REQUIRED.
 * UPDATE error checking: all UPDATEs go through `updateQueueItem()`.
 *
 * GET /api/cron/blog/step2d-links?queueId=<uuid>
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId) {
    return NextResponse.json(
      { error: "Missing queueId query parameter", message: "Step 2d requires ?queueId=<uuid> from Step 2c's response." },
      { status: 400 },
    );
  }

  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data) {
      return NextResponse.json(
        { ok: false, step: "2d", queueId, skipped: true, reason: "queue_item_not_found", message: `Queue item ${queueId} does not exist.` },
        { status: 404 },
      );
    }
    qi = data;

    const statusErr = validateQueueStatus(qi, "ar_done");
    if (statusErr) {
      if (qi.status === "generated") {
        return NextResponse.json({ ok: true, step: "2d", queueId: qi.id, idempotent: true, message: `Queue item ${qi.id} is already generated.` });
      }
      return NextResponse.json(
        { ok: false, step: "2d", queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status, expected_status: "ar_done", message: statusErr },
        { status: 409 },
      );
    }

    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    // ────────────────────────────────────────────────────────────────
    // INPUT VALIDATION — fail-fast if Step 2b/2c outputs are missing
    // ────────────────────────────────────────────────────────────────
    if (
      !bundle.seo ||
      !bundle.englishArticle ||
      bundle.englishArticle.trim().length === 0 ||
      !bundle.arabicArticle ||
      bundle.arabicArticle.trim().length === 0
    ) {
      console.error("[blog/step2d-links] Missing Step 2b/2c output — failing fast");
      const updateErr = await updateQueueItem(qi.id, {
        status: "failed",
        error_message: "step2d: missing_prior_output — bundle.seo, bundle.englishArticle, or bundle.arabicArticle is missing/empty. Investigate Step 2b/2c.",
      });
      if (updateErr) console.error(`[blog/step2d-links] Failed to mark queue as failed: ${updateErr}`);
      return NextResponse.json(
        { ok: false, step: "2d", queueId: qi.id, skipped: true, reason: "missing_prior_output", message: "Step 2b/2c's output is missing. Failing fast." },
        { status: 422 },
      );
    }

    // Mark as generating links
    const researchingErr = await updateQueueItem(qi.id, { status: "generating_links" });
    if (researchingErr) throw new Error(researchingErr);

    const { internalLinks, externalLinks, imagePrompts, socialPosts, estimatedReadingTime, source } =
      await generateLinksAndSocial(
        { topic: qi.topic, focusKeyword: qi.focus_keyword },
        bundle.seo || null,
        bundle.englishArticle || "",
        bundle.arabicArticle || "",
      );

    const updatedBundle = JSON.stringify({ ...bundle, internalLinks, externalLinks, imagePrompts, socialPosts, estimatedReadingTime });
    const updateErr = await updateQueueItem(qi.id, { status: "generated", article_bundle: updatedBundle });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "2d",
      queueId: qi.id,
      internalLinksCount: internalLinks.length,
      externalLinksCount: externalLinks.length,
      readingTime: estimatedReadingTime,
      source,
    });
  } catch (e: any) {
    console.error("[blog/step2d-links] Error:", e?.message || e);
    if (queueId) {
      await markQueueItemFailed(queueId, `step2d: ${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
