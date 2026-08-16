/**
 * Foods Library — database of foods with full nutrition info.
 *
 * Each food has:
 *   - slug (URL-friendly ID)
 *   - name (Arabic + English)
 *   - category (protein, carb, fat, vegetable, fruit, dairy, nuts, snack, drink)
 *   - serving size (default, e.g. "100g" or "1 medium")
 *   - nutrition per 100g: calories, protein, carbs, fat, fiber, sugar
 *   - image URL (Unsplash)
 *   - tags (e.g. "high-protein", "low-carb", "keto-friendly")
 *
 * The macro calculator on the detail page lets users input custom grams
 * and see the calculated calories + macros dynamically.
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
  // Nutrition per 100g
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
  defaultGrams: number; // for the default serving (e.g. 1 medium apple = 150g)
  image: string;
  imageAltAr: string;
  imageAltEn: string;
  tags: string[]; // e.g. "high-protein", "low-carb", "keto-friendly", "vegan"
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

// High-quality Unsplash food images (free, CC-licensed)
const IMG = {
  chicken: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&q=80",
  beef: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
  salmon: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80",
  tuna: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80",
  eggs: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80",
  eggWhite: "https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=600&q=80",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  oatmeal: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&q=80",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
  sweetPotato: "https://images.unsplash.com/photo-1603371684488-2c0c8b8b8b8b?w=600&q=80",
  bread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
  pasta: "https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600&q=80",
  avocado: "https://images.unsplash.com/photo-1601039641847-7857b994d704?w=600&q=80",
  oliveOil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
  peanut: "https://images.unsplash.com/photo-1590029541235-bfe23ad4f8a4?w=600&q=80",
  almond: "https://images.unsplash.com/photo-1623341214825-9f4f963727da?w=600&q=80",
  broccoli: "https://images.unsplash.com/photo-1583696549300-9b35f6c4a9d9?w=600&q=80",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80",
  orange: "https://images.unsplash.com/photo-1582956516813-02999f7c9a2c?w=600&q=80",
  berries: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80",
  yogurt: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  cottage: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80",
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80",
  proteinShake: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&q=80",
  coffee: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&q=80",
  darkChocolate: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=80",
};

export const FOODS: Food[] = [
  // ==================== PROTEIN ====================
  {
    slug: "chicken-breast",
    nameAr: "صدور دجاج",
    nameEn: "Chicken Breast",
    category: "protein",
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
    defaultServingAr: "1 صدر متوسط",
    defaultServingEn: "1 medium breast",
    defaultGrams: 150,
    image: IMG.chicken,
    imageAltAr: "صدور دجاج مشوية",
    imageAltEn: "Grilled chicken breast",
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
    image: IMG.beef,
    imageAltAr: "لحم بقري",
    imageAltEn: "Lean beef",
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
    image: IMG.salmon,
    imageAltAr: "سمك سلمون",
    imageAltEn: "Salmon fillet",
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
    image: IMG.tuna,
    imageAltAr: "تونة معلبة",
    imageAltEn: "Canned tuna",
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
    image: IMG.eggs,
    imageAltAr: "بيض",
    imageAltEn: "Eggs",
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
    image: IMG.eggWhite,
    imageAltAr: "بياض البيض",
    imageAltEn: "Egg whites",
    tags: ["high-protein", "low-carb", "low-fat", "good-for-cutting", "quick-prep"],
  },

  // ==================== CARBS ====================
  {
    slug: "white-rice",
    nameAr: "أرز أبيض (مطبوخ)",
    nameEn: "White Rice (Cooked)",
    category: "carb",
    per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0 },
    defaultServingAr: "1 كوب مطبوخ",
    defaultServingEn: "1 cup cooked",
    defaultGrams: 150,
    image: IMG.rice,
    imageAltAr: "أرز أبيض",
    imageAltEn: "White rice",
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
    image: IMG.rice,
    imageAltAr: "أرز بني",
    imageAltEn: "Brown rice",
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
    image: IMG.oatmeal,
    imageAltAr: "شوفان",
    imageAltEn: "Oatmeal",
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
    image: IMG.potato,
    imageAltAr: "بطاطس",
    imageAltEn: "Potato",
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
    image: IMG.sweetPotato,
    imageAltAr: "بطاطا حلوة",
    imageAltEn: "Sweet potato",
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
    image: IMG.bread,
    imageAltAr: "خبز أسمر",
    imageAltEn: "Whole wheat bread",
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
    image: IMG.pasta,
    imageAltAr: "باستا",
    imageAltEn: "Pasta",
    tags: ["low-fat", "vegetarian", "vegan", "good-for-bulking"],
  },

  // ==================== FATS ====================
  {
    slug: "avocado",
    nameAr: "أفوكادو",
    nameEn: "Avocado",
    category: "fat",
    per100g: { calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 0.7 },
    defaultServingAr: "1/2 أفوكادو",
    defaultServingEn: "1/2 avocado",
    defaultGrams: 100,
    image: IMG.avocado,
    imageAltAr: "أفوكادو",
    imageAltEn: "Avocado",
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
    image: IMG.oliveOil,
    imageAltAr: "زيت زيتون",
    imageAltEn: "Olive oil",
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
    image: IMG.peanut,
    imageAltAr: "زبدة فول سوداني",
    imageAltEn: "Peanut butter",
    tags: ["high-protein", "keto-friendly", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },

  // ==================== VEGETABLES ====================
  {
    slug: "broccoli",
    nameAr: "بروكلي",
    nameEn: "Broccoli",
    category: "vegetable",
    per100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 90,
    image: IMG.broccoli,
    imageAltAr: "بروكلي",
    imageAltEn: "Broccoli",
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
    image: IMG.spinach,
    imageAltAr: "سبانخ",
    imageAltEn: "Spinach",
    tags: ["low-carb", "low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting"],
  },

  // ==================== FRUITS ====================
  {
    slug: "banana",
    nameAr: "موز",
    nameEn: "Banana",
    category: "fruit",
    per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12 },
    defaultServingAr: "1 موزة متوسطة",
    defaultServingEn: "1 medium banana",
    defaultGrams: 120,
    image: IMG.banana,
    imageAltAr: "موز",
    imageAltEn: "Banana",
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
    image: IMG.apple,
    imageAltAr: "تفاح",
    imageAltEn: "Apple",
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
    image: IMG.orange,
    imageAltAr: "برتقال",
    imageAltEn: "Orange",
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
    image: IMG.berries,
    imageAltAr: "توت مشكل",
    imageAltEn: "Mixed berries",
    tags: ["low-fat", "high-fiber", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },

  // ==================== DAIRY ====================
  {
    slug: "greek-yogurt",
    nameAr: "زبادي يوناني",
    nameEn: "Greek Yogurt",
    category: "dairy",
    per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.2 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 170,
    image: IMG.yogurt,
    imageAltAr: "زبادي يوناني",
    imageAltEn: "Greek yogurt",
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
    image: IMG.cottage,
    imageAltAr: "جبن قريش",
    imageAltEn: "Cottage cheese",
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
    image: IMG.milk,
    imageAltAr: "حليب",
    imageAltEn: "Milk",
    tags: ["vegetarian", "good-for-bulking", "no-cook"],
  },

  // ==================== NUTS ====================
  {
    slug: "almonds",
    nameAr: "لوز",
    nameEn: "Almonds",
    category: "nuts",
    per100g: { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: 4.4 },
    defaultServingAr: "1/4 كوب",
    defaultServingEn: "1/4 cup",
    defaultGrams: 35,
    image: IMG.almond,
    imageAltAr: "لوز",
    imageAltEn: "Almonds",
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
    image: IMG.peanut,
    imageAltAr: "فول سوداني",
    imageAltEn: "Peanuts",
    tags: ["high-protein", "high-fiber", "keto-friendly", "vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },

  // ==================== SNACKS ====================
  {
    slug: "protein-shake",
    nameAr: "بروتين شيك",
    nameEn: "Protein Shake",
    category: "snack",
    per100g: { calories: 400, protein: 80, carbs: 8, fat: 6, fiber: 0, sugar: 4 },
    defaultServingAr: "1 سكوب (30g)",
    defaultServingEn: "1 scoop (30g)",
    defaultGrams: 30,
    image: IMG.proteinShake,
    imageAltAr: "بروتين شيك",
    imageAltEn: "Protein shake",
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
    image: IMG.darkChocolate,
    imageAltAr: "شوكولاتة داكنة",
    imageAltEn: "Dark chocolate",
    tags: ["vegetarian", "vegan", "good-for-bulking", "no-cook"],
  },

  // ==================== DRINKS ====================
  {
    slug: "coffee",
    nameAr: "قهوة (سادة)",
    nameEn: "Coffee (Black)",
    category: "drink",
    per100g: { calories: 1, protein: 0.1, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    defaultServingAr: "1 كوب",
    defaultServingEn: "1 cup",
    defaultGrams: 240,
    image: IMG.coffee,
    imageAltAr: "قهوة سادة",
    imageAltEn: "Black coffee",
    tags: ["low-carb", "low-fat", "vegetarian", "vegan", "good-for-cutting", "no-cook"],
  },
];

// ==================== Helpers ====================

export function getFoodBySlug(slug: string): Food | undefined {
  return FOODS.find((f) => f.slug === slug);
}

export function getFoodsByCategory(category: FoodCategory): Food[] {
  return FOODS.filter((f) => f.category === category);
}

/**
 * Filter foods by category, tags, and/or search query.
 * Also supports macro-based filtering:
 *   - minProtein: only foods with >= this many grams of protein per 100g
 *   - maxCarbs: only foods with <= this many grams of carbs per 100g
 *   - maxCalories: only foods with <= this many calories per 100g
 */
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

/**
 * Calculate nutrition for a custom gram amount.
 * Returns null if grams is invalid.
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

/**
 * Find foods that can hit a target macro within a gram range.
 * Useful for "I want 30g protein from this food" — returns the grams needed.
 */
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
  // Sort by closest to target
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
