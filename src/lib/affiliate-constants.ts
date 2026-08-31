/**
 * Shared affiliate constants — single source of truth for BOTH the
 * browser layer (src/lib/referral.ts) and the server engine
 * (src/lib/affiliate-engine-server.ts). Kept dependency-free so server
 * routes can import it without pulling in the browser Supabase client
 * (the reason capture-order used to duplicate the rate inline).
 */

/** Commission rate applied to every affiliate transaction (20%). */
export const COMMISSION_RATE = 0.2 as const;

/** Minimum referral-earnings balance before a payout can be requested. */
export const MINIMUM_PAYOUT = 10 as const;

/** Referral attribution cookie name + lifetime (days). */
export const REFERRAL_COOKIE_NAME = "mhe_ref";
export const COOKIE_DURATION_DAYS = 30 as const;
