// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/admin
 *
 * Server-side endpoint for creating admin notifications.
 *
 * Why this exists: the client-side createAdminNotification() function
 * calls supabase.from("admin_notifications").insert() directly. But
 * the RLS policy on admin_notifications only allows coaches to insert
 * (public.is_coach() check). This means when a regular client user
 * triggers an event that should notify the coach (new signup, new
 * questionnaire, new ticket, new payment request), the insert silently
 * fails because the client's auth.uid() is not a coach.
 *
 * This endpoint solves it by:
 *   1. Verifying the caller is authenticated (requireUser)
 *   2. Using supabaseAdmin (service_role key) to insert — bypasses RLS
 *
 * Body:
 *   { type: string, title: string, body: string, link?: string }
 *
 * Returns:
 *   { ok: true, id: string } on success
 *   { error: string } on failure
 */
export async function POST(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.json({ ok: true, demo: true });
  }

  // Require authentication — any logged-in user can create admin notifs
  // (the calling code decides when it's appropriate to notify the coach)
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin not configured" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { type, title, body: notifBody, link } = body;

  if (!type || !title) {
    return NextResponse.json(
      { error: "Missing type or title" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .insert({
      type,
      title,
      body: notifBody || null,
      link: link || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/notifications/admin] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
