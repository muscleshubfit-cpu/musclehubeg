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

    // Ensure the .z-ai-config file exists — on Vercel, the filesystem may
    // be read-only. Try process.cwd() first, then /tmp as fallback.
    const fs = await import("fs");
    const path = await import("path");

    const configContent = JSON.stringify({
      baseUrl: process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1",
      apiKey: process.env.ZAI_API_KEY || "Z.ai",
      chatId: process.env.ZAI_CHAT_ID || "",
      token: process.env.ZAI_TOKEN || "",
      userId: process.env.ZAI_USER_ID || "",
    });

    // Try writing to cwd first
    const cwdConfig = path.join(process.cwd(), ".z-ai-config");
    try {
      if (!fs.existsSync(cwdConfig)) fs.writeFileSync(cwdConfig, configContent);
    } catch {}

    // Also try /tmp (always writable on Vercel)
    const tmpConfig = path.join("/tmp", ".z-ai-config");
    try {
      fs.writeFileSync(tmpConfig, configContent);
      // Set HOME to /tmp so the SDK finds the config there
      if (!process.env.HOME || process.env.HOME === "/") {
        process.env.HOME = "/tmp";
      }
    } catch {}

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

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
      try {
        const result = await zai.functions.invoke("web_search", {
          query: query,
          num: 5,
        });

        if (Array.isArray(result) && result.length > 0) {
          for (const item of result) {
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
        } else {
          console.log(`[research-topic] Search "${query}" returned: ${typeof result} ${JSON.stringify(result).slice(0, 200)}`);
        }
      } catch (e: any) {
        console.error(`[research-topic] Search "${query}" failed:`, e?.message);
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
