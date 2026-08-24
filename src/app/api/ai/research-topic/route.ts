import { NextRequest, NextResponse } from "next/server";
import { parseJSON } from "@/lib/ai-provider";
import { callGemini, getGeminiApiKey } from "@/lib/gemini-wrapper";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { externalSearch } from "@/lib/external-search";

/**
 * Topic Research endpoint — runs REAL external web search via
 * Google Search via Gemini to fetch actual URLs, titles, hosts, and
 * snippets from the web. Optionally enriches search intent / content
 * gaps via an LLM call (these fields cannot be derived from raw web
 * search results alone).
 *
 * The primary path is `externalSearch()` in `src/lib/external-search.ts`:
 *   - 3 parallel queries (main topic, comparison, how-to)
 *   - 8s timeout per query
 *   - Dedup by normalized URL
 *   - Filter reddit / quora / pinterest / facebook
 *   - Extract questions from snippets
 *   - Compute trending keywords from snippet word frequency
 *   - ZERO LLM calls inside the search path
 *
 * The LLM is used ONLY for fields that cannot be derived from raw
 * search results:
 *   - searchIntent (informational / commercial / transactional)
 *   - searcherGoal (free-text summary of what the searcher wants)
 *   - contentGaps (3-5 angles competitors are NOT covering well)
 *
 * If the LLM call fails or the OpenRouter key is missing, those fields
 * are returned as null/empty — the rest of the research (topArticles,
 * relatedQuestions, trendingKeywords) is still real and useful.
 *
 * POST /api/ai/research-topic
 * Body: { topic: string, focusKeyword?: string }
 */
export const maxDuration = 60; // Vercel hobby plan limit

export async function POST(request: NextRequest) {
  try {
    // Coach-only — burns OpenRouter credits on the LLM enrichment call.
    // The external search itself is free (uses Gemini's
    // internal token, no key required).
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
    // PRIMARY PATH — REAL external web search via Gemini SDK.
    // No LLM. No OpenRouter. Returns real URLs, hosts, snippets.
    // ──────────────────────────────────────────────────────────────
    const research = await externalSearch({
      topic,
      focusKeyword,
      maxResults: 10,
      timeoutMs: 8000,
    });

    // ──────────────────────────────────────────────────────────────
    // OPTIONAL ENRICHMENT — LLM-derived fields that cannot be
    // extracted from raw search results. Only attempt if the OpenRouter
    // key is configured AND we have real research to enrich. If the
    // LLM call fails (rate-limit, 404, etc.), we still return the
    // real research above with null enrichment fields.
    // ──────────────────────────────────────────────────────────────
    let searchIntent: string | null = null;
    let searcherGoal: string | null = null;
    let contentGaps: string[] = [];

    const canCallLLM = Boolean(getGeminiApiKey());

    if (canCallLLM && research.totalResults > 0) {
      const enrichmentPrompt = buildEnrichmentPrompt(
        searchTerm,
        research.topArticles.slice(0, 5),
        research.relatedQuestions.slice(0, 5),
        research.trendingKeywords.slice(0, 8),
      );

      try {
        const { text, model } = await callGemini(
          enrichmentPrompt,
          {
            systemPrompt:
              "You are an expert SEO strategist. Analyze the provided REAL web search results and return JSON only with searchIntent, searcherGoal, and contentGaps fields. Do NOT fabricate URLs or article titles — use only the provided research.",
            temperature: 0.4,
            maxTokens: 800,
            jsonMode: true,
            timeoutMs: 20_000,
          },
          2, // maxModels=2 — Vercel-safe (BLOG-PIPELINE-REDESIGN-001 Phase 1)
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
        // Note: `model` is consumed for logging context but not surfaced
        // to the caller — the response.source stays "z-ai-web-search"
        // because the primary data is real web search, not LLM output.
        void model;
      } catch (e: any) {
        // LLM enrichment failed (rate-limit, 404, etc.) — return
        // real research with null enrichment fields. Don't fail the
        // whole request.
        console.error(
          "[research-topic] LLM enrichment failed (real research still returned):",
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
      source: "z-ai-web-search",
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
 * Build the LLM enrichment prompt. The LLM receives the REAL search
 * results and is asked to classify search intent + identify content
 * gaps. It is explicitly told NOT to fabricate URLs or titles.
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
        `${i + 1}. "${a.title}" (${a.host})\n   ${a.snippet}\n   URL: ${a.url}`,
    )
    .join("\n\n");

  const questionsBlock = relatedQuestions
    .map((q, i) => `   ${i + 1}. ${q}`)
    .join("\n");

  const keywordsBlock = trendingKeywords.join(", ");

  return `You are an expert SEO strategist analyzing REAL web search results for the search term "${searchTerm}".

REAL search results (titles + hosts + snippets — DO NOT fabricate URLs or invent new article titles):
${articlesBlock}

Related questions extracted from snippets:
${questionsBlock}

Trending keywords extracted from snippets:
${keywordsBlock}

Based on the REAL data above, return STRICT JSON only:
{
  "searchIntent": "informational | commercial | transactional",
  "searcherGoal": "one-sentence summary of what the searcher really wants to achieve",
  "contentGaps": [
    "angle 1 that the existing top articles are NOT covering well — opportunity for our article",
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
