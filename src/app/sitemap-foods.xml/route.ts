import { buildUrlSet, xmlResponse, siteUrl, type SitemapUrl } from "@/lib/sitemap-xml";
import { FOODS } from "@/lib/foods";

/**
 * GET /sitemap-foods.xml — 8,830 foods × EN+AR mirrors (17,660 URLs).
 *
 * The long tail — isolated in its own file (audit C2, 2026-09-05) so
 * it never drowns the high-priority pages or the blog in Google's
 * crawl budget. Priority band 0.4 (thin pages; category hubs carry
 * the section weight). Revisit with Search Console data: if these
 * pages don't earn impressions, trim to the popular subset.
 */

export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();

  const urls: SitemapUrl[] = [];
  for (const food of FOODS) {
    urls.push({
      loc: `${base}/foods/${food.slug}`,
      changefreq: "monthly",
      priority: 0.4,
      alternates: {
        en: `${base}/foods/${food.slug}`,
        ar: `${base}/ar/foods/${food.slug}`,
      },
    });
    urls.push({
      loc: `${base}/ar/foods/${food.slug}`,
      changefreq: "monthly",
      priority: 0.4,
      alternates: {
        en: `${base}/foods/${food.slug}`,
        ar: `${base}/ar/foods/${food.slug}`,
      },
    });
  }

  return xmlResponse(buildUrlSet(urls));
}
