import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { COACH_AI_PLAN_LIMIT, coachAiMonthStartISO } from "@/lib/coach-limits";

/**
 * COACH AI QUOTA READOUT (0034) — GET /api/coach/ai-usage?clientId=<uuid>
 *
 * Owner rule: AI plan generation is capped PER CLIENT —
 *   4 nutrition + 4 workout plans (COACH_AI_PLAN_LIMIT).
 * Editing plans and manual uploads are unlimited; site clients keep
 * their own tier limits unchanged.
 *
 * Counting source = ai_jobs rows (requested_by = this coach, job_type =
 * plan_nutrition | plan_workout, status = 'done', payload->>'clientId'
 * = this client). Done-only means failed generations never burn the
 * coach's quota.
 *
 * Admins are UNLIMITED (staff quota semantics) — unlimited: true.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function countCompleted(
  coachId: string,
  jobType: "plan_nutrition" | "plan_workout",
  clientId: string,
): Promise<number> {
  const { count, error } = await supabaseAdmin!
    .from("ai_jobs" as any)
    .select("*", { count: "exact", head: true })
    .eq("requested_by", coachId)
    .eq("job_type", jobType)
    .eq("status", "done")
    .eq("payload->>clientId", clientId)
    // Owner: «العداد شهرى» — readout mirrors the monthly enforcement
    // window in /api/ai/jobs (resets on the 1st, UTC).
    .gte("created_at", coachAiMonthStartISO());
  if (error) {
    console.error("[api/coach/ai-usage] count error:", error.message);
    return 0; // fail open — same soft-quota convention as tier-limits
  }
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (auth.role !== "coach" && auth.role !== "admin") {
    return NextResponse.json(
      { error: "forbidden", message: "هذه الصفحة للمدربين فقط" },
      { status: 403 },
    );
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 501 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!UUID_RE.test(clientId)) {
    return NextResponse.json(
      { error: "bad_request", message: "عميل غير صحيح" },
      { status: 400 },
    );
  }

  // Coaches read usage only for their OWN clients; admins pass.
  if (auth.role === "coach") {
    const { data: owned } = await supabaseAdmin
      .from("coach_assignments")
      .select("client_id")
      .eq("client_id", clientId)
      .eq("coach_id", auth.id)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json(
        { error: "not_your_client", message: "العميل ده مش من عملاؤك" },
        { status: 403 },
      );
    }
  }

  const unlimited = auth.role === "admin";
  const [nutrition, workout] = await Promise.all([
    countCompleted(auth.id, "plan_nutrition", clientId),
    countCompleted(auth.id, "plan_workout", clientId),
  ]);

  return NextResponse.json({
    unlimited,
    limit: COACH_AI_PLAN_LIMIT,
    nutrition: { used: nutrition, limit: COACH_AI_PLAN_LIMIT },
    workout: { used: workout, limit: COACH_AI_PLAN_LIMIT },
  });
}
