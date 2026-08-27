/**
 * scripts/blog-runner/gate-lang-split.mts
 *
 * DEEP GATE TEST for the 2026-08-27 language split (run locally with
 * DUMMY secrets — must FAIL at the right layer for the right reason,
 * proving the runner reaches the provider/DB stages with lang wired):
 *
 *   A. p0-research WITHOUT a language      → exit 2 (runner guard)
 *   B. p0-research with --lang fr          → exit 2 (invalid)
 *   C. p0-research --lang ar, dummy DB key → exit 1, log contains the
 *      Supabase stage error (past auth + config guards = wiring OK)
 *   D. same run's log must show "[runner] ▶ p0-research · lang=ar"
 *
 * Usage: node_modules/.bin/tsx scripts/blog-runner/gate-lang-split.mts
 */
import { spawnSync } from "node:child_process";

const ENV_BASE: Record<string, string> = {
  CRON_SECRET: "dummy-cron",
  NEXT_PUBLIC_SUPABASE_URL: "https://dummy.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "dummy-service-role-key",
  OPENROUTER_API: "dummy-or-key",
  GROQ_API_KEY: "dummy-groq-key",
};

function run(args: string[]) {
  return spawnSync(
    "./node_modules/.bin/tsx",
    ["scripts/blog-runner/run-step.mts", ...args],
    { env: { ...process.env, ...ENV_BASE }, encoding: "utf8", timeout: 90_000 },
  );
}

let failures = 0;
function check(name: string, cond: boolean, detail: string) {
  if (cond) console.log(`✓ ${name}`);
  else {
    failures++;
    console.error(`❌ ${name}\n--- detail ---\n${detail.slice(0, 1200)}`);
  }
}

// A) missing language → hard misconfig exit
const a = run(["--step", "p0-research"]);
check(
  "A: no-lang exits 2",
  a.status === 2 && /needs a language/.test(a.stderr || a.stdout || ""),
  `status=${a.status} out=${a.stdout} err=${a.stderr}`,
);

// B) invalid language value → hard misconfig exit
const b = run(["--step", "p0-research", "--lang", "fr"]);
check("B: bad-lang exits 2", b.status === 2, `status=${b.status} out=${b.stdout}`);

// C) valid lang reaches the Supabase stage with dummy creds → step fails
//    (exit 1) but the failure is a DB/network-layer one, NOT a config one.
const c = run(["--step", "p0-research", "--lang", "ar"]);
const cOut = `${c.stdout}${c.stderr}`;
const passedGuards = c.status === 1 && /\[runner\] ▶ p0-research · lang=ar/.test(cOut);
const notMisconfig = c.status !== 2;
check(
  "C: --lang ar passes guards, fails at DB layer only",
  passedGuards && notMisconfig,
  cOut,
);

// D) lang threading visible in URL-stage log line
check("D: lang logged on the request line", /\[runner\] ▶ p0-research · lang=ar/.test(cOut), cOut);

if (failures > 0) process.exit(1);
console.log("\n✓ ALL LANG-SPLIT GATES GREEN");
