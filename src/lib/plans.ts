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

// Prices in USD (GLOBAL USD decree 2026-08-30 — the site is worldwide,
// never Egypt-specific; the old EGP-equivalent display was removed):
// - Starter: $20/month or $200/year (≈ 2 months free)
// - Elite: $40/month or $400/year (≈ 2 months free)
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

/**
 * 0046 — Canonical model tier for a sellable product id.
 *
 * The /coaching page sells the ORIGINAL Starter ($20) / Elite ($40)
 * products (owner decree: those are the PayPal-tied prices — «الأسعار
 * اللي شيلتها هي الصحيحة»). Clients PAY the storefront price, but the
 * SUBSCRIPTION rows are written under the canonical 3-tier membership
 * model (premium / pro / coaching) so that:
 *   - feature gates (tier-limits, EVO limits) apply uniformly,
 *   - the 0045 DB guard `subscriptions_tier_model_guard`
 *     (tier in premium/pro/coaching) never rejects a real payment,
 *   - existing starter/elite rows (remapped by 0045) and new ones
 *     resolve to the same successor tiers everywhere.
 *
 * Mapping (same as migration 0045 + the resolver belt-and-suspenders):
 *   starter → premium, elite → pro, everything else passes through.
 * Used by BOTH activation paths: PayPal capture (service role) and the
 * admin manual-approval flow. Price validation stays on the ORIGINAL
 * product id — Starter must charge exactly $20, never premium's $14.99.
 */
export function canonicalModelTier(productTier: string): string {
 if (productTier === "starter") return "premium";
 if (productTier === "elite") return "pro";
 return productTier;
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
