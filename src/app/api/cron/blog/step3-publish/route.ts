import { NextRequest, NextResponse } from "next/server";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";
import { buildFinalBundle, type ArticleBundle } from "@/lib/blog-generate";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";

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
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, language: "en" | "ar"): Promise<string> {
  if (!supabaseAdmin) return base;
  let slug = base || `post-${Date.now()}`;
  const effectiveBase = base || slug;
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
 *
 * Reads the queue item identified by `?queueId=<uuid>` (passed from
 * Step 2d's response, which got it from Step 1), fetches a featured
 * image (Pexels), checks for duplicates, and inserts both EN + AR posts.
 *
 * Queue-item threading (MH-QUEUE-HANDOFF-007): queueId is REQUIRED.
 * UPDATE error checking: all UPDATEs go through `updateQueueItem()`.
 *
 * Partial-publish recovery: if the EN post inserts successfully but the
 * AR post insert (or any subsequent step) fails, the catch handler
 * marks the queue item `failed:partial_publish` with the en_post_id
 * preserved in the error_message.
 *
 * GET /api/cron/blog/step3-publish?queueId=<uuid>
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId) {
    return NextResponse.json(
      { error: "Missing queueId query parameter", message: "Step 3 requires ?queueId=<uuid> from Step 2d's response." },
      { status: 400 },
    );
  }

  // Track partial-publish state for the catch handler.
  let enPostId: string | null = null;
  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data) {
      return NextResponse.json(
        { ok: false, step: 3, queueId, skipped: true, reason: "queue_item_not_found", message: `Queue item ${queueId} does not exist.` },
        { status: 404 },
      );
    }
    qi = data;

    const statusErr = validateQueueStatus(qi, "generated");
    if (statusErr) {
      if (qi.status === "published") {
        return NextResponse.json({ ok: true, step: 3, queueId: qi.id, idempotent: true, message: `Queue item ${qi.id} is already published.` });
      }
      return NextResponse.json(
        { ok: false, step: 3, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status, expected_status: "generated", message: statusErr },
        { status: 409 },
      );
    }

    const rawBundle = JSON.parse(qi.article_bundle || "{}");

    // Assemble the bundle via buildFinalBundle (which inserts links).
    let bundle: ArticleBundle;
    if (rawBundle.source === "openrouter:multi-step" || (!rawBundle.englishArticle && rawBundle.research !== undefined)) {
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
        // NEW optional fields (absent in old bundles — buildFinalBundle handles absence):
        imagePromptsAr: rawBundle.imagePromptsAr,
        socialPostsAr: rawBundle.socialPostsAr,
        estimatedReadingTimeAr: rawBundle.estimatedReadingTimeAr,
        internalLinksAr: rawBundle.internalLinksAr,
        externalLinksAr: rawBundle.externalLinksAr,
      });
    } else {
      bundle = rawBundle as ArticleBundle;
    }
    const safeCategory = normalizeCategory(qi.category);

    // Check for duplicate titles
    if (await titleAlreadyExists(bundle.seo.en.seoTitle, "en")) {
      const dupErr = await updateQueueItem(qi.id, { status: "skipped_duplicate", error_message: `step3: duplicate-en-title "${bundle.seo.en.seoTitle}"` });
      if (dupErr) console.error(`[blog/step3-publish] Failed to mark skipped_duplicate: ${dupErr}`);
      return NextResponse.json({ skipped: true, reason: "duplicate-en-title", title: bundle.seo.en.seoTitle });
    }
    if (await titleAlreadyExists(bundle.seo.ar.seoTitle, "ar")) {
      const dupErr = await updateQueueItem(qi.id, { status: "skipped_duplicate", error_message: `step3: duplicate-ar-title "${bundle.seo.ar.seoTitle}"` });
      if (dupErr) console.error(`[blog/step3-publish] Failed to mark skipped_duplicate: ${dupErr}`);
      return NextResponse.json({ skipped: true, reason: "duplicate-ar-title", title: bundle.seo.ar.seoTitle });
    }

    const now = new Date().toISOString();
    const enSlug = await uniqueSlug(slugify(bundle.seo.en.slug || qi.focus_keyword), "en");
    const arSlug = await uniqueSlug(slugify(bundle.seo.ar.slug || bundle.seo.en.slug || qi.focus_keyword), "ar");

    // Fetch image — shared URL between EN and AR posts.
    // Image query: prefer EN focus keyword, fall back to AR or topic.
    const enFocusKeyword = bundle.seo.en.focusKeyword || bundle.seo.focusKeyword || qi.focus_keyword || qi.topic;
    const arFocusKeyword = bundle.seo.ar.focusKeyword || qi.focus_keyword_ar || qi.focus_keyword || "";
    const imageQuery = bundle.imagePrompts?.featuredImage || enFocusKeyword;
    let imageUrl: string | null = null;
    try {
      const img = await fetchFeaturedImage(imageQuery);
      imageUrl = img?.url || null;
    } catch {}

    // ─────────────────────────────────────────────────────────────────
    // EN ROW — built from EN-specific fields only.
    // EN/AR SEPARATION: no inheritance from AR.
    // ─────────────────────────────────────────────────────────────────
    const enRow = {
      language: "en" as const,
      title: bundle.seo.en.seoTitle || qi.topic || "Untitled",
      slug: enSlug,
      excerpt: bundle.seo.en.metaDescription,
      content: bundle.englishArticle,
      meta_title: bundle.seo.en.metaTitle,
      meta_description: bundle.seo.en.metaDescription,
      focus_keyword: enFocusKeyword,
      keywords: bundle.seo.en.secondaryKeywords || bundle.seo.secondaryKeywords || [],
      category: safeCategory,
      tags: (bundle.seo.en.secondaryKeywords || bundle.seo.secondaryKeywords || []).slice(0, 5),
      featured_image: imageUrl,
      cover_alt: bundle.seo.en.seoTitle || qi.topic || "Untitled", // EN-specific alt text
      reading_time: bundle.estimatedReadingTime,
      author: "MuscleHubEG",
      is_published: true,
      published_at: now,
      faq_json: bundle.faq,
    };

    // ─────────────────────────────────────────────────────────────────
    // AR ROW — built from AR-specific fields only.
    // EN/AR SEPARATION: no inheritance from EN. AR has its own focus_keyword,
    // keywords, tags, reading_time, cover_alt, and FAQ.
    // Only featured_image URL is shared (one image per article pair).
    // ─────────────────────────────────────────────────────────────────
    const arKeywords = bundle.seo.ar.secondaryKeywords || [];
    const arTitle = bundle.seo.ar.seoTitle || qi.topic_ar || qi.topic || "Untitled";
    const arRow = {
      language: "ar" as const,
      title: arTitle,
      slug: arSlug,
      excerpt: bundle.seo.ar.metaDescription,
      content: bundle.arabicArticle,
      meta_title: bundle.seo.ar.metaTitle || arTitle,
      meta_description: bundle.seo.ar.metaDescription,
      focus_keyword: arFocusKeyword, // AR-specific — NOT inherited from EN
      keywords: arKeywords, // AR-specific — NOT inherited from EN
      category: safeCategory,
      tags: arKeywords.slice(0, 5), // AR-specific tags
      featured_image: imageUrl, // shared URL (OK — one image per article pair)
      cover_alt: arTitle, // AR-specific alt text
      reading_time: bundle.estimatedReadingTimeAr || bundle.estimatedReadingTime || 1, // AR-specific reading time
      author: "MuscleHubEG",
      is_published: true,
      published_at: now,
      faq_json: bundle.faqAr && bundle.faqAr.length > 0 ? bundle.faqAr : [], // AR FAQ only — NO fallback to EN faq
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
    const updateErr = await updateQueueItem(qi.id, {
      status: "published",
      en_post_id: enPost?.id,
      ar_post_id: arPost?.id,
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: 3,
      queueId: qi.id,
      category: qi.category,
      topic: qi.topic,
      en: { title: enRow.title, slug: enSlug },
      ar: { title: arRow.title, slug: arSlug },
    });
  } catch (e: any) {
    console.error("[blog/step3-publish] Error:", e?.message || e);
    if (queueId) {
      const partial = enPostId ? `partial_publish: EN post ${enPostId} was inserted but AR failed. ` : "";
      await markQueueItemFailed(queueId, `step3: ${partial}${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
