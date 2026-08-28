/**
 * THE ONE SLUG MODULE (2026-08-28j — ONE-SLUG-LAW).
 *
 * OWNER DIRECTIVE: «مش مفروض ان التوليد التلقائي وكذلك من لوحة الكوتش
 * موحد؟» — before this module the SAME slug logic lived in FIVE separate
 * copies that had already drifted apart:
 *   1. p5-publish local slugify()          (automated pipeline publish)
 *   2. blog-pipeline inline slugBase clean (outline sanitize, 60-char cap)
 *   3. ai-jobs-client articleSlugFromTitle (title → latin core → dated)
 *   4. ai-job-processors sanitizeModelSlug (model-proposed slug net)
 *   5. blog-admin `post-${Date.now()}`     (raw-timestamp last resort)
 * Every slug in the project MUST now be produced here. A canary test
 * (slug-law.test.ts) fails the build if any local copy reappears.
 *
 * M15 SLUG LAW (unchanged): blog slugs are lowercase-English-and-hyphens
 * ONLY — Arabic breaks URLs/sharing/hreflang. Arabic titles are handled
 * by MEANING (the model produces an English slug) never by
 * transliteration, and the dated post-YYYYMMDDHHmm form survives only as
 * the LAST safety net so an article can never fail to save over a slug.
 */

/** Lowercase-english-and-hyphens law: latin letters/digits/hyphens only,
 * no repeated/leading/trailing hyphens, ≤80 chars, ≥3 meaningful chars
 * → "" when unusable (callers apply their next fallback net). */
export function sanitizeModelSlug(raw: string): string {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
  return s.length >= 3 ? s : "";
}

/** ASCII slugify — exact port of the p5-publish slugify: strip all
 * non-ASCII first (Arabic → ""), then punctuation → hyphens. Returns ""
 * for Arabic-only input BY DESIGN (callers fall back). */
export function slugifyAscii(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Derive the best latin slug from a (often Arabic) AI title: keep the
 * latin core when one exists (mixed titles), else the dated
 * post-YYYYMMDDHHmm LAST net the coach can rename in the editor. */
export function articleSlugFromTitle(title: string): string {
  const latin = slugifyAscii(title);
  if (latin.length >= 3) return latin;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `post-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
}

/** The full resolution chain used wherever a model proposes a slug:
 * model slug (latin law) → title latin core → dated last net. */
export function resolveSlug(modelSlug: string | undefined, title: string): string {
  return sanitizeModelSlug(modelSlug || "") || articleSlugFromTitle(title);
}
