import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * MULTI-COACH PHASE 2B — admin reassignment of clients to coaches
 * (owner answers 1+7: 1 client ↔ 1 coach, the admin owns the pool).
 *
 * GET   /api/admin/assignments                     → staff list (for the dropdown)
 * PATCH /api/admin/assignments                     → assign / reassign one client
 *         body: { client_id, coach_id }
 *
 * Admin-exclusive (requireAdmin) — a plain coach gets 403. The DB
 * mirrors this: coach_assignments write RLS is admin-only (0030A).
 */

export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["coach", "admin"])
    .order("role", { ascending: false }) // admin first, then coaches
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Per-staff assigned-client counts (admin assignments management page).
  // Service-role read of coach_assignments — no RLS dance needed here.
  const { data: assignmentRows } = await supabaseAdmin
    .from("coach_assignments")
    .select("coach_id");
  const counts: Record<string, number> = {};
  for (const row of assignmentRows ?? []) {
    const coachId = (row as { coach_id: string }).coach_id;
    counts[coachId] = (counts[coachId] ?? 0) + 1;
  }

  return NextResponse.json({ staff: data ?? [], counts });
}

export async function PATCH(request: NextRequest) {
  let adminId: string | null = null;
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
    adminId = auth.id;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const clientId = String(body.client_id ?? "");
  const coachId = String(body.coach_id ?? "");

  if (!clientId || !coachId) {
    return NextResponse.json(
      { error: "bad_request", message: "client_id و coach_id مطلوبان" },
      { status: 400 },
    );
  }

  if (clientId === coachId) {
    return NextResponse.json(
      { error: "self_assignment", message: "لا يمكن تعيين العميل لنفسه" },
      { status: 400 },
    );
  }

  // Validate BOTH sides: client must be role='client', target must be staff.
  const { data: clientProf } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", clientId)
    .maybeSingle();
  if (!clientProf || clientProf.role !== "client") {
    return NextResponse.json(
      { error: "not_a_client", message: "الهدف ليس عميلًا" },
      { status: 400 },
    );
  }

  const { data: coachProf } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", coachId)
    .maybeSingle();
  if (!coachProf || (coachProf.role !== "coach" && coachProf.role !== "admin")) {
    return NextResponse.json(
      { error: "not_a_coach", message: "المدرب المختار غير صالح" },
      { status: 400 },
    );
  }

  // 1:1 (client_id UNIQUE) → upsert reassigns in one statement.
  const { error } = await supabaseAdmin
    .from("coach_assignments")
    .upsert(
      {
        client_id: clientId,
        coach_id: coachId,
        assigned_by: adminId ?? coachId, // the admin who performed the reassignment
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The assigned coach gets routed notifications for THIS client from now
  // on (0030 admin_notifications.target_coach_id resolution reads
  // coach_assignments) — no extra action needed here.
  return NextResponse.json({ ok: true, client_id: clientId, coach_id: coachId });
}
