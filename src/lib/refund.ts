/**
 * REFUND ELIGIBILITY — 7-day money-back with a no-features-used condition
 * =======================================================================
 *
 * Owner request (2026-09-01):
 *   «فى نقطة الغاء الاشتراكات واسترجاع الفلوس خلال ٧ ايام يكون فى شرط
 *    عدم استخدام المميزات»
 *
 * This is the SERVER-SIDE enforcement of the promise already published
 * on /memberships: «استرداد كامل خلال 7 أيام من تفعيل الاشتراك، بشرط
 * عدم استخدام أي ميزة مدفوعة (توليد خطط تغذية/تمارين، تبديلات EVO، حفظ
 * نتائج أدوات، تحميل PDF)».
 *
 * What counts as "used a paid feature" — read from the tamper-proof
 * ledgers the SERVER wrote (users can't delete/forge these):
 *   1. evo_chat_usage  → EVO chats + self-generated nutrition/workout
 *                        plans (sources chat / plan_nutrition /
 *                        plan_workout — migration 0022).
 *   2. plan_swaps      → meal/exercise swaps.
 *   3. ai_jobs (done)  → plans a coach/admin generated for this client
 *                        (owner decree 2026-09-01: they burn the SAME
 *                        monthly balance, so they are feature usage too).
 *   4. saved_results   → saved tool results (memberships page lists
 *                        «حفظ نتائج أدوات» explicitly).
 *
 * PDF export is purely client-side (canvas) and has no server ledger —
 * it is the only advertised feature we can't audit; the four ledgers
 * above cover every feature that costs the platform real compute.
 *
 * The window anchor is the subscription's start_date (activation), the
 * same anchor the memberships copy uses («من تفعيل الاشتراك»).
 *
 * Server-only module: imports the service-role admin client.
 */

import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/** Refund window (the advertised «خلال 7 أيام من التفعيل»). */
export const REFUND_WINDOW_DAYS = 7;

export type FeatureUsage = {
  evoChats: number;
  planGenerations: number;
  swaps: number;
  coachPlans: number;
  savedResults: number;
  total: number;
};

export type ActiveSubscriptionRow = {
  id: string;
  tier: string;
  months: number | null;
  start_date: string | null;
  created_at: string;
  end_date: string | null;
};

export type PaymentInfo = {
  amountUsd: number | null;
  reference: string | null;
  source: "paypal" | "manual" | null;
};

type Db = NonNullable<typeof supabaseAdmin>;

function db(): Db | null {
  return isSupabaseAdminConfigured && supabaseAdmin
    ? (supabaseAdmin as Db)
    : null;
}

/** Activation anchor — start_date (fall back to row creation). */
export function activationDate(sub: ActiveSubscriptionRow): string {
  return sub.start_date || sub.created_at;
}

/** Days (fractional) elapsed since activation; negative if in the future. */
export function daysSinceActivation(sub: ActiveSubscriptionRow): number {
  const t0 = new Date(activationDate(sub)).getTime();
  return (Date.now() - t0) / 86_400_000;
}

/**
 * Count every auditable paid-feature usage since activation.
 * All counts are best-effort: a failed ledger read returns 0 for that
 * counter and logs (a counting outage must not accuse a member of usage).
 */
export async function countFeatureUsageSince(
  userId: string,
  sinceIso: string,
): Promise<FeatureUsage> {
  const conn = db();
  const empty: FeatureUsage = {
    evoChats: 0,
    planGenerations: 0,
    swaps: 0,
    coachPlans: 0,
    savedResults: 0,
    total: 0,
  };
  if (!conn) return empty;

  const result: FeatureUsage = { ...empty };

  // 1. EVO chats vs plan generations (same tamper-proof ledger, different sources)
  const { data: chatRows, error: chatErr } = await conn
    .from("evo_chat_usage")
    .select("source")
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (chatErr) {
    console.error("[refund] evo_chat_usage count error:", chatErr.message);
  } else {
    for (const r of ((chatRows ?? []) as unknown as { source: string }[])) {
      if (r.source === "plan_nutrition" || r.source === "plan_workout") {
        result.planGenerations += 1;
      } else {
        result.evoChats += 1;
      }
    }
  }

  // 2. Swaps (meal/exercise)
  const { count: swapCount, error: swapErr } = await conn
    .from("plan_swaps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (swapErr) {
    console.error("[refund] plan_swaps count error:", swapErr.message);
  } else {
    result.swaps = swapCount ?? 0;
  }

  // 3. Coach/admin AI plans generated for this client (done only —
  //    same convention as quota: failed generations never count)
  const { count: coachPlans, error: jobsErr } = await conn
    .from("ai_jobs")
    .select("*", { count: "exact", head: true })
    .eq("job_type", "plan_nutrition")
    .eq("status", "done")
    .eq("payload->>clientId", userId)
    .gte("created_at", sinceIso);
  if (jobsErr) {
    // plan_nutrition bucket failed — retry the union via two counts
    const { count: workoutPlans, error: wErr } = await conn
      .from("ai_jobs")
      .select("*", { count: "exact", head: true })
      .eq("job_type", "plan_workout")
      .eq("status", "done")
      .eq("payload->>clientId", userId)
      .gte("created_at", sinceIso);
    if (wErr) {
      console.error("[refund] ai_jobs count error:", jobsErr.message, wErr.message);
    } else {
      result.coachPlans = workoutPlans ?? 0;
    }
  } else {
    const { count: coachWorkout, error: wErr2 } = await conn
      .from("ai_jobs")
      .select("*", { count: "exact", head: true })
      .eq("job_type", "plan_workout")
      .eq("status", "done")
      .eq("payload->>clientId", userId)
      .gte("created_at", sinceIso);
    result.coachPlans = (coachPlans ?? 0) + (wErr2 ? 0 : coachWorkout ?? 0);
  }

  // 4. Saved tool results
  const { count: savedCount, error: savedErr } = await conn
    .from("saved_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if (savedErr) {
    console.error("[refund] saved_results count error:", savedErr.message);
  } else {
    result.savedResults = savedCount ?? 0;
  }

  result.total =
    result.evoChats +
    result.planGenerations +
    result.swaps +
    result.coachPlans +
    result.savedResults;
  return result;
}

/** The caller's ACTIVE paid subscription (mirrors the cancel route filter). */
export async function findActivePaidSubscription(
  userId: string,
): Promise<ActiveSubscriptionRow | null> {
  const conn = db();
  if (!conn) return null;
  const nowIso = new Date().toISOString();
  const { data } = await conn
    .from("subscriptions")
    .select("id, tier, months, start_date, created_at, end_date")
    .eq("client_id", userId)
    .eq("status", "active")
    .gt("end_date", nowIso)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ActiveSubscriptionRow | null) ?? null;
}

/**
 * Resolve WHAT the member paid + the payment reference used by the
 * affiliate engine (so an approval can reverse the exact commissions):
 *   1. affiliate_transactions.subscription_initial — written for BOTH
 *      PayPal captures (reference = PayPal order id) and manual receipt
 *      approvals (reference = subscription_requests.id).
 *   2. Fallback: the newest APPROVED subscription_requests row (manual
 *      InstaPay/Vodafone receipts) — coach-client payers have no
 *      transaction row (owner gate 2026-08-30), requests still exist.
 */
export async function resolvePaymentInfo(
  userId: string,
  sinceIso: string,
): Promise<PaymentInfo> {
  const conn = db();
  if (!conn) return { amountUsd: null, reference: null, source: null };

  const { data: txns } = await conn
    .from("affiliate_transactions")
    .select("amount, external_reference, transaction_type, created_at")
    .eq("user_id", userId)
    .eq("transaction_type", "subscription_initial")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1);

  const txn = (txns ?? [])[0] as
    | { amount: number; external_reference: string | null }
    | undefined;
  if (txn) {
    const ref = txn.external_reference;
    // Manual receipt approvals reference a subscription_requests uuid;
    // PayPal captures reference an order id (not a uuid).
    const isUuid =
      !!ref &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    return {
      amountUsd: Math.round(Number(txn.amount) * 100) / 100,
      reference: ref,
      source: isUuid ? "manual" : ref ? "paypal" : null,
    };
  }

  // Fallback — newest approved manual request near/after activation
  const { data: reqs } = await conn
    .from("subscription_requests")
    .select("id, price_usd, reviewed_at, created_at")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(5);
  const row = (reqs ?? []).find(
    (r) => !sinceIso || (r.reviewed_at ?? r.created_at) >= sinceIso,
  );
  if (row) {
    return {
      amountUsd: row.price_usd ? Math.round(Number(row.price_usd) * 100) / 100 : null,
      reference: row.id,
      source: "manual",
    };
  }

  return { amountUsd: null, reference: null, source: null };
}

export type Eligibility = {
  eligible: boolean;
  reason: "no_subscription" | "outside_window" | "features_used" | null;
  daysLeft: number;
  usage: FeatureUsage | null;
  subscription: ActiveSubscriptionRow | null;
  payment: PaymentInfo | null;
};

/**
 * Full eligibility verdict for the refund request flow.
 *   - no_subscription   → nothing active to refund
 *   - outside_window    → activation was more than 7 days ago
 *   - features_used     → the advertised condition: any paid feature used
 */
export async function checkRefundEligibility(
  userId: string,
): Promise<Eligibility> {
  const subscription = await findActivePaidSubscription(userId);
  if (!subscription) {
    return {
      eligible: false,
      reason: "no_subscription",
      daysLeft: 0,
      usage: null,
      subscription: null,
      payment: null,
    };
  }

  const sinceIso = activationDate(subscription);
  const days = daysSinceActivation(subscription);
  if (days > REFUND_WINDOW_DAYS) {
    return {
      eligible: false,
      reason: "outside_window",
      daysLeft: 0,
      usage: null,
      subscription,
      payment: null,
    };
  }

  const usage = await countFeatureUsageSince(userId, sinceIso);
  if (usage.total > 0) {
    return {
      eligible: false,
      reason: "features_used",
      daysLeft: Math.max(0, Math.ceil(REFUND_WINDOW_DAYS - days)),
      usage,
      subscription,
      payment: null,
    };
  }

  const payment = await resolvePaymentInfo(userId, sinceIso);
  return {
    eligible: true,
    reason: null,
    daysLeft: Math.max(0, Math.ceil(REFUND_WINDOW_DAYS - days)),
    usage,
    subscription,
    payment,
  };
}

/** Arabic explanation for an ineligibility verdict (API/UI share it). */
export function eligibilityMessageAr(reason: Eligibility["reason"]): string {
  switch (reason) {
    case "no_subscription":
      return "مفيش اشتراك نشط لطلب استرداد عليه";
    case "outside_window":
      return `مدة الاسترداد هي ${REFUND_WINDOW_DAYS} أيام من تفعيل الاشتراك — المدة انتهت`;
    case "features_used":
      return "عذرًا — لا يمكن الاسترداد لأنك استخدمت مميزات مدفوعة في الباقة (محادثات إيفو، توليد خطط، تبديلات، أو حفظ نتائج)";
    default:
      return "غير مؤهل لطلب الاسترداد";
  }
}
