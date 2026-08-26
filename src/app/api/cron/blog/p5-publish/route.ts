import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";
import { countWords, type OutlinePlan } from "@/lib/blog-pipeline";
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
 * PIPELINE V2 · PHASE 5 — Publish & Update.
 * Pure Node.js / Supabase — NO AI models here (owner spec).
 * Inserts the EN + AR blog_posts rows from the reviewed content,
 * cross-links them, marks the queue row published. The app's dynamic
 * sitemap.ts picks up new posts automatically on next request, so the
 * sitemap requirement is satisfied at platform level.
 *
 * GET /api/cron/blog/p5-publish?queueId=<uuid>
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

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured || !supabaseAdmin)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId)
    return NextResponse.json({ error: "Missing queueId query parameter" }, { status: 400 });

  let enPostId: string | null = null;
  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data)
      return NextResponse.json({ ok: false, queueId, skipped: true, reason: "queue_item_not_found" }, { status: 404 });
    qi = data;

    const statusErr = validateQueueStatus(qi, "reviewed");
    if (statusErr) {
      if (qi.status === "published")
        return NextResponse.json({ ok: true, step: "p5", queueId: qi.id, idempotent: true });
      if (qi.status !== "failed" && !qi.status.startsWith("failed:")) {
        return NextResponse.json(
          { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
          { status: 409 },
        );
      }
      console.warn(`[blog/p5-publish] Re-processing previously failed item ${qi.id}`);
    }

    const rawBundle = JSON.parse(qi.article_bundle || "{}");
    const outline = rawBundle.outline as { en: OutlinePlan; ar: OutlinePlan } | undefined;
    const review = rawBundle.review as any;
    const images = rawBundle.images as { en?: SourcedImg[]; ar?: SourcedImg[] } | undefined;
    if (!outline || !review?.en?.markdown || !review?.ar?.markdown) {
      throw new Error("p5: missing reviewed artifacts — rerun p4-review");
    }

    const safeCategory = normalizeCategory(qi.category);
    const now = new Date().toISOString();

    const enTitle = outline.en.title || qi.topic;
    const arTitle = outline.ar.title || qi.topic_ar || qi.topic;

    if (await titleAlreadyExists(enTitle, "en"))
      return dupSkip(qi.id, enTitle, "en");
    if (await titleAlreadyExists(arTitle, "ar"))
      return dupSkip(qi.id, arTitle, "ar");

    const enSlug = await uniqueSlug(slugify(outline.en.slugBase || qi.focus_keyword), "en");
    const arSlug = await uniqueSlug(slugify(outline.ar.slugBase || enSlug || qi.focus_keyword), "ar");

    const featuredEn = images?.en?.[0]?.url ?? null;
    const featuredAr = images?.ar?.[0]?.url ?? featuredEn;

    const faqEn = rawBundle.research0?.en?.faqs ?? [];
    const faqAr = rawBundle.research0?.ar?.faqs ?? [];

    const buildRow = (
      language: "en" | "ar",
      o: OutlinePlan,
      md: string,
      featured: string | null,
      faq: unknown[],
    ) => ({
      language,
      title: language === "en" ? enTitle : arTitle,
      slug: language === "en" ? enSlug : arSlug,
      excerpt: o.metaDescription,
      content: md,
      meta_title: `${o.title}`.slice(0, 60),
      meta_description: o.metaDescription,
      focus_keyword: language === "en" ? qi!.focus_keyword : (qi!.focus_keyword_ar || qi!.focus_keyword),
      keywords: o.lsiKeywords,
      category: safeCategory,
      tags: o.lsiKeywords.slice(0, 5),
      featured_image: featured,
      cover_alt: language === "en" ? enTitle : arTitle,
      reading_time: Math.max(1, Math.ceil(countWords(md) / 200)),
      author: "MuscleHubEG",
      is_published: true,
      published_at: now,
      faq_json: faq,
    });

    const enRow = buildRow("en", outline.en, review.en.markdown, featuredEn, faqEn);
    const arRow = buildRow("ar", outline.ar, review.ar.markdown, featuredAr, faqAr);

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
    if (arErr) throw new Error(`AR insert: ${arErr.message} (EN post ${enPostId} was already inserted)`);

    if (enPost && arPost) {
      await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: (arPost as any).id }).eq("id", (enPost as any).id);
      await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: (enPost as any).id }).eq("id", (arPost as any).id);
    }

    const updateErr = await updateQueueItem(qi.id, {
      status: "published",
      en_post_id: (enPost as any)?.id,
      ar_post_id: (arPost as any)?.id,
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "p5",
      queueId: qi.id,
      sitemap: "auto (dynamic sitemap.ts)",
      en: { title: enRow.title, slug: enSlug },
      ar: { title: arRow.title, slug: arSlug },
    });
  } catch (e: any) {
    console.error("[blog/p5-publish] Error:", e?.message || e);
    if (queueId) {
      const partial = enPostId ? `partial_publish: EN post ${enPostId} inserted but AR failed. ` : "";
      await markQueueItemFailed(queueId, `p5: ${partial}${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

type SourcedImg = { url: string; alt: string; credit: string };

async function dupSkip(queueId: string, title: string, lang: "en" | "ar") {
  const err = await updateQueueItem(queueId, {
    status: "skipped_duplicate",
    error_message: `p5: duplicate-${lang}-title "${title}"`,
  });
  if (err) console.error(`[blog/p5-publish] Failed to mark skipped_duplicate: ${err}`);
  return NextResponse.json({ ok: true, step: "p5", queueId, skipped: true, reason: `duplicate-${lang}-title`, title });
}
