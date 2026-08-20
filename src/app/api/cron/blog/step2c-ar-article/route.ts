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
    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

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
    try {
      await supabaseAdmin
        .from("blog_generation_queue" as any)
        .update({ status: "failed", error_message: `step2c: ${e?.message || "Unknown"}` })
        .eq("status", "generating_ar");
    } catch {}
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
