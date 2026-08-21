import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser, isAuthConfigured } from "@/lib/auth-server";
import { getLimits, type MembershipTier } from "@/lib/memberships";

/**
 * POST /api/tools/save-result
 *
 * Saves a tool result to the saved_results table.
 * Enforces membership limits (Free: 3, Premium: 50, Pro: 200).
 *
 * Body:
 *   { tool_slug: string, title?: string, result_data: object }
 */
export async function POST(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => ({}));
  const { tool_slug, title, result_data } = body;

  const ALLOWED_TOOLS = [
    "calorie-calculator",
    "bmi-calculator",
    "macro-calculator",
    "body-fat-calculator",
    "water-tracker",
  ];

  if (!ALLOWED_TOOLS.includes(tool_slug)) {
    return NextResponse.json({ error: "Invalid tool" }, { status: 400 });
  }
  if (!result_data) {
    return NextResponse.json({ error: "Missing result_data" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Check current count for this user
  const { count } = await supabase
    .from("saved_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.id);

  // Use the real membership tier from the auth user (resolved from
  // the subscriptions table inside requireUser).
  const tier: MembershipTier = auth.membership_tier;
  const limits = getLimits(tier);
  const maxSaved = limits.savedResultsLimit;

  if (maxSaved !== null && (count || 0) >= maxSaved) {
    return NextResponse.json(
      {
        error: "Limit reached",
        limit: maxSaved,
        current: count,
        message: `You've reached your limit of ${maxSaved} saved results. Upgrade your membership for more.`,
      },
      { status: 403 },
    );
  }

  // Insert
  const { data, error } = await supabase
    .from("saved_results")
    .insert({
      user_id: auth.id,
      tool_slug,
      title: title || null,
      result_data,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[api/tools/save-result] Insert failed:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data?.id,
    created_at: data?.created_at,
    remaining: maxSaved !== null ? maxSaved - ((count || 0) + 1) : null,
  });
}
