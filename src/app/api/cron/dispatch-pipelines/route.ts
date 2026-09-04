import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * SCHEDULER-INDEPENDENT PIPELINE DISPATCHER (SCHEDULE HEALTH LAW §8-3/§8-5).
 *
 * WHY THIS EXISTS (2026-08-27 incident): GitHub silently de-registered ALL
 * scheduled workflows in this repo (last schedule fire 2026-08-26T16:39Z;
 * dispatch/push runs kept working). The API enable + touching-commit remedy
 * did NOT restore firing within 90 min across 9+ cron slots. This endpoint
 * makes blog production independent of GitHub's scheduler:
 *
 *   Vercel cron (or an external cron service) hits this endpoint and it
 *   TOPS UP each language pipeline to its daily quota (Phase 119 —
 *   owner directive 2026-09-04: exactly ONE article per language per
 *   day, at different geography-anchored times):
 *     EN slot 22 UTC (18:00 US Eastern) · AR slot 05 UTC (08:00 Cairo, EEST)
 *   A workflow is dispatched only when GitHub has NOT already run it today
 *   enough times (any event counts — manual/GitHub-scheduled/Vercel runs
 *   all count, because every run publishes exactly one article).
 *
 *   The Vercel cron fires at 23:00 UTC (AFTER both daily slots) so a
 *   missed slot in EITHER language can be topped up on the same day.
 *
 * It also rescues the every-10-minutes ai-jobs worker when its last run is
 * stale (>15 min) — meaningful when an external cron calls this endpoint
 * every few minutes (Layer 2); harmless when called once daily.
 *
 * AUTH: Vercel Cron sends Authorization: Bearer <CRON_SECRET> (fail-closed,
 * same C4 pattern as the other cron routes).
 *
 * TOKEN: requires GITHUB_DISPATCH_TOKEN (Vercel env) — a fine-grained
 * GitHub PAT scoped to THIS repo with Actions: Read and write ONLY.
 * Never commit a PAT into the repo (§3.2). Without the token the endpoint
 * answers 503 with setup instructions (dormant, never crashes the cron).
 *
 * GET /api/cron/dispatch-pipelines
 */

const REPO = "muscleshubfit-cpu/musclehubeg";
const EN_WORKFLOW = "blog-post-en.yml";
const AR_WORKFLOW = "blog-post-ar.yml";
const AI_JOBS_WORKFLOW = "process-ai-jobs.yml";
// Phase 119 (owner directive 2026-09-04): ONE slot per language per day,
// different times per audience geography — EN 22:00 UTC (18:00 US Eastern,
// evening peak) · AR 05:00 UTC (08:00 Cairo EEST, morning window).
// Matches the GHA cron schedules exactly (the backstop never exceeds quota).
const EN_SLOTS = [22];
const AR_SLOTS = [5];
const AI_JOBS_STALE_MS = 15 * 60 * 1000;

type DispatchCheck = {
  workflow: string;
  runsToday: number;
  expectedThroughNow: number;
  dispatched: number;
  status: "dispatched" | "up-to-date" | "error";
  detail?: string;
};

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function runsTodayFor(
  token: string,
  workflow: string,
  utcNow: Date,
): Promise<number> {
  const dayStart = new Date(
    Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()),
  ).toISOString();
  const created = encodeURIComponent(`${dayStart}..${utcNow.toISOString()}`);
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/runs?per_page=100&created=${created}`,
    { headers: ghHeaders(token), signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) throw new Error(`runs query ${workflow}: HTTP ${res.status}`);
  const data = (await res.json()) as {
    workflow_runs?: Array<{ conclusion?: string | null }>;
  };
  // Count only runs that published (or are on their way to publishing):
  // failure/cancelled runs consumed a slot WITHOUT producing an article
  // (2026-08-27 AR 08:35 failure) and must not mask a missing publish.
  const counted = (data.workflow_runs ?? []).filter(
    (r) => !["failure", "cancelled"].includes(r.conclusion ?? ""),
  );
  return counted.length;
}

async function lastRunAt(token: string, workflow: string): Promise<Date | null> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/runs?per_page=1`,
    { headers: ghHeaders(token), signal: AbortSignal.timeout(20_000) },
  );
  if (!res.ok) throw new Error(`last-run query ${workflow}: HTTP ${res.status}`);
  const data = (await res.json()) as { workflow_runs?: Array<{ created_at?: string }> };
  const at = data.workflow_runs?.[0]?.created_at;
  return at ? new Date(at) : null;
}

async function dispatchWorkflow(token: string, workflow: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (res.status !== 204) throw new Error(`dispatch ${workflow}: HTTP ${res.status}`);
}

export async function GET(request: NextRequest) {
  // ── Auth (fail-closed, C4 pattern) ──────────────────────────────────
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: "GITHUB_DISPATCH_TOKEN not configured on this deployment.",
        setup:
          "Add a fine-grained GitHub PAT (this repo only, Actions: Read and write) as Vercel env GITHUB_DISPATCH_TOKEN, then redeploy.",
      },
      { status: 503 },
    );
  }

  const utcNow = new Date();
  const hour = utcNow.getUTCHours();
  const results: DispatchCheck[] = [];

  // ── Language pipelines: top up to daily quota ───────────────────────
  const plans: Array<{ workflow: string; slots: number[] }> = [
    { workflow: EN_WORKFLOW, slots: EN_SLOTS },
    { workflow: AR_WORKFLOW, slots: AR_SLOTS },
  ];

  for (const plan of plans) {
    try {
      const runsToday = await runsTodayFor(token, plan.workflow, utcNow);
      const expectedThroughNow = plan.slots.filter((s) => s <= hour).length;
      const missing = Math.max(0, expectedThroughNow - runsToday);
      let dispatched = 0;
      for (let i = 0; i < missing; i++) {
        await dispatchWorkflow(token, plan.workflow);
        dispatched += 1;
      }
      results.push({
        workflow: plan.workflow,
        runsToday,
        expectedThroughNow,
        dispatched,
        status: dispatched > 0 ? "dispatched" : "up-to-date",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        workflow: plan.workflow,
        runsToday: -1,
        expectedThroughNow: -1,
        dispatched: 0,
        status: "error",
        detail: msg,
      });
    }
  }

  // ── ai-jobs worker: rescue when stale ───────────────────────────────
  try {
    const last = await lastRunAt(token, AI_JOBS_WORKFLOW);
    const stale = !last || utcNow.getTime() - last.getTime() > AI_JOBS_STALE_MS;
    if (stale) {
      await dispatchWorkflow(token, AI_JOBS_WORKFLOW);
      results.push({
        workflow: AI_JOBS_WORKFLOW,
        runsToday: -1,
        expectedThroughNow: -1,
        dispatched: 1,
        status: "dispatched",
        detail: last ? `last run ${last.toISOString()} (>15 min stale)` : "no runs ever",
      });
    } else {
      results.push({
        workflow: AI_JOBS_WORKFLOW,
        runsToday: -1,
        expectedThroughNow: -1,
        dispatched: 0,
        status: "up-to-date",
        detail: `last run ${last?.toISOString()}`,
      });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({
      workflow: AI_JOBS_WORKFLOW,
      runsToday: -1,
      expectedThroughNow: -1,
      dispatched: 0,
      status: "error",
      detail: msg,
    });
  }

  return NextResponse.json({
    ok: results.every((r) => r.status !== "error"),
    checkedAt: utcNow.toISOString(),
    results,
  });
}
