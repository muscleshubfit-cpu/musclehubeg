/**
 * Shared XML helpers for the split sitemap files (audit C2, 2026-09-05).
 *
 * The old single /sitemap.xml was ~9.3MB with 19,498 URLs (90% food
 * pages) — Google's crawl budget drowned the blog/landing URLs that
 * actually earn traffic. The sitemap is now a Sitemap INDEX:
 *
 *   /sitemap.xml             → index (points at the 4 children)
 *   /sitemap-pages.xml       → static pages + tools + programs (~60 URLs)
 *   /sitemap-exercises.xml   → 868 exercises × EN+AR (1,736 URLs)
 *   /sitemap-foods.xml       → 8,830 foods × EN+AR (17,660 URLs)
 *   /sitemap-blog.xml        → published posts (live Supabase query)
 *
 * Each child carries its own realistic <priority> bands and is ISR
 * cached for an hour — identical data, fraction of the crawl cost.
 */

export const SITEMAP_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type SitemapUrl = {
  loc: string;
  /** <lastmod> date (W3C date, day precision). */
  lastModified?: Date;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  /** hreflang alternates (xhtml:link rel="alternate"). */
  alternates?: Record<string, string>;
};

function toW3CDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Serializes a urlset (Google sitemap protocol 0.9 + xhtml:link). */
export function buildUrlSet(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const parts = [`<loc>${xmlEscape(u.loc)}</loc>`];
      if (u.lastModified) parts.push(`<lastmod>${toW3CDate(u.lastModified)}</lastmod>`);
      if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
      if (typeof u.priority === "number") {
        parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
      }
      if (u.alternates) {
        for (const [lang, href] of Object.entries(u.alternates)) {
          parts.push(
            `<xhtml:link rel="alternate" hreflang="${xmlEscape(lang)}" href="${xmlEscape(href)}" />`,
          );
        }
      }
      return `  <url>\n    ${parts.join("\n    ")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>`;
}

/** Serializes a sitemap index file. */
export function buildSitemapIndex(children: string[]): string {
  const body = children
    .map(
      (loc) =>
        `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": SITEMAP_CACHE_CONTROL,
    },
  });
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://alkemos.com"
  );
}
