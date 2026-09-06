import { NextRequest, NextResponse } from "next/server";
import { requireCoach, authRequired, type AuthUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * POST /api/notifications/broadcast
 *
 * Staff endpoint to send notifications to:
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
 *
 * MULTI-COACH SCOPING (owner answer 1/7, 2026-08-29): a plain coach
 * can only message HIS assigned clients (coach_assignments). "all"
 * means all-of-MY-clients for a coach, all site clients for the
 * admin. Targets outside the coach's roster are rejected with 403.
 */
export async function POST(request: NextRequest) {
  let caller: AuthUser | null = null;
  if (authRequired) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
    caller = auth;
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

  // --- Multi-coach scoping: resolve the caller's client roster ---
  // (caller is non-null when authRequired — requireCoach passed;
  // in demo mode there is no session and the route degrades as before)
  const isAdmin = caller?.role === "admin";
  const callerId = caller?.id ?? null;

  let allowedClientIds: Set<string> | null = null; // null = unrestricted (admin)
  if (!isAdmin && callerId) {
    const { data: assigned } = await supabaseAdmin
      .from("coach_assignments")
      .select("client_id")
      .eq("coach_id", callerId);
    allowedClientIds = new Set(((assigned ?? []) as { client_id: string }[]).map((r) => r.client_id));
  }

  const ensureAllowed = (clientId: string) =>
    !allowedClientIds || allowedClientIds.has(clientId);

  // --- Single client ---
  if (target === "single") {
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId for single target" },
        { status: 400 },
      );
    }
    if (!ensureAllowed(userId)) {
      return NextResponse.json(
        { error: "Forbidden — client is not assigned to you" },
        { status: 403 },
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
    const requested = userIds.slice(0, 500) as string[];
    const ids = allowedClientIds
      ? requested.filter((uid: string) => allowedClientIds!.has(uid))
      : requested;
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Forbidden — none of the selected clients are assigned to you" },
        { status: 403 },
      );
    }
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

  // --- Broadcast to ALL clients ("all" = my clients for a plain coach) ---
  let clientsQuery = supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "client");
  if (allowedClientIds) {
    if (allowedClientIds.size === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "No assigned clients" });
    }
    clientsQuery = clientsQuery.in("id", [...allowedClientIds]);
  }
  const { data: clients, error: clientsError } = await clientsQuery;

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 500 });
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No clients found" });
  }

  // Bulk insert notifications for all clients — M22 fix: batch in chunks of 500
  // to avoid Supabase's insert limit + partial failure on large client lists.
  const notifications = clients.map((c: { id: string }) => ({
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