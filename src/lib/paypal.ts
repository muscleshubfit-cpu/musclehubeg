/**
 * PayPal Server-side Integration — REST API helpers.
 *
 * This module handles:
 *   1. PayPal OAuth2 access token (server-to-server, cached)
 *   2. Create Order API call (PayPal Orders API v2)
 *
 * SECURITY:
 *   - PAYPAL_CLIENT_SECRET is SERVER-ONLY. This file must NEVER be imported
 *     from a client component. It uses `process.env` directly (no
 *     NEXT_PUBLIC_ prefix) — Next.js guarantees these are server-only.
 *   - The access token is cached in-memory per process. Vercel serverless
 *     functions may reuse the same instance for warm invocations — this is
 *     safe because the token is short-lived (~32400s ≈ 9h).
 *
 * ENVIRONMENT:
 *   - PAYPAL_CLIENT_ID     (server-only)
 *   - PAYPAL_CLIENT_SECRET (server-only)
 *   - PAYPAL_MODE          ('sandbox' | 'live')
 *
 * Sandbox base URL: https://api-m.sandbox.paypal.com
 * Live base URL:    https://api-m.paypal.com
 */

import { MEMBERSHIPS } from "@/lib/memberships";
import { getTier } from "@/lib/plans";

// ─────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export const isPaypalConfigured = Boolean(
  PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET,
);

// ─────────────────────────────────────────────────────────────────────────
// Access Token (OAuth2) — cached in-memory
// ─────────────────────────────────────────────────────────────────────────

type PayPalToken = {
  access_token: string;
  expires_at: number; // epoch ms
};

let cachedToken: PayPalToken | null = null;

/**
 * Get a PayPal OAuth2 access token.
 *
 * PayPal uses client_credentials flow — server-to-server.
 * The token is cached for its lifetime minus a 60s safety margin.
 *
 * @returns The access token string (never null — throws on failure)
 * @throws Error if PayPal env vars are not configured or the API call fails
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!isPaypalConfigured) {
    throw new Error(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment.",
    );
  }

  // Return cached token if still valid (with 60s safety margin)
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at - 60_000 > now) {
    return cachedToken.access_token;
  }

  // Fetch a new token
  const tokenUrl = `${PAYPAL_BASE_URL}/v1/oauth2/token`;
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[paypal] OAuth token error:", res.status, errText);
    throw new Error(`PayPal OAuth failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const expiresInSec: number = data.expires_in || 32400; // default 9h
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + expiresInSec * 1000,
  };

  return cachedToken.access_token;
}

// ─────────────────────────────────────────────────────────────────────────
// Create Order (PayPal Orders API v2)
// ─────────────────────────────────────────────────────────────────────────

export type PayPalOrderAmount = {
  /** Currency code — ISO 4217 (e.g. 'USD') */
  currency: string;
  /** Total amount as a string (PayPal requires string, e.g. '14.99') */
  value: string;
};

export type PayPalOrderContext = {
  /** The user's ID in our system (for custom_id + reference_id) */
  userId: string;
  /** The plan tier ID (e.g. 'premium', 'pro', 'coaching', 'starter', 'elite') */
  planTier: string;
  /** Duration in months (1 or 12) */
  durationMonths: number;
};

export type PayPalCreateOrderResult = {
  /** PayPal Order ID (e.g. 'ORDER_5ZJH...') — passed to the PayPal JS SDK */
  id: string;
  /** Order status ('CREATED' on success) */
  status: string;
  /** Order links (approve, capture, etc.) */
  links: Array<{ href: string; rel: string; method: string }>;
};

/**
 * Create a PayPal Order via the Orders API v2.
 *
 * Server-to-server call. The amount is taken from the SERVER (caller must
 * compute it from `src/lib/plans.ts` / `src/lib/memberships.ts` — NEVER
 * from the client request body).
 *
 * @param amount — currency + value (server-verified)
 * @param context — userId + planTier + durationMonths (for custom_id)
 * @returns PayPal Order ID + status + links
 * @throws Error if PayPal env vars are not configured or the API call fails
 */
export async function createPayPalOrder(
  amount: PayPalOrderAmount,
  context: PayPalOrderContext,
): Promise<PayPalCreateOrderResult> {
  if (!isPaypalConfigured) {
    throw new Error(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment.",
    );
  }

  const accessToken = await getPayPalAccessToken();
  const orderUrl = `${PAYPAL_BASE_URL}/v2/checkout/orders`;

  // Build the order payload per PayPal Orders API v2 spec
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: amount.currency,
          value: amount.value,
        },
        description: `MuscleHubEG ${context.planTier} subscription (${context.durationMonths} month${context.durationMonths === 1 ? "" : "s"})`,
        custom_id: JSON.stringify({
          user_id: context.userId,
          plan_tier: context.planTier,
          duration_months: context.durationMonths,
        }),
        // reference_id is a shorter identifier — used by PayPal for reconciliation
        reference_id: `mhe-${context.userId}-${context.planTier}-${context.durationMonths}m`,
      },
    ],
    // application_context controls the PayPal checkout experience
    application_context: {
      brand_name: "MuscleHubEG",
      landing_page: "NO_PREFERENCE", // PayPal chooses Login or Signup
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING", // digital subscription — no shipping
    },
  };

  const res = await fetch(orderUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `mhe-create-${context.userId}-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[paypal] Create Order error:", res.status, errText);
    throw new Error(`PayPal Create Order failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    status: data.status,
    links: data.links || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Price resolution — SERVER-SIDE ONLY (source of truth)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve the price for a given plan tier + duration.
 *
 * Source of truth:
 *   1. `src/lib/memberships.ts` — for 'premium', 'pro', 'coaching' (new system)
 *   2. `src/lib/plans.ts` — for 'starter', 'elite' (legacy system, kept for backward compat)
 *
 * This function MUST be called server-side. The client NEVER sends the price —
 * the client only sends the tier + duration, and the server resolves the price.
 *
 * @param planTier — 'premium' | 'pro' | 'coaching' | 'starter' | 'elite'
 * @param durationMonths — 1 (monthly) or 12 (yearly)
 * @returns The price in USD, or null if the tier/duration is invalid
 */
export function resolvePlanPrice(
  planTier: string,
  durationMonths: number,
): number | null {
  // Validate duration
  if (durationMonths !== 1 && durationMonths !== 12) {
    return null;
  }

  // New membership system (premium, pro, coaching)
  const membership = MEMBERSHIPS.find((m) => m.id === planTier);
  if (membership) {
    if (membership.id === "free") return 0; // free tier — no PayPal needed
    const isYearly = durationMonths === 12;
    const price = isYearly
      ? membership.priceYearly ?? 0
      : membership.priceMonthly ?? 0;
    return price > 0 ? price : null;
  }

  // Legacy system (starter, elite)
  const tier = getTier(planTier as any);
  if (tier) {
    const price = tier.prices[durationMonths as 1 | 12];
    return price ?? null;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Capture Order (PayPal Orders API v2)
// ─────────────────────────────────────────────────────────────────────────

export type PayPalCaptureResult = {
  /** PayPal Order ID */
  id: string;
  /** Order status after capture — must be 'COMPLETED' for activation */
  status: string;
  /** The captured amount (currency + value) from PayPal's response */
  amount: { currency: string; value: string } | null;
  /** The custom_id we set during Create Order — contains user_id, plan_tier, duration_months */
  customId: string | null;
};

/**
 * Capture a PayPal Order via the Orders API v2 (server-to-server).
 *
 * This is the AUTHORITATIVE payment confirmation. The client-side `onApprove`
 * callback only tells us the user clicked "Approve" — it does NOT mean the
 * payment is captured. We MUST call this server-side endpoint to verify the
 * capture actually happened and the funds are transferred.
 *
 * PayPal's Capture API is idempotent: if the order was already captured, it
 * returns the same response with status='COMPLETED' (HTTP 422 with an
 * 'ORDER_ALREADY_CAPTURED' error in some API versions — we handle both).
 *
 * @param orderId — PayPal Order ID (e.g. '51Y42774PJ007484C')
 * @returns Capture result with status + amount + customId
 * @throws Error if PayPal env vars are not configured or the API call fails
 */
export async function capturePayPalOrder(
  orderId: string,
): Promise<PayPalCaptureResult> {
  if (!isPaypalConfigured) {
    throw new Error(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment.",
    );
  }

  const accessToken = await getPayPalAccessToken();
  const captureUrl = `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`;

  const res = await fetch(captureUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      // PayPal-Request-Id for idempotency — if the same request is retried,
      // PayPal returns the same result without double-charging.
      "PayPal-Request-Id": `mhe-capture-${orderId}`,
    },
    body: JSON.stringify({}),
  });

  // Handle HTTP 422 — "ORDER_ALREADY_CAPTURED" (idempotency response)
  // PayPal returns this when the order was already captured. We treat this
  // as a success — fetch the order details to get the capture result.
  if (res.status === 422) {
    const errData = await res.json().catch(() => null);
    const issue = errData?.details?.[0]?.issue || "";
    if (issue === "ORDER_ALREADY_CAPTURED" || issue.includes("ALREADY_CAPTURED")) {
      console.log(`[paypal] Order ${orderId} was already captured — fetching details`);
      return await fetchPayPalOrderDetails(orderId);
    }
    // Different 422 error — treat as failure
    console.error("[paypal] Capture 422 error:", JSON.stringify(errData));
    throw new Error(`PayPal Capture failed: 422 ${issue}`);
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error("[paypal] Capture error:", res.status, errText);
    throw new Error(`PayPal Capture failed: ${res.status} ${errText}`);
  }

  const data = await res.json();

  // Extract the captured amount from the response
  // PayPal returns purchase_units[0].payments.captures[0].amount
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
  const amount = capture?.amount
    ? { currency: capture.amount.currency_code, value: capture.amount.value }
    : null;

  // Extract custom_id (contains our JSON with user_id, plan_tier, duration_months)
  const customId = data?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
    || data?.purchase_units?.[0]?.custom_id
    || null;

  return {
    id: data.id,
    status: data.status,
    amount,
    customId,
  };
}

/**
 * Fetch order details from PayPal (used when the order was already captured
 * and we need to retrieve the capture result for idempotency).
 *
 * @param orderId — PayPal Order ID
 * @returns Order details with capture status
 */
async function fetchPayPalOrderDetails(
  orderId: string,
): Promise<PayPalCaptureResult> {
  const accessToken = await getPayPalAccessToken();
  const orderUrl = `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`;

  const res = await fetch(orderUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[paypal] Fetch order details error:", res.status, errText);
    throw new Error(`PayPal fetch order failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
  const amount = capture?.amount
    ? { currency: capture.amount.currency_code, value: capture.amount.value }
    : null;
  const customId = data?.purchase_units?.[0]?.custom_id || null;

  return {
    id: data.id,
    status: data.status,
    amount,
    customId,
  };
}
