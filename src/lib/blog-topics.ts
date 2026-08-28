import { parseJSON } from "@/lib/ai-provider";
import { callFreeAIFallbackChain } from "@/lib/ai-provider";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Smart topic picker for the automated blog pipeline.
 *
 * EN/AR SEPARATION: This module maintains TWO separate topic pools:
 *   - EN_TOPIC_FALLBACKS: English topics (for English articles)
 *   - AR_TOPIC_FALLBACKS: Arabic topics (for Arabic articles)
 *
 * Each language has its own curated fallback list + its own AI prompt.
 * The `pickSmartTopic()` function accepts a `language` param ("en" | "ar")
 * and picks from the correct pool.
 *
 * Research-based topics (Aug 2026):
 * Each topic was identified via web search of trending fitness/nutrition
 * content. Topics span diverse niches to avoid the "muscle/protein/gain"
 * repetition pattern that plagued earlier versions.
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
  "fitness",
  "wellness",
] as const;

// Public read-only view (tests + tooling): the pillar set MUST stay in
// 1:1 sync with BLOG_CATEGORIES ids in src/lib/blog.ts.
export const PILLAR_IDS: readonly string[] = CONTENT_PILLARS;

type Pillar = (typeof CONTENT_PILLARS)[number];

// ─────────────────────────────────────────────────────────────────────────
// ENGLISH SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────
const TOPIC_SYSTEM_PROMPT_EN = `You are an SEO/GEO content strategist for MuscleHubEG (musclehubeg.vercel.app), a fitness & nutrition platform for an English-speaking audience.

You will be told the EXACT content pillar to write about. Pick the single best, specific ARTICLE ANGLE within that pillar.

Requirements:
 - Has genuine search demand (something real people search for on Google or ask AI assistants).
 - Stays squarely within the assigned pillar.
 - Is CLEARLY DIFFERENT from every already-published title/keyword listed below.
 - Is likely to rank on Google AND get cited by AI answer engines.

CRITICAL DIVERSITY RULES (the site already has too many "muscle gain" + "protein" posts):
 - For "muscle-gain": AVOID "how to gain muscle", "protein for muscle", "lean bulking", "hypertrophy vs strength" basics.
   Pick NICHE: muscle imbalances, unilateral training, mind-muscle connection, recovery protocols, deloading, periodization, muscle memory, sarcopenia.
 - For "nutrition": AVOID protein basics, calorie counting, macros 101.
   Pick: nutrient timing, micronutrients, fiber, hydration, circadian nutrition, Ramadan nutrition.
 - For "workout": AVOID "full body vs split", "best workout routine".
   Pick: biomechanics, tempo, rest intervals, drop sets, supersets, frequency.
 - For "supplements": AVOID "creatine basics", "best protein powder".
   Pick: caffeine, beta-alanine, vitamin D, omega-3, magnesium, specific dosing.
 - For "weight-loss": AVOID "how to lose weight", "calorie deficit".
   Pick: sleep, cortisol, reverse dieting, GLP-1, gut microbiome, NEAT.
 - For "health": AVOID generic "fitness for health".
   Pick: HRV, cold exposure, sunlight/vitamin D, mental health, longevity.
 - For "recipes": AVOID "high protein meals" (overused).
   Pick: high-fiber, meal prep, sugar-free, post-workout, Egyptian recipes.
 - For "science": AVOID "DOMS", "anabolic window".
   Pick: MPS, lactic acid myth, testosterone, genetics, muscle memory science.

Vary the article FORMAT each time: how-to guide, comparison, myth-busting, science deep-dive, checklist.

Return STRICT JSON only, no prose, no markdown fences:
{
  "topic": "string — specific, compelling article topic in ENGLISH",
  "focusKeyword": "string — primary English SEO keyword (must be unique)",
  "rationale": "string — 1-2 sentences: why this has search demand now"
}`;

// ─────────────────────────────────────────────────────────────────────────
// ARABIC SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────
const TOPIC_SYSTEM_PROMPT_AR = `أنت خبير استراتيجية محتوى SEO و GEO لمنصة MuscleHubEG (musclehubeg.vercel.app)، منصة لياقة وتغذية للجمهور العربي (مصر والخليج).

سيتم إخبارك بالقسم المحدد للكتابة فيه. اختر أفضل زاوية مقال محددة ضمن هذا القسم.

المتطلبات:
 - له طلب بحث حقيقي (شيء يبحث عنه الناس فعلاً على جوجل أو يسألون عنه المساعدين الذكيين).
 - يبقى ضمن القسم المحدد.
 - مختلف بوضوح عن كل عنوان/كلمة مفتاحية منشورة سابقاً مذكورة أدناه.
 - محتمل أن يترتي على جوجل ويُستشهد به في محركات البحث الذكية.

قواعد التنوع (الموقع به الكثير من مقالات "بناء العضلات" و"البروتين"):
 - لـ"muscle-gain": تجنب "كيفية بناء العضلات"، "البروتين للعضلات"، "التضخيم النظيف".
   اختر: عدم التوازن العضلي، التدريب الأحادي، الاتصال الذهني العضلي، التعافي، فك الحمل، التخطيط الدوري.
 - لـ"nutrition": تجنب أساسيات البروتين، عد السعرات.
   اختر: توقيت التغذية، المغذيات الدقيقة، الألياف، الترطيب، التغذية circadian، رمضان.
 - لـ"workout": تجنب "تمرين كامل مقابل تقسيم"، "أفضل روتين".
   اختر: البيوميكانيكا، الإيقاع، فترات الراحة، الدروب سيتس، السوبر سيتس.
 - لـ"supplements": تجنب "أساسيات الكرياتين"، "أفضل بروتين".
   اختر: الكافيين، بيتا ألانين، فيتامين D، أوميغا 3، المغنيسيوم.
 - لـ"weight-loss": تجنب "كيفية خسارة الوزن"، "عجز السعرات".
   اختر: النوم، الكورتيزول، النظام الغذائي العكسي، الميكروبيوم المعوي.
 - لـ"health": تجنب "اللياقة للصحة" عام.
   اختر: HRV، التعرض للبرد، ضوء الشمس، الصحة النفسية، طول العمر.
 - لـ"recipes": تجنب "وجبات عالية البروتين" (مستخدمة كثيراً).
   اختر: ألياف عالية، تحضير وجبات، سكر مجاني، وجبات ما بعد التمرين.
 - لـ"science": تجنب "DOMS"، "النافذة الأيضية".
   اختر: تخليق البروتين العضلي، خرافة حمض اللاكتيك، التستوستيرون، الوراثة.

تنوع في كل مرة: دليل عملي، مقارنة، دحض خرافة، تحليل علمي، قائمة مرجعية.

أعد JSON فقط، بدون نص خارج JSON:
{
  "topic": "string — موضوع مقال محدد وجذاب بالعربية",
  "focusKeyword": "string — الكلمة المفتاحية العربية الرئيسية (يجب أن تكون فريدة)",
  "rationale": "string — 1-2 جملة: لماذا له طلب بحثي الآن"
}`;

export type TopicPick = {
  topic: string;
  focusKeyword: string;
  category: Pillar;
  rationale: string;
};

export async function getRecentPosts(limit = 100): Promise<{ title: string; focusKeyword: string; category: string; slug: string }[]> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("blog_posts" as any)
    .select("title, focus_keyword, category, slug")
    .eq("language", "en")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map((p) => ({
    title: p.title || "",
    focusKeyword: p.focus_keyword || "",
    category: p.category || "",
    slug: p.slug || "",
  }));
}

export async function getRecentPostsByLanguage(lang: "en" | "ar", limit = 100): Promise<{ title: string; focusKeyword: string; category: string; slug: string }[]> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("blog_posts" as any)
    .select("title, focus_keyword, category, slug")
    .eq("language", lang)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map((p) => ({
    title: p.title || "",
    focusKeyword: p.focus_keyword || "",
    category: p.category || "",
    slug: p.slug || "",
  }));
}

/**
 * ROTATION MEMORY (2026-08-28c, owner: «عايز يكون فى تدوير لنوع المقالات»):
 * published posts alone made pickRotationCategory DEGENERATE while the blog
 * is young — with zero/sparse published rows every pillar scores Infinity,
 * the stable sort keeps CONTENT_PILLARS order and EVERY auto-pick landed on
 * "nutrition" (observed twice in a row in run 33168556482). Merging the
 * recent DONE article_generate job results (generated-but-not-yet-published
 * titles) into the rotation state fixes BOTH problems:
 *   1. the pillar genuinely rotates on EVERY generation, published or not;
 *   2. duplicate-check also sees titles the pipeline already generated, so
 *      two consecutive auto-picks can't land on near-identical topics.
 */
export async function getRecentGeneratedTopics(lang: "en" | "ar", limit = 20): Promise<{ title: string; focusKeyword: string; category: string; slug: string }[]> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("ai_jobs" as any)
    .select("result")
    .eq("job_type", "article_generate")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[])
    .map((r) => r?.result)
    .filter((res) => res && res.title && (res.language ?? lang) === lang)
    .map((res) => ({
      title: String(res.title || ""),
      focusKeyword: String(res.focus_keyword || ""),
      category: String(res.category || ""),
      slug: "",
    }));
}

/**
 * Stronger duplicate detector — checks BOTH exact match AND substring
 * overlap (≥70% of the focus keyword words appear in an existing title
 * or focus keyword).
 */
export function isDuplicateTopic(
  newTopic: string,
  newFocusKw: string,
  existing: { title: string; focusKeyword: string }[],
): { duplicate: boolean; matchedExisting?: string } {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s\u0600-\u06FF]/g, " ").replace(/\s+/g, " ").trim();
  const newTitleNorm = normalize(newTopic);
  const newKwNorm = normalize(newFocusKw);
  const newKwWords = newKwNorm.split(" ").filter((w) => w.length > 2);

  for (const ex of existing) {
    const exTitle = normalize(ex.title);
    const exKw = normalize(ex.focusKeyword);

    if (exTitle.includes(newKwNorm) || exKw.includes(newKwNorm)) {
      return { duplicate: true, matchedExisting: ex.title };
    }

    if (newKwWords.length >= 2) {
      const overlapCount = newKwWords.filter((w) => exTitle.includes(w) || exKw.includes(w)).length;
      const overlapPct = overlapCount / newKwWords.length;
      if (overlapPct >= 0.7) {
        return { duplicate: true, matchedExisting: ex.title };
      }
    }
  }
  return { duplicate: false };
}

/**
 * Deterministic round-robin: mandate whichever pillar hasn't been used
 * most recently.
 */
export function pickRotationCategory(recent: { category: string }[]): Pillar {
  const lastUsedIndex = new Map<string, number>();
  recent.forEach((p, idx) => {
    if (p.category && !lastUsedIndex.has(p.category)) lastUsedIndex.set(p.category, idx);
  });
  const ranked = [...CONTENT_PILLARS].sort((a, b) => {
    const ai = lastUsedIndex.has(a) ? (lastUsedIndex.get(a) as number) : Infinity;
    const bi = lastUsedIndex.has(b) ? (lastUsedIndex.get(b) as number) : Infinity;
    return bi - ai;
  });
  return ranked[0];
}

// ═════════════════════════════════════════════════════════════════════════
// ENGLISH CURATED TOPIC FALLBACKS (research-based, Aug 2026)
// ═════════════════════════════════════════════════════════════════════════
const EN_TOPIC_FALLBACKS: Record<
  Pillar,
  Array<{ topic: string; focusKeyword: string; rationale: string }>
> = {
  nutrition: [
    { topic: "Circadian Nutrition: How Meal Timing Affects Metabolism and Sleep", focusKeyword: "circadian nutrition meal timing", rationale: "Emerging science on chrononutrition with growing search interest." },
    { topic: "Fiber-Maxxing: Why 30g Daily Fiber Is the 2026 Nutrition Trend", focusKeyword: "fiber maxxing trend", rationale: "Top 2026 nutrition trend per multiple dietitian surveys." },
    { topic: "Micronutrient Deficiencies in Strength Athletes: Iron, Zinc, Magnesium", focusKeyword: "micronutrient deficiency athletes", rationale: "Underexplored topic with strong health implications." },
    { topic: "Meal Frequency Myths: Does Eating 6 Times a Day Boost Metabolism?", focusKeyword: "meal frequency metabolism myth", rationale: "Myth-busting with high search volume." },
    { topic: "Hydration Science: How Much Water Do Athletes Really Need?", focusKeyword: "athlete hydration guidelines", rationale: "Evergreen practical topic." },
    { topic: "Ramadan Nutrition: Maintaining Muscle While Fasting 16 Hours", focusKeyword: "ramadan nutrition muscle retention", rationale: "Seasonal but recurring high-demand topic." },
    { topic: "Caffeine and Performance: Optimal Dosing and Timing", focusKeyword: "caffeine performance dosing", rationale: "Most-used ergogenic aid with constant search interest." },
    { topic: "Gut Microbiome and Nutrition: How Bacteria Affect Absorption", focusKeyword: "gut microbiome nutrition", rationale: "Cutting-edge science with growing interest." },
    { topic: "Anti-Inflammatory Foods for Recovery: Omega-3, Turmeric, Ginger", focusKeyword: "anti-inflammatory foods recovery", rationale: "Recovery-focused nutrition topic." },
    { topic: "Sugar Alternatives: Stevia, Monk Fruit, Allulose Compared", focusKeyword: "sugar alternatives comparison", rationale: "Consumer education with high commercial intent." },
  ],
  workout: [
    { topic: "Mind-Muscle Connection: Scientific Evidence and Application", focusKeyword: "mind muscle connection science", rationale: "Trending among intermediate lifters." },
    { topic: "Tempo Training: How Slow Eccentrics Build More Muscle", focusKeyword: "tempo training hypertrophy", rationale: "Underexplored training variable." },
    { topic: "Drop Sets and Supersets: When to Use Intensity Techniques", focusKeyword: "drop sets supersets guide", rationale: "Practical guide for intermediates." },
    { topic: "Unilateral Training: Fixing Muscle Imbalances", focusKeyword: "unilateral training imbalances", rationale: "Niche topic addressing common issues." },
    { topic: "Deloading: The Science of Recovery Weeks", focusKeyword: "deloading science", rationale: "Important for long-term progress." },
    { topic: "Rest Interval Science: How Long Between Sets?", focusKeyword: "rest intervals between sets", rationale: "Fundamental programming question." },
    { topic: "Time-Efficient Training: 20-Minute Workouts That Work", focusKeyword: "time efficient workout 20 minutes", rationale: "Top 2026 fitness trend per ACSM." },
    { topic: "Strength Training for Older Adults: Programs After 50", focusKeyword: "strength training older adults", rationale: "Growing demographic per ACSM 2026 trends." },
    { topic: "Exercise Selection Biomechanics: Why Some Exercises Build More Muscle", focusKeyword: "exercise biomechanics muscle growth", rationale: "Science-based topic for serious lifters." },
    { topic: "Training Frequency: How Many Days Per Week Is Optimal?", focusKeyword: "optimal training frequency", rationale: "Core programming question." },
  ],
  supplements: [
    { topic: "Caffeine and Performance: Optimal Dosing, Timing, Tolerance", focusKeyword: "caffeine performance dosing timing", rationale: "Most-used supplement with constant interest." },
    { topic: "Beta-Alanine for Endurance: Does It Improve High-Rep Performance?", focusKeyword: "beta alanine endurance", rationale: "Underexplained supplement with evidence." },
    { topic: "Vitamin D for Athletes: Deficiency, Performance, Dosing", focusKeyword: "vitamin d deficiency athletes", rationale: "High-prevalence deficiency." },
    { topic: "Omega-3 Fish Oil: EPA/DHA Ratio for Recovery", focusKeyword: "omega 3 epa dha recovery", rationale: "Popular supplement with nuanced dosing." },
    { topic: "Magnesium for Athletes: Which Type and How Much?", focusKeyword: "magnesium athletes dosing", rationale: "Top supplement per ConsumerLab 2026 survey." },
    { topic: "Pre-Workout Ingredients: What Actually Works vs Hype", focusKeyword: "pre workout ingredients science", rationale: "Consumer education with high intent." },
    { topic: "Creatine Beyond Muscle: Cognitive Benefits and Brain Health", focusKeyword: "creatine cognitive benefits", rationale: "Emerging research on creatine's brain benefits." },
    { topic: "Ashwagandha (KSM-66): Cortisol and Strength Evidence", focusKeyword: "ashwagandha cortisol strength", rationale: "Trending adaptogen." },
    { topic: "Electrolytes for Athletes: Sodium, Potassium, Magnesium Balance", focusKeyword: "electrolytes athletes", rationale: "Hydration-focused supplement topic." },
    { topic: "Zinc for Testosterone: Does Supplementation Actually Work?", focusKeyword: "zinc testosterone supplement", rationale: "High-interest hormonal topic." },
  ],
  "weight-loss": [
    { topic: "Sleep and Weight Loss: How Poor Sleep Sabotages Fat Loss", focusKeyword: "sleep deprivation weight gain", rationale: "Emerging science connecting sleep to fat loss." },
    { topic: "Cortisol and Belly Fat: Stress's Role in Visceral Fat", focusKeyword: "cortisol belly fat stress", rationale: "Addresses stubborn fat loss." },
    { topic: "Reverse Dieting: Increasing Calories Without Gaining Fat", focusKeyword: "reverse dieting after diet", rationale: "Post-diet strategy." },
    { topic: "Intermittent Fasting Protocols: 16:8 vs 5:2 vs Alternate Day", focusKeyword: "intermittent fasting protocols", rationale: "Comparison with high search volume." },
    { topic: "GLP-1 Medications and Exercise: What Athletes Should Know", focusKeyword: "glp-1 weight loss exercise", rationale: "Trending 2026 weight loss topic." },
    { topic: "Gut Microbiome and Weight: How Bacteria Affect Metabolism", focusKeyword: "gut microbiome weight loss", rationale: "Cutting-edge science." },
    { topic: "NEAT: Non-Exercise Activity for Effortless Fat Burning", focusKeyword: "neat fat loss", rationale: "Lifestyle strategy with evidence." },
    { topic: "Metabolic Adaptation: Breaking Through Weight Loss Plateaus", focusKeyword: "metabolic adaptation plateau", rationale: "Addresses common dieter frustration." },
    { topic: "Satiety Index: Foods That Keep You Full Longest", focusKeyword: "satiety index foods", rationale: "Practical, actionable topic." },
    { topic: "Carb Cycling for Fat Loss: Complete Protocol Guide", focusKeyword: "carb cycling fat loss", rationale: "Evidence-based strategy." },
  ],
  "muscle-gain": [
    { topic: "Muscle Memory: How Quickly Can You Regain Lost Muscle?", focusKeyword: "muscle memory regain", rationale: "Fascinating topic for returning lifters." },
    { topic: "Sarcopenia Prevention: Strength Training After 40", focusKeyword: "sarcopenia prevention", rationale: "Aging demographic trend." },
    { topic: "Muscle Imbalances: Identifying and Fixing Asymmetry", focusKeyword: "muscle imbalances fix", rationale: "Common issue among lifters." },
    { topic: "Recovery Protocols: Active Recovery vs Complete Rest", focusKeyword: "active recovery vs rest", rationale: "Practical programming question." },
    { topic: "Periodization: Linear vs Undulating for Intermediates", focusKeyword: "periodization intermediate", rationale: "Advanced programming." },
    { topic: "Mechanical Tension vs Metabolic Stress: What Drives Growth?", focusKeyword: "mechanical tension metabolic stress", rationale: "Science deep-dive." },
    { topic: "Training Volume: How Many Sets Per Muscle Group Per Week?", focusKeyword: "optimal weekly sets per muscle", rationale: "Core programming question." },
    { topic: "Mind-Muscle Connection for Hypertrophy: Does It Matter?", focusKeyword: "mind muscle connection hypertrophy", rationale: "Trending training concept." },
    { topic: "Muscle Protein Synthesis: Complete Science of How Muscles Grow", focusKeyword: "muscle protein synthesis science", rationale: "Foundational science." },
    { topic: "Hardgainer Nutrition: Eating 3500+ Calories Without Bloating", focusKeyword: "hardgainer calories", rationale: "High-demand among skinny beginners." },
  ],
  health: [
    { topic: "Heart Rate Variability: What HRV Reveals About Recovery", focusKeyword: "heart rate variability recovery", rationale: "Wearable tech trend." },
    { topic: "Cold Exposure Therapy: Does Ice Bathing Improve Recovery?", focusKeyword: "cold exposure recovery", rationale: "Trending wellness topic." },
    { topic: "Sunlight and Vitamin D: Natural Production vs Supplementation", focusKeyword: "sunlight vitamin d production", rationale: "Holistic health topic." },
    { topic: "Mental Health and Exercise: How Training Reduces Anxiety", focusKeyword: "exercise mental health anxiety", rationale: "High search volume topic." },
    { topic: "Sleep Hygiene for Athletes: How Deep Sleep Affects Testosterone", focusKeyword: "sleep hygiene testosterone", rationale: "Athletic longevity topic." },
    { topic: "Blood Pressure and Weightlifting: Heart Health for Lifters", focusKeyword: "weightlifting blood pressure", rationale: "Cardiovascular safety topic." },
    { topic: "Longevity and Fitness: Training for a Longer Life", focusKeyword: "longevity fitness training", rationale: "Top 2026 health trend." },
    { topic: "Wearable Technology: Using Fitness Trackers Effectively", focusKeyword: "wearable fitness tracker guide", rationale: "Top fitness trend 2026 per ACSM." },
    { topic: "Hydration and Health: Beyond 8 Glasses a Day", focusKeyword: "hydration health guidelines", rationale: "Practical health topic." },
    { topic: "Stress Management for Athletes: Cortisol and Performance", focusKeyword: "stress cortisol performance", rationale: "Holistic health angle." },
  ],
  recipes: [
    { topic: "Post-Workout Meal Ideas: 5 Quick Recipes Under 500 Calories", focusKeyword: "post workout meal ideas", rationale: "Practical, actionable content." },
    { topic: "High-Fiber Egyptian Recipes: Traditional Dishes Made Healthier", focusKeyword: "high fiber egyptian recipes", rationale: "Regional appeal." },
    { topic: "Meal Prep for Busy Professionals: 3 Days of High-Protein Lunches", focusKeyword: "meal prep busy professionals", rationale: "Time-saving guide." },
    { topic: "Sugar-Free Dessert Recipes: 5 Options for Fitness Enthusiasts", focusKeyword: "sugar free dessert recipes", rationale: "Niche with high intent." },
    { topic: "High-Protein One-Pot Meals Ready in 30 Minutes", focusKeyword: "high protein one pot meals", rationale: "Practical time-saving recipes." },
    { topic: "Anti-Inflammatory Meal Plan: 7 Days of Recovery Foods", focusKeyword: "anti inflammatory meal plan", rationale: "Recovery-focused nutrition." },
    { topic: "High-Protein Egyptian Breakfasts: 5 Traditional Meals", focusKeyword: "high protein egyptian breakfast", rationale: "Regional breakfast ideas." },
    { topic: "Healthy Dinner Recipes Under 600 Calories", focusKeyword: "healthy dinner under 600 calories", rationale: "Calorie-conscious recipes." },
    { topic: "Meal Prep Bowls: 4 Balanced Lunches in 45 Minutes", focusKeyword: "meal prep bowls lunches", rationale: "Practical meal prep guide." },
    { topic: "Protein Smoothie Recipes: 5 Post-Workout Options", focusKeyword: "protein smoothie recipes", rationale: "Quick post-workout nutrition." },
  ],
  science: [
    { topic: "Muscle Protein Synthesis: Complete Science of How Muscles Grow", focusKeyword: "muscle protein synthesis science", rationale: "Foundational science." },
    { topic: "Lactic Acid Myth: What Really Causes Muscle Burn and Fatigue", focusKeyword: "lactic acid myth", rationale: "Common misconception." },
    { topic: "Testosterone and Training: How Workouts Affect Hormones", focusKeyword: "testosterone exercise response", rationale: "High-interest hormonal topic." },
    { topic: "Genetics and Muscle Growth: How Much Is Determined by DNA", focusKeyword: "genetics muscle growth", rationale: "Fascinating topic." },
    { topic: "Anabolic Window Myth: Nutrient Timing Reality", focusKeyword: "anabolic window myth", rationale: "Debunks common fitness myth." },
    { topic: "DOMS Science: Does Muscle Soreness Mean Growth?", focusKeyword: "doms muscle soreness growth", rationale: "Common fitness question." },
    { topic: "Muscle Fiber Types: Fast-Twitch vs Slow-Twitch Training", focusKeyword: "muscle fiber types training", rationale: "Science-based training topic." },
    { topic: "Recovery Science: How Long Does It Take to Recover?", focusKeyword: "muscle recovery time", rationale: "Practical science topic." },
    { topic: "Biomechanics of Hypertrophy: How Muscle Mechanics Work", focusKeyword: "biomechanics hypertrophy", rationale: "Deep science for serious lifters." },
    { topic: "Hormonal Response to Exercise: Cortisol, Testosterone, GH", focusKeyword: "hormonal response exercise", rationale: "Endocrinology of training." },
  ],
  fitness: [
    { topic: "Functional Fitness: Training for Real-Life Movement Patterns", focusKeyword: "functional fitness training", rationale: "Growing trend in fitness training." },
    { topic: "Mobility vs Flexibility: What's the Difference and Why It Matters", focusKeyword: "mobility vs flexibility", rationale: "Common confusion with high search volume." },
    { topic: "Bodyweight Training: Building Strength Without Equipment", focusKeyword: "bodyweight strength training", rationale: "Popular for home workouts." },
    { topic: "Balance Training: Why It Matters Beyond Yoga", focusKeyword: "balance training exercises", rationale: "Underexplored fitness topic." },
    { topic: "Cardio vs HIIT: Which Burns More Fat in Less Time?", focusKeyword: "cardio vs hiit fat loss", rationale: "Evergreen comparison topic." },
    { topic: "Cross Training: How Mixing Sports Improves Overall Fitness", focusKeyword: "cross training benefits", rationale: "Growing interest in multi-sport training." },
    { topic: "Agility Training: Speed, Quickness, and Reaction Time", focusKeyword: "agility training exercises", rationale: "Athletic performance niche." },
    { topic: "Posture Correction: Exercises to Fix Rounded Shoulders", focusKeyword: "posture correction exercises", rationale: "Desk-worker health concern." },
    { topic: "Core Strength vs Six-Pack: Why They're Not the Same", focusKeyword: "core strength vs abs", rationale: "Common fitness misconception." },
    { topic: "Progressive Overload: The Science of Getting Stronger", focusKeyword: "progressive overload training", rationale: "Fundamental training principle." },
  ],
  wellness: [
    { topic: "Sleep and Recovery: How Deep Sleep Builds Muscle", focusKeyword: "sleep muscle recovery", rationale: "Critical wellness topic for athletes." },
    { topic: "Stress and Cortisol: How Chronic Stress Sabotages Gains", focusKeyword: "stress cortisol muscle loss", rationale: "Wellness + fitness intersection." },
    { topic: "Mindful Eating: How Awareness Transforms Your Diet", focusKeyword: "mindful eating practice", rationale: "Growing wellness trend." },
    { topic: "Mental Health and Exercise: Endorphins, Anxiety, Depression", focusKeyword: "exercise mental health", rationale: "Important wellness topic." },
    { topic: "Breathing Exercises for Athletic Performance", focusKeyword: "breathing exercises athletes", rationale: "Underexplored wellness + fitness topic." },
    { topic: "Digital Detox: How Screen Time Affects Sleep and Recovery", focusKeyword: "screen time sleep recovery", rationale: "Modern wellness concern." },
    { topic: "Cold Water Immersion: Does Ice Bath Recovery Actually Work?", focusKeyword: "cold water immersion recovery", rationale: "Trending recovery topic." },
    { topic: "Hydration Beyond Water: Electrolytes and Athletic Performance", focusKeyword: "electrolytes athletic performance", rationale: "Practical wellness + nutrition." },
    { topic: "Circadian Rhythm: How Your Body Clock Affects Fitness", focusKeyword: "circadian rhythm fitness", rationale: "Emerging science topic." },
    { topic: "Burnout in Training: Signs You Need a Deload Week", focusKeyword: "training burnout deload", rationale: "Wellness + training intersection." },
  ],
};

// ═════════════════════════════════════════════════════════════════════════
// ARABIC CURATED TOPIC FALLBACKS (research-based, Aug 2026)
// ═════════════════════════════════════════════════════════════════════════
const AR_TOPIC_FALLBACKS: Record<
  Pillar,
  Array<{ topic: string; focusKeyword: string; rationale: string }>
> = {
  nutrition: [
    { topic: "التغذية circadian: كيف يؤثر توقيت الوجبات على الأيض والنوم", focusKeyword: "توقيت الوجبات circadian", rationale: "علم ناشئ باهتمام بحثي متزايد." },
    { topic: "الألياف الغذائية: لماذا 30 جرام يومياً يحسن الأداء وصحة الأمعاء", focusKeyword: "الألياف الغذائية للأبطال", rationale: "اتجاه 2026 الغذائي الرئيسي." },
    { topic: "نقص المغذيات الدقيقة عند الرياضيين: الحديد والزنك والمغنيسيوم", focusKeyword: "نقص المغذيات الرياضيين", rationale: "موضوع نادر ذو قيمة عالية." },
    { topic: "خرافة تعدد الوجبات: هل 6 وجبات يومياً ترفع الأيض فعلاً؟", focusKeyword: "تعدد الوجبات الأيض", rationale: "دحض خرافة شائعة." },
    { topic: "علم الترطيب: كمية الماء التي يحتاجها الرياضي فعلاً", focusKeyword: "ترطيب الرياضي", rationale: "موضوع عملي دائم الطلب." },
    { topic: "تغذية رمضان: الحفاظ على العضلات أثناء الصيام 16 ساعة", focusKeyword: "تغذية رمضان العضلات", rationale: "موسمي عالي الطلب." },
    { topic: "القهوة والأداء: الجرعة والتوقيت المثالي للكافيين", focusKeyword: "الكافيين الأداء الرياضي", rationale: "أكثر منشط استخداماً." },
    { topic: "الميكروبيوم المعوي والتغذية: كيف تؤثر البكتيريا على الامتصاص", focusKeyword: "الميكروبيوم المعوي", rationale: "علم متطور باهتمام متزايد." },
    { topic: "أطعمة مضادة للالتهابات للتعافي: أوميغا 3 والكركم والزنجبيل", focusKeyword: "أطعمة مضادة للالتهابات", rationale: "تغذية للتعافي." },
    { topic: "بدائل السكر: ستيفيا ومونك فروت والألولوز مقارنة", focusKeyword: "بدائل السكر الصحية", rationale: "تعليم المستهلك." },
  ],
  workout: [
    { topic: "الاتصال الذهني العضلي: الأدلة العلمية والتطبيق العملي", focusKeyword: "الاتصال الذهني العضلي", rationale: "موضوع رائج للمتدربين المتوسطين." },
    { topic: "تدريب الإيقاع: كيف تبني الحركة البطيئة عضلات أكثر", focusKeyword: "تدريب الإيقاع البطيء", rationale: "متغير تدريبي غير مستغل." },
    { topic: "الدروب سيتس والسوبر سيتس: متى تستخدم تقنيات الشدة", focusKeyword: "دروب سيتس سوبر سيتس", rationale: "دليل عملي للمتوسطين." },
    { topic: "التدريب الأحادي: إصلاح عدم التوازن العضلي", focusKeyword: "التدريب الأحادي", rationale: "موضوع نادر يعالج مشكلة شائعة." },
    { topic: "فك الحمل: علم أسابيع الراحة للتقدم طويل المدى", focusKeyword: "فك الحمل التعافي", rationale: "مهم للتقدم طويل المدى." },
    { topic: "فترات الراحة بين المجموعات: كم من الوقت هو الأمثل؟", focusKeyword: "فترات الراحة بين المجموعات", rationale: "سؤال برمجي أساسي." },
    { topic: "تدريب فعال للوقت: تمارين 20 دقيقة فعّالة", focusKeyword: "تمارين 20 دقيقة", rationale: "اتجاه 2026 الرئيسي." },
    { topic: "تدريب القوة لكبار السن: برامج بعد سن 50", focusKeyword: "تدريب القوة لكبار السن", rationale: "اتجاه ديموغرافي متنامي." },
    { topic: "بيوميكانيكا اختيار التمارين: لماذا تبني بعض التمارين عضلات أكثر", focusKeyword: "بيوميكانيكا التمارين", rationale: "موضوع علمي للمتدربين الجادين." },
    { topic: "تكرار التدريب: كم يوماً في الأسبوع هو الأمثل؟", focusKeyword: "تكرار التدريب الأسبوعي", rationale: "سؤال برمجي أساسي." },
  ],
  supplements: [
    { topic: "الكافيين والأداء: الجرعة والتوقيت وإدارة التحمل", focusKeyword: "الكافيين الأداء الرياضي", rationale: "أكثر مكمل استخداماً." },
    { topic: "بيتا ألانين للتحمل: هل يحسن الأداء عالي التكرار؟", focusKeyword: "بيتا ألانين التحمل", rationale: "مكمل بأدلة علمية." },
    { topic: "فيتامين D للرياضيين: النقص والأداء والجرعة المثالية", focusKeyword: "فيتامين D الرياضيين", rationale: "نقص منتشر." },
    { topic: "زيت السمك أوميغا 3: نسبة EPA/DHA للتعافي", focusKeyword: "أوميغا 3 التعافي", rationale: "مكمل شائع بأسئلة دقيقة." },
    { topic: "المغنيسيوم للرياضيين: أي نوع وكم؟", focusKeyword: "المغنيسيوم للرياضيين", rationale: "مكمل رئيسي 2026." },
    { topic: "مكونات ما قبل التمرين: ما الذي يعمل فعلاً مقابل التسويق", focusKeyword: "مكونات ما قبل التمرين", rationale: "تعليم المستهلك." },
    { topic: "الكرياتين وفوائده العقلية: صحة الدماغ", focusKeyword: "الكرياتين صحة الدماغ", rationale: "بحث ناشئ." },
    { topic: "أشواغاندا (KSM-66): الكورتيزول والقوة", focusKeyword: "أشواغاندا الكورتيزول", rationale: "أدابتوجين رائج." },
    { topic: "الإلكتروليت للرياضيين: توازن الصوديوم والبوتاسيوم والمغنيسيوم", focusKeyword: "الإلكتروليت الرياضي", rationale: "ترطيب مكملات." },
    { topic: "الزنك والتستوستيرون: هل يعمل المكمل فعلاً؟", focusKeyword: "الزنك التستوستيرون", rationale: "موضوع هرموني." },
  ],
  "weight-loss": [
    { topic: "النوم وخسارة الوزن: كيف يخرب قلة النوم فقدان الدهون", focusKeyword: "النوم خسارة الوزن", rationale: "علم ناشئ." },
    { topic: "الكورتيزول ودهون البطن: دور التوتر في الدهون الحشوية", focusKeyword: "الكورتيزول دهون البطن", rationale: "يعالج مشكلة شائعة." },
    { topic: "النظام الغذائي العكسي: زيادة السعرات دون اكتساب دهون", focusKeyword: "النظام الغذائي العكسي", rationale: "استراتيجية ما بعد الحمية." },
    { topic: "بروتوكولات الصيام المتقطع: 16:8 مقابل 5:2 مقابل اليوم البديل", focusKeyword: "بروتوكولات الصيام المتقطع", rationale: "مقارنة عالية البحث." },
    { topic: "أدوية GLP-1 والتمرين: ما يجب أن يعرفه الرياضيون", focusKeyword: "أدوية GLP-1 الرياضيين", rationale: "اتجاه 2026 لخسارة الوزن." },
    { topic: "الميكروبيوم المعوي والوزن: كيف تؤثر البكتيريا على الأيض", focusKeyword: "الميكروبيوم والوزن", rationale: "علم متطور." },
    { topic: "NEAT: النشاط غير الرياضي لحرق الدهون بدون جهد", focusKeyword: "NEAT حرق الدهون", rationale: "استراتيجية بأسلوب حياة." },
    { topic: "التكيف الأيضي:突破 عناء خسارة الوزن", focusKeyword: "التكيف الأيضي", rationale: "يعالج إحباط شائع." },
    { topic: "مؤشر الشبع: أطعمة تبقيك ممتلئاً لأطول فترة", focusKeyword: "مؤشر الشبع", rationale: "موضوع عملي." },
    { topic: "دورة الكربوهيدرات لخسارة الدهون: دليل كامل", focusKeyword: "دورة الكربوهيدرات", rationale: "استراتيجية علمية." },
  ],
  "muscle-gain": [
    { topic: "الذاكرة العضلية: كم بسرعة يمكنك استعادة العضلات المفقودة؟", focusKeyword: "الذاكرة العضلية", rationale: "موضوع مثير للرياضيين العائدين." },
    { topic: "وقاية الساركوبينيا: تدريب القوة بعد سن 40", focusKeyword: "الساركوبينيا الوقاية", rationale: "اتجاه ديموغرافي." },
    { topic: "عدم التوازن العضلي: كيف تحدد وتصلح عدم التناسق", focusKeyword: "عدم التوازن العضلي", rationale: "مشكلة شائعة." },
    { topic: "بروتوكولات التعافي: التعافي النشط مقابل الراحة الكاملة", focusKeyword: "التعافي النشط الراحة", rationale: "سؤال برمجي عملي." },
    { topic: "التخطيط الدوري: الخطي مقابل المتذبذب للمتوسطين", focusKeyword: "التخطيط الدوري", rationale: "برمجة متقدمة." },
    { topic: "التوتر الميكانيكي مقابل الإجهاد الأيضي: ما الذي يحفز النمو؟", focusKeyword: "التوتر الميكانيكي الإجهاد الأيضي", rationale: "تحليل علمي عميق." },
    { topic: "حجم التدريب: كم مجموعة لكل مجموعة عضلية أسبوعياً؟", focusKeyword: "حجم التدريب الأسبوعي", rationale: "سؤال برمجي أساسي." },
    { topic: "الاتصال الذهني العضلي لتضخيم: هل يهم فعلاً؟", focusKeyword: "الاتصال الذهني التضخيم", rationale: "مفهوم تدريبي رائج." },
    { topic: "تخليق البروتين العضلي: العلم الكامل لنمو العضلات", focusKeyword: "تخليق البروتين العضلي", rationale: "علم أساسي." },
    { topic: "تغذية هاردجاينر: أكل 3500+ سعرة بدون نفخة", focusKeyword: "تغذية هاردجاينر", rationale: "عالي الطلب للنحافين." },
  ],
  health: [
    { topic: "تغير معدل ضربات القلب: ماذا يكشف HRV عن تعافيك", focusKeyword: "HRV التعافي", rationale: "اتجاه التقنيات القابلة للارتداء." },
    { topic: "علاج التعرض للبرد: هل يحسن الاستحمام البارد التعافي؟", focusKeyword: "التعرض للبرد التعافي", rationale: "موضوع رائج." },
    { topic: "ضوء الشمس وفيتامين D: الإنتاج الطبيعي مقابل المكملات", focusKeyword: "ضوء الشمس فيتامين D", rationale: "موضوع صحة شامل." },
    { topic: "الصحة النفسية والتمرين: كيف يقلل التدريب القلق", focusKeyword: "التمرين الصحة النفسية", rationale: "موضوع عالي البحث." },
    { topic: "نظافة النوم للرياضيين: كيف يؤثر النوم العميق على التستوستيرون", focusKeyword: "نظافة النوم التستوستيرون", rationale: "طول العمر الرياضي." },
    { topic: "ضغط الدم ورفع الأثقال: صحة القلب للرياضيين", focusKeyword: "ضغط الدم رفع الأثقال", rationale: "سلامة القلب والأوعية." },
    { topic: "طول العمر واللياقة: التدريب لحياة أطول", focusKeyword: "طول العمر اللياقة", rationale: "اتجاه صحة 2026." },
    { topic: "التقنيات القابلة للارتداء: استخدام متتبعات اللياقة بفعالية", focusKeyword: "متتبعات اللياقة", rationale: "اتجاه لياقة 2026." },
    { topic: "الترطيب والصحة: ما بعد 8 أكواب يومياً", focusKeyword: "الترطيب الصحة", rationale: "موضوع صحة عملي." },
    { topic: "إدارة التوتر للرياضيين: الكورتيزول والأداء", focusKeyword: "إدارة التوتر الكورتيزول", rationale: "زاوية صحة شاملة." },
  ],
  recipes: [
    { topic: "أفكار وجبات ما بعد التمرين: 5 وصفات سريعة تحت 500 سعرة", focusKeyword: "وجبات ما بعد التمرين", rationale: "محتوى عملي." },
    { topic: "وصفات مصرية عالية الألياف: أطباق تقليدية صحية", focusKeyword: "وصفات مصرية ألياف", rationale: "جاذبية إقليمية." },
    { topic: "تحضير وجبات للمحترفين المشغولين: 3 أيام بروتين عالي", focusKeyword: "تحضير وجبات مشغولين", rationale: "دليل توفير وقت." },
    { topic: "وصفات حلويات بدون سكر: 5 خيارات لعشاق اللياقة", focusKeyword: "حلويات بدون سكر", rationale: "موضوع بنية عالية." },
    { topic: "وجبات عالية البروتين بوعاء واحد في 30 دقيقة", focusKeyword: "وجبات وعاء واحد بروتين", rationale: "وصفات توفير وقت." },
    { topic: "خطة وجبات مضادة للالتهابات: 7 أيام من أطعمة التعافي", focusKeyword: "خطة وجبات مضادة للالتهابات", rationale: "تغذية للتعافي." },
    { topic: "فطور مصري عالي البروتين: 5 وجبات تقليدية", focusKeyword: "فطور مصري بروتين", rationale: "أفكار فطور إقليمية." },
    { topic: "وصفات عشاء صحي تحت 600 سعرة", focusKeyword: "عشاء صحي 600 سعرة", rationale: "وصفات واعية بالسعرات." },
    { topic: "أوعية تحضير وجبات: 4 غداء متوازن في 45 دقيقة", focusKeyword: "أوعية تحضير وجبات", rationale: "دليل تحضير عملي." },
    { topic: "وصفات سموذي البروتين: 5 خيارات ما بعد التمرين", focusKeyword: "سموذي البروتين", rationale: "تغذية سريعة." },
  ],
  science: [
    { topic: "تخليق البروتين العضلي: العلم الكامل لنمو العضلات", focusKeyword: "تخليق البروتين العضلي", rationale: "علم أساسي." },
    { topic: "خرافة حمض اللاكتيك: ما الذي يسبب حرق العضلات والتعب فعلاً", focusKeyword: "خرافة حمض اللاكتيك", rationale: "مفهوم خاطئ شائع." },
    { topic: "التستوستيرون والتمرين: كيف تؤثر التمارين على الهرمونات", focusKeyword: "التستوستيرون التمرين", rationale: "موضوع هرموني مثير." },
    { topic: "الوراثة ونمو العضلات: كم يحدد DNA من إمكاناتك", focusKeyword: "الوراثة نمو العضلات", rationale: "موضوع مثير للاهتمام." },
    { topic: "خرافة النافذة الأيضية: حقيقة توقيت التغذية", focusKeyword: "النافذة الأيضية", rationale: "دحض خرافة لياقة." },
    { topic: "علم DOMS: هل تعني وجع العضلات نموها؟", focusKeyword: "DOMS وجع العضلات", rationale: "سؤال لياقة شائع." },
    { topic: "أنواع ألياف العضلات: تدريب السريع مقابل البطيء", focusKeyword: "أنواع ألياف العضلات", rationale: "موضوع تدريب علمي." },
    { topic: "علم التعافي: كم يستغرق التعافي من التمرين؟", focusKeyword: "وقت التعافي العضلي", rationale: "موضوع علمي عملي." },
    { topic: "بيوميكانيكا التضخيم: كيف تعمل ميكانيكا العضلات", focusKeyword: "بيوميكانيكا التضخيم", rationale: "علم عميق للمتدربين." },
    { topic: "الاستجابة الهرمونية للتمرين: الكورتيزول والتستوستيرون", focusKeyword: "الاستجابة الهرمونية", rationale: "علم الغدد الصماء." },
  ],
  fitness: [
    { topic: "اللياقة الوظيفية: التدريب لحركات الحياة اليومية", focusKeyword: "اللياقة الوظيفية", rationale: "اتجاه متنامي في التدريب." },
    { topic: "المرونة مقابل المطاطية: الفرق ولماذا يهم", focusKeyword: "المرونة مقابل المطاطية", rationale: "ارتباك شائع بحجم بحث عالي." },
    { topic: "تدريب وزن الجسم: بناء القوة بدون معدات", focusKeyword: "تدريب وزن الجسم قوة", rationale: "شائع للتمارين المنزلية." },
    { topic: "تدريب التوازن: لماذا يهم أكثر من اليوجا", focusKeyword: "تمارين التوازن", rationale: "موضوع لياقة غير مستكشف." },
    { topic: "كارديو مقابل HIIT: أيهما يحرق دهون أكثر في وقت أقل؟", focusKeyword: "كارديو مقابل hiit", rationale: "مقارنة دائمة." },
    { topic: "التصحيح الوضعي: تمارين لتعديل الأكتاف المنحنية", focusKeyword: "تصحيح الوضع", rationale: "مخاوف صحة العاملين." },
  ],
  wellness: [
    { topic: "النوم والتعافي: كيف يبني النوم العميق العضلات", focusKeyword: "النوم تعافي العضلات", rationale: "موضوع عافية حاسم للرياضيين." },
    { topic: "التوتر والكورتيزول: كيف يخرب التوتر المزمن اكتسابك", focusKeyword: "التوتر كورتيزول العضلات", rationale: "تقاطع عافية ولياقة." },
    { topic: "الأكل الواعي: كيف يحول الوعي نظامك الغذائي", focusKeyword: "الأكل الواعي", rationale: "اتجاه عافية متنامي." },
    { topic: "الصحة النفسية والتمرين: الإندورفين والقلق والاكتئاب", focusKeyword: "التمرين الصحة النفسية", rationale: "موضوع عافية مهم." },
    { topic: "غمر الماء البارد: هل حمام الثلج يعزز التعافي فعلاً؟", focusKeyword: "غمر الماء البارد تعافي", rationale: "موضوع تعافي رائج." },
    { topic: "الإرهاق في التدريب: علامات تحتاج أسبوع تخفيف", focusKeyword: "إرهاق التدريب تخفيف", rationale: "تقاطع عافية وتدريب." },
  ],
};

function getFallbackTopic(
  category: Pillar,
  recent: { title: string; focusKeyword: string }[],
  language: "en" | "ar" = "en",
): TopicPick {
  const list = (language === "ar" ? AR_TOPIC_FALLBACKS : EN_TOPIC_FALLBACKS)[category] || EN_TOPIC_FALLBACKS.nutrition;
  const recentLower = recent.map((r) => (r.title + " " + r.focusKeyword).toLowerCase());

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

/**
 * Pick a smart topic for article generation.
 *
 * EN/AR SEPARATION: The `language` param controls which pool to pick from:
 *   - "en" (default): English topic pool + English AI prompt
 *   - "ar": Arabic topic pool + Arabic AI prompt
 *
 * The topic returned is in the requested language. Downstream stages
 * (article generation) use this topic as the article's subject.
 */
export async function pickSmartTopic(
  preferredCategory?: string,
  language: "en" | "ar" = "en",
): Promise<TopicPick> {
  // ROTATION MEMORY: published posts + recently GENERATED (possibly
  // unpublished) article_generate results — see getRecentGeneratedTopics.
  const [published, generated] = await Promise.all([
    getRecentPostsByLanguage(language),
    getRecentGeneratedTopics(language),
  ]);
  const recent = [...published, ...generated];
  const category: Pillar =
    preferredCategory && (CONTENT_PILLARS as readonly string[]).includes(preferredCategory)
      ? (preferredCategory as Pillar)
      : recent.length
        ? pickRotationCategory(recent)
        // COLD-START ROTATION: with zero history the stable sort would pin
        // the first pillar forever — randomize instead so even the very
        // first auto-picks spread across the content types.
        : CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const samePillar = recent.filter((p) => p.category === category);
  const otherRecent = recent.filter((p) => p.category !== category).slice(0, 15);

  const systemPrompt = language === "ar" ? TOPIC_SYSTEM_PROMPT_AR : TOPIC_SYSTEM_PROMPT_EN;

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

Pick the single best, unique topic now strictly within the "${category}" pillar.

IMPORTANT: Return the topic and focusKeyword in ${language === "ar" ? "ARABIC" : "ENGLISH"}.`;

  try {
    const { text: raw } = await callFreeAIFallbackChain(
      userPrompt,
      {
        tag: `blog:topics-${language}`,
        systemPrompt,
        temperature: 0.85,
        // 800 (was 600): Groq json_validate_failed "max completion…" truncation
        // observed 2026-08-28 — the topic JSON occasionally clipped at 600.
        // Still far under the Groq 7200 eligibility line (≈2150 est).
        maxTokens: 800,
        jsonMode: true,
        timeoutMs: 22_000,
        maxModels: 2, // Vercel Hobby budget
      },
    );
    console.log(`[blog-topics] Topic pick raw response (language: ${language}, length: ${raw.length})`);

    const parsed = parseJSON<any>(raw);
    if (parsed?.topic && parsed?.focusKeyword) {
      const aiTopic = String(parsed.topic);
      const aiFocusKw = String(parsed.focusKeyword);

      const dupCheck = isDuplicateTopic(aiTopic, aiFocusKw, recent);
      if (dupCheck.duplicate) {
        console.warn(
          `[blog-topics] AI picked a duplicate topic "${aiTopic}" (kw: "${aiFocusKw}") — matches existing "${dupCheck.matchedExisting}". Falling back to curated.`,
        );
      } else {
        return {
          topic: aiTopic,
          focusKeyword: aiFocusKw,
          category,
          rationale: String(parsed.rationale || ""),
        };
      }
    } else {
      console.error(`[blog-topics] AI returned invalid JSON. Parsed keys: ${parsed ? Object.keys(parsed).join(", ") : "null"}. Raw (first 500): ${raw.slice(0, 500)}`);
    }
  } catch (err: any) {
    console.warn("[blog-topics] AI topic pick notice, using smart curated fallback:", err?.message || err);
  }

  return getFallbackTopic(category, recent, language);
}
