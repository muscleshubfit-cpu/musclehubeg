import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { COACH_AI_PLAN_LIMIT, coachAiMonthStartISO } from "@/lib/coach-limits";
import { checkClientPlanQuota, type EvoPlanKind } from "@/lib/tier-limits";

/**
 * COACH AI QUOTA READOUT (0034) — GET /api/coach/ai-usage?clientId=<uuid>
 *
 * Owner rule: AI plan generation is capped PER CLIENT —
 *   4 nutrition + 4 workout plans (COACH_AI_PLAN_LIMIT).
 * Editing plans and manual uploads are unlimited.
 *
 * 2026-09-01 (owner: «توليد الخطط بيتحسب من الرصيد سواء عن طريق المدرب
 * او عن طريق ايفو»): the response ALSO carries `clientBalance` — the
 * client's monthly plan pool (tier-decided limit) counting BOTH sources:
 * the member's own EVO generations (evo_chat_usage) + coach/admin done
 * ai_jobs for this client. Enforced identically in /api/ai/jobs (coach)
 * and /api/ai/chat (member), displayed identically in the member's EVO
 * widget (/api/ai/quota).
 *
 * Coach counting source = ai_jobs rows (requested_by = this coach, done,
 * payload->>'clientId' = this client) — failed generations never burn the
 * coach's own 4/4 cap. Admins are UNLIMITED (staff semantics).
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
  const [nutrition, workout, clientNutrition, clientWorkout] = await Promise.all([
    countCompleted(auth.id, "plan_nutrition", clientId),
    countCompleted(auth.id, "plan_workout", clientId),
    checkClientPlanQuota(clientId, "nutrition" as EvoPlanKind),
    checkClientPlanQuota(clientId, "workout" as EvoPlanKind),
  ]);

  return NextResponse.json({
    unlimited,
    limit: COACH_AI_PLAN_LIMIT,
    nutrition: { used: nutrition, limit: COACH_AI_PLAN_LIMIT },
    workout: { used: workout, limit: COACH_AI_PLAN_LIMIT },
    // 2026-09-01 owner decree: the CLIENT's monthly plan balance — one
    // pool fed by BOTH the coach's generation button and the member's EVO
    // chat. `used` here mirrors /api/ai/quota exactly.
    clientBalance: {
      tier: clientNutrition.tier,
      nutrition: {
        used: clientNutrition.used,
        limit: clientNutrition.limit,
        unlimited: clientNutrition.unlimited,
      },
      workout: {
        used: clientWorkout.used,
        limit: clientWorkout.limit,
        unlimited: clientWorkout.unlimited,
      },
    },
  });
}
