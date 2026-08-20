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
