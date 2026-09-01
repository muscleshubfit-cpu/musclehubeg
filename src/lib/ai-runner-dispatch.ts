/**
 * AI RUNNER PUSH-DISPATCH (event-driven queue trigger).
 *
 * WHY THIS EXISTS (2026-08-28 incident, owner: «توليد الخطط لا يعمل»):
 * the process-ai-jobs.yml worker is a GitHub cron (every 10 min) — but GitHub
 * silently de-registered ALL scheduled workflows in this repo (Phase 18
 * forensics: 0 scheduled fires repo-wide since 2026-08-26, the API-enable
 * remedy did NOT restore firing). The worker had exactly ONE run ever
 * (a manual dispatch) → every plan_nutrition / plan_workout / article_*
 * job enqueued after 2026-08-27 21:24 UTC sat `queued` FOREVER →
 * "plan generation doesn't work" while every line of queue code was fine.
 *
 * LAW (AGENTS.md §8): enqueue MUST push-trigger the runner. The GitHub
 * scheduler and the daily Vercel catch-up are BACKSTOP layers, never the
 * primary trigger. This module performs the push:
 *
 *   POST /repos/:owner/:repo/actions/workflows/process-ai-jobs.yml/dispatches
 *
 * TOKEN: GITHUB_DISPATCH_TOKEN (Vercel env) — fine-grained PAT, this repo
 * only, Actions: Read and write. Fail-OPEN by design: a missing/invalid
 * token must NEVER fail an enqueue (the backstop layers still exist); the
 * response carries `runnerDispatched: false` so UIs/logs can warn.
 */

const REPO = "muscleshubfit-cpu/musclehubeg";
const WORKFLOW = "process-ai-jobs.yml";
const DISPATCH_TIMEOUT_MS = 8_000;

/** True when a dispatch was actually accepted by GitHub (HTTP 204). */
export async function dispatchAiJobsRunner(): Promise<boolean> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    console.warn(
      "[ai-runner-dispatch] GITHUB_DISPATCH_TOKEN missing — falling back to scheduler/cron layers. " +
        "Add a fine-grained GitHub PAT (this repo, Actions: Read and write) as a Vercel env and redeploy.",
    );
    return false;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      },
    );
    if (res.status !== 204) {
      console.warn(`[ai-runner-dispatch] dispatch rejected: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(
      `[ai-runner-dispatch] dispatch failed: ${e instanceof Error ? e.message : e}`,
    );
    return false;
  }
}
