import { GoogleGenAI } from "@google/genai";

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

export async function externalSearch(
  input: ExternalSearchInput,
): Promise<ResearchResult> {
  const searchTerm = (input.focusKeyword || input.topic || "").trim();
  const maxResults = input.maxResults ?? 10;
  
  if (!searchTerm) {
    return emptyResult();
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    // Initialize Gemini SDK
    const ai = new GoogleGenAI({ apiKey });
    
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "{}";
    const data = parseJSON(text) || {};

    return {
      topArticles: Array.isArray(data.topArticles) ? data.topArticles.slice(0, maxResults) : [],
      relatedQuestions: Array.isArray(data.relatedQuestions) ? data.relatedQuestions.slice(0, 15) : [],
      trendingKeywords: Array.isArray(data.trendingKeywords) ? data.trendingKeywords.slice(0, 10) : [],
      trendingAngles: Array.isArray(data.trendingKeywords) ? data.trendingKeywords.slice(0, 10) : [],
      searchIntent: null,
      searcherGoal: null,
      contentGaps: [],
      source: "gemini-search",
      queryCount: 1,
      successfulQueries: 1,
      totalResults: Array.isArray(data.topArticles) ? data.topArticles.length : 0,
      partialFailure: false,
      firstError: null,
    };
  } catch (error: any) {
    console.error("[external-search] Gemini search failed:", error);
    const res = emptyResult();
    res.firstError = error?.message || String(error);
    res.partialFailure = true;
    return res;
  }
}
