import { callAIWithFallback, parseJSON } from "@/lib/ai-provider";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Smart topic picker for the automated blog pipeline.
 *
 * There's no paid keyword/trends API wired in (SerpApi, Ahrefs, etc. all
 * cost money — this project is deliberately built on free tiers only). So
 * "search-aware" here means: prompt the model, itself trained on a huge
 * corpus of real search behavior, to act as an SEO strategist — while we
 * mechanically guarantee variety and freshness by feeding it what's already
 * been published so it never repeats itself.
 *
 * If real-time SERP/trends data is wanted later, this is the single place
 * to plug in a live search API before building the prompt.
 */

const CONTENT_PILLARS = [
  "nutrition",
  "training",
  "weight-loss",
  "muscle-building",
  "recovery",
  "supplements",
  "mindset",
] as const;

const TOPIC_SYSTEM_PROMPT = `You are an SEO/GEO content strategist for a premium online fitness & nutrition coaching brand (Coach Ahmed Zake, Egypt-focused, Arabic + English audience).

Pick exactly ONE next blog topic that:
  - Has genuine, evergreen or currently-seasonal search demand (something real people actually type into Google or ask ChatGPT/Perplexity about).
  - Is squarely inside the fitness/nutrition/coaching niche — never generic or off-topic.
  - Has NOT been covered yet (you will be given a list of already-published topics — do not repeat or closely overlap with any of them).
  - Is likely to rank on Google AND get cited by AI answer engines (clear, answerable, specific — not vague).
  - Fits ONE of these content pillars: nutrition, training, weight-loss, muscle-building, recovery, supplements, mindset.

Consider the current month/season for relevance (e.g., Ramadan nutrition timing, summer cutting, winter bulking, New Year's resolution intent) when it genuinely helps search intent — don't force it if irrelevant.

Return STRICT JSON only, no prose, no markdown fences:
{
  "topic": "string — a specific, compelling article topic (not just a keyword)",
  "focusKeyword": "string — the primary SEO keyword this topic targets",
  "category": "one of: nutrition | training | weight-loss | muscle-building | recovery | supplements | mindset",
  "rationale": "string — 1-2 sentences: why this has search demand and will win on Google + AI search right now"
}`;

export type TopicPick = {
  topic: string;
  focusKeyword: string;
  category: (typeof CONTENT_PILLARS)[number];
  rationale: string;
};

async function getRecentTopics(limit = 30): Promise<string[]> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("blog_posts" as any)
    .select("title, focus_keyword, category")
    .eq("language", "en")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((p: any) => `${p.title} [${p.category}] (kw: ${p.focus_keyword || "n/a"})`);
}

export async function pickSmartTopic(): Promise<TopicPick> {
  const recent = await getRecentTopics();
  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const userPrompt = `Current date context: ${monthLabel}.

ALREADY PUBLISHED (do not repeat or closely duplicate any of these):
${recent.length ? recent.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(none yet — this is the first post)"}

Content pillars to rotate through: ${CONTENT_PILLARS.join(", ")}.

Pick the single best next topic now.`;

  const { text: raw } = await callAIWithFallback(userPrompt, {
    systemPrompt: TOPIC_SYSTEM_PROMPT,
    temperature: 0.9,
    maxTokens: 500,
    jsonMode: true,
    timeoutMs: 60_000,
  });

  const parsed = parseJSON<any>(raw);
  if (!parsed?.topic || !parsed?.focusKeyword) {
    throw new Error("Topic picker returned an invalid response.");
  }

  const category = CONTENT_PILLARS.includes(parsed.category) ? parsed.category : "nutrition";

  return {
    topic: String(parsed.topic),
    focusKeyword: String(parsed.focusKeyword),
    category,
    rationale: String(parsed.rationale || ""),
  };
}
