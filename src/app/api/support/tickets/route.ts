import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * STAFF side of CLIENT support tickets (Phase 55 fix).
 *
 * Owner report (2026-08-31): «رسائل الدعم لا تصل الى صندوق الدعم ، فقط
 * يصل اشعار بها» — the ticket WAS saved and the notification WAS created
 * (both fine), but the inbox at /coach/support read support_tickets
 * DIRECTLY from the browser (supabase-js + RLS + a named-FK embed).
 * Any failure there (RLS function missing, FK embed name mismatch, …)
 * silently returned [] → empty inbox. Notifications kept arriving.
 *
 * Fix: staff reads/writes now run SERVER-side through this route with
 * the service key (mirrors /api/admin/coach-support). No migration, no
 * RLS dependence, no embed-name dependence.
 *
 * GET  /api/support/tickets                 → list tickets
 *        admin  → ALL tickets
 *        coach  → tickets of his assigned clients only
 * GET  /api/support/tickets?ticketId=<uuid> → one ticket's messages
 * POST /api/support/tickets                 → staff reply / status change
 *        { ticketId, body?, status? }
 *
 * A reply sets the ticket to "pending" (client's cue that staff answered,
 * same rule as the M19 client-side fix) and notifies the client's bell.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 4000;
const TICKET_LIMIT = 300;

async function requireStaff(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== "admin" && auth.role !== "coach") {
    return NextResponse.json(
      { error: "forbidden", message: "للفريق فقط" },
      { status: 403 },
    );
  }
  return auth;
}

export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ticketId = request.nextUrl.searchParams.get("ticketId");

  // ---- single ticket's messages ----
  if (ticketId) {
    if (!UUID_RE.test(ticketId)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    // Coach may only open his own clients' tickets; admin opens any.
    if (auth.role !== "admin") {
      const { data: tk } = await supabaseAdmin
        .from("support_tickets")
        .select("client_id")
        .eq("id", ticketId)
        .maybeSingle();
      const clientId = (tk as { client_id?: string } | null)?.client_id;
      if (!clientId) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const { data: asg } = await supabaseAdmin
        .from("coach_assignments")
        .select("client_id")
        .eq("coach_id", auth.id)
        .eq("client_id", clientId)
        .maybeSingle();
      if (!asg) {
        return NextResponse.json(
          { error: "forbidden", message: "هذا العميل غير مخصص لك" },
          { status: 403 },
        );
      }
    }
    const { data, error } = await supabaseAdmin
      .from("ticket_messages")
      .select("id, ticket_id, sender_id, body, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages: data ?? [] });
  }

  // ---- ticket list ----
  let query = supabaseAdmin
    .from("support_tickets")
    .select("id, client_id, subject, status, priority, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(TICKET_LIMIT);

  if (auth.role !== "admin") {
    const { data: asgs, error: asgErr } = await supabaseAdmin
      .from("coach_assignments")
      .select("client_id")
      .eq("coach_id", auth.id);
    if (asgErr) {
      return NextResponse.json({ error: asgErr.message }, { status: 500 });
    }
    const clientIds = Array.from(
      new Set(((asgs ?? []) as { client_id: string }[]).map((a) => String(a.client_id))),
    );
    if (clientIds.length === 0) {
      return NextResponse.json({ tickets: [] });
    }
    query = query.in("client_id", clientIds);
  }

  const { data: tickets, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve client names manually — no PostgREST embed, nothing to miss.
  const rows = (tickets ?? []) as Array<Record<string, unknown>>;
  const clientIds = Array.from(new Set(rows.map((r) => String(r.client_id))));
  const names = new Map<string, { name: string; email: string }>();
  if (clientIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    for (const p of ((profs ?? []) as unknown as Array<Record<string, unknown>>)) {
      names.set(String(p.id), {
        name: (p.full_name as string) || "",
        email: (p.email as string) || "",
      });
    }
  }

  const out = rows.map((r) => ({
    id: String(r.id),
    client_id: String(r.client_id),
    subject: String(r.subject ?? ""),
    status: String(r.status ?? "open"),
    priority: String(r.priority ?? "normal"),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? r.created_at ?? ""),
    profiles: names.get(String(r.client_id)) ?? { name: "", email: "" },
  }));

  return NextResponse.json({ tickets: out });
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const ticketId = String(body.ticketId ?? "").trim();
  const text = String(body.body ?? "").trim().slice(0, MAX_BODY);
  const status = String(body.status ?? "").trim();
  const wantsReply = text.length > 0;
  const wantsStatus = status.length > 0;

  if (!UUID_RE.test(ticketId) || (!wantsReply && !wantsStatus)) {
    return NextResponse.json(
      { error: "bad_request", message: "لا يوجد رد أو تغيير حالة" },
      { status: 400 },
    );
  }
  if (wantsStatus && !["open", "pending", "closed"].includes(status)) {
    return NextResponse.json({ error: "bad_request", message: "حالة غير معروفة" }, { status: 400 });
  }

  const { data: parent } = await supabaseAdmin
    .from("support_tickets")
    .select("id, client_id, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (!parent) {
    return NextResponse.json(
      { error: "not_found", message: "التذكرة غير موجودة" },
      { status: 404 },
    );
  }
  const clientId = (parent as { client_id: string }).client_id;

  // Coaches stay scoped to their own clients even when writing.
  if (auth.role !== "admin") {
    const { data: asg } = await supabaseAdmin
      .from("coach_assignments")
      .select("client_id")
      .eq("coach_id", auth.id)
      .eq("client_id", clientId)
      .maybeSingle();
    if (!asg) {
      return NextResponse.json(
        { error: "forbidden", message: "هذا العميل غير مخصص لك" },
        { status: 403 },
      );
    }
  }

  if (wantsReply) {
    const { error: insertErr } = await supabaseAdmin
      .from("ticket_messages")
      .insert({ ticket_id: ticketId, sender_id: auth.id, body: text });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  // Reply → "pending" (client sees staff answered); explicit status wins.
  const nextStatus = wantsStatus
    ? (status as "open" | "pending" | "closed")
    : wantsReply
      ? "pending"
      : null;
  await supabaseAdmin
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString(), ...(nextStatus ? { status: nextStatus } : {}) })
    .eq("id", ticketId);

  // Ring the client's bell so he knows staff replied.
  if (wantsReply) {
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: clientId,
        type: "support_reply",
        title: "رد جديد على تذكرة الدعم",
        body: text.slice(0, 200),
        link: "/support",
      })
      .then(undefined, () => {}); // never block the reply on the bell
  }

  return NextResponse.json({ ok: true });
}
