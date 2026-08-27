import { NextRequest, NextResponse } from "next/server";
import {
  fetchFeaturedImage,
  type SourcedImage,
} from "@/lib/blog-images";
import { IMAGE_MODESTY_SUFFIX, type ImagePlanItem } from "@/lib/blog-pipeline";
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
 * Prompts come from the row's OWN image plan and EVERY prompt is
 * appended with IMAGE_MODESTY_SUFFIX (owner hard rule: no nudity, no
 * revealing imagery). Bundle stays FLAT: images is a plain array.
 *
 * Delivery format note: sources are hosted JPEG/PNG URLs; the site
 * renders via next/image which serves optimized WebP automatically.
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

    const imgs = await sourceImages(plan);
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
  } catch (e: any) {
    console.error("[blog/p3-images] Error:", e?.message || e);
    if (queueId) await markQueueItemFailed(queueId, `p3: ${e?.message || "Unknown"}`);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
