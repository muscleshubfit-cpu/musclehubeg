import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { fetchFeaturedImage } from "@/lib/blog-images";

/**
 * Suggest ONE safe featured image for an article — the editor's
 * «اقترح صورة آمنة / 🔄 صورة مختلفة» swap flow.
 *
 * POST /api/blog/suggest-image   (coach-only)
 * body: { query: string, exclude?: string[] }
 * → { image: { url, alt, credit } | null }
 *
 * OWNER DIRECTIVE (2026-08-28f, «خلال الانتظار محتاج اقدر اعدل الصور
 * للمقال (بنفس طريقة التوليد) لان احيانا الصور بتكون غير مناسبة»): the
 * coach reviews every AI draft in the editor and must be able to swap an
 * inappropriate cover WITHOUT leaving the review flow. This endpoint is a
 * thin call over the SAME v3.1 sourcing pipeline the automated pipeline
 * uses (sanitizeImageQuery → Pexels-first → NSFW/immodest alt screening →
 * pool rotation → compressed landscape CDN variant) plus an EXCLUDE list:
 * every rejected URL is passed back so the same photo is never suggested
 * twice in one session. Nothing is written here — the editor applies the
 * accepted candidate to featured_image/cover_alt and saves with the post.
 */
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!process.env.PEXELS_API_KEY) {
    return NextResponse.json(
      { error: "PEXELS_API_KEY not set on this deployment" },
      { status: 503 },
    );
  }

  // Body is parsed once and typed at the boundary — every field is then
  // narrowed with real runtime guards (no `any` leakage).
  type SuggestImageBody = {
    query?: unknown;
    exclude?: unknown;
    variation?: unknown;
  };
  let body: SuggestImageBody | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const rawQuery = body?.query;
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 300) : "";
  if (query.length < 3) {
    return NextResponse.json(
      { error: "query too short — use the article title or focus keyword" },
      { status: 400 },
    );
  }

  // Reject-list: URLs seen (and disliked) in this editing session — capped
  // so a hostile client can't balloon the request.
  const excludeRaw = body?.exclude;
  const exclude = Array.isArray(excludeRaw)
    ? excludeRaw
        .filter((u: unknown) => typeof u === "string" && /^https?:\/\//.test(u))
        .map((u: string) => u.slice(0, 500))
        .slice(0, 12)
    : [];

  // variationSeed rotates the results pool between clicks on top of the
  // exclusion filter (two clicks → two different photos, deterministic).
  const rawVariation = body?.variation;
  const variation = Number.isFinite(Number(rawVariation))
    ? Math.abs(Math.trunc(Number(rawVariation))) % 1000
    : 0;

  const image = await fetchFeaturedImage(query, {
    variationKey: `suggest-${variation}-${exclude.length}`,
    excludeUrls: exclude,
  });

  return NextResponse.json({ image });
}
