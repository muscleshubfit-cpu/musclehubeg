import { buildRss, RSS_SITE_URL } from "@/lib/rss";

/**
 * GET /rss.xml — English blog feed (RSS 2.0).
 * Phase 86 (owner SEO/GEO push): organic distribution channel for the
 * 6-articles/day pipeline. Cached hourly; safe when the DB is not
 * configured (returns an empty channel).
 */
export const revalidate = 3600;
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const xml = await buildRss({
    title: "Alkemos Blog — Fitness & Nutrition",
    link: `${RSS_SITE_URL}/blog`,
    description:
      "Evidence-based training and nutrition articles from the Alkemos team: workout plans, fat loss, muscle building, and healthy eating.",
    language: "en",
    selfUrl: `${RSS_SITE_URL}/rss.xml`,
    lang: "en",
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
