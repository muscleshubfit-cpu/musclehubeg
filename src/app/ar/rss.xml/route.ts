import { buildRss, RSS_SITE_URL } from "@/lib/rss";

/**
 * GET /ar/rss.xml — Arabic blog feed (RSS 2.0).
 * Phase 86 (owner SEO/GEO push): Arabic readers and aggregators get a
 * dedicated Arabic-only channel. Cached hourly; safe when the DB is not
 * configured (returns an empty channel).
 */
export const revalidate = 3600;
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const xml = await buildRss({
    title: "مدونة Alkemos — اللياقة والتغذية",
    link: `${RSS_SITE_URL}/ar/blog`,
    description:
      "مقالات تدريب وتغذية علمية من فريق Alkemos: خطط تمرين، حرق الدهون، بناء العضلات، وأكل صحي.",
    language: "ar",
    selfUrl: `${RSS_SITE_URL}/ar/rss.xml`,
    lang: "ar",
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
