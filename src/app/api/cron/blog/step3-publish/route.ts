import { NextRequest, NextResponse } from "next/server";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";

export const maxDuration = 60;

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

async function uniqueSlug(base: string, language: "en" | "ar"): Promise<string> {
  if (!supabaseAdmin) return base;
  let slug = base || `post-${Date.now()}`;
  let attempt = 0;
  while (attempt < 5) {
    const { data } = await supabaseAdmin
      .from("blog_posts" as any)
      .select("id")
      .eq("slug", slug)
      .eq("language", language)
      .maybeSingle();
    if (!data) return slug;
    attempt += 1;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now()}`;
}

async function titleAlreadyExists(title: string, language: "en" | "ar"): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  const { data } = await supabaseAdmin
    .from("blog_posts" as any)
    .select("id")
    .eq("language", language)
    .ilike("title", normalized)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

/**
 * Step 3: Publish.
 * Reads the latest "generated" item from the queue, fetches a featured
 * image (Pexels), checks for duplicates, and inserts both EN + AR posts.
 *
 * GET /api/cron/blog/step3-publish
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  try {
    // Get the latest generated article
    const { data: queueItem, error: qErr } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .select("*")
      .eq("status", "generated")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_generated_article" });
    }

    const bundle = JSON.parse(queueItem.article_bundle);
    const safeCategory = normalizeCategory(queueItem.category);

    // Check for duplicate titles
    if (await titleAlreadyExists(bundle.seo.en.seoTitle, "en")) {
      await supabaseAdmin.from("blog_generation_queue" as any).update({ status: "skipped_duplicate" }).eq("id", queueItem.id);
      return NextResponse.json({ skipped: true, reason: "duplicate-en-title", title: bundle.seo.en.seoTitle });
    }
    if (await titleAlreadyExists(bundle.seo.ar.seoTitle, "ar")) {
      await supabaseAdmin.from("blog_generation_queue" as any).update({ status: "skipped_duplicate" }).eq("id", queueItem.id);
      return NextResponse.json({ skipped: true, reason: "duplicate-ar-title", title: bundle.seo.ar.seoTitle });
    }

    const now = new Date().toISOString();
    const enSlug = await uniqueSlug(slugify(bundle.seo.en.slug || queueItem.focus_keyword), "en");
    const arSlug = await uniqueSlug(slugify(bundle.seo.ar.slug || bundle.seo.en.slug || queueItem.focus_keyword), "ar");

    // Fetch image (Pexels — fast, ~3-5s)
    let imageUrl: string | null = null;
    try {
      const img = await fetchFeaturedImage(bundle.seo.focusKeyword || queueItem.focus_keyword || queueItem.topic);
      imageUrl = img?.url || null;
    } catch {}

    // Insert EN post
    const enRow = {
      language: "en",
      title: bundle.seo.en.seoTitle,
      slug: enSlug,
      excerpt: bundle.seo.en.metaDescription,
      content: bundle.englishArticle,
      meta_title: bundle.seo.en.metaTitle,
      meta_description: bundle.seo.en.metaDescription,
      focus_keyword: bundle.seo.focusKeyword,
      keywords: bundle.seo.secondaryKeywords,
      category: safeCategory,
      tags: bundle.seo.secondaryKeywords.slice(0, 5),
      featured_image: imageUrl,
      cover_alt: bundle.seo.en.seoTitle,
      reading_time: bundle.estimatedReadingTime,
      author: "Ahmed Zake",
      is_published: true,
      published_at: now,
      faq_json: bundle.faq,
    };

    const arRow = {
      ...enRow,
      language: "ar",
      title: bundle.seo.ar.seoTitle,
      slug: arSlug,
      excerpt: bundle.seo.ar.metaDescription,
      content: bundle.arabicArticle,
      meta_title: bundle.seo.ar.metaTitle,
      meta_description: bundle.seo.ar.metaDescription,
      faq_json: bundle.faqAr && bundle.faqAr.length > 0 ? bundle.faqAr : bundle.faq,
    };

    const { data: enPost, error: enErr } = await supabaseAdmin
      .from("blog_posts" as any)
      .insert(enRow)
      .select()
      .single() as any;
    if (enErr) throw new Error(`EN insert: ${enErr.message}`);

    const { data: arPost, error: arErr } = await supabaseAdmin
      .from("blog_posts" as any)
      .insert(arRow)
      .select()
      .single() as any;
    if (arErr) throw new Error(`AR insert: ${arErr.message}`);

    // Link the two posts
    if (enPost && arPost) {
      await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: arPost.id }).eq("id", enPost.id);
      await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: enPost.id }).eq("id", arPost.id);
    }

    // Mark queue item as published
    await supabaseAdmin
      .from("blog_generation_queue" as any)
      .update({
        status: "published",
        published_at: now,
        en_post_id: enPost?.id,
        ar_post_id: arPost?.id,
      })
      .eq("id", queueItem.id);

    return NextResponse.json({
      ok: true,
      step: 3,
      category: queueItem.category,
      topic: queueItem.topic,
      en: { title: enRow.title, slug: enSlug },
      ar: { title: arRow.title, slug: arSlug },
    });
  } catch (e: any) {
    console.error("[blog/step3-publish] Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
