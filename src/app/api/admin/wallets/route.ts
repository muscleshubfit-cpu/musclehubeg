import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — COACH WALLETS OVERVIEW (0035).
 * GET /api/admin/wallets
 *
 * Powers /admin/wallets: every staff member's wallet balance next to his
 * per-client monthly fee and live client count, plus the PENDING top-up
 * queue (receipt path included — the admin opens the receipt and then
 * approves/rejects via PATCH /api/admin/wallets/topups).
 *
 * Manual balance corrections go through POST /api/admin/wallets/adjust.
 */
export async function GET(_request: NextRequest) {
  const auth = await requireAdmin(_request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const [staffRes, walletsRes, feesRes, countsRes, topupsRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["coach", "admin"]),
    supabaseAdmin.from("coach_wallets").select("coach_id, balance, currency"),
    supabaseAdmin
      .from("coach_fees")
      .select("coach_id, fee_per_client, currency"),
    supabaseAdmin
      .from("coach_assignments")
      .select("coach_id"),
    supabaseAdmin
      .from("coach_topup_requests")
      .select(
        `id, coach_id, amount, currency, method, receipt_path, note, status,
         admin_note, created_at,
         coach:profiles!coach_topup_requests_coach_id_fkey(id, full_name, email)`,
      )
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const miss = [staffRes.error, walletsRes.error, topupsRes.error].find(Boolean);
  if (miss) {
    const hint =
      miss.message.includes("coach_wallet") || miss.message.includes("coach_topup")
        ? "شغّل هجرة 0035 أولًا (RUN_ON_SUPABASE_0035_COACH_WALLET.sql)"
        : miss.message;
    return NextResponse.json({ error: "db_error", message: hint }, { status: 503 });
  }

  const walletMap = new Map(
    (walletsRes.data ?? []).map((w) => [w.coach_id, w]),
  );
  const feeMap = new Map((feesRes.data ?? []).map((f) => [f.coach_id, f]));
  const countMap = new Map<string, number>();
  for (const row of countsRes.data ?? []) {
    const cid = row.coach_id;
    countMap.set(cid, (countMap.get(cid) ?? 0) + 1);
  }

  const wallets = (staffRes.data ?? []).map((p) => ({
    coach_id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    balance: Number(walletMap.get(p.id)?.balance ?? 0),
    currency: walletMap.get(p.id)?.currency ?? "USD",
    fee_per_client: Number(feeMap.get(p.id)?.fee_per_client ?? 0),
    fee_currency: feeMap.get(p.id)?.currency ?? "USD",
    client_count: countMap.get(p.id) ?? 0,
  }));

  return NextResponse.json({ wallets, topups: topupsRes.data ?? [] });
}
