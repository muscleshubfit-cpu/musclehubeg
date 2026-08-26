/**
 * POST /api/paypal/capture-order
 *
 * Captures a PayPal Order server-side and activates the subscription
 * ONLY if PayPal confirms the capture status as 'COMPLETED'.
 *
 * SECURITY:
 *   - User must be authenticated (requireUser)
 *   - The orderID is validated against PayPal's server (not client-trusted)
 *   - The custom_id in the PayPal order contains the user_id, plan_tier,
 *     and duration_months — we verify it matches the authenticated user
 *     to prevent IDOR (user A capturing user B's order)
 *   - Idempotency: PayPal's Capture API is idempotent (same PayPal-Request-Id
 *     returns the same result). We also handle HTTP 422 ORDER_ALREADY_CAPTURED
 *     by fetching the order details instead of re-capturing.
 *   - Subscription activation uses server-side helpers (supabaseAdmin):
 *     serverUpsertSubscription() + serverCreateNotification() +
 *     serverProcessAffiliateCommission() — same logic as the manual flow.
 *
 * Request body:
 *   { orderId: string }
 *
 * Response (200):
 *   { success: true, status: "COMPLETED", subscription: "activated" }
 *
 * Response (400): orderId missing
 * Response (401): not authenticated
 * Response (403): order doesn't belong to this user (IDOR attempt)
 * Response (409): capture status is not COMPLETED
 * Response (500): PayPal API error or subscription activation failure
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { capturePayPalOrder, isPaypalConfigured, resolvePlanPrice } from "@/lib/paypal";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

// Commission rate — same value as in src/lib/referral.ts (0.20 = 20%)
// Defined here directly to avoid importing referral.ts which pulls in
// the client-side Supabase browser client (not usable on server).
const COMMISSION_RATE = 0.20;

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────
// Server-side helpers (replaces client-only upsertSubscription,
// createNotification, and processSubscriptionInitialPayment which
// cannot be called from a server route because they import
// the client-side Supabase browser client)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Server-side subscription extension using supabaseAdmin (service-role).
 * Uses migration 0018's extend_subscription() RPC which atomically
 * extends an existing subscription (preserving remaining paid days)
 * instead of overwriting it. Fixes C10 (early renewal lost paid days).
 */
async function serverUpsertSubscription(
  clientId: string,
  tier: string,
  months: number,
) {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    throw new Error("Supabase admin client not configured");
  }
  const subscriptionType = tier === "coaching" ? "coaching" : "membership";
  const { data, error } = await supabaseAdmin
    .rpc("extend_subscription", {
      p_client_id: clientId,
      p_tier: tier,
      p_months: months,
      p_subscription_type: subscriptionType,
    });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Server-side notification insert using supabaseAdmin.
 * Replicates createNotification() from data.ts.
 */
async function serverCreateNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("notifications")
    .insert({ user_id: userId, type, title, body, link });
  if (error) console.error("[paypal/capture-order] Notification insert error:", error.message);
}

/**
 * Server-side admin notification insert using supabaseAdmin.
 * Replicates createAdminNotification() from data.ts — inserts into
 * the admin_notifications table so the coach sees it in their
 * dashboard notification bell.
 */
async function serverCreateAdminNotification(
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("admin_notifications")
    .insert({ type, title, body, link, target_role: "coach" });
  if (error) console.error("[paypal/capture-order] Admin notification insert error:", error.message);
}

/**
 * Server-side PayPal payment record insert.
 * Creates a record in subscription_requests with status='approved'
 * and payment_provider='paypal' so the coach can see it in the
 * payments dashboard alongside manual payments.
 */
async function serverCreatePayPalPaymentRecord(
  userId: string,
  planTier: string,
  durationMonths: number,
  amount: number,
  orderId: string,
  fullName: string,
) {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from("subscription_requests")
    .insert({
      user_id: userId,
      full_name: fullName,
      whatsapp: null,
      plan_tier: planTier,
      duration_months: durationMonths,
      price_usd: amount,
      payment_method: "paypal",
      receipt_path: null,
      status: "approved",
      reviewed_at: new Date().toISOString(),
      // Note: subscription_requests table doesn't have a paypal_order_id
      // column. The paypal_order_id is stored in the affiliate_transactions
      // table (external_reference). This record is for the coach dashboard
      // visibility only — it's already 'approved' so no action needed.
    });
  if (error) {
    // Non-blocking — the subscription is already active
    console.error("[paypal/capture-order] Payment record insert error:", error.message);
  }
}

/**
 * Server-side affiliate commission processing.
 * Replicates the core of processSubscriptionInitialPayment() from
 * affiliate-engine.ts but uses supabaseAdmin instead of the browser client.
 *
 * Steps:
 * 1. Look up the affiliate (referrer) from the referrals table
 * 2. Create an affiliate_transaction (idempotent via external_reference)
 * 3. Check idempotency — if commission already exists, skip
 * 4. Create affiliate_commissions record (unique on transaction_id)
 * 5. Create referral_earnings record (links to payout system)
 * 6. Update referrals.status → 'completed'
 * 7. Send notification to the affiliate
 */
async function serverProcessAffiliateCommission(
  userId: string,
  paymentAmount: number,
  orderId: string,
  planTier: string,
) {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return;
  if (paymentAmount <= 0) return;

  // 1. Look up the affiliate for this user
  const { data: referral } = await supabaseAdmin
    .from("referrals")
    .select("id, referrer_id, status")
    .eq("referred_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!referral || !referral.referrer_id) {
    return; // No affiliate — nothing to process
  }

  // For subscription_initial: only proceed if referral is pending
  if (referral.status !== "pending") {
    return;
  }

  // 2. Create affiliate_transaction (idempotent — unique on external_reference + transaction_type)
  const { data: txn, error: txnError } = await supabaseAdmin
    .from("affiliate_transactions")
    .insert({
      user_id: userId,
      affiliate_user_id: referral.referrer_id,
      transaction_type: "subscription_initial",
      amount: Math.round(paymentAmount * 100) / 100,
      currency: "USD",
      external_reference: orderId,
      product_id: planTier,
      affiliate_eligible: true,
      status: "completed",
    })
    .select()
    .single();

  if (txnError) {
    // If duplicate (23505 = unique constraint violation), the transaction
    // already exists — this is idempotent behavior, not an error
    if (txnError.code === "23505") {
      console.log("[paypal/capture-order] Affiliate transaction already exists for order:", orderId);
      return;
    }
    console.error("[paypal/capture-order] Affiliate transaction error:", txnError.message);
    return;
  }

  if (!txn) return;

  // 3. Check idempotency — look for existing commission
  const { data: existingCommission } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("id")
    .eq("transaction_id", txn.id)
    .maybeSingle();

  if (existingCommission) {
    console.log("[paypal/capture-order] Commission already exists for transaction:", txn.id);
    return;
  }

  // 4. Create commission record
  const commissionAmount = Math.round(paymentAmount * COMMISSION_RATE * 100) / 100;

  const { data: commission, error: commError } = await supabaseAdmin
    .from("affiliate_commissions")
    .insert({
      affiliate_user_id: referral.referrer_id,
      transaction_id: txn.id,
      referral_id: referral.id,
      commission_type: "subscription_initial",
      amount: commissionAmount,
      rate: COMMISSION_RATE,
      status: "available",
    })
    .select()
    .single();

  if (commError) {
    if (commError.code === "23505") return; // Already exists — idempotent
    console.error("[paypal/capture-order] Commission insert error:", commError.message);
    return;
  }

  // 5. Create referral_earning (links to payout system)
  if (commission) {
    const { data: earning } = await supabaseAdmin
      .from("referral_earnings")
      .insert({
        user_id: referral.referrer_id,
        referral_id: referral.id,
        amount: commissionAmount,
        status: "available",
        affiliate_commission_id: commission.id,
        transaction_type: "subscription_initial",
      })
      .select()
      .single();

    // 6. Link earning back to commission
    if (earning) {
      await supabaseAdmin
        .from("affiliate_commissions")
        .update({ earning_id: earning.id })
        .eq("id", commission.id);
    }
  }

  // 7. Update referrals table (backward compat)
  await supabaseAdmin
    .from("referrals")
    .update({
      status: "completed",
      commission_amount: commissionAmount,
      completed_at: new Date().toISOString(),
      subscription_request_id: orderId,
    })
    .eq("id", referral.id);

  // 8. Notify the affiliate
  await serverCreateNotification(
    referral.referrer_id,
    "referral_commission",
    "عمولة جديدة! 🎉",
    `ربحت $${commissionAmount} عمولة من اشتراك جديد.`,
    "/referral",
  );

  console.log(`[paypal/capture-order] Commission created: $${commissionAmount} for affiliate ${referral.referrer_id}`);
}

export async function POST(request: NextRequest) {
  // 1. Auth check — must be a logged-in user
  const userOrResponse = await requireUser(request);
  if (userOrResponse instanceof Response) return userOrResponse;
  const user = userOrResponse;

  // 2. Validate PayPal is configured
  if (!isPaypalConfigured) {
    console.error("[paypal/capture-order] PayPal env vars not configured");
    return NextResponse.json(
      { error: "Payment system is not configured. Please contact support." },
      { status: 500 },
    );
  }

  // 3. Parse + validate request body
  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { orderId } = body;

  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid orderId" },
      { status: 400 },
    );
  }

  // 4. Capture the order via PayPal API (server-to-server)
  let captureResult;
  try {
    captureResult = await capturePayPalOrder(orderId);
  } catch (e: any) {
    console.error("[paypal/capture-order] Capture error:", e?.message);
    return NextResponse.json(
      { error: "Failed to capture payment. Please contact support." },
      { status: 500 },
    );
  }

  // 5. Verify capture status is COMPLETED
  if (captureResult.status !== "COMPLETED") {
    console.error(
      `[paypal/capture-order] Capture status is '${captureResult.status}', expected 'COMPLETED'. Order: ${orderId}`,
    );
    return NextResponse.json(
      {
        error: "Payment was not completed. Please try again or contact support.",
        status: captureResult.status,
      },
      { status: 409 },
    );
  }

  // 6. Parse custom_id to extract user_id, plan_tier, duration_months
  // The custom_id was set during Create Order as a JSON string.
  let contextData: { user_id?: string; plan_tier?: string; duration_months?: number };
  try {
    contextData = JSON.parse(captureResult.customId || "{}");
  } catch {
    console.error(
      `[paypal/capture-order] Failed to parse custom_id: ${captureResult.customId}`,
    );
    return NextResponse.json(
      { error: "Payment verification failed (invalid order metadata)." },
      { status: 500 },
    );
  }

  const { user_id, plan_tier, duration_months } = contextData;

  if (!user_id || !plan_tier || !duration_months) {
    console.error(
      `[paypal/capture-order] Missing fields in custom_id: ${JSON.stringify(contextData)}`,
    );
    return NextResponse.json(
      { error: "Payment verification failed (missing order metadata)." },
      { status: 500 },
    );
  }

  // 7. IDOR protection: verify the order belongs to the authenticated user
  if (user_id !== user.id) {
    console.error(
      `[paypal/capture-order] IDOR attempt: order belongs to ${user_id}, but caller is ${user.id}`,
    );
    return NextResponse.json(
      { error: "This payment does not belong to your account." },
      { status: 403 },
    );
  }

  // 7.5. M8 fix: verify the captured amount matches the expected price.
  // Defense-in-depth — prevents a bug in create-order or a PayPal API
  // change from granting a subscription without full payment.
  const expectedPrice = resolvePlanPrice(plan_tier, duration_months);
  const capturedAmount = captureResult.amount ? parseFloat(captureResult.amount.value) : 0;
  if (expectedPrice === null || Math.abs(capturedAmount - expectedPrice) > 0.01) {
    console.error(
      `[paypal/capture-order] Amount mismatch: expected $${expectedPrice}, captured $${capturedAmount}. Order: ${orderId}`,
    );
    return NextResponse.json(
      { error: "Payment amount mismatch. Please contact support." },
      { status: 409 },
    );
  }

  // 8. Activate the subscription (same path as manual approval)
  // Use the service-role admin client to bypass RLS for the subscription
  // insert (the coach's manual approval uses the same upsertSubscription()
  // function which handles RLS internally via the authenticated coach
  // session — but for PayPal, we don't have a coach session, so we use
  // the admin client).
  try {
    // Server-side subscription extension (uses supabaseAdmin + extend_subscription RPC)
    // The RPC handles start_date and end_date computation atomically.
    await serverUpsertSubscription(
      user_id,
      plan_tier,
      duration_months,
    );

    // Notify the user that their subscription is active
    await serverCreateNotification(
      user_id,
      "subscription_approved",
      "تم تفعيل اشتراكك! 🎉",
      `تم تفعيل اشتراكك (${plan_tier}) لمدة ${duration_months} ${duration_months === 1 ? "شهر" : "أشهر"} عبر PayPal.`,
      "/dashboard",
    );

    // Award affiliate commission (server-side, idempotent)
    // Uses orderId as external_reference — prevents duplicate commissions
    try {
      const paymentAmount = captureResult.amount
        ? parseFloat(captureResult.amount.value)
        : 0;

      if (paymentAmount > 0) {
        await serverProcessAffiliateCommission(
          user_id,
          paymentAmount,
          orderId,
          plan_tier,
        );
      }
    } catch (commissionError: any) {
      // Commission failure should NOT block the subscription activation.
      console.error(
        "[paypal/capture-order] Affiliate commission error (non-blocking):",
        commissionError?.message,
      );
    }

    // Create a payment record in subscription_requests so the coach
    // can see it in the payments dashboard (status='approved', no action needed).
    const paymentAmountForRecord = captureResult.amount
      ? parseFloat(captureResult.amount.value)
      : 0;
    await serverCreatePayPalPaymentRecord(
      user_id,
      plan_tier,
      duration_months,
      paymentAmountForRecord,
      orderId,
      user.email || "—",
    );

    // Notify the coach about the new PayPal payment
    await serverCreateAdminNotification(
      "payment_request",
      "دفع PayPal جديد ✅",
      `تم دفع $${paymentAmountForRecord.toFixed(2)} عبر PayPal لخطة ${plan_tier} (${duration_months} ${duration_months === 1 ? "شهر" : "أشهر"}). الاشتراك مُفعّل تلقائياً.`,
      "coach-payments",
    );

    console.log(
      `[paypal/capture-order] SUCCESS: order ${orderId} captured, subscription activated for user ${user_id} (${plan_tier}, ${duration_months}m)`,
    );

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      subscription: "activated",
      orderId,
      plan: plan_tier,
      durationMonths: duration_months,
    });
  } catch (e: any) {
    console.error(
      "[paypal/capture-order] Subscription activation error:",
      e?.message,
    );
    // The payment was captured but the subscription failed to activate.
    // This is a critical state — the user paid but doesn't have access.
    // Return 500 so the frontend can retry or the admin can manually
    // activate the subscription.
    return NextResponse.json(
      {
        error: "Payment was captured but subscription activation failed. Please contact support with your order ID.",
        orderId,
      },
      { status: 500 },
    );
  }
}
