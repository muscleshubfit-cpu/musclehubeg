import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, authRequired } from "@/lib/auth-server";
import type { Database } from "@/lib/supabase/types";

// tool_slug is a DB enum (check constraint) — this union is its mirror.
type SavedToolSlug = Database["public"]["Tables"]["saved_results"]["Row"]["tool_slug"];

/**
 * GET /api/admin/saved-results
 *
 * Returns saved tool results across ALL users (for coaches/admins).
 *
 * Query params:
 *   ?tool=calorie-calculator  — filter by tool
 *   ?limit=50                 — default 100, max 500
 *   ?offset=0
 *
 * Response shape:
 *   {
 *     results: Array<{
 *       id, tool_slug, title, result_data, created_at,
 *       user_id, user_email, user_name
 *     }>,
 *     total: number
 *   }
 */
export async function GET(request: NextRequest) {
  if (!authRequired) {
    return NextResponse.json({ results: [], total: 0, demo: true });
  }

  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const tool = searchParams.get("tool");
  const limit = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("limit") || "100", 10)),
  );
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Build query — join with profiles to get user info
  let query = supabase
    .from("saved_results")
    .select(
      "id, tool_slug, title, result_data, created_at, user_id, profiles!inner(full_name, email)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tool) {
    // Trust-boundary cast: invalid values simply match no rows at the DB
    // check-constraint level (identical runtime behavior to the old untyped
    // builder — the constraint is the runtime guard).
    query = query.eq("tool_slug", tool as SavedToolSlug);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[admin/saved-results] query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // saved_results.user_id references auth.users (no direct profiles FK),
  // so the transitive profiles embed cannot be statically resolved by the
  // generated types (Relationships: []). One documented boundary cast —
  // the runtime query is unchanged and PostgREST resolves it live.
  type SavedResultWithUser = Database["public"]["Tables"]["saved_results"]["Row"] & {
    profiles: { full_name: string | null; email: string | null } | null;
  };
  const results = ((data || []) as unknown as SavedResultWithUser[]).map((r) => ({
    id: r.id,
    tool_slug: r.tool_slug,
    title: r.title,
    result_data: r.result_data,
    created_at: r.created_at,
    user_id: r.user_id,
    user_name: r.profiles?.full_name || "—",
    user_email: r.profiles?.email || "—",
  }));

  return NextResponse.json({
    results,
    total: count || 0,
    limit,
    offset,
  });
}
