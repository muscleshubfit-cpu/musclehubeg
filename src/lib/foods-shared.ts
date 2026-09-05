/**
 * FOODS-SHARED — the client-safe slice of the food database.
 *
 * BUNDLE LAW (performance audit 2026-09-05): src/lib/foods.ts is a
 * 3.6MB / 97,310-line data file (8,830 foods). Any client component
 * importing it ships the whole array to the browser — /foods was
 * downloading a ~3MB JS chunk on a mobile-first Egyptian audience.
 *
 * This module contains ONLY types, label constants, the pure nutrition
 * calculator, and a count constant — a few hundred bytes. Client
 * components must import from HERE (or receive data via props from a
 * server component). The array itself (FOODS, getFoodBySlug,
 * filterFoods, getRelatedFoods, …) lives in foods.ts which is
 * server-only (`import "server-only"`).
 *
 * FOODS_COUNT is verified against the real array by
 * src/lib/__tests__/library-counts.test.ts — the test fails if the
 * data file grows without this constant being updated.
 */

export type FoodCategory =
  | "protein"
  | "carb"
  | "fat"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "nuts"
  | "snack"
  | "drink";

export type Food = {
  slug: string;
  nameAr: string;
  nameEn: string;
  category: FoodCategory;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  defaultServingAr: string;
  defaultServingEn: string;
  defaultGrams: number;
  tags: string[];
};

export const CATEGORY_LABELS: Record<FoodCategory, { ar: string; en: string; emoji: string; image: string }> = {
  protein: { ar: "بروتين", en: "Protein", emoji: "🥩", image: "/images/categories/foods/protein.png" },
  carb: { ar: "كارب", en: "Carbs", emoji: "🍚", image: "/images/categories/foods/carb.png" },
  fat: { ar: "دهون", en: "Fats", emoji: "🥑", image: "/images/categories/foods/fat.png" },
  vegetable: { ar: "خضار", en: "Vegetables", emoji: "🥦", image: "/images/categories/foods/vegetable.png" },
  fruit: { ar: "فواكه", en: "Fruits", emoji: "🍎", image: "/images/categories/foods/fruit.png" },
  dairy: { ar: "ألبان", en: "Dairy", emoji: "🥛", image: "/images/categories/foods/dairy.png" },
  nuts: { ar: "مكسرات", en: "Nuts", emoji: "🥜", image: "/images/categories/foods/nuts.png" },
  snack: { ar: "سناك", en: "Snacks", emoji: "🍫", image: "/images/categories/foods/snack.png" },
  drink: { ar: "مشروبات", en: "Drinks", emoji: "☕", image: "/images/categories/foods/drink.png" },
};

export const TAG_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  "high-protein": { ar: "عالي البروتين", en: "High Protein", color: "#0071e3" },
  "low-carb": { ar: "قليل الكارب", en: "Low Carb", color: "#34c759" },
  "keto-friendly": { ar: "كيتو", en: "Keto", color: "#ff9500" },
  vegan: { ar: "نباتي", en: "Vegan", color: "#34c759" },
  vegetarian: { ar: "vegetarian", en: "Vegetarian", color: "#34c759" },
  "low-fat": { ar: "قليل الدهون", en: "Low Fat", color: "#0071e3" },
  "high-fiber": { ar: "عالي الألياف", en: "High Fiber", color: "#8b5cf6" },
  "no-cook": { ar: "بدون طبخ", en: "No Cook", color: "#6e6e73" },
  "quick-prep": { ar: "تحضير سريع", en: "Quick Prep", color: "#ff9500" },
  "good-for-cutting": { ar: "للتخسيس", en: "For Cutting", color: "#ff3b30" },
  "good-for-bulking": { ar: "للتضخيم", en: "For Bulking", color: "#0071e3" },
};

/** Total foods in the database — keep in sync with foods.ts (test-enforced). */
export const FOODS_COUNT = 8830;

/** Popular filter tag ids used by the public food list UI. */
export const POPULAR_TAGS = ["high-protein", "low-carb", "keto-friendly", "vegan", "good-for-cutting", "good-for-bulking"];

/**
 * Pure nutrition calculator — no data dependency, safe for client use.
 * (Moved from foods.ts; re-exported there for server-side callers.)
 */
export function calculateNutrition(food: Food, grams: number) {
  if (!grams || grams <= 0 || isNaN(grams)) return null;
  const factor = grams / 100;
  return {
    grams,
    calories: Math.round(food.per100g.calories * factor),
    protein: Math.round(food.per100g.protein * factor * 10) / 10,
    carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
    fat: Math.round(food.per100g.fat * factor * 10) / 10,
    fiber: Math.round(food.per100g.fiber * factor * 10) / 10,
    sugar: Math.round(food.per100g.sugar * factor * 10) / 10,
  };
}
