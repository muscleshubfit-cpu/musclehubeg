/**
 * Affiliate Engine — generic, idempotent, payment-provider-agnostic
 * commission engine for MuscleHubEG.
 *
 * Architecture:
 *   Verified Payment
 *       ↓
 *   createAffiliateTransaction()  ← records the paid transaction
 *       ↓
 *   processCommission()           ← looks up attribution, calculates commission
 *       ↓
 *   createCommission()            ← idempotent (unique constraint on transaction_id)
 *       ↓
 *   referral_earnings             ← existing payout system (unchanged)
 *
 * Transaction types:
 *   - subscription_initial:  first subscription payment (current manual flow)
 *   - subscription_renewal:  recurring renewal (future — not triggered yet)
 *   - one_time_product:      one-time product purchase (future)
 *   - one_time_service:      one-time service purchase (future)
 *
 * Idempotency:
 *   - Unique constraint on affiliate_commissions.transaction_id
 *   - createCommission() checks for existing commission before inserting
 *   - The database rejects duplicates even if the code fails to check
 *
 * Reversal:
 *   - reverseCommission() marks commission as 'reversed'
 *   - Linked referral_earning is also marked (status change)
 *   - Does NOT delete financial history — preserves audit trail
 *
 * Attribution:
 *   - Subscriptions: uses existing referrals table (first-click, permanent)
 *   - One-time products: will use 30-day referral cookie (future)
 *   - Both paths resolve to affiliate_user_id stored on the transaction
 *
 * IMPORTANT — Payment flow integration:
 *   The current manual subscription approval flow (reviewSubscriptionRequest
 *   in src/lib/data.ts) calls processSubscriptionInitialPayment() when a
 *   coach approves a payment receipt. This replaces the legacy
 *   awardCommission() call. The legacy function is kept in referral.ts
 *   for backward compatibility but is no longer the active code path.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { COMMISSION_RATE } from "@/lib/referral";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type TransactionType =
  | "subscription_initial"
  | "subscription_renewal"
  | "one_time_product"
  | "one_time_service";

export type TransactionStatus = "completed" | "refunded" | "reversed" | "pending";
export type CommissionStatus = "pending" | "available" | "requested" | "paid" | "reversed";

export type AffiliateTransaction = {
  id: string;
  user_id: string;
  affiliate_user_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  external_reference: string | null;
  product_id: string | null;
  affiliate_eligible: boolean;
  status: TransactionStatus;
  metadata: any;
  created_at: string;
  updated_at: string;
};

export type AffiliateCommission = {
  id: string;
  affiliate_user_id: string;
  transaction_id: string;
  referral_id: string | null;
  commission_type: TransactionType;
  amount: number;
  rate: number;
  status: CommissionStatus;
  reversed_at: string | null;
  reversal_reason: string | null;
  earning_id: string | null;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────────────────
// 1. Create Affiliate Transaction
// ─────────────────────────────────────────────────────────────────────────

/**
 * Record a verified paid transaction in the affiliate system.
 *
 * This is the ENTRY POINT for the commission engine. It should be called
 * AFTER a payment is verified (not at checkout, not at pending).
 *
 * For current manual payments: called after coach approves the receipt.
 * For future Stripe: called from webhook handler on 'invoice.paid'.
 *
 * @param userId - The paying customer
 * @param type - Transaction type
 * @param amount - Amount paid (USD)
 * @param externalReference - Unique reference (subscription_request_id, charge ID, etc.)
 * @param productId - Product/plan identifier ('premium', 'pro', 'coaching', etc.)
 * @param affiliateEligible - Whether this transaction qualifies for commission (default true)
 * @returns The transaction record (or null on failure)
 */
export async function createAffiliateTransaction(
  userId: string,
  type: TransactionType,
  amount: number,
  externalReference?: string,
  productId?: string,
  affiliateEligible = true,
): Promise<AffiliateTransaction | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  if (amount <= 0) return null;

  // Look up the affiliate for this user from the referrals table.
  // This uses the EXISTING first-click, permanent attribution model.
  // For subscriptions: the referrals row is looked up by referred_id.
  // For one-time products (future): the 30-day cookie would be checked
  // and the affiliate resolved server-side.
  let affiliateUserId: string | null = null;

  const { data: referral } = await supabase
    .from("referrals")
    .select("referrer_id, status")
    .eq("referred_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (referral && referral.referrer_id) {
    // For subscription_initial: only award if referral is pending (first time)
    // For subscription_renewal: award regardless of referral status (recurring)
    // For one_time: award if referral exists (cookie attribution, future)
    if (type === "subscription_initial") {
      // Only proceed if referral is pending (not already completed)
      if (referral.status === "pending") {
        affiliateUserId = referral.referrer_id;
      }
    } else {
      // Renewals and one-time products: affiliate is already persisted
      affiliateUserId = referral.referrer_id;
    }
  }

  // Insert the transaction record.
  // The affiliate_transactions and affiliate_commissions tables are
  // defined in src/lib/supabase/types.ts (added in the same commit that
  // restored this file).
  const { data: txn, error } = await supabase
    .from("affiliate_transactions")
    .insert({
      user_id: userId,
      affiliate_user_id: affiliateUserId,
      transaction_type: type,
      amount: Math.round(amount * 100) / 100,
      currency: "USD",
      external_reference: externalReference || null,
      product_id: productId || null,
      affiliate_eligible: affiliateEligible && !!affiliateUserId,
      status: "completed",
    })
    .select()
    .single();

  if (error) {
    // If duplicate (unique constraint on external_reference + type),
    // fetch the existing transaction instead
    if (error.code === "23505" && externalReference) {
      const { data: existing } = await supabase
        .from("affiliate_transactions")
        .select("*")
        .eq("external_reference", externalReference)
        .eq("transaction_type", type)
        .maybeSingle();
      return existing as AffiliateTransaction | null;
    }
    console.error("[affiliate-engine] createAffiliateTransaction error:", error.message);
    return null;
  }

  return txn as AffiliateTransaction;
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Process Commission (the main engine)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Process commission for a transaction.
 *
 * This is the MAIN ENGINE function. It:
 *   1. Checks if the transaction is affiliate-eligible
 *   2. Checks if a commission already exists (idempotency)
 *   3. Calculates the commission (20% by default)
 *   4. Creates the commission record
 *   5. Creates a referral_earning (for payout system)
 *   6. Updates the referrals table (for subscription_initial only)
 *   7. Sends a notification to the affiliate
 *
 * IDEMPOTENT: If called multiple times for the same transaction,
 * only ONE commission is created (enforced by DB unique constraint).
 *
 * @param transactionId - The affiliate_transaction ID
 * @returns The commission record (or null if not eligible / already exists)
 */
export async function processCommission(
  transactionId: string,
): Promise<AffiliateCommission | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  // 1. Fetch the transaction
  const { data: txn, error: txnError } = await supabase
    .from("affiliate_transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();

  if (txnError || !txn) {
    console.error("[affiliate-engine] Transaction not found:", transactionId);
    return null;
  }

  const transaction = txn as AffiliateTransaction;

  // 2. Check eligibility
  if (!transaction.affiliate_eligible || !transaction.affiliate_user_id) {
    console.log("[affiliate-engine] Transaction not affiliate-eligible:", transactionId);
    return null;
  }

  if (transaction.status !== "completed") {
    console.log("[affiliate-engine] Transaction not completed:", transactionId, "status:", transaction.status);
    return null;
  }

  // 3. IDEMPOTENCY CHECK: look for existing commission
  const { data: existing } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (existing) {
    console.log("[affiliate-engine] Commission already exists for transaction:", transactionId);
    return existing as AffiliateCommission;
  }

  // 4. Calculate commission
  const rate = COMMISSION_RATE; // 0.20
  const commissionAmount = Math.round(transaction.amount * rate * 100) / 100;

  // 5. Look up referral for audit trail
  const { data: referral } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", transaction.user_id)
    .eq("referrer_id", transaction.affiliate_user_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // 6. Create commission record
  const { data: commission, error: commError } = await supabase
    .from("affiliate_commissions")
    .insert({
      affiliate_user_id: transaction.affiliate_user_id,
      transaction_id: transactionId,
      referral_id: referral?.id || null,
      commission_type: transaction.transaction_type,
      amount: commissionAmount,
      rate: rate,
      status: "available",
    })
    .select()
    .single();

  if (commError) {
    // If unique constraint violation, fetch existing (race condition handled)
    if (commError.code === "23505") {
      const { data: raceExisting } = await supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle();
      return raceExisting as AffiliateCommission | null;
    }
    console.error("[affiliate-engine] Commission insert error:", commError.message);
    return null;
  }

  const commissionRow = commission as AffiliateCommission;

  // 7. Create referral_earning (links to existing payout system)
  // The new affiliate_commission_id and transaction_type columns
  // are added by migration 0015 and are now in types.ts.
  const { data: earning } = await supabase
    .from("referral_earnings")
    .insert({
      user_id: transaction.affiliate_user_id,
      referral_id: referral?.id || null,
      amount: commissionAmount,
      status: "available",
      affiliate_commission_id: commissionRow.id,
      transaction_type: transaction.transaction_type,
    })
    .select()
    .single();

  // 8. Link earning back to commission
  if (earning) {
    await supabase
      .from("affiliate_commissions")
      .update({ earning_id: earning.id })
      .eq("id", commissionRow.id);
  }

  // 9. For subscription_initial: update referrals table (backward compat)
  if (transaction.transaction_type === "subscription_initial" && referral) {
    await supabase
      .from("referrals")
      .update({
        status: "completed",
        commission_amount: commissionAmount,
        completed_at: new Date().toISOString(),
        subscription_request_id: transaction.external_reference,
      })
      .eq("id", referral.id);
  }

  // 10. Notify the affiliate
  try {
    const typeLabel =
      transaction.transaction_type === "subscription_initial" ? "اشتراك جديد" :
      transaction.transaction_type === "subscription_renewal" ? "تجديد اشتراك" :
      transaction.transaction_type === "one_time_product" ? "شراء منتج" :
      "خدمة";

    await supabase.from("notifications").insert({
      user_id: transaction.affiliate_user_id,
      type: "referral_commission",
      title: "عمولة جديدة! 🎉",
      body: `ربحت $${commissionAmount} عمولة من ${typeLabel}.`,
      link: "/referral",
      read: false,
    });
  } catch {}

  console.log(`[affiliate-engine] Commission created: $${commissionAmount} for affiliate ${transaction.affiliate_user_id} (type: ${transaction.transaction_type})`);

  return commissionRow;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Reverse Commission (refund/cancellation handling)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Reverse a commission when a payment is refunded or reversed.
 *
 * This does NOT delete financial history. It:
 *   1. Updates affiliate_commissions.status to 'reversed'
 *   2. Updates the linked referral_earning status
 *   3. Updates the affiliate_transactions.status to 'refunded'
 *
 * If the earning was already paid out, it creates a negative adjustment
 * (deducted from future earnings).
 *
 * @param transactionId - The transaction to reverse
 * @param reason - Reason for reversal
 * @returns true on success
 */
export async function reverseCommission(
  transactionId: string,
  reason: string,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  // 1. Update transaction status
  const { error: txnError } = await supabase
    .from("affiliate_transactions")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  if (txnError) {
    console.error("[affiliate-engine] Transaction update error:", txnError.message);
    return false;
  }

  // 2. Find the commission
  const { data: commission } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (!commission) {
    console.log("[affiliate-engine] No commission to reverse for transaction:", transactionId);
    return true; // No commission = nothing to reverse
  }

  const commissionRow = commission as AffiliateCommission;

  // 3. Reverse the commission
  await supabase
    .from("affiliate_commissions")
    .update({
      status: "reversed",
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq("id", commissionRow.id);

  // 4. Handle the linked earning
  if (commissionRow.earning_id) {
    const { data: earning } = await supabase
      .from("referral_earnings")
      .select("status")
      .eq("id", commissionRow.earning_id)
      .maybeSingle();

    if (earning) {
      if (earning.status === "paid") {
        // Already paid out — create a negative adjustment (clawback)
        await supabase.from("referral_earnings").insert({
          user_id: commissionRow.affiliate_user_id,
          referral_id: commissionRow.referral_id,
          amount: -commissionRow.amount,
          status: "available", // negative available balance
          affiliate_commission_id: commissionRow.id,
          transaction_type: commissionRow.commission_type,
        });
      } else if (earning.status === "available") {
        // Not yet paid — reverse the earning
        await supabase
          .from("referral_earnings")
          .update({ status: "pending" }) // mark as pending (effectively frozen)
          .eq("id", commissionRow.earning_id);
      }
      // If 'requested' or 'pending', leave as-is (admin will handle manually)
    }
  }

  console.log(`[affiliate-engine] Commission reversed for transaction ${transactionId}: ${reason}`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Get Affiliate Stats (for dashboard)
// ─────────────────────────────────────────────────────────────────────────

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
  commissions: AffiliateCommission[];
};

/**
 * Get affiliate stats with commission type breakdown.
 * Used by the affiliate dashboard to show initial vs renewal vs product commissions.
 *
 * NOTE: This function is currently NOT used by the existing ReferralView.
 * It is provided as a future-ready helper for when the dashboard is extended
 * to show commission-type breakdowns. The existing ReferralView continues to
 * use getReferralStats() from src/lib/referral.ts, which reads from
 * referral_earnings (now linked to affiliate_commissions via the
 * affiliate_commission_id column added by migration 0015).
 */
export async function getAffiliateStats(affiliateUserId: string): Promise<AffiliateStats> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalEarnings: 0,
      availableBalance: 0,
      pendingEarnings: 0,
      paidOut: 0,
      reversedEarnings: 0,
      initialCommissions: 0,
      renewalCommissions: 0,
      productCommissions: 0,
      serviceCommissions: 0,
      commissions: [],
    };
  }

  const { data: commissions } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("affiliate_user_id", affiliateUserId)
    .order("created_at", { ascending: false });

  const list = (commissions || []) as AffiliateCommission[];

  const active = list.filter((c) => c.status !== "reversed");
  const reversed = list.filter((c) => c.status === "reversed");

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
    commissions: list,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Convenience: Process Subscription Initial Payment
// ─────────────────────────────────────────────────────────────────────────

/**
 * Convenience function for the current manual payment approval flow.
 *
 * Called from reviewSubscriptionRequest() when a coach approves a payment.
 * Replaces the old awardCommission() call.
 *
 * Steps:
 *   1. Creates an affiliate_transaction (type: subscription_initial)
 *   2. Processes commission through the engine
 *
 * IDEMPOTENT: If called twice for the same subscription_request_id,
 * only one commission is created (unique constraint prevents duplicate).
 */
export async function processSubscriptionInitialPayment(
  userId: string,
  paymentAmount: number,
  subscriptionRequestId: string,
  planTier: string,
): Promise<AffiliateCommission | null> {
  // 1. Create the transaction
  const txn = await createAffiliateTransaction(
    userId,
    "subscription_initial",
    paymentAmount,
    subscriptionRequestId,
    planTier,
    true, // affiliate eligible
  );

  if (!txn) {
    console.error("[affiliate-engine] Failed to create transaction for subscription:", subscriptionRequestId);
    return null;
  }

  // 2. Process commission
  return processCommission(txn.id);
}
