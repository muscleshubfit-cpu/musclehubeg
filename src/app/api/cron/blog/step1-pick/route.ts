import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";

export const maxDuration = 60;

/**
 * Step 1: Pick a topic.
 * Saves the picked topic to blog_generation_queue for step 2.
 *
 * EN/AR SEPARATION: Picks TWO topics — one EN, one AR — for the same
 * category. Both are stored in the queue row. Step 2b uses the EN topic
 * for the English article; step 2c uses the AR topic for the Arabic
 * article. This ensures each language gets a topic in its own language.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  try {
    // Pick BOTH EN and AR topics for the same rotation category.
    // pickRotationCategory is deterministic — both calls get the same pillar.
    const [enPick, arPick] = await Promise.all([
      pickSmartTopic(undefined, "en"),
      pickSmartTopic(undefined, "ar"),
    ]);
    const safeCategory = normalizeCategory(enPick.category);

    const { data, error } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .insert({
        topic: enPick.topic,
        focus_keyword: enPick.focusKeyword,
        topic_ar: arPick.topic,
        focus_keyword_ar: arPick.focusKeyword,
        category: safeCategory,
        status: "topic_picked",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Queue insert: ${error.message}`);
    if (!data) throw new Error("Queue insert returned no data");

    return NextResponse.json({
      ok: true,
      step: 1,
      queueId: (data as any).id,
      topic: enPick.topic,
      focusKeyword: enPick.focusKeyword,
      topicAr: arPick.topic,
      focusKeywordAr: arPick.focusKeyword,
      category: safeCategory,
    });
  } catch (e: any) {
    console.error("[blog/step1-pick] Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
