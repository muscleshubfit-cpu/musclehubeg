import { NextRequest, NextResponse } from "next/server";
import {
  fetchFeaturedImage,
  type SourcedImage,
} from "@/lib/blog-images";
import { IMAGE_MODESTY_SUFFIX, type ImagePlanItem } from "@/lib/blog-pipeline";
import {
  getQueueIdParam,
  fetchQueueItem,
  validateQueueStatus,
  updateQueueItem,
  markQueueItemFailed,
  type QueueItem,
} from "@/lib/blog-queue";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * PIPELINE V2 · PHASE 3 — Image generation (3–5 per language).
 * Prompts come from the P1 image plan and EVERY prompt is appended with
 * IMAGE_MODESTY_SUFFIX (owner hard rule: no nudity, no revealing imagery).
 *
 * Delivery format note: sources are hosted JPEG/PNG URLs; the site renders
 * via next/image which serves optimized WebP to browsers automatically —
 * satisfying the WebP-at-delivery requirement without extra conversion.
 *
 * GET /api/cron/blog/p3-images?queueId=<uuid>
 */
const MIN_IMAGES = 3;
const MAX_IMAGES = 5;

async function sourceImages(plan: ImagePlanItem[]): Promise<SourcedImage[]> {
  const prompts = plan
    .slice(0, MAX_IMAGES)
    .map((p) => `${p.subject}, ${p.type === "infographic" ? "clean infographic style" : p.type === "diagram" ? "clear explanatory diagram style" : "editorial photography"}${IMAGE_MODESTY_SUFFIX}`);

  const settled = await Promise.allSettled(prompts.map((q) => fetchFeaturedImage(q)));
  const okImages = settled
    .filter((s): s is PromiseFulfilledResult<SourcedImage> => s.status === "fulfilled")
    .map((s) => s.value)
    .filter((v): v is SourcedImage => Boolean(v));

  // Never fewer than MIN images while there are prompts left untried.
  for (let i = prompts.length; okImages.length < MIN_IMAGES && i < MAX_IMAGES; i++) {
    try {
      const extra = await fetchFeaturedImage(`${prompts[i % Math.max(prompts.length, 1)] || "fitness workout"}${IMAGE_MODESTY_SUFFIX}`);
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

    const statusErr = validateQueueStatus(qi, "ar_written");
    if (statusErr) {
      if (qi.status === "images_done")
        return NextResponse.json({ ok: true, step: "p3", queueId: qi.id, idempotent: true });
      if (qi.status === "images_done" || qi.status === "reviewed") {
        /* proceed */
      } else if (qi.status !== "failed") {
        return NextResponse.json(
          { ok: false, queueId: qi.id, skipped: true, reason: "wrong_status", actual_status: qi.status },
          { status: 409 },
        );
      }
    }

    const bundle = qi.article_bundle ? JSON.parse(qi.article_bundle) : {};
    const planEn: ImagePlanItem[] = bundle.outline?.en?.imagePlan ?? [];
    const planAr: ImagePlanItem[] = bundle.outline?.ar?.imagePlan ?? [];
    if (planEn.length === 0 || planAr.length === 0) {
      throw new Error("p3: image plan missing — rerun p1-outline");
    }

    const [imgEn, imgAr] = await Promise.all([sourceImages(planEn), sourceImages(planAr)]);
    if (imgEn.length === 0 && imgAr.length === 0) {
      throw new Error("p3: no images could be sourced for either language");
    }

    const updatedBundle = JSON.stringify({
      ...bundle,
      images: { en: imgEn, ar: imgAr },
    });

    const updateErr = await updateQueueItem(qi.id, {
      status: "images_done",
      article_bundle: updatedBundle,
    });
    if (updateErr) throw new Error(updateErr);

    return NextResponse.json({
      ok: true,
      step: "p3",
      queueId: qi.id,
      enImages: imgEn.length,
      arImages: imgAr.length,
    });
  } catch (e: any) {
    console.error("[blog/p3-images] Error:", e?.message || e);
    if (queueId) await markQueueItemFailed(queueId, `p3: ${e?.message || "Unknown"}`);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
