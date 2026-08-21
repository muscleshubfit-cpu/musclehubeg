/**
 * External Web Search — the project's official entry point for real
 * external web search via Z.ai (z-ai-web-dev-sdk).
 *
 * Why this module exists:
 * - The previous /api/ai/research-topic route used `callFreeOpenRouter`
 *   to ask an LLM to "research" a topic. The LLM hallucinated URLs and
 *   returned `host: ""` for every result. This is LLM pseudo-research,
 *   not real external search.
 * - The blog pipeline's `generateExternalResearch()` (in
 *   `src/lib/blog-generate.ts`) used raw `fetch()` against
 *   `https://internal-api.z.ai/v1/functions/invoke` with the default
 *   `"Z.ai"` API key — which fails with `invalid X-Token` on every
 *   call. The raw-fetch path is broken in production.
 * - The fix: use the `z-ai-web-dev-sdk` package (already in
 *   `dependencies`), which ships with an internal token and works in
 *   serverless environments. This module wraps the SDK so it can be
 *   shared across the AI research route (this module's primary caller)
 *   and, in a future task, the blog pipeline.
 *
 * Output shape (ResearchResult):
 *   - topArticles: Array<{ title, url, host, snippet }>
 *   - relatedQuestions: Array<string>
 *   - trendingKeywords: Array<string>
 *   - trendingAngles: Array<string> (alias for trendingKeywords, for
 *     compatibility with callers expecting that field name)
 *   - searchIntent: null  (LLM-only concern — populated by caller if needed)
 *   - searcherGoal: null (LLM-only concern — populated by caller if needed)
 *   - contentGaps: []     (LLM-only concern — populated by caller if needed)
 *   - source: "z-ai-web-search"
 *   - queryCount: number of queries run
 *   - successfulQueries: number of queries that returned >= 1 result
 *   - totalResults: number of deduplicated articles stored
 *   - partialFailure: true if any query returned 0 results
 *
 * Filtering:
 *   - Deduplicates by normalized URL (case-insensitive, trailing slash
 *     and protocol stripped).
 *   - Excludes low-value sources: reddit.com, quora.com,
 *     pinterest.com, facebook.com.
 *   - Extracts questions from snippets via regex
 *     (what/how/why/when/where/can/should/does/is/are/do + "?").
 *   - Computes trending keywords from snippet word frequency (English
 *     only, length > 4, stop-words excluded).
 *
 * No LLM calls. No OpenRouter. No API keys required (the SDK handles
 * auth internally). Safe to call from Vercel Hobby functions
 * (each query ~1-3s, all parallel via Promise.all, well under 60s).
 */

import ZAI from "z-ai-web-dev-sdk";
import { writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Inferred type of the ZAI client instance returned by `ZAI.create()`.
 * We use type inference (not `ZAIClient`) because the
 * SDK's ZAI class has a private constructor — `InstanceType` can't
 * see through private constructors.
 */
type ZAIClient = Awaited<ReturnType<typeof ZAI.create>>;

/**
 * Cached ZAI client — created once per process, reused across requests.
 * The SDK reads from `.z-ai-config` files in cwd / home / /etc, so we
 * write `/tmp/.z-ai-config` first (see `createZaiClient`) and then
 * call `ZAI.create()`.
 *
 * On Vercel serverless, each function invocation is a fresh process,
 * so this cache doesn't survive across requests — but within a single
 * function call, multiple queries share the same client.
 */
let _zaiClient: ZAIClient | null = null;

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
  source: "z-ai-web-search";
  queryCount: number;
  successfulQueries: number;
  totalResults: number;
  partialFailure: boolean;
};

export type ExternalSearchInput = {
  topic?: string;
  focusKeyword?: string;
  category?: string;
  /** Max results to keep after dedup. Default 10. */
  maxResults?: number;
  /** Per-query timeout (ms). Default 8000. */
  timeoutMs?: number;
};

const LOW_VALUE_HOSTS = [
  "reddit.com",
  "quora.com",
  "pinterest.com",
  "facebook.com",
];

const STOP_WORDS = new Set([
  "about",
  "which",
  "their",
  "would",
  "could",
  "should",
  "other",
  "these",
  "those",
  "there",
  "where",
  "when",
  "what",
  "while",
  "from",
  "with",
  "that",
  "this",
  "they",
  "have",
  "been",
  "will",
  "your",
  "also",
  "more",
  "than",
  "into",
  "only",
  "most",
  "some",
  "such",
  "very",
  "just",
  "like",
  "make",
  "made",
  "well",
]);

function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/\/$/, "")
    .replace(/https?:\/\//, "");
}

/**
 * Create a ZAI SDK client instance using env-var-provided config.
 *
 * The SDK's `ZAI.create()` reads from `.z-ai-config` files in
 * `process.cwd()`, `os.homedir()`, and `/etc/.z-ai-config`. None of
 * these paths are guaranteed to exist on Vercel serverless production
 * (process.cwd() is read-only, /etc is not writable, HOME may be /tmp).
 *
 * Solution: write `/tmp/.z-ai-config` with env-var-provided config
 * (with sensible defaults), then call `ZAI.create()`. This is the
 * same pattern used by `src/app/api/ai/generate-image/route.ts`.
 *
 * The client is cached per-process (see `_zaiClient` above) so the
 * file write happens only once per function invocation.
 */
async function createZaiClient(): Promise<ZAIClient> {
  if (_zaiClient) return _zaiClient;

  const config = {
    baseUrl: process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1",
    apiKey: process.env.ZAI_API_KEY || "Z.ai",
    chatId: process.env.ZAI_CHAT_ID || "",
    token: process.env.ZAI_TOKEN || "",
    userId: process.env.ZAI_USER_ID || "",
  };

  // Write a /tmp/.z-ai-config so `ZAI.create()` finds it. Best-effort —
  // if /tmp is read-only (rare on Vercel), the call below will throw
  // and the caller's try/catch handles it.
  await writeTmpConfig(config);

  // Some Vercel runtimes set HOME=/ or leave it unset, which causes
  // `os.homedir()` to return `/` (read-only). The SDK checks `cwd`,
  // `home`, and `/etc/.z-ai-config` — but on Vercel, /tmp is writable
  // and is the only safe path. Setting HOME=/tmp makes the SDK find
  // the file we just wrote there.
  if (!process.env.HOME || process.env.HOME === "/") {
    process.env.HOME = "/tmp";
  }

  _zaiClient = await ZAI.create();
  return _zaiClient;
}

async function writeTmpConfig(config: Record<string, string>): Promise<void> {
  try {
    const tmpDir = tmpdir();
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, ".z-ai-config"), JSON.stringify(config), { mode: 0o600 });
  } catch (e: any) {
    console.error(`[external-search] Failed to write /tmp/.z-ai-config: ${e?.message || e}`);
    throw e;
  }
}

function buildSearchQueries(topic: string, focusKeyword?: string): string[] {
  const base = (focusKeyword || topic || "").trim();
  if (!base) return [];
  return [
    base,
    `${base} vs`,
    `how to ${base}`,
  ];
}

function extractQuestions(snippet: string): string[] {
  const matches = snippet.match(
    /\b(what|how|why|when|where|can|should|does|is|are|do)\s+[^.?!]+\?/gi,
  );
  if (!matches) return [];
  return matches
    .map((q) => q.trim())
    .filter((q) => q.length > 15 && q.length < 120);
}

function computeTrendingKeywords(snippets: string[]): string[] {
  const freq: Record<string, number> = {};
  for (const snippet of snippets) {
    const words = snippet.toLowerCase().split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (clean.length > 4 && !STOP_WORDS.has(clean)) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Run a single web_search query via the z-ai-web-dev-sdk.
 * Returns raw results or [] on any error (including the SDK's own
 * 429 / timeout handling — we don't propagate, the caller decides
 * what to do with partial failures).
 */
async function runSingleQuery(
  zai: ZAIClient,
  query: string,
  num: number,
  timeoutMs: number,
): Promise<any[]> {
  try {
    const result = await Promise.race([
      zai.functions.invoke("web_search", { query, num }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`web_search timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
    // The SDK returns an array of results. Some future SDK versions
    // might wrap results in { result: [...] } or { results: [...] } —
    // handle both shapes defensively.
    if (Array.isArray(result)) return result as any[];
    if (result && typeof result === "object") {
      const r = result as any;
      if (Array.isArray(r.result)) return r.result;
      if (Array.isArray(r.results)) return r.results;
    }
    return [];
  } catch (e: any) {
    console.error(
      `[external-search] web_search failed for "${query}": ${e?.message || e}`,
    );
    return [];
  }
}

/**
 * Run external web search — the project's official entry point.
 *
 * Returns a ResearchResult with real URLs, hosts, titles, snippets
 * from actual web pages. NO LLM calls. NO OpenRouter.
 */
export async function externalSearch(
  input: ExternalSearchInput,
): Promise<ResearchResult> {
  const searchTerm = (input.focusKeyword || input.topic || "").trim();
  const maxResults = input.maxResults ?? 10;
  const timeoutMs = input.timeoutMs ?? 8000;

  if (!searchTerm) {
    return emptyResult();
  }

  const queries = buildSearchQueries(input.topic || "", input.focusKeyword);
  if (queries.length === 0) {
    return emptyResult();
  }

  // Create the ZAI client once, share across all parallel queries.
  // The SDK's `ZAI.create()` reads from `.z-ai-config` files in
  // `process.cwd()`, `os.homedir()`, and `/etc/.z-ai-config`. None of
  // these paths are guaranteed to exist on Vercel serverless production
  // (process.cwd() is read-only, /etc is not writable, HOME may be /tmp).
  // `createZaiClient()` writes `/tmp/.z-ai-config` with env-var-provided
  // config (with sensible defaults) before calling `ZAI.create()`.
  const zai = await createZaiClient();

  // Run ALL queries in parallel — total wallclock ~= slowest query,
  // not sum of all. Each query is independently fault-tolerant.
  const searchResults = await Promise.all(
    queries.map((q) => runSingleQuery(zai, q, 5, timeoutMs)),
  );

  // Post-process: dedup by URL, filter low-value hosts, extract
  // questions + trending keywords from snippets.
  const seenUrls = new Set<string>();
  const allSnippets: string[] = [];
  const relatedQuestions: string[] = [];
  const topArticles: ExternalSearchArticle[] = [];
  let successfulQueries = 0;

  for (const results of searchResults) {
    if (results.length > 0) successfulQueries++;
    for (const item of results) {
      const url = item.url || "";
      const host = item.host_name || item.host || "";
      const title = item.name || item.title || "";
      const snippet = (item.snippet || "").slice(0, 200);

      if (!url) continue;

      const normalized = normalizeUrl(url);
      if (!normalized || seenUrls.has(normalized)) continue;
      seenUrls.add(normalized);

      if (
        LOW_VALUE_HOSTS.some((src) => host.toLowerCase().includes(src))
      )
        continue;

      allSnippets.push(snippet);
      topArticles.push({ title, url, host, snippet });

      for (const q of extractQuestions(snippet)) {
        if (!relatedQuestions.includes(q)) {
          relatedQuestions.push(q);
        }
      }
    }
  }

  const trendingKeywords = computeTrendingKeywords(allSnippets);
  const partialFailure = successfulQueries < queries.length;

  return {
    topArticles: topArticles.slice(0, maxResults),
    relatedQuestions: relatedQuestions.slice(0, 15),
    trendingKeywords,
    trendingAngles: trendingKeywords, // legacy alias
    searchIntent: null, // LLM-only concern — populated by caller if needed
    searcherGoal: null, // LLM-only concern — populated by caller if needed
    contentGaps: [], // LLM-only concern — populated by caller if needed
    source: "z-ai-web-search",
    queryCount: queries.length,
    successfulQueries,
    totalResults: topArticles.length,
    partialFailure,
  };
}

function emptyResult(): ResearchResult {
  return {
    topArticles: [],
    relatedQuestions: [],
    trendingKeywords: [],
    trendingAngles: [],
    searchIntent: null,
    searcherGoal: null,
    contentGaps: [],
    source: "z-ai-web-search",
    queryCount: 0,
    successfulQueries: 0,
    totalResults: 0,
    partialFailure: false,
  };
}
