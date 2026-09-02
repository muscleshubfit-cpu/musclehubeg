import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — OFFLINE PAYMENT LEDGER (0034).
 * GET /api/admin/coach-payments?limit=50
 *
 * Every row = one subscription a coach (or the admin) activated after
 * collecting payment OUTSIDE the site. The admin audits who collected
 * what from whom; totals per coach mirror the coach_fees bill.
 * Read-only here — rows are written only by the activate route.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));

  const { data, error } = await supabaseAdmin
    .from("coach_payments")
    .select(
      `id, tier, months, amount, currency, method, note, created_at,
       coach:profiles!coach_payments_coach_id_fkey(id, full_name, email),
       client:profiles!coach_payments_client_id_fkey(id, full_name, email)`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Missing table (0034 not applied yet) → friendly hint, not a crash.
    const hint = error.message.includes("coach_payments")
      ? "شغّل هجرة 0034 أولًا (RUN_ON_SUPABASE_0034_COACH_ACTIVATION.sql)"
      : error.message;
    return NextResponse.json({ error: "db_error", message: hint }, { status: 503 });
  }

  return NextResponse.json({ payments: data ?? [] });
}
