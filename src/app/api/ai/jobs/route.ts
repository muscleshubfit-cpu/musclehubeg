import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { checkAndRecordSwap } from "@/lib/tier-limits";
import {
  isAiJobType,
  JOB_GATE,
  JOB_ETA_MINUTES,
  MAX_PAYLOAD_BYTES,
  enqueueAiJob,
  JobPayloadError,
} from "@/lib/ai-jobs";
import { dispatchAiJobsRunner } from "@/lib/ai-runner-dispatch";

/**
 * AI Jobs API — enqueue + poll.
 *
 * OWNER DIRECTIVE (2026-08-27): ALL batch AI work goes through the
 * `ai_jobs` queue and executes natively in GitHub Actions
 * (process-ai-jobs.yml). This route NEVER calls an AI model — it only
 * validates, gates, writes the queue row (service-role), and serves
 * job status back to the UI.
 *
 * POST /api/ai/jobs        body: { type, payload }
 *   Gates per type:
 *     plan_* / article_tool / article_generate / social_post → coach only
 *     meal_regenerate / exercise_regenerate → logged-in user AND the same
 *       weekly tier limits as the old swap system (C16), recorded at enqueue.
 * GET  /api/ai/jobs?id=<uuid>   → own single job (status/result)
 * GET  /api/ai/jobs?limit=10    → own recent jobs (queue visibility)
 *
 * EVENT-DRIVEN DISPATCH (§8, 2026-08-28): GitHub de-registered repo-wide
 * scheduled workflows (the every-10-min worker had ONE run ever) — so after a
 * successful enqueue this route PUSH-triggers the runner via the GitHub
 * API (fail-open; requires GITHUB_DISPATCH_TOKEN on the deployment).
 * The response carries runnerDispatched so clients/logs can warn when
 * only the backstop layers (daily Vercel cron / scheduler) remain.
 *
 * SECURITY: every row carries requested_by = verified session id; RLS lets
 * users SELECT only their own rows; there are NO browser write policies.
 */
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // ── Auth: jobs require a logged-in identity when Supabase is wired. ──
    let userId: string | undefined;
    let authTier: string | undefined;
    let authRole: string | undefined;
    if (isAuthConfigured) {
      const auth = await requireUser(request);
      if (auth instanceof Response) return auth;
      userId = auth.id;
      authTier = auth.membership_tier;
      authRole = auth.role;
    }

    const body = await request.json().catch(() => null);
    const type = String(body?.type || "");
    const payload = body?.payload;

    if (!isAiJobType(type)) {
      return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
    }

    // Payload envelope cap — plan payloads carry questionnaires inline,
    // everything else is smaller; 40 KB rejects abuse without breaking UX.
    const size = JSON.stringify(payload ?? {}).length;
    if (size > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413 },
      );
    }

    // ── Per-type gating BEFORE any write. ──────────────────────────────
    const gate = JOB_GATE[type];
    if (gate === "coach") {
      if (isAuthConfigured) {
        const coachAuth = await requireCoach(request);
        if (coachAuth instanceof Response) return coachAuth;
      }
    } else if (authRole === "coach") {
      // T-4PILLAR-COMPLETE (2026-08-28): staff crafting client plans use
      // meal/exercise swaps as an EDITING tool, not as client self-service —
      // quota-bypass them. The weekly C16 limit stays exactly as-is for
      // clients (free 0 · premium 3 · pro 6 · coaching 3), and EVO-chat
      // plan-creation quotas (Phase 20 D4) are untouched.
    } else {
      // user_swap_meal | user_swap_exercise → enforce C16 weekly tier limit.
      // Record-at-enqueue mirrors the previous swap system exactly: quota
      // is consumed once the request is accepted (documented parity).
      if (userId) {
        const swapType = gate === "user_swap_meal" ? "meal" : "exercise";
        const limitCheck = await checkAndRecordSwap(userId, swapType, authTier);
        if (!limitCheck.allowed) {
          const limitText =
            limitCheck.limit === 0
              ? "الاستبدال متاح لعملاء البريميوم وأعلى."
              : `استهلكت ${limitCheck.used}/${limitCheck.limit} استبدال هذا الأسبوع. الرصيد يتصفّر يوم الاثنين.`;
          return NextResponse.json(
            {
              error: `⏰ ${limitText}`,
              rateLimited: true,
              used: limitCheck.used,
              limit: limitCheck.limit,
            },
            { status: 429, headers: { "Retry-After": "3600" } },
          );
        }
      }
    }

    // ── Enqueue via service-role (sanitization happens inside). ────────
    let id: string;
    try {
      ({ id } = await enqueueAiJob({
        type,
        payload: payload ?? {},
        requestedBy: userId ?? null,
      }));
    } catch (e: any) {
      // Required-field violations are client errors, not server faults.
      // (article_generate no longer requires a topic — empty = smart pick.)
      if (e instanceof JobPayloadError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // ── Push-trigger the GHA runner (§8 EVENT-DRIVEN DISPATCH LAW). ────
    // The */10 GitHub scheduler is de-registered repo-wide (Phase 18) —
    // without this push a plan job waits for the daily Vercel catch-up.
    const runnerDispatched = await dispatchAiJobsRunner();

    return NextResponse.json({
      jobId: id,
      etaMinutes: runnerDispatched ? 3 : JOB_ETA_MINUTES,
      runnerDispatched,
      message: `تم إرسال الطلب — النتيجة تظهر خلال ~${runnerDispatched ? 3 : JOB_ETA_MINUTES} دقائق.`,
    });
  } catch (e: any) {
    console.error("[api/ai/jobs] POST error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthConfigured) {
      // Demo mode without DB has no queue to poll anyway.
      return NextResponse.json({ error: "Not configured" }, { status: 501 });
    }
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    const userId = auth.id;

    const { supabaseAdmin, isSupabaseAdminConfigured } = await import(
      "@/lib/supabase/admin"
    );
    if (!isSupabaseAdminConfigured || !supabaseAdmin) {
      return NextResponse.json({ error: "Not configured" }, { status: 501 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return NextResponse.json({ error: "Bad id" }, { status: 400 });
      }
      const { data } = await supabaseAdmin
        .from("ai_jobs" as any)
        .select("id, job_type, status, result, error_message, created_at, finished_at")
        .eq("id", id)
        .eq("requested_by", userId) // hard ownership filter on top of RLS
        .maybeSingle();
      if (!(data as any)?.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 10));
    // T-4PILLAR-COMPLETE: `payload` rides along so the coach recovery card
    // can resolve which client a finished plan_nutrition/plan_workout job
    // belongs to (plans rows carry no job_id). Rows are hard-filtered to
    // requested_by = caller, and plan payloads only ever contain data the
    // coach themselves enqueued — no cross-user exposure.
    const { data } = await supabaseAdmin
      .from("ai_jobs" as any)
      .select("id, job_type, status, error_message, created_at, finished_at, payload")
      .eq("requested_by", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ jobs: data ?? [] });
  } catch (e: any) {
    console.error("[api/ai/jobs] GET error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
