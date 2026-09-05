import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { BlogPost, BlogFaq } from "./blog";

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
 *   - /api/og-image/[slug] (OG image for crawlers)
 *   - app/blog/[slug]/page.tsx and app/ar/blog/[slug]/page.tsx (generateMetadata)
 *
 * Centralizing this here so the three previous copies of the same REST
 * query don't drift apart.
 */
// Decision 2 fix: wrap fetchBlogForOG in unstable_cache for 5-min revalidate — aligned with page ISR post IMAGE SAFETY remediation.
// Blog posts change rarely — caching reduces Supabase queries significantly.
const fetchBlogForOGUncached = async (
  slug: string,
  lang: "en" | "ar",
): Promise<BlogOGData | null> => {
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

    const baseUrl = "https://alkemos.com";
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
};

// Cached wrapper — 1 hour revalidate
export const fetchBlogForOG = unstable_cache(
  fetchBlogForOGUncached,
  ["blog-og"],
  { revalidate: 300 },
);

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
const fetchBlogPostFullUncached = async (
  slug: string,
  lang: "en" | "ar",
): Promise<BlogPostFull | null> => {
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
};

// Cached wrapper — 1 hour revalidate (blog posts change rarely)
export const fetchBlogPostFull = unstable_cache(
  fetchBlogPostFullUncached,
  ["blog-full"],
  { revalidate: 300 },
);

// FAQ item moved to blog.ts (client-safe single source of truth — Phase 90)
// and re-exported here for the existing blog-server import surface.
export type { BlogFaq };

/**
 * Full published post row (select("*")). Derived from BlogPost so the
 * client article view (BlogArticlePage) stays assignable — with a typed
 * faq_json (JSONB array of {question, answer}) instead of `any`.
 */
export type BlogPostFull = Omit<BlogPost, "faq_json"> & {
  faq_json: BlogFaq[] | null;
};

// ─────────────────────────────────────────────────────────────────────
// FEED LISTING (Phase 86 — owner SEO/GEO push): server-side published-
// posts list for /rss.xml + /ar/rss.xml + /llms-full.txt. Mirrors the
// fetchBlogForOG* env/client pattern (fresh server client, anon keys,
// null-safe when Supabase env is absent → feeds degrade to empty, never
// throw). Sorted newest-first, capped by the caller.
// ─────────────────────────────────────────────────────────────────────
export type BlogFeedItem = {
  title: string;
  slug: string;
  excerpt: string | null;
  meta_description: string | null;
  category: string;
  featured_image: string | null;
  published_at: string | null;
  updated_at: string;
};

export async function listPublishedPostsForFeed(
  lang: "en" | "ar",
  limit = 50,
): Promise<BlogFeedItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "title, slug, excerpt, meta_description, category, featured_image, published_at, updated_at",
      )
      .eq("is_published", true)
      .eq("language", lang)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as BlogFeedItem[];
  } catch {
    return [];
  }
}

/**
 * Full published posts for the blog LIST page (server-side).
 *
 * SSR fix (H1, performance audit 2026-09-05): /blog used to render an
 * empty shell and fetch posts client-side after hydration — crawlers
 * saw zero articles and LCP waited on a second round trip. The server
 * pages now fetch the full list here and pass it as `initialPosts`.
 */
export async function listPublishedPostsForListPage(
  lang: "en" | "ar",
): Promise<BlogPost[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .eq("language", lang)
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as BlogPost[];
  } catch {
    return [];
  }
}
