import { NextRequest, NextResponse } from "next/server";

/**
 * Topic Research endpoint — searches the web for trending content, related
 * questions, and search intent data about a fitness/nutrition topic before
 * generating a blog article.
 *
 * Uses the z-ai-web-dev-sdk's web_search function to find:
 *   1. Top-ranking articles on the topic (competitor analysis)
 *   2. Related questions people are asking (like Answer The Public)
 *   3. Trending angles and subtopics
 *
 * POST /api/ai/research-topic
 * Body: { topic: string, focusKeyword?: string }
 * Returns: { queries: [...], topArticles: [...], relatedQuestions: [...], trendingAngles: [...] }
 */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, focusKeyword } = body as { topic?: string; focusKeyword?: string };

    if (!topic && !focusKeyword) {
      return NextResponse.json(
        { error: "Either 'topic' or 'focusKeyword' is required." },
        { status: 400 },
      );
    }

    const searchTerm = focusKeyword || topic || "";

    // Call the z-ai functions API directly (bypassing the SDK which needs a config file)
    const zaiBaseUrl = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
    const zaiApiKey = process.env.ZAI_API_KEY || "Z.ai";
    const zaiChatId = process.env.ZAI_CHAT_ID || "";
    const zaiUserId = process.env.ZAI_USER_ID || "";
    const zaiToken = process.env.ZAI_TOKEN || "";

    async function webSearch(query: string, num: number = 5): Promise<any[]> {
      try {
        const res = await fetch(`${zaiBaseUrl}/functions/invoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${zaiApiKey}`,
            "X-Z-AI-From": "Z",
            ...(zaiChatId ? { "X-Chat-Id": zaiChatId } : {}),
            ...(zaiUserId ? { "X-User-Id": zaiUserId } : {}),
            ...(zaiToken ? { "X-Token": zaiToken } : {}),
          },
          body: JSON.stringify({
            function_name: "web_search",
            arguments: { query, num },
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(`[research-topic] web_search "${query}" failed: ${res.status} ${errText.slice(0, 200)}`);
          return [];
        }
        const data = await res.json();
        return data?.result || data || [];
      } catch (e: any) {
        console.error(`[research-topic] web_search "${query}" error:`, e?.message);
        return [];
      }
    }

    // Run 3 key searches (reduced from 8 to avoid timeout)
    const searchQueries = [
      searchTerm,                              // main topic
      `${searchTerm} vs`,                      // comparison angles
      `how to ${searchTerm}`,                 // how-to angle
    ];

    const allResults: any[] = [];
    const allSnippets: string[] = [];
    const relatedQuestions: string[] = [];
    const topArticles: any[] = [];

    for (const query of searchQueries) {
      const results = await webSearch(query, 5);
      if (results.length > 0) {
        for (const item of results) {
          allSnippets.push(item.snippet || "");
          const host = item.host_name || "";
          if (!host.includes("reddit") && !host.includes("quora") && !host.includes("pinterest") && !host.includes("facebook")) {
            topArticles.push({
              title: item.name || "",
              url: item.url || "",
              host: host,
              snippet: (item.snippet || "").slice(0, 200),
            });
          }
          const snippet = item.snippet || "";
          const questionMatches = snippet.match(/\b(what|how|why|when|where|can|should|does|is|are|do)\s+[^.?!]+\?/gi);
          if (questionMatches) {
            for (const q of questionMatches) {
              if (q.length > 15 && q.length < 120 && !relatedQuestions.includes(q)) {
                relatedQuestions.push(q.trim());
              }
            }
          }
        }
      }
    }

    // Deduplicate top articles by URL
    const seenUrls = new Set<string>();
    const uniqueArticles = topArticles.filter((a) => {
      if (seenUrls.has(a.url)) return false;
      seenUrls.add(a.url);
      return true;
    }).slice(0, 10);

    // Deduplicate questions
    const uniqueQuestions = [...new Set(relatedQuestions)].slice(0, 15);

    // Analyze snippets for trending angles
    const wordFreq: Record<string, number> = {};
    for (const snippet of allSnippets) {
      const words = snippet.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 4 && !["about", "which", "their", "would", "could", "should", "other", "these", "those", "there", "where", "when", "what", "while"].includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }
    }
    const trendingAngles = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => word);

    return NextResponse.json({
      searchTerm,
      queries: searchQueries,
      topArticles: uniqueArticles,
      relatedQuestions: uniqueQuestions,
      trendingAngles,
      totalResults: allSnippets.length,
    });
  } catch (e: any) {
    console.error("[research-topic] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to research topic" },
      { status: 500 },
    );
  }
}
