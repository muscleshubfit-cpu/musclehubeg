import { NextRequest, NextResponse } from "next/server";
import { callAIWithFallback, parseJSON, type AIProvider } from "@/lib/ai-provider";

/**
 * Topic Research endpoint — uses OpenRouter AI to research a topic before
 * generating a blog article. Asks the AI to act as an SEO strategist and
 * provide:
 *   1. Top-ranking article angles (competitor analysis based on training data)
 *   2. Related questions people ask (like Answer The Public)
 *   3. Trending keywords and subtopics
 *
 * POST /api/ai/research-topic
 * Body: { topic: string, focusKeyword?: string }
 */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, focusKeyword } = body as { topic?: string; focusKeyword?: string };

    if (!topic && !focusKeyword) {
      return NextResponse.json({ error: "Either 'topic' or 'focusKeyword' is required." }, { status: 400 });
    }

    const searchTerm = focusKeyword || topic || "";

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
    const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

    if (!OPENROUTER_KEY) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const prompt = `You are an expert SEO/GEO content strategist. Research the topic "${searchTerm}" for a fitness & nutrition coaching blog (MuscleHub, Egypt-focused, Arabic + English audience).

Based on your knowledge of search trends, Google search behavior, and AI answer engine patterns, provide:

1. TOP_ARTICLES: The top 5 article angles currently ranking for this topic (title + brief description of what they cover).
2. RELATED_QUESTIONS: 8-10 questions people actually search for related to this topic (like Answer The Public would show).
3. TRENDING_KEYWORDS: 10-15 related keywords and subtopics that are trending or have high search volume.
4. CONTENT_GAPS: 3-5 angles that competitors are NOT covering well — opportunities for our article to win.
5. SEARCH_INTENT: Is the primary search intent informational, commercial, or transactional? What does the searcher really want?

Return STRICT JSON only:
{
  "topArticles": [
    {"title": "...", "description": "...", "coversWhat": "..."}
  ],
  "relatedQuestions": ["question 1", "question 2", "..."],
  "trendingKeywords": ["keyword 1", "keyword 2", "..."],
  "contentGaps": ["gap 1", "gap 2", "..."],
  "searchIntent": "informational|commercial|transactional",
  "searcherGoal": "what the searcher really wants to achieve"
}`;

    const models = [
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
    ];

    for (const model of models) {
      try {
        const { text } = await callAIWithFallback(
          prompt,
          {
            systemPrompt: "You are an expert SEO strategist with deep knowledge of Google search trends, Answer The Public data, and fitness/nutrition content. Return JSON only.",
            temperature: 0.5,
            maxTokens: 2000,
            jsonMode: true,
            timeoutMs: 60_000,
          },
          {
            provider: "openrouter" as AIProvider,
            apiKey: OPENROUTER_KEY,
            model,
            baseUrl: OPENROUTER_BASE,
          },
        );

        const parsed = parseJSON<any>(text);
        if (parsed && (parsed.relatedQuestions || parsed.topArticles)) {
          return NextResponse.json({
            searchTerm,
            topArticles: (parsed.topArticles || []).map((a: any) => ({
              title: a.title || a.name || "",
              snippet: a.description || a.coversWhat || "",
              host: "",
            })),
            relatedQuestions: parsed.relatedQuestions || [],
            trendingAngles: parsed.trendingKeywords || [],
            contentGaps: parsed.contentGaps || [],
            searchIntent: parsed.searchIntent || "informational",
            searcherGoal: parsed.searcherGoal || "",
            totalResults: (parsed.relatedQuestions?.length || 0) + (parsed.topArticles?.length || 0),
            source: `openrouter:${model}`,
          });
        }
      } catch (e: any) {
        console.error(`[research-topic] OpenRouter ${model} failed:`, e?.message);
      }
    }

    // All models failed — return empty research (article generation will still work)
    return NextResponse.json({
      searchTerm,
      topArticles: [],
      relatedQuestions: [],
      trendingAngles: [],
      contentGaps: [],
      searchIntent: "informational",
      searcherGoal: "",
      totalResults: 0,
      source: "none",
    });
  } catch (e: any) {
    console.error("[research-topic] Error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
