/**
 * Blog featured image sourcing — generates AI cover images matching article
 * content as primary source, falling back to stock photos or Pollinations AI if needed.
 *
 * Sources (in order of priority):
 *   1. AI Image Generation (Google Imagen 3 via @google/genai)
 *   2. Pollinations AI (Free high-speed AI image model)
 *   3. Unsplash API (free stock photos)
 *   4. Pexels API
 *   5. Pixabay API
 */

import { getGeminiApiKey, createGeminiClient } from "@/lib/gemini-wrapper";

export type SourcedImage = { url: string; alt: string; credit: string } | null;

/**
 * Generate an image using AI (Google Imagen 3 or Pollinations AI).
 */
async function generateAIImage(query: string): Promise<SourcedImage> {
  const cleanQuery = query.trim().replace(/\s+/g, " ");
  if (!cleanQuery) return null;

  const prompt = cleanQuery.toLowerCase().includes("fitness") || cleanQuery.toLowerCase().includes("gym")
    ? `${cleanQuery}, realistic photography, no text overlay, professional lighting`
    : `Premium fitness blog cover image: ${cleanQuery}, realistic gym or healthy nutrition context, no text overlay, professional lighting`;

  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);

  // 1. Primary: Pollinations AI (Instant, ultra-lightweight CDN URL string, 0ms DB bloat)
  try {
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true&seed=${seed}&model=flux`;
    const res = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      return {
        url: pollinationsUrl,
        alt: query,
        credit: "AI Generated (Pollinations AI)",
      };
    }
  } catch (pErr: any) {
    console.warn("[blog-images] Pollinations notice, trying Imagen 3 fallback:", pErr?.message || pErr);
  }

  // 2. Secondary: Google Imagen 3 via Gemini SDK
  try {
    const apiKey = getGeminiApiKey();
    if (apiKey) {
      const ai = createGeminiClient(apiKey);
      if (ai) {
        const response = await ai.models.generateImages({
          model: "imagen-3.0-generate-002",
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/png",
            aspectRatio: "16:9",
          },
        });

        const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64Image) {
          return {
            url: `data:image/png;base64,${base64Image}`,
            alt: query,
            credit: "AI Generated (Google Imagen 3)",
          };
        }
      }
    }
  } catch (err: any) {
    console.warn("[blog-images] Imagen 3 notice:", err?.message || err);
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

  const sources = [
    () => generateAIImage(query),
    () => searchUnsplash(query),
    () => searchPexels(query),
    () => searchPixabay(query),
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
