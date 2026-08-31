import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { checkAndRecordSwap, checkClientPlanQuota, type EvoPlanKind } from "@/lib/tier-limits";
import { COACH_AI_PLAN_LIMIT, coachAiMonthStartISO } from "@/lib/coach-limits";
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
    } else if (authRole && authRole !== "client") {
      // STAFF QUOTA SEMANTICS (T-4PILLAR + admin role 2026-08-29): staff
      // (coach | admin) crafting client plans use meal/exercise swaps as
      // an EDITING tool, not as client self-service — quota-bypass them.
      // The weekly C16 limit stays exactly as-is for clients (free 0 ·
      // premium 3 · pro 6 · coaching 3), and EVO-chat plan-creation
      // quotas (Phase 20 D4) are untouched.
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

    // ── 0034: COACH PER-CLIENT AI QUOTA (4 nutrition + 4 workout) ─────
    // Owner model: plan_* generation is capped PER CLIENT for coaches —
    // counting COMPLETED jobs of the same kind (failed generations never
    // burn quota). Editing tools (meal/exercise regenerate — handled
    // above with staff bypass) and manual uploads stay UNLIMITED.
    // Admins remain unlimited (staff quota semantics). A coach may also
    // only generate for his OWN clients — ownership verified below.
    if (
      isAuthConfigured &&
      (type === "plan_nutrition" || type === "plan_workout") &&
      authRole === "coach"
    ) {
      const clientId = String((payload as any)?.clientId ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
        return NextResponse.json(
          { error: "الخطة محتاج عميل محدد — افتح صفحة العميل ثم ولّد الخطة منه." },
          { status: 400 },
        );
      }
      const { supabaseAdmin, isSupabaseAdminConfigured } = await import(
        "@/lib/supabase/admin"
      );
      if (!isSupabaseAdminConfigured || !supabaseAdmin) {
        return NextResponse.json({ error: "Server not configured" }, { status: 501 });
      }
      const { data: owned } = await supabaseAdmin
        .from("coach_assignments")
        .select("client_id")
        .eq("client_id", clientId)
        .eq("coach_id", userId!)
        .maybeSingle();
      if (!owned) {
        return NextResponse.json(
          { error: "العميل ده مش من عملاؤك — كل مدرب يولّد خطط لعملائه هو فقط." },
          { status: 403 },
        );
      }
      // ── OWNER DECREE (2026-08-30): «المدرب قدر يولد خطط للعميل بدون ما
      // يدفع او يفعل اشتراك العميل» — plan generation REQUIRES an ACTIVE
      // PAID coaching subscription (the $6/$16 wallet activation).
      // Assignment alone is NOT enough. Admins bypass (staff semantics —
      // this whole block only runs for authRole === "coach").
      const nowIso = new Date().toISOString();
      const { data: activeCoaching } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("client_id", clientId)
        .eq("tier", "coaching")
        .eq("status", "active")
        .or(`end_date.is.null,end_date.gt.${nowIso}`)
        .limit(1)
        .maybeSingle();
      if (!activeCoaching) {
        return NextResponse.json(
          {
            error:
              "العميل ده لسه مش مفعّل — فعّل اشتراكه الأول من صفحته (شهر 6$ — ٣ شهور 16$ بتخصم من محفظتك) وبعدها تقدر تولّد له خطط.",
            code: "client_not_activated",
          },
          { status: 402 },
        );
      }
      // ── OWNER DECREE (2026-09-01): «توليد الخطط بيتحسب من الرصيد سواء
      // عن طريق المدرب او عن طريق ايفو» — the coach's generation burns the
      // CLIENT's monthly plan balance (same pool the member's EVO widget
      // shows: evo_chat_usage + done ai_jobs for this client). The client's
      // TIER decides the limit (premium 3/3 · pro 6/6 · coaching 3/3).
      // Soft-quota convention: completed EVO dispatches + done jobs count;
      // pending jobs can race past by a 1-off (same documented parity as
      // the weekly swaps).
      const clientKind: EvoPlanKind =
        type === "plan_nutrition" ? "nutrition" : "workout";
      const clientQuota = await checkClientPlanQuota(clientId, clientKind);
      if (!clientQuota.unlimited && !clientQuota.allowed) {
        const kindAr = type === "plan_nutrition" ? "تغذية" : "تمارين";
        return NextResponse.json(
          {
            error: `رصيد الخطط الشهري للعميل خلص (${clientQuota.used}/${clientQuota.limit} خطط ${kindAr}). التوليد — منك أو من ايفو عند العميل — بيخصم من نفس الرصيد، وبيتصفّر أول الشهر. تقدر تعدّل الخطة الحالية أو ترفع خطة يدوي من غير حدود.`,
            code: "client_plan_quota_exhausted",
            rateLimited: true,
            used: clientQuota.used,
            limit: clientQuota.limit,
          },
          { status: 429, headers: { "Retry-After": "86400" } },
        );
      }
      const { count, error: cntErr } = await supabaseAdmin
        .from("ai_jobs" as any)
        .select("*", { count: "exact", head: true })
        .eq("requested_by", userId!)
        .eq("job_type", type)
        .eq("status", "done")
        .eq("payload->>clientId", clientId)
        // 0034 → 0035 (owner: «العداد شهرى») — only THIS calendar month's
        // completed generations burn the quota; it resets on the 1st.
        .gte("created_at", coachAiMonthStartISO());
      if (!cntErr && (count ?? 0) >= COACH_AI_PLAN_LIMIT) {
        const kindAr = type === "plan_nutrition" ? "تغذية" : "تمارين";
        return NextResponse.json(
          {
            error: `وصلت للحد الأقصى: ${COACH_AI_PLAN_LIMIT} خطط ${kindAr} بالذكاء الاصطناعي للعميل ده (${count}/${COACH_AI_PLAN_LIMIT}). تقدر تعدّل الخطة الحالية بحرية أو ترفع خطة يدوي — من غير حدود.`,
            rateLimited: true,
            used: count ?? 0,
            limit: COACH_AI_PLAN_LIMIT,
          },
          { status: 429, headers: { "Retry-After": "86400" } },
        );
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
