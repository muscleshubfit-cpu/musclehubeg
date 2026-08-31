import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { processSubscriptionInitialPaymentServer } from "@/lib/affiliate-engine-server";

/**
 * POST /api/affiliate/commission — Phase 66 (owner-approved).
 *
 * Runs the affiliate commission for a MANUAL receipt approval from the
 * SERVER instead of the admin's browser. The Phase 64 study proved the
 * old browser-side engine call failed silently twice: the referrals
 * INSERT policy blocked the tracking row, and affiliate_transactions /
 * affiliate_commissions never existed in production. With 0057 live the
 * tables exist — this route makes the manual path actually work.
 *
 * Body: { userId, amount, reference, productId }
 *   - userId     the paying client (subscription_requests.user_id)
 *   - amount     price actually paid (USD)
 *   - reference  subscription_requests.id → idempotency key
 *   - productId  plan tier bought
 *
 * The coach-clients gate (owner decree 2026-08-30) runs INSIDE the server
 * engine — shared verbatim with the PayPal capture path.
 *
 * Non-blocking by contract: the caller (reviewSubscriptionRequest) treats
 * failures as log-only so payment approval is never blocked.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const userId = String(body.userId ?? "").trim();
  const amount = Number(body.amount);
  const reference = String(body.reference ?? "").trim();
  const productId = String(body.productId ?? "").trim();

  if (!userId || !reference || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const commission = await processSubscriptionInitialPaymentServer(
      userId,
      amount,
      reference,
      productId || "unknown",
    );
    return NextResponse.json({
      ok: true,
      // null = skipped (coach's client / no referral) — not an error
      commission: commission ? { amount: commission.amount } : null,
    });
  } catch (e) {
    console.error("[api/affiliate/commission] error:", e);
    // 200 with error flag — the approval already happened; commission is
    // best-effort and MUST NOT make the admin's browser show a failure.
    return NextResponse.json({ ok: false, error: "engine_error" }, { status: 200 });
  }
}
