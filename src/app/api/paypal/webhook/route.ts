/**
 * POST /api/paypal/webhook
 *
 * Receives PayPal webhook events and verifies their signature.
 *
 * PURPOSE:
 *   - Log payment events for audit trail (PAYMENT.CAPTURE.COMPLETED,
 *     PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED, etc.)
 *   - Does NOT activate subscriptions or commissions — the capture-order
 *     endpoint is the authoritative source for activation. This prevents
 *     double-activation if both the webhook and the capture endpoint
 *     fire for the same order.
 *
 * SECURITY:
 *   - Verifies PayPal webhook signature using PayPal's
 *     /v1/notifications/verify-webhook-signature API
 *   - Requires PAYPAL_WEBHOOK_ID, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
 *   - Rejects unsigned/invalid webhooks with 401
 *   - No user auth required (PayPal sends the webhook, not a user)
 *
 * EVENTS HANDLED:
 *   - PAYMENT.CAPTURE.COMPLETED  → log success (credit handled by capture-order)
 *   - PAYMENT.CAPTURE.DENIED      → log denial
 *   - PAYMENT.CAPTURE.REFUNDED    → REVERSE affiliate commissions (Phase 66)
 *   - CHECKOUT.ORDER.APPROVED     → log approval
 *   - *                           → log unknown events
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, isPaypalConfigured } from "@/lib/paypal";
import { reverseCommissionByReferenceServer } from "@/lib/affiliate-engine-server";

export const runtime = "nodejs";

// PayPal base URL (duplicated from paypal.ts to avoid importing the whole
// module which also imports memberships/plans for price resolution)
const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";

/**
 * Verify a PayPal webhook signature by calling PayPal's
 * /v1/notifications/verify-webhook-signature endpoint.
 *
 * @param headers - The incoming request headers
 * @param body - The raw webhook body as a string
 * @returns true if the signature is valid, false otherwise
 */
async function verifyWebhookSignature(
  headers: Headers,
  body: string,
): Promise<boolean> {
  if (!isPaypalConfigured || !PAYPAL_WEBHOOK_ID) {
    console.error("[paypal/webhook] PayPal env vars not configured for webhook verification");
    return false;
  }

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    console.error("[paypal/webhook] Missing PayPal transmission headers");
    return false;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyUrl = `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`;

    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[paypal/webhook] Verify API error:", res.status, errText);
      return false;
    }

    const data = await res.json();
    const verificationStatus = data.verification_status;

    if (verificationStatus === "SUCCESS") {
      return true;
    }

    console.error("[paypal/webhook] Signature verification failed:", verificationStatus);
    return false;
  } catch (e: any) {
    console.error("[paypal/webhook] Verification error:", e?.message);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // 1. Read the raw body (needed for signature verification)
  const body = await request.text();

  // 2. Verify the webhook signature
  const isValid = await verifyWebhookSignature(request.headers, body);

  if (!isValid) {
    console.error("[paypal/webhook] Rejecting webhook — invalid signature");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  // 3. Parse the event
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    console.error("[paypal/webhook] Failed to parse webhook body");
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const eventType = event.event_type || "UNKNOWN";
  const resourceId = event?.resource?.id || "—";
  const resourceType = event?.resource_type || "—";

  // 4. Log the event (audit trail — no action taken)
  // Subscription activation is handled by the capture-order endpoint,
  // NOT by this webhook. This prevents double-activation.
  console.log(
    `[paypal/webhook] Received: type=${eventType} resource=${resourceType}:${resourceId}`,
  );

  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED": {
      // 0035 phase 2 — wallet top-up captures are visible here for
      // support/reconciliation ONLY. The wallet credit happens in
      // /api/paypal/capture-order (authoritative, idempotent via the
      // deterministic ledger ref). This webhook NEVER credits — crediting
      // from two paths would risk double-credit races.
      const customId: string = event?.resource?.custom_id || "";
      let topupContext: { purpose?: string; usd_amount?: number; egp_amount?: number; user_id?: string } | null = null;
      try {
        topupContext = customId.startsWith("{") ? JSON.parse(customId) : null;
      } catch {
        topupContext = null;
      }
      if (topupContext?.purpose === "wallet_topup") {
        const relatedOrderId =
          event?.resource?.supplementary_data?.related_ids?.order_id || resourceId;
        console.log(
          `[paypal/webhook] Wallet top-up capture: order=${relatedOrderId} ` +
          `usd=${topupContext.usd_amount ?? (topupContext.egp_amount !== undefined ? topupContext.egp_amount / 50 : "?")} user=${topupContext.user_id}. ` +
          "Credit is handled (idempotently) by /api/paypal/capture-order — no action here.",
        );
      } else {
        console.log(
          `[paypal/webhook] Capture completed: ${resourceId}. ` +
          "Subscription activation is handled by /api/paypal/capture-order.",
        );
      }
      break;
    }

    case "PAYMENT.CAPTURE.DENIED":
      console.log(
        `[paypal/webhook] Capture denied: ${resourceId}. ` +
        "No action needed — the capture-order endpoint would have already returned an error.",
      );
      break;

    case "PAYMENT.CAPTURE.REFUNDED": {
      // PHASE 66 (owner-approved): commissions are now REVERSED on refunds.
      // The capture-order path stores external_reference = PayPal ORDER id;
      // refund events carry the capture id, so resolve the order id from
      // supplementary_data (fallback: the resource id itself). Reversal is
      // audit-preserving (status flips, clawback earning when already paid)
      // and idempotent (already-refunded transactions are skipped).
      const relatedOrderId =
        event?.resource?.supplementary_data?.related_ids?.order_id || resourceId;
      try {
        const reversed = await reverseCommissionByReferenceServer(
          relatedOrderId,
          `PayPal refund (capture ${resourceId})`,
        );
        console.log(
          `[paypal/webhook] Refund ${resourceId} → order ${relatedOrderId}: ${reversed} commission(s) reversed.`,
        );
      } catch (e) {
        console.error("[paypal/webhook] Commission reversal error (non-blocking):", e);
      }
      break;
    }

    case "CHECKOUT.ORDER.APPROVED":
      console.log(
        `[paypal/webhook] Order approved: ${resourceId}. ` +
        "Capture is handled by the client via /api/paypal/capture-order.",
      );
      break;

    default:
      console.log(`[paypal/webhook] Unhandled event type: ${eventType}`);
  }

  // 5. Return 200 OK — PayPal expects a 2xx response
  return NextResponse.json({ received: true, type: eventType });
}
