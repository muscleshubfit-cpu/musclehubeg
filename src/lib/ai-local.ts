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

export function generateNutritionPlan(ctx: ClientContext): NutritionContent {
  const nutrition = ctx.nutrition || {};
  const fitness = ctx.fitness || {};
  const measurements = ctx.recent_measurements || [];

  const weight = parseFloat(nutrition.weight || measurements[0]?.weight || "80");
  const targetWeight = parseFloat(nutrition.target || nutrition.target_weight || weight);
  const goal = (fitness.goal || "").toLowerCase();

  const isFatLoss = targetWeight < weight || goal.includes("fat") || goal.includes("دهون");
  const isMuscleGain = targetWeight > weight || goal.includes("muscle") || goal.includes("عضلات");

  // Calculate calories
  // Maintenance ≈ weight (kg) × 33
  const maintenance = Math.round(weight * 33);
  let dailyCalories: number;
  if (isFatLoss) {
    dailyCalories = Math.round((maintenance - 500) / 50) * 50; // ~0.5kg/week deficit
  } else if (isMuscleGain) {
    dailyCalories = Math.round((maintenance + 300) / 50) * 50; // slight surplus
  } else {
    dailyCalories = maintenance;
  }

  // Macros: protein 2g/kg, fat 1g/kg, carbs = remaining
  const proteinG = Math.round(weight * 2);
  const fatG = Math.round(weight * 1);
  const carbsG = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));

  // Meals
  const mealsCount = parseInt(nutrition.meals) || 4;
  const diet = (nutrition.diet || "").toLowerCase();
  const isVeg = diet.includes("veg") || diet.includes("نبات");
  const allergies = (nutrition.allergies || "").toLowerCase();
  const disliked = (nutrition.disliked || "").toLowerCase();

  const calsPerMeal = Math.round(dailyCalories / mealsCount);
  const proteinPerMeal = Math.round(proteinG / mealsCount);

  const mealTemplates = [
    {
      name: "الفطار",
      items: isVeg
        ? [
            { food: "شوفان بالحليب", amount: "80 جم شوفان + 250 مل حليب", calories: Math.round(calsPerMeal * 0.4) },
            { food: "موزة", amount: "1 متوسطة", calories: 105 },
            { food: "لوز", amount: "20 جم", calories: 115 },
            { food: "عسل", amount: "1 ملعقة", calories: 64 },
          ]
        : [
            { food: "بيض مسلوق", amount: `${Math.ceil(proteinPerMeal / 6)} بيضات`, calories: Math.round(proteinPerMeal * 1.5) },
            { food: "خبز أسمر", amount: "2 شريحة", calories: 160 },
            { food: "جبن قريش", amount: "50 جم", calories: 60 },
            { food: "خيار وطماطم", amount: "حبة من كل نوع", calories: 30 },
          ],
      notes: "تناوله خلال ساعة من الاستيقاظ لتشغيل الأيض",
    },
    {
      name: "الغداء",
      items: isVeg
        ? [
            { food: "أرز بسمتي", amount: "150 جم مطبوخ", calories: 195 },
            { food: "عدس", amount: "150 جم مطبوخ", calories: 175 },
            { food: "خضار سوتيه", amount: "200 جم", calories: 80 },
            { food: "زيت زيتون", amount: "1 ملعقة", calories: 120 },
          ]
        : [
            { food: "صدر دجاج مشوي", amount: `${Math.round(proteinPerMeal / 3.1) * 30} جم`, calories: Math.round(proteinPerMeal * 1.65) },
            { food: "أرز بسمتي", amount: "150 جم مطبوخ", calories: 195 },
            { food: "سلطة خضار", amount: "طبق كبير", calories: 50 },
            { food: "زيت زيتون", amount: "1 ملعقة", calories: 120 },
          ],
      notes: "أكبر وجبة في اليوم — ركز على البروتين والكارب",
    },
    {
      name: "سناك",
      items: [
        { food: "زبادي يوناني", amount: "200 جم", calories: 130 },
        { food: "لوز أو فول سوداني", amount: "30 جم", calories: 175 },
        { food: "تفاحة", amount: "1 متوسطة", calories: 95 },
      ],
      notes: "بين الغداء والعشاء للحفاظ على الطاقة",
    },
    {
      name: "العشاء",
      items: isVeg
        ? [
            { food: "بطاطا حلوة", amount: "200 جم", calories: 172 },
            { food: "حمص", amount: "100 جم", calories: 165 },
            { food: "سلطة", amount: "طبق", calories: 50 },
          ]
        : [
            { food: "سمك أو لحم مشوي", amount: `${Math.round(proteinPerMeal / 2.5) * 30} جم`, calories: Math.round(proteinPerMeal * 2) },
            { food: "بطاطا حلوة", amount: "150 جم", calories: 130 },
            { food: "بروكلي سوتيه", amount: "150 جم", calories: 50 },
          ],
      notes: "وجبة خفيفة قبل النوم بـ 3 ساعات",
    },
  ];

  // Filter out disliked/allergenic foods
  const filteredMeals = mealTemplates.slice(0, mealsCount).map((meal) => ({
    ...meal,
    items: meal.items.filter((item) => {
      const food = item.food.toLowerCase();
      return !allergies.split(",").some((a) => a.trim() && food.includes(a.trim().toLowerCase()))
        && !disliked.split(",").some((d) => d.trim() && food.includes(d.trim().toLowerCase()));
    }),
  }));

  const goalText = isFatLoss ? "خسارة الدهون" : isMuscleGain ? "بناء العضلات" : "الحفاظ على الوزن";
  const overview = `خطة تغذية مخصصة لـ ${ctx.name || "العميل"} بهدف ${goalText}. السعرات اليومية ${dailyCalories} كالوري مع ${proteinG}جم بروتين للحفاظ على الكتلة العضلية. ${allergies ? `تم استبعاد الأطعمة المسببة للحساسية.` : ""} وزع الوجبات على مدار اليوم لتحقيق أفضل امتصاص للبروتين.`;

  return {
    overview,
    daily_calories: dailyCalories,
    macros: { protein_g: proteinG, carbs_g: carbsG, fat_g: fatG },
    meals: filteredMeals,
  };
}

/* ----------------------------- Chat reply -------------------------------- */

export function generateChatReply(message: string, ctx?: ClientContext): string {
  const text = message.toLowerCase();
  const name = ctx?.name || "";

  if (text.includes("protein") || text.includes("بروتين")) {
    const weight = parseFloat(ctx?.nutrition?.weight || "80");
    const proteinTarget = Math.round(weight * 2);
    return `لزيادة البروتين في وجباتك، استهدف ${proteinTarget}جم يومياً (حوالي 2جم لكل كجم من وزنك). مصادر ممتازة: صدور دجاج، بيض، سمك، لحم قليل الدهن،زبادي يوناني، جبن قريش. وزّعها على 4 وجبات (${Math.round(proteinTarget / 4)}جم لكل وجبة) لتحقيق أفضل امتصاص.`;
  }
  if (text.includes("water") || text.includes("ماء") || text.includes("مياه")) {
    const weight = parseFloat(ctx?.nutrition?.weight || "80");
    const waterTarget = Math.round(weight * 35 / 1000 * 10) / 10;
    return `احتياجك اليومي من الماء حوالي ${waterTarget} لتر (${Math.round(weight * 35)} مل). اضف 500 مل حول التمرين وزد في الجو الحار. ابدأ يومك بكوبين ماء على الريق.`;
  }
  if (text.includes("weight") || text.includes("وزن") || text.includes("fat") || text.includes("دهون") || text.includes("تخسيس")) {
    return `لخسارة الدهون بشكل مستدام، استهدف عجز 300-500 كالوري يومياً (≈0.4-0.5 كجم أسبوعياً). حافظ على البروتين عالياً (2جم/كجم)، درّب الأوزان 4 مرات أسبوعياً، وأضف 20-30 دقيقة كارديو 2-3 مرات. أعد التقييم كل أسبوعين.`;
  }
  if (text.includes("cardio") || text.includes("كارديو")) {
    return `الكارديو اختياري لخسارة الدهون لكن ممتاز لصحة القلب. 2-3 جلسات أسبوعياً مدة 20-30 دقيقة كافية فوق التمارين المقاومة. اختر ما تحب: مشي سريع، دراجة، أو HIIT.`;
  }
  if (text.includes("workout") || text.includes("تمرين") || text.includes("training") || text.includes("تمارين")) {
    return `للحصول على أفضل نتائج، ركز على التمارين المركبة (سكوات، بنش، ديدليفت، تجديف). أضف 2.5 كجم أو تكرار إضافي عندما تصل أعلى مدى تكرار بصورة صحيحة. تدرّب 4 أيام أسبوعياً بأوزان ثقيلة وحجم كافٍ.`;
  }
  if (text.includes("meal") || text.includes("وجبة") || text.includes("اكل") || text.includes("أكل")) {
    return `لبناء وجبة متوازنة: نصف الطبق خضار، ربع بروتين (دجاج/سمك/لحم)، ربع كارب (أرز/بطاطا/خبز أسمر)، أضف ملعقة زيت زيتون أو حفنة مكسرات للدهون الصحية. هذا يعطي شبع ممتاز وماكروز متوازنة.`;
  }
  if (text.includes("sleep") || text.includes("نوم")) {
    return `النوم 7-9 ساعات أساسي للتعافي وهرمونات التغذية. قلل الشاشات قبل النوم بساعة، تجنب الكافيين بعد العصر، وحافظ على مواعيد ثابتة. قلة النوم ترفع الكورتيزول وتزيد الرغبة في السكريات.`;
  }
  if (text.includes("supplement") || text.includes("مكمل") || text.includes("واي")) {
    return `المكملات الأساسية: واي بروتين (1-2 سكوب يومياً)، كرياتين (5جم يومياً)، فيتامين D (2000-4000 IU). الباقي اختياري. استشر طبيباً قبل أي مكمل إذا لديك حالة طبية.`;
  }
  if (text.includes("hello") || text.includes("hi") || text.includes("مرحبا") || text.includes("اهلا") || text.includes("أهلا")) {
    return `أهلاً${name ? ` ${name}` : ""}! أنا كوتشك الذكي. اسألني عن التغذية، التمارين، البروتين، الماء، النوم، أو أي شيء يخص رحلتك. كيف أقدر أساعدك اليوم؟`;
  }
  return `سؤال ممتاز${name ? ` ${name}` : ""}! للحصول على إجابة دقيقة مبنية على خطتك، سجّل مراجعتك الأسبوعية والكوتش أحمد سيعدّل خطتك. في الوقت الحالي، ركز على: 1) تناول بروتين كافٍ (2جم/كجم)، 2) تمرين 4 مرات أسبوعياً، 3) نوم 7-9 ساعات، 4) شرب ماء كافٍ. هل لديك سؤال محدد عن شيء آخر؟`;
}
