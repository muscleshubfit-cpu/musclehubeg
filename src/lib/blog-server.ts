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

export const VALID_CATEGORY_IDS = new Set(BLOG_CATEGORIES.map((c) => c.id));

/**
 * Normalize a category id to a valid one. Server-safe (no "use client").
 */
export function normalizeCategory(categoryId: string | undefined | null): string {
  if (!categoryId) return "nutrition";
  const id = categoryId.trim().toLowerCase();
  if (VALID_CATEGORY_IDS.has(id)) return id;
  const SYNONYMS: Record<string, string> = {
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
  return SYNONYMS[id] || "nutrition";
}

export type BlogOGData = {
  title: string;
  description: string;
  image: string;
  articleUrl: string;
  locale: "en_US" | "ar_EG";
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
