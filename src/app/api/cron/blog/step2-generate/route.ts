import { NextRequest, NextResponse } from "next/server";
import { generateArticleBundle } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

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

    // Generate the article (the slow part — 30-60s on free models)
    const bundle = await generateArticleBundle({
      topic: qi.topic,
      focusKeyword: qi.focus_keyword,
      category: qi.category,
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
