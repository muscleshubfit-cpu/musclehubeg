import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isCoachTopupMethod } from "@/lib/coach-limits";

/**
 * COACH WALLET TOP-UP REQUEST (0035).
 * POST /api/coach/wallet/topup  { amount, method, note?, receipt_path }
 *
 * The coach pays THE SITE (InstaPay / Vodafone Cash / PayPal), uploads
 * the payment receipt (already stored in the private `receipts` bucket
 * via /api/upload or uploadReceipt) and submits this request. The ADMIN
 * reviews it on /admin/wallets — approving credits the wallet through
 * coach_adjust_wallet(). Nothing here touches the balance directly:
 * coach_topup_requests is written pending-only by the coach, and ONLY
 * the admin review route may credit.
 *
 * No fixed prices by owner decree — the coach types the amount he paid.
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (auth.role !== "coach" && auth.role !== "admin") {
    return NextResponse.json(
      { error: "forbidden", message: "هذه الصفحة للمدربين فقط" },
      { status: 403 },
    );
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const amount = Number(body.amount);
  const method = body.method;
  const note = String(body.note ?? "").trim().slice(0, 300) || null;
  const receiptPath = String(body.receipt_path ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json(
      { error: "bad_amount", message: "اكتب مبلغ شحن صحيح" },
      { status: 400 },
    );
  }
  if (!isCoachTopupMethod(method)) {
    return NextResponse.json(
      { error: "bad_method", message: "طريقة الشحن غير معروفة" },
      { status: 400 },
    );
  }
  // Receipt is mandatory — the admin has nothing to review without it.
  if (!receiptPath || !receiptPath.startsWith("receipts/") || receiptPath.length > 500) {
    return NextResponse.json(
      { error: "bad_receipt", message: "ارفع صورة إيصال الدفع (أو PDF) الأول" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("coach_topup_requests")
    .insert({
      coach_id: auth.id,
      amount: Math.round(amount * 100) / 100,
      method,
      note,
      receipt_path: receiptPath,
      // status defaults to 'pending' in the DB — made explicit for clarity.
      status: "pending",
    })
    .select("id, status, created_at")
    .single();

  if (error) {
    const hint = error.message.includes("coach_topup_requests")
      ? "شغّل هجرة 0035 أولًا (RUN_ON_SUPABASE_0035_COACH_WALLET.sql)"
      : error.message;
    return NextResponse.json({ error: "db_error", message: hint }, { status: 503 });
  }

  return NextResponse.json({ ok: true, topup: data });
}
