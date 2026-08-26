/**
 * Referral & Commission System — data access layer.
 *
 * Tables (see supabase/migrations/0004_referral_commission_system.sql):
 *   - referrals            (referrer → referred tracking)
 *   - referral_earnings    (commission amounts, status: pending→available→requested→paid)
 *   - referral_payouts     (payout requests: cash_wallet / subscription_discount / bank_transfer)
 *
 * Commission rules:
 *   - 20% of first subscription payment
 *   - One-time per referral (not recurring)
 *   - Only earned when admin approves the subscription payment
 *   - Minimum payout: $10
 *   - Cookie duration: 30 days
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

// ---------- Types ----------

export type ReferralStatus = "pending" | "completed" | "rejected";
export type EarningStatus = "pending" | "available" | "requested" | "paid";
export type PayoutMethod = "cash_wallet" | "subscription_discount" | "bank_transfer";
export type PayoutStatus = "pending" | "approved" | "rejected" | "paid";

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referred_email: string | null;
  referral_code: string;
  status: ReferralStatus;
  commission_amount: number;
  subscription_request_id: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  referred_name?: string;
};

export type ReferralEarning = {
  id: string;
  user_id: string;
  referral_id: string | null;
  amount: number;
  status: EarningStatus;
  created_at: string;
  requested_at: string | null;
  paid_at: string | null;
  payout_method: string | null;
  payout_details: string | null;
};

export type ReferralPayout = {
  id: string;
  user_id: string;
  amount: number;
  method: PayoutMethod;
  wallet_number: string | null;
  bank_details: string | null;
  status: PayoutStatus;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  // Joined fields
  user_name?: string;
  user_email?: string;
};

export type ReferralStats = {
  total: number;
  completed: number;
  pending: number;
  rejected: number;
  totalEarnings: number;
  availableBalance: number;
  pendingEarnings: number;
  paidOut: number;
  referralCode: string;
  referrals: Referral[];
  earnings: ReferralEarning[];
  payouts: ReferralPayout[];
};

// ---------- Constants ----------

export const COMMISSION_RATE = 0.20; // 20%
export const MINIMUM_PAYOUT = 10; // $10
export const COOKIE_DURATION_DAYS = 30;
export const REFERRAL_COOKIE_NAME = "mhe_ref";

// ---------- Referral Code ----------

/**
 * Generate a unique referral code for a user.
 * Format: first 4 chars of name + 4 random alphanumeric chars (e.g. AHMED7K3X)
 */
export function generateReferralCode(fullName?: string | null): string {
  const namePart = (fullName || "USER").replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "USER";
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${namePart}${randomPart}`;
}

/**
 * Get or create a referral code for the current user.
 */
export async function getOrCreateReferralCode(userId: string, fullName?: string | null): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    // Try to get existing code
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.referral_code) return profile.referral_code;

    // Generate and save a new code
    let code = generateReferralCode(fullName);
    let attempts = 0;
    while (attempts < 5) {
      const { error } = await supabase
        .from("profiles")
        .update({ referral_code: code })
        .eq("id", userId)
        .is("referral_code", null);

      if (!error) return code;
      // Collision — try again
      code = generateReferralCode(fullName);
      attempts++;
    }
    return code;
  }
  // Demo mode
  return generateReferralCode(fullName);
}

// ---------- Referral Tracking ----------

/**
 * Track a referral — called when a user signs up with a referral code/cookie.
 * Creates a pending referral record linking referrer → referred.
 */
export async function trackReferral(
  referrerCode: string,
  referredId: string,
  referredEmail: string,
): Promise<Referral | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  // Find the referrer by code
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", referrerCode)
    .maybeSingle();

  if (!referrer) return null;

  // Don't allow self-referral (but user said "no problem if they refer themselves")
  // We'll allow it — the admin said "we're the winners"

  // Check if this user was already referred
  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", referredId)
    .maybeSingle();

  if (existing) return null; // Already referred by someone

  // Create the referral
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      referrer_id: referrer.id,
      referred_id: referredId,
      referred_email: referredEmail,
      referral_code: referrerCode,
      status: "pending",
      commission_amount: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[trackReferral] Error:", error.message);
    return null;
  }
  return data;
}

// ---------- Commission ----------

/**
 * Award commission when a subscription payment is confirmed by admin.
 * Called from the admin payment approval flow.
 *
 * @param referredUserId - The user who subscribed (the referred person)
 * @param paymentAmount - The amount paid (in USD)
 * @param subscriptionRequestId - The ID of the subscription request
 */
export async function awardCommission(
  referredUserId: string,
  paymentAmount: number,
  subscriptionRequestId: string,
): Promise<{ referral: Referral | null; earning: ReferralEarning | null }> {
  if (!isSupabaseConfigured || !supabase) return { referral: null, earning: null };

  // Find the pending referral for this user
  const { data: referral, error: refError } = await supabase
    .from("referrals")
    .select("*")
    .eq("referred_id", referredUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (refError || !referral) return { referral: null, earning: null };

  // Calculate commission (20% of payment)
  const commission = Math.round(paymentAmount * COMMISSION_RATE * 100) / 100;

  // Update referral to completed
  const { error: updateError } = await supabase
    .from("referrals")
    .update({
      status: "completed",
      commission_amount: commission,
      completed_at: new Date().toISOString(),
      subscription_request_id: subscriptionRequestId,
    })
    .eq("id", referral.id);

  if (updateError) {
    console.error("[awardCommission] Update error:", updateError.message);
    return { referral: null, earning: null };
  }

  // Create earning record
  const { data: earning, error: earningError } = await supabase
    .from("referral_earnings")
    .insert({
      user_id: referral.referrer_id,
      referral_id: referral.id,
      amount: commission,
      status: "available",
    })
    .select()
    .single();

  if (earningError) {
    console.error("[awardCommission] Earning error:", earningError.message);
  }

  // Create notification for the referrer
  try {
    await supabase.from("notifications").insert({
      user_id: referral.referrer_id,
      type: "referral_commission",
      title: "عمولة جديدة! 🎉",
      body: `ربحت $${commission} عمولة من إحالة صديق.`,
      link: "/referral",
      read: false,
    });
  } catch {}

  return { referral: { ...referral, status: "completed", commission_amount: commission }, earning };
}

// ---------- Stats ----------

/**
 * Get full referral stats for a user (referrer dashboard).
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  if (isSupabaseConfigured && supabase) {
    // Get referral code
    const referralCode = await getOrCreateReferralCode(userId);

    // Get all referrals where this user is the referrer
    const { data: referrals } = await supabase
      .from("referrals")
      .select(`
        *,
        referred:profiles!referrals_referred_id_fkey(full_name)
      `)
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    // Get all earnings
    const { data: earnings } = await supabase
      .from("referral_earnings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Get all payouts
    const { data: payouts } = await supabase
      .from("referral_payouts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const completed = (referrals || []).filter((r: any) => r.status === "completed");
    const pending = (referrals || []).filter((r: any) => r.status === "pending");
    const rejected = (referrals || []).filter((r: any) => r.status === "rejected");

    const totalEarnings = (earnings || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const availableBalance = (earnings || [])
      .filter((e: any) => e.status === "available")
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const pendingEarnings = (earnings || [])
      .filter((e: any) => e.status === "pending")
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const paidOut = (earnings || [])
      .filter((e: any) => e.status === "paid")
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    return {
      total: referrals?.length || 0,
      completed: completed.length,
      pending: pending.length,
      rejected: rejected.length,
      totalEarnings,
      availableBalance,
      pendingEarnings,
      paidOut,
      referralCode,
      referrals: (referrals || []).map((r: any) => ({
        ...r,
        referred_name: r.referred?.full_name || r.referred_email || "—",
      })),
      earnings: earnings || [],
      payouts: payouts || [],
    };
  }

  // Demo mode — return empty stats
  return {
    total: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    totalEarnings: 0,
    availableBalance: 0,
    pendingEarnings: 0,
    paidOut: 0,
    referralCode: generateReferralCode(),
    referrals: [],
    earnings: [],
    payouts: [],
  };
}

// ---------- Payout Requests ----------

/**
 * Create a payout request (user asks to withdraw their earnings).
 *
 * C11 fix: instead of splitting earnings (which required changing
 * amounts — blocked by the prevent_earnings_tamper trigger), we mark
 * full earnings as "requested" and handle the overage in
 * adminApprovePayout by creating a new "available" earning for the
 * difference. This preserves the user's money without requiring
 * amount changes on existing rows.
 */
export async function createPayoutRequest(
  userId: string,
  amount: number,
  method: PayoutMethod,
  walletNumber?: string,
  bankDetails?: string,
): Promise<ReferralPayout | null> {
  if (amount < MINIMUM_PAYOUT) {
    throw new Error(`Minimum payout is $${MINIMUM_PAYOUT}`);
  }

  if (isSupabaseConfigured && supabase) {
    // Mark earnings as "requested" (FIFO — oldest first)
    const { data: earnings } = await supabase
      .from("referral_earnings")
      .select("id, amount, referral_id")
      .eq("user_id", userId)
      .eq("status", "available")
      .order("created_at", { ascending: true });

    if (!earnings || earnings.length === 0) {
      throw new Error("No available earnings to withdraw");
    }

    const totalAvailable = earnings.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    if (amount > totalAvailable) {
      throw new Error(`Requested amount exceeds available balance ($${totalAvailable})`);
    }

    // Mark earnings as requested (FIFO) until the requested amount is covered.
    // We mark FULL earnings (no splitting) — the overage is returned as a new
    // "available" earning when the coach approves the payout.
    let remaining = amount;
    const markedEarnings: Array<{ id: string; amount: number; referral_id: string | null }> = [];
    for (const e of earnings) {
      if (remaining <= 0) break;
      const eAmount = Number(e.amount);
      const { error: updateErr } = await supabase
        .from("referral_earnings")
        .update({ status: "requested", requested_at: new Date().toISOString() })
        .eq("id", e.id);
      if (updateErr) throw new Error(updateErr.message);
      markedEarnings.push({ id: e.id, amount: eAmount, referral_id: e.referral_id });
      remaining -= eAmount;
    }

    // Create payout record
    const { data, error } = await supabase
      .from("referral_payouts")
      .insert({
        user_id: userId,
        amount,
        method,
        wallet_number: walletNumber || null,
        bank_details: bankDetails || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  return null;
}

// ---------- Admin Functions ----------

/**
 * Get all referrals (admin only).
 */
export async function adminGetAllReferrals(): Promise<Referral[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("referrals")
    .select(`
      *,
      referrer:profiles!referrals_referrer_id_fkey(full_name, email),
      referred:profiles!referrals_referred_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data || []).map((r: any) => ({
    ...r,
    referred_name: r.referred?.full_name || r.referred_email || "—",
  }));
}

/**
 * Get all payout requests (admin only).
 */
export async function adminGetAllPayouts(): Promise<ReferralPayout[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("referral_payouts")
    .select(`
      *,
      user:profiles!referral_payouts_user_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data || []).map((p: any) => ({
    ...p,
    user_name: p.user?.full_name || "—",
    user_email: p.user?.email || "—",
  }));
}

/**
 * Admin: approve a payout (mark as paid).
 * Also marks the linked earnings as paid.
 * If total marked earnings exceed the payout amount, the overage is
 * returned as a new "available" earning (C11 fix).
 *
 * C12 fix: adds .eq("status", "pending") to prevent re-approving
 * already-processed payouts, and throws on DB errors instead of
 * silently ignoring them.
 */
export async function adminApprovePayout(payoutId: string, adminNote?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: payout } = await supabase
    .from("referral_payouts")
    .select("user_id, amount, status")
    .eq("id", payoutId)
    .single();

  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "pending") throw new Error(`Payout is already ${payout.status}`);

  // Mark payout as paid (only if still pending — prevents double-approval)
  const { error: payoutErr } = await supabase
    .from("referral_payouts")
    .update({
      status: "paid",
      admin_note: adminNote || null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", payoutId)
    .eq("status", "pending");
  if (payoutErr) throw new Error(payoutErr.message);

  // Mark linked earnings as paid (FIFO)
  const { data: earnings, error: earningsErr } = await supabase
    .from("referral_earnings")
    .select("id, amount, referral_id")
    .eq("user_id", payout.user_id)
    .eq("status", "requested")
    .order("requested_at", { ascending: true });
  if (earningsErr) throw new Error(earningsErr.message);

  let remaining = Number(payout.amount);
  let overage = 0;
  let lastReferralId: string | null = null;

  for (const e of earnings || []) {
    if (remaining <= 0) break;
    const eAmount = Number(e.amount);
    const { error: updErr } = await supabase
      .from("referral_earnings")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", e.id);
    if (updErr) throw new Error(updErr.message);

    if (eAmount > remaining) {
      // This earning was larger than what was needed — the overage
      // should be returned as a new "available" earning
      overage = eAmount - remaining;
      lastReferralId = e.referral_id;
    }
    remaining -= eAmount;
  }

  // Return the overage as a new "available" earning (C11 fix)
  if (overage > 0) {
    const { error: insErr } = await supabase
      .from("referral_earnings")
      .insert({
        user_id: payout.user_id,
        referral_id: lastReferralId,
        amount: overage,
        status: "available",
      });
    if (insErr) throw new Error(insErr.message);
  }

  // Notify user
  try {
    await supabase.from("notifications").insert({
      user_id: payout.user_id,
      type: "payout_paid",
      title: "تم صرف عمولتك! ✅",
      body: `تم صرف $${payout.amount} من عمولاتك.`,
      link: "/referral",
      read: false,
    });
  } catch {}
}

/**
 * Admin: reject a payout.
 * Reverts earnings back to "available".
 *
 * C12 fix: adds .eq("status", "pending") + throws on DB errors.
 */
export async function adminRejectPayout(payoutId: string, adminNote?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: payout } = await supabase
    .from("referral_payouts")
    .select("user_id, amount, status")
    .eq("id", payoutId)
    .single();

  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "pending") throw new Error(`Payout is already ${payout.status}`);

  // Mark payout as rejected (only if still pending)
  const { error: payoutErr } = await supabase
    .from("referral_payouts")
    .update({
      status: "rejected",
      admin_note: adminNote || null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", payoutId)
    .eq("status", "pending");
  if (payoutErr) throw new Error(payoutErr.message);

  // Revert earnings to available (FIFO)
  const { data: earnings, error: earningsErr } = await supabase
    .from("referral_earnings")
    .select("id, amount")
    .eq("user_id", payout.user_id)
    .eq("status", "requested")
    .order("requested_at", { ascending: true });
  if (earningsErr) throw new Error(earningsErr.message);

  let remaining = Number(payout.amount);
  for (const e of earnings || []) {
    if (remaining <= 0) break;
    const { error: updErr } = await supabase
      .from("referral_earnings")
      .update({ status: "available", requested_at: null })
      .eq("id", e.id);
    if (updErr) throw new Error(updErr.message);
    remaining -= Number(e.amount);
  }

  // Notify user
  try {
    await supabase.from("notifications").insert({
      user_id: payout.user_id,
      type: "payout_rejected",
      title: "طلب صرف مرفوض",
      body: `تم رفض طلب صرف $${payout.amount}. ${adminNote || ""}`,
      link: "/referral",
      read: false,
    });
  } catch {}
}

/**
 * Get admin referral overview stats.
 */
export async function adminGetReferralOverview(): Promise<{
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCommission: number;
  paidOut: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
}> {
  if (!isSupabaseConfigured || !supabase)
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalCommission: 0,
      paidOut: 0,
      pendingPayouts: 0,
      pendingPayoutAmount: 0,
    };

  const [refRes, earningsRes, payoutsRes] = await Promise.all([
    supabase.from("referrals").select("status, commission_amount"),
    supabase.from("referral_earnings").select("status, amount"),
    supabase.from("referral_payouts").select("status, amount"),
  ]);

  const referrals = refRes.data || [];
  const earnings = earningsRes.data || [];
  const payouts = payoutsRes.data || [];

  return {
    totalReferrals: referrals.length,
    completedReferrals: referrals.filter((r: any) => r.status === "completed").length,
    pendingReferrals: referrals.filter((r: any) => r.status === "pending").length,
    totalCommission: earnings.reduce((s: number, e: any) => s + Number(e.amount), 0),
    paidOut: earnings.filter((e: any) => e.status === "paid").reduce((s: number, e: any) => s + Number(e.amount), 0),
    pendingPayouts: payouts.filter((p: any) => p.status === "pending").length,
    pendingPayoutAmount: payouts.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0),
  };
}
