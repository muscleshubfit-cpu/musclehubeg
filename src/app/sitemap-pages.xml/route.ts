import { buildUrlSet, xmlResponse, siteUrl, type SitemapUrl } from "@/lib/sitemap-xml";
import { WORKOUT_PROGRAMS } from "@/lib/workout-programs";

/**
 * GET /sitemap-pages.xml — static pages, tools, and programs.
 * The high-priority, traffic-earning URLs (~60) — kept tiny and
 * crawl-cheap so they are never drowned by the long tail.
 */

export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();

  const urls: SitemapUrl[] = [
    // Homepage pair — highest priority
    { loc: base, changefreq: "weekly", priority: 1.0, alternates: { en: base, ar: `${base}/ar` } },
    { loc: `${base}/ar`, changefreq: "weekly", priority: 1.0, alternates: { en: base, ar: `${base}/ar` } },
    // Main platform sections
    { loc: `${base}/exercises`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/exercises`, ar: `${base}/ar/exercises` } },
    { loc: `${base}/ar/exercises`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/exercises`, ar: `${base}/ar/exercises` } },
    { loc: `${base}/foods`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/foods`, ar: `${base}/ar/foods` } },
    { loc: `${base}/ar/foods`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/foods`, ar: `${base}/ar/foods` } },
    { loc: `${base}/programs`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/programs`, ar: `${base}/ar/programs` } },
    { loc: `${base}/ar/programs`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/programs`, ar: `${base}/ar/programs` } },
    { loc: `${base}/tools`, changefreq: "weekly", priority: 0.9 },
    { loc: `${base}/evo`, changefreq: "monthly", priority: 0.9 },
    { loc: `${base}/blog`, changefreq: "weekly", priority: 0.8, alternates: { en: `${base}/blog`, ar: `${base}/ar/blog` } },
    { loc: `${base}/ar/blog`, changefreq: "weekly", priority: 0.8, alternates: { en: `${base}/blog`, ar: `${base}/ar/blog` } },
    { loc: `${base}/coaching`, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/affiliate`, changefreq: "monthly", priority: 0.7 },
    { loc: `${base}/memberships`, changefreq: "monthly", priority: 0.9, alternates: { en: `${base}/memberships`, ar: `${base}/ar/memberships` } },
    { loc: `${base}/ar/memberships`, changefreq: "monthly", priority: 0.9, alternates: { en: `${base}/memberships`, ar: `${base}/ar/memberships` } },
    // Coach recruitment funnel
    { loc: `${base}/for-coaches`, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/for-coaches`, ar: `${base}/ar/for-coaches` } },
    { loc: `${base}/ar/for-coaches`, changefreq: "monthly", priority: 0.8, alternates: { en: `${base}/for-coaches`, ar: `${base}/ar/for-coaches` } },
    { loc: `${base}/for-coaches/register`, changefreq: "monthly", priority: 0.75, alternates: { en: `${base}/for-coaches/register`, ar: `${base}/ar/for-coaches/register` } },
    { loc: `${base}/ar/for-coaches/register`, changefreq: "monthly", priority: 0.7, alternates: { en: `${base}/for-coaches/register`, ar: `${base}/ar/for-coaches/register` } },
    // Tool detail pages
    { loc: `${base}/tools/calorie-calculator`, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/bmi-calculator`, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/macro-calculator`, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/body-fat-calculator`, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/water-tracker`, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/meal-planner`, changefreq: "monthly", priority: 0.8 },
    // About / FAQ pairs
    { loc: `${base}/about`, changefreq: "monthly", priority: 0.6, alternates: { en: `${base}/about`, ar: `${base}/ar/about` } },
    { loc: `${base}/ar/about`, changefreq: "monthly", priority: 0.6, alternates: { en: `${base}/about`, ar: `${base}/ar/about` } },
    { loc: `${base}/faq`, changefreq: "monthly", priority: 0.7, alternates: { en: `${base}/faq`, ar: `${base}/ar/faq` } },
    { loc: `${base}/ar/faq`, changefreq: "monthly", priority: 0.7, alternates: { en: `${base}/faq`, ar: `${base}/ar/faq` } },
    { loc: `${base}/contact`, changefreq: "yearly", priority: 0.5 },
    { loc: `${base}/privacy`, changefreq: "yearly", priority: 0.3 },
    { loc: `${base}/terms`, changefreq: "yearly", priority: 0.3 },
  ];

  // Program detail pages (+ AR mirrors) — small curated set
  for (const prog of WORKOUT_PROGRAMS) {
    urls.push({
      loc: `${base}/programs/${prog.slug}`,
      changefreq: "monthly",
      priority: 0.6,
      alternates: {
        en: `${base}/programs/${prog.slug}`,
        ar: `${base}/ar/programs/${prog.slug}`,
      },
    });
    urls.push({
      loc: `${base}/ar/programs/${prog.slug}`,
      changefreq: "monthly",
      priority: 0.6,
      alternates: {
        en: `${base}/programs/${prog.slug}`,
        ar: `${base}/ar/programs/${prog.slug}`,
      },
    });
  }

  return xmlResponse(buildUrlSet(urls));
}
