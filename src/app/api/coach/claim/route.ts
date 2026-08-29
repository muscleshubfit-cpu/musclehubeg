import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * COACH ATTRIBUTION — claim (0033, owner answers 2026-08-29: coaches
 * bring their own clients; site clients stay with the admin).
 *
 * POST /api/coach/claim  { slug }
 *
 * A client who signed up through a coach's landing page via GOOGLE has
 * no signup metadata — the 0033 trigger fell back to the admin. This
 * route (called by CoachSlugClaimer on first authenticated load, from
 * the 30-day mh_coach_slug cookie) reassigns him to the slug's coach,
 * allowed ONLY while he is still a SITE CLIENT (assigned to an admin):
 * a client already owned by a real coach can never be poached here.
 *
 * Any logged-in user may call it for himself — the target coach and the
 * "still with the admin" guard are validated server-side.
 */

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const slug = String(body.slug ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "invalid_slug", message: "رابط المدرب غير صالح" },
      { status: 400 },
    );
  }

  // Only clients claim — staff have no coach cookie anyway.
  if (auth.role !== "client") {
    return NextResponse.json(
      { error: "not_a_client", message: "الحساب ليس عميلًا" },
      { status: 409 },
    );
  }

  // Resolve slug → landing page → coach role.
  const { data: page } = await supabaseAdmin
    .from("coach_pages")
    .select("coach_id")
    .eq("slug", slug)
    .maybeSingle();

  const coachId = (page as { coach_id?: string } | null)?.coach_id;
  if (!coachId) {
    return NextResponse.json(
      { error: "coach_not_found", message: "المدرب غير موجود" },
      { status: 404 },
    );
  }

  const { data: coachProf } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", coachId)
    .maybeSingle();

  if (!coachProf || coachProf.role !== "coach") {
    return NextResponse.json(
      { error: "coach_not_found", message: "المدرب غير موجود" },
      { status: 404 },
    );
  }

  // Current assignment?
  const { data: current } = await supabaseAdmin
    .from("coach_assignments")
    .select("coach_id")
    .eq("client_id", auth.id)
    .maybeSingle();

  if (current?.coach_id === coachId) {
    return NextResponse.json({
      ok: true,
      coach_id: coachId,
      coach_name: coachProf.full_name ?? null,
    });
  }

  if (current && current.coach_id) {
    // Owned by someone — reassignable ONLY if that owner is the admin
    // (i.e. still a site client). Real-coach clients are untouchable.
    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", current.coach_id)
      .maybeSingle();
    if (owner?.role !== "admin") {
      return NextResponse.json(
        { error: "already_has_coach", message: "لديك مدرب بالفعل" },
        { status: 409 },
      );
    }
  }

  // Assign / reassign to the claiming coach.
  const { error } = await supabaseAdmin.from("coach_assignments").upsert(
    {
      client_id: auth.id,
      coach_id: coachId,
      assigned_by: coachId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    coach_id: coachId,
    coach_name: coachProf.full_name ?? null,
  });
}
