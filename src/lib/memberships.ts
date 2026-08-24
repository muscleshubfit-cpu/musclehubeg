/**
 * Membership tiers for MuscleHubEG platform.
 *
 * 4 levels (prices updated 2026 to cover Vercel + Supabase + AI +
 * Lemon Squeezy 5%+$0.50 payment fees + profit margin):
 *   - Free:     basic access, limited EVO, 1 meal plan save
 *   - Premium:  $14.99/mo or $119/yr — full EVO chat, limited plan gen
 *   - Pro:      $29.99/mo or $239/yr — full features, premium content
 *   - Coaching: $39.99/mo or $359/yr — human coach, NOT linked to Pro
 *
 * Limits reset monthly for all tiers.
 * Ads show on Free + Premium tiers only (Pro+ are ad-free).
 */

export type MembershipTier = "free" | "premium" | "pro" | "coaching";

export type MembershipLimits = {
  // EVO chat
  evoChatDailyLimit: number | null; // null = unlimited
  // EVO plan generation (monthly, resets each month)
  evoNutritionPlanLimit: number | null; // per month
  evoWorkoutPlanLimit: number | null; // per month
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
      evoNutritionPlanLimit: 3,
      evoWorkoutPlanLimit: 3,
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
      "EVO: 3 خطط تغذية/شهر",
      "EVO: 3 خطط تمرين/شهر",
      "EVO: 3 تبديلات/أسبوع",
      "EVO: حفظ بيانات الجسم",
      "EVO: ذاكرة دائمة عبر الجلسات",
      "مخطط الوجبات (6 وجبات، حفظ 10)",
      "حفظ 50 نتيجة + تحميل",
    ],
    featuresEn: [
      "All Free features",
      "EVO: unlimited chat",
      "EVO: 3 nutrition plans/mo",
      "EVO: 3 workout plans/mo",
      "EVO: 3 swaps/week",
      "EVO: save body data",
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
      evoNutritionPlanLimit: 6,
      evoWorkoutPlanLimit: 6,
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
      "EVO: 6 خطط تغذية/شهر",
      "EVO: 6 خطط تمرين/شهر",
      "EVO: 6 تبديلات/أسبوع",
      "EVO: تحليل الأنماط + التنبؤ",
      "مخطط الوجبات (8 وجبات، 50 جدول)",
      "200 نتيجة محفوظة + تحميل",
      "محتوى مميز (كورسات، خطط، كتب)",
      "بدون إعلانات",
    ],
    featuresEn: [
      "All Premium features",
      "EVO: 6 nutrition plans/mo",
      "EVO: 6 workout plans/mo",
      "EVO: 6 swaps/week",
      "EVO: pattern analysis + prediction",
      "Meal Planner (8 meals, 50 plans)",
      "200 saved results + export",
      "Premium content (courses, plans, books)",
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
      // EVO included — same as Premium EVO limits
      evoChatDailyLimit: null,
      evoNutritionPlanLimit: 3,
      evoWorkoutPlanLimit: 3,
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
      "EVO: 3 خطط تغذية/شهر",
      "EVO: 3 خطط تمرين/شهر",
      "EVO: 3 تبديلات/أسبوع",
      "EVO: ذاكرة دائمة + حفظ بيانات الجسم",
      "خطط تغذية مخصصة من مدرب بشري",
      "برامج تمرين من مدرب بشري",
      "متابعة شخصية أسبوعية",
      "تبديلات يدوية من المدرب",
      "تذاكر دعم أولوية",
      "تواصل مباشر مع المدرب",
    ],
    featuresEn: [
      "EVO: unlimited chat",
      "EVO: 3 nutrition plans/mo",
      "EVO: 3 workout plans/mo",
      "EVO: 3 swaps/week",
      "EVO: cross-session memory + body data",
      "Custom nutrition plans from a human coach",
      "Workout programs from a human coach",
      "Personal weekly check-ins",
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
 */
export const COMPARISON_ROWS: Array<{
  feature: string;
  free: string;
  premium: string;
  pro: string;
  coaching: string;
}> = [
  {
    feature: "مكتبة التمارين (868+)",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "قاعدة بيانات الأكلات (8830+)",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "حاسبات اللياقة",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "EVO: المحادثة",
    free: "10/يوم",
    premium: "غير محدود",
    pro: "غير محدود",
    coaching: "غير محدود",
  },
  {
    feature: "EVO: خطط تغذية",
    free: "—",
    premium: "3/شهر",
    pro: "6/شهر",
    coaching: "3/شهر",
  },
  {
    feature: "EVO: خطط تمرين",
    free: "—",
    premium: "3/شهر",
    pro: "6/شهر",
    coaching: "3/شهر",
  },
  {
    feature: "EVO: تبديلات",
    free: "—",
    premium: "3/أسبوع",
    pro: "6/أسبوع",
    coaching: "3/أسبوع",
  },
  {
    feature: "EVO: تحليل الأنماط",
    free: "—",
    premium: "—",
    pro: "✓",
    coaching: "—",
  },
  {
    feature: "EVO: ذاكرة دائمة",
    free: "—",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "مخطط الوجبات",
    free: "3 وجبات، 1 حفظ",
    premium: "6 وجبات، 10 حفظ",
    pro: "8 وجبات، 50 حفظ",
    coaching: "6 وجبات، 10 حفظ",
  },
  {
    feature: "حفظ نتائج الأدوات",
    free: "3",
    premium: "50",
    pro: "200",
    coaching: "50",
  },
  {
    feature: "تحميل النتائج",
    free: "—",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "محتوى مميز",
    free: "—",
    premium: "—",
    pro: "✓",
    coaching: "—",
  },
  {
    feature: "مدرب بشري",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
  {
    feature: "متابعة أسبوعية",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
  {
    feature: "دعم أولوية",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
];
