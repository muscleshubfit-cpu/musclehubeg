/**
 * AFFILIATE ENGINE — SERVER (Phase 66, owner-approved 2026-09-01)
 * ================================================================
 *
 * Server-side, service-role commission engine. The browser variant in
 * affiliate-engine.ts (getAffiliateStats) stays for dashboard reads, but
 * EVERY WRITE now runs here so nothing depends on browser RLS — the
 * Phase 64 study proved the old browser writes failed silently
 * (referrals INSERT policy) and hit tables that never existed in
 * production (0015 was never applied).
 *
 * Money moments that feed this engine:
 *   1. PayPal capture        → processSubscriptionInitialPaymentServer()
 *                              (coach-clients gate inside — 2026-08-30 decree)
 *   2. Manual receipt review → same function via POST /api/affiliate/commission
 *   3. Coach client activation ($6/$16 wallet debit)
 *                            → processCoachClientActivationServer()
 *                              (owner decree 2026-09-01: a referred COACH is
 *                              part of the affiliate system — every client
 *                              activation he pays for earns his inviter 20%)
 *   4. PayPal refund webhook → reverseCommissionByReferenceServer()
 *
 * IDEMPOTENCY: unique index on affiliate_transactions(external_reference,
 * transaction_type) + unique index on affiliate_commissions(transaction_id)
 * → a payment can never generate a duplicate commission.
 *
 * REVERSAL: never deletes rows — status flips to 'reversed' + clawback
 * earning when the original was already paid out.
 */

import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { COMMISSION_RATE } from "@/lib/affiliate-constants";

export type ServerTransactionType =
  | "subscription_initial"
  | "subscription_renewal"
  | "one_time_product"
  | "one_time_service"
  | "coach_client_activation";

type Db = NonNullable<typeof supabaseAdmin>;

// ─────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────

function ready(): Db | null {
  return isSupabaseAdminConfigured && supabaseAdmin ? (supabaseAdmin as Db) : null;
}

/** Find the referral that attributes this user (first-click, permanent). */
async function findReferral(db: Db, userId: string) {
  const { data } = await db
    .from("referrals")
    .select("id, referrer_id, status, commission_amount")
    .eq("referred_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as
    | { id: string; referrer_id: string; status: string; commission_amount: number }
    | null;
}

/**
 * Record a verified paid transaction. Idempotent on
 * (external_reference, transaction_type) — duplicates return the original.
 */
async function createTransaction(
  db: Db,
  userId: string,
  type: ServerTransactionType,
  amount: number,
  externalReference: string | null,
  productId: string | null,
): Promise<{ id: string; affiliate_user_id: string | null } | null> {
  if (amount <= 0) return null;

  const referral = await findReferral(db, userId);
  let affiliateUserId: string | null = null;

  if (referral?.referrer_id) {
    if (type === "subscription_initial") {
      // One-time: only the FIRST paid subscription completes the referral
      if (referral.status === "pending") affiliateUserId = referral.referrer_id;
    } else {
      // Renewals, one-time products, coach activations: recurring
      affiliateUserId = referral.referrer_id;
    }
  }

  const { data: txn, error } = await db
    .from("affiliate_transactions")
    .insert({
      user_id: userId,
      affiliate_user_id: affiliateUserId,
      transaction_type: type,
      amount: Math.round(amount * 100) / 100,
      currency: "USD",
      external_reference: externalReference,
      product_id: productId,
      affiliate_eligible: Boolean(affiliateUserId),
      status: "completed",
    })
    .select("id, affiliate_user_id")
    .single();

  if (error) {
    if (error.code === "23505" && externalReference) {
      const { data: existing } = await db
        .from("affiliate_transactions")
        .select("id, affiliate_user_id")
        .eq("external_reference", externalReference)
        .eq("transaction_type", type)
        .maybeSingle();
      return (existing as { id: string; affiliate_user_id: string | null } | null) ?? null;
    }
    console.error("[affiliate-engine-server] createTransaction error:", error.message);
    return null;
  }
  return txn as { id: string; affiliate_user_id: string | null };
}

/**
 * Create the commission + earning + referral update + notification for a
 * completed transaction. Idempotent via unique
 * affiliate_commissions.transaction_id.
 */
async function processCommission(
  db: Db,
  transactionId: string,
): Promise<{ amount: number; affiliate_user_id: string } | null> {
  const { data: txn } = await db
    .from("affiliate_transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();

  if (!txn) return null;
  const transaction = txn as {
    id: string;
    user_id: string;
    affiliate_user_id: string | null;
    transaction_type: ServerTransactionType;
    amount: number;
    external_reference: string | null;
    affiliate_eligible: boolean;
    status: string;
  };

  if (!transaction.affiliate_eligible || !transaction.affiliate_user_id) return null;
  if (transaction.status !== "completed") return null;

  // Idempotency — one commission per transaction
  const { data: existing } = await db
    .from("affiliate_commissions")
    .select("amount, affiliate_user_id")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (existing) return existing as { amount: number; affiliate_user_id: string };

  const rate = COMMISSION_RATE; // 0.20
  const commissionAmount = Math.round(transaction.amount * rate * 100) / 100;

  const referral = await findReferral(db, transaction.user_id);

  const { data: commission, error: commError } = await db
    .from("affiliate_commissions")
    .insert({
      affiliate_user_id: transaction.affiliate_user_id,
      transaction_id: transactionId,
      referral_id: referral?.id ?? null,
      commission_type: transaction.transaction_type,
      amount: commissionAmount,
      rate,
      status: "available",
    })
    .select("id")
    .single();

  if (commError) {
    if (commError.code === "23505") {
      // Race — another worker won; treat as success
      const { data: race } = await db
        .from("affiliate_commissions")
        .select("amount, affiliate_user_id")
        .eq("transaction_id", transactionId)
        .maybeSingle();
      return (race as { amount: number; affiliate_user_id: string } | null) ?? null;
    }
    console.error("[affiliate-engine-server] commission insert error:", commError.message);
    return null;
  }
  const commissionId = (commission as { id: string }).id;

  // Payout-system earning (referral_earnings powers /referral + payouts)
  const { data: earning } = await db
    .from("referral_earnings")
    .insert({
      user_id: transaction.affiliate_user_id,
      referral_id: referral?.id ?? null,
      amount: commissionAmount,
      status: "available",
      affiliate_commission_id: commissionId,
      transaction_type: transaction.transaction_type,
    })
    .select("id")
    .single();

  if (earning) {
    await db
      .from("affiliate_commissions")
      .update({ earning_id: (earning as { id: string }).id })
      .eq("id", commissionId);
  }

  // Referral bookkeeping
  if (referral) {
    if (transaction.transaction_type === "subscription_initial") {
      // Legacy semantics: first subscription completes the referral
      await db
        .from("referrals")
        .update({
          status: "completed",
          commission_amount: commissionAmount,
          completed_at: new Date().toISOString(),
          subscription_request_id: transaction.external_reference,
        })
        .eq("id", referral.id);
    } else if (transaction.transaction_type === "coach_client_activation") {
      // Accumulate + complete on first activation
      const update: {
        status: "completed";
        commission_amount: number;
        completed_at?: string;
      } = {
        status: "completed",
        commission_amount:
          Math.round((Number(referral.commission_amount) + commissionAmount) * 100) / 100,
      };
      if (referral.status === "pending") {
        update.completed_at = new Date().toISOString();
      }
      await db.from("referrals").update(update).eq("id", referral.id);
    }
  }

  // Notify the affiliate (member bell; coaches also get a staff bell row)
  try {
    const label =
      transaction.transaction_type === "subscription_initial" ? "اشتراك جديد" :
      transaction.transaction_type === "subscription_renewal" ? "تجديد اشتراك" :
      transaction.transaction_type === "coach_client_activation" ? "تفعيل عميل لمدرب دعوته" :
      transaction.transaction_type === "one_time_product" ? "شراء منتج" :
      "خدمة";
    const link =
      transaction.transaction_type === "coach_client_activation" ? "/coach/affiliate" : "/referral";

    await db.from("notifications").insert({
      user_id: transaction.affiliate_user_id,
      type: "referral_commission",
      title: "عمولة جديدة! 🎉",
      body: `ربحت $${commissionAmount} عمولة من ${label}.`,
      link,
      read: false,
    });

    const { data: affProfile } = await db
      .from("profiles")
      .select("role")
      .eq("id", transaction.affiliate_user_id)
      .maybeSingle();
    if (affProfile && (affProfile as { role: string }).role !== "client") {
      await db.from("admin_notifications").insert({
        type: "referral_commission",
        title: "عمولة جديدة! 🎉",
        body: `ربحت $${commissionAmount} عمولة من ${label}.`,
        link,
        target_role: "coach",
        target_coach_id: transaction.affiliate_user_id,
        read: false,
      });
    }
  } catch (e) {
    console.error("[affiliate-engine-server] notification error (non-blocking):", e);
  }

  console.log(
    `[affiliate-engine-server] commission $${commissionAmount} (${transaction.transaction_type}) → affiliate ${transaction.affiliate_user_id}`,
  );
  return { amount: commissionAmount, affiliate_user_id: transaction.affiliate_user_id };
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Subscription-initial payment (client buys premium/pro/coaching).
 *
 * OWNER DECREE (2026-08-30) — «عميل المدرب لا يُحسب فى نظام الأفيليت»:
 * a payer with a coach_assignments row is a coach's CLIENT → his payment
 * never generates commission for anyone. (Phase 66 refinement: the COACH
 * himself is now attributed via coach_client_activation — different type,
 * different hook, this gate doesn't touch it.)
 *
 * Shared by BOTH payment paths (PayPal capture + manual receipt approval)
 * so they can never diverge again.
 */
export async function processSubscriptionInitialPaymentServer(
  userId: string,
  paymentAmount: number,
  externalReference: string,
  productId: string,
): Promise<{ amount: number; affiliate_user_id: string } | null> {
  const db = ready();
  if (!db || paymentAmount <= 0) return null;

  // Gate — service-role read, no RLS ambiguity
  const { data: coachRow } = await db
    .from("coach_assignments")
    .select("coach_id")
    .eq("client_id", userId)
    .maybeSingle();
  if (coachRow) {
    console.log(
      "[affiliate-engine-server] commission SKIPPED — payer is a coach's client (owner decree 2026-08-30):",
      userId,
    );
    return null;
  }

  const txn = await createTransaction(
    db,
    userId,
    "subscription_initial",
    paymentAmount,
    externalReference,
    productId,
  );
  if (!txn) return null;
  return processCommission(db, txn.id);
}

/**
 * OWNER DECREE (2026-09-01) — «لو مدرب جديد اشترك عن طريق رابط افيليت
 * ودفع للموقع اشتراك عن عملاءه يتم احتساب عمولة للداعى».
 *
 * Called AFTER a successful wallet debit in
 * /api/coach/subscriptions/activate — the site's real revenue moment from
 * a coach. The inviter of a referred coach earns 20% of the site fee on
 * EVERY activation (recurring, first-click-permanent attribution).
 *
 * Idempotent: external_reference = the coach_payments row id (one
 * commission per activation, retries safe).
 *
 * @param coachId        the paying coach
 * @param siteFeeUsd     what the coach paid the SITE ($6 / $16 / linear)
 * @param coachPaymentId the activation payment id (idempotency key)
 * @param meta           audit info stored in metadata
 */
export async function processCoachClientActivationServer(
  coachId: string,
  siteFeeUsd: number,
  coachPaymentId: string,
  meta: { clientId: string; tier: string; months: number },
): Promise<{ amount: number; affiliate_user_id: string } | null> {
  const db = ready();
  if (!db || siteFeeUsd <= 0) return null;

  const txn = await createTransaction(
    db,
    coachId,
    "coach_client_activation",
    siteFeeUsd,
    coachPaymentId,
    "coach_client_activation",
  );
  if (!txn) {
    console.log(
      "[affiliate-engine-server] coach activation — no referred affiliate (coach joined organically):",
      coachId,
    );
    return null;
  }
  await db
    .from("affiliate_transactions")
    .update({ metadata: { ...meta, kind: "coach_client_activation" } })
    .eq("id", txn.id);
  return processCommission(db, txn.id);
}

/**
 * Reverse one transaction's commission (refund / cancellation).
 * Preserves the audit trail; clawbacks as a negative earning when the
 * original was already paid out.
 */
export async function reverseCommissionServer(
  transactionId: string,
  reason: string,
): Promise<boolean> {
  const db = ready();
  if (!db) return false;

  const { error: txnError } = await db
    .from("affiliate_transactions")
    .update({ status: "refunded" })
    .eq("id", transactionId);
  if (txnError) {
    console.error("[affiliate-engine-server] reverse txn error:", txnError.message);
    return false;
  }

  const { data: commission } = await db
    .from("affiliate_commissions")
    .select("*")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (!commission) return true; // nothing to reverse — still a success

  const row = commission as {
    id: string;
    affiliate_user_id: string;
    referral_id: string | null;
    amount: number;
    commission_type: ServerTransactionType;
    earning_id: string | null;
  };

  await db
    .from("affiliate_commissions")
    .update({
      status: "reversed",
      reversed_at: new Date().toISOString(),
      reversal_reason: reason,
    })
    .eq("id", row.id);

  if (row.earning_id) {
    const { data: earning } = await db
      .from("referral_earnings")
      .select("status")
      .eq("id", row.earning_id)
      .maybeSingle();
    const earningStatus = (earning as { status: string } | null)?.status;
    if (earningStatus === "paid") {
      // Clawback: negative available earning, deducted from future payouts
      await db.from("referral_earnings").insert({
        user_id: row.affiliate_user_id,
        referral_id: row.referral_id,
        amount: -row.amount,
        status: "available",
        affiliate_commission_id: row.id,
        transaction_type: row.commission_type,
      });
    } else if (earningStatus === "available") {
      await db
        .from("referral_earnings")
        .update({ status: "pending" })
        .eq("id", row.earning_id);
    }
    // 'requested'/'pending' → admin decides manually (payout console)
  }

  // Phase 75 — notify the affiliate that a commission was reversed
  // (owner request: «5 إشعارات الأفيليت» — reversal was the missing bell).
  // Non-blocking: a failed bell never fails the reversal itself.
  try {
    await db.from("notifications").insert({
      user_id: row.affiliate_user_id,
      type: "referral_commission_reversed",
      title: "عمولة تم عكسها ⚠️",
      body: `تم عكس عمولة بمبلغ $${Number(row.amount).toFixed(2)} (استرجاع/إلغاء الدفع). السبب: ${reason}. لو عندك استفسار تواصل مع الدعم.`,
      link: "/referral",
      read: false,
    });

    const { data: affProfile } = await db
      .from("profiles")
      .select("role")
      .eq("id", row.affiliate_user_id)
      .maybeSingle();
    if (affProfile && (affProfile as { role: string }).role !== "client") {
      await db.from("admin_notifications").insert({
        type: "referral_commission_reversed",
        title: "عمولة تم عكسها ⚠️",
        body: `تم عكس عمولة بمبلغ $${Number(row.amount).toFixed(2)}. السبب: ${reason}.`,
        link: "/coach/affiliate",
        target_role: "coach",
        target_coach_id: row.affiliate_user_id,
        read: false,
      });
    }
  } catch (e) {
    console.error("[affiliate-engine-server] reversal notification error (non-blocking):", e);
  }

  console.log(`[affiliate-engine-server] reversed commission for txn ${transactionId}: ${reason}`);
  return true;
}

/**
 * Reverse every commission tied to an external payment reference
 * (used by the PayPal refund webhook — external_reference = PayPal order id).
 */
export async function reverseCommissionByReferenceServer(
  externalReference: string,
  reason: string,
): Promise<number> {
  const db = ready();
  if (!db || !externalReference) return 0;

  const { data: txns } = await db
    .from("affiliate_transactions")
    .select("id")
    .eq("external_reference", externalReference)
    .neq("status", "refunded");

  let n = 0;
  for (const t of (txns ?? []) as { id: string }[]) {
    if (await reverseCommissionServer(t.id, reason)) n++;
  }
  return n;
}
