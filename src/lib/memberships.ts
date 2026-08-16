/**
 * Membership tiers for MuscleHub platform.
 *
 * 4 levels:
 *   - Free:    basic access, limited EVO, 1 meal plan save
 *   - Premium: $9.99/mo or $79.99/yr — full EVO chat, limited plan gen
 *   - Pro:     $19.99/mo or $149.99/yr — full features, premium content
 *   - Coaching: separate ($20-40/mo) — human coach, NOT linked to Pro
 *
 * Limits reset monthly for all tiers.
 * Ads show on ALL tiers (not mentioned anywhere).
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
      "Browse 868+ exercises library",
      "Browse 80+ food database",
      "Browse workout programs",
      "4 free fitness calculators",
      "EVO chat (10 messages/day)",
      "Meal Planner (3 meals, save 1)",
      "Save 3 tool results",
    ],
    highlight: false,
    separate: false,
  },
  {
    id: "premium",
    nameAr: "بريميوم",
    nameEn: "Premium",
    priceMonthly: 9.99,
    priceYearly: 79.99,
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
      "Everything in Free",
      "Unlimited EVO chat",
      "EVO: 3 nutrition plans/month",
      "EVO: 3 workout plans/month",
      "EVO: 3 meal/exercise swaps/week",
      "EVO: saves your body data",
      "EVO: remembers across sessions",
      "Meal Planner (6 meals, save 10)",
      "Save 50 tool results + export",
    ],
    highlight: false,
    separate: false,
  },
  {
    id: "pro",
    nameAr: "برو",
    nameEn: "Pro",
    priceMonthly: 19.99,
    priceYearly: 149.99,
    limits: {
      evoChatDailyLimit: null,
      evoNutritionPlanLimit: 6,
      evoWorkoutPlanLimit: 6,
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
      "Everything in Premium",
      "EVO: 6 nutrition plans/month",
      "EVO: 6 workout plans/month",
      "EVO: unlimited swaps",
      "EVO: pattern analysis + predictions",
      "Meal Planner (unlimited meals + saves)",
      "Unlimited tool results + export",
      "Premium content (courses, plans, books)",
    ],
    highlight: true,
    separate: false,
  },
  {
    id: "coaching",
    nameAr: "كوتشينج",
    nameEn: "Coaching",
    priceMonthly: 20,
    priceYearly: null,
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
      "Human coach personalized plans",
      "Custom nutrition plan from coach",
      "Custom workout program from coach",
      "Weekly personal follow-up",
      "Manual meal/exercise swaps",
      "Priority support tickets",
      "Direct communication with coach",
      "Separate from Pro membership",
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
  const monthly = `$${m.priceMonthly.toFixed(2)}/mo`;
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
    feature: "Exercise Library (868+)",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "Food Database (80+)",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "Fitness Calculators",
    free: "✓",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "EVO AI Chat",
    free: "10/day",
    premium: "Unlimited",
    pro: "Unlimited",
    coaching: "Unlimited",
  },
  {
    feature: "EVO: Nutrition Plans",
    free: "—",
    premium: "3/month",
    pro: "6/month",
    coaching: "Unlimited",
  },
  {
    feature: "EVO: Workout Plans",
    free: "—",
    premium: "3/month",
    pro: "6/month",
    coaching: "Unlimited",
  },
  {
    feature: "EVO: Swaps",
    free: "—",
    premium: "3/week",
    pro: "Unlimited",
    coaching: "Unlimited",
  },
  {
    feature: "EVO: Pattern Analysis",
    free: "—",
    premium: "—",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "EVO: Cross-Session Memory",
    free: "—",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "Meal Planner",
    free: "3 meals, 1 save",
    premium: "6 meals, 10 saves",
    pro: "Unlimited",
    coaching: "Unlimited",
  },
  {
    feature: "Save Tool Results",
    free: "3",
    premium: "50",
    pro: "Unlimited",
    coaching: "Unlimited",
  },
  {
    feature: "Export Results",
    free: "—",
    premium: "✓",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "Premium Content",
    free: "—",
    premium: "—",
    pro: "✓",
    coaching: "✓",
  },
  {
    feature: "Human Coach",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
  {
    feature: "Weekly Follow-up",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
  {
    feature: "Priority Support",
    free: "—",
    premium: "—",
    pro: "—",
    coaching: "✓",
  },
];
