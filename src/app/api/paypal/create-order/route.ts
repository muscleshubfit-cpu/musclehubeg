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
 *
 * Response (200):
 *   { orderId: string, status: string, approveUrl: string | null }
 *
 * Response (400): invalid plan/duration
 * Response (401): not authenticated
 * Response (500): PayPal API error or misconfiguration
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { createPayPalOrder, isPaypalConfigured, resolvePlanPrice } from "@/lib/paypal";

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
  let body: { planTier?: string; durationMonths?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

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
