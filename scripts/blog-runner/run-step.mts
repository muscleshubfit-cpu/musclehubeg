/**
 * scripts/blog-runner/run-step.mts
 *
 * Native GitHub Actions runner for the blog pipeline steps.
 * Executes the SAME Next.js route handlers in-process inside the
 * Actions job — NO Vercel hop, NO 60-second serverless cap.
 *
 * WHY: /api/cron/blog/* routes were budget-clamped to ≤52s per call to
 * respect the Vercel Hobby limit. Running them natively here lets each
 * step use AI_CHAIN_TOTAL_BUDGET_MS (set to 180000 in the workflow) for
 * full-length article completions instead of truncated ones.
 *
 * USAGE (called by run-step.sh):
 *   npx --no-install tsx scripts/blog-runner/run-step.mts \
 *     --step step1-pick            [--queueId <uuid>]
 *
 * REQUIRED ENV (GitHub Secrets → job env):
 *   CRON_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   OPENROUTER_API (or OPENROUTER_API_KEY), GROQ_API_KEY
 * OPTIONAL ENV: UNSPLASH_ACCESS_KEY / PEXELS_API_KEY / PIXABAY_API_KEY,
 *   AI_CHAIN_TOTAL_BUDGET_MS
 *
 * EXIT CODES: 0 = ok:true · 1 = step reported failure · 2 = misconfig
 */
import { NextRequest } from "next/server";

const STEPS = [
  "p0-research",
  "p1-outline",
  "p2-content",
  "p3-images",
  "p4-review",
  "p5-publish",
] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const step = arg("step");
  const queueId = arg("queueId");

  if (!step || !STEPS.includes(step as (typeof STEPS)[number])) {
    console.error(
      `[runner] ❌ Missing/unknown --step. Valid steps: ${STEPS.join(", ")}`,
    );
    process.exit(2);
  }

  // queueId sanity: P0 is the pipeline's queue initiator — it CREATES the
  // blog_generation_queue row itself and returns the id in its JSON (which
  // run-step.sh captures into $GITHUB_ENV as QUEUE_ID). Every later phase
  // must thread that id through.
  if (!queueId && step !== "p0-research") {
    console.error(
      `[runner] ❌ Step ${step} needs --queueId (captured automatically from p0-research output).`,
    );
    process.exit(2);
  }
  if (queueId && !/^[0-9a-f-]{36}$/i.test(queueId)) {
    console.error(`[runner] ❌ Malformed queueId: ${queueId}`);
    process.exit(2);
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      "[runner] ❌ CRON_SECRET not set — add it under Settings ▸ Secrets and variables ▸ Actions.",
    );
    process.exit(2);
  }

  // Fail fast BEFORE importing pipeline modules: a missing Supabase or
  // provider key should abort instantly with an actionable message.
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.OPENROUTER_API && !process.env.OPENROUTER_API_KEY)
    missing.push("OPENROUTER_API (or OPENROUTER_API_KEY)");
  if (!process.env.GROQ_API_KEY) missing.push("GROQ_API_KEY");
  if (missing.length > 0) {
    console.error(`[runner] ❌ Missing required secrets/env: ${missing.join(", ")}`);
    process.exit(2);
  }

  // Dynamic import AFTER env checks so configuration errors never reach
  // the AI providers. Route modules import @/lib via tsconfig paths —
  // resolved natively by tsx.
  const mod = await import(`../../src/app/api/cron/blog/${step}/route.ts`);

  const url = new URL(`http://actions-runner/api/cron/blog/${step}`);
  if (queueId) url.searchParams.set("queueId", queueId);

  const req = new NextRequest(url, {
    headers: { authorization: `Bearer ${secret}` },
  });

  let res: Response;
  try {
    res = await mod.GET(req);
  } catch (err) {
    console.error(
      "[runner] ❌ Handler threw:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }

  const text = await res.text();
  console.log(`HTTP ${res.status}\n${text}`);

  let ok = res.status < 400;
  try {
    ok = ok && JSON.parse(text)?.ok === true;
  } catch {
    /* non-JSON body already failed via status above when >= 400 */
  }
  if (!ok) process.exit(1);

  console.log(`[runner] ✓ ${step} OK`);
}

main().catch((e: unknown) => {
  console.error("[runner] ❌ Runner crashed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
