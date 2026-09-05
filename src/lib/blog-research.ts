/**
 * src/lib/blog-research.ts — PIPELINE V3 · PHASE 0 (language-split)
 *
 * Keyword & Topic Research (owner directive 2026-08-27, refined same
 * day: EN and AR pipelines are FULLY SEPARATE — one P0 call researches
 * exactly ONE language; the two language workflows never share a queue
 * row). Uses the strongest free models first (INTERLEAVED_STRONGEST_CHAIN:
 * OpenRouter + Groq, strongest-first, automatic fall-through to the next
 * model on failure) to produce, for that ONE language:
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
import {
  getRecentPostsByLanguage,
  getRecentGeneratedTopics,
  pickRotationCategory,
  isDuplicateTopic,
} from "./blog-topics";

export type ResearchKeyword = { keyword: string; searchVolume: string };
export type ResearchFaq = { question: string; answer: string };

export type LanguageResearch = {
  keywords: ResearchKeyword[];
  faqs: ResearchFaq[];
  topics: string[];
};

export type Phase0Result = {
  lang: "en" | "ar";
  /** FLAT artifact — no {en, ar} nesting since the 2026-08-27 lang split. */
  research: LanguageResearch;
  category: string;
  source: string;
};

const NICHE_EN =
  "online fitness & nutrition coaching (Alkemos): workouts, muscle building, fat loss, healthy eating, supplements, recovery";

const NICHE_AR =
  "التدريب والتغذية الرياضية عبر الإنترنت (Alkemos): التمارين، بناء العضلات، حرق الدهون، الأكل الصحي، المكملات، الاستشفاء";

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

function normalizeResearch(rawInput: unknown): LanguageResearch {
  // Loose record view — model JSON fields are defensively coerced below.
  const raw = (typeof rawInput === "object" && rawInput !== null ? rawInput : {}) as Record<string, unknown>;
  const keywords: ResearchKeyword[] = Array.isArray(raw.keywords)
    ? (raw.keywords as unknown[])
        .map((k): ResearchKeyword => {
          if (typeof k === "string") return { keyword: k.trim(), searchVolume: "" };
          const r = (typeof k === "object" && k !== null ? k : {}) as Record<string, unknown>;
          return {
            keyword: String(r.keyword ?? "").trim(),
            searchVolume: String(r.searchVolume ?? r.volume ?? "").trim(),
          };
        })
        .filter((k: ResearchKeyword) => k.keyword.length > 2)
        .slice(0, 10)
    : [];

  const faqs: ResearchFaq[] = Array.isArray(raw.faqs)
    ? (raw.faqs as unknown[])
        .map((f): ResearchFaq => {
          const r = (typeof f === "object" && f !== null ? f : {}) as Record<string, unknown>;
          return {
            question: String(r.question ?? r.q ?? "").trim(),
            answer: String(r.answer ?? r.a ?? "").trim(),
          };
        })
        .filter((f: ResearchFaq) => f.question.length > 5 && f.answer.length > 2)
        .slice(0, 10)
    : [];

  return { keywords, faqs, topics: asStringArray(raw.topics, 5) };
}

/**
 * Deterministic curated fallback (pipeline never dies on provider outage).
 * VARIETY FIX (Phase 62): topics now ROTATE per run (random offset) and
 * non-duplicate topics against the provided recent titles are preferred,
 * so even the outage path no longer serves the same 5 ideas every time.
 */
export function fallbackResearch(lang: "en" | "ar", recentTitles: string[] = []): LanguageResearch {
  const rotate = (topics: string[]): string[] => {
    if (topics.length < 2) return topics;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s\u0600-\u06FF]/g, " ").replace(/\s+/g, " ").trim();
    const recentNorm = recentTitles.map(norm);
    const fresh = (t: string) => {
      const tNorm = norm(t);
      const words = tNorm.split(" ").filter((w) => w.length > 2);
      return !recentNorm.some((r) => r.includes(tNorm) || (words.length >= 2 && words.filter((w) => r.includes(w)).length / words.length >= 0.7));
    };
    const offset = Math.floor(Math.random() * topics.length);
    const rotated = topics.slice(offset).concat(topics.slice(0, offset));
    return [...rotated].sort((a, b) => Number(fresh(b)) - Number(fresh(a)));
  };
  if (lang === "ar") {
    return {
      keywords: [
        { keyword: "كم سعرة أحتاج يومياً لخسارة الوزن", searchVolume: "عالي" },
        { keyword: "جدول تغذية لبناء العضلات للمبتدئين", searchVolume: "عالي" },
        { keyword: "أفضل تمارين حرق دهون البطن في المنزل", searchVolume: "عالي" },
        { keyword: "كم جرام بروتين يحتاج الجسم يومياً لبناء العضلات", searchVolume: "عالي" },
        { keyword: "بروتين واي منافع وأضرار ومتى أشربه", searchVolume: "متوسط" },
        { keyword: "أفضل وقت للتمرين لبناء العضلات صباحاً أم مساءً", searchVolume: "متوسط" },
        { keyword: "أكل قبل وبعد التمرين بكمية وكام ساعة", searchVolume: "متوسط" },
        { keyword: "كيف أنشف بطني بدون فقدان عضلات", searchVolume: "عالي" },
        { keyword: "أفضل مكملات زيادة الوزن للنحاف", searchVolume: "متوسط" },
        { keyword: "النوم وبناء العضلات كم ساعة أحتاج", searchVolume: "منخفض" },
      ],
      faqs: [
        { question: "كم مرة أتدرب في الأسبوع لبناء العضلات؟", answer: "3-5 أيام أسبوعيًا تكفي مع تدرج في الأوزان." },
        { question: "هل الكارديو يحرق العضلات؟", answer: "الكارديو المعتدل لا يحرق العضلات إذا كانت سعراتك كافية." },
        { question: "ما أفضل وقت للتمرين؟", answer: "أي وقت يناسب جدولك باستمرار هو الأفضل." },
        { question: "كم سعرة أحتاج يومياً لخسارة الوزن؟", answer: "يعتمد على وزنك ونشاطك — احسبها بحاسبة السعرات ثم اطرح 300-500 سعرة." },
      ],
      topics: rotate([
        "الدليل الكامل لبناء العضلات للمبتدئين: من أين تبدأ خطوة بخطوة",
        "كيف تحسب سعراتك اليومية بدقة لخسارة الوزن أو التضخيم",
        "أخطاء شائعة تمنعك من حرق الدهون رغم التمرين اليومي",
        "أفكار وجبات صحية سريعة عالية البروتين للموظفين",
        "الاستشفاء والنوم: المفتاح المنسي لنتائج أسرع في الجيم",
      ]),
    };
  }
  return {
    keywords: [
      { keyword: "how many calories should i eat to lose weight", searchVolume: "high" },
      { keyword: "beginner workout plan at home no equipment", searchVolume: "high" },
      { keyword: "muscle building meal plan on a budget", searchVolume: "high" },
      { keyword: "best fat burning exercises for belly fat", searchVolume: "high" },
      { keyword: "how much protein do i need to build muscle per day", searchVolume: "high" },
      { keyword: "whey protein benefits and side effects", searchVolume: "medium" },
      { keyword: "pre workout nutrition what to eat and when", searchVolume: "medium" },
      { keyword: "push pull legs routine for beginners", searchVolume: "medium" },
      { keyword: "how to lose belly fat without losing muscle", searchVolume: "high" },
      { keyword: "best supplements for muscle gain for beginners", searchVolume: "medium" },
    ],
    faqs: [
      { question: "How many days a week should I train to build muscle?", answer: "3–5 sessions per week with progressive overload is enough." },
      { question: "Does cardio burn muscle?", answer: "Moderate cardio does not burn muscle if calories and protein are adequate." },
      { question: "What is the best time to work out?", answer: "Any time you can train consistently is the best time." },
      { question: "How many calories should I eat to lose weight?", answer: "Estimate your maintenance with a calorie calculator, then subtract 300–500 kcal." },
    ],
    topics: rotate([
      "The Complete Beginner's Guide to Building Muscle: Where to Start Step by Step",
      "How to Calculate Your Daily Calories Accurately for Fat Loss or Bulking",
      "Common Mistakes That Block Fat Loss Despite Daily Workouts",
      "Quick High-Protein Meal Ideas for Busy Professionals",
      "Recovery and Sleep: The Forgotten Key to Faster Gym Results",
    ]),
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

  // PHASE 62 VARIETY FIX: P0 previously had ZERO memory of published
  // content — the same trending suggestions regenerated every run. Feed
  // recent published + generated titles into the research prompt so the
  // 5 suggestions are forced onto UNCOVERED angles.
  const [recentPosts, recentJobs] = await Promise.all([
    getRecentPostsByLanguage(lang, 30),
    getRecentGeneratedTopics(lang, 15),
  ]);
  const recentTitles = [...recentPosts, ...recentJobs].map((p) => p.title).filter(Boolean);
  const recentBlock = recentTitles.length
    ? `THE BLOG HAS ALREADY PUBLISHED / GENERATED THESE RECENT TITLES (your 5 topic suggestions MUST cover NEW subjects or genuinely NEW angles — rewording any of these is a FAILURE):
${recentTitles.slice(0, 35).map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : "";

  const prompt = `You are an SEO research analyst. Niche: ${niche}.
${outLang}
Produce REALISTIC SEO research for a fitness/nutrition blog (use your training knowledge of what people search in this niche; volume labels are estimates like "high/medium/low").
${recentBlock}

LONG-TAIL KEYWORD LAW (owner directive 2026-09-01):
- At least 6 of the 10 keywords MUST be LONG-TAIL keywords: 3+ word phrases phrased the way real people search (question format, "how to…", "best … for …", "… vs …", or a very specific intent), NOT broad one/two-word head terms.
- Every FAQ question must be a REAL most-searched question in the fitness/nutrition niche (People-Also-Ask style, phrased exactly as users type it).
- Each of the 5 topic suggestions must target at least one LONG-TAIL keyword (a broad "protein guide" topic is a FAILURE; "how much protein do you really need per day to build muscle" is a WIN).
Return STRICT JSON only, no markdown fences:
{
  "keywords": [ {"keyword": "...", "searchVolume": "high|medium|low"} ],   // exactly 10 items — ≥6 long-tail (3+ words, real search phrasing)
  "faqs":     [ {"question": "...", "answer": "1-2 sentence direct answer"} ], // exactly 10 items — most-searched questions (People-Also-Ask style)
  "topics":   [ "..." ]   // exactly 5 specific, non-generic article topic suggestions NOT overlapping with the recent titles above; EACH must target a long-tail keyword above; VARY the article types across the 5 (guide / myth-busting / comparison / step-by-step plan / science deep-dive)
}`;

  try {
    const { text, model, provider } = await callFreeAIFallbackChain(prompt, {
      tag: "blog:research",
      temperature: 0.7,
      maxTokens: 2_500,
      jsonMode: true,
      // Native GHA budget override gives us room; still self-clamped by ai-provider.
      timeoutMs: 55_000,
      maxModels: 3,
    });
    const parsed = parseJSONLoose<Record<string, unknown>>(text);
    const data = parsed ? normalizeResearch(parsed) : null;
    if (data && data.topics.length > 0 && data.keywords.length >= 5) {
      console.log(`[blog-research] P0 ${lang} done (${provider}:${model}, kw:${data.keywords.length} faq:${data.faqs.length} topics:${data.topics.length})`);
      return { data, source: `${provider}:${model}` };
    }
    console.error(`[blog-research] P0 ${lang} invalid shape from ${provider}:${model} — using fallback`);
  } catch (e) {
    console.error(`[blog-research] P0 ${lang} chain failed: ${e instanceof Error ? e.message : e}`);
  }
  return { data: fallbackResearch(lang, recentTitles), source: "curated-fallback" };
}

/**
 * Runs Phase 0 for EXACTLY ONE language + picks the rotation category
 * the same deterministic way step1 used to. Insertion of the queue row
 * happens in the route handler (keeps this lib DB-free).
 */
export async function runPhase0Research(
  lang: "en" | "ar",
): Promise<Phase0Result> {
  const r = await researchLanguage(lang);
  // PHASE 62 BUGFIX: was getRecentPosts(100) which hard-codes language=en —
  // the AR pipeline's pillar rotation was blind to ALL AR history. Each
  // language now rotates against its OWN recent posts + generated jobs.
  const [recentOwn, recentJobs] = await Promise.all([
    getRecentPostsByLanguage(lang, 100),
    getRecentGeneratedTopics(lang, 20),
  ]);
  const recent = [...recentOwn, ...recentJobs];
  // Prefer topics that survived the dup-guard when ranking categories is
  // not applicable here — keep rotation semantics identical, but ALSO
  // pre-flag duplicate topics so P1's guard sees fewer all-dup sets.
  const research = {
    ...r.data,
    topics: r.data.topics.filter(
      (t) => !recent.some((p) => isDuplicateTopic(t, t, [p]).duplicate),
    ).length >= 2
      ? r.data.topics.filter(
          (t) => !recent.some((p) => isDuplicateTopic(t, t, [p]).duplicate),
        )
      : r.data.topics,
  };
  return {
    lang,
    research,
    category: pickRotationCategory(recent),
    source: `p0-${lang}:${r.source}`,
  };
}
