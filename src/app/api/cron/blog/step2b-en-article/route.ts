import { NextRequest, NextResponse } from "next/server";
import { generateEnglishArticle } from "@/lib/blog-generate";
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
 * Step 2b: SEO data + English article.
 *
 * Reads the queue item identified by `?queueId=<uuid>` (passed from
 * Step 2a's response, which got it from Step 1), generates SEO + EN
 * article in a single AI call (maxTokens=8000), saves to
 * article_bundle, sets status to "en_done".
 *
 * Queue-item threading (MH-QUEUE-HANDOFF-007):
 *   The queueId is REQUIRED as a query parameter. The previous code
 *   queried `eq("status", "research_done")` + `order created_at desc`
 *   + `limit 1` — this could pick a DIFFERENT queue item than the one
 *   Step 2a processed (e.g. an older stuck item). Now we query by
 *   exact id, which guarantees we process the same item across the
 *   whole pipeline.
 *
 * UPDATE error checking (MH-QUEUE-HANDOFF-007):
 *   All UPDATEs go through `updateQueueItem()` which captures the
 *   response's error field and throws if the UPDATE fails.
 *
 * Quality gate: if the research data from Step 2a is missing or empty
 * (topArticles + relatedQuestions + trendingKeywords all empty), this
 * step fails fast with status `failed:empty_research` instead of
 * silently generating a poor article without sources. The queue row
 * is preserved (not deleted) so the owner can inspect what happened.
 *
 * GET /api/cron/blog/step2b-en-article?queueId=<uuid>
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
      {
        error: "Missing queueId query parameter",
        message: "Step 2b requires ?queueId=<uuid> from Step 2a's response.",
      },
      { status: 400 },
    );
  }

  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          step: "2b",
          queueId,
          skipped: true,
          reason: "queue_item_not_found",
          message: `Queue item ${queueId} does not exist.`,
        },
        { status: 404 },
      );
    }
    qi = data;

    // Validate the queue item is in the EXPECTED status.
    const statusErr = validateQueueStatus(qi, "research_done");
    if (statusErr) {
      // If already en_done, this is a re-run — return idempotent success.
      if (qi.status === "en_done") {
        return NextResponse.json({
          ok: true,
          step: "2b",
          queueId: qi.id,
          idempotent: true,
          message: `Queue item ${qi.id} is already en_done. Skipping re-generation.`,
        });
      }
      return NextResponse.json(
        {
          ok: false,
          step: "2b",
          queueId: qi.id,
          skipped: true,
          reason: "wrong_status",
          actual_status: qi.status,
          expected_status: "research_done",
          message: statusErr,
        },
        { status: 409 },
      );
    }

    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    // ────────────────────────────────────────────────────────────────
    // RESEARCH QUALITY GATE
    // ────────────────────────────────────────────────────────────────
    // If Step 2a produced empty research (Google Search down, all 3 queries
    // failed, or the research field is missing entirely), fail-fast
    // instead of silently generating a poor article without sources.
    //
    // Empty research means: topArticles is empty AND relatedQuestions
    // is empty AND trendingKeywords is empty — i.e. nothing usable
    // was extracted from the web search.
    //
    // A `partialFailure: true` flag with non-empty topArticles is OK
    // (1 of 3 Google Search queries failed but 2 succeeded — we have data).
    const research = bundle.research;
    const isEmptyResearch =
      !research ||
      ((research.topArticles || []).length === 0 &&
        (research.relatedQuestions || []).length === 0 &&
        (research.trendingKeywords || []).length === 0 &&
        (research.trendingAngles || []).length === 0);

    if (isEmptyResearch) {
      console.error("[blog/step2b-en-article] Research is empty — failing fast instead of generating a poor article without sources");
      const updateErr = await updateQueueItem(qi.id, {
        status: "failed",
        error_message: `step2b: empty_research — Step 2a produced 0 topArticles + 0 relatedQuestions + 0 trendingKeywords. Investigate Step 2a (Google Search may be down or all 3 queries failed).${research?.firstError ? ` Google Search error: ${research.firstError}` : ""}`,
      });
      if (updateErr) console.error(`[blog/step2b-en-article] Failed to mark queue as failed: ${updateErr}`);
      return NextResponse.json(
        {
          ok: false,
          step: "2b",
          queueId: qi.id,
          skipped: true,
          reason: "empty_research",
          message: "Step 2a produced empty research. Failing fast instead of generating a poor article.",
        },
        { status: 422 },
      );
    }

    // Mark as generating EN
    const researchingErr = await updateQueueItem(qi.id, { status: "generating_en" });
    if (researchingErr) throw new Error(researchingErr);

    const { seo, englishArticle, source } = await generateEnglishArticle(
      {
        topic: qi.topic,
        focusKeyword: qi.focus_keyword,
        category: qi.category,
      },
      bundle.research || null,
    );

    // Save SEO + English article into bundle
    const updatedBundle = JSON.stringify({
      ...bundle,
      seo,
      englishArticle,
    });

    const updateErr = await updateQueueItem(qi.id, {
      status: "en_done",
      article_bundle: updatedBundle,
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "2b",
      queueId: qi.id,
      enTitle: seo?.en?.seoTitle || "",
      wordCount: englishArticle.split(/\s+/).length,
      source,
      researchUsed: {
        topArticles: (research?.topArticles || []).length,
        relatedQuestions: (research?.relatedQuestions || []).length,
        trendingKeywords: (research?.trendingKeywords || []).length,
        partialFailure: Boolean(research?.partialFailure),
      },
    });
  } catch (e: any) {
    console.error("[blog/step2b-en-article] Error:", e?.message || e);
    if (queueId) {
      await markQueueItemFailed(queueId, `step2b: ${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
