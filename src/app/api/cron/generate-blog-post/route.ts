import { NextRequest, NextResponse } from "next/server";
import { pickSmartTopic } from "@/lib/blog-topics";
import { generateArticleBundle } from "@/lib/blog-generate";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Automated blog pipeline — GET /api/cron/generate-blog-post
 *
 * 1. Picks a fresh, on-niche, search-worthy topic (avoids repeating recent posts).
 * 2. Generates a full EN + AR article bundle (SEO/GEO/AEO-optimized).
 * 3. Publishes both language versions immediately, linked to each other.
 *
 * Runs on a schedule via an external free scheduler (see
 * .github/workflows/generate-blog-post.yml) — Vercel's Hobby plan only
 * allows once-a-day cron, and this needs to run every 2 hours, so a GitHub
 * Actions schedule calls this route instead of Vercel's built-in cron.
 *
 * AI-provider resilience is already built in: generateArticleBundle() uses
 * callAIWithFallback(), which automatically tries every configured provider
 * (Gemini → OpenRouter → Groq → ...) in order until one succeeds.
 */
export const maxDuration = 300;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uniqueSlug(base: string, language: "en" | "ar"): Promise<string> {
  if (!supabaseAdmin) return base;
  let slug = base || `post-${Date.now()}`;
  let attempt = 0;
  while (attempt < 5) {
    const { data } = await supabaseAdmin
      .from("blog_posts" as any)
      .select("id")
      .eq("slug", slug)
      .eq("language", language)
      .maybeSingle();
    if (!data) return slug;
    attempt += 1;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  // --- Auth: only the scheduler (with the shared secret) may trigger this. ---
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured on the server." }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin client not configured." }, { status: 500 });
  }

  try {
    // 1. Smart topic research
    const pick = await pickSmartTopic();

    // 2. Generate the full bilingual article bundle
    const bundle = await generateArticleBundle({
      topic: pick.topic,
      focusKeyword: pick.focusKeyword,
      category: pick.category,
    });

    const now = new Date().toISOString();
    const enSlug = await uniqueSlug(slugify(bundle.seo.en.slug || pick.focusKeyword), "en");
    const arSlug = await uniqueSlug(slugify(bundle.seo.ar.slug || bundle.seo.en.slug || pick.focusKeyword), "ar");

    const commonPost = {
      focus_keyword: bundle.seo.focusKeyword,
      keywords: bundle.seo.secondaryKeywords,
      category: pick.category,
      tags: bundle.seo.secondaryKeywords.slice(0, 5),
      reading_time: bundle.estimatedReadingTime,
      author: "Ahmed Zake",
      published_at: now,
      is_published: true,
      faq_json: bundle.faq,
    };

    // 3. Insert EN, then AR linked back to EN, then link EN -> AR too.
    const { data: enPost, error: enErr } = await supabaseAdmin
      .from("blog_posts" as any)
      .insert({
        ...commonPost,
        language: "en",
        title: bundle.seo.en.seoTitle,
        slug: enSlug,
        content: bundle.englishArticle,
        excerpt: bundle.seo.en.metaDescription,
        meta_title: bundle.seo.en.metaTitle,
        meta_description: bundle.seo.en.metaDescription,
        schema_json: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: bundle.seo.en.seoTitle,
          description: bundle.seo.en.metaDescription,
          author: { "@type": "Person", name: "Ahmed Zake" },
          datePublished: now,
          inLanguage: "en",
        },
      })
      .select()
      .single() as any;
    if (enErr) throw new Error(`EN insert failed: ${enErr.message}`);

    const { data: arPost, error: arErr } = await supabaseAdmin
      .from("blog_posts" as any)
      .insert({
        ...commonPost,
        language: "ar",
        title: bundle.seo.ar.seoTitle,
        slug: arSlug,
        content: bundle.arabicArticle,
        excerpt: bundle.seo.ar.metaDescription,
        meta_title: bundle.seo.ar.metaTitle,
        meta_description: bundle.seo.ar.metaDescription,
        schema_json: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: bundle.seo.ar.seoTitle,
          description: bundle.seo.ar.metaDescription,
          author: { "@type": "Person", name: "Ahmed Zake" },
          datePublished: now,
          inLanguage: "ar",
        },
        linked_post_id: enPost.id,
      })
      .select()
      .single() as any;
    if (arErr) throw new Error(`AR insert failed: ${arErr.message}`);

    await supabaseAdmin.from("blog_posts" as any).update({ linked_post_id: arPost.id }).eq("id", enPost.id);

    return NextResponse.json({
      ok: true,
      topic: pick.topic,
      focusKeyword: pick.focusKeyword,
      category: pick.category,
      rationale: pick.rationale,
      aiProvider: bundle.source,
      posts: {
        en: { id: enPost.id, slug: enSlug, url: `/blog/${enSlug}` },
        ar: { id: arPost.id, slug: arSlug, url: `/ar/blog/${arSlug}` },
      },
    });
  } catch (e: any) {
    console.error("[cron/generate-blog-post] Failed:", e);
    return NextResponse.json({ ok: false, error: e.message || "Unknown error" }, { status: 500 });
  }
}
