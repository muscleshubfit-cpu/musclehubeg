import { NextRequest, NextResponse } from "next/server";
import { callFreeAIFallbackChain, parseJSON } from "@/lib/ai-provider";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { externalSearch } from "@/lib/external-search";

/**
 * Topic Research endpoint — runs the research stage via externalSearch()
 * (OpenRouter/Groq unified chain — owner directive 2026-08-27), then
 * optionally enriches with search intent / content gaps via a second
 * chain call.
 *
 * KNOWN TRADE-OFF (owner-approved): research is model-knowledge-based —
 * no live web grounding exists through OpenRouter/Groq. topArticles
 * model best-ranking coverage (trusted hosts only, urls empty); nothing
 * fabricated is ever published.
 *
 * POST /api/ai/research-topic
 * Body: { topic: string, focusKeyword?: string }
 */
export const maxDuration = 60; // Vercel hobby plan limit

export async function POST(request: NextRequest) {
  try {
    // Coach-only — burns OpenRouter/Groq credits on both calls.
    if (isAuthConfigured) {
      const auth = await requireCoach(request);
      if (auth instanceof Response) return auth;
    }

    const body = await request.json();
    const { topic, focusKeyword } = body as {
      topic?: string;
      focusKeyword?: string;
    };

    if (!topic && !focusKeyword) {
      return NextResponse.json(
        { error: "Either 'topic' or 'focusKeyword' is required." },
        { status: 400 },
      );
    }

    const searchTerm = focusKeyword || topic || "";

    // ──────────────────────────────────────────────────────────────
    // PRIMARY PATH — unified chain research (OpenRouter/Groq only).
    // ──────────────────────────────────────────────────────────────
    const research = await externalSearch({
      topic,
      focusKeyword,
      maxResults: 10,
    });

    // ──────────────────────────────────────────────────────────────
    // OPTIONAL ENRICHMENT — LLM-derived fields that cannot be
    // extracted from raw research. If the call fails we still return
    // the research above with default enrichment values.
    // ──────────────────────────────────────────────────────────────
    let searchIntent: string | null = null;
    let searcherGoal: string | null = null;
    let contentGaps: string[] = [];

    if (research.totalResults > 0) {
      const enrichmentPrompt = buildEnrichmentPrompt(
        searchTerm,
        research.topArticles.slice(0, 5),
        research.relatedQuestions.slice(0, 5),
        research.trendingKeywords.slice(0, 8),
      );

      try {
        const { text } = await callFreeAIFallbackChain(
          enrichmentPrompt,
          {
            systemPrompt:
              "You are an expert SEO strategist. Analyze the provided research results and return JSON only with searchIntent, searcherGoal, and contentGaps fields.",
            temperature: 0.4,
            maxTokens: 800,
            jsonMode: true,
            timeoutMs: 20_000,
            maxModels: 2,
          },
        );

        const parsed = parseJSON<any>(text);
        if (parsed) {
          if (
            parsed.searchIntent &&
            typeof parsed.searchIntent === "string" &&
            parsed.searchIntent.length > 0
          ) {
            searchIntent = parsed.searchIntent;
          }
          if (
            parsed.searcherGoal &&
            typeof parsed.searcherGoal === "string" &&
            parsed.searcherGoal.length > 0
          ) {
            searcherGoal = parsed.searcherGoal;
          }
          if (Array.isArray(parsed.contentGaps)) {
            contentGaps = parsed.contentGaps
              .filter(
                (g: any) =>
                  typeof g === "string" && g.length > 5 && g.length < 300,
              )
              .slice(0, 5);
          }
        }
      } catch (e: any) {
        // Enrichment failed — return research with defaults. Don't fail.
        console.error(
          "[research-topic] LLM enrichment failed (research still returned):",
          e?.message,
        );
      }
    }

    return NextResponse.json({
      searchTerm,
      topArticles: research.topArticles,
      relatedQuestions: research.relatedQuestions,
      trendingAngles: research.trendingKeywords, // legacy field name (AIGenerateModal compat)
      trendingKeywords: research.trendingKeywords,
      contentGaps,
      searchIntent: searchIntent || "informational",
      searcherGoal: searcherGoal || "",
      totalResults: research.totalResults,
      queryCount: research.queryCount,
      queriesSucceeded: research.successfulQueries,
      partialFailure: research.partialFailure,
      source: research.source, // "llm-research"
    });
  } catch (e: any) {
    console.error("[research-topic] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 },
    );
  }
}

/**
 * Build the LLM enrichment prompt. The LLM receives the research
 * results and classifies search intent + identifies content gaps.
 */
function buildEnrichmentPrompt(
  searchTerm: string,
  topArticles: Array<{ title: string; url: string; host: string; snippet: string }>,
  relatedQuestions: string[],
  trendingKeywords: string[],
): string {
  const articlesBlock = topArticles
    .map(
      (a, i) =>
        `${i + 1}. "${a.title}" (${a.host})\n   ${a.snippet}`,
    )
    .join("\n\n");

  const questionsBlock = relatedQuestions
    .map((q, i) => `   ${i + 1}. ${q}`)
    .join("\n");

  const keywordsBlock = trendingKeywords.join(", ");

  return `You are an expert SEO strategist analyzing research results for the search term "${searchTerm}".

Research results (modeled top coverage — titles + hosts + snippets):
${articlesBlock}

Related questions:
${questionsBlock}

Trending keywords:
${keywordsBlock}

Based on the data above, return STRICT JSON only:
{
  "searchIntent": "informational | commercial | transactional",
  "searcherGoal": "one-sentence summary of what the searcher really wants to achieve",
  "contentGaps": [
    "angle 1 that existing coverage is NOT covering well — opportunity for our article",
    "angle 2 ...",
    "angle 3 ..."
  ]
}

Rules:
- searchIntent must be exactly one of: informational, commercial, transactional.
- searcherGoal must be one sentence (max 200 chars).
- contentGaps must be 3-5 short strings (each 50-200 chars).
- Do NOT include URLs or article titles in contentGaps — these are angles, not citations.
- Return JSON only, no markdown fences.`;
}
