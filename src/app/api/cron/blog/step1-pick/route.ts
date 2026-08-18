import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";

export const maxDuration = 60;

/**
 * Step 1: Pick a topic.
 * Saves the picked topic to blog_generation_queue for step 2.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  try {
    const pick = await pickSmartTopic();
    const safeCategory = normalizeCategory(pick.category);

    const { data, error } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .insert({
        topic: pick.topic,
        focus_keyword: pick.focusKeyword,
        category: safeCategory,
        status: "topic_picked",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Queue insert: ${error.message}`);

    return NextResponse.json({
      ok: true,
      step: 1,
      queueId: data.id,
      topic: pick.topic,
      focusKeyword: pick.focusKeyword,
      category: safeCategory,
    });
  } catch (e: any) {
    console.error("[blog/step1-pick] Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
