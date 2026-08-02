// Subscription tiers, pricing, and feature matrix for the premium membership.
// Pure data — safe to import on both client and server.

export type TierId = "essential" | "advanced" | "professional" | "elite";
export type Duration = 3 | 6 | 12;
export type PaymentMethod = "instapay" | "vodafone_cash";

export const DURATIONS: Duration[] = [3, 6, 12];
export const TIER_IDS: TierId[] = ["essential", "advanced", "professional", "elite"];

export type Tier = {
  id: TierId;
  nameKey: string;
  subKey: string;
  ctaKey: string;
  /** New features this tier adds on top of the previous one. */
  featureKeys: string[];
  inheritsFrom?: TierId;
  prices: Record<Duration, number>;
  popular?: boolean;
  best?: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "essential",
    nameKey: "tier.essential",
    subKey: "tier.essential.sub",
    ctaKey: "tier.essential.cta",
    prices: { 3: 1500, 6: 2700, 12: 4800 },
    featureKeys: [
      "feat.nutritionPlan",
      "feat.workoutProgram",
      "feat.weeklyReview",
      "feat.qWeekly",
      "feat.progressTracking",
      "feat.coachSupport",
    ],
  },
  {
    id: "advanced",
    nameKey: "tier.advanced",
    subKey: "tier.advanced.sub",
    ctaKey: "tier.advanced.cta",
    inheritsFrom: "essential",
    popular: true,
    prices: { 3: 2400, 6: 4200, 12: 7200 },
    featureKeys: ["feat.q48", "feat.fasterAdjust", "feat.higherPriority"],
  },
  {
    id: "professional",
    nameKey: "tier.professional",
    subKey: "tier.professional.sub",
    ctaKey: "tier.professional.cta",
    inheritsFrom: "advanced",
    prices: { 3: 3600, 6: 6300, 12: 10800 },
    featureKeys: [
      "feat.q24",
      "feat.higherCoachPriority",
      "feat.fasterFollowup",
      "feat.detailedAdjust",
    ],
  },
  {
    id: "elite",
    nameKey: "tier.elite",
    subKey: "tier.elite.sub",
    ctaKey: "tier.elite.cta",
    inheritsFrom: "professional",
    best: true,
    prices: { 3: 6000, 6: 10500, 12: 18000 },
    featureKeys: [
      "feat.fastestResponse",
      "feat.highestPriority",
      "feat.vipCoaching",
      "feat.premiumFollowup",
      "feat.maxAccountability",
    ],
  },
];

export function getTier(id: TierId): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

export function priceFor(id: TierId, duration: Duration): number | null {
  const tier = getTier(id);
  if (!tier) return null;
  return tier.prices[duration] ?? null;
}

/** Full accumulated feature list for a tier (inherited + own). */
export function allFeatureKeys(id: TierId): string[] {
  const tier = getTier(id);
  if (!tier) return [];
  const inherited = tier.inheritsFrom ? allFeatureKeys(tier.inheritsFrom) : [];
  return [...inherited, ...tier.featureKeys];
}

export const RESPONSE_TIME_KEY: Record<TierId, string> = {
  essential: "rt.weekly",
  advanced: "rt.48",
  professional: "rt.24",
  elite: "rt.instant",
};

export function formatEgp(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}
