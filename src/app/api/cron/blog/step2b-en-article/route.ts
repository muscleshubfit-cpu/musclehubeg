import { NextRequest, NextResponse } from "next/server";
import { generateEnglishArticle } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Step 2b: SEO data + English article.
 * Reads the latest "research_done" item, generates SEO + EN article in a
 * single AI call (maxTokens=8000), saves to article_bundle, sets status
 * to "en_done".
 *
 * Quality gate: if the research data from Step 2a is missing or empty
 * (topArticles + relatedQuestions + trendingKeywords all empty), this
 * step fails fast with status `failed:empty_research` instead of
 * silently generating a poor article without sources. The queue row
 * is preserved (not deleted) so the owner can inspect what happened.
 *
 * GET /api/cron/blog/step2b-en-article
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
      .eq("status", "research_done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_research_done" });
    }

    const qi = queueItem as any;
    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    // ────────────────────────────────────────────────────────────────
    // RESEARCH QUALITY GATE
    // ────────────────────────────────────────────────────────────────
    // If Step 2a produced empty research (Z.ai down, all 3 queries
    // failed, or the research field is missing entirely), fail-fast
    // instead of silently generating a poor article without sources.
    //
    // Empty research means: topArticles is empty AND relatedQuestions
    // is empty AND trendingKeywords is empty — i.e. nothing usable
    // was extracted from the web search.
    //
    // A `partialFailure: true` flag with non-empty topArticles is OK
    // (1 of 3 Z.ai queries failed but 2 succeeded — we have data).
    const research = bundle.research;
    const isEmptyResearch =
      !research ||
      ((research.topArticles || []).length === 0 &&
        (research.relatedQuestions || []).length === 0 &&
        (research.trendingKeywords || []).length === 0 &&
        (research.trendingAngles || []).length === 0);

    if (isEmptyResearch) {
      console.error("[blog/step2b-en-article] Research is empty — failing fast instead of generating a poor article without sources");
      await supabaseAdmin
        .from("blog_generation_queue" as any)
        .update({
          status: "failed",
          error_message: "step2b: empty_research — Step 2a produced 0 topArticles + 0 relatedQuestions + 0 trendingKeywords. Investigate Step 2a (Z.ai may be down or all 3 queries failed).",
        })
        .eq("id", qi.id);
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
    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({ status: "generating_en" })
      .eq("id", qi.id);

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

    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({
        status: "en_done",
        article_bundle: updatedBundle,
      })
      .eq("id", qi.id);

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
    try {
      await supabaseAdmin
        .from("blog_generation_queue" as any)
        .update({ status: "failed", error_message: `step2b: ${e?.message || "Unknown"}` })
        .eq("status", "generating_en");
    } catch {}
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
