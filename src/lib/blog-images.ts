/**
 * Blog featured image sourcing — generates AI cover images matching article
 * content as primary source, falling back to stock photos.
 *
 * OWNER DIRECTIVE (2026-08-27): all AI calls must go through OpenRouter / Groq.
 * Google Imagen 3 (native Gemini SDK) was removed. Image generation now uses:
 *
 * Sources (in order of priority):
 *   1. Pollinations AI — free hosted flux endpoint (NOT a Gemini call; plain
 *      CDN URL, no API key). Two attempts: model=flux then model=turbo with
 *      a fresh seed.
 *   2. Unsplash API (optional key)
 *   3. Pexels API (optional key)
 *   4. Pixabay API (optional key)
 */

import { buildSafeImagePrompt, promptHasBannedVocabulary } from "@/lib/image-safety";

export type SourcedImage = { url: string; alt: string; credit: string } | null;

/**
 * Generate an image using Pollinations AI (flux → turbo fallback attempts).
 * Shared by the native GHA blog pipeline (P3 images step).
 *
 * IMAGE SAFETY (2026-08-27 owner hard rule): the prompt is sanitized
 * through image-safety BEFORE any provider sees it — people-free subjects
 * only, zero negations (the old "no nudity"-style suffixes BACKFIRED on
 * diffusion models and directly caused the live incident). The final URL
 * is asserted clean before returning.
 */
async function generateAIImage(query: string): Promise<SourcedImage> {
  if (!query.trim()) return null;

  const safePrompt = buildSafeImagePrompt(query);
  const encodedPrompt = encodeURIComponent(safePrompt);

  for (const [model, credit] of [
    ["flux", "AI Generated (Pollinations flux)"],
    ["turbo", "AI Generated (Pollinations turbo)"],
  ] as const) {
    try {
      const seed = Math.floor(Math.random() * 100000);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true&seed=${seed}&model=${model}`;
      const res = await fetch(pollinationsUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        // HARD ASSERTION: a polluted URL must never leave this module
        // (belt & braces — buildSafeImagePrompt already guarantees it).
        if (promptHasBannedVocabulary(decodeURIComponent(encodedPrompt))) {
          console.warn("[blog-images] refusing unsafe pollinations prompt");
          continue;
        }
        return { url: pollinationsUrl, alt: safePrompt, credit };
      }
    } catch (pErr: any) {
      console.warn(
        `[blog-images] Pollinations ${model} notice:`,
        pErr?.message || pErr,
      );
    }
  }

  return null;
}

/**
 * Search Unsplash for a photo matching the query.
 */
async function searchUnsplash(query: string): Promise<SourcedImage> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data?.results?.[0];
    if (!photo) return null;

    return {
      url: photo.urls.regular,
      alt: photo.alt_description || query,
      credit: photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : "Unsplash",
    };
  } catch {
    return null;
  }
}

/**
 * Search Pexels for a photo matching the query.
 */
async function searchPexels(query: string): Promise<SourcedImage> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data?.photos?.[0];
    if (!photo) return null;

    return {
      url: photo.src?.large || photo.src?.medium || photo.src?.original,
      alt: photo.alt || query,
      credit: photo.photographer ? `Photo by ${photo.photographer} on Pexels` : "Pexels",
    };
  } catch {
    return null;
  }
}

/**
 * Search Pixabay for a photo matching the query.
 */
async function searchPixabay(query: string): Promise<SourcedImage> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key || !query.trim()) return null;

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.hits?.[0];
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
 * Prioritizes AI Image Generation first, falling back to stock photo APIs.
 */
export async function fetchFeaturedImage(query: string): Promise<SourcedImage> {
  if (!query.trim()) return null;

  // DEFENSIVE GATE: every downstream source (AI + stock APIs) receives a
  // sanitized, people-free, negation-free query — no exceptions.
  const safeQuery = buildSafeImagePrompt(query);

  const sources = [
    () => generateAIImage(safeQuery),
    () => searchUnsplash(safeQuery),
    () => searchPexels(safeQuery),
    () => searchPixabay(safeQuery),
  ];

  for (const source of sources) {
    const result = await source();
    if (result) return result;
  }

  return null;
}

/**
 * Fetch a featured image using multiple search queries.
 */
export async function fetchFeaturedImageMultiQuery(queries: string[]): Promise<SourcedImage> {
  for (const query of queries) {
    const result = await fetchFeaturedImage(query);
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

