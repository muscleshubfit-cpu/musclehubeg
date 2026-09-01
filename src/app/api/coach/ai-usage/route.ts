import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { monthStartUtc } from "@/lib/tier-limits";
import { checkClientPlanQuota, type EvoPlanKind } from "@/lib/tier-limits";

/**
 * COACH AI QUOTA READOUT — GET /api/coach/ai-usage?clientId=<uuid>
 *
 * 2026-09-02 (owner: «١+١ أسبوعية اجمالى ٤+٤ شهريا بدلا من ٣+٣ شهريا»):
 * the CLIENT's plan balance is the ONLY quota — `clientBalance` carries
 * BOTH windows (weekly cap 1+1 · Pro 2+2, monthly total 4+4 · Pro 8+8)
 * counting BOTH sources: the member's own EVO generations
 * (evo_chat_usage) + coach/admin done ai_jobs for this client. The old
 * separate coach-side 4/4 cap (0034) was removed — it double-capped the
 * same pool and contradicted the one-balance law for Pro clients.
 * `coachOwn` still reports this coach's own done generations for the
 * month, informational only.
 *
 * Coach counting source = ai_jobs rows (requested_by = this coach, done,
 * payload->>'clientId' = this client) — failed generations never burn
 * anything. Admins are UNLIMITED (staff semantics).
 * Enforced identically in /api/ai/jobs (coach) and /api/ai/chat (member),
 * displayed identically in the member's EVO widget (/api/ai/quota).
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
    // Informational readout — THIS calendar month's completed generations
    // by this coach (resets on the 1st, UTC).
    .gte("created_at", monthStartUtc());
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
    // Informational — this coach's own done generations this month.
    coachOwn: {
      nutrition: { used: nutrition },
      workout: { used: workout },
    },
    // 2026-09-01 + 2026-09-02 owner decrees: the CLIENT's plan balance is
    // the ONLY quota — one pool fed by BOTH the coach's generate button
    // and the member's EVO chat, with a WEEKLY cap on top of the MONTHLY
    // total. `used` mirrors /api/ai/quota exactly.
    clientBalance: {
      tier: clientNutrition.tier,
      nutrition: {
        used: clientNutrition.used,
        limit: clientNutrition.limit,
        unlimited: clientNutrition.unlimited,
        weeklyUsed: clientNutrition.weekly.used,
        weeklyLimit: clientNutrition.weekly.limit,
      },
      workout: {
        used: clientWorkout.used,
        limit: clientWorkout.limit,
        unlimited: clientWorkout.unlimited,
        weeklyUsed: clientWorkout.weekly.used,
        weeklyLimit: clientWorkout.weekly.limit,
      },
    },
  });
}
