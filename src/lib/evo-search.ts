/**
 * EVO Search — context-aware search across the platform's local databases.
 *
 * When a user asks EVO a question, this module searches:
 *   1. Exercises (55 exercises)
 *   2. Foods (80 foods)
 *   3. Workout Programs (7 programs)
 *   4. Tools (4 calculators)
 *
 * Returns relevant links that EVO can include in its response.
 *
 * This is CLIENT-SIDE search (fast, no API call needed).
 * Blog search is done separately via Supabase (server-side).
 */

import { EXERCISES } from "@/lib/exercises";
import { FOODS } from "@/lib/foods";
import { WORKOUT_PROGRAMS } from "@/lib/workout-programs";

export type SearchResult = {
  type: "exercise" | "food" | "program" | "tool";
  slug: string;
  nameAr: string;
  nameEn: string;
  url: string;
  description: string;
  relevance: number; // 0-1, higher = more relevant
};

// Food nutrition info for quick answers
export type FoodNutrition = {
  slug: string;
  nameAr: string;
  nameEn: string;
  url: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

const TOOLS = [
  {
    type: "tool" as const,
    slug: "calorie-calculator",
    nameAr: "حاسبة السعرات الحرارية",
    nameEn: "Calorie Calculator",
    url: "/tools/calorie-calculator",
    description: "احسب احتياجك اليومي من السعرات والماكروز",
    keywords: ["سعرات", "calories", "tdee", "bmr", "احتياج"],
  },
  {
    type: "tool" as const,
    slug: "bmi-calculator",
    nameAr: "حاسبة BMI",
    nameEn: "BMI Calculator",
    url: "/tools/bmi-calculator",
    description: "احسب مؤشر كتلة الجسم",
    keywords: ["bmi", "كتلة", "وزن مثالي", "mass index"],
  },
  {
    type: "tool" as const,
    slug: "macro-calculator",
    nameAr: "حاسبة الماكروز",
    nameEn: "Macro Calculator",
    url: "/tools/macro-calculator",
    description: "وزّع سعراتك على بروتين وكارب ودهون",
    keywords: ["ماكرو", "macro", "بروتين كارب دهون", "keto", "كيتو"],
  },
  {
    type: "tool" as const,
    slug: "body-fat-calculator",
    nameAr: "حاسبة نسبة الدهون",
    nameEn: "Body Fat Calculator",
    url: "/tools/body-fat-calculator",
    description: "احسب نسبة الدهون في جسمك",
    keywords: ["دهون", "fat", "body fat", "نسبة دهون"],
  },
];

/**
 * Normalize text for search — English-first, with Arabic support.
 * Removes stop words in BOTH languages so search works regardless of
 * which language the user types in.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove Arabic diacritics
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Normalize alef variants
    .replace(/[إأآ]/g, "ا")
    // Remove taa marbuta
    .replace(/ة/g, "ه")
    // Remove question marks (both languages)
    .replace(/[؟?]/g, " ")
    // Remove ENGLISH stop words (primary language)
    .replace(/\b(how|to|do|what|is|the|a|an|of|for|in|on|at|with|and|or|not|can|i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|its|our|their|this|that|these|those|are|was|were|been|being|have|has|had|will|would|could|should|may|might|must|shall|about|into|from|by|as|if|then|than|so|no|yes|please|tell|show|give|find|need|want|know|like|use|make|get|put|set|see|look|try|ask|say)\b/g, " ")
    // Remove ARABIC stop words (secondary language)
    .replace(/\b(ازاي|إزاي|كيف|في|من|عن|علي|على|ان|إن|و|او|أو|لا|ما|متى|مين|ليه|لماذا|هل|فيه|عايز|محتاج|كم|كام|ايه|إيه|شنو|ايش|اللي|الى|التي|الذي|بس|كمان|كده|دا|ده|دي|اكتر|اكثر|شوي|جد|جدا|قوي|نفس|زي|يبقى|كانه|كان|يكون|تكون|يقدر|تقدر|اعمل|اعرف|نعمل|تعال|قول|قولي|ممكن|سؤال|سوال|معلومة|استفسار)\b/g, " ")
    // Collapse spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate relevance score — how well does the query match the text?
 * Uses word-level matching, not raw substring (to avoid false positives
 * like "تمرين" matching "تمر" which is dates).
 */
function scoreMatch(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (!q || !t) return 0;

  // Exact match
  if (t === q) return 1;

  // Starts with query
  if (t.startsWith(q)) return 0.9;

  const words = t.split(" ").filter((w) => w.length > 1);
  const queryWords = q.split(" ").filter((w) => w.length > 1);

  // Contains query as a whole word
  if (words.some((w) => w === q)) return 0.85;

  // Word-level matching: count how many query words match text words
  let matchCount = 0;
  for (const qw of queryWords) {
    // Exact word match
    if (words.some((w) => w === qw)) {
      matchCount += 1;
      continue;
    }
    // Word starts with query word (e.g., "bench" matches "bench-press")
    if (words.some((w) => w.startsWith(qw) && qw.length >= 4)) {
      matchCount += 0.8;
      continue;
    }
    // Query word starts with text word (e.g., "benchpress" matches "bench")
    if (words.some((w) => qw.startsWith(w) && w.length >= 4)) {
      matchCount += 0.7;
      continue;
    }
  }

  if (matchCount > 0) {
    const ratio = matchCount / queryWords.length;
    // Require at least 50% of query words to match
    if (ratio >= 0.5) {
      return 0.6 + ratio * 0.3; // 0.6 to 0.9
    }
    // Single significant word match (length >= 4)
    if (queryWords.length === 1 && queryWords[0].length >= 4) {
      // Only match if the word is significant (not "تمر" which is too short)
      return 0;
    }
  }

  return 0;
}

/**
 * Search exercises by name, muscles, or equipment.
 */
function searchExercises(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  for (const ex of EXERCISES) {
    // Search in name (Arabic + English), primary muscles, equipment
    const searchText = [
      ex.nameAr,
      ex.nameEn,
      ex.primaryMuscles.join(" "),
      ex.secondaryMuscles.join(" "),
      ex.equipment,
    ].join(" ");

    const score = Math.max(
      scoreMatch(query, ex.nameAr),
      scoreMatch(query, ex.nameEn),
      scoreMatch(query, ex.primaryMuscles.join(" ")),
      scoreMatch(query, ex.equipment) * 0.8,
    );

    if (score > 0.3) {
      results.push({
        type: "exercise",
        slug: ex.slug,
        nameAr: ex.nameAr,
        nameEn: ex.nameEn,
        url: `/exercises/${ex.slug}`,
        description: `${ex.primaryMuscles.join(", ")} · ${ex.equipment}`,
        relevance: score,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
}

/**
 * Search foods by name or category.
 * Also returns nutrition info for quick answers.
 */
function searchFoods(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  for (const food of FOODS) {
    const score = Math.max(
      scoreMatch(query, food.nameAr),
      scoreMatch(query, food.nameEn),
      scoreMatch(query, food.category) * 0.7,
    );

    if (score > 0.3) {
      results.push({
        type: "food",
        slug: food.slug,
        nameAr: food.nameAr,
        nameEn: food.nameEn,
        url: `/foods/${food.slug}`,
        description: `${food.per100g.calories} kcal · ${food.per100g.protein}g protein per 100g`,
        relevance: score,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
}

/**
 * Search workout programs by name, level, or goal.
 */
function searchPrograms(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  for (const prog of WORKOUT_PROGRAMS) {
    const score = Math.max(
      scoreMatch(query, prog.nameAr),
      scoreMatch(query, prog.nameEn),
      scoreMatch(query, prog.level) * 0.8,
      scoreMatch(query, prog.location) * 0.8,
      scoreMatch(query, prog.goal) * 0.7,
    );

    if (score > 0.3) {
      results.push({
        type: "program",
        slug: prog.slug,
        nameAr: prog.nameAr,
        nameEn: prog.nameEn,
        url: `/programs/${prog.slug}`,
        description: `${prog.level} · ${prog.daysPerWeek} days/week · ${prog.durationWeeks} weeks`,
        relevance: score,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
}

/**
 * Search tools by name or keywords.
 */
function searchTools(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  for (const tool of TOOLS) {
    const keywordScore = Math.max(
      ...tool.keywords.map((kw) => scoreMatch(query, kw)),
    );
    const nameScore = Math.max(
      scoreMatch(query, tool.nameAr),
      scoreMatch(query, tool.nameEn),
    );
    const score = Math.max(keywordScore, nameScore);

    if (score > 0.3) {
      results.push({
        type: "tool",
        slug: tool.slug,
        nameAr: tool.nameAr,
        nameEn: tool.nameEn,
        url: tool.url,
        description: tool.description,
        relevance: score,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 2);
}

/**
 * Main search function — searches all local databases.
 * Returns combined results sorted by relevance.
 */
export function searchPlatform(query: string): SearchResult[] {
  const all = [
    ...searchExercises(query),
    ...searchFoods(query),
    ...searchPrograms(query),
    ...searchTools(query),
  ];

  return all.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

/**
 * Get nutrition info for a food (for quick answers like "how many calories in X?").
 */
export function getFoodNutrition(query: string): FoodNutrition | null {
  for (const food of FOODS) {
    const score = Math.max(
      scoreMatch(query, food.nameAr),
      scoreMatch(query, food.nameEn),
    );
    if (score > 0.5) {
      return {
        slug: food.slug,
        nameAr: food.nameAr,
        nameEn: food.nameEn,
        url: `/foods/${food.slug}`,
        per100g: {
          calories: food.per100g.calories,
          protein: food.per100g.protein,
          carbs: food.per100g.carbs,
          fat: food.per100g.fat,
        },
      };
    }
  }
  return null;
}

/**
 * Check if the query is asking about nutrition/calories of a specific food.
 * Returns true for queries like "كم سعرة دجاج" or "calories in chicken".
 */
export function isNutritionQuery(query: string): boolean {
  const q = normalize(query);
  const nutritionKeywords = [
    "سعرة",
    "سعرات",
    "كالوري",
    "calories",
    "cal",
    "ماكرو",
    "macro",
    "بروتين",
    "protein",
    "كارب",
    "carbs",
    "دهون",
    "fat",
  ];
  return nutritionKeywords.some((kw) => q.includes(normalize(kw)));
}

/**
 * Check if the query is asking about an exercise (how to do X).
 */
export function isExerciseQuery(query: string): boolean {
  const q = normalize(query);
  const exerciseKeywords = [
    "تمرين",
    "ازاي",
    "إزاي",
    "طريقة",
    "how to",
    "exercise",
    "how do",
    "تمارين",
  ];
  return exerciseKeywords.some((kw) => q.includes(normalize(kw)));
}

/**
 * Check if the query is asking for a program/workout plan.
 */
export function isProgramQuery(query: string): boolean {
  const q = normalize(query);
  const programKeywords = [
    "برنامج",
    "خطة",
    "program",
    "plan",
    "routine",
    "جدول",
    "تدريب",
    "workout",
  ];
  return programKeywords.some((kw) => q.includes(normalize(kw)));
}
