import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — MANUAL «COMPLETE YOUR PAGE» REMINDER (Phase 51).
 * Owner request: «اى مدرب يسجل مفروض ينتقل لاعداد صفحتة العامة مع تنبيه
 * جديد بإتمامها، يضاف الى الاشعارات اليدوية للادمن فى صفحة المدربين».
 *
 * POST { coach_id } → a PRIVATE admin_notifications row for that coach
 * (target_coach_id — RLS keeps it invisible to other coaches) nudging
 * him to finish his public page. Pairs with the automatic coach_page_setup
 * bell fired at registration; this is the owner's manual re-reminder.
 *
 * Admin-only (requireAdmin). The insert failure surfaces to the UI so
 * the owner knows the reminder did NOT go out.
 */
export async function POST(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const coachId = String(body.coach_id ?? "").trim();
  if (!coachId) {
    return NextResponse.json(
      { error: "bad_request", message: "coach_id مطلوب" },
      { status: 400 },
    );
  }

  // Only staff own public pages — refuse anything else.
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", coachId)
    .maybeSingle();
  const role = (prof as { role?: string } | null)?.role;
  if (!prof || (role !== "coach" && role !== "admin")) {
    return NextResponse.json(
      { error: "not_found", message: "المدرب غير موجود" },
      { status: 404 },
    );
  }

  const { error } = await supabaseAdmin.from("admin_notifications").insert({
    type: "coach_page_reminder",
    title: "أكمل إعداد صفحتك العامة",
    body: "تذكير من الإدارة: صفحتك العامة لسه محتاجة إكمال — اكتب نبذتك وتخصصاتك واضبط رابطك من «صفحتي العامة».",
    link: "/coach/landing",
    target_role: "coach",
    target_coach_id: coachId,
    read: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
