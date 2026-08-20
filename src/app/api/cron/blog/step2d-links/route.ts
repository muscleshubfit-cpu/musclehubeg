import { NextRequest, NextResponse } from "next/server";
import { generateLinksAndSocial } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Step 2d: Internal/external links + image prompts + social posts.
 * Reads the latest "ar_done" item, generates links + images + social in a
 * single AI call, saves to article_bundle, sets status to "generated".
 *
 * The links generator receives both article texts for anchor matching
 * (P1-6 fix).
 *
 * GET /api/cron/blog/step2d-links
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
      .eq("status", "ar_done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_ar_done" });
    }

    const qi = queueItem as any;
    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};

    // Mark as generating links
    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({ status: "generating_links" })
      .eq("id", qi.id);

    const { internalLinks, externalLinks, imagePrompts, socialPosts, estimatedReadingTime, source } =
      await generateLinksAndSocial(
        {
          topic: qi.topic,
          focusKeyword: qi.focus_keyword,
        },
        bundle.seo || null,
        bundle.englishArticle || "",
        bundle.arabicArticle || "",
      );

    // Save links + images + social into bundle — bundle is now complete
    const updatedBundle = JSON.stringify({
      ...bundle,
      internalLinks,
      externalLinks,
      imagePrompts,
      socialPosts,
      estimatedReadingTime,
    });

    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({
        status: "generated",
        article_bundle: updatedBundle,
      })
      .eq("id", qi.id);

    return NextResponse.json({
      ok: true,
      step: "2d",
      queueId: qi.id,
      internalLinksCount: internalLinks.length,
      externalLinksCount: externalLinks.length,
      readingTime: estimatedReadingTime,
      source,
    });
  } catch (e: any) {
    console.error("[blog/step2d-links] Error:", e?.message || e);
    try {
      await supabaseAdmin
        .from("blog_generation_queue" as any)
        .update({ status: "failed", error_message: `step2d: ${e?.message || "Unknown"}` })
        .eq("status", "generating_links");
    } catch {}
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
