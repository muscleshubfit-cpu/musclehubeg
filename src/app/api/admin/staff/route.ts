import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * TEAM MANAGEMENT — admin adds / removes COACHES on the site
 * (owner feedback «ما فيش طريقه لتعيين المدرب نفسه بمعنى اخر اضافه
 * مدرب للموقع»: until now the ONLY way to create a coach was manual
 * SQL — insert into coach_emails + update profiles.role).
 *
 * POST  /api/admin/staff   { email, full_name? }
 *   → adds a coach, two automatic paths:
 *     • "invited"  — email NOT on the platform yet: Supabase sends an
 *       invite link (the coach sets his own password). The
 *       on_auth_user_created trigger creates the profile; we then set
 *       role='coach' server-side (service role bypasses the 0017 RLS
 *       that blocks client-side role changes).
 *     • "promoted" — email already registered as a CLIENT: flipped to
 *       coach instantly, no email needed.
 *   In BOTH paths the email is added to the coach_emails allowlist so
 *   auto_promote_coach_if_allowed() keeps protecting the role on every
 *   future login (migration 0017 law).
 *
 * PATCH /api/admin/staff   { user_id, action: "demote" }
 *   → coach back to client. Blocked while he still has assigned
 *     clients (reassign them first) and impossible for admins.
 *
 * Admin-exclusive (requireAdmin) — a plain coach gets 403.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://alkemos.com"
  ).replace(/\/$/, "");
}

/** Allowlist upsert — keeps the 0017 auto-promote protection alive. */
async function allowlistCoach(email: string) {
  await supabaseAdmin!
    .from("coach_emails")
    .upsert({ email: email.toLowerCase() }, { onConflict: "email" });
}

/**
 * Customer DB (Phase 73 — owner request «كل اعضاء الموقع المسجلين
 * (اعضاء او مدربين) في قاعدة العملاء»): the 0060 trigger files every new
 * account as type='member'; when the account is a COACH the label is
 * upgraded here. Failures are logged and NEVER block the admin action.
 */
async function markSignupLeadCoach(email: string) {
  try {
    const db = supabaseAdmin!;
    const mail = email.toLowerCase();
    const { data: lead } = await db
      .from("tool_leads")
      .select("id")
      .eq("email", mail)
      .eq("tool_slug", "signup")
      .maybeSingle();
    if (lead) {
      await db.from("tool_leads").update({ type: "coach" }).eq("id", lead.id);
      return;
    }
    const { error } = await db.from("tool_leads").insert({
      tool_slug: "signup",
      email: mail,
      type: "coach",
      lang: "ar",
      consent: true,
    });
    if (error) {
      console.error("[admin/staff] customer-DB lead error:", error.message);
    }
  } catch (e) {
    console.error("[admin/staff] customer-DB lead exception:", e instanceof Error ? e.message : e);
  }
}

/** Local mirror of isAuthConfigured (same expression as auth-server). */
function isAuthConfiguredSafe(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return Boolean(url && key && url.startsWith("http"));
}

export async function POST(request: NextRequest) {
  if (isAuthConfiguredSafe()) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

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

  // Existing profile? (case-insensitive)
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, full_name")
    .ilike("email", email)
    .maybeSingle();

  if (existing && existing.role !== "client") {
    return NextResponse.json(
      {
        error: "already_staff",
        message:
          existing.role === "admin"
            ? "هذا الإيميل أدمن بالفعل"
            : "هذا الإيميل مدرب بالفعل",
      },
      { status: 409 },
    );
  }

  // ---------- Path 1: existing CLIENT → promote instantly ----------
  if (existing) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "coach" })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await allowlistCoach(email);
    await markSignupLeadCoach(email);
    return NextResponse.json({ ok: true, action: "promoted", email });
  }

  // ---------- Path 2: brand-new email → send Supabase invite ----------
  const redirectTo = `${siteUrl()}/auth?next=/coach`;
  const { data: invited, error: inviteErr } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: fullName ? { full_name: fullName } : undefined,
      redirectTo,
    });

  if (inviteErr || !invited?.user) {
    // 422 "already been registered" → auth user exists but NO profile
    // row (trigger never fired for him). Re-check once, then be honest.
    const { data: recheck } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .ilike("email", email)
      .maybeSingle();
    if (recheck && recheck.role === "client") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: "coach" })
        .eq("id", recheck.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await allowlistCoach(email);
      await markSignupLeadCoach(email);
      return NextResponse.json({ ok: true, action: "promoted", email });
    }
    const registered =
      inviteErr?.status === 422 || /already/i.test(inviteErr?.message ?? "");
    return NextResponse.json(
      {
        error: registered ? "auth_exists_no_profile" : "invite_failed",
        message: registered
          ? "هذا الإيميل مسجل في نظام الدخول لكن بدون ملف — احذفه من Supabase Auth ثم أعد الدعوة"
          : `فشل إرسال الدعوة: ${inviteErr?.message ?? "سبب غير معروف"}`,
      },
      { status: registered ? 409 : 502 },
    );
  }

  // Trigger should have created the profile as 'client' — flip it to
  // coach. If the trigger never ran (fresh env), create the row here.
  const userId = invited.user.id;
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (prof) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "coach", ...(fullName ? { full_name: fullName } : {}) })
      .eq("id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: fullName ?? email,
        role: "coach",
      },
      { onConflict: "id" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await allowlistCoach(email);
  await markSignupLeadCoach(email);
  return NextResponse.json({ ok: true, action: "invited", email });
}

export async function PATCH(request: NextRequest) {
  if (isAuthConfiguredSafe()) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const userId = String(body.user_id ?? "");
  const action = String(body.action ?? "");

  if (!userId || action !== "demote") {
    return NextResponse.json(
      { error: "bad_request", message: "user_id و action='demote' مطلوبان" },
      { status: 400 },
    );
  }

  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json(
      { error: "not_found", message: "الحساب غير موجود" },
      { status: 404 },
    );
  }
  if (target.role === "admin") {
    return NextResponse.json(
      { error: "cannot_demote_admin", message: "لا يمكن تحويل أدمن إلى عميل" },
      { status: 409 },
    );
  }
  if (target.role !== "coach") {
    return NextResponse.json(
      { error: "not_a_coach", message: "الحساب ليس مدربًا" },
      { status: 409 },
    );
  }

  // Safety: a coach with assigned clients must be emptied first —
  // demoting silently would orphan the 1:1 assignments (0030 law).
  const { count } = await supabaseAdmin
    .from("coach_assignments")
    .select("client_id", { count: "exact", head: true })
    .eq("coach_id", userId);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "coach_has_clients",
        count,
        message: `عليه ${count} عميل — أعد تعيين عملائه أولًا من نفس الصفحة قبل تحويله لعميل`,
      },
      { status: 409 },
    );
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role: "client" })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove from the allowlist so auto_promote_coach_if_allowed()
  // doesn't flip him back to coach on his next login.
  if (target.email) {
    await supabaseAdmin
      .from("coach_emails")
      .delete()
      .eq("email", target.email.toLowerCase());
  }

  return NextResponse.json({ ok: true });
}
