import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://musclehubeg.vercel.app";
  const lastModified = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/ar/blog`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "yearly", priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Fetch all published blog posts and add their URLs
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
          const url = `${baseUrl}${post.language === "ar" ? "/ar/blog" : "/blog"}/${post.slug}`;
          const postDate = post.published_at ? new Date(post.published_at) : lastModified;
          staticUrls.push({
            url,
            lastModified: postDate,
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }
    } catch {}
  }

  return staticUrls;
}
