import { NextRequest, NextResponse } from "next/server";
import {
  reviewAndEnhance,
  ensureFaqSection,
  countWords,
  type OutlinePlan,
  type ReviewReport,
} from "@/lib/blog-pipeline";
import type { LanguageResearch } from "@/lib/blog-research";
import { getRecentPostsByLanguage } from "@/lib/blog-topics";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * PIPELINE V2 · PHASE 4 — Quality review & enhancement per language:
 * proofread/flow/dedup, keyword coverage check, conservative fact-guard
 * (never invents citations), 2-4 internal links from real site posts,
 * ≤2 authoritative external links, closing Call-to-Action.
 * A deterministic FAQ-append safety net guarantees length & P0 answers.
 *
 * GET /api/cron/blog/p4-review?queueId=<uuid>
 */
type LangReview = {
  markdown: string;
  report: ReviewReport;
  internalLinks: { slug: string; anchorText: string }[];
  externalLinks: { url: string; anchorText: string }[];
  source: string;
};

async function internalCandidates(lang: "en" | "ar") {
  const recent = await getRecentPostsByLanguage(lang, 20);
  return recent
    .filter((p) => p.slug)
    .map((p) => ({ slug: p.slug, title: p.title }));
}

async function reviewLang(
  lang: "en" | "ar",
  bundle: any,
): Promise<LangReview> {
  const outline: OutlinePlan | undefined = bundle.outline?.[lang];
  const research: LanguageResearch | undefined = bundle.research0?.[lang];
  const draftKey = lang === "en" ? "content_en" : "content_ar";
  const draft: string | undefined = bundle[draftKey]?.markdown;
  if (!outline || !research || !draft) {
    throw new Error(`p4 ${lang}: missing outline/research/draft artifacts`);
  }

  const r = await reviewAndEnhance(
    lang,
    draft,
    outline,
    await internalCandidates(lang),
  );

  // Deterministic safety net: guaranteed FAQ section from Phase-0 answers.
  const withFaq = ensureFaqSection(lang, r.markdown, research);
  const md = withFaq.md;

  return {
    markdown: md,
    report: {
      ...r.report,
      changesSummary: withFaq.appended
        ? [...r.report.changesSummary, "appended deterministic FAQ section from P0 answers"]
        : r.report.changesSummary,
    },
    internalLinks: r.internalLinks,
    externalLinks: r.externalLinks,
    source: r.source,
  };
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId)
    return NextResponse.json({ error: "Missing queueId query parameter" }, { status: 400 });

  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data)
      return NextResponse.json({ ok: false, queueId, skipped: true, reason: "queue_item_not_found" }, { status: 404 });
    qi = data;

    if (!["images_done", "reviewed"].includes(qi.status) && qi.status !== "failed") {
      if (qi.status === "published")
        return NextResponse.json({ ok: true, step: "p4", queueId: qi.id, idempotent: true });
      return NextResponse.json(
        { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
        { status: 409 },
      );
    }

    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    const [reviewEn, reviewAr] = await Promise.all([
      reviewLang("en", bundle),
      reviewLang("ar", bundle),
    ]);

    const updatedBundle = JSON.stringify({
      ...bundle,
      review: { en: reviewEn, ar: reviewAr },
    });

    const updateErr = await updateQueueItem(qi.id, {
      status: "reviewed",
      article_bundle: updatedBundle,
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "p4",
      queueId: qi.id,
      en: { words: countWords(reviewEn.markdown), coverage: reviewEn.report.keywordCoverage },
      ar: { words: countWords(reviewAr.markdown), coverage: reviewAr.report.keywordCoverage },
    });
  } catch (e: any) {
    console.error("[blog/p4-review] Error:", e?.message || e);
    if (queueId) await markQueueItemFailed(queueId, `p4: ${e?.message || "Unknown"}`);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
