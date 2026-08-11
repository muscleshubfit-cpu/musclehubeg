/**
 * Free stock-photo sourcing for auto-generated blog posts via the Unsplash API.
 *
 * Why Unsplash and not an AI image generator: every real AI image API
 * (DALL-E, Stability, Ideogram...) costs money per image. Unsplash's
 * search API is genuinely free (50 requests/hour on the default tier —
 * plenty for a post every 2 hours) and returns real, high-quality,
 * properly licensed photos.
 *
 * Get a free key: https://unsplash.com/developers -> "New Application"
 * -> copy the "Access Key" -> set as UNSPLASH_ACCESS_KEY.
 */

export type SourcedImage = { url: string; alt: string; credit: string } | null;

export async function fetchFeaturedImage(query: string): Promise<SourcedImage> {
 const key = process.env.UNSPLASH_ACCESS_KEY;
 if (!key || !query.trim()) return null;

 try {
 const res = await fetch(
 `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
 { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(15_000) },
 );
 if (!res.ok) return null;
 const data = await res.json();
 const photo = data?.results?.[0];
 if (!photo) return null;

 return {
 url: `${photo.urls.regular}`,
 alt: photo.alt_description || query,
 credit: photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : "Unsplash",
 };
 } catch {
 return null; // never let a missing/failed image break the whole pipeline
 }
}
