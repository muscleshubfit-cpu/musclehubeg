import {
  callFreeAIFallbackChain,
  parseJSON,
} from "@/lib/ai-provider";

export type ExternalSearchArticle = {
  title: string;
  url: string;
  host: string;
  snippet: string;
};

export type ResearchResult = {
  topArticles: ExternalSearchArticle[];
  relatedQuestions: string[];
  trendingKeywords: string[];
  trendingAngles: string[]; // alias for trendingKeywords (legacy compat)
  searchIntent: null;
  searcherGoal: null;
  contentGaps: string[];
  source: "llm-research";
  queryCount: number;
  successfulQueries: number;
  totalResults: number;
  partialFailure: boolean;
  firstError: string | null;
};

export type ExternalSearchInput = {
  topic?: string;
  focusKeyword?: string;
  category?: string;
  maxResults?: number;
  /**
   * Accepted for backward compatibility. The unified chain enforces its own
   * Vercel-Hobby-safe per-model timeout budget, so this value is advisory.
   */
  timeoutMs?: number;
};

function emptyResult(): ResearchResult {
  return {
    topArticles: [],
    relatedQuestions: [],
    trendingKeywords: [],
    trendingAngles: [],
    searchIntent: null,
    searcherGoal: null,
    contentGaps: [],
    source: "llm-research",
    queryCount: 0,
    successfulQueries: 0,
    totalResults: 0,
    partialFailure: false,
    firstError: null,
  };
}

/**
 * External research stage (Step 2a of the blog pipeline).
 *
 * OWNER DIRECTIVE (2026-08-27): all AI calls must go through OpenRouter /
 * Groq. The previous implementation used Google's native GenAI SDK with
 * Google Search grounding (`tools:[{googleSearch:{}}]`), which is a DIRECT
 * Gemini API call and is therefore no longer allowed.
 *
 * Replacement strategy: ask the strongest available chain model to act as
 * a research analyst producing the SAME output shape the pipeline expects
 * ({topArticles, relatedQuestions, trendingKeywords}) from its training
 * knowledge.
 *
 * KNOWN TRADE-OFF (documented, owner-approved): without live web grounding
 * the "articles" below represent likely-authoritative sources by domain +
 * plausible titles rather than verified live URLs. Downstream stages only
 * use `host` + `snippet` as thematic guidance for article drafting — no
 * fabricated URL is ever published or linked. Google-family models reached
 * through OpenRouter (`google/gemma-*`) still carry strong search-quality
 * priors from Google's training corpus.
 */
const WELL_KNOWN_HEALTH_HOSTS = [
  "healthline.com",
  "mayoclinic.org",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "webmd.com",
  "medicalnewstoday.com",
  "examine.com",
  "verywellfit.com",
  "menshealth.com",
  "womenshealthmag.com",
  "bodybuilding.com",
  "t-nation.com",
  "sciencedirect.com",
  "who.int",
  "cdc.gov",
];

const RESEARCH_SYSTEM_PROMPT = `You are an expert fitness/nutrition content researcher for MuscleHubEG, an Arabic+English sports platform.
Given a topic and focus keyword, produce research JSON that will guide article writing.

Rules:
- topArticles: 5-8 items modeling what the BEST-RANKING coverage of this topic looks like.
  Use ONLY host domains from this trusted list: ${WELL_KNOWN_HEALTH_HOSTS.join(", ")}.
  Titles should be realistic SEO-style headlines; snippets must summarize the key facts,
  statistics, and angles such an article would cover (2-3 sentences each). Set url to "" .
- relatedQuestions: 8-15 "People Also Ask"-style questions in English AND Arabic mix appropriate to the topic's audience.
- trendingKeywords: 5-10 current SEO keywords/phrases for this niche.
- Return STRICT JSON only — no markdown fences, no commentary.`;

export async function externalSearch(
  input: ExternalSearchInput,
): Promise<ResearchResult> {
  const searchTerm = (input.focusKeyword || input.topic || "").trim();
  const maxResults = input.maxResults ?? 10;

  if (!searchTerm) {
    return emptyResult();
  }

  const prompt = `Research topic: "${searchTerm}"
Focus keyword: "${searchTerm}"

Produce the research JSON now.`;

  // maxModels=2 × clamped ≤26s → worst case ~52s, inside the Vercel Hobby cap.
  const { text, model, provider } = await callFreeAIFallbackChain(
    prompt,
    {
      tag: "external-search",
      systemPrompt: RESEARCH_SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 2500,
      jsonMode: true,
      timeoutMs: 26_000,
      maxModels: 2,
    },
  );

  const data = parseJSON<{
    topArticles?: any[];
    relatedQuestions?: any[];
    trendingKeywords?: any[];
  }>(text);

  const topArticles = Array.isArray(data?.topArticles) ? data!.topArticles : [];

  if (topArticles.length === 0) {
    throw new Error(
      `[external-search] ${provider}/${model} returned no topArticles (parsed keys: ${
        data ? Object.keys(data).join(",") : "null"
      })`,
    );
  }

  // Sanitize hosts into the trusted list; unknown/missing → "" (never fabricated).
  const sanitized: ExternalSearchArticle[] = topArticles
    .slice(0, maxResults)
    .map((a: any) => {
      const rawHost = String(a?.host || "").toLowerCase().trim();
      const host = WELL_KNOWN_HEALTH_HOSTS.includes(rawHost) ? rawHost : "";
      return {
        title: String(a?.title || "").slice(0, 200),
        url: "", // never publish model-suggested URLs
        host,
        snippet: String(a?.snippet || "").slice(0, 600),
      };
    });

  const relatedQuestions = Array.isArray(data?.relatedQuestions)
    ? data!.relatedQuestions.map((q: any) => String(q).slice(0, 200)).slice(0, 15)
    : [];
  const trendingKeywords = Array.isArray(data?.trendingKeywords)
    ? data!.trendingKeywords.map((k: any) => String(k).slice(0, 60)).slice(0, 10)
    : [];

  console.log(
    `[external-search] ${provider}/${model} succeeded: ${sanitized.length} articles, ${relatedQuestions.length} questions.`,
  );

  return {
    topArticles: sanitized,
    relatedQuestions,
    trendingKeywords,
    trendingAngles: [...trendingKeywords],
    searchIntent: null,
    searcherGoal: null,
    contentGaps: [],
    source: "llm-research",
    queryCount: 1,
    successfulQueries: 1,
    totalResults: sanitized.length,
    partialFailure: false,
    firstError: null,
  };
}
