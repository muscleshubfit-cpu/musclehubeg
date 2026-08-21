import { NextRequest, NextResponse } from "next/server";
import { generateArabicArticle } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Step 2c: Arabic article + FAQ.
 * Reads the latest "en_done" item, generates AR article + FAQ in a single
 * AI call (maxTokens=8000), saves to article_bundle, sets status to
 * "ar_done".
 *
 * The AR writer receives the EN article text for coherence (P1-6 fix).
 *
 * GET /api/cron/blog/step2c-ar-article
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  // Track queue item ID for the catch handler (qi is declared inside try).
  let qiId: string | null = null;

  try {
    const { data: queueItem, error: qErr } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .select("*")
      .eq("status", "en_done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_en_done" });
    }

    const qi = queueItem as any;
    qiId = qi.id;
    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    // ────────────────────────────────────────────────────────────────
    // INPUT VALIDATION — fail-fast if Step 2b's output is missing
    // ────────────────────────────────────────────────────────────────
    // Step 2c needs the SEO block + English article from Step 2b to
    // generate a coherent Arabic article. If either is missing
    // (Step 2b somehow marked en_done but the bundle is incomplete),
    // fail-fast instead of silently generating a poor AR article
    // without context.
    if (!bundle.seo || !bundle.englishArticle || bundle.englishArticle.trim().length === 0) {
      console.error("[blog/step2c-ar-article] Missing Step 2b output (seo or englishArticle) — failing fast");
      await supabaseAdmin
        .from("blog_generation_queue" as any)
        .update({
          status: "failed",
          error_message: "step2c: missing_step2b_output — bundle.seo or bundle.englishArticle is missing/empty. Investigate Step 2b.",
        })
        .eq("id", qiId);
      return NextResponse.json(
        {
          ok: false,
          step: "2c",
          queueId: qiId,
          skipped: true,
          reason: "missing_step2b_output",
          message: "Step 2b's output (SEO block or English article) is missing. Failing fast instead of generating a poor AR article.",
        },
        { status: 422 },
      );
    }

    // Mark as generating AR
    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({ status: "generating_ar" })
      .eq("id", qi.id);

    const { arabicArticle, faq, faqAr, source } = await generateArabicArticle(
      {
        topic: qi.topic,
        focusKeyword: qi.focus_keyword,
        category: qi.category,
      },
      bundle.seo || null,
      bundle.englishArticle || "",
    );

    // Save AR article + FAQ into bundle
    const updatedBundle = JSON.stringify({
      ...bundle,
      arabicArticle,
      faq,
      faqAr,
    });

    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({
        status: "ar_done",
        article_bundle: updatedBundle,
      })
      .eq("id", qi.id);

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
    // Mark THIS queue item as failed (not any item in "generating_ar"
    // state — that would be a race condition across concurrent
    // invocations and could mark an unrelated queue item failed).
    if (qiId) {
      try {
        await supabaseAdmin
          .from("blog_generation_queue" as any)
          .update({ status: "failed", error_message: `step2c: ${e?.message || "Unknown"}` })
          .eq("id", qiId);
      } catch {}
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
