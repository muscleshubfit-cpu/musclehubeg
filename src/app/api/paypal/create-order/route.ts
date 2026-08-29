/**
 * POST /api/paypal/create-order
 *
 * Creates a PayPal Order via the Orders API v2 (server-to-server).
 *
 * Security:
 *   - User must be authenticated (verified via requireUser)
 *   - Plan tier + duration are validated server-side
 *   - Price is resolved SERVER-SIDE from `src/lib/plans.ts` / `src/lib/memberships.ts`
 *     — the client NEVER sends the price
 *   - PayPal Order is created with `intent: "CAPTURE"` (ready for immediate
 *     capture in the next phase)
 *
 * Request body:
 *   { planTier: string, durationMonths: number }
 *   — OR, for coach wallet top-ups (0035 phase 2):
 *   { purpose: "wallet_topup", amountEgp: number }
 *
 * Response (200):
 *   { orderId: string, status: string, approveUrl: string | null }
 *
 * Response (400): invalid plan/duration or top-up amount
 * Response (401): not authenticated
 * Response (403): top-up requested by a non-staff user
 * Response (500): PayPal API error or misconfiguration
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import {
  createPayPalOrder,
  isPaypalConfigured,
  resolvePlanPrice,
} from "@/lib/paypal";
import {
  PAYPAL_TOPUP_MIN_USD,
} from "@/lib/coach-limits";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // 1. Auth check — must be a logged-in user
  const userOrResponse = await requireUser(request);
  if (userOrResponse instanceof Response) return userOrResponse;
  const user = userOrResponse;

  // 2. Validate PayPal is configured
  if (!isPaypalConfigured) {
    console.error("[paypal/create-order] PayPal env vars not configured");
    return NextResponse.json(
      { error: "Payment system is not configured. Please contact support." },
      { status: 500 },
    );
  }

  // 3. Parse + validate request body
  let body: {
    planTier?: string;
    durationMonths?: number;
    purpose?: string;
    amountUsd?: number;
    /** LEGACY (pre-0038 wallets): EGP amount — converted at ÷50. */
    amountEgp?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const purpose = body.purpose === "wallet_topup" ? "wallet_topup" : "subscription";

  // ── WALLET TOP-UP ORDER (0035 phase 2) ──────────────────────────────
  // No fixed prices by owner decree — the coach types his own amount.
  // GLOBAL USD (owner decree 2026-08-30): the wallet ledger is USD, so
  // the coach types a USD amount and PayPal charges exactly it (1:1).
  // A legacy amountEgp payload (pre-0038 client) is accepted and
  // converted at the owner's fixed rate 50 EGP = $1. Staff-only.
  if (purpose === "wallet_topup") {
    if (user.role !== "coach" && user.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "شحن المحفظة متاح للمدربين فقط" },
        { status: 403 },
      );
    }

    const legacyEgp = body.amountUsd === undefined && body.amountEgp !== undefined;
    const usd = Number(body.amountUsd ?? body.amountEgp) / (legacyEgp ? 50 : 1);
    if (!Number.isFinite(usd) || usd <= 0 || usd > 1_000_000) {
      return NextResponse.json(
        { error: "bad_amount", message: "اكتب مبلغ شحن صحيح" },
        { status: 400 },
      );
    }

    const chargeUsd = Math.round(usd * 100) / 100;
    if (chargeUsd < PAYPAL_TOPUP_MIN_USD) {
      return NextResponse.json(
        {
          error: "amount_too_small",
          message: `المبلغ صغير أوي على PayPal — أدنى شحن ${PAYPAL_TOPUP_MIN_USD}$`,
        },
        { status: 400 },
      );
    }

    try {
      const order = await createPayPalOrder(
        { currency: "USD", value: chargeUsd.toFixed(2) },
        {
          userId: user.id,
          purpose: "wallet_topup",
          usdAmount: chargeUsd,
        },
      );
      const approveLink = order.links.find((l) => l.rel === "approve");
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        approveUrl: approveLink?.href || null,
        chargeUsd,
      });
    } catch (e: any) {
      console.error("[paypal/create-order] Top-up order error:", e?.message);
      return NextResponse.json(
        { error: "Failed to create PayPal order. Please try again." },
        { status: 500 },
      );
    }
  }

  // ── SUBSCRIPTION ORDER (unchanged path) ────────────────────────────
  const { planTier, durationMonths } = body;

  if (!planTier || typeof planTier !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid planTier" },
      { status: 400 },
    );
  }

  if (
    !durationMonths ||
    typeof durationMonths !== "number" ||
    (durationMonths !== 1 && durationMonths !== 12)
  ) {
    return NextResponse.json(
      { error: "Invalid durationMonths — must be 1 or 12" },
      { status: 400 },
    );
  }

  // 4. Resolve price SERVER-SIDE (never trust client price)
  const price = resolvePlanPrice(planTier, durationMonths);
  if (price === null || price <= 0) {
    console.error(
      `[paypal/create-order] Invalid plan/price: tier=${planTier} months=${durationMonths}`,
    );
    return NextResponse.json(
      { error: "Invalid plan or duration. Please select a valid plan." },
      { status: 400 },
    );
  }

  // 5. Create PayPal Order
  try {
    const order = await createPayPalOrder(
      {
        currency: "USD",
        // PayPal requires the amount as a string with 2 decimal places
        value: price.toFixed(2),
      },
      {
        userId: user.id,
        planTier,
        durationMonths,
      },
    );

    // Extract the approve URL from the links array (the client uses this
    // to redirect the user to PayPal for approval — or, if the PayPal JS
    // SDK is used, the SDK handles the approval flow automatically)
    const approveLink = order.links.find((l) => l.rel === "approve");
    const approveUrl = approveLink?.href || null;

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      approveUrl,
    });
  } catch (e: any) {
    console.error("[paypal/create-order] Create Order error:", e?.message);
    return NextResponse.json(
      { error: "Failed to create PayPal order. Please try again." },
      { status: 500 },
    );
  }
}
