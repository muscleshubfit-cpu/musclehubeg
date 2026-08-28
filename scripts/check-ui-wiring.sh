#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# UI↔API WIRING GUARD — pure bash + node, runs in seconds. Fails CI on:
#   1) DEAD FETCH TARGETS — a literal "/api/..." fetch in src/ with no
#      matching route file (the Class-A hole: UI calls a route that was
#      renamed/deleted and only a 404 at runtime would ever tell).
#   2) UNKNOWN ENQUEUE TYPES — a runAiJob/enqueueAiJob*("literal") whose
#      type is not in AI_JOB_TYPES (the Class-B hole behind
#      «توليد المقالات غير موجود»: a type with no processor compiles clean).
#   3) REGISTRY PARITY — AI_JOB_TYPES ↔ PROCESSORS ↔ JOB_GATE must agree
#      in BOTH directions (a type without a processor, or a processor
#      without a registered type, both fail).
#   4) RUNNER HONEST EXITS — every runner script must contain a non-zero
#      exit path (green runs over broken work are forbidden — Class-C).
# Negative self-test proven (inject dead fetch → FAIL, cleanup → PASS).
# Phase 29 (2026-08-28); rebuilt as tracked file in Phase 37 — the script
# was referenced by guard-stale-refs.yml but never committed, so every
# CI run fell at this step (fresh clone exposed the gap TWICE).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")/.."

node --input-type=module -e '
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
const fail = (m) => { console.error("✗ " + m); failures++; };
const ok = (m) => console.log("✓ " + m);

const SKIP = new Set(["node_modules", ".next", ".git", "dist", "coverage"]);
const EXTS = [".ts", ".tsx", ".mts"];
function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, out);
    else if (EXTS.some((x) => e.endsWith(x))) out.push(p);
  }
  return out;
}

// ── Collect real API routes from the app directory ──
const apiRoot = "src/app/api";
const routes = [];
(function walkApi(dir, parts) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  if (entries.includes("route.ts") || entries.includes("route.tsx") || entries.includes("route.js")) {
    routes.push("/api/" + parts.join("/"));
  }
  for (const e of entries) {
    const p = join(dir, e);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walkApi(p, [...parts, e]);
  }
})(apiRoot, []);

// ── Check 1: dead fetch targets ──
const srcFiles = walk("src");
const fetchPaths = new Set();
for (const f of srcFiles) {
  // Strip comments BEFORE scanning: docs routinely mention historic or
  // external "…/api/…" paths that are not fetch targets. Crude strip is
  // intentional — URLs inside strings that contain "//" simply vanish
  // from the scan, external hosts were already excluded by lookbehind.
  const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  for (const m of text.matchAll(/(?<![A-Za-z0-9._\-])\/api\/[a-zA-Z0-9/_\-]+/g)) fetchPaths.add(m[0].replace(/\/+$/, ""));
}
const alive = (p) => routes.some((r) => r === p || r.startsWith(p + "/") || p.startsWith(r + "/"));
const dead = [...fetchPaths].filter((p) => !alive(p));
if (dead.length) fail(`dead fetch target(s): ${dead.join(", ")}`);
else ok(`fetch wiring: ${fetchPaths.size} distinct /api targets, ${routes.length} routes — all resolve`);

// ── Check 2 + 3: registry parse + parity ──
const aj = readFileSync("src/lib/ai-jobs.ts", "utf8");
const tIdx = aj.indexOf("export const AI_JOB_TYPES");
const typesBlock = aj.slice(tIdx, aj.indexOf("as const", tIdx));
const AI_JOB_TYPES = [...typesBlock.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
const gIdx = aj.indexOf("export const JOB_GATE");
const gateBlock = aj.slice(gIdx, aj.indexOf("\n};", gIdx));
const GATE_KEYS = [...gateBlock.matchAll(/\n  ([a-z_]+):/g)].map((m) => m[1]);
const pr = readFileSync("src/lib/ai-job-processors.ts", "utf8");
const pIdx = pr.indexOf("export const PROCESSORS");
const procBlock = pr.slice(pIdx, pr.indexOf("\n};", pIdx));
const PROC_KEYS = [...procBlock.matchAll(/\n  ([a-z_]+):/g)].map((m) => m[1]);

const known = new Set(AI_JOB_TYPES);
if (!AI_JOB_TYPES.length) fail("AI_JOB_TYPES parse produced nothing — guard regex drifted");
const enqLiterals = new Set();
for (const f of srcFiles) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/(?:runAiJob|enqueueAiJobClient|enqueueAiJob)\(\s*["'"'"'"]([a-z_]+)["'"'"'"]/g)) {
    enqLiterals.add(m[1]);
  }
}
const unknown = [...enqLiterals].filter((t) => !known.has(t));
if (unknown.length) fail(`enqueue literal(s) not in AI_JOB_TYPES: ${unknown.join(", ")}`);
else ok(`enqueue literals: ${enqLiterals.size} distinct, all registered`);

const setOf = (a) => new Set(a);
const diff = (a, b) => [...a].filter((x) => !setOf(b).has(x));
for (const [name, a, b] of [
  ["AI_JOB_TYPES → PROCESSORS", AI_JOB_TYPES, PROC_KEYS],
  ["PROCESSORS → AI_JOB_TYPES", PROC_KEYS, AI_JOB_TYPES],
  ["AI_JOB_TYPES → JOB_GATE", AI_JOB_TYPES, GATE_KEYS],
  ["JOB_GATE → AI_JOB_TYPES", GATE_KEYS, AI_JOB_TYPES],
]) {
  const d = diff(a, b);
  if (d.length) fail(`registry parity ${name}: missing ${d.join(", ")}`);
}
if (!failures) ok(`registry parity: ${AI_JOB_TYPES.length} types ↔ ${PROC_KEYS.length} processors ↔ ${GATE_KEYS.length} gates (both directions)`);

// ── Check 4: runner honest exits ──
const runners = [...walk("scripts/ai-jobs-runner"), ...walk("scripts/blog-runner")];
if (!runners.length) fail("no runner scripts found under scripts/");
for (const r of runners) {
  const text = readFileSync(r, "utf8");
  const honest = r.endsWith(".sh")
    ? /exit [1-9]/.test(text)
    : /process\.exit\(\s*[1-9]|exitCode\s*=\s*[1-9]/.test(text);
  if (!honest) fail(`runner without non-zero exit path: ${r}`);
}
if (!failures) ok(`runner honest exits: ${runners.length} scripts verified`);

if (failures) {
  console.error(`\nUI-WIRING GUARD: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nUI-WIRING GUARD: all checks passed");
'
