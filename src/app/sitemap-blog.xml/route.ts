import { createClient } from "@supabase/supabase-js";
import { buildUrlSet, xmlResponse, siteUrl, type SitemapUrl } from "@/lib/sitemap-xml";

/**
 * GET /sitemap-blog.xml — published blog posts (EN + AR).
 *
 * The traffic-earning content gets its own sitemap (audit C2) so a
 * full blog recrawl never competes with 17K food pages. Live
 * Supabase query, ISR-cached for an hour (same freshness as before).
 */

export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const fallbackDate = new Date();
  const urls: SitemapUrl[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug, language, published_at")
        .eq("is_published", true);

      if (posts) {
        for (const post of posts) {
          const postDate = post.published_at
            ? new Date(post.published_at)
            : fallbackDate;
          urls.push({
            loc: `${base}${post.language === "ar" ? "/ar/blog" : "/blog"}/${post.slug}`,
            lastModified: postDate,
            changefreq: "monthly",
            priority: 0.7,
          });
        }
      }
    } catch {
      // Supabase unreachable → empty blog sitemap (never a 500 to crawlers)
    }
  }

  return xmlResponse(buildUrlSet(urls));
}
