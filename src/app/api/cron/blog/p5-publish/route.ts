import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog-server";
import { countWords, type OutlinePlan } from "@/lib/blog-pipeline";
import { embedBodyImages } from "@/lib/blog-images";
import { insertToolLinks } from "@/lib/blog-tool-links";
import { slugifyAscii } from "@/lib/slug";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  requireRowLang,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";

export const maxDuration = 60;

/**
 * PIPELINE V3 · PHASE 5 — Publish & Update (ONE language).
 * Pure Node.js / Supabase — NO AI models here (owner spec).
 * Inserts the blog_posts row for the row's OWN language, marks the
 * queue row published. The app's dynamic sitemap.ts picks up new posts
 * automatically on next request.
 *
 * NO cross-language linked_post_id: with fully separate pipelines an
 * EN article has no guaranteed AR twin anymore (independent topics +
 * independent schedules by owner directive).
 *
 * GET /api/cron/blog/p5-publish?queueId=<uuid>
 */
// ONE-SLUG-LAW (2026-08-28j): the local slugify() copy was DELETED —
// slug logic lives only in src/lib/slug.ts (slugifyAscii = exact port).

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

  let publishedPostId: string | null = null;
  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data)
      return NextResponse.json({ ok: false, queueId, skipped: true, reason: "queue_item_not_found" }, { status: 404 });
    qi = data;

    const lang = requireRowLang(qi);

    const statusErr = validateQueueStatus(qi, "reviewed");
    if (statusErr) {
      if (qi.status === "published")
        return NextResponse.json({ ok: true, step: "p5", queueId: qi.id, lang, idempotent: true });
      if (qi.status !== "failed" && !qi.status.startsWith("failed:")) {
        return NextResponse.json(
          { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
          { status: 409 },
        );
      }
      console.warn(`[blog/p5-publish] Re-processing previously failed item ${qi.id}`);
    }

    // FLAT artifacts (V3).
    const bundle = JSON.parse(qi.article_bundle || "{}");
    const outline = bundle.outline as OutlinePlan | undefined;
    const review = bundle.review as { markdown?: string } | undefined;
    const images = (bundle.images ?? []) as { url: string; alt: string; credit: string }[];
    if (!outline?.title || !review?.markdown) {
      throw new Error("p5: missing reviewed artifacts — rerun p4-review");
    }

    const safeCategory = normalizeCategory(qi.category);
    const now = new Date().toISOString();

    const title = outline.title || qi.topic;

    if (await titleAlreadyExists(title, lang))
      return dupSkip(qi.id, title, lang);

    const slug = await uniqueSlug(
      slugifyAscii(outline.slugBase || qi.focus_keyword),
      lang,
    );
    const featured = images[0]?.url ?? null;

    // AUTOMATIC FREE-TOOL INTERNAL LINKING (owner SEO directive,
    // 2026-09-01): deterministic pass — wraps natural mentions (calories,
    // macros, meal plans, water, body fat, BMI…) with links to the
    // matching FREE TOOL on the site. Language-aware (EN/AR triggers),
    // idempotent, max 3 links/article, never inside existing markdown
    // links. Runs AFTER the P4 review (so the review model cannot strip
    // these links) and BEFORE image embedding.
    const toolLinkPass = insertToolLinks(review.markdown, lang);

    const row = {
      language: lang,
      title,
      slug,
      excerpt: outline.metaDescription,
      // BODY IMAGE EMBEDDING LAW: images[0] = featured/og cover; images[1..N]
      // are inserted into the article markdown at section boundaries (was:
      // dropped entirely → every post was a wall of text).
      content: embedBodyImages(toolLinkPass.md, images),
      meta_title: `${outline.title}`.slice(0, 60),
      meta_description: outline.metaDescription,
      focus_keyword: qi.focus_keyword,
      keywords: outline.lsiKeywords,
      category: safeCategory,
      tags: outline.lsiKeywords.slice(0, 5),
      featured_image: featured,
      cover_alt: title,
      reading_time: Math.max(1, Math.ceil(countWords(review.markdown) / 200)),
      author: "Musclehubeg",
      is_published: true,
      published_at: now,
      faq_json: bundle.research0?.faqs ?? [],
    };

    const { data: post, error: insertErr } = await supabaseAdmin
      .from("blog_posts" as any)
      .insert(row)
      .select()
      .single() as any;
    if (insertErr) throw new Error(`Post insert (${lang}): ${insertErr.message}`);
    publishedPostId = (post as any)?.id || null;

    const updateErr = await updateQueueItem(qi.id, {
      status: "published",
      ...(lang === "en"
        ? { en_post_id: publishedPostId ?? undefined }
        : { ar_post_id: publishedPostId ?? undefined }),
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "p5",
      queueId: qi.id,
      lang,
      postId: publishedPostId,
      sitemap: "auto (dynamic sitemap.ts)",
      title: row.title,
      slug,
      toolLinksInserted: toolLinkPass.inserted.length,
    });
  } catch (e: any) {
    console.error("[blog/p5-publish] Error:", e?.message || e);
    if (queueId) {
      const partial = publishedPostId
        ? `partial_publish: ${String(qi?.language ?? "?").toUpperCase()} post ${publishedPostId} inserted but post-update failed. `
        : "";
      await markQueueItemFailed(queueId, `p5: ${partial}${e?.message || "Unknown"}`);
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

async function dupSkip(queueId: string, title: string, lang: "en" | "ar") {
  const err = await updateQueueItem(queueId, {
    status: "skipped_duplicate",
    error_message: `p5: duplicate-${lang}-title "${title}"`,
  });
  if (err) console.error(`[blog/p5-publish] Failed to mark skipped_duplicate: ${err}`);
  return NextResponse.json({ ok: true, step: "p5", queueId, lang, skipped: true, reason: `duplicate-${lang}-title`, title });
}
