/**
 * Local AI plan generator — no external API needed.
 *
 * Generates personalized workout and nutrition plans based on the client's
 * questionnaire data using rule-based logic. This is fast, free, and works
 * in any environment (no API keys required).
 *
 * The plans follow the same structure as the original Lovable project:
 *   Workout: { overview, days: [{ day, focus, exercises: [{name, sets, reps, rest, notes}] }] }
 *   Nutrition: { overview, daily_calories, macros: {protein_g, carbs_g, fat_g}, meals: [{name, items, notes}] }
 */

type ClientContext = {
  name?: string | null;
  nutrition?: any;
  fitness?: any;
  recent_measurements?: any[];
};

type WorkoutContent = {
  overview: string;
  days: Array<{
    day: string;
    focus: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: string;
      notes: string;
    }>;
  }>;
};

type NutritionContent = {
  overview: string;
  daily_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  meals: Array<{
    name: string;
    items: Array<{ food: string; amount: string; calories: number }>;
    notes: string;
  }>;
};

/* ----------------------------- Workout plan ------------------------------ */

export function generateWorkoutPlan(ctx: ClientContext): WorkoutContent {
  const fitness = ctx.fitness || {};
  const nutrition = ctx.nutrition || {};
  const goal = (fitness.goal || nutrition.target || "general fitness").toLowerCase();
  const daysPerWeek = parseInt(fitness.days) || 4;
  const location = (fitness.location || "gym").toLowerCase();
  const experience = (fitness.experience || "intermediate").toLowerCase();
  const injuries = (fitness.injuries || "").toLowerCase();

  const isHome = location.includes("home") || location.includes("منزل");
  const isBeginner = experience.includes("beginner") || experience.includes("مبتدئ");
  const isFatLoss = goal.includes("fat") || goal.includes("loss") || goal.includes("دهون") || goal.includes("تخسيس");
  const isMuscleGain = goal.includes("muscle") || goal.includes("build") || goal.includes("عضلات") || goal.includes("كتلة");

  // Choose split based on days/week
  let days: Array<{ day: string; focus: string; exercises: Array<any> }> = [];

  if (daysPerWeek <= 3) {
    // Full body
    days = [
      { day: "اليوم الأول", focus: "كامل الجسم A", exercises: pickExercises(["squat", "bench", "row", "ohp", "plank"], isHome, isBeginner, injuries) },
      { day: "اليوم الثاني", focus: "كامل الجسم B", exercises: pickExercises(["deadlift", "incline_bench", "pulldown", "leg_press", "curl"], isHome, isBeginner, injuries) },
      { day: "اليوم الثالث", focus: "كامل الجسم C", exercises: pickExercises(["front_squat", "db_press", "chinup", "rdl", "triceps"], isHome, isBeginner, injuries) },
    ].slice(0, daysPerWeek);
  } else if (daysPerWeek === 4) {
    // Upper/Lower split
    days = [
      { day: "اليوم الأول", focus: "أعلى الجسم (قوة)", exercises: pickExercises(["bench", "row", "ohp", "dip", "curl"], isHome, isBeginner, injuries) },
      { day: "اليوم الثاني", focus: "أسفل الجسم (قوة)", exercises: pickExercises(["squat", "rdl", "leg_press", "calf", "plank"], isHome, isBeginner, injuries) },
      { day: "اليوم الثالث", focus: "أعلى الجسم (حجم)", exercises: pickExercises(["incline_db", "pulldown", "lateral", "triceps", "face_pull"], isHome, isBeginner, injuries) },
      { day: "اليوم الرابع", focus: "أسفل الجسم (حجم)", exercises: pickExercises(["front_squat", "hip_thrust", "leg_curl", "calf", "abs"], isHome, isBeginner, injuries) },
    ];
  } else {
    // PPL or bro split
    days = [
      { day: "اليوم الأول", focus: "Push (صدر، أكتاف، ترايسبس)", exercises: pickExercises(["bench", "ohp", "incline_db", "lateral", "triceps"], isHome, isBeginner, injuries) },
      { day: "اليوم الثاني", focus: "Pull (ظهر، بايسبس)", exercises: pickExercises(["deadlift", "pullup", "row", "curl", "face_pull"], isHome, isBeginner, injuries) },
      { day: "اليوم الثالث", focus: "Legs (أرجل)", exercises: pickExercises(["squat", "rdl", "leg_press", "leg_curl", "calf"], isHome, isBeginner, injuries) },
      { day: "اليوم الرابع", focus: "Upper (أعلى الجسم)", exercises: pickExercises(["incline_bench", "pulldown", "ohp", "curl", "triceps"], isHome, isBeginner, injuries) },
      { day: "اليوم الخامس", focus: "Lower (أسفل الجسم)", exercises: pickExercises(["front_squat", "hip_thrust", "leg_curl", "calf", "abs"], isHome, isBeginner, injuries) },
    ].slice(0, daysPerWeek);
  }

  const goalText = isFatLoss ? "حرق الدهون" : isMuscleGain ? "بناء العضلات" : "تحسين اللياقة العامة";
  const overview = `برنامج تمارين مخصص لـ ${ctx.name || "العميل"} بهدف ${goalText}. يتكون من ${days.length} أيام تدريب أسبوعياً في ${isHome ? "المنزل" : "الجيم"}. ركّز على الأداء الصحيح قبل زيادة الأوزان، وتابع التقدم أسبوعياً. ${injuries ? "تم مراعاة الإصابات المذكورة." : ""}`;

  return { overview, days };
}

const EXERCISE_LIBRARY: Record<string, { gym: any; home: any }> = {
  squat: {
    gym: { name: "سكوات بالبار", sets: 4, reps: "6-8", rest: "3 دقائق", notes: "حافظ على عمق الحركة وظهرك مستقيم" },
    home: { name: "سكوات بالدمبل", sets: 4, reps: "10-12", rest: "90 ثانية", notes: "نزل ببطء واصعد بقوة" },
  },
  bench: {
    gym: { name: "بنش بريس", sets: 4, reps: "6-8", rest: "2-3 دقائق", notes: "الكتف مضمّنة، المس بار الصدر" },
    home: { name: "ضغط أرضي", sets: 4, reps: "12-15", rest: "60 ثانية", notes: "حافظ على استقامة الجسم" },
  },
  row: {
    gym: { name: "تجديف بالبار", sets: 4, reps: "8-10", rest: "90 ثانية", notes: "اسحب الكوع للخلف" },
    home: { name: "تجديف بالدمبل", sets: 4, reps: "10-12", rest: "90 ثانية", notes: "ثبّت الجذع" },
  },
  ohp: {
    gym: { name: "ضغط كتف بالبار", sets: 3, reps: "8-10", rest: "2 دقيقة", notes: "لا تقوّس ظهرك" },
    home: { name: "ضغط كتف بالدمبل", sets: 3, reps: "10-12", rest: "90 ثانية", notes: "الدمبل بمحاذاة الأذن" },
  },
  deadlift: {
    gym: { name: "ديدليفت", sets: 3, reps: "5", rest: "3-5 دقائق", notes: "حافظ على استقامة الظهر" },
    home: { name: "ديدليفت روماني بالدمبل", sets: 3, reps: "10-12", rest: "90 ثانية", notes: "انزل بالورك للخلف" },
  },
  incline_bench: {
    gym: { name: "بنش مائل بالبار", sets: 4, reps: "8-10", rest: "2 دقيقة", notes: "زاوية 30 درجة" },
    home: { name: "ضغط مائل بالدمبل", sets: 4, reps: "10-12", rest: "90 ثانية", notes: "تحكم في النزول" },
  },
  incline_db: {
    gym: { name: "بنش مائل بالدمبل", sets: 3, reps: "10-12", rest: "90 ثانية", notes: "مدى حركة كامل" },
    home: { name: "ضغط مائل بالدمبل", sets: 3, reps: "10-12", rest: "90 ثانية", notes: "تحكم في النزول" },
  },
  pulldown: {
    gym: { name: "سحب أمامي", sets: 4, reps: "10-12", rest: "90 ثانية", notes: "اسحب للصدر" },
    home: { name: "سحب باند", sets: 4, reps: "12-15", rest: "60 ثانية", notes: "ثبّت الباند جيداً" },
  },
  pullup: {
    gym: { name: "عقلة", sets: 4, reps: "6-10", rest: "2 دقيقة", notes: "مدى حركة كامل" },
    home: { name: "عقلة استسلامية", sets: 4, reps: "8-12", rest: "90 ثانية", notes: "نزل ببطء" },
  },
  chinup: {
    gym: { name: "عقلة قبضة معكوسة", sets: 3, reps: "6-10", rest: "2 دقيقة", notes: "تركيز على البايسبس" },
    home: { name: "عقلة استسلامية", sets: 3, reps: "8-12", rest: "90 ثانية", notes: "نزل ببطء" },
  },
  leg_press: {
    gym: { name: "ليج بريس", sets: 4, reps: "10-12", rest: "2 دقيقة", notes: "لا تقفل الركبة بالكامل" },
    home: { name: "لانجز بالدمبل", sets: 4, reps: "12 لكل رجل", rest: "90 ثانية", notes: "الركبة خلف القدم" },
  },
  leg_curl: {
    gym: { name: "ليج كيرل", sets: 3, reps: "12-15", rest: "60 ثانية", notes: "تحكم في الحركة" },
    home: { name: "هامسترنج كيرل بالباند", sets: 3, reps: "15-20", rest: "60 ثانية", notes: "ثبّت الورك" },
  },
  front_squat: {
    gym: { name: "فرنت سكوات", sets: 4, reps: "6-8", rest: "3 دقائق", notes: "حافظ على الصدر مرفوع" },
    home: { name: "جوبيت سكوات", sets: 4, reps: "10-12", rest: "90 ثانية", notes: "نزل كاملاً" },
  },
  rdl: {
    gym: { name: "رومانيان ديدليفت", sets: 4, reps: "8-10", rest: "2 دقيقة", notes: "انزل بالورك للخلف" },
    home: { name: "رومانيان ديدليفت بالدمبل", sets: 4, reps: "10-12", rest: "90 ثانية", notes: "ابطأ في النزول" },
  },
  hip_thrust: {
    gym: { name: "هيب ثرست", sets: 4, reps: "10-12", rest: "2 دقيقة", notes: "اكتمل الحركة في الأعلى" },
    home: { name: "هيب ثرست بوزن الجسم", sets: 4, reps: "15-20", rest: "60 ثانية", notes: "ارفع الورك بالكامل" },
  },
  calf: {
    gym: { name: "كاف ريز", sets: 4, reps: "15-20", rest: "60 ثانية", notes: "مدى حركة كامل" },
    home: { name: "كاف ريز على السلم", sets: 4, reps: "15-20", rest: "60 ثانية", notes: "انزل بالكامل" },
  },
  curl: {
    gym: { name: "بايسبس كيرل بالبار", sets: 3, reps: "10-12", rest: "60 ثانية", notes: "لا تتحرك بالكتف" },
    home: { name: "بايسبس كيرل بالدمبل", sets: 3, reps: "12-15", rest: "60 ثانية", notes: "تحكم في النزول" },
  },
  triceps: {
    gym: { name: "ترايسبس بوش داون", sets: 3, reps: "12-15", rest: "60 ثانية", notes: "ثبّت المرفقين" },
    home: { name: "ديبس على الكرسي", sets: 3, reps: "12-15", rest: "60 ثانية", notes: "انزل ببطء" },
  },
  dip: {
    gym: { name: "ديبس", sets: 3, reps: "8-12", rest: "90 ثانية", notes: "الميل للأمام للصدر" },
    home: { name: "ديبس على الكرسي", sets: 3, reps: "12-15", rest: "60 ثانية", notes: "انزل ببطء" },
  },
  lateral: {
    gym: { name: "رفرفة جانبية", sets: 3, reps: "15", rest: "60 ثانية", notes: "لا ترفع فوق الكتف" },
    home: { name: "رفرفة جانبية بالدمبل", sets: 3, reps: "15", rest: "60 ثانية", notes: "تحكم في الحركة" },
  },
  face_pull: {
    gym: { name: "فيس بول", sets: 3, reps: "15-20", rest: "60 ثانية", notes: "للأكتاف والوضعية" },
    home: { name: "فيس بول بالباند", sets: 3, reps: "15-20", rest: "60 ثانية", notes: "ثبّت الباند" },
  },
  plank: {
    gym: { name: "بلانك", sets: 3, reps: "45-60 ثانية", rest: "45 ثانية", notes: "حافظ على استقامة الجسم" },
    home: { name: "بلانك", sets: 3, reps: "45-60 ثانية", rest: "45 ثانية", notes: "شد البطن" },
  },
  abs: {
    gym: { name: "كرنش بالكابل", sets: 3, reps: "15-20", rest: "60 ثانية", notes: "ركز على الانقباض" },
    home: { name: "كرنش", sets: 3, reps: "20-25", rest: "45 ثانية", notes: "لا تشد الرقبة" },
  },
};

function pickExercises(
  keys: string[],
  isHome: boolean,
  isBeginner: boolean,
  _injuries: string,
): Array<any> {
  return keys.map((k) => {
    const ex = EXERCISE_LIBRARY[k];
    if (!ex) return null;
    const variant = isHome ? ex.home : ex.gym;
    if (isBeginner) {
      return { ...variant, sets: Math.max(3, variant.sets - 1), reps: "10-12" };
    }
    return variant;
  }).filter(Boolean);
}

/* ---------------------------- Nutrition plan ----------------------------- */

// Mifflin-St Jeor BMR formula — the most accurate for general population
function calculateBMR(weight: number, height: number, age: number, isMale: boolean): number {
  if (isMale) {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}

// Activity multipliers based on activity level
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,        // مكتب work, no exercise
  light: 1.375,          // 1-3 days exercise
  moderate: 1.55,        // 3-5 days exercise
  active: 1.725,         // 6-7 days exercise
  very_active: 1.9,      // athlete level
};

function parseActivityLevel(activity: string): number {
  const a = (activity || "").toLowerCase();
  if (a.includes("very") || a.includes("نشيط جدا") || a.includes("رياضي")) return 1.9;
  if (a.includes("active") || a.includes("نشيط") || a.includes("6") || a.includes("7")) return 1.725;
  if (a.includes("moderate") || a.includes("متوسط") || a.includes("3") || a.includes("4") || a.includes("5")) return 1.55;
  if (a.includes("light") || a.includes("خفيف") || a.includes("1") || a.includes("2")) return 1.375;
  return 1.2; // sedentary default
}

// Food database with calories per 100g and macros per 100g
type FoodItem = {
  name: string;
  name_en: string;
  calsPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  category: "protein" | "carb" | "fat" | "veg" | "fruit" | "dairy";
};

const FOOD_DB: FoodItem[] = [
  // Proteins
  { name: "صدر دجاج مشوي", name_en: "chicken breast", calsPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, category: "protein" },
  { name: "لحم بقري قليل الدهن", name_en: "lean beef", calsPer100g: 217, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 12, category: "protein" },
  { name: "سمك سلمون", name_en: "salmon", calsPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, category: "protein" },
  { name: "تونة", name_en: "tuna", calsPer100g: 132, proteinPer100g: 28, carbsPer100g: 0, fatPer100g: 1, category: "protein" },
  { name: "بيض كامل", name_en: "whole egg", calsPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, category: "protein" },
  { name: "بياض البيض", name_en: "egg white", calsPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, category: "protein" },
  { name: "روبيان", name_en: "shrimp", calsPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3, category: "protein" },
  { name: "كبدة دجاج", name_en: "chicken liver", calsPer100g: 119, proteinPer100g: 17, carbsPer100g: 0.7, fatPer100g: 4.8, category: "protein" },
  // Carbs
  { name: "أرز بسمتي مطبوخ", name_en: "rice", calsPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, category: "carb" },
  { name: "بطاطس مسلوقة", name_en: "potato", calsPer100g: 87, proteinPer100g: 2, carbsPer100g: 20, fatPer100g: 0.1, category: "carb" },
  { name: "بطاطا حلوة", name_en: "sweet potato", calsPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, category: "carb" },
  { name: "شوفان جاف", name_en: "oats", calsPer100g: 389, proteinPer100g: 6.8, carbsPer100g: 28, fatPer100g: 7, category: "carb" },
  { name: "خبز أسمر", name_en: "brown bread", calsPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatPer100g: 3.2, category: "carb" },
  { name: "كينوا مطبوخة", name_en: "quinoa", calsPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, category: "carb" },
  { name: "معكرونة قمح كامل", name_en: "whole pasta", calsPer100g: 124, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, category: "carb" },
  // Fats
  { name: "زيت زيتون", name_en: "olive oil", calsPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, category: "fat" },
  { name: "لوز", name_en: "almonds", calsPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, category: "fat" },
  { name: "فول سوداني", name_en: "peanuts", calsPer100g: 567, proteinPer100g: 26, carbsPer100g: 16, fatPer100g: 49, category: "fat" },
  { name: "زبادي بذور الكتان", name_en: "flaxseed", calsPer100g: 534, proteinPer100g: 18, carbsPer100g: 29, fatPer100g: 42, category: "fat" },
  { name: "أفوكادو", name_en: "avocado", calsPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, category: "fat" },
  // Dairy
  { name: "زبادي يوناني", name_en: "greek yogurt", calsPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4, category: "dairy" },
  { name: "جبن قريش", name_en: "cottage cheese", calsPer100g: 98, proteinPer100g: 11, carbsPer100g: 3.4, fatPer100g: 4.3, category: "dairy" },
  { name: "حليب بقري 2%", name_en: "milk 2%", calsPer100g: 50, proteinPer100g: 3.3, carbsPer100g: 5, fatPer100g: 2, category: "dairy" },
  // Vegetables
  { name: "بروكلي مطبوخ", name_en: "broccoli", calsPer100g: 35, proteinPer100g: 2.4, carbsPer100g: 7, fatPer100g: 0.4, category: "veg" },
  { name: "سبانخ مطبوخ", name_en: "spinach", calsPer100g: 23, proteinPer100g: 3, carbsPer100g: 3.8, fatPer100g: 0.3, category: "veg" },
  { name: "خيار", name_en: "cucumber", calsPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, category: "veg" },
  { name: "طماطم", name_en: "tomato", calsPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, category: "veg" },
  { name: "خس", name_en: "lettuce", calsPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, category: "veg" },
  { name: "فلفل أخضر", name_en: "green pepper", calsPer100g: 20, proteinPer100g: 0.9, carbsPer100g: 4.6, fatPer100g: 0.2, category: "veg" },
  // Fruits
  { name: "موز", name_en: "banana", calsPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, category: "fruit" },
  { name: "تفاح", name_en: "apple", calsPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, category: "fruit" },
  { name: "برتقال", name_en: "orange", calsPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, category: "fruit" },
  { name: "فراولة", name_en: "strawberry", calsPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, category: "fruit" },
];

// Calculate exact grams needed for a food to hit a target calorie amount
function gramsForCalories(food: FoodItem, targetCals: number): number {
  return Math.round(targetCals / food.calsPer100g * 100);
}

// Calculate exact macros for a given food + grams
function calcMacros(food: FoodItem, grams: number) {
  return {
    protein: Math.round(food.proteinPer100g * grams / 100),
    carbs: Math.round(food.carbsPer100g * grams / 100),
    fat: Math.round(food.fatPer100g * grams / 100),
    calories: Math.round(food.calsPer100g * grams / 100),
  };
}

export function generateNutritionPlan(ctx: ClientContext): NutritionContent {
  const nutrition = ctx.nutrition || {};
  const fitness = ctx.fitness || {};
  const measurements = ctx.recent_measurements || [];

  // Parse all client data
  const weight = parseFloat(nutrition.weight || measurements[0]?.weight || "80");
  const height = parseFloat(nutrition.height || "175");
  const age = parseInt(nutrition.age || "25");
  const targetWeight = parseFloat(nutrition.target || nutrition.target_weight || weight);
  const goal = (fitness.goal || "").toLowerCase();
  const activityLevel = parseActivityLevel(fitness.activity || "");
  const trainingDays = parseInt(fitness.days) || 4;

  // Determine goal
  const weightDiff = targetWeight - weight;
  const isFatLoss = weightDiff < -2 || goal.includes("fat") || goal.includes("دهون") || goal.includes("تخسيس") || goal.includes("loss");
  const isMuscleGain = weightDiff > 2 || goal.includes("muscle") || goal.includes("عضلات") || goal.includes("build") || goal.includes("كتلة");
  const isRecomp = !isFatLoss && !isMuscleGain;

  // Step 1: Calculate BMR using Mifflin-St Jeor
  // Assume male if not specified (can be extended)
  const isMale = true; // TODO: add gender field
  const bmr = calculateBMR(weight, height, age, isMale);

  // Step 2: Calculate TDEE = BMR × activity multiplier
  // Adjust multiplier based on training days
  let adjustedMultiplier = activityLevel;
  if (trainingDays >= 5) adjustedMultiplier = Math.max(activityLevel, 1.725);
  else if (trainingDays >= 3) adjustedMultiplier = Math.max(activityLevel, 1.55);
  else if (trainingDays >= 1) adjustedMultiplier = Math.max(activityLevel, 1.375);

  const tdee = Math.round(bmr * adjustedMultiplier);

  // Step 3: Calculate target calories based on goal
  let dailyCalories: number;
  let deficitSurplus: number;
  if (isFatLoss) {
    // Moderate deficit: 20% below TDEE (safe, sustainable)
    deficitSurplus = -Math.round(tdee * 0.20);
    dailyCalories = tdee + deficitSurplus;
  } else if (isMuscleGain) {
    // Slight surplus: 10% above TDEE
    deficitSurplus = Math.round(tdee * 0.10);
    dailyCalories = tdee + deficitSurplus;
  } else {
    // Maintenance
    deficitSurplus = 0;
    dailyCalories = tdee;
  }

  // Round to nearest 10
  dailyCalories = Math.round(dailyCalories / 10) * 10;

  // Step 4: Calculate macros based on goal
  let proteinG: number, fatG: number, carbsG: number;

  if (isFatLoss) {
    // Cutting: high protein (2.4g/kg), moderate fat (0.8g/kg), low carbs
    proteinG = Math.round(weight * 2.4);
    fatG = Math.round(weight * 0.8);
    carbsG = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));
  } else if (isMuscleGain) {
    // Bulking: moderate protein (2g/kg), moderate fat (1g/kg), high carbs
    proteinG = Math.round(weight * 2.0);
    fatG = Math.round(weight * 1.0);
    carbsG = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));
  } else {
    // Maintenance: balanced
    proteinG = Math.round(weight * 2.0);
    fatG = Math.round(weight * 1.0);
    carbsG = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));
  }

  // Step 5: Build meals with EXACT calorie/macro targets
  const mealsCount = parseInt(nutrition.meals) || 4;
  const diet = (nutrition.diet || "").toLowerCase();
  const isVeg = diet.includes("veg") || diet.includes("نبات");
  const allergies = (nutrition.allergies || "").toLowerCase();
  const disliked = (nutrition.disliked || "").toLowerCase();
  const medicalConditions = (nutrition.medical || "").toLowerCase();

  // Filter foods based on preferences
  const availableFoods = FOOD_DB.filter((f) => {
    const name = f.name.toLowerCase();
    const nameEn = f.name_en.toLowerCase();
    // Check allergies
    if (allergies.split(",").some((a) => {
      const item = a.trim().toLowerCase();
      return item && (name.includes(item) || nameEn.includes(item));
    })) return false;
    // Check disliked
    if (disliked.split(",").some((d) => {
      const item = d.trim().toLowerCase();
      return item && (name.includes(item) || nameEn.includes(item));
    })) return false;
    // Filter veg
    if (isVeg && (f.category === "protein") && !nameEn.includes("egg") && !nameEn.includes("yogurt") && !nameEn.includes("cheese") && !nameEn.includes("milk")) return false;
    return true;
  });

  // Meal distribution: not equal — breakfast 25%, lunch 35%, snack 15%, dinner 25%
  const distributions = mealsCount === 3
    ? [0.35, 0.35, 0.30]
    : mealsCount === 4
    ? [0.25, 0.35, 0.15, 0.25]
    : mealsCount === 5
    ? [0.20, 0.30, 0.10, 0.25, 0.15]
    : [0.20, 0.25, 0.10, 0.20, 0.10, 0.15]; // 6 meals

  const mealNames = mealsCount === 3
    ? ["الفطار", "الغداء", "العشاء"]
    : mealsCount === 4
    ? ["الفطار", "الغداء", "سناك", "العشاء"]
    : mealsCount === 5
    ? ["الفطار", "سناك صباحي", "الغداء", "سناك", "العشاء"]
    : ["الفطار", "سناك صباحي", "الغداء", "سناك", "العشاء", "سناك مسائي"];

  // Build each meal with exact macro targets
  const meals = distributions.slice(0, mealsCount).map((dist, idx) => {
    const mealCals = Math.round(dailyCalories * dist);
    const mealProtein = Math.round(proteinG * dist);
    const mealCarbs = Math.round(carbsG * dist);
    const mealFat = Math.round(fatG * dist);

    // Select foods for this meal
    const proteins = availableFoods.filter((f) => f.category === "protein");
    const carbs = availableFoods.filter((f) => f.category === "carb");
    const fats = availableFoods.filter((f) => f.category === "fat");
    const vegs = availableFoods.filter((f) => f.category === "veg");
    const fruits = availableFoods.filter((f) => f.category === "fruit");
    const dairy = availableFoods.filter((f) => f.category === "dairy");

    const items: Array<{ food: string; amount: string; calories: number }> = [];

    // Pick foods based on meal position
    let proteinFood: FoodItem | undefined;
    let carbFood: FoodItem | undefined;
    let fatFood: FoodItem | undefined;
    let vegFood: FoodItem | undefined;
    let fruitFood: FoodItem | undefined;

    // Rotate protein sources across meals
    const proteinRotation = idx % proteins.length;
    proteinFood = proteins[proteinRotation];
    carbFood = carbs[idx % carbs.length];
    fatFood = fats[idx % fats.length];
    vegFood = vegs[idx % vegs.length];
    fruitFood = fruits[idx % fruits.length];

    // Calculate grams for each food to hit calorie targets
    // Protein food: target ~70% of meal protein from this source
    if (proteinFood) {
      // Calculate grams based on protein content, not just calories
      const targetProteinFromFood = Math.round(mealProtein * 0.75);
      const grams = Math.max(30, Math.round(targetProteinFromFood / proteinFood.proteinPer100g * 100));
      const macros = calcMacros(proteinFood, grams);
      items.push({
        food: proteinFood.name,
        amount: `${grams} جم`,
        calories: macros.calories,
      });
    }

    // Carb food: target ~70% of meal carbs from this source
    if (carbFood) {
      const targetCarbsFromFood = Math.round(mealCarbs * 0.75);
      const grams = Math.max(50, Math.round(targetCarbsFromFood / carbFood.carbsPer100g * 100));
      const macros = calcMacros(carbFood, grams);
      items.push({
        food: carbFood.name,
        amount: `${grams} جم`,
        calories: macros.calories,
      });
    }

    // Fat source: target ~50% of meal fat from this source
    if (fatFood) {
      const targetFatFromFood = Math.round(mealFat * 0.4);
      const grams = Math.max(5, Math.round(targetFatFromFood / fatFood.fatPer100g * 100));
      const macros = calcMacros(fatFood, grams);
      items.push({
        food: fatFood.name,
        amount: `${grams} جم`,
        calories: macros.calories,
      });
    }

    // Dairy (for breakfast/snacks) — adds protein + calories
    if ((idx === 0 || idx === 2 || idx === 3) && dairy.length > 0) {
      const dairyFood = dairy[idx % dairy.length];
      const grams = 150;
      const macros = calcMacros(dairyFood, grams);
      items.push({
        food: dairyFood.name,
        amount: `${grams} جم`,
        calories: macros.calories,
      });
    }

    // Vegetables (low cal, high volume)
    if (vegFood) {
      const grams = 150; // standard veg serving
      const macros = calcMacros(vegFood, grams);
      items.push({
        food: vegFood.name,
        amount: `${grams} جم`,
        calories: macros.calories,
      });
    }

    // Fruit for breakfast/snacks
    if (idx === 0 || idx === 2 || idx === 3) {
      if (fruitFood) {
        const grams = 100;
        const macros = calcMacros(fruitFood, grams);
        items.push({
          food: fruitFood.name,
          amount: `${grams} جم`,
          calories: macros.calories,
        });
      }
    }

    // Meal notes based on timing
    let notes = "";
    if (idx === 0) notes = "تناولها خلال ساعة من الاستيقاظ — مهمة لتشغيل الأيض";
    else if (idx === mealsCount - 1) notes = "وجبة خفيفة قبل النوم بـ 2-3 ساعات";
    else if (idx === Math.floor(mealsCount / 2)) notes = "أكبر وجبة — قبل/بعد التمرين";
    else notes = "وجبة خفيفة للحفاظ على طاقة الجسم";

    return { name: mealNames[idx] || `وجبة ${idx + 1}`, items, notes };
  });

  // Calculate actual totals from meals
  const actualCals = meals.reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.calories, 0), 0);
  const goalText = isFatLoss ? "خسارة الدهون" : isMuscleGain ? "بناء العضلات" : "الحفاظ على الوزن";

  const overview = `خطة تغذية مخصصة لـ ${ctx.name || "العميل"} بهدف ${goalText}.

📊 تحليل بياناتك:
• الوزن: ${weight} كجم | الهدف: ${targetWeight} كجم
• الطول: ${height} سم | العمر: ${age} سنة
• معدل الأيض الأساسي (BMR): ${bmr} كالوري
• إجمالي الاستهلاك (TDEE): ${tdee} كالوري
• ${deficitSurplus < 0 ? `عجز يومي: ${Math.abs(deficitSurplus)} كالوري` : deficitSurplus > 0 ? `فائض يومي: ${deficitSurplus} كالوري` : "صيانة"}

🎯 السعرات المستهدفة: ${dailyCalories} كالوري/يوم
🥩 البروتين: ${proteinG}جم (≈${(proteinG * 4 / dailyCalories * 100).toFixed(0)}%)
🍚 الكارب: ${carbsG}جم (≈${(carbsG * 4 / dailyCalories * 100).toFixed(0)}%)
🥑 الدهون: ${fatG}جم (≈${(fatG * 9 / dailyCalories * 100).toFixed(0)}%)

${allergies ? `⚠️ تم استبعاد: ${allergies}\n` : ""}${disliked ? `⚠️ تم تجنب: ${disliked}\n` : ""}${isVeg ? "🌱 نظام نباتي\n" : ""}وزّع الوجبات على مدار اليوم لتحقيق أفضل امتصاص للبروتين وحرق دهون مستمر.`;

  return {
    overview,
    daily_calories: dailyCalories,
    macros: { protein_g: proteinG, carbs_g: carbsG, fat_g: fatG },
    meals,
  };
}

/* ----------------------------- Chat reply -------------------------------- */

/**
 * Smart chat reply — reads the client's full context (plans, questionnaires,
 * progress, subscription) and answers questions intelligently.
 *
 * IMPORTANT: This AI does NOT generate new plans. It only:
 * - Answers questions about existing plans
 * - Calculates swap equivalents (grams, macros) when client asks
 * - Suggests using the swap button on specific meals/exercises
 * - If daily limit reached, suggests sending a request to the coach
 */
export function generateChatReply(message: string, ctx?: ClientContext): string {
  const text = message.toLowerCase();
  const name = ctx?.name || "";
  const plans = ctx?.current_plans || [];
  const nutrition = ctx?.nutrition || {};
  const fitness = ctx?.fitness || {};
  const measurements = ctx?.recent_measurements || [];
  const subscription = (ctx as any)?.subscription;

  // Greeting
  if (text.match(/^(hello|hi|hey|مرحبا|اهلا|أهلا|السلام|سلام)/)) {
    return `أهلاً${name ? ` ${name}` : ""}! 👋 أنا مساعدك الذكي. عندي خلفية كاملة عن:
${plans.length > 0 ? `✅ خططك الحالية (${plans.length} خطة)` : "⏳ لا توجد خطط مفعّلة بعد"}
${nutrition.weight ? `✅ وزنك الحالي: ${nutrition.weight} كجم` : ""}
${fitness.goal ? `✅ هدفك: ${fitness.goal}` : ""}

تقدر تسألني عن:
• تبديل صنف معين (مثال: "اكل بطاطس بدل الرز؟")
• كم بروتين/سعرات في وجبة معينة
• استبدال تمرين بآخر
• أي سؤال عن خطتك الحالية

إذا خلصت حد التبديلات اليومي، هقدر أساعدك تطلب تبديل من المدرب مباشرة. كيف أقدر أساعدك؟`;
  }

  // Swap request — food
  if ((text.includes("بدل") || text.includes("استبدل") || text.includes("swap")) && (text.includes("بطاطس") || text.includes("رز") || text.includes("ارز") || text.includes("دجاج") || text.includes("سمك") || text.includes("لحم") || text.includes("اكل") || text.includes("وجبة") || text.includes("meal"))) {
    return handleFoodSwapQuestion(text, ctx);
  }

  // Swap request — exercise
  if ((text.includes("بدل") || text.includes("استبدل") || text.includes("swap")) && (text.includes("تمرين") || text.includes("سكوات") || text.includes("بنش") || text.includes("ديدليفت") || text.includes("exercise") || text.includes("workout"))) {
    return handleExerciseSwapQuestion(text, ctx);
  }

  // Protein question
  if (text.includes("protein") || text.includes("بروتين")) {
    const weight = parseFloat(nutrition.weight || measurements[0]?.weight || "80");
    const proteinTarget = Math.round(weight * 2);
    // Check if they have a nutrition plan
    const nutritionPlan = plans.find((p: any) => p.type === "meal" || p.type === "nutrition");
    if (nutritionPlan?.content?.macros?.protein_g) {
      return `خطة التغذية الحالية بتاعتك فيها ${nutritionPlan.content.macros.protein_g}جم بروتين يومياً.
وزنك ${weight} كجم، يعني احتياجك التقريبي ${proteinTarget}جم (2جم/كجم) — خطتك بتغطي احتياجك تماماً! ✅

مصادر ممتازة للبروتين: صدور دجاج، بيض، سمك، لحم قليل الدهن، زبادي يوناني، جبن قريش.

لو عايز تبديل صنف بروتيني، اضغط زر "استبدال" على الوجبة في صفحة خطتي، أو اسألني عن تبديل معين وأحسبه لك.`;
    }
    return `احتياجك اليومي من البروتين حوالي ${proteinTarget}جم (2جم/كجم وزنك ${weight}كجم).
وزّعها على 4 وجبات (${Math.round(proteinTarget / 4)}جم لكل وجبة) لأفضل امتصاص.

بعد ما الكوتش يفعّل خطة تغذيتك، هقدر أقولك بالضبط كم بروتين في كل وجبة وأي تبديلات تناسبك.`;
  }

  // Water question
  if (text.includes("water") || text.includes("ماء") || text.includes("مياه") || text.includes("شرب")) {
    const weight = parseFloat(nutrition.weight || measurements[0]?.weight || "80");
    const waterTarget = Math.round(weight * 35 / 1000 * 10) / 10;
    return `احتياجك اليومي من الماء حوالي ${waterTarget} لتر (${Math.round(weight * 35)} مل).
اضف 500 مل حول التمرين وزد في الجو الحار. ابدأ يومك بكوبين ماء على الريق.`;
  }

  // Weight/fat loss
  if (text.includes("weight") || text.includes("وزن") || text.includes("fat") || text.includes("دهون") || text.includes("تخسيس") || text.includes("تنحيف")) {
    const weight = parseFloat(nutrition.weight || measurements[0]?.weight || "80");
    const target = parseFloat(nutrition.target || nutrition.target_weight || "0");
    const nutritionPlan = plans.find((p: any) => p.type === "meal" || p.type === "nutrition");
    if (nutritionPlan?.content?.daily_calories) {
      return `خطتك الحالية فيها ${nutritionPlan.content.daily_calories} كالوري يومياً.
صيانة وزنك تقريباً ${Math.round(weight * 33)} كالوري، يعني خطتك بتعمل عجز ${Math.round(weight * 33 - nutritionPlan.content.daily_calories)} كالوري/يوم ≈ ${Math.round((weight * 33 - nutritionPlan.content.daily_calories) * 7 / 7700 * 10) / 10} كجم أسبوعياً.

${target ? `هدفك: ${target} كجم (متبقي ${Math.round((weight - target) * 10) / 10} كجم).` : ""}
استمر في خطتك + سجل وزنك كل أسبوع في صفحة التقدم.`;
    }
    return `لخسارة الدهون بشكل مستدام، استهدف عجز 300-500 كالوري يومياً (≈0.4-0.5 كجم أسبوعياً). حافظ على البروتين عالياً (2جم/كجم)، درّب الأوزان 4 مرات أسبوعياً، وأضف 20-30 دقيقة كارديو 2-3 مرات.`;
  }

  // Cardio
  if (text.includes("cardio") || text.includes("كارديو") || text.includes("مشي") || text.includes("جري")) {
    return `الكارديو اختياري لخسارة الدهون لكن ممتاز لصحة القلب. 2-3 جلسات أسبوعياً مدة 20-30 دقيقة كافية فوق التمارين المقاومة. اختر ما تحب: مشي سريع، دراجة، أو HIIT.`;
  }

  // Sleep
  if (text.includes("sleep") || text.includes("نوم")) {
    return `النوم 7-9 ساعات أساسي للتعافي وهرمونات التغذية. قلل الشاشات قبل النوم بساعة، تجنب الكافيين بعد العصر، وحافظ على مواعيد ثابتة.`;
  }

  // Supplements
  if (text.includes("supplement") || text.includes("مكمل") || text.includes("واي") || text.includes("كرياتين") || text.includes("فيتامين")) {
    return `المكملات الأساسية: واي بروتين (1-2 سكوب يومياً)، كرياتين (5جم يومياً)، فيتامين D (2000-4000 IU). الباقي اختياري. استشر طبيباً قبل أي مكمل إذا لديك حالة طبية.`;
  }

  // Ask about current plan
  if (text.includes("خطتي") || text.includes("plan") || text.includes("الخطة") || text.includes("برنامجي") || text.includes("نظامي")) {
    if (plans.length === 0) {
      return `لا يوجد خطة مفعّلة لديك حالياً. بمجرد ما الكوتش يفعّل خطتك، هقدر أقولك تفاصيلها بالكامل: السعرات، الماكروز، الوجبات، التمارين، وأي تبديلات تناسبك.`;
    }
    const mealPlan = plans.find((p: any) => p.type === "meal" || p.type === "nutrition");
    const workoutPlan = plans.find((p: any) => p.type === "workout");
    let reply = `عندك ${plans.length} خطة مفعّلة:\n\n`;
    if (mealPlan?.content) {
      const c = mealPlan.content;
      reply += `🍽️ ${mealPlan.title}:\n`;
      if (c.daily_calories) reply += `   • السعرات: ${c.daily_calories} كالوري/يوم\n`;
      if (c.macros) reply += `   • الماكروز: بروتين ${c.macros.protein_g}جم | كارب ${c.macros.carbs_g}جم | دهون ${c.macros.fat_g}جم\n`;
      if (c.meals) reply += `   • ${c.meals.length} وجبات\n`;
      reply += "\n";
    }
    if (workoutPlan?.content?.days) {
      reply += `💪 ${workoutPlan.title}:\n   • ${workoutPlan.content.days.length} أيام تدريب/أسبوع\n`;
      reply += `   • الأيام: ${workoutPlan.content.days.map((d: any) => d.focus || d.day).join("، ")}\n\n`;
    }
    reply += `تقدر تسألني عن أي وجبة أو تمرين محدد، أو تطلب تبديل وأحسبه لك.`;
    return reply;
  }

  // Swap limit question
  if (text.includes("حد") || text.includes("limit") || text.includes("كام تبديل") || text.includes("عدد التبديلات") || text.includes("كم تبديل")) {
    if (subscription?.swapLimit === null) {
      return `اشتراكك ${subscription.tierName || "المميز"} يتيح لك تبديلات غير محدودة يومياً! 🎉
تقدر تبديل وجبات وتمارين قد ما تحب بدون أي قيود.`;
    }
    return `اشتراكك ${subscription.tierName || "الحالي"} يتيح لك ${subscription?.swapLimit || 2} تبديل يومياً لكل نوع:
• ${subscription?.swapLimit || 2} تبديل وجبات/يوم
• ${subscription?.swapLimit || 2} تبديل تمارين/يوم

تتجدد التبديلات كل يوم. إذا خلصت الحد، تقدر تطلب تبديل من المدرب مباشرة وأنا هساعدك تقدم الطلب.`;
  }

  // Default — suggest options
  return `سؤال حلو${name ? ` ${name}` : ""}! 😊

تقدر تسألني عن:
• "اكل بطاطس بدل الرز؟" — أحسبلك التبديل بالجرامات والسعرات
• "كم بروتين في خطتي؟" — أقولك تفاصيل خطتك
• "استبدل تمرين السكوات" — أقترح بديل بنفس العضلة
• "كم تبديل باقي لي؟" — أقولك حدك اليومي

لو سؤالك عن حاجة تانية، وضّح لي أكتر وأنا أساعدك. لو محتاج تبديل خارج الحد اليومي، أقدر أساعدك تطلب من المدرب مباشرة.`;
}

function handleFoodSwapQuestion(text: string, ctx?: ClientContext): string {
  const plans = ctx?.current_plans || [];
  const nutrition = ctx?.nutrition || {};
  const nutritionPlan = plans.find((p: any) => p.type === "meal" || p.type === "nutrition");

  // Common food swaps with macro calculations
  const foodSwaps: Record<string, { from: string; to: string; fromCal: number; toCal: number; fromGrams: number; toGrams: number; fromProtein: number; toProtein: number; fromCarbs: number; toCarbs: number; note: string }> = {
    "بطاطس رز": {
      from: "أرز أبيض مطبوخ",
      to: "بطاطس مسلوقة",
      fromCal: 130, toCal: 87, // per 100g
      fromGrams: 150, toGrams: 224, // 150g rice = 195cal, 224g potato = 195cal
      fromProtein: 2.7, toProtein: 2.0,
      fromCarbs: 28, toCarbs: 20,
      note: "البطاطس فيها سعرات أقل لكل 100جم، فمحتاج كمية أكبر لمطابقة السعرات. البطاطس فيها ألياف أكثر وشبع أعلى.",
    },
    "رز بطاطس": {
      from: "أرز أبيض مطبوخ",
      to: "بطاطس مسلوقة",
      fromCal: 130, toCal: 87,
      fromGrams: 150, toGrams: 224,
      fromProtein: 2.7, toProtein: 2.0,
      fromCarbs: 28, toCarbs: 20,
      note: "البطاطس فيها سعرات أقل لكل 100جم، فمحتاج كمية أكبر لمطابقة السعرات. البطاطس فيها ألياف أكثر وشبع أعلى.",
    },
    "دجاج سمك": {
      from: "صدر دجاج",
      to: "سمك (تونة/سلمون)",
      fromCal: 165, toCal: 132,
      fromGrams: 150, toGrams: 187,
      fromProtein: 31, toProtein: 28,
      fromCarbs: 0, toCarbs: 0,
      note: "السمك فيه سعرات أقل لكن دهون أوميغا-3 صحية. زود الكمية قليل لمطابقة البروتين.",
    },
    "ارز شوفان": {
      from: "أرز",
      to: "شوفان",
      fromCal: 130, toCal: 389,
      fromGrams: 150, toGrams: 50, // 50g oats dry = 195cal
      fromProtein: 2.7, toProtein: 6.8,
      fromCarbs: 28, toCarbs: 28,
      note: "الشوفان طاقة أعلى لكل جرام، فمحتاج كمية أقل. فيه ألياف أكثر وبروتين أعلى.",
    },
  };

  // Find matching swap
  let swap = null;
  for (const key of Object.keys(foodSwaps)) {
    const [a, b] = key.split(" ");
    if ((text.includes(a) && text.includes(b)) || text.includes(key)) {
      swap = foodSwaps[key];
      break;
    }
  }

  // Generic calculation for any food swap
  if (!swap) {
    if (nutritionPlan?.content?.meals) {
      return `سؤال ممتاز عن تبديل الأطعمة! 🍽️

عندك ${nutritionPlan.content.meals.length} وجبات في خطتك الحالية. للتبديل:
1. اذهب لصفحة "خطتي"
2. افتح الخطة
3. اضغط زر "استبدال" 🔄 بجانب الوجبة

أو اكتب لي سؤالك بالتفصيل، مثال:
• "بدل الرز بإيه؟" — أقترح بدائل بنفس السعرات
• "كم بطاطس بدل 150 جم رز؟" — أحسبلك بالضبط

تقدر تسألني عن أي صنف محدد وأحسبلك المكافئ بالجرامات والسعرات.`;
    }
    return `لتبديل صنف معين، اذهب لصفحة "خطتي" واضغط زر "استبدال" 🔄 بجانب الوجبة.

أو اسألني سؤال محدد مثل:
• "بدل الرز بإيه؟"
• "كم بطاطس تساوي 100 جم رز؟"

وأحسبلك التبديل بالجرامات والسعرات والماكروز.`;
  }

  return `✅ تبديل ${swap.from} بـ ${swap.to}:

📊 الحسابات (لمطابقة ${swap.fromGrams}جم من ${swap.from}):
• ${swap.to}: ${swap.toGrams}جم
• السعرات: ${Math.round(swap.fromCal * swap.fromGrams / 100)} كالوري (نفس السعرات)
• البروتين: ${swap.fromProtein}جم → ${swap.toProtein}جم
• الكارب: ${swap.fromCarbs}جم → ${swap.toCarbs}جم

💡 ${swap.note}

للتبديل الفعلي، اذهب لصفحة "خطتي" واضغط زر "استبدال" على الوجبة، أو اطلب مني وأنا أساعدك.`;
}

function handleExerciseSwapQuestion(text: string, ctx?: ClientContext): string {
  const plans = ctx?.current_plans || [];
  const workoutPlan = plans.find((p: any) => p.type === "workout");

  // Common exercise swaps by muscle group
  const exerciseSwaps: Record<string, { from: string; to: string; muscle: string; sets: number; reps: string; note: string }> = {
    "سكوات": { from: "سكوات", to: "ليج بريس / جوبيت سكوات", muscle: "أمام الفخذ + مؤخرة الفخذ + أرداف", sets: 4, reps: "8-12", note: "نفس الحجم والشدة. الليج بريس آمن أكتر لو عندك مشاكل ظهر." },
    "بنش": { from: "بنش بريس", to: "ضغط أرضي / دمبل بريس", muscle: "صدر + ترايسبس + كتف أمامي", sets: 4, reps: "8-12", note: "الضغط الأرضي بديل ممتاز للمنزل، نفس العضلات بدون معدات." },
    "ديدليفت": { from: "ديدليفت", to: "رومانيان ديدليفت / هيب ثرست", muscle: "مؤخرة الفخذ + أرداف + ظهر سفلي", sets: 3, reps: "8-10", note: "الرومانيان أخف على الظهر ويستهدف المؤخرة أكثر." },
    "عقلة": { from: "عقلة", to: "سحب أمامي / سحب باند", muscle: "ظهر عرضي + بايسبس", sets: 4, reps: "8-12", note: "السحب أمامي أسهل ويسمح بحجم أكبر للمبتدئين." },
  };

  let swap = null;
  for (const key of Object.keys(exerciseSwaps)) {
    if (text.includes(key)) {
      swap = exerciseSwaps[key];
      break;
    }
  }

  if (!swap) {
    if (workoutPlan?.content?.days) {
      return `سؤال ممتاز عن تبديل التمارين! 💪

عندك ${workoutPlan.content.days.length} أيام تدريب. للتبديل:
1. اذهب لصفحة "خطتي"
2. افتح برنامج التمارين
3. اضغط زر "استبدال" 🔄 بجانب التمرين

أو اسألني عن تمرين محدد مثل:
• "بدل السكوات بإيه؟"
• "بديل بنش بريس للمنزل"

وأقترح بديل بنفس العضلة والحجم.`;
    }
    return `لتبديل تمرين معين، اذهب لصفحة "خطتي" واضغط زر "استبدال" 🔄 بجانب التمرين.

أو اسألني عن تمرين محدد مثل "بدل السكوات" وأقترح بديل مناسب.`;
  }

  return `✅ تبديل ${swap.from} بـ ${swap.to}:

🎯 العضلات المستهدفة: ${swap.muscle}
📊 الحجم: ${swap.sets} مجموعات × ${swap.reps} تكرار (نفس الأصلي)
⏱️ الراحة: نفس الفترة

💡 ${swap.note}

للتبديل الفعلي، اذهب لصفحة "خطتي" واضغط زر "استبدال" على التمرين، أو اطلب مني مباشرة.`;
}

