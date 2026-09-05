import { listPublishedPostsForFeed, type BlogFeedItem } from "@/lib/blog-server";

/**
 * src/lib/rss.ts — shared RSS 2.0 builder (Phase 86, owner SEO/GEO push
 * «الى اقوى درجة انتشار سريع عالمى اورجاني»).
 *
 * WHY RSS: feeds remain a first-class distribution channel — news
 * aggregators, reader apps, IFTTT/Zapier automations, and several AI
 * search engines discover fresh articles faster through feeds than
 * through sitemaps alone. One feed per language keeps <language> valid
 * and lets Arabic readers subscribe to Arabic-only updates.
 *
 * SAFE BY DEFAULT: listPublishedPostsForFeed() returns [] when Supabase
 * env is not configured (local dev) — the feed degrades to an empty
 * channel instead of failing the route.
 *
 * CACHED: revalidate = 3600 on the route segments (blog posts change at
 * most a few times per day — 6/day pipeline).
 */

export const RSS_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://alkemos.com";

/** Max items per feed — keep payloads light for crawlers. */
const MAX_ITEMS = 50;

/** XML 1.0 text-node/attribute escaper. */
function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function item(post: BlogFeedItem, baseUrl: string): string {
  const link = `${baseUrl}/blog/${post.slug}`;
  const pub = post.published_at || post.updated_at;
  const description = post.excerpt || post.meta_description || post.title;
  return `    <item>
      <title>${esc(post.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <description>${esc(description)}</description>
      <category>${esc(post.category)}</category>
      ${post.featured_image ? `<enclosure url="${esc(post.featured_image)}" type="image/jpeg" />` : ""}
      <pubDate>${new Date(pub).toUTCString()}</pubDate>
    </item>`;
}

export type RssChannel = {
  title: string;
  link: string;
  description: string;
  language: "en" | "ar";
  /** Feed self URL, e.g. https://…/rss.xml */
  selfUrl: string;
  lang: "en" | "ar";
};

export async function buildRss(channel: RssChannel): Promise<string> {
  const posts = await listPublishedPostsForFeed(channel.lang, MAX_ITEMS);
  const items = posts.map((p) => item(p, RSS_SITE_URL)).join("\n");
  const lastBuild = posts[0]
    ? new Date(posts[0].published_at || posts[0].updated_at).toUTCString()
    : new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(channel.title)}</title>
    <link>${esc(channel.link)}</link>
    <description>${esc(channel.description)}</description>
    <language>${channel.language}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${esc(channel.selfUrl)}" rel="self" type="application/rss+xml" />
    <generator>Alkemos (Next.js)</generator>
${items}
  </channel>
</rss>`;
}
