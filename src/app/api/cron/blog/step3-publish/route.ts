import { NextRequest, NextResponse } from "next/server";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";
import { buildFinalBundle, type ArticleBundle } from "@/lib/blog-generate";

export const maxDuration = 60;

/**
 * Slugify a string into a URL-safe, Latin-only slug.
 *
 * Defense-in-depth: the chunk1Prompt explicitly instructs the LLM to
 * produce Latin-only slugs even for Arabic posts (because Arabic URLs
 * break sharing/encoding). But LLMs sometimes disobey. This function
 * strips any non-ASCII characters (including Arabic) from the slug —
 * if the result is empty (the LLM produced an all-Arabic slug), the
 * caller falls back to `qi.focus_keyword` (which is always Latin)
 * via `bundle.seo.en.slug || qi.focus_keyword` in the existing call.
 *
 * Without this enforcement, an Arabic slug would be silently URL-
 * encoded by Supabase (e.g. `كورتيزول` → `%D9%83%D9%88%D8%B1%D8%...`)
 * which works technically but produces unreadable URLs that break
 * SEO + social sharing.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Strip ALL non-ASCII characters (Arabic, CJK, emoji, etc.)
    // ASCII range is 0x00-0x7F (128 chars).
    .replace(/[^\x00-\x7F]/g, "")
    // Remove non-word, non-space, non-hyphen characters
    .replace(/[^\w\s-]/g, "")
    // Collapse whitespace → single hyphen
    .replace(/\s+/g, "-")
    // Collapse consecutive hyphens
    .replace(/-+/g, "-")
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
    // Cap at 80 chars
    .slice(0, 80);
}

async function uniqueSlug(base: string, language: "en" | "ar"): Promise<string> {
  if (!supabaseAdmin) return base;
  // If `base` is empty (e.g. AR slug was all-Arabic and got stripped by
  // slugify), generate a date-based fallback. Otherwise the empty string
  // would propagate through the retry loop and produce empty slugs.
  let slug = base || `post-${Date.now()}`;
  const effectiveBase = base || slug; // use the fallback for retry suffixes too
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
    slug = `${effectiveBase}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${effectiveBase}-${Date.now()}`;
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
 * Partial-publish recovery: if the EN post inserts successfully but the
 * AR post insert (or any subsequent step) fails, the catch handler
 * marks the queue item `failed:partial_publish` with the en_post_id
 * preserved in the error_message. Without this, the queue item would
 * stay at `generated` status — the next Step 3 invocation would re-read
 * it, hit the `titleAlreadyExists` check on the EN title, and silently
 * skip (marking the queue `skipped_duplicate`) — leaving the AR post
 * permanently missing with no signal to the owner.
 *
 * GET /api/cron/blog/step3-publish
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  // Track partial-publish state for the catch handler. If enPost is
  // set but arPost is not, we know the EN post was inserted and the
  // AR post failed — needs manual cleanup (delete the orphan EN post
  // or manually insert the AR post + link).
  let enPostId: string | null = null;
  let qiId: string | null = null;

  try {
    // Get the latest generated article
    const { data: queueItem, error: qErr } = await supabaseAdmin
      .from("blog_generation_queue" as any)
      .select("*")
      .eq("status", "generated")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (qErr) throw new Error(`Queue read: ${qErr.message}`);
    if (!queueItem) {
      return NextResponse.json({ skipped: true, reason: "no_generated_article" });
    }

    const qi = queueItem as any;
    qiId = qi.id;

    const rawBundle = JSON.parse(qi.article_bundle);

    // If the bundle was generated by the new multi-step pipeline,
    // it has individual fields (research, seo, englishArticle, etc.)
    // that need to be assembled via buildFinalBundle (which inserts links).
    // If it was generated by the old single-call generateArticleBundle(),
    // it already has the final shape with links inserted.
    let bundle: ArticleBundle;
    if (rawBundle.source === "openrouter:multi-step" || (!rawBundle.englishArticle && rawBundle.research !== undefined)) {
      // New multi-step format: assemble via buildFinalBundle
      bundle = buildFinalBundle({
        research: rawBundle.research,
        seo: rawBundle.seo,
        englishArticle: rawBundle.englishArticle || "",
        arabicArticle: rawBundle.arabicArticle || "",
        faq: rawBundle.faq || [],
        faqAr: rawBundle.faqAr || [],
        internalLinks: rawBundle.internalLinks || [],
        externalLinks: rawBundle.externalLinks || [],
        imagePrompts: rawBundle.imagePrompts,
        socialPosts: rawBundle.socialPosts,
        estimatedReadingTime: rawBundle.estimatedReadingTime || 1,
      });
    } else {
      // Old format: already has links inserted, use as-is
      bundle = rawBundle as ArticleBundle;
    }
    const safeCategory = normalizeCategory(qi.category);

    // Check for duplicate titles
    if (await titleAlreadyExists(bundle.seo.en.seoTitle, "en")) {
      await supabaseAdmin.from("blog_generation_queue" as any).update({ status: "skipped_duplicate" }).eq("id", qi.id);
      return NextResponse.json({ skipped: true, reason: "duplicate-en-title", title: bundle.seo.en.seoTitle });
    }
    if (await titleAlreadyExists(bundle.seo.ar.seoTitle, "ar")) {
      await supabaseAdmin.from("blog_generation_queue" as any).update({ status: "skipped_duplicate" }).eq("id", qi.id);
      return NextResponse.json({ skipped: true, reason: "duplicate-ar-title", title: bundle.seo.ar.seoTitle });
    }

    const now = new Date().toISOString();
    const enSlug = await uniqueSlug(slugify(bundle.seo.en.slug || qi.focus_keyword), "en");
    const arSlug = await uniqueSlug(slugify(bundle.seo.ar.slug || bundle.seo.en.slug || qi.focus_keyword), "ar");

    // Fetch image (Pexels — fast, ~3-5s)
    // Image is stored as a remote URL — Pexels CDN serves optimized images.
    // No local compression needed since images are served from Pexels CDN.
    let imageUrl: string | null = null;
    try {
      const img = await fetchFeaturedImage(bundle.seo.focusKeyword || qi.focus_keyword || qi.topic);
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
      author: "MuscleHub",
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
    enPostId = (enPost as any)?.id || null;

    const { data: arPost, error: arErr } = await supabaseAdmin
      .from("blog_posts" as any)
      .insert(arRow)
      .select()
      .single() as any;
    if (arErr) throw new Error(`AR insert: ${arErr.message} (EN post ${enPostId} was already inserted — needs manual cleanup or AR insert + link).`);

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
        en_post_id: enPost?.id,
        ar_post_id: arPost?.id,
      })
      .eq("id", qi.id);

    return NextResponse.json({
      ok: true,
      step: 3,
      category: qi.category,
      topic: qi.topic,
      en: { title: enRow.title, slug: enSlug },
      ar: { title: arRow.title, slug: arSlug },
    });
  } catch (e: any) {
    console.error("[blog/step3-publish] Error:", e?.message || e);
    // Mark THIS queue item as failed (not silently leave it at "generated").
    // If enPostId is set, the EN post was inserted but the AR post failed —
    // include enPostId in the error_message so the owner can find the
    // orphan EN post and either delete it or manually insert + link the AR post.
    if (qiId) {
      try {
        const partial = enPostId ? `partial_publish: EN post ${enPostId} was inserted but AR failed. ` : "";
        await supabaseAdmin
          .from("blog_generation_queue" as any)
          .update({
            status: "failed",
            error_message: `step3: ${partial}${e?.message || "Unknown"}`,
            ...(enPostId ? { en_post_id: enPostId } : {}),
          })
          .eq("id", qiId);
      } catch {}
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
