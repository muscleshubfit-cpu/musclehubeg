import { NextRequest, NextResponse } from "next/server";
import { generateArticleBundle } from "@/lib/blog-generate";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";

/**
 * AI Article Generator — POST /api/ai/generate-article
 * Manual, admin-triggered generation (used by the Blog Editor's
 * "Generate with AI" button). Automated generation lives in
 * /api/cron/generate-blog-post and shares the same core logic
 * via src/lib/blog-generate.ts.
 *
 * Uses the unified OpenRouter free-model iterator (callFreeOpenRouter)
 * — same as EVO chat, swaps, and plan-generator. No per-admin override;
 * OPENROUTER_API_KEY env var is the only key needed.
 *
 * NOTE: long-form article generation can take 60-120 seconds on free models.
 * We set `maxDuration = 300` (5 min) so Vercel doesn't kill the request.
 */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Coach-only — burns OpenRouter credits.
    if (isAuthConfigured) {
      const auth = await requireCoach(request);
      if (auth instanceof Response) return auth;
    }

    const body = await request.json();
    const { topic, focusKeyword, category, language, research } = body as {
      topic?: string;
      focusKeyword?: string;
      category?: string;
      language?: "en" | "ar";
      research?: any;
    };

    if (!topic && !focusKeyword) {
      return NextResponse.json(
        { error: "Either 'topic' or 'focusKeyword' is required." },
        { status: 400 },
      );
    }

    const bundle = await generateArticleBundle({
      topic: topic?.trim(),
      focusKeyword: focusKeyword?.trim(),
      category: category || "nutrition",
      research,
    });

    const imageQuery = bundle.imagePrompts?.featuredImage || bundle.seo?.focusKeyword || focusKeyword || topic || "";
    const image = await fetchFeaturedImage(imageQuery);

    return NextResponse.json({ ...bundle, image, language: language || "en" });
  } catch (e: any) {
    console.error("[generate-article] Error:", e);
    if (e.message?.includes("not valid JSON")) {
      return NextResponse.json(
        { error: "AI returned a response but it was not valid JSON. Please try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: e.message || "Failed to generate article" }, { status: 500 });
  }
}
