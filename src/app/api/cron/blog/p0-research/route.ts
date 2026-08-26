import { NextRequest, NextResponse } from "next/server";
import { runPhase0Research } from "@/lib/blog-research";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * PIPELINE V2 · PHASE 0 — Keyword & Topic Research.
 * One chain call per language over the strongest free models
 * (OpenRouter + Groq, fall-through on failure). Creates the queue row
 * holding the full research artifact; no AI picks a topic yet (P1 does).
 *
 * GET /api/cron/blog/p0-research   → { ok, step: "p0", queueId }
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  try {
    const research0 = await runPhase0Research();

    const { data, error } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .insert({
        // NOT NULL placeholders — P1 replaces them with the chosen topic.
        topic: research0.en.topics[0] || "fitness article",
        focus_keyword: research0.en.keywords[0]?.keyword || "fitness",
        topic_ar: research0.ar.topics[0] || "مقال لياقة",
        focus_keyword_ar: research0.ar.keywords[0]?.keyword || "لياقة",
        category: research0.category,
        status: "researched",
        created_at: new Date().toISOString(),
        article_bundle: JSON.stringify({ research0 }),
      })
      .select()
      .single();

    if (error) throw new Error(`Queue insert: ${error.message}`);
    if (!data) throw new Error("Queue insert returned no data");

    return NextResponse.json({
      ok: true,
      step: "p0",
      queueId: (data as any).id,
      category: research0.category,
      en: {
        keywords: research0.en.keywords.length,
        faqs: research0.en.faqs.length,
        topics: research0.en.topics.length,
      },
      ar: {
        keywords: research0.ar.keywords.length,
        faqs: research0.ar.faqs.length,
        topics: research0.ar.topics.length,
      },
      source: research0.source,
    });
  } catch (e: any) {
    console.error("[blog/p0-research] Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
