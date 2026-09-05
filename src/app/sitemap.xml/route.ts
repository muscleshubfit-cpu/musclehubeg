import { buildSitemapIndex, xmlResponse, siteUrl } from "@/lib/sitemap-xml";

/**
 * GET /sitemap.xml — Sitemap INDEX (audit C2, 2026-09-05).
 *
 * Replaces the old 9.3MB / 19,498-URL monolith with an index pointing
 * at four topic-specific children (pages / exercises / foods / blog).
 * robots.txt already points here — nothing external changes.
 */

export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  return xmlResponse(
    buildSitemapIndex([
      `${base}/sitemap-pages.xml`,
      `${base}/sitemap-exercises.xml`,
      `${base}/sitemap-foods.xml`,
      `${base}/sitemap-blog.xml`,
    ]),
  );
}
