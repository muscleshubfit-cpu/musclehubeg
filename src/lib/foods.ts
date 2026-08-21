/**
 * Foods Library — comprehensive nutrition database with per-100g macros,
 * default serving sizes, dietary tags, and calculation helpers.
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
  tags: string[];
  defaultGrams: number;
  defaultServingAr: string;
  defaultServingEn: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
};

export const CATEGORY_LABELS: Record<
  FoodCategory,
  { ar: string; en: string; emoji: string }
> = {
  protein: { ar: "مصادر بروتين", en: "Protein", emoji: "🍗" },
  carb: { ar: "كربوهيدرات ونشويات", en: "Carbohydrates", emoji: "🍚" },
  fat: { ar: "دهون صحية", en: "Healthy Fats", emoji: "🥑" },
  vegetable: { ar: "خضراوات", en: "Vegetables", emoji: "🥦" },
  fruit: { ar: "فواكه", en: "Fruits", emoji: "🍎" },
  dairy: { ar: "ألبان وأجبان", en: "Dairy", emoji: "🥛" },
  nuts: { ar: "مكسرات وبذور", en: "Nuts & Seeds", emoji: "🥜" },
  snack: { ar: "سناكس صحية", en: "Healthy Snacks", emoji: "🍫" },
  drink: { ar: "مشروبات", en: "Beverages", emoji: "☕" },
};

export const TAG_LABELS: Record<
  string,
  { ar: string; en: string; color: string }
> = {
  "high-protein": { ar: "عالي البروتين", en: "High Protein", color: "#0071e3" },
  "low-carb": { ar: "قليل الكارب", en: "Low Carb", color: "#34c759" },
  "keto-friendly": { ar: "كيتو", en: "Keto Friendly", color: "#ff9500" },
  vegan: { ar: "نباتي", en: "Vegan", color: "#30b0c7" },
  "good-for-cutting": { ar: "ممتاز للتنشيف", en: "Cutting", color: "#af52de" },
  "good-for-bulking": { ar: "ممتاز للتضخيم", en: "Bulking", color: "#ff2d55" },
  "gluten-free": { ar: "خالي من الجلوتين", en: "Gluten Free", color: "#5856d6" },
  "high-fiber": { ar: "غني بالألياف", en: "High Fiber", color: "#8e8e93" },
};

export const FOODS: Food[] = [
  // ==================== PROTEINS ====================
  {
    slug: "chicken-breast",
    nameAr: "صدور دجاج مشوية (بدون جلد)",
    nameEn: "Grilled Chicken Breast (Skinless)",
    category: "protein",
    tags: ["high-protein", "low-carb", "good-for-cutting"],
    defaultGrams: 150,
    defaultServingAr: "شريحة متوسطة (150 جم)",
    defaultServingEn: "Medium fillet (150g)",
    per100g: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
    },
  },
  {
    slug: "lean-beef",
    nameAr: "لحم بقري مفروم أحمر (قليل الدهن)",
    nameEn: "Lean Ground Beef (95/5)",
    category: "protein",
    tags: ["high-protein", "good-for-bulking", "keto-friendly"],
    defaultGrams: 150,
    defaultServingAr: "وجبة لحم (150 جم)",
    defaultServingEn: "1 portion (150g)",
    per100g: {
      calories: 171,
      protein: 26,
      carbs: 0,
      fat: 7,
      fiber: 0,
    },
  },
  {
    slug: "canned-tuna-water",
    nameAr: "تونة معلبة مصفاة في ماء",
    nameEn: "Canned Tuna in Water (Drained)",
    category: "protein",
    tags: ["high-protein", "low-carb", "good-for-cutting"],
    defaultGrams: 120,
    defaultServingAr: "علبة تونة مصفاة (120 جم)",
    defaultServingEn: "1 drained can (120g)",
    per100g: {
      calories: 116,
      protein: 26,
      carbs: 0,
      fat: 1,
      fiber: 0,
    },
  },
  {
    slug: "whole-egg",
    nameAr: "بيض دجاج مسلوق (كامل)",
    nameEn: "Hard Boiled Whole Egg",
    category: "protein",
    tags: ["high-protein", "keto-friendly", "good-for-bulking"],
    defaultGrams: 50,
    defaultServingAr: "بيضة واحدة كبيرة (50 جم)",
    defaultServingEn: "1 large egg (50g)",
    per100g: {
      calories: 155,
      protein: 13,
      carbs: 1.1,
      fat: 11,
      fiber: 0,
    },
  },
  {
    slug: "egg-whites",
    nameAr: "بياض بيض مسلوق",
    nameEn: "Egg Whites (Cooked)",
    category: "protein",
    tags: ["high-protein", "low-carb", "good-for-cutting"],
    defaultGrams: 100,
    defaultServingAr: "بياض 3 بيضات (100 جم)",
    defaultServingEn: "3 egg whites (100g)",
    per100g: {
      calories: 52,
      protein: 11,
      carbs: 0.7,
      fat: 0.2,
      fiber: 0,
    },
  },
  {
    slug: "whey-protein",
    nameAr: "واي بروتين أيزوليت / كونسنتريت",
    nameEn: "Whey Protein Isolate / Powder",
    category: "protein",
    tags: ["high-protein", "good-for-cutting", "good-for-bulking"],
    defaultGrams: 30,
    defaultServingAr: "سكوب واحد (30 جم)",
    defaultServingEn: "1 scoop (30g)",
    per100g: {
      calories: 380,
      protein: 80,
      carbs: 5,
      fat: 3,
      fiber: 0,
    },
  },
  {
    slug: "salmon-fillet",
    nameAr: "سلمون طازج مشوي",
    nameEn: "Atlantic Salmon (Cooked)",
    category: "protein",
    tags: ["high-protein", "keto-friendly", "good-for-bulking"],
    defaultGrams: 150,
    defaultServingAr: "قطعة سلمون (150 جم)",
    defaultServingEn: "1 salmon fillet (150g)",
    per100g: {
      calories: 208,
      protein: 22,
      carbs: 0,
      fat: 13,
      fiber: 0,
    },
  },
  {
    slug: "tilapia-fish",
    nameAr: "سمك بلطي مشوي / طازج",
    nameEn: "Grilled Tilapia Fish",
    category: "protein",
    tags: ["high-protein", "low-carb", "good-for-cutting"],
    defaultGrams: 200,
    defaultServingAr: "سمكة متوسطة (200 جم)",
    defaultServingEn: "Medium fillet (200g)",
    per100g: {
      calories: 128,
      protein: 26,
      carbs: 0,
      fat: 2.7,
      fiber: 0,
    },
  },

  // ==================== CARBS ====================
  {
    slug: "white-rice-cooked",
    nameAr: "أرز مصري / بسمتي أبيض مطبوخ",
    nameEn: "Cooked White Rice (Egyptian / Basmati)",
    category: "carb",
    tags: ["good-for-bulking", "gluten-free"],
    defaultGrams: 150,
    defaultServingAr: "كوب أرز مطبوخ (150 جم)",
    defaultServingEn: "1 cup cooked (150g)",
    per100g: {
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      fiber: 0.4,
    },
  },
  {
    slug: "rolled-oats",
    nameAr: "شوفان حبة كاملة (نيء)",
    nameEn: "Rolled Oats (Raw)",
    category: "carb",
    tags: ["high-fiber", "good-for-cutting", "good-for-bulking"],
    defaultGrams: 50,
    defaultServingAr: "حصة شوفان (50 جم)",
    defaultServingEn: "1 portion (50g)",
    per100g: {
      calories: 389,
      protein: 16.9,
      carbs: 66.3,
      fat: 6.9,
      fiber: 10.6,
    },
  },
  {
    slug: "sweet-potato-baked",
    nameAr: "بطاطا حلوة مشوية",
    nameEn: "Baked Sweet Potato",
    category: "carb",
    tags: ["high-fiber", "good-for-cutting", "gluten-free"],
    defaultGrams: 150,
    defaultServingAr: "حبة بطاطا متوسطة (150 جم)",
    defaultServingEn: "1 medium potato (150g)",
    per100g: {
      calories: 90,
      protein: 2,
      carbs: 20.7,
      fat: 0.2,
      fiber: 3.3,
    },
  },
  {
    slug: "boiled-potato",
    nameAr: "بطاطس مسلوقة",
    nameEn: "Boiled White Potato",
    category: "carb",
    tags: ["good-for-cutting", "gluten-free"],
    defaultGrams: 150,
    defaultServingAr: "حبة بطاطس مسلوقة (150 جم)",
    defaultServingEn: "1 medium boiled potato (150g)",
    per100g: {
      calories: 87,
      protein: 1.9,
      carbs: 20.1,
      fat: 0.1,
      fiber: 1.8,
    },
  },
  {
    slug: "whole-wheat-pasta",
    nameAr: "مكرونة قمح كامل مسلوقة",
    nameEn: "Cooked Whole Wheat Pasta",
    category: "carb",
    tags: ["high-fiber", "good-for-bulking"],
    defaultGrams: 150,
    defaultServingAr: "طبق مكرونة مطبوخة (150 جم)",
    defaultServingEn: "1 serving cooked (150g)",
    per100g: {
      calories: 140,
      protein: 5.3,
      carbs: 29.5,
      fat: 0.8,
      fiber: 3.9,
    },
  },
  {
    slug: "baladi-bread",
    nameAr: "عيش بلدي مصري أسمر (ردة)",
    nameEn: "Egyptian Baladi Whole Wheat Bread",
    category: "carb",
    tags: ["high-fiber"],
    defaultGrams: 90,
    defaultServingAr: "رغيف بلدي كامل (90 جم)",
    defaultServingEn: "1 loaf (90g)",
    per100g: {
      calories: 240,
      protein: 8.5,
      carbs: 48,
      fat: 1.2,
      fiber: 6.5,
    },
  },

  // ==================== DAIRY ====================
  {
    slug: "cottage-cheese-quraish",
    nameAr: "جبنة قريش مصرية قليلة الملح",
    nameEn: "Egyptian Cottage Cheese (Jibna Quraish)",
    category: "dairy",
    tags: ["high-protein", "low-carb", "good-for-cutting"],
    defaultGrams: 150,
    defaultServingAr: "قطعة جبنة قريش (150 جم)",
    defaultServingEn: "1 portion (150g)",
    per100g: {
      calories: 98,
      protein: 14.5,
      carbs: 3.4,
      fat: 1.5,
      fiber: 0,
    },
  },
  {
    slug: "greek-yogurt-0",
    nameAr: "زبادي يوناني خالي الدسم",
    nameEn: "Non-Fat Plain Greek Yogurt",
    category: "dairy",
    tags: ["high-protein", "low-carb", "good-for-cutting"],
    defaultGrams: 170,
    defaultServingAr: "كوب زبادي يوناني (170 جم)",
    defaultServingEn: "1 container (170g)",
    per100g: {
      calories: 59,
      protein: 10.2,
      carbs: 3.6,
      fat: 0.4,
      fiber: 0,
    },
  },
  {
    slug: "skim-milk",
    nameAr: "حليب بقري خالي الدسم",
    nameEn: "Skimmed Milk",
    category: "dairy",
    tags: ["high-protein"],
    defaultGrams: 200,
    defaultServingAr: "كوب حليب (200 مل)",
    defaultServingEn: "1 glass (200ml)",
    per100g: {
      calories: 35,
      protein: 3.4,
      carbs: 4.8,
      fat: 0.1,
      fiber: 0,
    },
  },

  // ==================== HEALTHY FATS & NUTS ====================
  {
    slug: "extra-virgin-olive-oil",
    nameAr: "زيت زيتون بكر ممتاز",
    nameEn: "Extra Virgin Olive Oil",
    category: "fat",
    tags: ["keto-friendly", "vegan"],
    defaultGrams: 14,
    defaultServingAr: "ملعقة طعام كبيرة (14 جم)",
    defaultServingEn: "1 tablespoon (14g)",
    per100g: {
      calories: 884,
      protein: 0,
      carbs: 0,
      fat: 100,
      fiber: 0,
    },
  },
  {
    slug: "peanut-butter",
    nameAr: "زبدة فول سوداني طبيعية 100%",
    nameEn: "Natural Peanut Butter (100% Peanuts)",
    category: "nuts",
    tags: ["high-protein", "good-for-bulking", "vegan"],
    defaultGrams: 30,
    defaultServingAr: "ملعقتين صغيرتين (30 جم)",
    defaultServingEn: "2 tbsp (30g)",
    per100g: {
      calories: 588,
      protein: 25,
      carbs: 20,
      fat: 50,
      fiber: 6,
    },
  },
  {
    slug: "raw-almonds",
    nameAr: "لوز نيء غير مملح",
    nameEn: "Raw Whole Almonds",
    category: "nuts",
    tags: ["keto-friendly", "high-fiber", "vegan"],
    defaultGrams: 30,
    defaultServingAr: "حفنة يد (30 جم / ~23 حبة)",
    defaultServingEn: "Handful (30g / ~23 nuts)",
    per100g: {
      calories: 579,
      protein: 21.2,
      carbs: 21.6,
      fat: 49.9,
      fiber: 12.5,
    },
  },
  {
    slug: "fresh-avocado",
    nameAr: "أفوكادو طازج",
    nameEn: "Fresh Avocado",
    category: "fat",
    tags: ["keto-friendly", "high-fiber", "vegan"],
    defaultGrams: 100,
    defaultServingAr: "نصف حبة أفوكادو (100 جم)",
    defaultServingEn: "1/2 avocado (100g)",
    per100g: {
      calories: 160,
      protein: 2,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
    },
  },

  // ==================== VEGETABLES ====================
  {
    slug: "fresh-broccoli",
    nameAr: "بروكلي طازج / مسلوق على البخار",
    nameEn: "Steamed / Fresh Broccoli",
    category: "vegetable",
    tags: ["low-carb", "good-for-cutting", "high-fiber", "vegan"],
    defaultGrams: 100,
    defaultServingAr: "كوب بروكلي (100 جم)",
    defaultServingEn: "1 cup (100g)",
    per100g: {
      calories: 34,
      protein: 2.8,
      carbs: 6.6,
      fat: 0.4,
      fiber: 2.6,
    },
  },
  {
    slug: "fresh-spinach",
    nameAr: "سبانخ طازجة / مطبوخة",
    nameEn: "Fresh Baby Spinach",
    category: "vegetable",
    tags: ["low-carb", "good-for-cutting", "vegan"],
    defaultGrams: 100,
    defaultServingAr: "حصة سبانخ (100 جم)",
    defaultServingEn: "1 serving (100g)",
    per100g: {
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
    },
  },
  {
    slug: "fresh-cucumber",
    nameAr: "خيار طازج بالقشر",
    nameEn: "Fresh Cucumber (with peel)",
    category: "vegetable",
    tags: ["low-carb", "good-for-cutting", "vegan"],
    defaultGrams: 100,
    defaultServingAr: "حبة خيار متوسطة (100 جم)",
    defaultServingEn: "1 medium cucumber (100g)",
    per100g: {
      calories: 15,
      protein: 0.7,
      carbs: 3.6,
      fat: 0.1,
      fiber: 0.5,
    },
  },

  // ==================== FRUITS ====================
  {
    slug: "fresh-banana",
    nameAr: "موز طازج (وجبة قبل التمرين)",
    nameEn: "Fresh Banana",
    category: "fruit",
    tags: ["good-for-bulking", "vegan"],
    defaultGrams: 120,
    defaultServingAr: "موزة متوسطة (120 جم)",
    defaultServingEn: "1 medium banana (120g)",
    per100g: {
      calories: 89,
      protein: 1.1,
      carbs: 22.8,
      fat: 0.3,
      fiber: 2.6,
    },
  },
  {
    slug: "red-apple",
    nameAr: "تفاح أحمر طازج",
    nameEn: "Fresh Red Apple",
    category: "fruit",
    tags: ["high-fiber", "good-for-cutting", "vegan"],
    defaultGrams: 150,
    defaultServingAr: "تفاحة متوسطة (150 جم)",
    defaultServingEn: "1 medium apple (150g)",
    per100g: {
      calories: 52,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2,
      fiber: 2.4,
    },
  },
  {
    slug: "medjool-dates",
    nameAr: "تمر مجدول / تمر سكري",
    nameEn: "Medjool Dates",
    category: "fruit",
    tags: ["good-for-bulking", "vegan"],
    defaultGrams: 48,
    defaultServingAr: "حبتين تمر (48 جم)",
    defaultServingEn: "2 dates (48g)",
    per100g: {
      calories: 277,
      protein: 1.8,
      carbs: 75,
      fat: 0.2,
      fiber: 6.7,
    },
  },

  // ==================== SNACKS & BEVERAGES ====================
  {
    slug: "dark-chocolate-85",
    nameAr: "شوكولاتة داكنة 85% كاكاو",
    nameEn: "Dark Chocolate 85% Cocoa",
    category: "snack",
    tags: ["keto-friendly", "high-fiber"],
    defaultGrams: 25,
    defaultServingAr: "مربعين (25 جم)",
    defaultServingEn: "2 squares (25g)",
    per100g: {
      calories: 580,
      protein: 8.5,
      carbs: 35,
      fat: 46,
      fiber: 11,
    },
  },
  {
    slug: "black-coffee",
    nameAr: "قهوة سوداء سادة / إسبريسو",
    nameEn: "Black Coffee / Espresso",
    category: "drink",
    tags: ["low-carb", "good-for-cutting", "vegan"],
    defaultGrams: 200,
    defaultServingAr: "فنجان قهوة (200 مل)",
    defaultServingEn: "1 cup (200ml)",
    per100g: {
      calories: 2,
      protein: 0.1,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
  },
];

export function getFoodBySlug(slug: string): Food | undefined {
  return FOODS.find((f) => f.slug === slug);
}

export function calculateNutrition(
  food: Food,
  grams: number,
): { calories: number; protein: number; carbs: number; fat: number; fiber: number } {
  const factor = Math.max(0, grams) / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein: Math.round(food.per100g.protein * factor * 10) / 10,
    carbs: Math.round(food.per100g.carbs * factor * 10) / 10,
    fat: Math.round(food.per100g.fat * factor * 10) / 10,
    fiber: Math.round(food.per100g.fiber * factor * 10) / 10,
  };
}

export function filterFoods(params: {
  category?: FoodCategory | "all";
  tags?: string[];
  search?: string;
  minProtein?: number;
  maxCarbs?: number;
  maxCalories?: number;
}): Food[] {
  let result = FOODS;

  if (params.category && params.category !== "all") {
    result = result.filter((f) => f.category === params.category);
  }

  if (params.tags && params.tags.length > 0) {
    result = result.filter((f) =>
      params.tags!.every((t) => f.tags.includes(t)),
    );
  }

  if (params.minProtein !== undefined && !isNaN(params.minProtein)) {
    result = result.filter((f) => f.per100g.protein >= params.minProtein!);
  }

  if (params.maxCarbs !== undefined && !isNaN(params.maxCarbs)) {
    result = result.filter((f) => f.per100g.carbs <= params.maxCarbs!);
  }

  if (params.maxCalories !== undefined && !isNaN(params.maxCalories)) {
    result = result.filter((f) => f.per100g.calories <= params.maxCalories!);
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    result = result.filter(
      (f) =>
        f.nameAr.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    );
  }

  return result;
}

export function getRelatedFoods(food: Food, limit = 3): Food[] {
  return FOODS.filter(
    (f) =>
      f.slug !== food.slug &&
      (f.category === food.category ||
        f.tags.some((t) => food.tags.includes(t))),
  ).slice(0, limit);
}
