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
  const lastModified = new Date();

  const urls: SitemapUrl[] = [
    // Homepage pair — highest priority
    { loc: base, changefreq: "weekly", priority: 1.0, alternates: { en: base, ar: `${base}/ar` } },
    { loc: `${base}/ar`, changefreq: "weekly", priority: 1.0, alternates: { en: base, ar: `${base}/ar` } },
    // Main platform sections
    { loc: `${base}/exercises`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/exercises`, ar: `${base}/ar/exercises` } },
    { loc: `${base}/ar/exercises`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/exercises`, ar: `${base}/ar/exercises` } },
    { loc: `${base}/foods`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/foods`, ar: `${base}/ar/foods` } },
    { loc: `${base}/ar/foods`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/foods`, ar: `${base}/ar/foods` } },
    { loc: `${base}/programs`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/programs`, ar: `${base}/ar/programs` } },
    { loc: `${base}/ar/programs`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/programs`, ar: `${base}/ar/programs` } },
    { loc: `${base}/tools`, lastModified, changefreq: "weekly", priority: 0.9 },
    { loc: `${base}/evo`, lastModified, changefreq: "monthly", priority: 0.9 },
    { loc: `${base}/blog`, lastModified, changefreq: "weekly", priority: 0.8, alternates: { en: `${base}/blog`, ar: `${base}/ar/blog` } },
    { loc: `${base}/ar/blog`, lastModified, changefreq: "weekly", priority: 0.8, alternates: { en: `${base}/blog`, ar: `${base}/ar/blog` } },
    { loc: `${base}/coaching`, lastModified, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/affiliate`, lastModified, changefreq: "monthly", priority: 0.7 },
    { loc: `${base}/memberships`, lastModified, changefreq: "monthly", priority: 0.9, alternates: { en: `${base}/memberships`, ar: `${base}/ar/memberships` } },
    { loc: `${base}/ar/memberships`, lastModified, changefreq: "monthly", priority: 0.9, alternates: { en: `${base}/memberships`, ar: `${base}/ar/memberships` } },
    // Coach recruitment funnel
    { loc: `${base}/for-coaches`, lastModified, changefreq: "weekly", priority: 0.9, alternates: { en: `${base}/for-coaches`, ar: `${base}/ar/for-coaches` } },
    { loc: `${base}/ar/for-coaches`, lastModified, changefreq: "monthly", priority: 0.8, alternates: { en: `${base}/for-coaches`, ar: `${base}/ar/for-coaches` } },
    { loc: `${base}/for-coaches/register`, lastModified, changefreq: "monthly", priority: 0.75, alternates: { en: `${base}/for-coaches/register`, ar: `${base}/ar/for-coaches/register` } },
    { loc: `${base}/ar/for-coaches/register`, lastModified, changefreq: "monthly", priority: 0.7, alternates: { en: `${base}/for-coaches/register`, ar: `${base}/ar/for-coaches/register` } },
    // Tool detail pages
    { loc: `${base}/tools/calorie-calculator`, lastModified, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/bmi-calculator`, lastModified, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/macro-calculator`, lastModified, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/body-fat-calculator`, lastModified, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/tools/water-tracker`, lastModified, changefreq: "monthly", priority: 0.8 },
    { loc: `${base}/meal-planner`, lastModified, changefreq: "monthly", priority: 0.8 },
    // About / FAQ pairs
    { loc: `${base}/about`, lastModified, changefreq: "monthly", priority: 0.6, alternates: { en: `${base}/about`, ar: `${base}/ar/about` } },
    { loc: `${base}/ar/about`, lastModified, changefreq: "monthly", priority: 0.6, alternates: { en: `${base}/about`, ar: `${base}/ar/about` } },
    { loc: `${base}/faq`, lastModified, changefreq: "monthly", priority: 0.7, alternates: { en: `${base}/faq`, ar: `${base}/ar/faq` } },
    { loc: `${base}/ar/faq`, lastModified, changefreq: "monthly", priority: 0.7, alternates: { en: `${base}/faq`, ar: `${base}/ar/faq` } },
    { loc: `${base}/contact`, lastModified, changefreq: "yearly", priority: 0.5 },
    { loc: `${base}/privacy`, lastModified, changefreq: "yearly", priority: 0.3 },
    { loc: `${base}/terms`, lastModified, changefreq: "yearly", priority: 0.3 },
  ];

  // Program detail pages (+ AR mirrors) — small curated set
  for (const prog of WORKOUT_PROGRAMS) {
    urls.push({
      loc: `${base}/programs/${prog.slug}`,
      lastModified,
      changefreq: "monthly",
      priority: 0.6,
      alternates: {
        en: `${base}/programs/${prog.slug}`,
        ar: `${base}/ar/programs/${prog.slug}`,
      },
    });
    urls.push({
      loc: `${base}/ar/programs/${prog.slug}`,
      lastModified,
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
