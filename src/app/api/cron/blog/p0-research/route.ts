import { NextRequest, NextResponse } from "next/server";
import { runPhase0Research } from "@/lib/blog-research";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getLangParam, type PipelineLang } from "@/lib/blog-queue";

export const maxDuration = 60;

/**
 * PIPELINE V3 · PHASE 0 — Keyword & Topic Research (ONE language).
 *
 * LANGUAGE SPLIT (owner directive 2026-08-27): EN and AR are fully
 * separate pipelines with their own schedules; P0 researches exactly
 * ONE language per run and creates the queue row for ONE article.
 * No AI picks a topic yet (P1 does).
 *
 * GET /api/cron/blog/p0-research?lang=en|ar   → { ok, step:"p0", queueId, lang }
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  // The language IS this run's identity — refuse to guess it. A wrong
  // guess would silently publish articles in the wrong language at the
  // wrong time slots, so fail loudly instead.
  const lang: PipelineLang | null = getLangParam(request);
  if (!lang) {
    return NextResponse.json(
      { error: "Missing/invalid ?lang= parameter — must be 'en' or 'ar'." },
      { status: 400 },
    );
  }

  try {
    const p0 = await runPhase0Research(lang);

    const { data, error } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .insert({
        // Single-language row (V3). Legacy dual columns topic_ar /
        // focus_keyword_ar stay null until P1 mirrors them in for AR rows.
        language: lang,
        // NOT NULL placeholders — P1 replaces them with the chosen topic.
        topic: p0.research.topics[0] || (lang === "ar" ? "مقال لياقة" : "fitness article"),
        focus_keyword:
          p0.research.keywords[0]?.keyword || (lang === "ar" ? "لياقة" : "fitness"),
        category: p0.category,
        status: "researched",
        created_at: new Date().toISOString(),
        // FLAT artifact (no {en, ar} nesting since the lang split).
        article_bundle: JSON.stringify({ research0: p0.research }),
      })
      .select()
      .single();

    if (error) throw new Error(`Queue insert: ${error.message}`);
    if (!data) throw new Error("Queue insert returned no data");

    return NextResponse.json({
      ok: true,
      step: "p0",
      queueId: (data as any).id,
      lang,
      category: p0.category,
      keywords: p0.research.keywords.length,
      faqs: p0.research.faqs.length,
      topics: p0.research.topics.length,
      source: p0.source,
    });
  } catch (e: any) {
    console.error("[blog/p0-research] Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
