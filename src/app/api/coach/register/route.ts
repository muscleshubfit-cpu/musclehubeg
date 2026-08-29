import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * COACH SELF-REGISTRATION (owner-approved «التسجيل الفورى», 2026-08-29).
 *
 * POST /api/coach/register  { full_name, email, password, phone?, website? }
 *
 * Public, server-mediated signup for COACHES coming from /for-coaches.
 * Complements (does not replace) the existing paths:
 *   - admin adds coach via POST /api/admin/staff (invite / promote)
 *   - clients sign up via supabase.auth.signUp (role stays 'client')
 *
 * SECURITY MODEL:
 *   - Role is NEVER taken from the client: the auth user is created
 *     SERVER-SIDE with plain 'client' metadata, then promoted to coach
 *     here with the service role — same law as /api/admin/staff.
 *   - The email goes into the coach_emails allowlist so the 0017
 *     auto_promote_coach_if_allowed() RPC keeps protecting the role on
 *     every future login.
 *   - email_confirm: true → instant activation (owner decree «فورى»).
 *     The user signs in with the password he just chose — no email round trip.
 *   - Honeypot field `website`: filled → fake success, nothing created.
 *   - Rate limited: 3 attempts / 10 min / IP (in-memory, same pattern
 *     as /api/tools/lead).
 *
 * SIDE EFFECTS (all service-role):
 *   1. auth.users row (trigger handle_new_user creates the profile)
 *   2. coach_emails allowlist upsert
 *   3. profiles.role → 'coach' (update; insert fallback if the trigger
 *      row is missing — mirrors the staff route's repair path)
 *   4. coach_wallets row (balance 0) so /coach/wallet works immediately
 *   5. welcome notification to the coach + admin notification
 *      (type new_coach → /admin/assignments)
 *
 * Migration 0036 hardens handle_new_user() to ignore client-sent role
 * metadata — with a PUBLIC coach funnel open, the old metadata-role
 * trigger would be a self-promotion hole.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN = 2;
const NAME_MAX = 120;
const PASSWORD_MIN = 8;

const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3; // 3 registration attempts per window per IP
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, resetAt: now + RATE_LIMIT_WINDOW };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, resetAt: entry.resetAt };
}

function cleanPhone(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^[+\d][\d\s-]{6,19}$/.test(s)) return null;
  return s.slice(0, 20);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "محاولات كتير — استنى شوية وجرب تاني",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));

  // Honeypot — bots fill every field. Fake success, create nothing.
  const website = String(body.website ?? "").trim();
  if (website) {
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const fullName = String(body.full_name ?? "").trim().slice(0, NAME_MAX);
  const phone = cleanPhone(body.phone);

  if (fullName.length < NAME_MIN) {
    return NextResponse.json(
      { error: "invalid_name", message: "اكتب اسمك الكامل" },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "اكتب بريدًا إلكترونيًا صحيحًا" },
      { status: 400 },
    );
  }
  if (password.length < PASSWORD_MIN) {
    return NextResponse.json(
      {
        error: "weak_password",
        message: "كلمة السر لازم تكون 8 حروف أو أكتر",
      },
      { status: 400 },
    );
  }

  // Already on the platform? (profile = source of truth, mirrors staff route)
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
          "البريد ده مسجل بالفعل — سجّل دخول من صفحة الدخول أو استخدم بريدًا تاني",
      },
      { status: 409 },
    );
  }

  // ---------- Create the auth user SERVER-SIDE (instant confirm) ----------
  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        ...(phone ? { phone } : {}),
        // Deliberately NO role here — role is granted below with the
        // service role (and 0036 makes the trigger ignore it anyway).
        signup_source: "coach_landing",
      },
    });

  if (createErr || !created?.user) {
    const code = (createErr as { code?: string } | null)?.code;
    if (code === "422") {
      // auth user exists but no profile row (trigger never fired for him)
      return NextResponse.json(
        {
          error: "already_registered",
          message: "البريد ده مسجل بالفعل — سجّل دخول أو استخدم بريدًا تاني",
        },
        { status: 409 },
      );
    }
    console.error("[coach/register] createUser error:", createErr?.message);
    return NextResponse.json(
      {
        error: "signup_failed",
        message: "حصلت مشكلة في إنشاء الحساب — جرب تاني",
      },
      { status: 500 },
    );
  }

  const userId = created.user.id;

  // ---------- Allowlist (0017 auto-promote protection on every login) ----------
  await supabaseAdmin
    .from("coach_emails")
    .upsert({ email }, { onConflict: "email" });

  // ---------- Promote profile to coach (service role bypasses RLS) ----------
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ role: "coach" })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (updateErr) {
    console.error("[coach/register] role update error:", updateErr.message);
  } else if (!updated) {
    // Trigger row missing (rare) — insert the profile ourselves.
    const { error: insertErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      email,
      full_name: fullName,
      phone,
      role: "coach",
    });
    if (insertErr) {
      console.error("[coach/register] profile insert error:", insertErr.message);
    }
  }

  // ---------- Wallet (balance 0) so /coach/wallet works right away ----------
  const { error: walletErr } = await supabaseAdmin
    .from("coach_wallets")
    .upsert(
      { coach_id: userId, balance: 0, currency: "EGP" },
      { onConflict: "coach_id" },
    );
  if (walletErr) {
    // 42P01 = 0035 not applied yet — wallet shows zeros lazily, non-fatal.
    const code = (walletErr as { code?: string }).code;
    if (code !== "42P01") {
      console.error("[coach/register] wallet upsert error:", walletErr.message);
    }
  }

  // ---------- Welcome notification (coach bell) ----------
  const { error: notifyErr } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    type: "coach_welcome",
    title: "أهلًا بك كوتش في MuscleHubEG!",
    body:
      "حسابك اتفعّل. ابدأ بإضافة عملائك، حدّد أسعارك بنفسك، وجهّز محفظتك لتفعيل اشتراكاتهم.",
    link: "/coach",
  });
  if (notifyErr) {
    console.error("[coach/register] welcome notification error:", notifyErr.message);
  }

  // ---------- Admin notification (staff inbox) ----------
  const { data: adm } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (adm) {
    const { error: admErr } = await supabaseAdmin
      .from("admin_notifications")
      .insert({
        type: "new_coach",
        title: "مدرب جديد سجّل بنفسه",
        body: `${fullName} (${email}) انضم كمدرب عبر صفحة انضم-لنا.`,
        link: "/admin/assignments",
        target_role: "coach",
        target_coach_id: (adm as { id: string }).id,
      });
    if (admErr) {
      console.error("[coach/register] admin notification error:", admErr.message);
    }
  }

  return NextResponse.json({ ok: true });
}
