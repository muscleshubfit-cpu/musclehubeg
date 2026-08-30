import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — ACCOUNTS MANAGER (0045).
 * Owner request: «ضيف فى داشبورد الادمن طريقة للتعليم على الحسابات وزرار مسح»
 *   - GET    → every profile (id, name, email, role, test flag, created)
 *   - PATCH  → toggle the test-account flag: { user_id, is_test_account }
 *              (writes profiles.is_test_account — migration 0045 Part B)
 *   - DELETE → permanently delete an account: { user_id }
 *
 * DELETE uses auth.admin.deleteUser (service role) — auth.users is the
 * cascade root: profiles.id → auth.users ON DELETE CASCADE, and every
 * client-data table FKs → profiles with ON DELETE CASCADE (34 refs:
 * subscriptions, subscription_requests, notifications, plans,
 * coach_assignments both directions, wallets, ledger, referrals, …).
 * A few audit columns are ON DELETE SET NULL (assigned_by, referred_id,
 * changed_by) — intentional, history survives the user.
 *
 * Guards (DELETE):
 *   - an admin can never delete himself (self-lockout)
 *   - admin accounts are not deletable from this surface
 * All three verbs are admin-exclusive (requireAdmin — a coach gets 403).
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
    .select("id, full_name, email, role, is_test_account, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    // Pre-0045 live DB: column missing → owner must run migration 0045.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ accounts: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const userId = String(body.user_id ?? "");
  const isTest = body.is_test_account;

  if (!userId || typeof isTest !== "boolean") {
    return NextResponse.json(
      { error: "bad_request", message: "user_id و is_test_account مطلوبان" },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_test_account: isTest })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
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
  const userId = String(body.user_id ?? "");

  if (!userId) {
    return NextResponse.json(
      { error: "bad_request", message: "user_id مطلوب" },
      { status: 400 },
    );
  }

  // GUARD 1 — never delete yourself (self-lockout would orphan the admin
  // session and cascade-delete the admin's own profile data mid-flight).
  if (adminId && userId === adminId) {
    return NextResponse.json(
      { error: "self_delete", message: "لا يمكنك حذف حسابك بنفسك" },
      { status: 400 },
    );
  }

  // GUARD 2 — admin accounts are protected (the owner promotes admins;
  // demotion/removal is a deliberate console-level operation, not a
  // one-click surface action).
  const { data: target, error: targetErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (targetErr) {
    return NextResponse.json({ error: targetErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json(
      { error: "not_found", message: "الحساب غير موجود" },
      { status: 404 },
    );
  }
  if ((target as { role: string }).role === "admin") {
    return NextResponse.json(
      { error: "admin_protected", message: "حسابات الأدمن محمية — لا تُحذف من هنا" },
      { status: 403 },
    );
  }

  // Cascade root deletion (auth.users → profiles → client data).
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: userId });
}
