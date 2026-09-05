import { buildUrlSet, xmlResponse, siteUrl, type SitemapUrl } from "@/lib/sitemap-xml";
import { EXERCISES } from "@/lib/exercises";

/**
 * GET /sitemap-exercises.xml — 868 exercises × EN+AR mirrors.
 * Static data — regenerated at most hourly (ISR).
 */

export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const lastModified = new Date();

  const urls: SitemapUrl[] = [];
  for (const ex of EXERCISES) {
    urls.push({
      loc: `${base}/exercises/${ex.slug}`,
      lastModified,
      changefreq: "monthly",
      priority: 0.6,
      alternates: {
        en: `${base}/exercises/${ex.slug}`,
        ar: `${base}/ar/exercises/${ex.slug}`,
      },
    });
    urls.push({
      loc: `${base}/ar/exercises/${ex.slug}`,
      lastModified,
      changefreq: "monthly",
      priority: 0.6,
      alternates: {
        en: `${base}/exercises/${ex.slug}`,
        ar: `${base}/ar/exercises/${ex.slug}`,
      },
    });
  }

  return xmlResponse(buildUrlSet(urls));
}
