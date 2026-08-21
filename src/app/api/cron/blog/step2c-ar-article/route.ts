import { NextRequest, NextResponse } from "next/server";
import { generateArabicArticle } from "@/lib/blog-generate";
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
 * Step 2c: Arabic article + FAQ.
 *
 * Reads the queue item identified by `?queueId=<uuid>` (passed from
 * Step 2b's response, which got it from Step 1), generates AR article
 * + FAQ in a single AI call (maxTokens=8000), saves to article_bundle,
 * sets status to "ar_done".
 *
 * The AR writer receives the EN article text for coherence (P1-6 fix).
 *
 * Queue-item threading (MH-QUEUE-HANDOFF-007): queueId is REQUIRED.
 * UPDATE error checking: all UPDATEs go through `updateQueueItem()`.
 *
 * GET /api/cron/blog/step2c-ar-article?queueId=<uuid>
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId) {
    return NextResponse.json(
      { error: "Missing queueId query parameter", message: "Step 2c requires ?queueId=<uuid> from Step 2b's response." },
      { status: 400 },
    );
  }

  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data) {
      return NextResponse.json(
        { ok: false, step: "2c", queueId, skipped: true, reason: "queue_item_not_found", message: `Queue item ${queueId} does not exist.` },
        { status: 404 },
      );
    }
    qi = data;

    const statusErr = validateQueueStatus(qi, "en_done");
    if (statusErr) {
      if (qi.status === "ar_done") {
        return NextResponse.json({ ok: true, step: "2c", queueId: qi.id, idempotent: true, message: `Queue item ${qi.id} is already ar_done.` });
      }
      return NextResponse.json(
        { ok: false, step: "2c", queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status, expected_status: "en_done", message: statusErr },
        { status: 409 },
      );
    }

    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    // ────────────────────────────────────────────────────────────────
    // INPUT VALIDATION — fail-fast if Step 2b's output is missing
    // ────────────────────────────────────────────────────────────────
    if (!bundle.seo || !bundle.englishArticle || bundle.englishArticle.trim().length === 0) {
      console.error("[blog/step2c-ar-article] Missing Step 2b output (seo or englishArticle) — failing fast");
      const updateErr = await updateQueueItem(qi.id, {
        status: "failed",
        error_message: "step2c: missing_step2b_output — bundle.seo or bundle.englishArticle is missing/empty. Investigate Step 2b.",
      });
      if (updateErr) console.error(`[blog/step2c-ar-article] Failed to mark queue as failed: ${updateErr}`);
      return NextResponse.json(
        { ok: false, step: "2c", queueId: qi.id, skipped: true, reason: "missing_step2b_output", message: "Step 2b's output (SEO block or English article) is missing. Failing fast." },
        { status: 422 },
      );
    }

    // Mark as generating AR
    const researchingErr = await updateQueueItem(qi.id, { status: "generating_ar" });
    if (researchingErr) throw new Error(researchingErr);

    const { arabicArticle, faq, faqAr, source } = await generateArabicArticle(
      { topic: qi.topic, focusKeyword: qi.focus_keyword, category: qi.category },
      bundle.seo || null,
      bundle.englishArticle || "",
    );

    const updatedBundle = JSON.stringify({ ...bundle, arabicArticle, faq, faqAr });
    const updateErr = await updateQueueItem(qi.id, { status: "ar_done", article_bundle: updatedBundle });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "2c",
      queueId: qi.id,
      arTitle: bundle.seo?.ar?.seoTitle || "",
      hasFaq: faq.length > 0,
      hasFaqAr: faqAr.length > 0,
      source,
    });
  } catch (e: any) {
    console.error("[blog/step2c-ar-article] Error:", e?.message || e);
    if (queueId) {
      await markQueueItemFailed(queueId, `step2c: ${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
