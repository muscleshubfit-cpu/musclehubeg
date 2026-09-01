import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  REFUND_WINDOW_DAYS,
  checkRefundEligibility,
  eligibilityMessageAr,
  countFeatureUsageSince,
  activationDate,
} from "@/lib/refund";

/**
 * POST /api/refund/request — 7-day money-back request (Phase 76, owner
 * request «فى نقطة الغاء الاشتراكات واسترجاع الفلوس خلال ٧ ايام يكون فى
 * شرط عدم استخدام المميزات»).
 *
 * The memberships page PROMISES a 7-day refund conditioned on zero paid
 * feature usage — until now there was no backing flow. This route:
 *   1. Finds the caller's ACTIVE subscription (same filter as cancel).
 *   2. Enforces the window: ≤ 7 days since activation (start_date).
 *   3. Enforces the CONDITION server-side from the tamper-proof usage
 *      ledgers (EVO chats, plan generations, swaps, coach AI plans,
 *      saved tool results) — the client can't fake zero usage.
 *   4. Records refund_requests (service role) + rings the admin bell.
 *
 * GET returns the member's latest request + a live eligibility verdict
 * so the profile card can explain exactly why a refund is (not) possible.
 *
 * Idempotent: a pending request returns ok:true with alreadyRequested.
 */

type RefundRequestRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  tier: string;
  amount_usd: number | null;
  admin_note: string | null;
  created_at: string;
};

async function latestRequestFor(userId: string): Promise<RefundRequestRow | null> {
  const { data } = await supabaseAdmin!
    .from("refund_requests")
    .select("id, status, tier, amount_usd, admin_note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RefundRequestRow | null) ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const [eligibility, latest] = await Promise.all([
    checkRefundEligibility(auth.id),
    latestRequestFor(auth.id),
  ]);

  return NextResponse.json({
    eligibility: {
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      daysLeft: eligibility.daysLeft,
      usage: eligibility.usage,
      message: eligibility.eligible
        ? null
        : eligibilityMessageAr(eligibility.reason),
      windowDays: REFUND_WINDOW_DAYS,
    },
    latest,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const db = supabaseAdmin;

  // Idempotency — an existing PENDING request wins
  const existing = await latestRequestFor(auth.id);
  if (existing?.status === "pending") {
    return NextResponse.json({
      ok: true,
      alreadyRequested: true,
      request: existing,
      message: "طلب الاسترداد مسجل بالفعل وقيد المراجعة",
    });
  }

  // 1. Eligibility (window + features-used condition) — SERVER-SIDE
  const eligibility = await checkRefundEligibility(auth.id);
  if (!eligibility.eligible || !eligibility.subscription) {
    return NextResponse.json(
      {
        error: "not_eligible",
        reason: eligibility.reason,
        message: eligibilityMessageAr(eligibility.reason),
        usage: eligibility.usage,
      },
      { status: 403 },
    );
  }

  // Re-read usage right before insert (cheap; snapshot for the admin UI —
  // the numbers the admin sees are the numbers the decision was made on)
  const sinceIso = activationDate(eligibility.subscription);
  const usage = await countFeatureUsageSince(auth.id, sinceIso);

  // 2. Insert the request (service role — 0062 has no write policies)
  const { data: inserted, error } = await db
    .from("refund_requests")
    .insert({
      user_id: auth.id,
      subscription_id: eligibility.subscription.id,
      tier: eligibility.subscription.tier,
      months: eligibility.subscription.months,
      amount_usd: eligibility.payment?.amountUsd ?? null,
      payment_reference: eligibility.payment?.reference ?? null,
      payment_source: eligibility.payment?.source ?? null,
      status: "pending",
      usage_snapshot: usage,
    })
    .select("id, status, tier, amount_usd, created_at")
    .single();

  if (error || !inserted) {
    console.error("[api/refund/request] insert error:", error?.message);
    return NextResponse.json(
      { error: "insert_failed", message: "حصلت مشكلة — جرب تاني" },
      { status: 500 },
    );
  }

  // 3. Ring the admin bell (best-effort, deduped per member per day)
  try {
    const { data: adm } = await db
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (adm) {
      await db.from("admin_notifications").insert({
        type: `refund_request:${auth.id}:${new Date().toISOString().slice(0, 10)}`,
        title: "طلب استرداد جديد (7 أيام) 💸",
        body: `${auth.email ?? auth.id} طلب استرداد اشتراك ${inserted.tier} ($${inserted.amount_usd ?? "?"}) — التحقق التلقائي: لم يستخدم أي مميزات مدفوعة. راجع /admin/payments.`,
        link: "/admin/payments",
        target_role: "coach",
        target_coach_id: (adm as { id: string }).id,
        read: false,
      });
    }
  } catch (e) {
    console.error("[api/refund/request] admin bell error (non-blocking):", e);
  }

  return NextResponse.json({
    ok: true,
    alreadyRequested: false,
    request: inserted,
    message: "تم إرسال طلب الاسترداد — سيتم مراجعته وإبلاغك بالنتيجة",
  });
}
