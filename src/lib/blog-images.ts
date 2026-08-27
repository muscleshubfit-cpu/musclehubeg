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

