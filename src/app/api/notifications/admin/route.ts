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
 *   2. Validating the notification type against a strict allowlist
 *   3. Using supabaseAdmin (service_role key) to insert — bypasses RLS
 *
 * Security: the `type` field is validated against ALLOWED_TYPES to
 * prevent arbitrary notification injection. `title` and `body` are
 * length-capped to prevent abuse.
 *
 * Body:
 *   { type: string, title: string, body: string, link?: string }
 *
 * Returns:
 *   { ok: true, id: string } on success
 *   { error: string } on failure
 */

const ALLOWED_TYPES = new Set([
  "new_client",
  "new_ticket",
  "plan_approved",
  "questionnaire_submitted",
  "payment_request",
]);

const MAX_TITLE_LEN = 200;
const MAX_BODY_LEN = 1000;
const MAX_LINK_LEN = 200;

export async function POST(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.json({ ok: true, demo: true });
  }

  // Require authentication — any logged-in user can create admin notifs
  // for legitimate event types (validated against ALLOWED_TYPES below)
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

  // Validate type against allowlist — prevents arbitrary notification injection
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Invalid notification type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` },
      { status: 400 },
    );
  }

  // Length-cap fields to prevent abuse
  const safeTitle = String(title).slice(0, MAX_TITLE_LEN);
  const safeBody = notifBody ? String(notifBody).slice(0, MAX_BODY_LEN) : null;
  const safeLink = link ? String(link).slice(0, MAX_LINK_LEN) : null;

  const { data, error } = await supabaseAdmin
    .from("admin_notifications")
    .insert({
      type,
      title: safeTitle,
      body: safeBody,
      link: safeLink,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/notifications/admin] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
