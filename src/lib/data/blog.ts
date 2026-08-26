"use client";

import {
 supabase,
 isSupabaseConfigured,
} from "./helpers";

// ---------------------------------------------------------------------------
// Blog posts (SEO articles)
// ---------------------------------------------------------------------------

export async function listBlogPosts() {
 if (isSupabaseConfigured && supabase) {
  try {
   const { data } = await supabase
   .from("blog_posts")
   .select("*")
   .eq("is_published", true)
   .order("published_at", { ascending: false });
   return data ?? [];
  } catch {
   return [];
  }
 }
 return [];
}

export async function getBlogPost(slug: string) {
 if (isSupabaseConfigured && supabase) {
  try {
   const { data } = await supabase
   .from("blog_posts")
   .select("*")
   .eq("slug", slug)
   .eq("is_published", true)
   .maybeSingle();
   return data;
  } catch {
   return null;
  }
 }
 return null;
}
