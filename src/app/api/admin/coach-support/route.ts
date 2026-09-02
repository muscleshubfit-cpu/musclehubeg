import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN side of the COACH → SITE SUPPORT CHANNEL (0037).
 *
 * GET  /api/admin/coach-support → all coach threads (with coach names)
 * POST /api/admin/coach-support { parent_id, body, close? }
 *      → admin reply + parent status update + coach notification
 *
 * Admin-only (requireUser + role check — mirrors the other /api/admin/*
 * routes). Replies are inserted service-side with sender_role='admin'.
 */

const MAX_BODY = 4000;

async function requireAdmin(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== "admin") {
    return NextResponse.json(
      { error: "forbidden", message: "للمشرفين فقط" },
      { status: 403 },
    );
  }
  return auth;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("coach_support_messages")
    .select("id, coach_id, parent_id, sender_role, subject, body, status, created_at")
    .order("created_at", { ascending: true })
    .limit(400);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      return NextResponse.json({ threads: [], migration_missing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const coachIds = Array.from(
    new Set(rows.map((r) => String(r.coach_id))),
  );
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", coachIds);
  const names = new Map(
    ((profs ?? []) as unknown as Array<Record<string, unknown>>).map((p) => [
      String(p.id),
      { name: (p.full_name as string) || "", email: (p.email as string) || "" },
    ]),
  );

  const threads = rows
    .filter((r) => !r.parent_id)
    .map((parent) => ({
      id: String(parent.id),
      coach_id: String(parent.coach_id),
      coach_name: names.get(String(parent.coach_id))?.name || "",
      coach_email: names.get(String(parent.coach_id))?.email || "",
      subject: String(parent.subject ?? ""),
      body: String(parent.body ?? ""),
      status: String(parent.status ?? "open"),
      created_at: String(parent.created_at),
      messages: rows
        .filter((r) => r.parent_id === parent.id)
        .map((r) => ({
          id: String(r.id),
          sender_role: String(r.sender_role),
          body: String(r.body ?? ""),
          created_at: String(r.created_at),
        })),
    }))
    .reverse(); // newest first

  return NextResponse.json({ threads });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const parentId = String(body.parent_id ?? "").trim();
  const text = String(body.body ?? "").trim().slice(0, MAX_BODY);
  const close = Boolean(body.close);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(parentId) || !text) {
    return NextResponse.json(
      { error: "bad_request", message: "اكتب ردك الأول" },
      { status: 400 },
    );
  }

  const { data: parent } = await supabaseAdmin
    .from("coach_support_messages")
    .select("id, coach_id, status")
    .eq("id", parentId)
    .maybeSingle();
  if (!parent) {
    return NextResponse.json(
      { error: "not_found", message: "الرسالة غير موجودة" },
      { status: 404 },
    );
  }

  const { error: insertErr } = await supabaseAdmin
    .from("coach_support_messages")
    .insert({
      coach_id: parent.coach_id,
      parent_id: parentId,
      sender_role: "admin",
      subject: "",
      body: text,
      status: "answered",
    });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("coach_support_messages")
    .update({ status: close ? "closed" : "answered" })
    .eq("id", parentId);

  // The coach hears about the reply instantly.
  await supabaseAdmin.from("notifications").insert({
    user_id: parent.coach_id,
    type: "coach_support_reply",
    title: "رد فريق الدعم على رسالتك",
    body: text.slice(0, 200),
    link: "/coach/help",
  });

  return NextResponse.json({ ok: true });
}
