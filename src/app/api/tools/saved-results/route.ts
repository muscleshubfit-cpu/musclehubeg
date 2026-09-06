import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser, authRequired } from "@/lib/auth-server";

/**
 * GET /api/tools/saved-results
 *   Returns all saved results for the authenticated user.
 *
 * DELETE /api/tools/saved-results?id=xxx
 *   Deletes a specific saved result.
 */

export async function GET(request: NextRequest) {
  if (!authRequired) {
    return NextResponse.json({ results: [] });
  }

  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("saved_results")
    .select("*")
    .eq("user_id", auth.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data || [] });
}

export async function DELETE(request: NextRequest) {
  if (!authRequired) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase
    .from("saved_results")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
