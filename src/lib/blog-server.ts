import { createClient } from "@supabase/supabase-js";

/**
 * Server-side blog helpers — for route handlers and server components.
 * (The sibling `blog.ts` is "use client" and uses the browser Supabase
 * client; this file uses a fresh server client and never touches the browser.)
 */

export const BLOG_CATEGORIES = [
  { id: "nutrition", en: "Nutrition", ar: "تغذية" },
  { id: "workout", en: "Workout", ar: "تمارين" },
  { id: "supplements", en: "Supplements", ar: "مكملات" },
  { id: "weight-loss", en: "Weight Loss", ar: "خسارة وزن" },
  { id: "muscle-gain", en: "Muscle Gain", ar: "بناء عضلات" },
  { id: "health", en: "Health", ar: "صحة" },
  { id: "recipes", en: "Recipes", ar: "وصفات" },
  { id: "science", en: "Science", ar: "علم" },
] as const;

export const VALID_CATEGORY_IDS = new Set<string>(BLOG_CATEGORIES.map((c) => c.id));

/**
 * Normalize a category id to a valid one. Server-safe (no "use client").
 */
export function normalizeCategory(categoryId: string | undefined | null): typeof BLOG_CATEGORIES[number]["id"] {
  if (!categoryId) return "nutrition";
  const id = categoryId.trim().toLowerCase();
  if (VALID_CATEGORY_IDS.has(id)) return id as typeof BLOG_CATEGORIES[number]["id"];
  const SYNONYMS: Record<string, typeof BLOG_CATEGORIES[number]["id"]> = {
    training: "workout",
    exercise: "workout",
    fitness: "workout",
    diet: "nutrition",
    food: "nutrition",
    supplement: "supplements",
    "weight loss": "weight-loss",
    fatloss: "weight-loss",
    "muscle building": "muscle-gain",
    bodybuilding: "muscle-gain",
    recipe: "recipes",
    cooking: "recipes",
    wellness: "health",
    medical: "science",
    research: "science",
  };
  return (SYNONYMS[id] as (typeof BLOG_CATEGORIES[number]["id"]) | undefined) || "nutrition";
}

export type BlogOGData = {
  title: string;
  description: string;
  image: string;
  articleUrl: string;
  locale: "en_US" | "ar_EG";
  publishedAt?: string | null;
};

/**
 * Fetch a published blog post's OG-relevant fields by slug + language.
 * Returns null when Supabase isn't configured, the post doesn't exist,
 * or the request fails — callers fall back to defaults.
 *
 * Used by:
 *   - /api/og/[slug] (OG meta HTML for crawlers)
 *   - app/blog/[slug]/page.tsx and app/ar/blog/[slug]/page.tsx (generateMetadata)
 *
 * Centralizing this here so the three previous copies of the same REST
 * query don't drift apart.
 */
export async function fetchBlogForOG(
  slug: string,
  lang: "en" | "ar",
): Promise<BlogOGData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("blog_posts")
      .select(
        "title, meta_title, meta_description, excerpt, featured_image, cover_alt, slug",
      )
      .eq("slug", slug)
      .eq("language", lang)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;

    const baseUrl = "https://musclehubeg.vercel.app";
    const articleUrl = `${baseUrl}${lang === "ar" ? "/ar/blog" : "/blog"}/${data.slug}`;
    return {
      title: data.meta_title || data.title,
      description: data.meta_description || data.excerpt || "",
      image: data.featured_image || `${baseUrl}/logo.png`,
      articleUrl,
      locale: lang === "ar" ? "ar_EG" : "en_US",
    };
  } catch {
    return null;
  }
}

/**
 * M28 fix: fetch a published blog post's FULL content server-side.
 *
 * Previously BlogArticlePage was a "use client" component that fetched
 * the post via getBlogPost() in a useEffect — Googlebot saw an empty
 * <div> where the article body should be. This function fetches the
 * full post server-side so the article HTML is in the initial response.
 *
 * Returns null when Supabase isn't configured, the post doesn't exist,
 * or the request fails.
 */
export async function fetchBlogPostFull(
  slug: string,
  lang: "en" | "ar",
): Promise<any | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("language", lang)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;
    return data as BlogPostFull;
  } catch {
    return null;
  }
}

export type BlogPostFull = {
  id: string;
  slug: string;
  language: "en" | "ar";
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  cover_alt: string | null;
  reading_time: number | null;
  category: string | null;
  keywords: string[] | null;
  faq_json: any | null;
  is_published: boolean;
  author: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  linked_post_id: string | null;
};
