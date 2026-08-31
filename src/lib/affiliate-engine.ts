/**
 * Affiliate Engine — BROWSER READ LAYER (dashboard stats only).
 *
 * PHASE 66 (owner-approved): every WRITE (transactions, commissions,
 * reversals) moved to the SERVER engine in
 * src/lib/affiliate-engine-server.ts behind verified money moments:
 *   - PayPal capture  (/api/paypal/capture-order)
 *   - Manual receipt approval (/api/affiliate/commission, admin-only)
 *   - Coach client activation (/api/coach/subscriptions/activate)
 *   - PayPal refund webhook (reversal)
 *
 * The Phase 64 study proved browser-side engine writes failed silently
 * (referrals INSERT RLS + engine tables missing in production) — do NOT
 * reintroduce client writes. This file keeps the dashboard read helper
 * (RLS: users read their own rows; admins/coaches read via policies).
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type CommissionStatus = "pending" | "available" | "requested" | "paid" | "reversed";

export type AffiliateCommission = {
  id: string;
  affiliate_user_id: string;
  transaction_id: string;
  referral_id: string | null;
  commission_type: string;
  amount: number;
  rate: number;
  status: CommissionStatus;
  reversed_at: string | null;
  reversal_reason: string | null;
  earning_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateStats = {
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  paidOut: number;
  reversedEarnings: number;
  initialCommissions: number;
  renewalCommissions: number;
  productCommissions: number;
  serviceCommissions: number;
  /** Owner decree 2026-09-01: commissions from referred coaches' activations */
  coachActivations: number;
  coachActivationEarnings: number;
  commissions: AffiliateCommission[];
};

const EMPTY_STATS: AffiliateStats = {
  totalEarnings: 0,
  availableBalance: 0,
  pendingEarnings: 0,
  paidOut: 0,
  reversedEarnings: 0,
  initialCommissions: 0,
  renewalCommissions: 0,
  productCommissions: 0,
  serviceCommissions: 0,
  coachActivations: 0,
  coachActivationEarnings: 0,
  commissions: [],
};

/**
 * Get affiliate stats with commission type breakdown.
 * Used by the affiliate dashboards (/referral and the coach console).
 */
export async function getAffiliateStats(affiliateUserId: string): Promise<AffiliateStats> {
  if (!isSupabaseConfigured || !supabase) return EMPTY_STATS;

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("affiliate_user_id", affiliateUserId)
    .order("created_at", { ascending: false });

  const list = (commissions || []) as AffiliateCommission[];

  const active = list.filter((c) => c.status !== "reversed");
  const reversed = list.filter((c) => c.status === "reversed");
  const coach = active.filter((c) => c.commission_type === "coach_client_activation");

  return {
    totalEarnings: active.reduce((s, c) => s + Number(c.amount), 0),
    availableBalance: active
      .filter((c) => c.status === "available")
      .reduce((s, c) => s + Number(c.amount), 0),
    pendingEarnings: active
      .filter((c) => c.status === "pending")
      .reduce((s, c) => s + Number(c.amount), 0),
    paidOut: active
      .filter((c) => c.status === "paid")
      .reduce((s, c) => s + Number(c.amount), 0),
    reversedEarnings: reversed.reduce((s, c) => s + Number(c.amount), 0),
    initialCommissions: active.filter((c) => c.commission_type === "subscription_initial").length,
    renewalCommissions: active.filter((c) => c.commission_type === "subscription_renewal").length,
    productCommissions: active.filter((c) => c.commission_type === "one_time_product").length,
    serviceCommissions: active.filter((c) => c.commission_type === "one_time_service").length,
    coachActivations: coach.length,
    coachActivationEarnings: coach.reduce((s, c) => s + Number(c.amount), 0),
    commissions: list,
  };
}
