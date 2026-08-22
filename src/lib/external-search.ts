import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/gemini-wrapper";

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
  source: "gemini-search" | "z-ai-web-search";
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
    source: "gemini-search",
    queryCount: 0,
    successfulQueries: 0,
    totalResults: 0,
    partialFailure: false,
    firstError: null,
  };
}

function parseJSON<T = any>(text: string): T | null {
  if (!text) return null;
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  const open = cleaned.search(/[{[]/);
  if (open === -1) return null;
  const close = cleaned.lastIndexOf(cleaned[open] === "{" ? "}" : "]");
  if (close !== -1 && close > open) {
    try {
      return JSON.parse(cleaned.slice(open, close + 1)) as T;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Ordered list of Gemini Flash models tried by externalSearch().
 *
 * Policy (per stage-aware review):
 *   - Stage = Google / External Research → use FASTEST free Gemini variant.
 *   - NO Gemini Pro, NO OpenRouter models — Google Search tool grounding is
 *     mandatory, and only Google's own Gemini family supports the
 *     `tools: [{ googleSearch: {} }]` config used here.
 *
 * Order: try the newest Flash first, fall back to older revisions if the
 * API rejects the model name (deprecation) or returns a network/quota error.
 */
const GEMINI_FLASH_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
] as const;

export async function externalSearch(
  input: ExternalSearchInput,
): Promise<ResearchResult> {
  const searchTerm = (input.focusKeyword || input.topic || "").trim();
  const maxResults = input.maxResults ?? 10;

  if (!searchTerm) {
    return emptyResult();
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "[external-search] GEMINI_API_KEY (or GOOGLE_API_KEY / GOOGLE_GENAI_API_KEY / AI_API_KEY / OPENROUTER_API) is not configured. " +
      "External research requires a valid Gemini API key — Google Search grounding is only available through Google's own Gemini models.",
    );
  }

  // Initialize Gemini SDK once and reuse across all model attempts.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });

  const prompt = `Perform a comprehensive Google Search for the following topic/keyword: "${searchTerm}".
Return a JSON object containing the real research data exactly in this format:
{
  "topArticles": [
    { "title": "Real Article Title", "url": "https://...", "host": "example.com", "snippet": "A brief 2-3 sentence snippet summarizing the article content..." }
  ],
  "relatedQuestions": ["Question 1", "Question 2"],
  "trendingKeywords": ["keyword1", "keyword2"]
}
Ensure you use your Google Search tool to find real, accurate URLs and titles.
Do NOT hallucinate URLs. 
Return valid JSON only.`;

  // ─────────────────────────────────────────────────────────────────────
  // Ordered fallback: 3.7-flash → 3.6-flash → 3.5-flash
  //
  // Each attempt MUST keep Google Search grounding enabled (the
  // `tools: [{ googleSearch: {} }]` config below is what tells the model
  // to perform a real web search instead of relying on its training data).
  //
  // If a model fails (404/deprecation, network, quota, empty body), we log
  // the cause and proceed to the next model automatically. If ALL three
  // fail, we throw a clear error — NO local fallback, NO fabricated results.
  // ─────────────────────────────────────────────────────────────────────
  const attemptErrors: string[] = [];

  for (const model of GEMINI_FLASH_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      if (!text.trim()) {
        throw new Error(`${model}: empty response body`);
      }

      const data = parseJSON<any>(text) || {};

      // Basic shape check — if the model returned valid JSON but with no
      // topArticles at all, treat as a soft failure and try the next model.
      // (This guards against cases where Google Search returned 0 results
      // AND the model decided to output `{}`.)
      if (
        !Array.isArray(data.topArticles) ||
        data.topArticles.length === 0
      ) {
        throw new Error(
          `${model}: response had no topArticles (parsed keys: ${Object.keys(data).join(",") || "none"})`,
        );
      }

      console.log(
        `[external-search] Gemini ${model} succeeded: ` +
        `${data.topArticles.length} articles, ` +
        `${Array.isArray(data.relatedQuestions) ? data.relatedQuestions.length : 0} questions.`,
      );

      return {
        topArticles: data.topArticles.slice(0, maxResults),
        relatedQuestions: Array.isArray(data.relatedQuestions)
          ? data.relatedQuestions.slice(0, 15)
          : [],
        trendingKeywords: Array.isArray(data.trendingKeywords)
          ? data.trendingKeywords.slice(0, 10)
          : [],
        trendingAngles: Array.isArray(data.trendingKeywords)
          ? data.trendingKeywords.slice(0, 10)
          : [],
        searchIntent: null,
        searcherGoal: null,
        contentGaps: [],
        source: "gemini-search",
        queryCount: 1,
        successfulQueries: 1,
        totalResults: data.topArticles.length,
        partialFailure: false,
        firstError: null,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      attemptErrors.push(`${model}: ${msg}`);
      console.warn(`[external-search] Gemini ${model} notice, trying next:`, msg);
      // fall through to the next model in the loop
    }
  }

  // All three Flash models failed — throw a clear, descriptive error.
  // DO NOT return empty results (would let downstream stages silently use
  // fabricated data). DO NOT use a local fallback.
  const failureSummary = attemptErrors.join("\n  - ");
  const finalError = new Error(
    `[external-search] All Gemini Flash models failed for query "${searchTerm}". ` +
    `Google Search grounding could not be completed. Errors:\n  - ${failureSummary}\n` +
    `Configure a valid GEMINI_API_KEY with Gemini Flash access. ` +
    `No local fallback or fabricated results will be returned.`,
  );
  console.error(finalError.message);
  throw finalError;
}
