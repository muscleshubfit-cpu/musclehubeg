import { NextRequest, NextResponse } from "next/server";
import { generateArticleBundle } from "@/lib/blog-generate";
import { fetchFeaturedImage } from "@/lib/blog-images";
import { getOverrideFromRequest } from "@/app/api/ai/settings/route";

/**
 * AI Article Generator — POST /api/ai/generate-article
 * Manual, admin-triggered generation (used by the Blog Editor's
 * "Generate with AI" button). Automated generation lives in
 * /api/cron/generate-blog-post and shares the same core logic
 * via src/lib/blog-generate.ts.
 *
 * NOTE: long-form article generation can take 60-120 seconds on free models.
 * We set `maxDuration = 300` (5 min) so Vercel doesn't kill the request.
 */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, focusKeyword, category, language } = body as {
      topic?: string;
      focusKeyword?: string;
      category?: string;
      language?: "en" | "ar";
    };

    if (!topic && !focusKeyword) {
      return NextResponse.json(
        { error: "Either 'topic' or 'focusKeyword' is required." },
        { status: 400 },
      );
    }

    const override = getOverrideFromRequest(request);
    const bundle = await generateArticleBundle(
      { topic: topic?.trim(), focusKeyword: focusKeyword?.trim(), category: category || "nutrition" },
      override,
    );
    const image = await fetchFeaturedImage(bundle.seo.focusKeyword || focusKeyword || topic || "");

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
