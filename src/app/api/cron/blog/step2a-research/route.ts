import { NextRequest, NextResponse } from "next/server";
import { generateExternalResearch } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Step 2a: External Web Research (ISOLATED STAGE).
 *
 * Reads the latest "topic_picked" item from the queue, performs REAL
 * external web search via z-ai web_search API, saves the results to
 * article_bundle, and sets status to "research_done".
 *
 * This step does NOT call any LLM. It does NOT generate pseudo-research.
 * It does NOT share execution with Step 2b (article generation).
 * It performs ONLY: web search → normalize → deduplicate → store → exit.
 *
 * GET /api/cron/blog/step2a-research
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
      .eq("status", "topic_picked")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_topic_picked" });
    }

    const qi = queueItem as any;
    qiId = qi.id;

    // Mark as researching
    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({ status: "researching" })
      .eq("id", qi.id);

    // Perform REAL external web search (no LLM involved)
    const { research, source } = await generateExternalResearch({
      topic: qi.topic,
      focusKeyword: qi.focus_keyword,
      category: qi.category,
    });

    // Save research into article_bundle
    const existingBundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};
    const updatedBundle = JSON.stringify({ ...existingBundle, research });

    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({
        status: "research_done",
        article_bundle: updatedBundle,
        generated_at: new Date().toISOString(),
      })
      .eq("id", qi.id);

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
    });
  } catch (e: any) {
    console.error("[blog/step2a-research] Error:", e?.message || e);
    // Mark THIS queue item as failed (not any item in "researching"
    // state — that would be a race condition across concurrent
    // invocations and could mark an unrelated queue item failed).
    if (qiId) {
      try {
        await supabaseAdmin
          .from("blog_generation_queue" as any)
          .update({ status: "failed", error_message: `step2a: ${e?.message || "Unknown"}` })
          .eq("id", qiId);
      } catch {}
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
