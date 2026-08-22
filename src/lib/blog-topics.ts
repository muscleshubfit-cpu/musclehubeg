import { parseJSON } from "@/lib/ai-provider";
import { callGemini } from "@/lib/gemini-wrapper";
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

const TOPIC_SYSTEM_PROMPT = `You are an SEO/GEO content strategist for a premium online fitness & nutrition coaching platform (MuscleHub, Egypt-focused, Arabic + English audience).

You will be told the EXACT content pillar to write about (it was already chosen by a rotation system — do not change it). Your job is to pick the single best, specific ARTICLE ANGLE within that pillar.

Requirements for the topic you pick:
 - Has genuine, evergreen or currently-seasonal search demand (something real people actually type into Google or ask ChatGPT/Perplexity about).
 - Stays squarely within the assigned pillar.
 - Is CLEARLY DIFFERENT from every already-published title/keyword you're given below — not just reworded, a genuinely distinct angle (different sub-topic, different audience segment, different format like "vs" comparison / myth-busting / how-to / checklist).
 - Is likely to rank on Google AND get cited by AI answer engines (clear, answerable, specific — not vague).

CRITICAL ANTI-REPETITION RULES:
 - You MUST NOT pick a topic that covers the same core subject, target audience, or primary advice as ANY recently published post listed below.
 - "Different" means a genuinely new angle — NOT a reworded version of the same topic.
 - If all obvious angles within this pillar have been covered, dig deeper: explore niche sub-topics, emerging research, specific population segments (e.g., women, seniors, post-injury, Ramadan-specific), or cross-pillar intersections.
 - Vary the article FORMAT each time: one time a how-to guide, next time a comparison, next time a myth-busting piece, next time a science deep-dive, next time a checklist.
 - The focusKeyword MUST be different from all previously used focus keywords listed below.

Consider the current month/season for relevance (e.g., Ramadan nutrition timing, summer cutting, winter bulking, New Year's resolution intent) only if it genuinely fits the assigned pillar — don't force it.

Return STRICT JSON only, no prose, no markdown fences:
{
  "topic": "string — a specific, compelling article topic (not just a keyword)",
  "focusKeyword": "string — the primary SEO keyword this topic targets (must be unique vs. all listed keywords)",
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

const CURATED_TOPIC_FALLBACKS: Record<
  Pillar,
  Array<{ topic: string; focusKeyword: string; rationale: string }>
> = {
  nutrition: [
    {
      topic: "High-Protein Egyptian Breakfasts: 5 Traditional Meals Optimized for Muscle Growth",
      focusKeyword: "high protein Egyptian breakfast",
      rationale: "High regional search volume with high practical utility for Middle Eastern fitness enthusiasts.",
    },
    {
      topic: "Carb Cycling for Fat Loss: Complete Guide with Macro Breakdown and Meal Timing",
      focusKeyword: "carb cycling for fat loss",
      rationale: "Targeting intermediate trainees looking for evidence-based fat loss strategies beyond simple calorie deficits.",
    },
    {
      topic: "Plant-Based Protein vs Whey: Muscle Protein Synthesis and Digestion Rates Compared",
      focusKeyword: "plant protein vs whey",
      rationale: "Addresses growing search queries around vegan vs dairy protein efficacy for hypertrophy.",
    },
    {
      topic: "Intermittent Fasting and Muscle Retention: What the Latest Science Says",
      focusKeyword: "intermittent fasting muscle retention",
      rationale: "Evergreen interest topic with strong intent regarding preserving lean mass during fasting.",
    },
  ],
  workout: [
    {
      topic: "Dumbbell-Only Upper Body Hypertrophy Routine: Full 4-Day Home Split",
      focusKeyword: "dumbbell upper body workout",
      rationale: "Extremely popular search intent for home gym and limited-equipment workouts.",
    },
    {
      topic: "How to Overcome a Bench Press Plateau: Biomechanics and Accessory Protocol",
      focusKeyword: "increase bench press strength",
      rationale: "High intent from lifters seeking actionable periodization and form fixes.",
    },
    {
      topic: "RPE vs Percentage-Based Training: Which Auto-Regulation Method Builds More Muscle?",
      focusKeyword: "RPE vs percentage training",
      rationale: "Appeals to serious lifters seeking advanced programming and fatigue management insights.",
    },
    {
      topic: "Fixing Forward Head Posture and Rounded Shoulders for Lifters: 10-Minute Mobility Routine",
      focusKeyword: "rounded shoulders posture fix lifters",
      rationale: "High search volume addressing common desk posture issues exacerbated by gym training.",
    },
  ],
  supplements: [
    {
      topic: "Creatine Monohydrate: Loading vs Daily 5g Protocol & Timing with Carbs",
      focusKeyword: "creatine monohydrate loading vs daily",
      rationale: "Number one researched fitness supplement with constant search intent around dosing protocols.",
    },
    {
      topic: "Ashwagandha (KSM-66) for Cortisol and Strength: What Clinical Trials Actually Show",
      focusKeyword: "ashwagandha benefits bodybuilding cortisol",
      rationale: "Trending supplement keyword with high interest in stress management and hormonal balance.",
    },
    {
      topic: "Electrolytes and Intra-Workout Hydration: Do You Really Need BCAAs or Salt?",
      focusKeyword: "intra workout electrolytes benefits",
      rationale: "Educational comparison answering search queries about workout hydration and fatigue prevention.",
    },
  ],
  "weight-loss": [
    {
      topic: "The Ultimate Guide to Beating Metabolic Adaptation During a Long Calorie Deficit",
      focusKeyword: "metabolic adaptation weight loss fix",
      rationale: "Answers crucial questions for dieters hitting frustrating fat loss plateaus.",
    },
    {
      topic: "How to Lose Fat Without Counting Calories: Visual Portion Guides & Satiety Index",
      focusKeyword: "fat loss without tracking calories",
      rationale: "High conversion topic for beginners and busy individuals seeking sustainable weight management.",
    },
    {
      topic: "NEAT (Non-Exercise Activity Thermogenesis): The Secret to Effortless Fat Burning",
      focusKeyword: "increase NEAT for fat loss",
      rationale: "Evidence-backed lifestyle strategy that consistently attracts high readership and shareability.",
    },
  ],
  "muscle-gain": [
    {
      topic: "Hardgainer Nutrition Blueprint: How to Eat 3500+ Clean Calories Without Bloating",
      focusKeyword: "hardgainer clean bulking diet",
      rationale: "High demand among skinny beginners struggling with appetite and digestive comfort.",
    },
    {
      topic: "Mechanical Tension vs Metabolic Stress: What Drives Hypertrophy the Most?",
      focusKeyword: "mechanical tension vs metabolic stress",
      rationale: "Scientific deep dive that establishes E-E-A-T authority and AI answer citations.",
    },
    {
      topic: "Optimal Training Volume: How Many Sets Per Muscle Group Per Week?",
      focusKeyword: "optimal weekly sets per muscle",
      rationale: "Core programming question with high recurring search interest.",
    },
  ],
  health: [
    {
      topic: "Sleep Hygiene for Athletes: How Deep Sleep Affects Testosterone and Recovery",
      focusKeyword: "sleep hygiene athletic recovery testosterone",
      rationale: "Increasing focus on wellness, sleep tracking, and holistic athletic longevity.",
    },
    {
      topic: "Managing Blood Pressure and Heart Health While Lifting Heavy Weights",
      focusKeyword: "weightlifting blood pressure heart health",
      rationale: "Crucial health topic addressing cardiovascular safety and resistance training benefits.",
    },
  ],
  recipes: [
    {
      topic: "5 High-Protein Egyptian Meals Under 500 Calories (Koshari & Fava Bean Hacks)",
      focusKeyword: "high protein Egyptian healthy recipes",
      rationale: "Strong regional appeal providing localized culinary adaptations for fitness goals.",
    },
    {
      topic: "Homemade High-Protein Meal Prep Bowls: 4 Balanced Lunches in 45 Minutes",
      focusKeyword: "quick high protein meal prep bowls",
      rationale: "Practical, actionable guide targeting busy professionals searching for meal planning ideas.",
    },
  ],
  science: [
    {
      topic: "The Science of Muscle SORENESS (DOMS): Does Muscle Soreness Mean Growth?",
      focusKeyword: "does muscle soreness mean growth DOMS",
      rationale: "Debunks one of the most common fitness myths with peer-reviewed physiology.",
    },
    {
      topic: "Anabolic Window Myth vs Reality: Nutrient Timing for Strength & Hypertrophy",
      focusKeyword: "anabolic window nutrient timing science",
      rationale: "Consistently searched fitness query requiring clear, authoritative consensus.",
    },
  ],
};

function getFallbackTopic(category: Pillar, recent: { title: string; focusKeyword: string }[]): TopicPick {
  const list = CURATED_TOPIC_FALLBACKS[category] || CURATED_TOPIC_FALLBACKS.nutrition;
  const recentLower = recent.map((r) => (r.title + " " + r.focusKeyword).toLowerCase());

  // Find one that hasn't been recently published
  const unused = list.find(
    (item) => !recentLower.some((t) => t.includes(item.focusKeyword.toLowerCase())),
  );

  const selected = unused || list[Math.floor(Math.random() * list.length)];
  return {
    topic: selected.topic,
    focusKeyword: selected.focusKeyword,
    category,
    rationale: selected.rationale,
  };
}

export async function pickSmartTopic(preferredCategory?: string): Promise<TopicPick> {
  const recent = await getRecentPosts();
  const category: Pillar =
    preferredCategory && (CONTENT_PILLARS as readonly string[]).includes(preferredCategory)
      ? (preferredCategory as Pillar)
      : pickRotationCategory(recent);

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const samePillar = recent.filter((p) => p.category === category);
  const otherRecent = recent.filter((p) => p.category !== category).slice(0, 15);

  const userPrompt = `Current date context: ${monthLabel}.

ASSIGNED CONTENT PILLAR: ${category}

RECENTLY PUBLISHED POSTS IN THIS PILLAR (MANDATORY: DO NOT duplicate, reword, or cover the same core topic/advice as any of these):
${samePillar.length ? samePillar.map((t, i) => `${i + 1}. "${t.title}" (Focus keyword: ${t.focusKeyword || "none"})`).join("\n") : "(none yet in this pillar)"}

ALREADY USED FOCUS KEYWORDS IN THIS PILLAR (MUST NOT reuse any of these):
${samePillar.length ? samePillar.map((t) => t.focusKeyword).filter(Boolean).join(", ") : "(none)"}

RECENT POSTS IN OTHER PILLARS (for overall site topic awareness — avoid overlapping with these too):
${otherRecent.length ? otherRecent.map((t, i) => `• "${t.title}" [${t.category}]`).join("\n") : "(none)"}

CRITICAL DIVERSITY & NO-REPETITION INSTRUCTIONS:
1. The topic MUST provide a FRESH, UNMET search angle within "${category}" that has NOT been covered by any post listed above.
2. The focusKeyword MUST be different from ALL listed focus keywords — not a variation or synonym of an existing one.
3. Explore diverse content archetypes:
   - Deep-dive biomechanics or scientific myth-busting
   - Exact practical step-by-step routines or meal prep strategies
   - Specific target demographics (beginners, busy professionals, athletes, women, post-injury recovery, seniors, Ramadan-specific)
   - Comparative analysis (X vs Y, Protocol A vs Protocol B)
   - Timely metabolic/seasonal health strategies
4. If this pillar already has many posts, pick a NICHE sub-topic rather than a broad overview.
5. The topic should answer a specific question a real person would search for.

Pick the single best, unique topic now strictly within the "${category}" pillar.`;

  try {
    const { text: raw } = await callGemini(
      userPrompt,
      {
        systemPrompt: TOPIC_SYSTEM_PROMPT,
        temperature: 0.85,
        maxTokens: 600,
        jsonMode: true,
        timeoutMs: 30_000,
      },
      2,
    );

    const parsed = parseJSON<any>(raw);
    if (parsed?.topic && parsed?.focusKeyword) {
      return {
        topic: String(parsed.topic),
        focusKeyword: String(parsed.focusKeyword),
        category,
        rationale: String(parsed.rationale || ""),
      };
    }
  } catch (err: any) {
    console.warn("[blog-topics] AI topic pick notice, using smart curated fallback:", err?.message || err);
  }

  // Graceful fallback to guaranteed valid topic
  return getFallbackTopic(category, recent);
}
