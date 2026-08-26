/**
 * src/lib/blog-research.ts — PIPELINE V2 · PHASE 0
 *
 * Keyword & Topic Research (owner directive 2026-08-27).
 * Uses the strongest free models first (INTERLEAVED_STRONGEST_CHAIN:
 * OpenRouter + Groq, strongest-first, automatic fall-through to the
 * next model on failure) to produce, PER LANGUAGE:
 *   • top 10 search keywords (with estimated search volume)
 *   • top 10 common questions with short answers
 *   • 5 article topic suggestions based on the analysis
 *
 * The niche is fixed: fitness / nutrition / workouts / health.
 * Output is stored on the queue row inside `article_bundle.research0`.
 * A deterministic curated fallback keeps the pipeline alive when every
 * model fails (never blocks the run).
 */
import { callFreeAIFallbackChain } from "./ai-provider";
import { getRecentPosts, pickRotationCategory } from "./blog-topics";

export type ResearchKeyword = { keyword: string; searchVolume: string };
export type ResearchFaq = { question: string; answer: string };

export type LanguageResearch = {
  keywords: ResearchKeyword[];
  faqs: ResearchFaq[];
  topics: string[];
};

export type Phase0Result = {
  en: LanguageResearch;
  ar: LanguageResearch;
  category: string;
  source: string;
};

const NICHE_EN =
  "online fitness & nutrition coaching (MuscleHubEG): workouts, muscle building, fat loss, healthy eating, supplements, recovery";

const NICHE_AR =
  "التدريب والتغذية الرياضية عبر الإنترنت (MuscleHubEG): التمارين، بناء العضلات، حرق الدهون، الأكل الصحي، المكملات، الاستشفاء";

export function parseJSONLoose<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 3)
    .map((s) => s.trim())
    .slice(0, max);
}

function normalizeResearch(raw: any): LanguageResearch {
  const keywords: ResearchKeyword[] = Array.isArray(raw?.keywords)
    ? raw.keywords
        .map((k: any) =>
          typeof k === "string"
            ? { keyword: k.trim(), searchVolume: "" }
            : { keyword: String(k?.keyword ?? "").trim(), searchVolume: String(k?.searchVolume ?? k?.volume ?? "").trim() },
        )
        .filter((k: ResearchKeyword) => k.keyword.length > 2)
        .slice(0, 10)
    : [];

  const faqs: ResearchFaq[] = Array.isArray(raw?.faqs)
    ? raw.faqs
        .map((f: any) => ({
          question: String(f?.question ?? f?.q ?? "").trim(),
          answer: String(f?.answer ?? f?.a ?? "").trim(),
        }))
        .filter((f: ResearchFaq) => f.question.length > 5 && f.answer.length > 2)
        .slice(0, 10)
    : [];

  return { keywords, faqs, topics: asStringArray(raw?.topics, 5) };
}

/** Deterministic curated fallback (pipeline never dies on provider outage). */
export function fallbackResearch(lang: "en" | "ar"): LanguageResearch {
  if (lang === "ar") {
    return {
      keywords: [
        { keyword: "تمارين زيادة العضلات", searchVolume: "عالي" },
        { keyword: "جدول تغذية لبناء العضلات", searchVolume: "عالي" },
        { keyword: "أفضل تمارين حرق الدهون", searchVolume: "عالي" },
        { keyword: "بروتين واي منافع وأضرار", searchVolume: "متوسط" },
        { keyword: "تمارين المبتدئين في الجيم", searchVolume: "عالي" },
        { keyword: "حساب السعرات اليومية", searchVolume: "متوسط" },
        { keyword: "أكل قبل وبعد التمرين", searchVolume: "متوسط" },
        { keyword: "تنشيف وحرق دهون البطن", searchVolume: "عالي" },
        { keyword: "أفضل مكملات زيادة الوزن", searchVolume: "متوسط" },
        { keyword: "النوم وبناء العضلات", searchVolume: "منخفض" },
      ],
      faqs: [
        { question: "كم مرة أتدرب في الأسبوع لبناء العضلات؟", answer: "3-5 أيام أسبوعيًا تكفي مع تدرج في الأوزان." },
        { question: "هل الكارديو يحرق العضلات؟", answer: "الكارديو المعتدل لا يحرق العضلات إذا كانت سعراتك كافية." },
        { question: "ما أفضل وقت للتمرين؟", answer: "أي وقت يناسب جدولك باستمرار هو الأفضل." },
      ],
      topics: [
        "الدليل الكامل لبناء العضلات للمبتدئين",
        "كيف تحسب سعراتك اليومية بدقة",
        "أخطاء شائعة تمنعك من حرق الدهون",
        "أفكار وجبات صحية سريعة لصحة أفضل",
        "الاستشفاء والنوم: المفتاح المنسي لنتائج أسرع",
      ],
    };
  }
  return {
    keywords: [
      { keyword: "beginner workout plan", searchVolume: "high" },
      { keyword: "muscle building meal plan", searchVolume: "high" },
      { keyword: "best fat burning exercises", searchVolume: "high" },
      { keyword: "whey protein benefits", searchVolume: "medium" },
      { keyword: "how many calories should i eat", searchVolume: "high" },
      { keyword: "push pull legs routine", searchVolume: "medium" },
      { keyword: "pre workout nutrition", searchVolume: "medium" },
      { keyword: "belly fat loss tips", searchVolume: "high" },
      { keyword: "best supplements for muscle gain", searchVolume: "medium" },
      { keyword: "recovery and sleep for athletes", searchVolume: "low" },
    ],
    faqs: [
      { question: "How many days a week should I train to build muscle?", answer: "3–5 sessions per week with progressive overload is enough." },
      { question: "Does cardio burn muscle?", answer: "Moderate cardio does not burn muscle if calories and protein are adequate." },
      { question: "What is the best time to work out?", answer: "Any time you can train consistently is the best time." },
    ],
    topics: [
      "The Complete Beginner's Guide to Building Muscle",
      "How to Calculate Your Daily Calories Accurately",
      "Common Mistakes That Block Fat Loss",
      "Quick Healthy Meal Ideas for Busy People",
      "Recovery and Sleep: The Forgotten Key to Faster Results",
    ],
  };
}

/**
 * PHASE 0 — one chain call per language, strongest free models first,
 * auto fall-through to next model on failure. Returns normalized data;
 * falls back to curated pools only after the whole chain fails.
 */
async function researchLanguage(lang: "en" | "ar"): Promise<{ data: LanguageResearch; source: string }> {
  const niche = lang === "ar" ? NICHE_AR : NICHE_EN;
  const outLang = lang === "ar"
    ? 'Respond in ARABIC. All keywords, questions, answers and topic titles MUST be in natural Arabic (Egyptian/Gulf friendly MSA).'
    : 'Respond in ENGLISH.';

  const prompt = `You are an SEO research analyst. Niche: ${niche}.
${outLang}
Produce REALISTIC SEO research for a fitness/nutrition blog (use your training knowledge of what people search in this niche; volume labels are estimates like "high/medium/low").
Return STRICT JSON only, no markdown fences:
{
  "keywords": [ {"keyword": "...", "searchVolume": "high|medium|low"} ],   // exactly 10 items
  "faqs":     [ {"question": "...", "answer": "1-2 sentence direct answer"} ], // exactly 10 items
  "topics":   [ "..." ]   // exactly 5 specific, non-generic article topic suggestions not covered by generic listicles; each targets at least one keyword above
}`;

  try {
    const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
      temperature: 0.6,
      maxTokens: 2_500,
      jsonMode: true,
      // Native GHA budget override gives us room; still self-clamped by ai-provider.
      timeoutMs: 55_000,
      maxModels: 3,
    });
    const parsed = parseJSONLoose<any>(text);
    const data = parsed ? normalizeResearch(parsed) : null;
    if (data && data.topics.length > 0 && data.keywords.length >= 5) {
      console.log(`[blog-research] P0 ${lang} done (${provider}:${model}, kw:${data.keywords.length} faq:${data.faqs.length} topics:${data.topics.length})`);
      return { data, source: `${provider}:${model}` };
    }
    console.error(`[blog-research] P0 ${lang} invalid shape from ${provider}:${model} — using fallback`);
  } catch (e: any) {
    console.error(`[blog-research] P0 ${lang} chain failed: ${e?.message || e}`);
  }
  return { data: fallbackResearch(lang), source: "curated-fallback" };
}

/**
 * Runs Phase 0 for BOTH languages + picks the rotation category the same
 * deterministic way step1 used to. Insertion of the queue row happens in
 * the route handler (keeps this lib DB-free).
 */
export async function runPhase0Research(): Promise<Phase0Result> {
  const [en, ar] = await Promise.all([researchLanguage("en"), researchLanguage("ar")]);
  const recent = await getRecentPosts(100);
  return {
    en: en.data,
    ar: ar.data,
    category: pickRotationCategory(recent),
    source: `p0:${en.source}|${ar.source}`,
  };
}
