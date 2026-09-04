# AGENTS.md — MuscleHubEG AI Agent Operating System

> **Status:** Active — required reading for every AI agent (and human contributor) before any commit, PR, or production change.
> **Last updated:** 2026-09-03 (Phase 113 — slimmed per owner directive «الأمر الثالث»: every heading kept verbatim; long technical narratives delegated to `docs/TECH_REFERENCE.md`).
> **Owner:** muscleshubfit@gmail.com (project owner + human supervisor).
> **Deep technical detail** (Supabase · full RLS · migration law · special-rules tables · storage · Shadcn inventory · SQL snippets) lives in [`docs/TECH_REFERENCE.md`](docs/TECH_REFERENCE.md); the CI-gates narrative lives in [`docs/CI_GATES.md`](docs/CI_GATES.md). This file stays the LAW file.

---

## 1. Purpose

Operating rules for AI agents on MuscleHubEG: the repo is **public** as code, **proprietary** as a product, **production-deployed** (real customers, payments, PII) and **agent-assisted**. Agents are implementers and reviewers — never autonomous product owners: they execute well-scoped tasks, document the work, and hand control back to a human supervisor.

---

## 2. Roles

| Role | Who | Authority |
|---|---|---|
| **Project Owner / Human Supervisor** | `muscleshubfit@gmail.com` (Ahmed) | Final say on every change. Approves features, fixes, schema, security, deploys. |
| **Technical Reviewer** | Any AI assistant the Owner designates for the active session. | Reviews proposals, drafts task commands, flags risks. Does NOT commit code directly. |
| **Implementation Agent** | GML (this agent) + any sub-agent it delegates to. | Writes code, runs tests, updates docs, pushes commits — every change reviewed/approved by the human supervisor. |

The owner may designate additional agents or reviewers; until then the table above is authoritative.

---

## 3. Operating Rules (Binding on All Agents)

### 3.1 Inspect Before Modifying

Read the actual source, config, and migrations before changing anything — docs can lag (hierarchy: §12.8); on conflict verify the code and document the discrepancy in `worklog.md`. Quote file paths + line numbers in commits and reports so the human reviewer can verify.

### 3.2 Do Not Expose Secrets

Never commit or paste credentials anywhere (code, comments, fixtures, docs, chat, server logs — Vercel logs leak). New env vars go into `.env.example` EMPTY + documented in `SECURITY.md`. Suspected leak → STOP, alert the owner, do NOT push.

### 3.3 Do Not Modify Production Data

No agent-run `DELETE` / `UPDATE` / `TRUNCATE` / `DROP` on production Supabase; read-only verification queries (e.g. `SELECT count(*) FROM blog_posts`) allowed when necessary. Data migrations ship as idempotent SQL files under `supabase/migrations/` and are applied to production AUTOMATICALLY by the Supabase–GitHub integration when the commit lands on `main` (Phase 120 law correction, owner directive 2026-09-05 — the Supabase project is LINKED to the repo; auto-apply proven since Phase 61, migrations 0060→0069) — the owner runs SQL by hand ONLY on the documented manual path (§6: the `auth.users` exception 0040/0050/0055/0066 + legacy `RUN_ON_SUPABASE_*`/`VERIFY_*` files).

### 3.4 Do Not Invent Architecture

No precedent in the codebase → propose the design in plain prose FIRST, get owner/reviewer sign-off, only then implement. Never introduce a new state/ORM/auth/payment/AI/deployment stack without explicit owner approval — the stack is documented in `DEVELOPER_GUIDE.md`; stay inside it.

### 3.5 Verify Changes

> **Canonical command set — do NOT duplicate these commands elsewhere.**
> §4 (Definition of Done) and `archive/QA_CHECKLIST.md` (Verification Protocol —
> frozen at Phase 115)
> MUST reference this section by pointer instead of restating the commands.

The canonical verification command set:

```bash
# 1. TypeScript — must report 0 errors
npx tsc --noEmit

# 2. ESLint — must report 0 errors (warnings are acceptable if pre-existing)
npx eslint .

# 3. Next.js build — must exit 0 (run when changes touch rendering,
#    routes, or anything that could break the build)
npx next build

# 4. Git push — forward-only (never `--force` without explicit Owner directive)
git push origin main

# 5. Sync verification — both must be identical
git fetch origin --quiet
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && echo "SYNCED" || echo "DRIFT"

# 6. Working tree clean check
git status --short
# Expected: empty (or only pre-existing drift)
```

Additional rules: smoke-test touched API routes locally with `curl` before claiming success; "it compiles" is not "it works" — functional verification > smoke test > type check.

### 3.6 Session Protocol — STATE.md First (Owner directive 2026-09-03 — approved study «المنظومة المعرفية للمشروع كلها»)

Every session opens with: (0) read `STATE.md` — the official always-current state (~30 s); (1) `git fetch origin --quiet` + last 3 `worklog.md` entries + last 5 commit subjects; (2) trust NO number in ANY doc — take it from its single source (the map in `STATE.md`); (3) survival law — the workspace is EPHEMERAL, so any knowledge that must live is committed & pushed in the SAME session. End-of-task duty: `STATE.md` is refreshed in the same phase/commit that changes the state it describes — a stale STATE.md is an INCOMPLETE change (same severity as §3.8).

### 3.7 Always Verify Against `origin/main` Before Any Decision or Report

The local clone and conversation memory are NOT sources of truth. Before any state claim, new task, audit, or refusal: `git fetch origin --quiet` and confirm HEAD == `origin/main`; behind → `git pull --ff-only` (or cite `git show origin/main:<path>`); ahead/dirty → surface to the Owner, never `reset --hard` / `push --force` / `checkout -- .` without explicit instruction. Runtime claims ("X is live", "Y returns 200") require verification against the production URL or a verifiable recent record — memory is not evidence.

### 3.8 Documentation Parity Law (Owner directive 2026-09-02 — «دايماً عدل التوثيقات وملفات هيكل المشروع علشان ميحصلش لغبطة» + Phase 107 single-source extension)

Every code change ships its docs in the SAME phase — never "later". Minimum per phase (append-only, newest on top): `worklog.md` entry · `STATE.md` refresh (§3.6 duty — since Phase 115, owner directive «الأمر الخامس», STATE.md is the SINGLE living status file: المرحلة + المفتوح + الممنوعات + ملخص جودة المرحلة; `PROGRESS.md`/`QA_CHECKLIST.md` were merged into it and FROZEN verbatim in `archive/`) — plus every file describing the changed behavior (`README.md`, `DEVELOPER_GUIDE.md`, `AGENTS.md`, the `build-info` `aiTopology` label). **FEATURE README LAW (owner directive 2026-09-05):** any NEW feature, or any important modification of an existing feature, MUST be documented in `README.md` in the SAME phase — what it does, where it lives, how to use it; a feature missing from README is an INCOMPLETE change. **Single-source number law:** README/DEVELOPER_GUIDE carry ZERO variable counts — numbers live in the code or `supabase/migrations/INDEX.md`; `scripts/docs_audit.py` fails the push on any count there, on duplicate section numbers in this file, and on STATE consistency (phase + required sections + QA summary). Wrong-but-confident docs are worse than missing docs — fix or delete; dead code and stale references are deleted in the same phase (git preserves). Docs-only changes are allowed; commit starts with `docs:`. Obsolete sections move to `archive/` (append-only) or carry a `> **Deprecated (date):** reason` marker; resurrecting `PROGRESS.md`/`QA_CHECKLIST.md` at the root is gated (docs_audit F).

---

## 4. Definition of Done

A task is "Done" only when ALL of the following are true:

- [ ] Code written, formatted, committed with a clear message.
- [ ] §3.5 command set executed — all checks pass, no new errors/warnings beyond pre-existing.
- [ ] Affected routes/pages smoke-tested locally.
- [ ] Documentation updated (§3.8 minimum set + every file describing the changed behavior).
- [ ] `STATE.md` refreshed when phase / open items / prohibitions changed.
- [ ] `worklog.md` gained a new entry per §12.5.1.
- [ ] No secrets, no customer data, no production-only config committed.
- [ ] Change pushed and the human supervisor notified for deployment.
- [ ] Final report (§12.9) filed.

"Do not claim PASS unless the acceptance criteria are actually met." — non-negotiable.

---

## 5. Source-of-Truth Hierarchy

> **Deprecated (2026-08-24):** Superseded by §12.8. Do not use this hierarchy.

---

## 6. Rules for Database / Schema Changes

Every schema change = numbered migration under `supabase/migrations/` with the timestamped name `YYYYMMDDHHMMSS_NNNN_<slug>.sql` — **idempotent** (`IF NOT EXISTS`), **RLS policies for any new table in the same file**, applied to production AUTOMATICALLY by the Supabase–GitHub integration when the commit lands on `main` (Phase 120 correction, owner directive 2026-09-05 — Supabase LINKED to GitHub; the Supabase Preview gate stops a failing migration BEFORE production), NEVER renamed after landing (Phase 61 incident); the agent still NEVER applies SQL to production itself. The ONLY manual path is the `auth.users` exception (0040/0050/0055/0066 — an auto-migration failing on integration-role auth privileges would block the whole pipeline: the 0054 lesson) plus legacy `RUN_ON_SUPABASE_*`/`VERIFY_*` files; those manual-SQL deliveries MUST attach the RAW GitHub link of a ready-to-run file plus ONE consolidated `RUN_ON_SUPABASE_<IDs>.sql` (closing `NOTIFY pgrst, 'reload schema';` + VERIFY block) — describing manual SQL without the runnable file + raw link is an INVALID delivery. **MIGRATION INDEX LAW:** every new migration adds its row to `supabase/migrations/INDEX.md` and regenerates `src/lib/supabase/types.ts` in the same commit; `python3 scripts/migration_audit.py` must report no NEW drift before push. Full migration law + per-table rules + storage: [`docs/TECH_REFERENCE.md`](docs/TECH_REFERENCE.md) §1.2–§1.5.

---

## 7. Rules for Security-Sensitive Changes

Explicit human approval BEFORE implementation (not just after) for: auth (`auth-server.ts`, `middleware.ts`, `auth/*`) · RLS policies · payment logic (`api/tools/*`, `subscription_requests`, receipts, coach approval) · AI key handling (`ai-provider.ts`, AI Settings) · cookies/sessions/OAuth callbacks · CORS/CSP/HSTS or any `vercel.json` header · PII processing · any new external HTTP call. Process: prose proposal → human review (§2) → implement → `tsc`/lint/smoke → `SECURITY.md` updated → commit prefix `security:`.

---

## 8. Rules for AI Functionality Changes

> **Revised (2026-08-27, owner directive).** Slimmed 2026-09-03 (Phase 113, owner «الأمر الثالث»): every law keeps its name + binding core (one to two lines); the long narratives, SQL, and full tables live in the code and `docs/TECH_REFERENCE.md` (§12.8: code wins).

- **PROVIDER LAYER:** `src/lib/ai-provider.ts` is the SINGLE source of truth for AI calls — providers OpenRouter + Groq ONLY. Two intentional paths: `callFreeAIFallbackChain()` (sequential strongest-first, budget-clamped ≤52s on Vercel) and `callFreeOpenRouterRace()` (parallel fastest-wins, swap only) — never collapse or bypass them; consumers never fetch provider URLs themselves. Scheduled/batch AI work follows the native-GHA pattern (`scripts/blog-runner/run-step.mts` in-process; GHA-only `AI_CHAIN_TOTAL_BUDGET_MS` override), never new Vercel-capped endpoints.
- **BLOG PIPELINE v3 — LANGUAGE SPLIT (supersedes v2):** six phases `p0-research → p1-outline → p2-content → p3-images → p4-review → p5-publish` under `/api/cron/blog/` with REQUIRED `?lang=en|ar`; one queue row == ONE article in ONE language; 1 slot/day/language since Phase 119 (owner directive 2026-09-04: ONE AR + ONE EN article per day at different geography-anchored times — EN 22:00 UTC = 18:00 ET · AR 05:00 UTC = 08:00 Cairo) via independent `blog-post-en.yml` / `blog-post-ar.yml` (concurrency groups independent on purpose). Legacy step1/step2a..step3 routes and dual-language statuses are retired.
- **ai_jobs TOPOLOGY:** every batch AI call is an `ai_jobs` row (migration 0024) processed natively by `process-ai-jobs.yml` every 10 min via `scripts/ai-jobs-runner/process.mts`; types: `plan_nutrition | plan_workout | meal_regenerate | exercise_regenerate | article_tool | social_post`; the ONLY direct-model exception is EVO chat (Vercel streaming, chain "fast"). Vercel routes may ENQUEUE (`/api/ai/jobs`) but NEVER call a model; retired routes/components stay guard-banned. New AI feature = new job_type + processor entry in `ai-job-processors.ts` + JOB_GATE row. Browser: SELECT-own-row RLS only; writes service-role exclusive (TECH_REFERENCE §1.4).
- **PROVIDER BALANCE + DUAL-KEY POOL:** the chain alternates the leading provider per call (parity counter), rotates BOTH OpenRouter accounts round-robin (`OPENROUTER_API` #2 + `OPENROUTER_API_KEY` #1), retries the SAME model on the other account on 401/402/403/429 before falling down the ladder; `callAIWithFallback` stays EXACT (one config → one provider, honest errors) — never a silent cross-provider stage inside it.
- **UNIVERSAL MODEL SWITCHER COVERAGE:** every AI subsystem rides the chain with an observational `tag` naming subsystem+provider+model+key event — live registry is the code (`ai-provider.ts` + call sites); a bare provider fetch outside the chain is banned; new consumers import from `ai-provider.ts` AND register their tag; Vercel Production env carries the same keys as GHA secrets.
- **IMAGE SAFETY v1/v2 (SUPERSEDED):** negation-suffix prompts FAILED (diffusion treats negation as attractor) and semantic person-scene attractors defeated token sanitization — the retired constant is BANNED by guard-stale-refs; canary suites replay the incident prompts.
- **IMAGE SOURCE LAW v3 — PEXELS-FIRST (current):** AI image generation RETIRED; every blog image is REAL stock photography (Pexels primary + `PEXELS_API_KEY`, Unsplash/Pixabay failover, Pixabay safesearch=true). Normal people allowed, nudity/immodesty NOT: `sanitizeImageQuery()` strips NSFW (EN+AR) + negations, `hasNsfwVocabulary()` screens every alt-text; lightweight delivery via Pexels src.landscape + the site's next/image WebP system; deterministic rotation per `variationKey` (article, position); FAIL-FAST without the key (required in GHA secrets AND Vercel Production); canaries in `image-safety.test.ts` v3.
- **BLOG BODY IMAGE RENDER LAW:** `renderMarkdown()` converts `![alt](url)` → lazy `<img>` BEFORE the link rule (else images degrade to bare links); unsafe schemes dropped (XSS guard) — guarded by `blog-markdown-images.test.ts`.
- **EVO CHAT SURFACE & HISTORY LAW:** the floating widget is the ONLY EVO chat surface (`/chat` permanently redirects to `/evo`; CTAs open the widget via `openEvoFloatingChat()`); back-button CLOSES the drawer (sentinel history entry); assistant links persist INSIDE `body` markdown (`evo-chat-links.ts`) and render as anchors; persistence is hydration-gated (an empty mount-time write must never wipe history); reopening lands on the LATEST message (scroll-ref snap — never key on `[messages, isTyping]`, never `scrollIntoView`); system prompt carries a hard capability whitelist (EVO says "I can't" rather than inventing tools) and answers render plain text only (`evo-chat-format.ts`); floating icon ≥48px.
- **AI SURFACE DEEP-AUDIT LAW:** every UI control calling an API must target an existing route (CI: `check-ui-wiring.sh`); uploads go through `POST /api/upload` + `GET /api/file` (bucket allowlist, MIME+5MB, server-rebuilt paths, service-role write, permanent same-origin URLs for private buckets — TECH_REFERENCE §1.5); AppLayout `coachExtraLinks` lists EVERY `/admin/*` page for isAdmin only; re-audit after ANY new button+endpoint pair.
- **ROLE MODEL v2 LAW (migration 0029+):** `profiles.role` = `client | coach | admin`; STAFF = coach ∪ admin; `is_coach()` = `role IN ('coach','admin')` — NEVER rewrite policies back to `= 'coach'` only; client-data RLS uses `is_coach_over()` (TECH_REFERENCE §2.2). `/admin/*` is admin-exclusive (AdminGate); client surfaces are staff-blocked (ROLE SURFACE LAW); staff bypass consumer quotas; no sales funnel for staff; promotion via the `coach_emails` allowlist (never downgrades an admin) or manual SQL for admins. Multi-coach (0030–0033): `coach_assignments` is the 1:1 source of truth (auto-assign to admin until reassigned); coach_pages powers the bilingual public landing (0032); team management is one lifecycle on `/admin/assignments` + `/api/admin/staff` (add → assign → demote). Full flows: TECH_REFERENCE §2.
- **COACH ACTIVATION + OFFLINE PAYMENTS (0034+):** the coach collects OUTSIDE the site and activates the subscription himself; the site NEVER touches that money — it RECORDS it (`coach_payments`). `extend_subscription()` is guarded (service role / admin / assigned coach only). `/api/coach/subscriptions/activate` verifies assignment + role, activates tier 'coaching' ONLY, debits the wallet atomically BEFORE extending (402 `insufficient_wallet`; admins wallet-exempt), refunds on failure. PLAN-BALANCE QUOTA: plan generation draws from the CLIENT'S one balance (evo_chat_usage + done ai_jobs) — weekly caps by tier AND monthly total (tier-limits.ts); editing + manual uploads UNLIMITED (legacy double cap removed 2026-09-02).
- **COACH WALLET LAW (0035+):** `coach_adjust_wallet()` is the ONLY wallet writer (SECURITY DEFINER, row-locked, never negative). Top-ups: manual receipt review on `/admin/wallets` OR PayPal automated (purpose `wallet_topup`, USD 1:1, DETERMINISTIC UUID5 ledger ref — replays idempotent; the webhook stays LOG-ONLY, never credits). Monthly quota: coach AI usage counts only the CURRENT UTC calendar month. Self-registration PUBLIC (`/api/coach/register`, rate-limited + honeypot; role granted server-side only — 0036 hardened `handle_new_user()` so signup metadata can never set a role).
- **COACH BOOST PACKAGE (0037+):** per-client fees are PACKAGE-based (COACH_CLIENT_PACKAGES + the single debit calculator in coach-limits.ts); coach ads by ATOMIC wallet debit (homepage «مدربون مميزون» strip); public profile enrichment via the coach-public bucket; coach-only support channel at `/coach/help` (client support belongs to the coach); share icons allowed but the WhatsApp share target is REMOVED by decree; the coach's WhatsApp number is served ONLY via `/api/my/coach-whatsapp` gated on ACTIVE subscription + assignment (never public, never a share target); affiliate commission EXCLUDED for any client with a `coach_assignments` row (both choke points); staff clients surface splits عملاء المدربين / عملاء الموقع.
- **COACH CLIENT BOUNDARY + TERMINOLOGY LAW:** TWO money worlds share the word «كوتشينج» — SITE COACHING (B2C: sold on the site, admin-reviewed only — 0043 dropped every coach RLS policy on `subscription_requests`) vs COACH SYSTEM (B2B: coach collects outside, site records + takes its wallet fee; coaching tier only). Coaches never see site memberships (0041: subscriptions RLS hardened, direct insert/update revoked) and never generate plans without an ACTIVE coaching subscription + assignment (server 402 + DB RLS `plans_insert_coach`). Dates are NEVER hand-edited — `extend_subscription` (0018) computes/stacks them; UI shows a preview only. Coaching-page prices reverted to Starter $20 / Elite $40 (0046); subscription rows always written via `canonicalModelTier()` (starter → premium, elite → pro).
- **GLOBAL USD LAW (0038):** fixed owner rate 50 EGP = $1 — every platform-side money figure is USD ONLY; source of truth `coach-limits.ts`; legacy EGP payloads accepted and ÷50 for compat; user-facing money strings never show EGP/ج.م.
- **BRAND NAME LAW:** the site name is written EXACTLY «Musclehubeg» in every user-visible string (metadata, i18n, legal, landing, affiliate, AI prompts, PayPal descriptions); legacy spellings «MuscleHubEG» / «MuscleHub Egypt» / «MuscleHub» are FORBIDDEN in new code; lowercase technical identifiers stay as-is.
- **USAGE LIMIT ENFORCEMENT LAW:** every limit advertised in `memberships.ts` MUST be enforced SERVER-SIDE at the only route that can consume it, and the client UI mirrors the SAME resolved tier — display/enforcement drift is a defect. Anonymous chat throttled SERVER-SIDE via salted-hash `evo_anon_usage` (fail-open on ledger errors). Plan intents consume the MONTHLY per-domain quota; swap/regenerate stays on the WEEKLY quota — never double-count one message in both; advertised numbers change ONLY in memberships.ts.
- **SCHEDULE HEALTH LAW:** GitHub can silently DE-REGISTER scheduled workflows repo-wide — any "blog stopped" report starts with schedule forensics (`GET /actions/runs?event=schedule`), NOT code re-reading; remedy = re-enable every workflow + a touching commit to re-register. Backstop (never trust the scheduler alone): `/api/cron/dispatch-pipelines` (CRON_SECRET, fail-closed, daily 23:00 UTC — after both Phase-119 daily slots) tops pipelines up to their publishing quota (ONE article per language per day) + re-dispatches a stale ai-jobs worker; requires `GITHUB_DISPATCH_TOKEN` (never committed — §3.2). Diagnose quota (429s) BEFORE schedules; schedules BEFORE code.
- **PLAN JOB RECOVERY LAW:** queue jobs that materialize user-visible artifacts are SURVIVABLE state — enqueued plan jobs persist in localStorage (`src/lib/plan-jobs.ts`, 24h TTL) with mount-reattached watchers, finished jobs surface as one-click recovery cards (never double-saved); regeneration enqueues the replacement FIRST and deletes the old draft only after the new plan arrives and only while still a draft; staff requesters bypass the swap quota (plan-editing tools, not self-service).
- **EVENT-DRIVEN AI DISPATCH LAW:** enqueue alone is NOT enough on a cron worker — every enqueue path push-triggers the runner (`src/lib/ai-runner-dispatch.ts`, fail-open); `POST /api/ai/jobs` answers honest `runnerDispatched` + `etaMinutes`; `GITHUB_DISPATCH_TOKEN` is a REQUIRED production secret. New job types register in FOUR places (AI_JOB_TYPES + JOB_GATE + sanitizeJobPayload + processor registry; required fields throw `JobPayloadError` → 400). Completed `article_generate` jobs are ALWAYS materialized as blog_posts DRAFTS (never only inside ai_jobs.result); auto topics use the smart-topic brain with pillar rotation; the runner exits NON-ZERO on permanent failure (GREEN == done=N failedPermanent=0); GHA actions pinned v5, node 22.
- **ARTICLE QUALITY FLOOR + ANTI-FORMULA:** the ASK is always the maximum bar — 1100-1400 words, 6-9 sections, FAQ 4-6 persisted to faq_json, 2-3 real internal links, distinct meta_title; floors are rejection NETS below the ask (never the target); each generation draws a random opening archetype; shallow drafts requeue; lowering any contract requires explicit owner approval in the same commit message.
- **QUALITY-FIRST LAW — OWNER GENERAL CONDITION:** maximum quality for EVERYTHING is the site's primary goal: prompts, floors, and model order preserve-or-raise the ask; smaller models are last-resort fallbacks never promoted above stronger ones; resilience work (multi-bucket chains, cooldowns) increases AVAILABILITY of strong models, never substitutes weak output.
- **SEO-SLUG + IMAGE BUNDLE LAW:** every article_generate draft lands COMPLETE — model-produced English SEO slug (translates the MEANING, never transliterates; latin-only nets with the dated fallback as LAST net) + 3-5 ENGLISH image_queries resolved Pexels-first (images[0] = featured + cover_alt; images[1..] embedded at section boundaries); slug/image enrichment can NEVER fail the article (graceful degrade).
- **ONE-SLUG-LAW:** ALL slug logic lives ONLY in `src/lib/slug.ts` — canaries read the sources and FAIL THE BUILD if a local copy reappears; improvement tools are text transformers (copy-only panel); the M15 save gate remains the boundary verifier.
- **TOOL RESULTS UX LAWS (recovery · all-results · copy-vs-display · clear-failed · clear-persists · per-image-swap):** the editor AI-results panel is APPEND-ONLY (same tool twice = two cards) with DONE-job hydration (≤24h) + manual refresh; dismissed ids persist in localStorage (a clear that resurrects on navigation is broken); «نسخ» copies ONLY the paste-able deliverable; failed-row health alerts are dismissible via a JSON-only handler using the proven `.delete().in("id", ids)` shape; every standalone image block carries its own safe swap button replacing EXACTLY that occurrence through the same suggest-image pipeline.
- **GUARD-COMMITMENT COROLLARY:** a guard that is not COMMITTED is not a guard — any script a workflow references must appear in the SAME commit.
- **PROJECT-WIDE PREVENTION LAW:** the recurring incident classes are permanently guarded — button → dead target (`check-ui-wiring.sh`), type without processor / orphan processor (CI + ai-jobs-visibility.test.ts exact parity), dishonest success (explicit non-zero exit paths in every runner), silent rot (`/api/ai/queue-health`). Feature DoD: button → route exists (CI), job → processor (CI), visible materialization, honest runner exit, docs in the SAME commit.
- **RATE-LIMIT RESILIENCE LAW:** free-tier 429s are TRANSIENT — retries must OUTLIVE the window, not re-burn it (70s sleep after a rate-limit requeue; heavy article calls try maxModels 5); back-to-back retries dying inside one TPM window are a runner bug, not provider fate.
- Never log the AI response in production paths (PII / partial reasoning); local fallbacks (`src/lib/ai-local.ts`) stay for graceful degradation; any change to the AI system prompt requires owner approval; EVO chat quota accounting stays server-side in the tamper-proof `evo_chat_usage` ledger (migration 0022) — never client-written rows again.

> **Deprecated (2026-08-27):** the previous note describing `callFreeOpenRouter()` / `callFreeOpenRouterLimited()` as one of the two canonical paths — those functions were removed as dead code and the documented trade-off now lives in `callFreeAIFallbackChain`.

---

## 9. Final Report Format

> **Deprecated (2026-08-24):** Superseded by §12.9. Do not use this format.

---

## 10. Git & Commit Conventions

- Branch off `main` for non-trivial changes; the owner may merge feature branches or commit directly to `main` for small fixes.
- Commit author email: `muscleshubfit@gmail.com` — agents use the same identity.
- Prefixes: `feat:` new feature · `fix:` bug fix · `docs:` documentation only · `refactor:` no behavior change · `security:` security-sensitive (pre-approved per §7) · `chore:` tooling, deps, build config.
- Push to `origin` only after the local verification step (§3.5) passes — if `tsc --noEmit` fails, do not push.

---

## 11. When in Doubt

Ask the human supervisor — early, not after a half-built feature. Cite the exact file + line + observed behavior. Prefer reversible changes (a new file is reversible, a dropped column is not). Document assumptions in the final report under "Potential risks" / "Implementation findings".

---

## 12. Project Workflow Rules (Adopted 2026-08-21)

> **Status:** Active binding policy — applies to every task from 2026-08-21 onward; changeable only by explicit Owner directive. These rules supplement §3 and §4; where they conflict with an older section of this file, these rules win.

### 12.1 Communication

Reports short and direct; no repeated explanations or already-executed steps; no scope expansion or reopening finished tasks without a reason; stop and ask the Owner only on genuine ambiguity.

### 12.2 Execution Flow

Every task executes in this order inside the same task:

```
IMPLEMENT → VALIDATE → DOCUMENT → COMMIT → PUSH
```

Do NOT wait for a separate instruction to validate, document, commit, or push — unless the Owner explicitly asked to skip one of these steps (for example, "show me the report before commit").

### 12.3 No Redundant Verification

Do not create a separate command to re-verify what was already verified; results belong in the task's own report; after success, move directly to the next task.

### 12.4 Task Continuity

Do not redo completed steps; preserve the current task's state; with queued tasks, advance automatically; never start a new task from memory or guessing — use the project's actual state (code, migrations, docs, worklog).

### 12.5 Documentation

Document every completed task while executing it, using the existing files (`STATE.md`, `worklog.md`, `AGENTS.md`, `DEVELOPER_GUIDE.md`, `SECURITY.md`, `README.md` — status history frozen in `archive/` since Phase 115) — no new documentation system if the existing one suffices; one comprehensive review pass is allowed at the end of a large body of work.

> **Consolidated (2026-08-24):** executed via `docs/_AUDIT.md`. Do not create new documentation files — except `STATE.md` (Phase 107, owner-approved knowledge operating system; §3.6/§3.8) and `CONTRIBUTING.md` (Phase 115, owner-directed contribution policy).

#### 12.5.1 `worklog.md` Entry Template (Binding)

Every task MUST append exactly one entry to `worklog.md` following this template. No free-form entries are allowed.

```markdown
---
Task ID: <unique ID, e.g. AFFILIATE-BANNERS-2026-08-24>
Agent: <agent name, e.g. Main (Z User)>
Task: <one-line description of the task>

Work Log:
- <concrete step 1>
- <concrete step 2>
- ...

Stage Summary:
- <key results / important decisions / produced artifacts>
- Commit SHA: <sha>
- Push status: <pushed | not-pushed>
```

Rules: the `---` separator before each entry is mandatory (append-only log); `Task ID` MUST be unique across the file (search before adding); `Work Log` is bulleted, factual, chronological; `Stage Summary` includes the commit SHA and push status (matches §12.9).

#### 12.5.2 Periodic Documentation Audit (Cadence)

A full documentation audit MUST run: monthly (last week) · after any major feature addition (within 7 days) · after any force-push or major git operation (within 24 hours) — per `docs/_AUDIT.md`: doc counts vs actual `find`/`wc -l`, no references to missing files, no duplicate commands across §3.5/§4/QA, no deprecated sections still cited, true Last-updated dates, live route status codes matching docs. Results append to `worklog.md` under Task ID `DOC-AUDIT-YYYY-MM-DD`.

### 12.6 Duplicate Tasks

Treat EVO AI and AI Chat as ONE task (`EVO AI / AI Chat`); never record the same function as two tasks under different names; check whether an equivalent task already exists before adding any.

### 12.7 AI Master Roadmap

Aggregate AI task lists from actual source code, `STATE.md`, `worklog.md`, `DEVELOPER_GUIDE.md`, and context; classify each task as `COMPLETED` / `IN PROGRESS` / `DEFERRED` / `NOT STARTED`; do NOT start implementation merely because a missing task was discovered — stick to the task the Owner assigns.

### 12.8 Source of Truth

Priority (highest wins):

1. Actual Code & Config (`src/**`, `next.config.ts`, `tsconfig.json`, `package.json`, `vercel.json`)
2. Database / Migrations (`supabase/migrations/*.sql`)
3. QA Evidence (`STATE.md` ملخص جودة المرحلة · `archive/QA_CHECKLIST.md` frozen at Phase 115, manual smoke tests in commit messages)
4. Project Documentation (`README.md`, `DEVELOPER_GUIDE.md`, `STATE.md`, `AGENTS.md`, `SECURITY.md`)
5. Conversation Context
6. General Knowledge

If documentation conflicts with code, **code wins**.

### 12.9 Final Report

After every task: what was done · verification result · commit SHA · push status · next task · raw SQL links (mandatory for schema/DB tasks — §6). **PLAIN-STEP EXECUTION GUIDE (BINDING):** any task requiring a MANUAL owner action (run SQL, trigger a workflow, set an env var, redeploy, click anything) ships a short numbered plain-language walkthrough: exact URL → exact button/tab → what to paste/select → what success looks like → how to roll back. Assume a non-technical reader; reporting a manual step without this guide is an INVALID delivery (same severity as §6 without the raw link).

### 12.10 Out-of-Scope Prohibited

Do not add steps or improvements outside the current task's scope; do not wait for a new instruction to validate / document / commit / push after task completion, unless the Owner asked otherwise.
