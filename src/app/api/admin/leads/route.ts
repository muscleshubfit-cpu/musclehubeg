import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * GET /api/admin/leads?tool=calorie-calculator
 *
 * Returns all tool leads, optionally filtered by tool_slug.
 * Uses the service-role key to bypass RLS (the caller is verified
 * as a coach via requireCoach before we get here).
 */
export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const tool = searchParams.get("tool");

  let q = supabaseAdmin
    .from("tool_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (tool && tool !== "all") {
    q = q.eq("tool_slug", tool as any);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

/**
 * PATCH /api/admin/leads
 *
 * Update a lead's contacted/converted flags.
 * Body: { id: string, contacted?: boolean, converted?: boolean }
 */
export async function PATCH(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { id, contacted, converted } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const update: Record<string, boolean> = {};
  if (typeof contacted === "boolean") update.contacted = contacted;
  if (typeof converted === "boolean") update.converted = converted;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tool_leads")
    .update(update as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

/**
 * DELETE /api/admin/leads?id=<uuid>
 *
 * Delete a lead (GDPR / right-to-erasure).
 * M24 fix: previously no DELETE endpoint existed — PII could not be purged.
 */
export async function DELETE(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("tool_leads")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
