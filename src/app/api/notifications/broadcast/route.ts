import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/broadcast
 *
 * Coach-only endpoint to send notifications to:
 *   - ALL clients (target: "all")
 *   - SELECTED clients (target: "selected", userIds: string[])
 *   - A SINGLE client (target: "single", userId: string)
 *
 * Body:
 *   { target: "all" | "selected" | "single", userId?: string, userIds?: string[],
 *     title: string, body: string, link?: string }
 *
 * Uses supabaseAdmin (service_role) to bypass RLS and insert
 * notifications for all targeted clients at once.
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
  const { target, userId, userIds, title, body: notifBody, link } = body;

  if (!title || !notifBody) {
    return NextResponse.json(
      { error: "Missing title or body" },
      { status: 400 },
    );
  }

  if (!target || !["all", "selected", "single"].includes(target)) {
    return NextResponse.json(
      { error: "Invalid target. Must be 'all', 'selected', or 'single'" },
      { status: 400 },
    );
  }

  // --- Single client ---
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

  // --- Selected clients (multi-select) ---
  if (target === "selected") {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Missing userIds array for selected target" },
        { status: 400 },
      );
    }
    // Limit to 500 to prevent abuse
    const ids = userIds.slice(0, 500);
    const notifications = ids.map((uid: string) => ({
      user_id: uid,
      type: "coach_message",
      title,
      body: notifBody,
      link: link || "/dashboard",
    }));
    const { error } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sent: notifications.length });
  }

  // --- Broadcast to ALL clients ---
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

  // Bulk insert notifications for all clients — M22 fix: batch in chunks of 500
  // to avoid Supabase's insert limit + partial failure on large client lists.
  const notifications = clients.map((c: any) => ({
    user_id: c.id,
    type: "coach_broadcast",
    title,
    body: notifBody,
    link: link || "/dashboard",
  }));

  const BATCH_SIZE = 500;
  let totalInserted = 0;
  let lastError: string | null = null;

  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    const { error: batchError } = await supabaseAdmin
      .from("notifications")
      .insert(batch);
    if (batchError) {
      lastError = batchError.message;
      console.error(`[broadcast] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError.message);
    } else {
      totalInserted += batch.length;
    }
  }

  if (totalInserted === 0 && lastError) {
    return NextResponse.json({ error: lastError }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sent: totalInserted,
    total: notifications.length,
    ...(lastError ? { partialError: lastError } : {}),
  });
}