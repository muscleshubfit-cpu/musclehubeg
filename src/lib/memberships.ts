/**
 * Membership tiers for Alkemos platform.
 *
 * 4 levels (prices updated 2026 to cover Vercel + Supabase + AI +
 * Lemon Squeezy 5%+$0.50 payment fees + profit margin):
 *   - Free:     basic access, limited EVO, 1 meal plan save
 *   - Premium:  $14.99/mo or $119/yr — full EVO chat, limited plan gen
 *   - Pro:      $29.99/mo or $239/yr — full features, no ads
 *   - Coaching: $39.99/mo or $359/yr — human coach, NOT linked to Pro
 *
 * PLAN GENERATION LAW (owner decree 2026-09-02:
 * «١+١ أسبوعية اجمالى ٤+٤ شهريا بدلا من ٣+٣ شهريا»):
 *   - Weekly cap: 1 nutrition + 1 workout per week (Pro: 2+2 — the
 *     advertised 2× Premium ladder is preserved).
 *   - Monthly total: 4 nutrition + 4 workout per month (Pro: 8+8).
 *   - Weekly window resets Monday 00:00 UTC (same convention as the
 *     swaps reset); the monthly pool resets on the 1st, UTC.
 * Other limits reset monthly. Ads show on Free + Premium tiers only
 * (Pro+ are ad-free).
 */

export type MembershipTier = "free" | "premium" | "pro" | "coaching";

export type MembershipLimits = {
  // EVO chat
  evoChatDailyLimit: number | null; // null = unlimited
  // EVO plan generation — WEEKLY CAP + MONTHLY TOTAL (owner decree
  // 2026-09-02: 1+1 weekly, total 4+4 monthly; Pro 2+2 / 8+8).
  evoNutritionPlanLimit: number | null; // per month (total)
  evoWorkoutPlanLimit: number | null; // per month (total)
  evoNutritionPlanWeeklyLimit: number | null; // per week (cap)
  evoWorkoutPlanWeeklyLimit: number | null; // per week (cap)
  // EVO swaps (weekly, same as plan generation limits)
  evoSwapLimit: number | null; // per week
  // EVO advanced features
  evoPatternAnalysis: boolean;
  evoCrossSessionMemory: boolean;
  evoSaveBodyData: boolean;
  // Meal Planner
  mealPlannerMaxMeals: number | null; // max meals per plan
  mealPlannerMaxSaved: number | null; // max saved plans
  mealPlannerExport: boolean;
  // Saved tool results
  savedResultsLimit: number | null;
  savedResultsExport: boolean;
  // Premium content
  premiumContent: boolean;
  // Ads
  adsEnabled: boolean;
};

export type MembershipInfo = {
  id: MembershipTier;
  nameAr: string;
  nameEn: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  limits: MembershipLimits;
  features: string[]; // Arabic display strings (used when isAr)
  featuresEn: string[]; // English display strings (used when !isAr)
  highlight: boolean;
  separate: boolean; // true for coaching (not a standard tier)
};

export const MEMBERSHIPS: MembershipInfo[] = [
  {
    id: "free",
    nameAr: "مجاني",
    nameEn: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      evoChatDailyLimit: 10,
      evoNutritionPlanLimit: 0,
      evoWorkoutPlanLimit: 0,
      evoNutritionPlanWeeklyLimit: 0,
      evoWorkoutPlanWeeklyLimit: 0,
      evoSwapLimit: 0,
      evoPatternAnalysis: false,
      evoCrossSessionMemory: false,
      evoSaveBodyData: false,
      mealPlannerMaxMeals: 3,
      mealPlannerMaxSaved: 1,
      mealPlannerExport: false,
      savedResultsLimit: 3,
      savedResultsExport: false,
      premiumContent: false,
      adsEnabled: true,
    },
    features: [
      "تصفح 868+ تمرين",
      "تصفح 8830+ أكلة",
      "تصفح برامج التدريب",
      "5 حاسبات لياقة مجانية",
      "EVO: 10 رسائل/يوم",
      "مخطط الوجبات (3 وجبات، حفظ 1 جدول)",
      "حفظ 3 نتائج أدوات",
    ],
    featuresEn: [
      "Browse 868+ exercises",
      "Browse 8,830+ foods",
      "Browse workout programs",
      "5 free fitness calculators",
      "EVO: 10 messages/day",
      "Meal Planner (3 meals, save 1 plan)",
      "Save 3 tool results",
    ],
    highlight: false,
    separate: false,
  },
  {
    id: "premium",
    nameAr: "بريميوم",
    nameEn: "Premium",
    priceMonthly: 14.99,
    priceYearly: 119.0,
    limits: {
      evoChatDailyLimit: null,
      evoNutritionPlanLimit: 4, // monthly total (was 3 — decree 2026-09-02)
      evoWorkoutPlanLimit: 4,
      evoNutritionPlanWeeklyLimit: 1, // weekly cap
      evoWorkoutPlanWeeklyLimit: 1,
      evoSwapLimit: 3, // per week
      evoPatternAnalysis: false,
      evoCrossSessionMemory: true,
      evoSaveBodyData: true,
      mealPlannerMaxMeals: 6,
      mealPlannerMaxSaved: 10,
      mealPlannerExport: true,
      savedResultsLimit: 50,
      savedResultsExport: true,
      premiumContent: false,
      adsEnabled: true,
    },
    features: [
      "كل مميزات Free",
      "EVO: محادثة غير محدودة",
      "EVO: 4 خطط تغذية شهرياً (1 أسبوعياً)",
      "EVO: 4 خطط تمرين شهرياً (1 أسبوعياً)",
      "EVO: 3 تبديلات/أسبوع",
      "EVO: ذاكرة دائمة عبر الجلسات",
      "مخطط الوجبات (6 وجبات، حفظ 10)",
      "حفظ 50 نتيجة + تحميل",
    ],
    featuresEn: [
      "All Free features",
      "EVO: unlimited chat",
      "EVO: 4 nutrition plans/mo (1/wk)",
      "EVO: 4 workout plans/mo (1/wk)",
      "EVO: 3 swaps/week",
      "EVO: cross-session memory",
      "Meal Planner (6 meals, save 10)",
      "Save 50 results + export",
    ],
    highlight: false,
    separate: false,
  },
  {
    id: "pro",
    nameAr: "برو",
    nameEn: "Pro",
    priceMonthly: 29.99,
    priceYearly: 239.0,
    limits: {
      evoChatDailyLimit: null,
      evoNutritionPlanLimit: 8, // monthly total — 2× Premium (decree 2026-09-02)
      evoWorkoutPlanLimit: 8,
      evoNutritionPlanWeeklyLimit: 2, // weekly cap — 2× Premium
      evoWorkoutPlanWeeklyLimit: 2,
      evoSwapLimit: 6,
      evoPatternAnalysis: true,
      evoCrossSessionMemory: true,
      evoSaveBodyData: true,
      mealPlannerMaxMeals: 8,
      mealPlannerMaxSaved: 50,
      mealPlannerExport: true,
      savedResultsLimit: 200,
      savedResultsExport: true,
      premiumContent: true,
      adsEnabled: false,
    },
    features: [
      "كل مميزات Premium",
      "EVO: 8 خطط تغذية شهرياً (2 أسبوعياً)",
      "EVO: 8 خطط تمرين شهرياً (2 أسبوعياً)",
      "EVO: 6 تبديلات/أسبوع",
      "مخطط الوجبات (8 وجبات، 50 جدول)",
      "200 نتيجة محفوظة + تحميل",
      "بدون إعلانات",
    ],
    featuresEn: [
      "All Premium features",
      "EVO: 8 nutrition plans/mo (2/wk)",
      "EVO: 8 workout plans/mo (2/wk)",
      "EVO: 6 swaps/week",
      "Meal Planner (8 meals, 50 plans)",
      "200 saved results + export",
      "No ads",
    ],
    highlight: true,
    separate: false,
  },
  {
    id: "coaching",
    nameAr: "كوتشينج",
    nameEn: "Coaching",
    priceMonthly: 39.99,
    priceYearly: 359.0,
    limits: {
      // EVO included — same as Premium EVO limits (decree 2026-09-02:
      // 1+1 weekly, 4+4 monthly total)
      evoChatDailyLimit: null,
      evoNutritionPlanLimit: 4,
      evoWorkoutPlanLimit: 4,
      evoNutritionPlanWeeklyLimit: 1,
      evoWorkoutPlanWeeklyLimit: 1,
      evoSwapLimit: 3,
      evoPatternAnalysis: false,
      evoCrossSessionMemory: true,
      evoSaveBodyData: true,
      mealPlannerMaxMeals: 6,
      mealPlannerMaxSaved: 10,
      mealPlannerExport: true,
      savedResultsLimit: 50,
      savedResultsExport: true,
      premiumContent: false,
      adsEnabled: true,
    },
    features: [
      "EVO: محادثة غير محدودة",
      "EVO: 4 خطط تغذية شهرياً (1 أسبوعياً)",
      "EVO: 4 خطط تمرين شهرياً (1 أسبوعياً)",
      "EVO: 3 تبديلات/أسبوع",
      "EVO: ذاكرة دائمة عبر الجلسات",
      "خطط تغذية مخصصة من مدرب بشري",
      "برامج تمرين من مدرب بشري",
      "متابعة أسبوعية بتذكير تلقائي",
      "تبديلات يدوية من المدرب",
      "تذاكر دعم أولوية",
      "تواصل مباشر مع المدرب",
    ],
    featuresEn: [
      "EVO: unlimited chat",
      "EVO: 4 nutrition plans/mo (1/wk)",
      "EVO: 4 workout plans/mo (1/wk)",
      "EVO: 3 swaps/week",
      "EVO: cross-session memory",
      "Custom nutrition plans from a human coach",
      "Workout programs from a human coach",
      "Weekly check-in reminders",
      "Manual swaps by the coach",
      "Priority support tickets",
      "Direct contact with the coach",
    ],
    highlight: false,
    separate: true,
  },
];

/**
 * Get membership info by tier ID.
 */
export function getMembership(id: MembershipTier): MembershipInfo | undefined {
  return MEMBERSHIPS.find((m) => m.id === id);
}

/**
 * Get limits for a given tier.
 */
export function getLimits(id: MembershipTier): MembershipLimits {
  const m = getMembership(id);
  return m?.limits || MEMBERSHIPS[0].limits;
}

/**
 * Check if a feature is available for a tier.
 */
export function hasFeature(id: MembershipTier, feature: keyof MembershipLimits): boolean {
  const limits = getLimits(id);
  const val = limits[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val > 0;
  if (val === null) return true; // null = unlimited
  return false;
}

/**
 * Get remaining quota for a feature (null = unlimited).
 */
export function getRemaining(
  id: MembershipTier,
  feature: keyof MembershipLimits,
  used: number,
): number | null {
  const limits = getLimits(id);
  const limit = limits[feature];
  if (limit === null) return null; // unlimited
  if (typeof limit !== "number") return 0;
  return Math.max(0, limit - used);
}

/**
 * Get the display price string.
 */
export function getPriceString(m: MembershipInfo): { monthly: string; yearly?: string } {
  if (m.priceMonthly === 0) {
    return { monthly: "Free" };
  }
  const monthly = `$${(m.priceMonthly ?? 0).toFixed(2)}/mo`;
  const yearly = m.priceYearly ? `$${m.priceYearly.toFixed(2)}/yr` : undefined;
  return { monthly, yearly };
}

/**
 * Comparison table data for display.
 * Each row has `feature` (Arabic) and `featureEn` (English).
 * Cell values are Arabic; use `translateCell()` to get English.
 */
export const COMPARISON_ROWS: Array<{
  feature: string;
  featureEn: string;
  free: string;
  premium: string;
  pro: string;
  coaching: string;
}> = [
  {
    feature: "مكتبة التمارين (868+)",
    featureEn: "Exercise Library (868+)",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "قاعدة بيانات الأكلات (8830+)",
    featureEn: "Food Database (8830+)",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "حاسبات اللياقة",
    featureEn: "Fitness Calculators",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "EVO: المحادثة",
    featureEn: "EVO: Chat",
    free: "10/يوم",
    premium: "غير محدود",
    pro: "غير محدود",
    coaching: "غير محدود",
  },
  {
    feature: "EVO: خطط تغذية",
    featureEn: "EVO: Meal Plans",
    free: "—",
    premium: "1/أسبوع · 4/شهر",
    pro: "2/أسبوع · 8/شهر",
    coaching: "1/أسبوع · 4/شهر",
  },
  {
    feature: "EVO: خطط تمرين",
    featureEn: "EVO: Workout Plans",
    free: "—",
    premium: "1/أسبوع · 4/شهر",
    pro: "2/أسبوع · 8/شهر",
    coaching: "1/أسبوع · 4/شهر",
  },
  {
    feature: "EVO: تبديلات",
    featureEn: "EVO: Swaps",
    free: "—",
    premium: "3/أسبوع",
    pro: "6/أسبوع",
    coaching: "3/أسبوع",
  },
  {
    feature: "EVO: ذاكرة دائمة",
    featureEn: "EVO: Persistent Memory",
    free: "—",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "مخطط الوجبات",
    featureEn: "Meal Planner",
    free: "3 وجبات، 1 حفظ",
    premium: "6 وجبات، 10 حفظ",
    pro: "8 وجبات، 50 حفظ",
    coaching: "6 وجبات، 10 حفظ",
  },
  {
    feature: "حفظ نتائج الأدوات",
    featureEn: "Save Tool Results",
    free: "3",
    premium: "50",
    pro: "200",
    coaching: "50",
  },
  {
    feature: "تحميل النتائج",
    featureEn: "Export Results",
    free: "—",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "مدرب بشري",
    featureEn: "Human Coach",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
  {
    feature: "متابعة أسبوعية",
    featureEn: "Weekly Check-ins",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
  {
    feature: "دعم أولوية",
    featureEn: "Priority Support",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
];

/**
 * Translate a comparison table cell value to the requested language.
 * Arabic values are stored in the data; this maps them to English.
 * Language-neutral values (✓, —, numbers) pass through unchanged.
 */
const CELL_TRANSLATIONS: Record<string, string> = {
  "10/يوم": "10/day",
  "غير محدود": "Unlimited",
  "1/أسبوع · 4/شهر": "1/wk · 4/mo",
  "2/أسبوع · 8/شهر": "2/wk · 8/mo",
  "3/أسبوع": "3/wk",
  "6/أسبوع": "6/wk",
  "3 وجبات، 1 حفظ": "3 meals, 1 save",
  "6 وجبات، 10 حفظ": "6 meals, 10 saves",
  "8 وجبات، 50 حفظ": "8 meals, 50 saves",
};

export function translateCell(value: string, isAr: boolean): string {
  if (isAr) return value;
  return CELL_TRANSLATIONS[value] ?? value;
}
