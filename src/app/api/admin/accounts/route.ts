import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authRequired } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — ACCOUNTS MANAGER (0045).
 * Owner request: «ضيف فى داشبورد الادمن طريقة للتعليم على الحسابات وزرار مسح»
 *   - GET    → every profile (id, name, email, role, test flag, created)
 *   - PATCH  → toggle the test-account flag: { user_id, is_test_account }
 *              (writes profiles.is_test_account — migration 0045 Part B)
 *   - DELETE → permanently delete account(s):
 *              { user_id }             single (legacy shape)
 *              { user_ids: [ … ] }     batch — mobile bulk «delete selected»
 *              Each id goes through the same guards; protected ones are
 *              SKIPPED (not fatal) so one bad row never blocks the batch.
 *              Response: { ok, deleted: [], skipped: [{id, reason}], failed: [{id, error}] }
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
  if (authRequired) {
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
  if (authRequired) {
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
  if (authRequired) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
    adminId = auth.id;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));

  // Normalize input — single { user_id } or batch { user_ids: [...] }.
  const rawIds: string[] = Array.isArray(body.user_ids)
    ? (body.user_ids as unknown[]).map((v) => String(v ?? "")).filter(Boolean)
    : [String(body.user_id ?? "")].filter(Boolean);

  if (rawIds.length === 0) {
    return NextResponse.json(
      { error: "bad_request", message: "user_id مطلوب" },
      { status: 400 },
    );
  }
  if (rawIds.length > 100) {
    return NextResponse.json(
      { error: "bad_request", message: "الحد الأقصى 100 حساب في المرة الواحدة" },
      { status: 400 },
    );
  }

  // Per-id result buckets — a protected/missing account is SKIPPED, not fatal,
  // so one bad row never blocks the rest of the batch.
  const deleted: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const userId of rawIds) {
    // GUARD 1 — never delete yourself (self-lockout would orphan the admin
    // session and cascade-delete the admin's own profile data mid-flight).
    if (adminId && userId === adminId) {
      skipped.push({ id: userId, reason: "self_delete" });
      continue;
    }

    // GUARD 2 — admin accounts are protected (the owner promotes admins;
    // demotion/removal is a deliberate console-level operation, not a
    // one-click surface action).
    const { data: target, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (targetErr) {
      failed.push({ id: userId, error: targetErr.message });
      continue;
    }
    if (!target) {
      skipped.push({ id: userId, reason: "not_found" });
      continue;
    }
    if ((target as { role: string }).role === "admin") {
      skipped.push({ id: userId, reason: "admin_protected" });
      continue;
    }

    // Cascade root deletion (auth.users → profiles → client data).
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) {
      failed.push({ id: userId, error: delErr.message });
    } else {
      deleted.push(userId);
    }
  }

  return NextResponse.json({ ok: failed.length === 0, deleted, skipped, failed });
}
