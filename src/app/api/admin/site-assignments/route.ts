import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authRequired } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — SITE-COACH ASSIGNMENTS (Phase 103, 0067).
 * The B2C follow-up roster: which site coach follows up which member.
 * Owner directive: «قائمة جديده لتعين مدربين للموقع وتعيين أعضاء ليهم
 * لمتابعتهم ( b2c )».
 *
 * Deliberately SEPARATE from /api/admin/assignments (the B2B money
 * relation): coach_assignments feeds wallet billing
 * (fee_per_client × assigned clients) and affiliate attribution — mixing
 * B2C members into it would bill site coaches for members who already
 * paid the SITE. This table (site_coach_assignments) carries no money.
 *
 * One member ↔ one site coach (unique client_id) — re-assigning a member
 * moves him (upsert on client_id), mirroring the 1↔1 shape of the B2B
 * table.
 *
 * GET     → every assignment + coach/client/assigner profile names
 * POST    → { coach_id, client_id } — assign (or move) a member to a
 *           site coach. Guards: coach must have role='coach', client
 *           must have role='client'.
 * DELETE  → { client_id } — unassign a member (roster row removed).
 *
 * All verbs are admin-exclusive (requireAdmin — a coach gets 403).
 * Service-role writes: browser sessions have RLS-locked table grants
 * (0067 revokes authenticated INSERT/UPDATE/DELETE loudly).
 */

type ProfileLite = { id: string; full_name: string | null; email: string | null };

export async function GET(request: NextRequest) {
  if (authRequired) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const db = supabaseAdmin;

  const { data, error } = await db
    .from("site_coach_assignments")
    .select("id, coach_id, client_id, assigned_by, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    // Pre-0067 live DB: table missing → migration not applied yet.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve the three profile references with ONE .in() query per set —
  // avoids FK-name-fragile embedded selects (house pattern from wallets).
  const rows = data ?? [];
  const coachIds = [...new Set(rows.map((r) => r.coach_id))];
  const clientIds = [...new Set(rows.map((r) => r.client_id))];
  const assignerIds = [
    ...new Set(rows.map((r) => r.assigned_by).filter((v): v is string => !!v)),
  ];

  const nameOf = new Map<string, string>();
  const fetchNames = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data: profs } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    for (const p of (profs ?? []) as ProfileLite[]) {
      nameOf.set(p.id, p.full_name || p.email || p.id);
    }
  };

  await Promise.all([fetchNames(coachIds), fetchNames(clientIds), fetchNames(assignerIds)]);

  return NextResponse.json({
    assignments: rows.map((r) => ({
      ...r,
      coach_name: nameOf.get(r.coach_id) ?? r.coach_id,
      client_name: nameOf.get(r.client_id) ?? r.client_id,
      assigned_by_name: r.assigned_by ? (nameOf.get(r.assigned_by) ?? r.assigned_by) : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  let adminId: string | null = null;
  if (authRequired) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
    adminId = auth.id;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const coachId = String(body.coach_id ?? "");
  const clientId = String(body.client_id ?? "");

  if (!coachId || !clientId) {
    return NextResponse.json(
      { error: "bad_request", message: "coach_id و client_id مطلوبان" },
      { status: 400 },
    );
  }
  if (coachId === clientId) {
    return NextResponse.json(
      { error: "bad_request", message: "لا يمكن تعيين المدرب لنفسه" },
      { status: 400 },
    );
  }

  // GUARD — the coach really is a coach, the member really is a client.
  const { data: profs, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .in("id", [coachId, clientId]);

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  const list = (profs ?? []) as Array<{ id: string; role: string }>;
  const coach = list.find((p) => p.id === coachId);
  const client = list.find((p) => p.id === clientId);
  if (!coach || coach.role !== "coach") {
    return NextResponse.json(
      { error: "bad_request", message: "المعيَّن المطلوب مش مدرب" },
      { status: 400 },
    );
  }
  if (!client || client.role !== "client") {
    return NextResponse.json(
      { error: "bad_request", message: "العضو المطلوب مش عميل" },
      { status: 400 },
    );
  }

  // Upsert on client_id → assigning a member who already has a site coach
  // MOVES him to the new one (one member ↔ one site coach).
  const { error: upErr } = await supabaseAdmin.from("site_coach_assignments").upsert(
    { coach_id: coachId, client_id: clientId, assigned_by: adminId },
    { onConflict: "client_id" },
  );

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (authRequired) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const clientId = String(body.client_id ?? "");
  const rowId = String(body.id ?? "");

  if (!clientId && !rowId) {
    return NextResponse.json(
      { error: "bad_request", message: "client_id أو id مطلوب" },
      { status: 400 },
    );
  }

  const { error: delErr } = await (clientId
    ? supabaseAdmin.from("site_coach_assignments").delete().eq("client_id", clientId)
    : supabaseAdmin.from("site_coach_assignments").delete().eq("id", rowId));

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
