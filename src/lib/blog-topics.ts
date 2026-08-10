import { callAIWithFallback, parseJSON } from "@/lib/ai-provider";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Smart topic picker for the automated blog pipeline.
 *
 * There's no paid keyword/trends API wired in (SerpApi, Ahrefs, etc. all
 * cost money — this project is deliberately built on free tiers only). So
 * "search-aware" here means: prompt the model, itself trained on a huge
 * corpus of real search behavior, to act as an SEO strategist — while we
 * mechanically guarantee variety by choosing the content pillar in CODE
 * (round-robin), not by hoping the model remembers to rotate.
 *
 * If real-time SERP/trends data is wanted later, this is the single place
 * to plug in a live search API before building the prompt.
 */

// IMPORTANT: these MUST match BLOG_CATEGORIES ids in src/lib/blog.ts exactly,
// or generated posts get a category the site's filter UI doesn't recognize.
const CONTENT_PILLARS = [
  "nutrition",
  "workout",
  "supplements",
  "weight-loss",
  "muscle-gain",
  "health",
  "recipes",
  "science",
] as const;

type Pillar = (typeof CONTENT_PILLARS)[number];

const TOPIC_SYSTEM_PROMPT = `You are an SEO/GEO content strategist for a premium online fitness & nutrition coaching brand (Coach Ahmed Zake, Egypt-focused, Arabic + English audience).

You will be told the EXACT content pillar to write about (it was already chosen by a rotation system — do not change it). Your job is to pick the single best, specific ARTICLE ANGLE within that pillar.

Requirements for the topic you pick:
  - Has genuine, evergreen or currently-seasonal search demand (something real people actually type into Google or ask ChatGPT/Perplexity about).
  - Stays squarely within the assigned pillar.
  - Is CLEARLY DIFFERENT from every already-published title/keyword you're given below — not just reworded, a genuinely distinct angle (different sub-topic, different audience segment, different format like "vs" comparison / myth-busting / how-to / checklist).
  - Is likely to rank on Google AND get cited by AI answer engines (clear, answerable, specific — not vague).

Consider the current month/season for relevance (e.g., Ramadan nutrition timing, summer cutting, winter bulking, New Year's resolution intent) only if it genuinely fits the assigned pillar — don't force it.

Return STRICT JSON only, no prose, no markdown fences:
{
  "topic": "string — a specific, compelling article topic (not just a keyword)",
  "focusKeyword": "string — the primary SEO keyword this topic targets",
  "rationale": "string — 1-2 sentences: why this has search demand and will win on Google + AI search right now"
}`;

export type TopicPick = {
  topic: string;
  focusKeyword: string;
  category: Pillar;
  rationale: string;
};

async function getRecentPosts(limit = 40): Promise<{ title: string; focusKeyword: string; category: string }[]> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("blog_posts" as any)
    .select("title, focus_keyword, category")
    .eq("language", "en")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map((p) => ({
    title: p.title || "",
    focusKeyword: p.focus_keyword || "",
    category: p.category || "",
  }));
}

/**
 * Deterministic round-robin: mandate whichever pillar hasn't been used
 * most recently. This is a hard guarantee in code, not left to the model's
 * judgment — the LLM only picks the specific angle *within* the pillar
 * this function assigns.
 */
export function pickRotationCategory(recent: { category: string }[]): Pillar {
  const lastUsedIndex = new Map<string, number>();
  recent.forEach((p, idx) => {
    if (p.category && !lastUsedIndex.has(p.category)) lastUsedIndex.set(p.category, idx); // 0 = most recent
  });
  const ranked = [...CONTENT_PILLARS].sort((a, b) => {
    const ai = lastUsedIndex.has(a) ? (lastUsedIndex.get(a) as number) : Infinity;
    const bi = lastUsedIndex.has(b) ? (lastUsedIndex.get(b) as number) : Infinity;
    return bi - ai; // pillar with the largest "posts since last used" comes first
  });
  return ranked[0];
}

export async function pickSmartTopic(): Promise<TopicPick> {
  const recent = await getRecentPosts();
  const category = pickRotationCategory(recent);

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Only show already-published posts from the SAME pillar as strict
  // no-repeat examples — posts from other pillars aren't relevant angle
  // competition, and showing too long a mixed list dilutes the prompt.
  const samePillar = recent.filter((p) => p.category === category);

  const userPrompt = `Current date context: ${monthLabel}.

ASSIGNED CONTENT PILLAR (mandatory, chosen by rotation — do not deviate): ${category}

ALREADY PUBLISHED IN THIS PILLAR (do not repeat or closely duplicate any of these):
${samePillar.length ? samePillar.map((t, i) => `${i + 1}. ${t.title} (kw: ${t.focusKeyword || "n/a"})`).join("\n") : "(none yet — this is the first post in this pillar)"}

Pick the single best next topic now, strictly within the "${category}" pillar.`;

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

  return {
    topic: String(parsed.topic),
    focusKeyword: String(parsed.focusKeyword),
    category,
    rationale: String(parsed.rationale || ""),
  };
}
