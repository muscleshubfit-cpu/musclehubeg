import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

/**
 * ADMIN EXTERNAL PLANS — Phase 71 (owner request 2026-09-01):
 * «ضيف فى داشبورد الادمن طريقى توليد خطط تدريب وتغذية خارج الاعضاء
 *  مع كتابة التفاصيل يدوى»
 *
 * Manual training/nutrition plans for people who are NOT members.
 * Every verb is admin-only (requireAdmin) and hits the DB through the
 * service-role client; the external_plans RLS (0058) is the second
 * layer of defense — is_admin() only.
 *
 * UNLIMITED: no caps, no quotas (owner decree «الادمن بلا حدود»).
 *
 * GET    /api/admin/external-plans?type=workout|meal|all&q=<search>
 *        &status=draft|final|all&offset=0&limit=50
 * POST   { person_name, person_contact?, plan_type, title, text, notes?, status? }
 * PATCH  { id, person_name?, person_contact?, plan_type?, title?, text?, notes?, status? }
 * DELETE /api/admin/external-plans?id=<uuid>
 */

const MAX_TEXT = 100_000;
const MAX_SHORT = 200;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: "bad_request", message }, { status });
}

function extractText(content: unknown): string {
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text: unknown }).text ?? "");
  }
  return "";
}

export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const status = searchParams.get("status") || "all";
  const q = (searchParams.get("q") || "").trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100), 500);

  let query = supabaseAdmin
    .from("external_plans")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type === "workout" || type === "meal") {
    query = query.eq("plan_type", type);
  }
  if (status === "draft" || status === "final") {
    query = query.eq("status", status);
  }
  if (q) {
    // Search by person name OR title (case-insensitive)
    query = query.or(`person_name.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[api/admin/external-plans] GET failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plans = (data || []).map((row) => {
    const r = row as Record<string, unknown>;
    return { ...r, text: extractText(r.content) };
  });

  return NextResponse.json({
    plans,
    total: count ?? 0,
    offset,
    limit,
    // Owner decree: this tool has NO caps
    unlimited: true,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const personName = String(body.person_name ?? "").trim();
  const personContact = String(body.person_contact ?? "").trim().slice(0, MAX_SHORT) || null;
  const planType = String(body.plan_type ?? "").trim();
  const title = String(body.title ?? "").trim();
  const text = String(body.text ?? "").slice(0, MAX_TEXT).trim();
  const notes = String(body.notes ?? "").trim().slice(0, MAX_SHORT) || null;
  const status = String(body.status ?? "final").trim() === "draft" ? "draft" : "final";

  if (personName.length < 2 || personName.length > MAX_SHORT) {
    return bad("اسم الشخص مطلوب (من حرفين لحد 200 حرف)");
  }
  if (planType !== "workout" && planType !== "meal") {
    return bad("نوع الخطة لازم يكون workout أو meal");
  }
  if (title.length < 3 || title.length > MAX_SHORT) {
    return bad("عنوان الخطة مطلوب (من 3 لحد 200 حرف)");
  }
  if (text.length < 10) {
    return bad("اكتب تفاصيل الخطة (10 أحرف على الأقل)");
  }

  const { data, error } = await supabaseAdmin
    .from("external_plans")
    .insert({
      person_name: personName,
      person_contact: personContact,
      plan_type: planType,
      title,
      notes,
      content: { text },
      status,
      created_by: auth.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[api/admin/external-plans] POST failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({ ok: true, plan: { ...row, text: extractText(row.content) } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return bad("id مطلوب");

  const update: Database["public"]["Tables"]["external_plans"]["Update"] = {};

  if (body.person_name !== undefined) {
    const v = String(body.person_name).trim();
    if (v.length < 2 || v.length > MAX_SHORT) return bad("اسم الشخص غير صالح");
    update.person_name = v;
  }
  if (body.person_contact !== undefined) {
    update.person_contact = String(body.person_contact).trim().slice(0, MAX_SHORT) || null;
  }
  if (body.plan_type !== undefined) {
    const v = String(body.plan_type).trim();
    if (v !== "workout" && v !== "meal") return bad("نوع الخطة غير صالح");
    update.plan_type = v;
  }
  if (body.title !== undefined) {
    const v = String(body.title).trim();
    if (v.length < 3 || v.length > MAX_SHORT) return bad("عنوان الخطة غير صالح");
    update.title = v;
  }
  if (body.text !== undefined) {
    const v = String(body.text).slice(0, MAX_TEXT).trim();
    if (v.length < 10) return bad("تفاصيل الخطة قصيرة جدًا");
    update.content = { text: v };
  }
  if (body.notes !== undefined) {
    update.notes = String(body.notes).trim().slice(0, MAX_SHORT) || null;
  }
  if (body.status !== undefined) {
    const v = String(body.status).trim();
    if (v !== "draft" && v !== "final") return bad("الحالة غير صالحة");
    update.status = v;
  }

  if (Object.keys(update).length === 0) {
    return bad("مفيش حاجة للتحديث");
  }

  const { data, error } = await supabaseAdmin
    .from("external_plans")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[api/admin/external-plans] PATCH failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({ ok: true, plan: { ...row, text: extractText(row.content) } });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return bad("id مطلوب");

  const { error } = await supabaseAdmin
    .from("external_plans")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[api/admin/external-plans] DELETE failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
