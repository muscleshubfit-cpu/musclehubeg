import { NextRequest, NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * COACH INVITES HIS OWN CLIENT (owner answer 1 — «الطريقتين»):
 * the coach brings clients either through his landing page (0033
 * attribution via coach_slug metadata) OR by personally inviting an
 * email. This route is path #2.
 *
 * POST /api/coach/clients/invite  { email, full_name? }
 *
 * - requireCoach (staff). A COACH's invite carries coach_id metadata →
 *   the 0033 trigger assigns the new client to HIM. An ADMIN's invite
 *   carries NO coach_id → site client → auto-assigned to the admin.
 * - The invited person receives the standard Supabase invite email and
 *   sets his own password (same flow as the admin add-coach invite).
 * - An email already registered as a CLIENT is REFUSED (409): per the
 *   owner's model coaches have no claim on existing clients — only the
 *   admin can reassign them (admin answer 2). That keeps the affiliate
 *   / site-client pool untouchable by coaches.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://alkemos.com"
  ).replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const auth = await requireCoach(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.full_name ?? "").trim().slice(0, 120) || null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "اكتب بريدًا إلكترونيًا صحيحًا" },
      { status: 400 },
    );
  }

  // Existing profile? Coaches may NOT invite existing clients.
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "already_registered",
        message:
          existing.role === "client"
            ? "هذا الإيميل عميل مسجل بالفعل — الأدمن فقط يمكنه تعيينه لك"
            : "هذا الإيميل من فريق العمل بالفعل",
      },
      { status: 409 },
    );
  }

  // Metadata drives the 0033 trigger: coach → his client; admin → site client.
  const metadata: Record<string, string> = {
    ...(fullName ? { full_name: fullName } : {}),
    ...(auth.role === "coach" ? { coach_id: auth.id } : {}),
  };

  const { data: invited, error: inviteErr } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: metadata,
      redirectTo: `${siteUrl()}/auth?next=/dashboard`,
    });

  if (inviteErr || !invited?.user) {
    return NextResponse.json(
      {
        error: "invite_failed",
        message: `فشل إرسال الدعوة: ${inviteErr?.message ?? "سبب غير معروف"}`,
      },
      { status: 502 },
    );
  }

  const userId = invited.user.id;

  // Safety net: make sure the profile exists and (for coaches) the
  // assignment row exists, in case the trigger hasn't fired yet.
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!prof) {
    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName ?? email,
        role: "client",
      },
      { onConflict: "id" },
    );
  }

  if (auth.role === "coach") {
    await supabaseAdmin
      .from("coach_assignments")
      .upsert(
        {
          client_id: userId,
          coach_id: auth.id,
          assigned_by: auth.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" },
      );
  }

  return NextResponse.json({ ok: true, action: "invited", email });
}
