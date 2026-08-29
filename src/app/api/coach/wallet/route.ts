import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * COACH WALLET READOUT (0035).
 * GET /api/coach/wallet
 *
 * OWNER MODEL: the coach pays THE SITE a monthly fixed fee per client
 * (coach_fees.fee_per_client × months) from his wallet. He tops the
 * wallet up via InstaPay / Vodafone Cash / PayPal, uploads the receipt
 * and the ADMIN reviews + manually credits it (POST /api/coach/wallet/
 * topup creates the pending request; approval happens admin-side).
 *
 * Returns the caller's own wallet: balance, his per-client monthly fee,
 * his top-up requests and his wallet ledger (both RLS-scoped to self,
 * but read here through the service role so the response shape is
 * stable even before RLS grants exist on old projects).
 */

export async function GET(_request: NextRequest) {
  const auth = await requireUser(_request);
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

  const [walletRes, feeRes, topupsRes, txnsRes] = await Promise.all([
    supabaseAdmin
      .from("coach_wallets" as any)
      .select("balance, currency, updated_at")
      .eq("coach_id", auth.id)
      .maybeSingle(),
    supabaseAdmin
      .from("coach_fees" as any)
      .select("fee_per_client, currency")
      .eq("coach_id", auth.id)
      .maybeSingle(),
    supabaseAdmin
      .from("coach_topup_requests" as any)
      .select(
        "id, amount, currency, method, receipt_path, note, status, admin_note, created_at, reviewed_at",
      )
      .eq("coach_id", auth.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("coach_wallet_transactions" as any)
      .select("id, kind, amount, balance_after, ref_id, note, created_at")
      .eq("coach_id", auth.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Missing-table (0035 not applied yet) → 503 with the run hint, so the
  // UI can hide the section instead of crashing.
  const miss = [walletRes.error, topupsRes.error, txnsRes.error].find(Boolean);
  if (miss) {
    const hint =
      miss.message.includes("coach_wallet") || miss.message.includes("coach_topup")
        ? "شغّل هجرة 0035 أولًا (RUN_ON_SUPABASE_0035_COACH_WALLET.sql)"
        : miss.message;
    return NextResponse.json({ error: "db_error", message: hint }, { status: 503 });
  }

  return NextResponse.json({
    balance: walletRes.data ? Number((walletRes.data as any).balance) : 0,
    currency: (walletRes.data as any)?.currency ?? "EGP",
    fee_per_client: feeRes.data ? Number((feeRes.data as any).fee_per_client) : 0,
    fee_currency: (feeRes.data as any)?.currency ?? "EGP",
    topups: topupsRes.data ?? [],
    transactions: txnsRes.data ?? [],
  });
}
