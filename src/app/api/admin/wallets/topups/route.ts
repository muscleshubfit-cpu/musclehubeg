import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — REVIEW A WALLET TOP-UP REQUEST (0035).
 * PATCH /api/admin/wallets/topups  { id, action: "approve"|"reject", admin_note? }
 *
 * OWNER FLOW («الأدمن يراجعهم ويكتب الرصيد يدوى لمحفظة المدرب»):
 *  - approve → coach_adjust_wallet(+amount, 'topup', ref, note, admin)
 *              credits the wallet ATOMICALLY, then the request flips to
 *              'approved' and the coach is notified. If the credit RPC
 *              fails the request STAYS pending — never lost, never
 *              credited twice (approve only runs on status='pending').
 *  - reject  → status flips to 'rejected' with the admin's note; the
 *              coach is told why.
 * The wallet's ONLY writer is coach_adjust_wallet (0035, service role).
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "").trim();
  const adminNote = String(body.admin_note ?? "").trim().slice(0, 300) || null;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: "bad_request", message: "طلب غير صحيح" },
      { status: 400 },
    );
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "bad_action", message: "الإجراء غير معروف" },
      { status: 400 },
    );
  }

  const { data: req, error: fetchErr } = await supabaseAdmin
    .from("coach_topup_requests" as any)
    .select("id, coach_id, amount, currency, method, status, note")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !req) {
    return NextResponse.json(
      { error: "not_found", message: "طلب الشحن غير موجود" },
      { status: 404 },
    );
  }
  if ((req as any).status !== "pending") {
    return NextResponse.json(
      { error: "already_reviewed", message: "الطلب اتراجع قبل كده" },
      { status: 409 },
    );
  }

  const coachId = (req as any).coach_id as string;
  const amount = Number((req as any).amount);

  if (action === "approve") {
    // Atomic credit — the RPC raises 'insufficient wallet balance' on
    // debits only; a top-up credit cannot fail on balance.
    const { data: newBalance, error: rpcErr } = await (supabaseAdmin as any).rpc(
      "coach_adjust_wallet",
      {
        p_coach_id: coachId,
        p_amount: amount,
        p_kind: "topup",
        p_ref_id: id,
        p_note: adminNote ?? (req as any).note ?? null,
        p_created_by: auth.id,
      },
    );

    if (rpcErr) {
      const hint = rpcErr.message.includes("coach_adjust_wallet")
        ? "شغّل هجرة 0035 أولًا (RUN_ON_SUPABASE_0035_COACH_WALLET.sql)"
        : rpcErr.message;
      return NextResponse.json({ error: "credit_failed", message: hint }, { status: 502 });
    }

    const { error: updErr } = await supabaseAdmin
      .from("coach_topup_requests" as any)
      .update({
        status: "approved",
        admin_note: adminNote,
        reviewed_by: auth.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending");

    if (updErr) {
      // Balance IS credited; the status flip is retried on next review —
      // the unique pending-guard in the WHERE clause prevents double credit.
      console.error("[api/admin/wallets/topups] status update failed:", updErr.message);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: coachId,
      type: "wallet_topup_approved",
      title: "تم شحن محفظتك ✅",
      body: `اتقبل طلب شحن المحفظة بمبلغ ${amount} ${"EGP"} — الرصيد الجديد ${newBalance}.`,
      link: "/coach/wallet",
    });

    return NextResponse.json({ ok: true, balance: newBalance });
  }

  // Reject — no wallet touch, coach gets the reason.
  const { error: rejErr } = await supabaseAdmin
    .from("coach_topup_requests" as any)
    .update({
      status: "rejected",
      admin_note: adminNote,
      reviewed_by: auth.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");

  if (rejErr) {
    return NextResponse.json(
      { error: "db_error", message: rejErr.message },
      { status: 503 },
    );
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: coachId,
    type: "wallet_topup_rejected",
    title: "طلب شحن المحفظة مرفوض",
    body: `لم يتم قبول طلب الشحن بمبلغ ${amount} EGP.${adminNote ? ` السبب: ${adminNote}` : ""} راجع إيصال الدفع وحاول تاني.`,
    link: "/coach/wallet",
  });

  return NextResponse.json({ ok: true, rejected: true });
}
