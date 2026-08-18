// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/broadcast
 *
 * Coach-only endpoint to send notifications to:
 *   - ALL clients (broadcast: { target: "all" })
 *   - A SINGLE client (broadcast: { target: "single", userId: "xxx" })
 *
 * Body:
 *   { target: "all" | "single", userId?: string, title: string, body: string, link?: string }
 *
 * Uses supabaseAdmin (service_role) to bypass RLS and insert
 * notifications for all clients at once.
 */
export async function POST(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin not configured" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { target, userId, title, body: notifBody, link } = body;

  if (!title || !notifBody) {
    return NextResponse.json(
      { error: "Missing title or body" },
      { status: 400 },
    );
  }

  if (target === "single") {
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId for single target" },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        type: "coach_message",
        title,
        body: notifBody,
        link: link || "/dashboard",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sent: 1, id: data?.id });
  }

  // Broadcast to ALL clients
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "client");

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No clients found" });
  }

  // Bulk insert notifications for all clients
  const notifications = clients.map((c: any) => ({
    user_id: c.id,
    type: "coach_broadcast",
    title,
    body: notifBody,
    link: link || "/dashboard",
  }));

  const { error: insertError } = await supabaseAdmin
    .from("notifications")
    .insert(notifications);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: notifications.length });
}
