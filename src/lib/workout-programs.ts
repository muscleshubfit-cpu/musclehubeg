/**
 * Workout Programs Library — ready-to-use training programs.
 *
 * Programs are organized by:
 *   - location: home (bodyweight, no equipment) | home-equipment (minimal) | gym (full equipment)
 *   - level: beginner | intermediate | advanced
 *   - goal: general | strength | hypertrophy | fat-loss | endurance
 *
 * Each program has a weekly schedule with days, and each day has exercises
 * (referencing exercise slugs from exercises.ts) with sets/reps.
 */

export type ProgramLocation = "home" | "home-equipment" | "gym";
export type ProgramLevel = "beginner" | "intermediate" | "advanced";
export type ProgramGoal = "general" | "strength" | "hypertrophy" | "fat-loss" | "endurance";

export type WorkoutDay = {
  day: number;
  titleAr: string;
  titleEn: string;
  isRest?: boolean;
  exercises: Array<{
    exerciseSlug: string; // references exercises.ts
    nameAr: string; // denormalized for convenience
    nameEn: string;
    sets: number;
    reps: string; // "8-12" or "30s" or "AMRAP"
    restAr: string; // "60 ثانية"
    restEn: string;
  }>;
};

export type WorkoutProgram = {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  location: ProgramLocation;
  level: ProgramLevel;
  goal: ProgramGoal;
  durationWeeks: number;
  daysPerWeek: number;
  image: string; // Unsplash photo URL
  imageAltAr: string;
  imageAltEn: string;
  days: WorkoutDay[];
};

export const LOCATION_LABELS: Record<ProgramLocation, { ar: string; en: string; emoji: string }> = {
  home: { ar: "المنزل (بدون معدات)", en: "Home (No Equipment)", emoji: "🏠" },
  "home-equipment": { ar: "المنزل (بمعدات بسيطة)", en: "Home (Minimal Equipment)", emoji: "🏡" },
  gym: { ar: "الجيم", en: "Gym", emoji: "🏋️" },
};

export const LEVEL_LABELS: Record<ProgramLevel, { ar: string; en: string; color: string }> = {
  beginner: { ar: "مبتدئ", en: "Beginner", color: "#34c759" },
  intermediate: { ar: "متوسط", en: "Intermediate", color: "#ff9500" },
  advanced: { ar: "متقدم", en: "Advanced", color: "#ff3b30" },
};

export const GOAL_LABELS: Record<ProgramGoal, { ar: string; en: string }> = {
  general: { ar: "لياقة عامة", en: "General Fitness" },
  strength: { ar: "قوة", en: "Strength" },
  hypertrophy: { ar: "تضخيم عضلي", en: "Hypertrophy" },
  "fat-loss": { ar: "حرق دهون", en: "Fat Loss" },
  endurance: { ar: "تحمل", en: "Endurance" },
};

// Local images — each program type has its own unique AI-generated image.
// Generated in Apple iPhone product photography style (2026-08-25).
const IMAGES = {
  homeBodyweight: "/images/programs/home-workout.png",
  homeDumbbell: "/images/programs/home-dumbbell.png",
  homeCore: "/images/programs/home-core.png",
  gymBeginner: "/images/programs/gym-beginner.png",
  gymStrength: "/images/programs/gym-strength.png",
  gymHypertrophy: "/images/programs/full-gym.png",
  fatLoss: "/images/programs/hiit.png",
  cardio: "/images/programs/hiit.png",
  absCore: "/images/programs/home-core.png",
  pushDay: "/images/programs/gym-strength.png",
  pullDay: "/images/programs/gym-beginner.png",
  legDay: "/images/programs/full-gym.png",
  fullBody: "/images/programs/gym-beginner.png",
  upperBody: "/images/programs/gym-strength.png",
};

export const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  // ==================== HOME — BODYWEIGHT ====================
  {
    slug: "home-beginner-fullbody",
    nameAr: "برنامج المنزل للمبتدئين — كامل الجسم",
    nameEn: "Home Beginner Full Body",
    descriptionAr:
      "برنامج 3 أيام في الأسبوع بالوزن الجسم بدون أي معدات. مثالي للمبتدئين اللي عايزين يبدأوا رحلتهم من المنزل.",
    descriptionEn:
      "3-day-per-week bodyweight program with zero equipment. Perfect for beginners starting their fitness journey at home.",
    location: "home",
    level: "beginner",
    goal: "general",
    durationWeeks: 8,
    daysPerWeek: 3,
    image: IMAGES.homeBodyweight,
    imageAltAr: "تمرين منزلي بالوزن",
    imageAltEn: "Bodyweight home workout",
    days: [
      {
        day: 1,
        titleAr: "كامل الجسم (أ)",
        titleEn: "Full Body (A)",
        exercises: [
          { exerciseSlug: "push-up", nameAr: "ضغط أرضي", nameEn: "Push-up", sets: 3, reps: "8-12", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "lunges", nameAr: "لانجز", nameEn: "Lunges", sets: 3, reps: "10 لكل رجل", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 3, reps: "20-30 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 3, reps: "20 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 2,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 3,
        titleAr: "كامل الجسم (ب)",
        titleEn: "Full Body (B)",
        exercises: [
          { exerciseSlug: "dips", nameAr: "ديبس (على كرسي)", nameEn: "Dips (on chair)", sets: 3, reps: "8-12", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "lunges", nameAr: "لانجز عكسي", nameEn: "Reverse Lunges", sets: 3, reps: "10 لكل رجل", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 3, reps: "12-15", restAr: "45 ثانية", restEn: "45 sec" },
          { exerciseSlug: "burpees", nameAr: "بربي", nameEn: "Burpees", sets: 3, reps: "5-8", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 4,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 5,
        titleAr: "كامل الجسم (ج)",
        titleEn: "Full Body (C)",
        exercises: [
          { exerciseSlug: "push-up", nameAr: "ضغط أرضي", nameEn: "Push-up", sets: 3, reps: "10-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "jumping-jacks", nameAr: "جمبينج جاكس", nameEn: "Jumping Jacks", sets: 3, reps: "30 ثانية", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "russian-twist", nameAr: "تويست روسي", nameEn: "Russian Twist", sets: 3, reps: "20 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 3, reps: "30-40 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 6,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 7,
        titleAr: "راحة / مشي",
        titleEn: "Rest / Walk",
        isRest: true,
        exercises: [],
      },
    ],
  },
  {
    slug: "home-fat-loss-hiit",
    nameAr: "حرق دهون — HIIT منزلي",
    nameEn: "Fat Loss — Home HIIT",
    descriptionAr:
      "برنامج HIIT مكثف 4 أيام/أسبوع لحرق الدهون بسرعة. كل تمرينة 20-30 دقيقة فقط. للناس المتوسطة واللي عندها أساس.",
    descriptionEn:
      "Intense 4-day/week HIIT program for fast fat loss. Each session only 20-30 minutes. For intermediate level with some base.",
    location: "home",
    level: "intermediate",
    goal: "fat-loss",
    durationWeeks: 6,
    daysPerWeek: 4,
    image: IMAGES.fatLoss,
    imageAltAr: "تمرين حرق دهون",
    imageAltEn: "Fat loss workout",
    days: [
      {
        day: 1,
        titleAr: "HIIT — كامل الجسم",
        titleEn: "HIIT — Full Body",
        exercises: [
          { exerciseSlug: "burpees", nameAr: "بربي", nameEn: "Burpees", sets: 5, reps: "40 ثانية شغل / 20 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 5, reps: "40 ثانية شغل / 20 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "jumping-jacks", nameAr: "جمبينج جاكس", nameEn: "Jumping Jacks", sets: 5, reps: "40 ثانية شغل / 20 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "high-knees", nameAr: "ركبة عالية", nameEn: "High Knees", sets: 5, reps: "40 ثانية شغل / 20 ثانية راحة", restAr: "—", restEn: "—" },
        ],
      },
      {
        day: 2,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 3,
        titleAr: "HIIT — كور + كارديو",
        titleEn: "HIIT — Core + Cardio",
        exercises: [
          { exerciseSlug: "russian-twist", nameAr: "تويست روسي", nameEn: "Russian Twist", sets: 4, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 4, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 4, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "burpees", nameAr: "بربي", nameEn: "Burpees", sets: 4, reps: "30 ثانية شغل / 30 ثانية راحة", restAr: "—", restEn: "—" },
        ],
      },
      {
        day: 4,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 5,
        titleAr: "HIIT — أرجل + قوة",
        titleEn: "HIIT — Legs + Strength",
        exercises: [
          { exerciseSlug: "lunges", nameAr: "لانجز", nameEn: "Lunges", sets: 5, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "push-up", nameAr: "ضغط أرضي", nameEn: "Push-up", sets: 5, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "dips", nameAr: "ديبس", nameEn: "Dips", sets: 5, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "jumping-jacks", nameAr: "جمبينج جاكس", nameEn: "Jumping Jacks", sets: 5, reps: "45 ثانية شغل / 15 ثانية راحة", restAr: "—", restEn: "—" },
        ],
      },
      {
        day: 6,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 7,
        titleAr: "HIIT — تحدي كامل",
        titleEn: "HIIT — Full Challenge",
        exercises: [
          { exerciseSlug: "burpees", nameAr: "بربي", nameEn: "Burpees", sets: 4, reps: "30 ثانية شغل / 30 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 4, reps: "30 ثانية شغل / 30 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "russian-twist", nameAr: "تويست روسي", nameEn: "Russian Twist", sets: 4, reps: "30 ثانية شغل / 30 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 4, reps: "30 ثانية شغل / 30 ثانية راحة", restAr: "—", restEn: "—" },
          { exerciseSlug: "high-knees", nameAr: "ركبة عالية", nameEn: "High Knees", sets: 4, reps: "30 ثانية شغل / 30 ثانية راحة", restAr: "—", restEn: "—" },
        ],
      },
    ],
  },
  {
    slug: "home-core-specialization",
    nameAr: "تخصص كور منزلي",
    nameEn: "Home Core Specialization",
    descriptionAr:
      "برنامج 4 أيام/أسبوع لتمرين الكور والبطن بعمق. مناسب لكل المستويات، يقدر المبتدئ يخفف الأعداد.",
    descriptionEn:
      "4-day/week program for deep core and abs training. Suitable for all levels, beginners can reduce reps.",
    location: "home",
    level: "intermediate",
    goal: "general",
    durationWeeks: 8,
    daysPerWeek: 4,
    image: IMAGES.absCore,
    imageAltAr: "تمرين كور",
    imageAltEn: "Core workout",
    days: [
      {
        day: 1,
        titleAr: "بطن علوي + سفلي",
        titleEn: "Upper + Lower Abs",
        exercises: [
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 4, reps: "15-20", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 4, reps: "30 ثانية", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 3, reps: "45-60 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 2,
        titleAr: "مائلين + ثبات",
        titleEn: "Obliques + Stability",
        exercises: [
          { exerciseSlug: "russian-twist", nameAr: "تويست روسي", nameEn: "Russian Twist", sets: 4, reps: "20-30 ثانية", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك جانبي", nameEn: "Side Plank", sets: 3, reps: "30 ثانية لكل جنب", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 3, reps: "30 ثانية", restAr: "30 ثانية", restEn: "30 sec" },
        ],
      },
      {
        day: 3,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 4,
        titleAr: "كور كامل + كارديو",
        titleEn: "Full Core + Cardio",
        exercises: [
          { exerciseSlug: "burpees", nameAr: "بربي", nameEn: "Burpees", sets: 3, reps: "8-10", restAr: "45 ثانية", restEn: "45 sec" },
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 3, reps: "15-20", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "russian-twist", nameAr: "تويست روسي", nameEn: "Russian Twist", sets: 3, reps: "30 ثانية", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 3, reps: "45-60 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 5,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 6,
        titleAr: "بطن متقدم",
        titleEn: "Advanced Abs",
        exercises: [
          { exerciseSlug: "mountain-climbers", nameAr: "تسلق الجبل", nameEn: "Mountain Climbers", sets: 4, reps: "40 ثانية", restAr: "20 ثانية", restEn: "20 sec" },
          { exerciseSlug: "russian-twist", nameAr: "تويست روسي", nameEn: "Russian Twist", sets: 4, reps: "40 ثانية", restAr: "20 ثانية", restEn: "20 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 3, reps: "60 ثانية", restAr: "30 ثانية", restEn: "30 sec" },
          { exerciseSlug: "burpees", nameAr: "بربي", nameEn: "Burpees", sets: 3, reps: "10-12", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 7,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
    ],
  },

  // ==================== HOME — WITH DUMBBELLS ====================
  {
    slug: "home-dumbbell-ppl",
    nameAr: "Push Pull Legs — دمبل منزلي",
    nameEn: "Push Pull Legs — Home Dumbbell",
    descriptionAr:
      "برنامج PPL بـ 6 أيام/أسبوع باستخدام الدمبل بس. مثالي للي عنده دمبل في البيت وعايز يبني عضلات.",
    descriptionEn:
      "6-day/week PPL program using only dumbbells. Ideal for those with dumbbells at home who want to build muscle.",
    location: "home-equipment",
    level: "intermediate",
    goal: "hypertrophy",
    durationWeeks: 12,
    daysPerWeek: 6,
    image: IMAGES.homeDumbbell,
    imageAltAr: "تمرين بالدمبل في المنزل",
    imageAltEn: "Dumbbell home workout",
    days: [
      {
        day: 1,
        titleAr: "Push — صدر + أكتاف + ترايسبس",
        titleEn: "Push — Chest + Shoulders + Triceps",
        exercises: [
          { exerciseSlug: "push-up", nameAr: "ضغط أرضي", nameEn: "Push-up", sets: 4, reps: "10-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "رفرفة دمبل أرضي", nameEn: "Dumbbell Floor Press", sets: 4, reps: "8-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "arnold-press", nameAr: "أرنولد بريس", nameEn: "Arnold Press", sets: 4, reps: "8-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "triceps-pushdown", nameAr: "تمديد ترايسبس بالدمبل", nameEn: "Dumbbell Triceps Extension", sets: 3, reps: "10-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 2,
        titleAr: "Pull — ظهر + بايسبس",
        titleEn: "Pull — Back + Biceps",
        exercises: [
          { exerciseSlug: "pull-up", nameAr: "عقلة (لو متاح)", nameEn: "Pull-up (if available)", sets: 4, reps: "AMRAP", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "تجديف دمبل", nameEn: "Dumbbell Row", sets: 4, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "بايسبس دمبل", nameEn: "Dumbbell Curl", sets: 4, reps: "10-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "hyperextensions", nameAr: "هايبر", nameEn: "Hyperextensions", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 3,
        titleAr: "Legs — أرجل",
        titleEn: "Legs",
        exercises: [
          { exerciseSlug: "lunges", nameAr: "لانجز بالدمبل", nameEn: "Dumbbell Lunges", sets: 4, reps: "10-12 لكل رجل", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "hip-thrust", nameAr: "هيب ثرست", nameEn: "Hip Thrust", sets: 4, reps: "10-15", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "leg-curl", nameAr: "ليج كيرل", nameEn: "Leg Curl (if available)", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 3, reps: "15-20", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 4,
        titleAr: "Push — تكرار",
        titleEn: "Push — Repeat",
        exercises: [
          { exerciseSlug: "push-up", nameAr: "ضغط أرضي", nameEn: "Push-up", sets: 4, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "arnold-press", nameAr: "أرنولد بريس", nameEn: "Arnold Press", sets: 4, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "triceps-pushdown", nameAr: "تمديد ترايسبس", nameEn: "Triceps Extension", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 5,
        titleAr: "Pull — تكرار",
        titleEn: "Pull — Repeat",
        exercises: [
          { exerciseSlug: "dumbbell-curl", nameAr: "تجديف دمبل", nameEn: "Dumbbell Row", sets: 4, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "بايسبس دمبل", nameEn: "Dumbbell Curl", sets: 4, reps: "10-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "hyperextensions", nameAr: "هايبر", nameEn: "Hyperextensions", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 6,
        titleAr: "Legs — تكرار",
        titleEn: "Legs — Repeat",
        exercises: [
          { exerciseSlug: "lunges", nameAr: "لانجز", nameEn: "Lunges", sets: 4, reps: "12-15 لكل رجل", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "hip-thrust", nameAr: "هيب ثرست", nameEn: "Hip Thrust", sets: 4, reps: "12-15", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 3, reps: "15-20", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 7,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
    ],
  },

  // ==================== GYM ====================
  {
    slug: "gym-beginner-fullbody",
    nameAr: "جيم مبتدئ — كامل الجسم",
    nameEn: "Gym Beginner Full Body",
    descriptionAr:
      "برنامج 3 أيام/أسبوع في الجيم لأساسيات بناء القوة والعضلات. يناسب المبتدئين اللي بدأوا في الجيم.",
    descriptionEn:
      "3-day/week gym program for foundational strength and muscle building. Suitable for gym beginners.",
    location: "gym",
    level: "beginner",
    goal: "general",
    durationWeeks: 8,
    daysPerWeek: 3,
    image: IMAGES.gymBeginner,
    imageAltAr: "تمرين جيم",
    imageAltEn: "Gym workout",
    days: [
      {
        day: 1,
        titleAr: "كامل الجسم (أ)",
        titleEn: "Full Body (A)",
        exercises: [
          { exerciseSlug: "bench-press", nameAr: "بنش بريس", nameEn: "Bench Press", sets: 3, reps: "8-10", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "seated-cable-row", nameAr: "تجديف كابل", nameEn: "Seated Cable Row", sets: 3, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "leg-press", nameAr: "ليج بريس", nameEn: "Leg Press", sets: 3, reps: "10-12", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "plank", nameAr: "بلانك", nameEn: "Plank", sets: 3, reps: "30-45 ثانية", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 2,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 3,
        titleAr: "كامل الجسم (ب)",
        titleEn: "Full Body (B)",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات بالبار", nameEn: "Barbell Squat", sets: 3, reps: "8-10", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "arnold-press", nameAr: "أرنولد بريس", nameEn: "Arnold Press", sets: 3, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "بايسبس دمبل", nameEn: "Dumbbell Curl", sets: 3, reps: "10-12", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "triceps-pushdown", nameAr: "ترايسبس بوش داون", nameEn: "Triceps Pushdown", sets: 3, reps: "10-12", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 4,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 5,
        titleAr: "كامل الجسم (ج)",
        titleEn: "Full Body (C)",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات", nameEn: "Squat", sets: 3, reps: "8-10", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "bench-press", nameAr: "بنش بريس", nameEn: "Bench Press", sets: 3, reps: "8-10", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "seated-cable-row", nameAr: "تجديف كابل", nameEn: "Cable Row", sets: 3, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 3, reps: "12-15", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 6,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 7,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
    ],
  },
  {
    slug: "gym-ppl-intermediate",
    nameAr: "Push Pull Legs — جيم متوسط",
    nameEn: "Push Pull Legs — Gym Intermediate",
    descriptionAr:
      "برنامج PPL كلاسيكي 6 أيام/أسبوع في الجيم لتضخيم عضلي. مناسب للمتدرب المتوسط اللي عايز يبني حجم عضلي.",
    descriptionEn:
      "Classic 6-day/week PPL gym program for hypertrophy. Suitable for intermediate trainees looking to build muscle mass.",
    location: "gym",
    level: "intermediate",
    goal: "hypertrophy",
    durationWeeks: 12,
    daysPerWeek: 6,
    image: IMAGES.gymHypertrophy,
    imageAltAr: "تضخيم عضلي في الجيم",
    imageAltEn: "Hypertrophy gym training",
    days: [
      {
        day: 1,
        titleAr: "Push — صدر + أكتاف + ترايسبس",
        titleEn: "Push — Chest + Shoulders + Triceps",
        exercises: [
          { exerciseSlug: "bench-press", nameAr: "بنش بريس", nameEn: "Bench Press", sets: 4, reps: "6-8", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "arnold-press", nameAr: "أرنولد بريس", nameEn: "Arnold Press", sets: 4, reps: "8-10", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "dips", nameAr: "ديبس", nameEn: "Dips", sets: 3, reps: "8-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "triceps-pushdown", nameAr: "ترايسبس بوش داون", nameEn: "Triceps Pushdown", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 2,
        titleAr: "Pull — ظهر + بايسبس",
        titleEn: "Pull — Back + Biceps",
        exercises: [
          { exerciseSlug: "pull-up", nameAr: "عقلة", nameEn: "Pull-up", sets: 4, reps: "6-10", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "seated-cable-row", nameAr: "تجديف كابل", nameEn: "Seated Cable Row", sets: 4, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "hyperextensions", nameAr: "هايبر", nameEn: "Hyperextensions", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "بايسبس دمبل", nameEn: "Dumbbell Curl", sets: 3, reps: "10-12", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 3,
        titleAr: "Legs — أرجل",
        titleEn: "Legs",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات بالبار", nameEn: "Barbell Squat", sets: 4, reps: "6-8", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "leg-press", nameAr: "ليج بريس", nameEn: "Leg Press", sets: 4, reps: "10-12", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "leg-curl", nameAr: "ليج كيرل", nameEn: "Leg Curl", sets: 3, reps: "12-15", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "hip-thrust", nameAr: "هيب ثرست", nameEn: "Hip Thrust", sets: 3, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "crunches", nameAr: "كرنش", nameEn: "Crunches", sets: 3, reps: "15-20", restAr: "45 ثانية", restEn: "45 sec" },
        ],
      },
      {
        day: 4,
        titleAr: "Push — تكرار",
        titleEn: "Push — Repeat",
        exercises: [
          { exerciseSlug: "bench-press", nameAr: "بنش بريس", nameEn: "Bench Press", sets: 4, reps: "8-10", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "arnold-press", nameAr: "أرنولد بريس", nameEn: "Arnold Press", sets: 4, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "triceps-pushdown", nameAr: "ترايسبس بوش داون", nameEn: "Triceps Pushdown", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 5,
        titleAr: "Pull — تكرار",
        titleEn: "Pull — Repeat",
        exercises: [
          { exerciseSlug: "seated-cable-row", nameAr: "تجديف كابل", nameEn: "Cable Row", sets: 4, reps: "10-12", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "pull-up", nameAr: "عقلة", nameEn: "Pull-up", sets: 3, reps: "AMRAP", restAr: "120 ثانية", restEn: "120 sec" },
          { exerciseSlug: "dumbbell-curl", nameAr: "بايسبس دمبل", nameEn: "Dumbbell Curl", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
        ],
      },
      {
        day: 6,
        titleAr: "Legs — تكرار",
        titleEn: "Legs — Repeat",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات", nameEn: "Squat", sets: 4, reps: "8-10", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "leg-extension", nameAr: "ليج إكستنشن", nameEn: "Leg Extension", sets: 3, reps: "12-15", restAr: "60 ثانية", restEn: "60 sec" },
          { exerciseSlug: "leg-curl", nameAr: "ليج كيرل", nameEn: "Leg Curl", sets: 3, reps: "12-15", restAr: "90 ثانية", restEn: "90 sec" },
          { exerciseSlug: "hip-thrust", nameAr: "هيب ثرست", nameEn: "Hip Thrust", sets: 3, reps: "12-15", restAr: "90 ثانية", restEn: "90 sec" },
        ],
      },
      {
        day: 7,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
    ],
  },
  {
    slug: "gym-strength-5x5",
    nameAr: "قوة 5×5 — جيم متقدم",
    nameEn: "Strength 5×5 — Gym Advanced",
    descriptionAr:
      "برنامج قوة كلاسيكي 5×5 لتعلية الأوزان الثقيلة. 3 أيام/أسبوع، تركيز على البنش والسكوات والديدليفت. للمتقدمين.",
    descriptionEn:
      "Classic 5×5 strength program for lifting heavy. 3 days/week, focused on bench, squat, and deadlift. For advanced trainees.",
    location: "gym",
    level: "advanced",
    goal: "strength",
    durationWeeks: 12,
    daysPerWeek: 3,
    image: IMAGES.gymStrength,
    imageAltAr: "تمرين قوة بالبار",
    imageAltEn: "Barbell strength training",
    days: [
      {
        day: 1,
        titleAr: "Workout A",
        titleEn: "Workout A",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات 5×5", nameEn: "Squat 5×5", sets: 5, reps: "5", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "bench-press", nameAr: "بنش بريس 5×5", nameEn: "Bench Press 5×5", sets: 5, reps: "5", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "seated-cable-row", nameAr: "تجديف كابل", nameEn: "Barbell Row", sets: 5, reps: "5", restAr: "120 ثانية", restEn: "120 sec" },
        ],
      },
      {
        day: 2,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 3,
        titleAr: "Workout B",
        titleEn: "Workout B",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات 5×5", nameEn: "Squat 5×5", sets: 5, reps: "5", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "arnold-press", nameAr: "أوفرهيد بريس 5×5", nameEn: "Overhead Press 5×5", sets: 5, reps: "5", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "hip-thrust", nameAr: "ديدليفت 1×5", nameEn: "Deadlift 1×5", sets: 1, reps: "5", restAr: "—", restEn: "—" },
        ],
      },
      {
        day: 4,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 5,
        titleAr: "Workout A — تكرار",
        titleEn: "Workout A — Repeat",
        exercises: [
          { exerciseSlug: "barbell-squat", nameAr: "سكوات 5×5", nameEn: "Squat 5×5", sets: 5, reps: "5", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "bench-press", nameAr: "بنش بريس 5×5", nameEn: "Bench Press 5×5", sets: 5, reps: "5", restAr: "180 ثانية", restEn: "180 sec" },
          { exerciseSlug: "seated-cable-row", nameAr: "تجديف", nameEn: "Barbell Row", sets: 5, reps: "5", restAr: "120 ثانية", restEn: "120 sec" },
        ],
      },
      {
        day: 6,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
      {
        day: 7,
        titleAr: "راحة",
        titleEn: "Rest",
        isRest: true,
        exercises: [],
      },
    ],
  },
];

// ==================== Helpers ====================

export function getProgramBySlug(slug: string): WorkoutProgram | undefined {
  return WORKOUT_PROGRAMS.find((p) => p.slug === slug);
}

export function filterPrograms(params: {
  location?: ProgramLocation | "all";
  level?: ProgramLevel | "all";
  goal?: ProgramGoal | "all";
  search?: string;
}): WorkoutProgram[] {
  let result = WORKOUT_PROGRAMS;
  if (params.location && params.location !== "all") {
    result = result.filter((p) => p.location === params.location);
  }
  if (params.level && params.level !== "all") {
    result = result.filter((p) => p.level === params.level);
  }
  if (params.goal && params.goal !== "all") {
    result = result.filter((p) => p.goal === params.goal);
  }
  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.descriptionAr.toLowerCase().includes(q) ||
        p.descriptionEn.toLowerCase().includes(q),
    );
  }
  return result;
}

export function getRelatedPrograms(program: WorkoutProgram, limit = 3): WorkoutProgram[] {
  return WORKOUT_PROGRAMS.filter(
    (p) =>
      p.slug !== program.slug &&
      (p.location === program.location || p.level === program.level || p.goal === program.goal),
  ).slice(0, limit);
}
