import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { EXERCISES } from "@/lib/exercises";
import { WORKOUT_PROGRAMS } from "@/lib/workout-programs";
import { FOODS } from "@/lib/foods";

// Revalidate every hour instead of force-dynamic (which regenerated on every
// request). The sitemap queries Supabase for all published posts — caching it
// cuts the per-request cost dramatically and is fine for SEO since blog
// posts don't change more than hourly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://musclehubeg.vercel.app";
  const lastModified = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    // Homepage pair — highest priority. Homepage AR mirror fix
    // (2026-08-30): /ar used to redirect to / so it was excluded here;
    // now it is a real page and is declared WITH hreflang alternates so
    // Google indexes both language versions correctly.
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: { en: baseUrl, ar: `${baseUrl}/ar` },
      },
    },
    {
      url: `${baseUrl}/ar`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: { en: baseUrl, ar: `${baseUrl}/ar` },
      },
    },
    // Main platform sections (high priority — core content).
    // Homepage AR mirror follow-up (2026-08-30): the 4 static mirror
    // pairs now appear WITH hreflang alternates, and their /ar twins are
    // listed too (/ar/coaches/[slug] + detail pages: follow-up, needs a
    // DB roster query first).
    {
      url: `${baseUrl}/exercises`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/exercises`, ar: `${baseUrl}/ar/exercises` },
      },
    },
    {
      url: `${baseUrl}/ar/exercises`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/exercises`, ar: `${baseUrl}/ar/exercises` },
      },
    },
    {
      url: `${baseUrl}/foods`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/foods`, ar: `${baseUrl}/ar/foods` },
      },
    },
    {
      url: `${baseUrl}/ar/foods`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/foods`, ar: `${baseUrl}/ar/foods` },
      },
    },
    { url: `${baseUrl}/programs`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/tools`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/evo`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    {
      url: `${baseUrl}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { en: `${baseUrl}/blog`, ar: `${baseUrl}/ar/blog` },
      },
    },
    {
      url: `${baseUrl}/ar/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { en: `${baseUrl}/blog`, ar: `${baseUrl}/ar/blog` },
      },
    },
    // Coaching (secondary feature — one section of the platform)
    { url: `${baseUrl}/coaching`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${baseUrl}/memberships`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/memberships`, ar: `${baseUrl}/ar/memberships` },
      },
    },
    {
      url: `${baseUrl}/ar/memberships`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/memberships`, ar: `${baseUrl}/ar/memberships` },
      },
    },
    // FOR-COACHES — coach recruitment funnel (2026-08-29): bilingual
    // landing + instant self-registration page.
    { url: `${baseUrl}/for-coaches`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/for-coaches/register`, lastModified, changeFrequency: "monthly", priority: 0.75 },
    // Tool detail pages
    { url: `${baseUrl}/tools/calorie-calculator`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools/bmi-calculator`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools/macro-calculator`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools/body-fat-calculator`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/tools/water-tracker`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/meal-planner`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    // Other pages
    // AR EXPANSION (2026-08-30): /about and /faq now have real Arabic
    // twins (/ar/about, /ar/faq) — declared with hreflang alternates
    // on both sides.
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: { en: `${baseUrl}/about`, ar: `${baseUrl}/ar/about` },
      },
    },
    {
      url: `${baseUrl}/ar/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: { en: `${baseUrl}/about`, ar: `${baseUrl}/ar/about` },
      },
    },
    {
      url: `${baseUrl}/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: { en: `${baseUrl}/faq`, ar: `${baseUrl}/ar/faq` },
      },
    },
    {
      url: `${baseUrl}/ar/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: { en: `${baseUrl}/faq`, ar: `${baseUrl}/ar/faq` },
      },
    },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Add all exercise detail pages
  for (const ex of EXERCISES) {
    staticUrls.push({
      url: `${baseUrl}/exercises/${ex.slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // Add all program detail pages
  for (const prog of WORKOUT_PROGRAMS) {
    staticUrls.push({
      url: `${baseUrl}/programs/${prog.slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // Add all food detail pages
  for (const food of FOODS) {
    staticUrls.push({
      url: `${baseUrl}/foods/${food.slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

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
