import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";
import { generateArticleBundle } from "@/lib/blog-generate";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { normalizeCategory } from "@/lib/blog";

// 300s (5 min) — article generation + image fetch can exceed 60s on free models.
// Vercel's hobby plan caps at 60s; pro/enterprise allows up to 300s/900s.
export const maxDuration = 300;

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

/**
 * Check whether an article with the same title (case-insensitive, trimmed)
 * already exists in the given language. Prevents the AI from publishing
 * a near-duplicate of an existing post when the topic picker's "don't
 * repeat" instruction didn't take.
 */
async function titleAlreadyExists(title: string, language: "en" | "ar"): Promise<boolean> {
 if (!supabaseAdmin) return false;
 const normalized = title.trim().toLowerCase();
 if (!normalized) return false;
 // Supabase REST filters are case-sensitive by default; use ilike for
 // case-insensitive match. We also trim in the query in case the DB has
 // surrounding whitespace.
 const { data } = await supabaseAdmin
 .from("blog_posts" as any)
 .select("id")
 .eq("language", language)
 .ilike("title", normalized)
 .limit(1);
 return Array.isArray(data) && data.length > 0;
}

export async function GET(request: NextRequest) {
 const auth = request.headers.get("authorization");
 const expected = process.env.CRON_SECRET;
 if (!expected || auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 if (!isSupabaseAdminConfigured || !supabaseAdmin) return NextResponse.json({ error: "Supabase admin not configured." }, { status: 500 });

 try {
 // 1. Pick BOTH topics — EN for English article, AR for Arabic article
 const [enPick, arPick] = await Promise.all([
   pickSmartTopic(undefined, "en"),
   pickSmartTopic(undefined, "ar"),
 ]);

 // Normalize the category defensively
 const safeCategory = normalizeCategory(enPick.category);

 // 2. Generate article — pass BOTH topics + no language (generate both)
 const bundle = await generateArticleBundle({
   topic: enPick.topic,
   focusKeyword: enPick.focusKeyword,
   category: safeCategory,
 });

 // Override Arabic article with AR topic (generateArticleBundle uses EN topic
 // for both by default — we need to regenerate AR with the AR topic)
 // Actually, generateArticleBundle already calls generateArabicArticle with
 // input.topic — which is the EN topic. We need to call AR separately.
 // But generateArticleBundle with no language generates both EN + AR from the
 // same input.topic. To keep the legacy route simple, let's just use the
 // multi-step pipeline instead. This legacy route is deprecated.
 // For now: generate AR article separately with AR topic.
 let arBundle: any = null;
 try {
   const { generateArabicArticle } = await import("@/lib/blog-generate");
   arBundle = await generateArabicArticle(
     { topic: arPick.topic, focusKeyword: arPick.focusKeyword, category: safeCategory },
     null,
     null,
   );
 } catch (arErr: any) {
   console.warn("[cron/generate-blog-post] AR generation failed, using EN bundle's AR:", arErr?.message);
 }

 // Use AR bundle if available, otherwise fall back to EN bundle's AR
 const finalArabicArticle = arBundle?.arabicArticle || bundle.arabicArticle;
 const finalArSeo = arBundle?.seo || bundle.seo;
 const finalFaqAr = arBundle?.faqAr || bundle.faqAr;
 const finalImagePromptsAr = arBundle?.imagePromptsAr || bundle.imagePromptsAr;
 const finalSocialPostsAr = arBundle?.socialPostsAr || bundle.socialPostsAr;
 const finalReadingTimeAr = arBundle?.estimatedReadingTimeAr || bundle.estimatedReadingTimeAr;

 // Reject duplicate titles
 if (await titleAlreadyExists(bundle.seo.en.seoTitle, "en")) {
   return NextResponse.json(
     { skipped: true, reason: "duplicate-en-title", title: bundle.seo.en.seoTitle },
     { status: 200 },
   );
 }
 if (await titleAlreadyExists(finalArSeo?.ar?.seoTitle || "", "ar")) {
   return NextResponse.json(
     { skipped: true, reason: "duplicate-ar-title", title: finalArSeo?.ar?.seoTitle },
     { status: 200 },
   );
 }

 const now = new Date().toISOString();
 const enSlug = await uniqueSlug(slugify(bundle.seo.en.slug || enPick.focusKeyword), "en");
 const arSlug = await uniqueSlug(slugify(finalArSeo?.ar?.slug || `${bundle.seo.en.slug}-ar` || enPick.focusKeyword), "ar");

 // 3. Fetch image
 let imageUrl: string | null = null;
 try {
 const img = await fetchFeaturedImage(bundle.seo.focusKeyword || enPick.focusKeyword || enPick.topic);
 imageUrl = img?.url || null;
 } catch {}

 // 4. Publish both languages — EN from EN topic, AR from AR topic
 const enRow = {
   language: "en",
   title: bundle.seo.en.seoTitle,
   slug: enSlug,
   excerpt: bundle.seo.en.metaDescription,
   content: bundle.englishArticle,
   meta_title: bundle.seo.en.metaTitle,
   meta_description: bundle.seo.en.metaDescription,
   focus_keyword: bundle.seo.en.focusKeyword || bundle.seo.focusKeyword || enPick.focusKeyword,
   keywords: bundle.seo.en.secondaryKeywords || bundle.seo.secondaryKeywords || [],
   category: safeCategory,
   tags: (bundle.seo.en.secondaryKeywords || bundle.seo.secondaryKeywords || []).slice(0, 5),
   featured_image: imageUrl,
   cover_alt: bundle.seo.en.seoTitle,
   reading_time: bundle.estimatedReadingTime,
   author: "MuscleHubEG",
   is_published: true,
   published_at: now,
   faq_json: bundle.faq,
 };

 const arFocusKw = finalArSeo?.ar?.focusKeyword || arPick.focusKeyword || "";
 const arKeywords = finalArSeo?.ar?.secondaryKeywords || [];
 const arRow = {
   language: "ar",
   title: finalArSeo?.ar?.seoTitle || arPick.topic,
   slug: arSlug,
   excerpt: finalArSeo?.ar?.metaDescription || "",
   content: finalArabicArticle,
   meta_title: finalArSeo?.ar?.metaTitle || finalArSeo?.ar?.seoTitle || "",
   meta_description: finalArSeo?.ar?.metaDescription || "",
   focus_keyword: arFocusKw,
   keywords: arKeywords,
   category: safeCategory,
   tags: arKeywords.slice(0, 5),
   featured_image: imageUrl,
   cover_alt: finalArSeo?.ar?.seoTitle || arPick.topic,
   reading_time: finalReadingTimeAr || bundle.estimatedReadingTime || 1,
   author: "MuscleHubEG",
   is_published: true,
   published_at: now,
   faq_json: finalFaqAr && finalFaqAr.length > 0 ? finalFaqAr : [],
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
 category: enPick.category,
 topic: enPick.topic,
 en: { title: enRow.title, slug: enSlug },
 ar: { title: arRow.title, slug: arSlug },
 });
 } catch (e: any) {
 console.error("[cron/generate-blog-post] Error:", e?.message || e);
 return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
 }
}
