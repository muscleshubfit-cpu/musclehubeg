/**
 * Foods Library — database of foods with full nutrition info.
 *
 * Each food has:
 *   - slug (URL-friendly ID)
 *   - name (Arabic + English)
 *   - category (protein, carb, fat, vegetable, fruit, dairy, nuts, snack, drink)
 *   - serving size (default, e.g. "100g" or "1 medium")
 *   - nutrition per 100g: calories, protein, carbs, fat, fiber, sugar
 *   - image URL (Unsplash — specific photo IDs, verified)
 *   - tags (e.g. "high-protein", "low-carb", "keto-friendly")
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

export const CATEGORY_LABELS: Record<FoodCategory, { ar: string; en: string; emoji: string }> = {
  protein: { ar: "بروتين", en: "Protein", emoji: "🥩" },
  carb: { ar: "كارب", en: "Carbs", emoji: "🍚" },
  fat: { ar: "دهون", en: "Fats", emoji: "🥑" },
  vegetable: { ar: "خضار", en: "Vegetables", emoji: "🥦" },
  fruit: { ar: "فواكه", en: "Fruits", emoji: "🍎" },
  dairy: { ar: "ألبان", en: "Dairy", emoji: "🥛" },
  nuts: { ar: "مكسرات", en: "Nuts", emoji: "🥜" },
  snack: { ar: "سناك", en: "Snacks", emoji: "🍫" },
  drink: { ar: "مشروبات", en: "Drinks", emoji: "☕" },
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

export const FOODS: Food[] = [
  // ==================== PROTEIN (12) ====================
  {
    slug: "chicken-breast",
    nameAr: "صدور دجاج",
    nameEn: "Chicken Breast",
    category: "protein",
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
    defaultServingAr: "1 صدر متوسط",
    defaultServingEn: "1 medium breast",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "low-fat", "keto-friendly", "good-for-cutting", "no-cook"],
  },
  {
    slug: "lean-beef",
    nameAr: "لحم بقري قليل الدهن",
    nameEn: "Lean Beef",
    category: "protein",
    per100g: { calories: 217, protein: 26, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    defaultServingAr: "1 قطعة متوسطة",
    defaultServingEn: "1 medium piece",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "good-for-bulking"],
  },
  {
    slug: "salmon",
    nameAr: "سلمون",
    nameEn: "Salmon",
    category: "protein",
    per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0 },
    defaultServingAr: "1 فيليه متوسط",
    defaultServingEn: "1 medium fillet",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "keto-friendly", "good-for-bulking"],
  },
  {
    slug: "tuna",
    nameAr: "تونة (معلبة)",
    nameEn: "Canned Tuna",
    category: "protein",
    per100g: { calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, sugar: 0 },
    defaultServingAr: "1 علبة",
    defaultServingEn: "1 can",
    defaultGrams: 100,
    tags: ["high-protein", "low-carb", "low-fat", "keto-friendly", "good-for-cutting", "no-cook", "quick-prep"],
  },
  {
    slug: "eggs",
    nameAr: "بيض كامل",
    nameEn: "Whole Eggs",
    category: "protein",
    per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1 },
    defaultServingAr: "2 بيضات",
    defaultServingEn: "2 eggs",
    defaultGrams: 100,
    tags: ["high-protein", "low-carb", "keto-friendly", "vegetarian", "quick-prep"],
  },
  {
    slug: "egg-whites",
    nameAr: "بياض البيض",
    nameEn: "Egg Whites",
    category: "protein",
    per100g: { calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0, sugar: 0.7 },
    defaultServingAr: "4 بياض بيض",
    defaultServingEn: "4 egg whites",
    defaultGrams: 120,
    tags: ["high-protein", "low-carb", "low-fat", "good-for-cutting", "quick-prep"],
  },
  {
    slug: "turkey-breast",
    nameAr: "صدور ديك رومي",
    nameEn: "Turkey Breast",
    category: "protein",
    per100g: { calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0, sugar: 0 },
    defaultServingAr: "100g",
    defaultServingEn: "100g",
    defaultGrams: 100,
    tags: ["high-protein", "low-carb", "low-fat", "good-for-cutting"],
  },
  {
    slug: "shrimp",
    nameAr: "جمبري",
    nameEn: "Shrimp",
    category: "protein",
    per100g: { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0 },
    defaultServingAr: "150g",
    defaultServingEn: "150g",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "low-fat", "keto-friendly", "good-for-cutting"],
  },
  {
    slug: "tilapia",
    nameAr: "بلطي",
    nameEn: "Tilapia",
    category: "protein",
    per100g: { calories: 128, protein: 26, carbs: 0, fat: 3, fiber: 0, sugar: 0 },
    defaultServingAr: "1 فيليه",
    defaultServingEn: "1 fillet",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "low-fat", "good-for-cutting"],
  },
  {
    slug: "ground-beef-lean",
    nameAr: "لحم مفروم قليل الدهن",
    nameEn: "Lean Ground Beef",
    category: "protein",
    per100g: { calories: 193, protein: 27, carbs: 0, fat: 9, fiber: 0, sugar: 0 },
    defaultServingAr: "150g",
    defaultServingEn: "150g",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "good-for-bulking"],
  },
  {
    slug: "pork-tenderloin",
    nameAr: "لحم خنزير (تندرلوين)",
    nameEn: "Pork Tenderloin",
    category: "protein",
    per100g: { calories: 143, protein: 26, carbs: 0, fat: 3.5, fiber: 0, sugar: 0 },
    defaultServingAr: "150g",
    defaultServingEn: "150g",
    defaultGrams: 150,
    tags: ["high-protein", "low-carb", "low-fat", "good-for-cutting"],
  },
  {
    slug: "tofu",
    nameAr: "توفو",
    nameEn: "Tofu",
    category: "protein",
    per100g: { calories: 144, protein: 17, carbs: 3, fat: 9, fiber: 2, sugar: 1 },
    defaultServingAr: "100g",
    defaultServingEn: "100g",
    defaultGrams: 100,
    tags: ["high-protein", "low-carb", "vegan", "vegetarian", "good-for-cutting"],
  },

  // ==================== CARBS (15) ====================
  {
    slug: "white-rice",
    nameAr: "أرز أبيض (مطبوخ)",
    nameEn: "White Rice (Cooked)",
    category: "carb",
    per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 150,
    tags: ["low-fat", "good-for-bulking", "quick-prep"],
  },
  {
    slug: "brown-rice",
    nameAr: "أرز بني (مطبوخ)",
    nameEn: "Brown Rice (Cooked)",
    category: "carb",
    per100g: { calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.8, sugar: 0.2 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 150,
    tags: ["low-fat", "high-fiber", "good-for-bulking"],
  },
  {
    slug: "oatmeal",
    nameAr: "شوفان",
    nameEn: "Oatmeal",
    category: "carb",
    per100g: { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 10, sugar: 0 },
    defaultServingAr: "1/2 كوب (جاف)",
    defaultServingEn: "1/2 cup (dry)",
    defaultGrams: 40,
    tags: ["high-fiber", "vegetarian", "vegan", "good-for-bulking", "quick-prep"],
  },
  {
    slug: "potato",
    nameAr: "بطاطس",
    nameEn: "Potato",
    category: "carb",
    per100g: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8 },
    defaultServingAr: "1 بطاطس متوسطة",
    defaultServingEn: "1 medium potato",
    defaultGrams: 150,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "sweet-potato",
    nameAr: "بطاطا حلوة",
    nameEn: "Sweet Potato",
    category: "carb",
    per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugar: 4.2 },
    defaultServingAr: "1 بطاطا متوسطة",
    defaultServingEn: "1 medium sweet potato",
    defaultGrams: 150,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "whole-wheat-bread",
    nameAr: "خبز أسمر",
    nameEn: "Whole Wheat Bread",
    category: "carb",
    per100g: { calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, sugar: 5 },
    defaultServingAr: "1 شريحة",
    defaultServingEn: "1 slice",
    defaultGrams: 30,
    tags: ["high-fiber", "vegetarian", "vegan", "quick-prep", "no-cook"],
  },
  {
    slug: "pasta",
    nameAr: "باستا (مطبوخة)",
    nameEn: "Pasta (Cooked)",
    category: "carb",
    per100g: { calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8, sugar: 0.6 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 140,
    tags: ["low-fat", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "quinoa",
    nameAr: "كينوا (مطبوخة)",
    nameEn: "Quinoa (Cooked)",
    category: "carb",
    per100g: { calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8, sugar: 0.9 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 185,
    tags: ["high-fiber", "high-protein", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "couscous",
    nameAr: "كسكس (مطبوخ)",
    nameEn: "Couscous (Cooked)",
    category: "carb",
    per100g: { calories: 112, protein: 3.8, carbs: 23, fat: 0.2, fiber: 1.4, sugar: 0 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 157,
    tags: ["low-fat", "vegetarian", "vegan", "good-for-bulking", "quick-prep"],
  },
  {
    slug: "lentils",
    nameAr: "عدس (مطبوخ)",
    nameEn: "Lentils (Cooked)",
    category: "carb",
    per100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 198,
    tags: ["high-protein", "high-fiber", "low-fat", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "chickpeas",
    nameAr: "حمص (مطبوخ)",
    nameEn: "Chickpeas (Cooked)",
    category: "carb",
    per100g: { calories: 164, protein: 9, carbs: 27, fat: 2.6, fiber: 7.6, sugar: 4.8 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 164,
    tags: ["high-protein", "high-fiber", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "black-beans",
    nameAr: "فول أسود (مطبوخ)",
    nameEn: "Black Beans (Cooked)",
    category: "carb",
    per100g: { calories: 132, protein: 9, carbs: 24, fat: 0.5, fiber: 8.7, sugar: 0.3 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 172,
    tags: ["high-protein", "high-fiber", "low-fat", "vegetarian", "vegan", "good-for-bulking"],
  },
  {
    slug: "corn",
    nameAr: "ذرة",
    nameEn: "Corn",
    category: "carb",
    per100g: { calories: 86, protein: 3.2, carbs: 19, fat: 1.2, fiber: 2.7, sugar: 3.2 },
    defaultServingAr: "1 كوز متوسط",
    defaultServingEn: "1 medium ear",
    defaultGrams: 100,
    tags: ["low-fat", "vegetarian", "vegan"],
  },
  {
    slug: "cereal",
    nameAr: "سيريال (كورن فليكس)",
    nameEn: "Cereal (Corn Flakes)",
    category: "carb",
    per100g: { calories: 357, protein: 7, carbs: 84, fat: 0.4, fiber: 3, sugar: 10 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 28,
    tags: ["low-fat", "vegetarian", "vegan", "quick-prep", "no-cook"],
  },
  {
    slug: "granola",
    nameAr: "جرانولا",
    nameEn: "Granola",
    category: "carb",
    per100g: { calories: 471, protein: 10, carbs: 64, fat: 20, fiber: 7, sugar: 20 },
    defaultServingAr: "1/2 كوب",
    defaultServingEn: "1/2 cup",
    defaultGrams: 60,
    tags: ["high-fiber", "vegetarian", "good-for-bulking", "quick-prep", "no-cook"],
  },

  // ==================== FATS (8) ====================
  {
    slug: "avocado",
    nameAr: "أفوكادو",
    nameEn: "Avocado",
    category: "fat",
    per100g: { calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 0.7 },
    defaultServingAr: "1/2 أفوكادو",
    defaultServingEn: "1/2 avocado",
    defaultGrams: 100,
    tags: ["keto-friendly", "high-fiber", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "olive-oil",
    nameAr: "زيت زيتون",
    nameEn: "Olive Oil",
    category: "fat",
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    defaultServingAr: "1 ملعقة طعام",
    defaultServingEn: "1 tablespoon",
    defaultGrams: 14,
    tags: ["keto-friendly", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "peanut-butter",
    nameAr: "زبدة فول سوداني",
    nameEn: "Peanut Butter",
    category: "fat",
    per100g: { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sugar: 9 },
    defaultServingAr: "1 ملعقة طعام",
    defaultServingEn: "1 tablespoon",
    defaultGrams: 16,
    tags: ["high-protein", "keto-friendly", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "coconut-oil",
    nameAr: "زيت جوز الهند",
    nameEn: "Coconut Oil",
    category: "fat",
    per100g: { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    defaultServingAr: "1 ملعقة طعام",
    defaultServingEn: "1 tablespoon",
    defaultGrams: 14,
    tags: ["keto-friendly", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "butter",
    nameAr: "زبدة",
    nameEn: "Butter",
    category: "fat",
    per100g: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1 },
    defaultServingAr: "1 ملعقة طعام",
    defaultServingEn: "1 tablespoon",
    defaultGrams: 14,
    tags: ["keto-friendly", "vegetarian", "good-for-bulking", "no-cook"],
  },
  {
    slug: "cheese-cheddar",
    nameAr: "جبن شيدر",
    nameEn: "Cheddar Cheese",
    category: "fat",
    per100g: { calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5 },
    defaultServingAr: "1 شريحة (30g)",
    defaultServingEn: "1 slice (30g)",
    defaultGrams: 30,
    tags: ["high-protein", "keto-friendly", "vegetarian", "good-for-bulking", "no-cook"],
  },
  {
    slug: "parmesan",
    nameAr: "جبن بارميزان",
    nameEn: "Parmesan Cheese",
    category: "fat",
    per100g: { calories: 431, protein: 38, carbs: 4, fat: 29, fiber: 0, sugar: 0.4 },
    defaultServingAr: "1/4 كوب مبشور",
    defaultServingEn: "1/4 cup grated",
    defaultGrams: 25,
    tags: ["high-protein", "keto-friendly", "vegetarian", "good-for-bulking", "no-cook"],
  },
  {
    slug: "bacon",
    nameAr: "بيكون",
    nameEn: "Bacon",
    category: "fat",
    per100g: { calories: 541, protein: 37, carbs: 1.4, fat: 42, fiber: 0, sugar: 0 },
    defaultServingAr: "2 شريحة",
    defaultServingEn: "2 slices",
    defaultGrams: 30,
    tags: ["high-protein", "keto-friendly", "good-for-bulking", "quick-prep"],
  },

  // ==================== VEGETABLES (10) ====================
  {
    slug: "broccoli",
    nameAr: "بروكلي",
    nameEn: "Broccoli",
    category: "vegetable",
    per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 90,
    tags: ["low-carb", "low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting"],
  },
  {
    slug: "spinach",
    nameAr: "سبانخ",
    nameEn: "Spinach",
    category: "vegetable",
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4 },
    defaultServingAr: "2 كوب طازج",
    defaultServingEn: "2 cups fresh",
    defaultGrams: 60,
    tags: ["low-carb", "low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting"],
  },
  {
    slug: "cucumber",
    nameAr: "خيار",
    nameEn: "Cucumber",
    category: "vegetable",
    per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7 },
    defaultServingAr: "1 خيارة متوسطة",
    defaultServingEn: "1 medium cucumber",
    defaultGrams: 150,
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "tomato",
    nameAr: "طماطم",
    nameEn: "Tomato",
    category: "vegetable",
    per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6 },
    defaultServingAr: "1 طماطم متوسطة",
    defaultServingEn: "1 medium tomato",
    defaultGrams: 123,
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "carrot",
    nameAr: "جزر",
    nameEn: "Carrot",
    category: "vegetable",
    per100g: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7 },
    defaultServingAr: "1 جزرة متوسطة",
    defaultServingEn: "1 medium carrot",
    defaultGrams: 61,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "bell-pepper",
    nameAr: "فلفل ألوان",
    nameEn: "Bell Pepper",
    category: "vegetable",
    per100g: { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2 },
    defaultServingAr: "1 فلفلة متوسطة",
    defaultServingEn: "1 medium pepper",
    defaultGrams: 120,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "onion",
    nameAr: "بصل",
    nameEn: "Onion",
    category: "vegetable",
    per100g: { calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7, sugar: 4.2 },
    defaultServingAr: "1 بصلة متوسطة",
    defaultServingEn: "1 medium onion",
    defaultGrams: 110,
    tags: ["low-fat", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "zucchini",
    nameAr: "كوسة",
    nameEn: "Zucchini",
    category: "vegetable",
    per100g: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, sugar: 2.5 },
    defaultServingAr: "1 كوسة متوسطة",
    defaultServingEn: "1 medium zucchini",
    defaultGrams: 120,
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting"],
  },
  {
    slug: "cauliflower",
    nameAr: "قرنبيط",
    nameEn: "Cauliflower",
    category: "vegetable",
    per100g: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3, fiber: 2, sugar: 1.9 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 100,
    tags: ["low-carb", "low-fat", "keto-friendly", "vegetarian", "vegan", "good-for-cutting"],
  },
  {
    slug: "lettuce",
    nameAr: "خس",
    nameEn: "Lettuce",
    category: "vegetable",
    per100g: { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8 },
    defaultServingAr: "2 كوب",
    defaultServingEn: "2 cups",
    defaultGrams: 80,
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },

  // ==================== FRUITS (10) ====================
  {
    slug: "banana",
    nameAr: "موز",
    nameEn: "Banana",
    category: "fruit",
    per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12 },
    defaultServingAr: "1 موزة متوسطة",
    defaultServingEn: "1 medium banana",
    defaultGrams: 120,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-bulking", "no-cook", "quick-prep"],
  },
  {
    slug: "apple",
    nameAr: "تفاح",
    nameEn: "Apple",
    category: "fruit",
    per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10 },
    defaultServingAr: "1 تفاحة متوسطة",
    defaultServingEn: "1 medium apple",
    defaultGrams: 150,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "orange",
    nameAr: "برتقال",
    nameEn: "Orange",
    category: "fruit",
    per100g: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9 },
    defaultServingAr: "1 برتقالة متوسطة",
    defaultServingEn: "1 medium orange",
    defaultGrams: 130,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "mixed-berries",
    nameAr: "توت مشكل",
    nameEn: "Mixed Berries",
    category: "fruit",
    per100g: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 3.6, sugar: 10 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 150,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "strawberry",
    nameAr: "فراولة",
    nameEn: "Strawberry",
    category: "fruit",
    per100g: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, sugar: 4.9 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 152,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "grapes",
    nameAr: "عنب",
    nameEn: "Grapes",
    category: "fruit",
    per100g: { calories: 69, protein: 0.7, carbs: 18, fat: 0.2, fiber: 0.9, sugar: 16 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 150,
    tags: ["low-fat", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "watermelon",
    nameAr: "بطيخ",
    nameEn: "Watermelon",
    category: "fruit",
    per100g: { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, fiber: 0.4, sugar: 6 },
    defaultServingAr: "1 شريحة",
    defaultServingEn: "1 slice",
    defaultGrams: 280,
    tags: ["low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "pineapple",
    nameAr: "أناناس",
    nameEn: "Pineapple",
    category: "fruit",
    per100g: { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, fiber: 1.4, sugar: 10 },
    defaultServingAr: "1 شريحة",
    defaultServingEn: "1 slice",
    defaultGrams: 165,
    tags: ["low-fat", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "mango",
    nameAr: "مانجو",
    nameEn: "Mango",
    category: "fruit",
    per100g: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, sugar: 14 },
    defaultServingAr: "1 حبة متوسطة",
    defaultServingEn: "1 medium mango",
    defaultGrams: 200,
    tags: ["low-fat", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "dates",
    nameAr: "تمر",
    nameEn: "Dates",
    category: "fruit",
    per100g: { calories: 282, protein: 2.5, carbs: 75, fat: 0.4, fiber: 8, sugar: 63 },
    defaultServingAr: "5 حبات",
    defaultServingEn: "5 dates",
    defaultGrams: 50,
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },

  // ==================== DAIRY (8) ====================
  {
    slug: "greek-yogurt",
    nameAr: "زبادي يوناني",
    nameEn: "Greek Yogurt",
    category: "dairy",
    per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 170,
    tags: ["high-protein", "low-carb", "low-fat", "vegetarian", "good-for-cutting", "no-cook"],
  },
  {
    slug: "cottage-cheese",
    nameAr: "جبن قريش",
    nameEn: "Cottage Cheese",
    category: "dairy",
    per100g: { calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, sugar: 2.5 },
    defaultServingAr: "1/2 كوب",
    defaultServingEn: "1/2 cup",
    defaultGrams: 110,
    tags: ["high-protein", "low-carb", "vegetarian", "good-for-cutting", "no-cook"],
  },
  {
    slug: "milk",
    nameAr: "حليب (كامل الدسم)",
    nameEn: "Whole Milk",
    category: "dairy",
    per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugar: 5 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 240,
    tags: ["vegetarian", "good-for-bulking", "no-cook"],
  },
  {
    slug: "milk-skim",
    nameAr: "حليب خالي الدسم",
    nameEn: "Skim Milk",
    category: "dairy",
    per100g: { calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0, sugar: 5 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 240,
    tags: ["high-protein", "low-fat", "vegetarian", "good-for-cutting", "no-cook"],
  },
  {
    slug: "mozzarella",
    nameAr: "جبن موزاريلا",
    nameEn: "Mozzarella Cheese",
    category: "dairy",
    per100g: { calories: 280, protein: 28, carbs: 3.1, fat: 17, fiber: 0, sugar: 1 },
    defaultServingAr: "1/2 كوب",
    defaultServingEn: "1/2 cup",
    defaultGrams: 112,
    tags: ["high-protein", "vegetarian", "good-for-bulking", "no-cook"],
  },
  {
    slug: "feta-cheese",
    nameAr: "جبن فيتا",
    nameEn: "Feta Cheese",
    category: "dairy",
    per100g: { calories: 264, protein: 14, carbs: 4.1, fat: 21, fiber: 0, sugar: 4.1 },
    defaultServingAr: "30g",
    defaultServingEn: "30g",
    defaultGrams: 30,
    tags: ["high-protein", "vegetarian", "no-cook"],
  },
  {
    slug: "labneh",
    nameAr: "لبنة",
    nameEn: "Labneh",
    category: "dairy",
    per100g: { calories: 119, protein: 7, carbs: 4.3, fat: 8, fiber: 0, sugar: 4.3 },
    defaultServingAr: "2 ملعقة طعام",
    defaultServingEn: "2 tablespoons",
    defaultGrams: 60,
    tags: ["high-protein", "vegetarian", "no-cook"],
  },
  {
    slug: "ricotta",
    nameAr: "جبن ريكوتا",
    nameEn: "Ricotta Cheese",
    category: "dairy",
    per100g: { calories: 174, protein: 11, carbs: 3, fat: 13, fiber: 0, sugar: 0.3 },
    defaultServingAr: "1/2 كوب",
    defaultServingEn: "1/2 cup",
    defaultGrams: 124,
    tags: ["high-protein", "vegetarian", "no-cook"],
  },

  // ==================== NUTS (6) ====================
  {
    slug: "almonds",
    nameAr: "لوز",
    nameEn: "Almonds",
    category: "nuts",
    per100g: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 35,
    tags: ["high-protein", "high-fiber", "keto-friendly", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "peanuts",
    nameAr: "فول سوداني",
    nameEn: "Peanuts",
    category: "nuts",
    per100g: { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, sugar: 4.7 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 35,
    tags: ["high-protein", "high-fiber", "keto-friendly", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "walnuts",
    nameAr: "عين جمل (جوز)",
    nameEn: "Walnuts",
    category: "nuts",
    per100g: { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, sugar: 2.6 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 30,
    tags: ["high-protein", "keto-friendly", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "cashews",
    nameAr: "كاجو",
    nameEn: "Cashews",
    category: "nuts",
    per100g: { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3, sugar: 5.9 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 35,
    tags: ["high-protein", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "pistachios",
    nameAr: "فستق",
    nameEn: "Pistachios",
    category: "nuts",
    per100g: { calories: 562, protein: 20, carbs: 28, fat: 45, fiber: 10, sugar: 7.7 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 30,
    tags: ["high-protein", "high-fiber", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "chia-seeds",
    nameAr: "بذور الشيا",
    nameEn: "Chia Seeds",
    category: "nuts",
    per100g: { calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34, sugar: 0 },
    defaultServingAr: "2 ملعقة طعام",
    defaultServingEn: "2 tablespoons",
    defaultGrams: 28,
    tags: ["high-protein", "high-fiber", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },

  // ==================== SNACKS (6) ====================
  {
    slug: "protein-shake",
    nameAr: "بروتين شيك",
    nameEn: "Protein Shake",
    category: "snack",
    per100g: { calories: 400, protein: 80, carbs: 8, fat: 6, fiber: 0, sugar: 4 },
    defaultServingAr: "1 سكوب (30g)",
    defaultServingEn: "1 scoop (30g)",
    defaultGrams: 30,
    tags: ["high-protein", "low-carb", "low-fat", "quick-prep", "no-cook", "good-for-cutting", "good-for-bulking"],
  },
  {
    slug: "dark-chocolate",
    nameAr: "شوكولاتة داكنة (70%)",
    nameEn: "Dark Chocolate (70%)",
    category: "snack",
    per100g: { calories: 598, protein: 7.8, carbs: 46, fat: 43, fiber: 11, sugar: 24 },
    defaultServingAr: "1 قطعة (10g)",
    defaultServingEn: "1 piece (10g)",
    defaultGrams: 10,
    tags: ["vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },
  {
    slug: "rice-cakes",
    nameAr: "كيك الأرز",
    nameEn: "Rice Cakes",
    category: "snack",
    per100g: { calories: 386, protein: 8, carbs: 81, fat: 2.8, fiber: 4, sugar: 0 },
    defaultServingAr: "1 قطعة",
    defaultServingEn: "1 cake",
    defaultGrams: 9,
    tags: ["low-fat", "vegetarian", "vegan", "quick-prep", "no-cook"],
  },
  {
    slug: "popcorn",
    nameAr: "فشار (بدون زبدة)",
    nameEn: "Popcorn (Plain)",
    category: "snack",
    per100g: { calories: 387, protein: 13, carbs: 78, fat: 4.5, fiber: 15, sugar: 0.9 },
    defaultServingAr: "2 كوب",
    defaultServingEn: "2 cups",
    defaultGrams: 16,
    tags: ["high-fiber", "low-fat", "vegetarian", "vegan", "good-for-cutting", "quick-prep"],
  },
  {
    slug: "protein-bar",
    nameAr: "بار بروتين",
    nameEn: "Protein Bar",
    category: "snack",
    per100g: { calories: 380, protein: 30, carbs: 40, fat: 12, fiber: 5, sugar: 15 },
    defaultServingAr: "1 بار (60g)",
    defaultServingEn: "1 bar (60g)",
    defaultGrams: 60,
    tags: ["high-protein", "no-cook", "quick-prep", "good-for-bulking"],
  },
  {
    slug: "hummus",
    nameAr: "حمص (متبل)",
    nameEn: "Hummus",
    category: "snack",
    per100g: { calories: 166, protein: 8, carbs: 14, fat: 10, fiber: 6, sugar: 0 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 60,
    tags: ["high-protein", "high-fiber", "vegetarian", "vegan", "no-cook"],
  },

  // ==================== DRINKS (5) ====================
  {
    slug: "coffee",
    nameAr: "قهوة (سادة)",
    nameEn: "Coffee (Black)",
    category: "drink",
    per100g: { calories: 1, protein: 0.1, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 240,
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "green-tea",
    nameAr: "شاي أخضر",
    nameEn: "Green Tea",
    category: "drink",
    per100g: { calories: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 240,
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
  {
    slug: "orange-juice",
    nameAr: "عصير برتقال طازج",
    nameEn: "Fresh Orange Juice",
    category: "drink",
    per100g: { calories: 45, protein: 0.7, carbs: 10, fat: 0.2, fiber: 0.2, sugar: 8.4 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 248,
    tags: ["low-fat", "vegetarian", "vegan", "no-cook"],
  },
  {
    slug: "coconut-water",
    nameAr: "ماء جوز الهند",
    nameEn: "Coconut Water",
    category: "drink",
    per100g: { calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1, sugar: 2.6 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 240,
    tags: ["low-fat", "vegan", "vegetarian", "no-cook"],
  },
  {
    slug: "diet-soda",
    nameAr: "صودا دايت",
    nameEn: "Diet Soda",
    category: "drink",
    per100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    defaultServingAr: "1 علبة",
    defaultServingEn: "1 can",
    defaultGrams: 355,
    tags: ["low-carb", "low-fat", "good-for-cutting", "no-cook"],
  },
];

// ==================== Helpers ====================

export function getFoodBySlug(slug: string): Food | undefined {
  return FOODS.find((f) => f.slug === slug);
}

export function getFoodsByCategory(category: FoodCategory): Food[] {
  return FOODS.filter((f) => f.category === category);
}

export function filterFoods(params: {
  category?: FoodCategory | "all";
  tags?: string[];
  search?: string;
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
  maxFat?: number;
}): Food[] {
  let result = FOODS;
  if (params.category && params.category !== "all") {
    result = result.filter((f) => f.category === params.category);
  }
  if (params.tags && params.tags.length > 0) {
    result = result.filter((f) => params.tags!.every((t) => f.tags.includes(t)));
  }
  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    result = result.filter(
      (f) =>
        f.nameAr.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q),
    );
  }
  if (typeof params.minProtein === "number") {
    result = result.filter((f) => f.per100g.protein >= params.minProtein!);
  }
  if (typeof params.maxCarbs === "number") {
    result = result.filter((f) => f.per100g.carbs <= params.maxCarbs!);
  }
  if (typeof params.maxCalories === "number") {
    result = result.filter((f) => f.per100g.calories <= params.maxCalories!);
  }
  if (typeof params.maxFat === "number") {
    result = result.filter((f) => f.per100g.fat <= params.maxFat!);
  }
  return result;
}

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

export function findFoodsForMacroTarget(
  target: "protein" | "carbs" | "fat" | "calories",
  targetValue: number,
  maxGrams = 500,
): Array<{ food: Food; gramsNeeded: number; actualValue: number }> {
  const results: Array<{ food: Food; gramsNeeded: number; actualValue: number }> = [];
  for (const food of FOODS) {
    const per100 = food.per100g[target];
    if (per100 <= 0) continue;
    const gramsNeeded = Math.round((targetValue / per100) * 100);
    if (gramsNeeded > maxGrams || gramsNeeded < 5) continue;
    const actualValue = Math.round(per100 * (gramsNeeded / 100) * 10) / 10;
    results.push({ food, gramsNeeded, actualValue });
  }
  results.sort((a, b) => Math.abs(a.actualValue - targetValue) - Math.abs(b.actualValue - targetValue));
  return results;
}

export function getRelatedFoods(food: Food, limit = 3): Food[] {
  return FOODS.filter(
    (f) =>
      f.slug !== food.slug &&
      (f.category === food.category || f.tags.some((t) => food.tags.includes(t))),
  ).slice(0, limit);
}
