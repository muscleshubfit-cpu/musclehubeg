import { NextRequest, NextResponse } from "next/server";
import {
  fetchFeaturedImage,
  getRecentFeaturedImageUrls,
  type SourcedImage,
} from "@/lib/blog-images";
import { sanitizeImageQuery } from "@/lib/image-safety";
import { type ImagePlanItem } from "@/lib/blog-pipeline";
import {
  getQueueIdParam,
  fetchQueueItem,
  requireRowLang,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * PIPELINE V3 · PHASE 3 — Image sourcing (3–5 images, ONE language).
 * IMAGE SAFETY LAW (2026-08-27 owner hard rule): every prompt is built
 * through src/lib/image-safety.ts — PEOPLE-FREE subjects only, zero
 * negations. Image #1 is ANCHORED to the article's focus keyword/title
 * so the featured/og:image is always on-topic. Bundle stays FLAT.
 *
 * GET /api/cron/blog/p3-images?queueId=<uuid>
 */
const MIN_IMAGES = 3;
const MAX_IMAGES = 5;

// PHASE 62 VARIETY: rotating fallback queries — the single hardcoded
// "fitness equipment gym" was a repeat magnet whenever a slot ran dry.
const FALLBACK_QUERIES = [
  "dumbbell rack gym",
  "healthy meal bowl",
  "kettlebell wooden floor",
  "running shoes gym floor",
  "protein shake blender",
  "yoga mat home gym",
  "barbell plates close up",
  "fresh vegetables kitchen",
];

async function sourceImages(
  plan: ImagePlanItem[],
  coverHint: string,
  queueId: string,
): Promise<SourcedImage[]> {
  // Image #1 = topical COVER derived from focus keyword/title (drives
  // featured_image + og:image). Plan items fill positions 2..N.
  // IMAGE SOURCE LAW v3 (2026-08-28): Pexels-first real photography —
  // normal people ALLOWED, NSFW screened. Every position carries its own
  // variationKey = `${queueId}-${slot}` which rotates the picked result
  // inside each search — no two slots repeat the same photo.
  // PHASE 62 VARIETY: every fetch also excludes the last 30 published
  // featured images so new posts stop recycling recent cover photos.
  const excludeUrls = await getRecentFeaturedImageUrls(30);
  const coverKey = `${queueId}-cover`;
  const queries: string[] = [sanitizeImageQuery(coverHint).query];
  for (const p of plan.slice(0, MAX_IMAGES - 1)) {
    queries.push(sanitizeImageQuery(p.subject).query);
  }

  const keys = [coverKey, ...plan.slice(0, MAX_IMAGES - 1).map((_, i) => `${queueId}-${i + 1}`)];
  const settled = await Promise.allSettled(
    queries.map((q, i) => fetchFeaturedImage(q, { variationKey: keys[i], excludeUrls })),
  );
  const okImages = settled
    .filter((s): s is PromiseFulfilledResult<SourcedImage> => s.status === "fulfilled")
    .map((s) => s.value)
    .filter((v): v is SourcedImage => Boolean(v));

  // Never fewer than MIN images while there are queries left untried.
  for (let i = queries.length; okImages.length < MIN_IMAGES && i < MAX_IMAGES; i++) {
    try {
      const fallbackQuery =
        queries[i % Math.max(queries.length, 1)] ||
        FALLBACK_QUERIES[Math.floor(Math.random() * FALLBACK_QUERIES.length)];
      const extra = await fetchFeaturedImage(fallbackQuery, {
        variationKey: `${queueId}-extra-${i}`,
        excludeUrls: [...excludeUrls, ...okImages.map((im) => im!.url)],
      });
      if (extra) okImages.push(extra);
    } catch {
      break;
    }
  }
  return okImages.slice(0, MAX_IMAGES);
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isSupabaseAdminConfigured)
    return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

  const queueId = getQueueIdParam(request);
  if (!queueId)
    return NextResponse.json({ error: "Missing queueId query parameter" }, { status: 400 });

  let qi: QueueItem | null = null;

  try {
    const { data, error: fetchErr } = await fetchQueueItem(queueId);
    if (fetchErr) throw new Error(fetchErr);
    if (!data)
      return NextResponse.json({ ok: false, queueId, skipped: true, reason: "queue_item_not_found" }, { status: 404 });
    qi = data;

    const lang = requireRowLang(qi);

    if (qi.status !== "written" && qi.status !== "failed") {
      if (qi.status === "images_done" || qi.status === "reviewed") {
        return NextResponse.json({ ok: true, step: "p3", queueId: qi.id, lang, idempotent: true });
      }
      if (qi.status === "published")
        return NextResponse.json({ ok: true, step: "p3", queueId: qi.id, lang, idempotent: true });
      return NextResponse.json(
        { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
        { status: 409 },
      );
    }

    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};
    const plan: ImagePlanItem[] = bundle.outline?.imagePlan ?? [];
    if (plan.length === 0) {
      throw new Error("p3: image plan missing — rerun p1-outline");
    }

    const imgs = await sourceImages(plan, `${qi.focus_keyword || ""} ${bundle.outline?.title || qi.topic || ""}`.trim(), qi.id);
    if (imgs.length === 0) {
      throw new Error("p3: no images could be sourced");
    }

    const updateErr = await updateQueueItem(qi.id, {
      status: "images_done",
      article_bundle: JSON.stringify({ ...bundle, images: imgs }),
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "p3",
      queueId: qi.id,
      lang,
      images: imgs.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[blog/p3-images] Error:", msg);
    if (queueId) await markQueueItemFailed(queueId, `p3: ${msg || "Unknown"}`);
    return NextResponse.json({ error: msg || "Failed" }, { status: 500 });
  }
}
