import { NextRequest, NextResponse } from "next/server";
import { generateArticleBundle } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { parseJSON } from "@/lib/ai-provider";
import { callGemini } from "@/lib/gemini-wrapper";

export const maxDuration = 300; // 5 min — chunked generation needs headroom

/**
 * Step 2: Generate article (the slow AI call).
 * Reads the latest "topic_picked" item from the queue, generates the
 * full bilingual article, and saves the result back to the queue as JSON.
 *
 * GET /api/cron/blog/step2-generate
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  try {
    // Get the latest queued topic that hasn't been generated yet
    const { data: queueItem, error: qErr } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .select("*")
      .eq("status", "topic_picked")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_topic_in_queue" });
    }

    const qi = queueItem as any;

    // Mark as "generating" so step 2 doesn't pick it up again
    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({ status: "generating" })
      .eq("id", qi.id);

    // ───────────────────────────────────────────────────────────────
    // Research phase (NEW — Phase 6, 2026-08-19):
    // Run topic research BEFORE article generation so the AI has context.
    // Uses a single OpenRouter call with 60s timeout — fits Vercel Hobby.
    // If research fails, we still generate the article without research context.
    // ───────────────────────────────────────────────────────────────
    let research: any = null;
    try {
      console.log("[blog/step2] Starting research phase");
      const researchPrompt = `You are an expert SEO/GEO content strategist. Research the topic "${qi.focus_keyword || qi.topic}" for a fitness & nutrition coaching blog (MuscleHubEG, Egypt-focused, Arabic + English audience).

Based on your knowledge of search trends, Google search behavior, and AI answer engine patterns, provide:

1. TOP_ARTICLES: The top 5 article angles currently ranking for this topic (title + brief description of what they cover).
2. RELATED_QUESTIONS: 8-10 questions people actually search for related to this topic (like Answer The Public would show).
3. TRENDING_KEYWORDS: 10-15 related keywords and subtopics that are trending or have high search volume.
4. SEARCH_INTENT: Is the primary search intent informational, commercial, or transactional? What does the searcher really want?

Return STRICT JSON only:
{
  "topArticles": [{"title": "...", "description": "..."}],
  "relatedQuestions": ["question 1", "..."],
  "trendingKeywords": ["keyword 1", "..."],
  "searchIntent": "informational|commercial|transactional",
  "searcherGoal": "what the searcher really wants to achieve"
}`;

      const { text: researchRaw } = await callGemini(
        researchPrompt,
        {
          systemPrompt: "You are an expert SEO strategist. Return JSON only.",
          temperature: 0.5,
          maxTokens: 2000,
          jsonMode: true,
          timeoutMs: 45_000,
        },
      );
      research = parseJSON<any>(researchRaw);
      console.log("[blog/step2] Research done:", {
        questions: research?.relatedQuestions?.length || 0,
        keywords: research?.trendingKeywords?.length || 0,
      });
    } catch (researchErr: any) {
      console.warn("[blog/step2] Research failed (continuing without):", researchErr?.message);
      // Continue without research — article generation handles missing research gracefully
    }

    // ───────────────────────────────────────────────────────────────
    // Generate the article (chunked — 3 sequential AI calls, ~100s total)
    // ───────────────────────────────────────────────────────────────
    console.log("[blog/step2] Starting article generation (chunked)");
    const bundle = await generateArticleBundle({
      topic: qi.topic,
      focusKeyword: qi.focus_keyword,
      category: qi.category,
      research,
    });

    // Save the generated bundle as JSON in the queue
    const { error: updateErr } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({
        status: "generated",
        article_bundle: JSON.stringify(bundle),
      })
      .eq("id", qi.id);

    if (updateErr) throw new Error(`Queue update: ${updateErr.message}`);

    return NextResponse.json({
      ok: true,
      step: 2,
      queueId: qi.id,
      enTitle: bundle.seo.en.seoTitle,
      arTitle: bundle.seo.ar.seoTitle,
    });
  } catch (e: any) {
    console.error("[blog/step2-generate] Error:", e?.message || e);
    // Mark queue item as failed so step 1 can pick a new topic next time
    try {
      await supabaseAdmin
        .from("blog_generation_queue" as any)
        .update({ status: "failed", error_message: e?.message || "Unknown" })
        .eq("status", "generating");
    } catch {}
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
