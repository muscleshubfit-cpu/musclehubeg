// Subscription tiers, pricing, and feature matrix.
// 2 tiers only: Starter ($20/mo, $200/yr) + Elite ($40/mo, $400/yr)
// Swap limits per day are tier-dependent.

export type TierId = "starter" | "elite";
export type Duration = 1 | 12;
export type PaymentMethod = "instapay" | "vodafone_cash" | "paypal";

export const DURATIONS: Duration[] = [1, 12];
export const TIER_IDS: TierId[] = ["starter", "elite"];

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
 /** Daily swap limit per type (meal/exercise). null = unlimited. */
 swapLimit: number | null;
};

// Prices in USD:
// - Starter: $20/month or $200/year (≈ 2 months free)
// - Elite: $40/month or $400/year (≈ 2 months free)
// EGP equivalent (≈ 50 EGP per $1):
// - Starter: ≈ 1000 ج.م/شهر or ≈ 10000 ج.م/سنة
// - Elite: ≈ 2000 ج.م/شهر or ≈ 20000 ج.م/سنة
export const TIERS: Tier[] = [
 {
 id: "starter",
 nameKey: "tier.starter",
 subKey: "tier.starter.sub",
 ctaKey: "tier.starter.cta",
 prices: { 1: 20, 12: 200 },
 swapLimit: 2,
 featureKeys: [
 "feat.nutritionPlan",
 "feat.workoutProgram",
 "feat.weeklyReview",
 "feat.progressTracking",
 "feat.coachSupport",
 "feat.swaps2",
 "feat.aiCoach",
 ],
 },
 {
 id: "elite",
 nameKey: "tier.elite",
 subKey: "tier.elite.sub",
 ctaKey: "tier.elite.cta",
 inheritsFrom: "starter",
 best: true,
 prices: { 1: 40, 12: 400 },
 swapLimit: null, // unlimited
 featureKeys: [
 "feat.swapsUnlimited",
 "feat.vipCoaching",
 "feat.fastestResponse",
 "feat.maxAccountability",
 "feat.prioritySupport",
 "feat.fasterAdjust",
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

/** Get swap limit for a tier (null = unlimited). */
export function swapLimitFor(id: TierId): number | null {
 const tier = getTier(id);
 return tier?.swapLimit ?? null;
}

// Response time shown per tier in the comparison table.
export const RESPONSE_TIME_KEY: Record<TierId, string> = {
 starter: "rt.48",
 elite: "rt.instant",
};

export function formatEgp(amount: number): string {
 return new Intl.NumberFormat("en-US").format(amount);
}

/** Calculate savings for 12-month plan vs 12× monthly. */
export function savingsFor(id: TierId): { months: number; amount: number; percent: number } | null {
 const tier = getTier(id);
 if (!tier) return null;
 const monthly = tier.prices[1] * 12;
 const yearly = tier.prices[12];
 const amount = monthly - yearly;
 if (amount <= 0) return null;
 return {
 months: Math.round(amount / tier.prices[1]),
 amount,
 percent: Math.round((amount / monthly) * 100),
 };
}

/** Get EGP equivalent for a USD price (≈ 50 EGP per $1). */
export function usdToEgp(usd: number): number {
 return usd * 50;
}
