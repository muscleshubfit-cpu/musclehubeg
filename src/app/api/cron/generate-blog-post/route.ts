// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";
import { generateArticleBundle } from "@/lib/blog-generate";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

function slugify(input: string): string {
 return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

async function uniqueSlug(base: string, language: "en" | "ar"): Promise<string> {
 if (!supabaseAdmin) return base;
 let slug = base || `post-${Date.now()}`;
 let attempt = 0;
 while (attempt < 5) {
 const { data } = await supabaseAdmin.from("blog_posts" as any).select("id").eq("slug", slug).eq("language", language).maybeSingle();
 if (!data) return slug;
 attempt += 1;
 slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
 }
 return `${base}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
 const auth = request.headers.get("authorization");
 const expected = process.env.CRON_SECRET;
 if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
 if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 if (!isSupabaseAdminConfigured || !supabaseAdmin) return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

 try {
 // 1. Pick topic (uses OpenRouter via callAIWithFallback)
 const pick = await pickSmartTopic();

 // 2. Generate article (skip research for speed)
 const bundle = await generateArticleBundle({
 topic: pick.topic,
 focusKeyword: pick.focusKeyword,
 category: pick.category,
 });

 const now = new Date().toISOString();
 const enSlug = await uniqueSlug(slugify(bundle.seo.en.slug || pick.focusKeyword), "en");
 const arSlug = await uniqueSlug(slugify(bundle.seo.ar.slug || bundle.seo.en.slug || pick.focusKeyword), "ar");

 // 3. Fetch image (fast — Pexels)
 let imageUrl: string | null = null;
 try {
 const img = await fetchFeaturedImage(bundle.seo.focusKeyword || pick.focusKeyword || pick.topic);
 imageUrl = img?.url || null;
 } catch {}

 // 4. Publish both languages
 const enRow = {
 language: "en",
 title: bundle.seo.en.seoTitle,
 slug: enSlug,
 excerpt: bundle.seo.en.metaDescription,
 content: bundle.englishArticle,
 meta_title: bundle.seo.en.metaTitle,
 meta_description: bundle.seo.en.metaDescription,
 focus_keyword: bundle.seo.focusKeyword,
 keywords: bundle.seo.secondaryKeywords,
 category: pick.category,
 tags: bundle.seo.secondaryKeywords.slice(0, 5),
 featured_image: imageUrl,
 cover_alt: bundle.seo.en.seoTitle,
 reading_time: bundle.estimatedReadingTime,
 author: "Ahmed Zake",
 is_published: true,
 published_at: now,
 faq_json: bundle.faq,

 };

 const arRow = {
 ...enRow,
 language: "ar",
 title: bundle.seo.ar.seoTitle,
 slug: arSlug,
 excerpt: bundle.seo.ar.metaDescription,
 content: bundle.arabicArticle,
 meta_title: bundle.seo.ar.metaTitle,
 meta_description: bundle.seo.ar.metaDescription,
 };

 const { data: enPost, error: enErr } = await supabaseAdmin.from("blog_posts" as any).insert(enRow).select().single() as any;
 if (enErr) throw new Error(`EN insert: ${enErr.message}`);

 const { data: arPost, error: arErr } = await supabaseAdmin.from("blog_posts" as any).insert(arRow).select().single() as any;
 if (arErr) throw new Error(`AR insert: ${arErr.message}`);

 // Link the two posts
 if (enPost && arPost) {
 await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: arPost.id }).eq("id", enPost.id);
 await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: enPost.id }).eq("id", arPost.id);
 }

 return NextResponse.json({
 ok: true,
 category: pick.category,
 topic: pick.topic,
 en: { title: enRow.title, slug: enSlug },
 ar: { title: arRow.title, slug: arSlug },
 });
 } catch (e: any) {
 console.error("[cron/generate-blog-post] Error:", e?.message || e);
 return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
 }
}
