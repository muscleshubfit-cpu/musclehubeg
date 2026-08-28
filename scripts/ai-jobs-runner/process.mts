/**
 * scripts/ai-jobs-runner/process.mts
 *
 * Native GitHub Actions worker for the WHOLE AI system (owner directive
 * 2026-08-27): claims queued `ai_jobs` rows and runs their processors
 * IN-PROCESS — no Vercel hop, no serverless time cap. EVO chat is the
 * ONLY AI that never touches this file (stays Vercel streaming).
 *
 * USAGE:
 *   npx --no-install tsx scripts/ai-jobs-runner/process.mts [--max 10]
 *
 * REQUIRED ENV (GitHub Secrets → job env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   OPENROUTER_API (or OPENROUTER_API_KEY), GROQ_API_KEY
 * OPTIONAL: AI_CHAIN_TOTAL_BUDGET_MS (workflow sets 180000)
 *
 * EXIT CODES: 0 = cycle finished, all processed jobs succeeded,
 *             1 = one or more jobs FAILED PERMANENTLY (HONEST RUN COLOR
 *                 LAW 2026-08-28d: the workflow must show RED when work
 *                 actually failed — owner report: «بيطلع اشارة خضراء كأن
 *                 العملية نجحت» while articles never appeared),
 *             2 = misconfiguration (missing env).
 */

// Fail fast BEFORE importing anything heavy.
const missing: string[] = [];
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!process.env.OPENROUTER_API && !process.env.OPENROUTER_API_KEY)
  missing.push("OPENROUTER_API (or OPENROUTER_API_KEY)");
if (!process.env.GROQ_API_KEY) missing.push("GROQ_API_KEY");
if (missing.length > 0) {
  console.error(`[ai-jobs] ❌ Missing required secrets/env: ${missing.join(", ")}`);
  process.exit(2);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const MAX_JOBS_PER_RUN = Math.max(1, Math.min(25, Number(arg("max")) || 10));
/** Wall-clock guard for the whole run (GHA job also enforces timeout). */
const RUN_DEADLINE_MS = Date.now() + 40 * 60_000;

async function main(): Promise<void> {
  // WebSocket guarantee for supabase-js realtime (same 2026-08-27 GHA
  // incident as blog-runner): Node <22 lacks a stable global WebSocket,
  // which crashed createClient(). Node 22+ workflows unaffected; this
  // optional 'ws' fallback covers older runtimes.
  if (typeof (globalThis as any).WebSocket === "undefined") {
    try {
      const wsMod = await import("ws");
      (globalThis as any).WebSocket = (wsMod as any).default ?? wsMod;
    } catch {
      /* no 'ws' pkg installed — rely on the runtime's native WebSocket */
    }
  }

  // Dynamic imports AFTER the secret check (config errors exit instantly).
  const { claimQueuedJobs, finishJob, failJob, reapStaleJobs } = await import(
    "../../src/lib/ai-jobs"
  );
  const { PROCESSORS } = await import("../../src/lib/ai-job-processors");

  // 0. Recover jobs orphaned by a previous crashed run.
  const reaped = await reapStaleJobs(30);
  if (reaped > 0) console.log(`[ai-jobs] ↩︎ reaped ${reaped} stale processing job(s)`);

  let done = 0;
  let failed = 0;
  const failedLabels: string[] = [];

  // Loop in batches until queue empty / cap reached / wall-clock out.
  while (Date.now() < RUN_DEADLINE_MS && done + failed < MAX_JOBS_PER_RUN) {
    const batch = await claimQueuedJobs(Math.min(3, MAX_JOBS_PER_RUN - done - failed));
    if (batch.length === 0) break;

    for (const job of batch) {
      const label = `${job.job_type}#${job.id.slice(0, 8)} attempt=${job.attempts}`;
      const startedAt = Date.now();
      try {
        console.log(`[ai-jobs] ▶ processing ${label}`);
        const processor = PROCESSORS[job.job_type];
        if (!processor) throw new Error(`no processor registered for ${job.job_type}`);
        const result = await processor(job.payload ?? {});
        await finishJob(job.id, result);
        done++;
        console.log(`[ai-jobs] ✓ ${label} done in ${Math.round((Date.now() - startedAt) / 1000)}s`);
        console.log(`::notice::AI job ${job.job_type} completed`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const outcome = await failJob(job.id, Number(job.attempts || 1), message);
        if (outcome === "failed") {
          failed++;
          failedLabels.push(label);
          console.error(`[ai-jobs] ✗ ${label} FAILED permanently: ${message}`);
          console.log(`::error::AI job ${job.job_type} failed permanently: ${message.slice(0, 180)}`);
        } else {
          console.warn(`[ai-jobs] ⚠︎ ${label} failed, requeued for retry: ${message}`);
          // RATE-LIMIT COOLDOWN LAW (2026-08-28h): a requeue caused by
          // 429/TPM/quota pressure MUST outlive the per-minute window
          // before the next claim — back-to-back retries re-burn the same
          // bucket and turn a transient limit into a permanent failure
          // (run 33176102145: attempts 1-2 died 90s apart to Groq TPM).
          if (/429|rate.?limit|TPM|quota/i.test(message)) {
            console.log(`[ai-jobs] ⏳ rate-limited — cooling down 70s before the next claim (window reset)`);
            await new Promise((r) => setTimeout(r, 70_000));
          } else {
            await new Promise((r) => setTimeout(r, 3_000));
          }
        }
      }
    }
  }

  console.log(`\n[ai-jobs] ══ summary: done=${done} failedPermanent=${failed}`);
  if (failed > 0) {
    // HONEST RUN COLOR: permanent failures → exit 1 → the workflow run
    // shows RED. A green run now genuinely means every claimed job landed.
    console.log(`[ai-jobs] ❌ ${failed} job(s) failed permanently: ${failedLabels.join(", ")}`);
    console.log(`[ai-jobs] The workflow will show RED — inspect the ✗ lines above.`);
    console.log(`::error::${failed} AI job(s) failed permanently this run`);
  } else {
    console.log(`[ai-jobs] ✅ every processed job succeeded — this green run is genuine.`);
  }
  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .then(() => {
    // exitCode set inside main(): 0 all-good, 1 permanent failures.
    process.exit(process.exitCode === 1 ? 1 : 0);
  })
  .catch((e: unknown) => {
    console.error("[ai-jobs] ❌ Runner crashed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
