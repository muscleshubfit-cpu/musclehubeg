import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * AI QUEUE HEALTH — project-wide early-warning dashboard data.
 *
 * GET /api/ai/queue-health   (coach-only)
 * → { counts: {queued, processing, done, failed},
 *     oldestQueuedMinutes, lastDone: {type, finishedAt} | null,
 *     lastRunnerRunAt: string | null, ok: boolean, issues: string[] }
 *
 * OWNER DIRECTIVE (2026-08-28, «محتاج اتاكد ان مفيش مشاكل مشابهة تحصل
 * مستقبلا فى المشروع كله»): the 2026-08-28 incidents were all "silent
 * for hours" failures — jobs queued forever (de-registered scheduler),
 * results invisible (no materialization), green runs over broken work.
 * This endpoint makes the whole AI pipeline's health visible AT A
 * GLANCE in the admin UI, so nothing can rot silently again.
 *
 * Fail-OPEN philosophy: the GitHub Actions probe is best-effort (6s
 * timeout, null on any error) — a missing GITHUB_DISPATCH_TOKEN must
 * degrade the panel, never break it.
 */
export const maxDuration = 20;

/** A queued job older than this is STUCK (runner should drain in ≤10 min). */
const STUCK_QUEUE_MINUTES = 30;

export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const issues: string[] = [];

  // ── Queue counts + oldest queued + last done (one light select) ──
  const { data: rows, error } = await supabaseAdmin
    .from("ai_jobs" as any)
    .select("status, job_type, created_at, finished_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = { queued: 0, processing: 0, done: 0, failed: 0 };
  let oldestQueuedMinutes: number | null = null;
  let lastDone: { type: string; finishedAt: string } | null = null;
  const now = Date.now();
  for (const r of (rows as any[]) || []) {
    const st = String(r.status || "");
    if (st in counts) counts[st as keyof typeof counts]++;
    if (st === "queued") {
      const age = (now - new Date(r.created_at).getTime()) / 60_000;
      if (oldestQueuedMinutes === null || age > oldestQueuedMinutes) oldestQueuedMinutes = age;
    }
    if (st === "done" && !lastDone && r.finished_at) {
      lastDone = { type: String(r.job_type || ""), finishedAt: String(r.finished_at) };
    }
  }

  if (counts.queued > 0 && (oldestQueuedMinutes ?? 0) > STUCK_QUEUE_MINUTES) {
    issues.push(
      `فيه ${counts.queued} مهمة في الطابور أقدمها منتظرة ${Math.round(oldestQueuedMinutes!)} دقيقة — المشغّل غالبًا واقف`,
    );
  }
  if (counts.failed > 0) {
    issues.push(`${counts.failed} مهمة فشلت نهائيًا — راجعي سبب الفشل في سجل التشغيل`);
  }

  // ── Last GHA runner run (best-effort probe) ──
  let lastRunnerRunAt: string | null = null;
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (token) {
    try {
      const res = await fetch(
        "https://api.github.com/repos/muscleshubfit-cpu/musclehubeg/actions/workflows/process-ai-jobs.yml/runs?per_page=1&status=success",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(6_000),
        },
      );
      if (res.ok) {
        const data: any = await res.json();
        const ranAt = data?.workflow_runs?.[0]?.run_started_at;
        if (ranAt) {
          lastRunnerRunAt = String(ranAt);
          const sinceMin = (now - new Date(ranAt).getTime()) / 60_000;
          if (counts.queued > 0 && sinceMin > STUCK_QUEUE_MINUTES && !issues.length) {
            issues.push(
              `الطابور فيه مهام وآخر تشغيل ناجح كان قبل ${Math.round(sinceMin)} دقيقة — اضغطي يدويًا على Run workflow أو راجعي GITHUB_DISPATCH_TOKEN`,
            );
          }
        }
      }
    } catch {
      /* probe failed — degrade silently, counts above still tell the story */
    }
  }

  return NextResponse.json({
    counts,
    oldestQueuedMinutes: oldestQueuedMinutes === null ? null : Math.round(oldestQueuedMinutes),
    lastDone,
    lastRunnerRunAt,
    ok: issues.length === 0,
    issues,
  });
}

/**
 * CLEAR-FAILED LAW (2026-08-28m, owner screenshot + «ضيف طريقة لمسحها
 * يدوى»): the red «N مهمة فشلت نهائيًا» banner counted FAILED rows
 * FOREVER — failed jobs stayed in ai_jobs, so the alert could never be
 * dismissed. DELETE /api/ai/queue-health (coach-only) removes the failed
 * queue rows (they are transient diagnostics — the real failure evidence
 * lives in the GHA run logs the banner already points at) and the next
 * GET reports clean. Stuck-queue issues (if any) stay honest: they are
 * recomputed from live rows, never suppressed.
 */
export async function DELETE(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const { error, count } = await (supabaseAdmin as any)
    .from("ai_jobs" as any)
    .delete(null, { count: "exact" })
    .eq("status", "failed");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: count ?? 0 });
}
