import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * COACH FEES — fixed per-client price, admin-editable
 * (owner answer 3, 2026-08-29: «ممكن نعملها سعر ثابت على كل عميل قابل
 * للتعديل» — instead of a percentage, each coach pays a flat fee per
 * client; the admin can change it anytime).
 *
 * GET   /api/admin/coach-fees → coaches (role='coach') + their fee rows
 * PATCH /api/admin/coach-fees { coach_id, fee_per_client }
 *
 * coach_fees RLS (0033): admin writes/reads all, a coach may read his
 * own row (reserved for the future coach dashboard — owner: «لاحقًا
 * نحدد داشبورد المدربين والصلاحيات»).
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data: coaches, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "coach")
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: fees } = await supabaseAdmin
    .from("coach_fees")
    .select("coach_id, fee_per_client, currency, updated_at");

  const feeMap: Record<
    string,
    { fee_per_client: number; currency: string; updated_at: string }
  > = {};
  for (const row of fees ?? []) {
    const r = row as {
      coach_id: string;
      fee_per_client: number;
      currency: string;
      updated_at: string;
    };
    feeMap[r.coach_id] = {
      fee_per_client: Number(r.fee_per_client),
      currency: r.currency,
      updated_at: r.updated_at,
    };
  }

  return NextResponse.json({
    coaches: (coaches ?? []).map((c) => {
      const row = c as { id: string; full_name: string | null; email: string | null };
      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        fee_per_client: feeMap[row.id]?.fee_per_client ?? 0,
        currency: feeMap[row.id]?.currency ?? "USD",
      };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const coachId = String(body.coach_id ?? "");
  const fee = Number(body.fee_per_client);

  if (!coachId || !Number.isFinite(fee) || fee < 0 || fee > 1_000_000) {
    return NextResponse.json(
      { error: "bad_request", message: "coach_id وسعر صحيح (0 أو أكثر) مطلوبان" },
      { status: 400 },
    );
  }

  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", coachId)
    .maybeSingle();

  if (!target || target.role !== "coach") {
    return NextResponse.json(
      { error: "not_a_coach", message: "الهدف ليس مدربًا" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin.from("coach_fees").upsert(
    {
      coach_id: coachId,
      fee_per_client: fee,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coach_id: coachId, fee_per_client: fee });
}
