import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  reverseCommissionByReferenceServer,
  reverseCommissionServer,
} from "@/lib/affiliate-engine-server";

/**
 * ADMIN REFUNDS — decide the member's 7-day money-back requests
 * (Phase 76, owner request: refund within 7 days conditioned on zero
 * paid-feature usage — the CONDITION is enforced at request time by
 * /api/refund/request; here the admin only sees verified requests).
 *
 * GET  /api/admin/refunds            → all requests (newest first)
 * POST /api/admin/refunds            → { id, action, note? }
 *   action=approve:
 *     1. refund_requests.status='approved' (guarded — pending only)
 *     2. subscription → status='expired' + end_date=now (access ends;
 *        stays inside the 0018/0041 status CHECK constraint)
 *     3. AFFILIATE CLAWBACK — «فى سحب الارباح من الافيليت لازم نراعى
 *        نقطة الغاء الاشتراكات»: commissions earned from THIS payment
 *        are reversed (reverseCommissionByReferenceServer — same engine
 *        the PayPal refund webhook uses). Held (<7d) commissions flip
 *        to pending → never withdrawable; already-paid ones create the
 *        negative clawback earning deducted from future payouts.
 *     4. member notified.
 *   action=reject: status='rejected' + note + member notified.
 *
 * The actual MONEY transfer is manual (InstaPay/Vodafone/PayPal) — this
 * API is the system of record + the affiliate-consistency hook.
 */

type RefundListRow = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  tier: string;
  months: number | null;
  amount_usd: number | null;
  payment_reference: string | null;
  payment_source: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  usage_snapshot: Record<string, number> | null;
  created_at: string;
  processed_at: string | null;
  // joined
  user_name: string | null;
  user_email: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data } = await supabaseAdmin
    .from("refund_requests")
    .select(`
      *,
      user:profiles!refund_requests_user_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []).map((r) => ({
    ...r,
    user_name: r.user?.full_name || "—",
    user_email: r.user?.email || "—",
  })) as RefundListRow[];

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const db = supabaseAdmin;

  let body: { id?: string; action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const { id, action, note } = body;
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { error: "bad_request", message: "id + action (approve|reject) required" },
      { status: 400 },
    );
  }

  // 1. Load the request (pending only — no double processing)
  const { data: reqRow } = await db
    .from("refund_requests")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  const req = reqRow as
    | (RefundListRow & { subscription_id: string | null })
    | null;
  if (!req) {
    return NextResponse.json(
      { error: "not_found_or_processed", message: "الطلب غير موجود أو تمت معالجته" },
      { status: 404 },
    );
  }

  const nowIso = new Date().toISOString();
  const processedAt = nowIso;

  if (action === "reject") {
    const { error: updErr } = await db
      .from("refund_requests")
      .update({ status: "rejected", admin_note: note ?? null, processed_at: processedAt })
      .eq("id", id)
      .eq("status", "pending");
    if (updErr) {
      console.error("[api/admin/refunds] reject error:", updErr.message);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    try {
      await db.from("notifications").insert({
        user_id: req.user_id,
        type: "refund_rejected",
        title: "تم رفض طلب الاسترداد",
        body: `تمت مراجعة طلب الاسترداد ورفضه.${note ? ` السبب: ${note}` : ""} للاستفسار تواصل مع الدعم.`,
        link: "/profile",
        read: false,
      });
    } catch (e) {
      console.error("[api/admin/refunds] reject notification error (non-blocking):", e);
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // ── APPROVE ─────────────────────────────────────────────────────────
  // 2. Mark approved (guarded)
  const { error: updErr } = await db
    .from("refund_requests")
    .update({ status: "approved", admin_note: note ?? null, processed_at: processedAt })
    .eq("id", id)
    .eq("status", "pending");
  if (updErr) {
    console.error("[api/admin/refunds] approve error:", updErr.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // 3. End the subscription NOW (paid money is being refunded)
  let subEnded = false;
  if (req.subscription_id) {
    const { error: subErr } = await db
      .from("subscriptions")
      .update({ status: "expired", end_date: nowIso })
      .eq("id", req.subscription_id)
      .eq("status", "active");
    if (subErr) {
      console.error("[api/admin/refunds] subscription end error:", subErr.message);
    } else {
      subEnded = true;
    }
  }

  // 4. AFFILIATE CLAWBACK — the owner's second half of this request:
  //    «فى سحب الارباح من الافيليت لازم نراعى نقطة الغاء الاشتراكات».
  //    Reverse every commission tied to THIS payment. The engine never
  //    deletes rows: held commissions (available_at in the future) flip
  //    to 'pending' → excluded from withdrawable balance; paid-out ones
  //    create a negative clawback earning deducted from future payouts.
  let reversed = 0;
  try {
    if (req.payment_reference) {
      reversed = await reverseCommissionByReferenceServer(
        req.payment_reference,
        `استرداد اشتراك خلال ${"7"} أيام (إلغاء الاشتراك)`,
      );
    }
    if (reversed === 0) {
      // No reference or nothing matched — sweep the member's completed
      // subscription_initial transactions since activation so the
      // clawback can never be missed.
      const sinceIso = new Date(
        new Date(req.created_at).getTime() - 31 * 86_400_000,
      ).toISOString();
      const { data: txns } = await db
        .from("affiliate_transactions")
        .select("id")
        .eq("user_id", req.user_id)
        .eq("transaction_type", "subscription_initial")
        .neq("status", "refunded")
        .gte("created_at", sinceIso);
      for (const t of (txns ?? []) as { id: string }[]) {
        if (await reverseCommissionServer(t.id, "استرداد اشتراك خلال 7 أيام (إلغاء الاشتراك)")) {
          reversed++;
        }
      }
    }
  } catch (e) {
    console.error("[api/admin/refunds] affiliate reversal error (non-blocking):", e);
  }

  // 5. Notify the member
  try {
    await db.from("notifications").insert({
      user_id: req.user_id,
      type: "refund_approved",
      title: "تم قبول طلب الاسترداد ✅",
      body: `تم قبول استرداد اشتراكك${req.amount_usd ? ` (${req.amount_usd}$)` : ""} وإيقافه من الآن. سيتم تحويل المبلغ بنفس طريقة الدفع خلال أيام العمل.${subEnded ? "" : " (لم نتمكن من إيقاف الاشتراك تلقائيًا — سيتم إنهاؤه يدويًا)."}`,
      link: "/profile",
      read: false,
    });
  } catch (e) {
    console.error("[api/admin/refunds] member notification error (non-blocking):", e);
  }

  console.log(
    `[api/admin/refunds] refund ${id} APPROVED — sub ended: ${subEnded}, commissions reversed: ${reversed}`,
  );
  return NextResponse.json({ ok: true, status: "approved", subEnded, reversed });
}
