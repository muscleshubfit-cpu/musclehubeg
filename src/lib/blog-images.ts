/**
 * Blog featured image sourcing — PEXELS-FIRST REAL PHOTOGRAPHY.
 *
 * OWNER DIRECTIVE (2026-08-28): «استبدل خطوه الصور تماما الى
 * PEXELS_API_KEY داخل GitHub Action … بحيث يكون فى اشخاص عادى لكن لا عرى»
 *
 * Sources (in order of priority):
 *   1. Pexels API (PEXELS_API_KEY) — PRIMARY. Real fitness photography,
 *      normal people ALLOWED, nudity screened out at query AND result
 *      level. `src.landscape` = 1200×627 auto=compress CDN URL → the
 *      site's next/image system converts it to lightweight WebP.
 *   2. Unsplash API (optional key)
 *   3. Pixabay API (optional key, safesearch=true)
 *
 * RETIRED (2026-08-28): Pollinations AI generation — removed entirely
 * per owner directive (real photography only, no diffusion renders).
 *
 * DIVERSITY: search returns up to 6 results; the picked index rotates
 * deterministically per variationKey = (article, position) so posts and
 * in-article slots never repeat the same photo while staying stable.
 */

import {
  sanitizeImageQuery,
  hasNsfwVocabulary,
  hasImmodestSignal,
  pickResultIndex,
} from "@/lib/image-safety";

/**
 * v3.1 RESULT SCREENING — combined modesty gate for alt-texts:
 * NSFW vocabulary AND immodest-signal wording ("flexing his muscles",
 * "shirtless", "six pack"…) both reject a candidate photo.
 */
function altTextUnsafe(alt: string | null | undefined): boolean {
  if (!alt) return false;
  return hasNsfwVocabulary(alt) || hasImmodestSignal(alt);
}

export type SourcedImage = { url: string; alt: string; credit: string } | null;

/**
 * Per-call image-source options:
 *  - variationKey: deterministic (article, position) key that rotates
 *    the picked result inside the search results (owner: no two images
 *    in the blog should look like copies of one another).
 */
export type ImageSourceOptions = {
  variationKey?: string;
};

/** Results fetched per search — rotation pool size. */
const RESULTS_PER_SEARCH = 6;

/**
 * Search Pexels for a photo matching the query. PRIMARY source.
 * Alt-texts are NSFW-screened; the picked index rotates per variationKey.
 */
async function searchPexels(
  query: string,
  opts?: ImageSourceOptions,
): Promise<SourcedImage> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_SEARCH}&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photos: any[] = data?.photos ?? [];
    // «لا عرى»: reject any result whose alt text carries NSFW or
    // immodest-signal vocabulary (v3.1: caught the shirtless-back case).
    const safe = photos.filter((p) => !altTextUnsafe(p?.alt));
    if (safe.length === 0) return null;

    const photo = safe[pickResultIndex(safe.length, opts?.variationKey)];
    if (!photo) return null;

    // src.landscape = 1200×627 crop with auto=compress&cs=tinysrgb —
    // lightweight at the CDN level before next/image further optimizes.
    const url: string =
      photo.src?.landscape || photo.src?.large || photo.src?.medium || photo.src?.original;
    if (!url) return null;

    return {
      url,
      alt: photo.alt || query,
      credit: photo.photographer ? `Photo by ${photo.photographer} on Pexels` : "Pexels",
    };
  } catch {
    return null;
  }
}

/**
 * Search Unsplash for a photo matching the query (failover source).
 */
async function searchUnsplash(
  query: string,
  opts?: ImageSourceOptions,
): Promise<SourcedImage> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${RESULTS_PER_SEARCH}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = data?.results ?? [];
    const safe = results.filter((p) => !altTextUnsafe(p?.alt_description || p?.description));
    if (safe.length === 0) return null;

    const photo = safe[pickResultIndex(safe.length, opts?.variationKey)];
    if (!photo) return null;

    return {
      url: photo.urls?.regular || photo.urls?.full,
      alt: photo.alt_description || query,
      credit: photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : "Unsplash",
    };
  } catch {
    return null;
  }
}

/**
 * Search Pixabay for a photo matching the query (failover source;
 * safesearch=true is enforced by their API).
 */
async function searchPixabay(
  query: string,
  opts?: ImageSourceOptions,
): Promise<SourcedImage> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${RESULTS_PER_SEARCH}&safesearch=true`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hits: any[] = data?.hits ?? [];
    const safe = hits.filter((p) => !altTextUnsafe(p?.tags));
    if (safe.length === 0) return null;

    const hit = safe[pickResultIndex(safe.length, opts?.variationKey)];
    if (!hit) return null;

    return {
      url: hit.largeImageURL || hit.webformatURL || hit.previewURL,
      alt: hit.tags || query,
      credit: hit.user ? `Photo by ${hit.user} on Pixabay` : "Pixabay",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a featured image for a blog article.
 * Pexels first (real photography, people OK / nudity never), then
 * Unsplash, then Pixabay.
 */
export async function fetchFeaturedImage(
  query: string,
  opts?: ImageSourceOptions,
): Promise<SourcedImage> {
  if (!query.trim()) return null;

  // DEFENSIVE GATE: every source receives a sanitized query — NSFW vocab
  // and negation constructions stripped; people words preserved (v3 law).
  const { query: safeQuery } = sanitizeImageQuery(query);
  if (!safeQuery) return null;

  const sources = [
    () => searchPexels(safeQuery, opts),
    () => searchUnsplash(safeQuery, opts),
    () => searchPixabay(safeQuery, opts),
  ];

  for (const source of sources) {
    const result = await source();
    if (result) return result;
  }

  return null;
}

/**
 * Fetch a featured image using multiple search queries. Each query gets
 * its own variation suffix so multi-query sourcing stays diverse.
 */
export async function fetchFeaturedImageMultiQuery(
  queries: string[],
  opts?: ImageSourceOptions,
): Promise<SourcedImage> {
  for (let i = 0; i < queries.length; i++) {
    const key = opts?.variationKey ? `${opts.variationKey}-q${i}` : undefined;
    const result = await fetchFeaturedImage(queries[i], { ...opts, variationKey: key });
    if (result) return result;
  }
  return null;
}

/**
 * BODY IMAGE EMBEDDING LAW (2026-08-27): P3 sources 3–5 images per article
 * but P5 only consumed images[0] (featured/og cover) — positions 2..N went
 * to waste and every published article rendered as a bare wall of text.
 *
 * `embedBodyImages` inserts images[1..N] (capped at MAX_BODY_IMAGES) into
 * the reviewed markdown at evenly-spaced `##` section boundaries — the
 * classic "section header → supporting image" blog pattern.
 *
 * Guarantees (unit-tested canaries in src/lib/__tests__/blog-images.test.ts):
 *  - images[0] (the featured/og cover) is NEVER duplicated into the body;
 *  - idempotent: any URL already present in the markdown is skipped, so
 *    re-running publish or the embed backfill cannot double-insert;
 *  - no `##` headings → strict no-op (never injects into unstructured
 *    content);
 *  - fenced code blocks (```/~~~) are never treated as heading boundaries;
 *  - alt text is markdown-safe (brackets stripped).
 */
export const MAX_BODY_IMAGES = 3;

export function embedBodyImages(
  markdown: string,
  images: Array<{ url: string; alt?: string; credit?: string } | null | undefined>,
  maxImages: number = MAX_BODY_IMAGES,
): string {
  if (typeof markdown !== "string" || markdown.length === 0) return markdown;
  if (maxImages <= 0) return markdown;

  const usable = (images || []).filter(
    (i): i is { url: string; alt?: string; credit?: string } =>
      Boolean(i && typeof i.url === "string" && i.url.length > 0),
  );
  // images[0] is the COVER (featured_image + og:image) — body starts at 1.
  const candidates = usable.slice(1, 1 + maxImages);
  if (candidates.length === 0) return markdown;

  const startsWithHeading = markdown.startsWith("## ");
  const hasInlineHeading = markdown.includes("\n## ");
  if (!startsWithHeading && !hasInlineHeading) return markdown;

  const lines = markdown.split("\n");
  const fenceRe = /^\s*(```|~~~)/;
  let fenced = false;
  const headingIdx: number[] = [];
  lines.forEach((line, i) => {
    if (fenceRe.test(line)) fenced = !fenced;
    else if (!fenced && /^##\s+\S/.test(line)) headingIdx.push(i);
  });
  if (headingIdx.length === 0) return markdown;

  const H = headingIdx.length;
  const K = candidates.length;
  const byHeading = new Map<number, { url: string; alt?: string }>();
  for (let i = 0; i < K; i++) {
    const pos = Math.min(H, Math.max(1, Math.round(((i + 1) * H) / (K + 1))));
    const idx = headingIdx[pos - 1];
    if (idx !== undefined && !byHeading.has(idx)) byHeading.set(idx, candidates[i]);
  }
  if (byHeading.size === 0) return markdown;

  const out: string[] = [];
  let inserted = 0;
  lines.forEach((line, i) => {
    out.push(line);
    const img = byHeading.get(i);
    if (img && !markdown.includes(img.url)) {
      const alt = (img.alt || "MuscleHubEG").replace(/[[\]]/g, "").trim() || "MuscleHubEG";
      out.push("");
      out.push(`![${alt}](${img.url})`);
      out.push("");
      inserted += 1;
    }
  });

  return inserted > 0 ? out.join("\n") : markdown;
}
