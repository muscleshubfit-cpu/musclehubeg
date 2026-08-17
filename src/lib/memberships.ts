/**
 * Membership tiers for MuscleHub platform.
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
  features: string[]; // for display
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
      adsEnabled: true,
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
      evoChatDailyLimit: null,
      evoNutritionPlanLimit: null,
      evoWorkoutPlanLimit: null,
      evoSwapLimit: null,
      evoPatternAnalysis: true,
      evoCrossSessionMemory: true,
      evoSaveBodyData: true,
      mealPlannerMaxMeals: null,
      mealPlannerMaxSaved: null,
      mealPlannerExport: true,
      savedResultsLimit: null,
      savedResultsExport: true,
      premiumContent: true,
      adsEnabled: true,
    },
    features: [
      "خطط تغذية مخصصة من مدرب بشري",
      "برامج تمرين من مدرب بشري",
      "متابعة شخصية أسبوعية",
      "تبديلات يدوية من المدرب",
      "تذاكر دعم أولوية",
      "تواصل مباشر مع المدرب",
      "منفصل عن عضوية Pro",
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
    coaching: "غير محدود",
  },
  {
    feature: "EVO: خطط تمرين",
    free: "—",
    premium: "3/شهر",
    pro: "6/شهر",
    coaching: "غير محدود",
  },
  {
    feature: "EVO: تبديلات",
    free: "—",
    premium: "3/أسبوع",
    pro: "6/أسبوع",
    coaching: "غير محدود",
  },
  {
    feature: "EVO: تحليل الأنماط",
    free: "—",
    premium: "—",
    pro: "✓",
    coaching: "✓",
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
    coaching: "غير محدود",
  },
  {
    feature: "حفظ نتائج الأدوات",
    free: "3",
    premium: "50",
    pro: "200",
    coaching: "غير محدود",
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
    coaching: "✓",
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
