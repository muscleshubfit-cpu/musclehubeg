# AGENTS.md — MuscleHubEG AI Agent Operating System

> **Status:** Active — required reading for every AI agent (and human
> contributor) before any commit, PR, or production change.
> **Last updated:** 2026-08-25
> **Owner:** muscleshubfit@gmail.com (project owner + human supervisor)

---

## 1. Purpose

This file defines the operating rules for AI agents working on the
MuscleHubEG repository. It exists to make agent behavior **predictable,
auditable, and safe** in a project that is:

- **Public** as a Git repository (anyone can read the code).
- **Proprietary** as a product (the code is NOT open source — see
  `LICENSE`).
- **Production-deployed** (real customers, real payments, real PII).
- **Agent-assisted** (multiple AI agents operate on the codebase in
  sequence or in parallel).

Agents are **implementers and reviewers**, not autonomous product
owners. They execute well-scoped tasks, document their work, and hand
control back to a human supervisor.

---

## 2. Roles

| Role | Who | Authority |
|---|---|---|
| **Project Owner / Human Supervisor** | `muscleshubfit@gmail.com` (Ahmed) | Final say on every change. Approves features, fixes, schema changes, security changes, deploys. |
| **Technical Reviewer** | Any AI assistant the Owner designates for the active supervision session. The Owner relays reviewer commands to the Implementation Agent. (Supersedes the previous ChatGPT arrangement.) | Reviews proposals, drafts task commands, suggests alternatives, flags risks. Does NOT commit code directly. |
| **Implementation Agent** | GML (this agent) + any sub-agent it delegates to. | Writes code, runs tests, updates docs, pushes commits. Every change must be reviewed/approved by the human supervisor before going to production. |

The owner may, at their discretion, designate additional agents or
reviewers. Until then, the table above is authoritative.

---

## 3. Operating Rules (Binding on All Agents)

### 3.1 Inspect Before Modifying

- **Read the actual source code, configuration, and migrations before
  changing anything.** Documentation can lag behind implementation — the
  source of truth hierarchy (§12.8) defines what wins.
- If documentation conflicts with implementation, do NOT blindly follow
  the documentation. Verify the implementation and document the
  discrepancy in `PROGRESS.md` (or the appropriate file).
- Quote file paths + line numbers in your commit messages and final
  reports so the human reviewer can verify.

### 3.2 Do Not Expose Secrets

- Never commit secrets, API keys, OAuth tokens, database connection
  strings, service-role keys, or any credential to the repository.
- Never paste a real key into a code comment, test fixture, README,
  example, or chat message.
- Never log secrets server-side. Audit `console.log` / `JSON.stringify`
  calls before committing — they can leak through Vercel logs.
- The `.env*` pattern is in `.gitignore`. If you ever need to add a
  new secret-able env var, add it to `.env.example` with an EMPTY
  value, and document its purpose in `SECURITY.md`.
- If you suspect a secret was accidentally committed, stop, alert the
  owner immediately, and do NOT push. The owner will rotate the secret
  and clean history if needed.

### 3.3 Do Not Modify Production Data

- Never run `DELETE`, `UPDATE`, `TRUNCATE`, or `DROP` against the
  production Supabase database from an agent context.
- Read-only queries (e.g. `SELECT count(*) FROM blog_posts`) are
  allowed when necessary for verification, but should be avoided unless
  the task explicitly asks for them.
- Any required data migration must be:
  1. Written as an idempotent SQL file under `supabase/migrations/` with
     the next sequential number.
  2. Tested locally or on a staging project.
  3. Hand-applied by the owner on the production Supabase SQL Editor
     (the owner runs the SQL; the agent only ships the file).

### 3.4 Do Not Invent Architecture

- If a task asks for a feature that has no precedent in the codebase,
  the agent MUST:
  1. Propose the design in plain prose (no code) first.
  2. Hand it to the owner / technical reviewer for sign-off.
  3. Only implement after the design is approved.
- Do not introduce a new state-management library, ORM, auth library,
  payment provider, AI provider, or deployment target without explicit
  owner approval. The current stack is documented in
  `DEVELOPER_GUIDE.md` — stay inside it.

### 3.5 Verify Changes

> **Canonical command set — do NOT duplicate these commands elsewhere.**
> §4 (Definition of Done) and `QA_CHECKLIST.md` (Verification Protocol)
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

Additional rules:

- For changes that touch API routes, smoke-test the route locally with
  `curl` against the dev server before claiming success.
- "It compiles" is not the same as "it works." Functional verification
  > smoke test > type check.

### 3.6 Update Documentation When Required

- Any change that affects the public API surface (route count, env
  vars, table schema, build command, deploy config) MUST be reflected
  in the matching docs in the same PR/commit:
  - `README.md` — user-facing summary
  - `DEVELOPER_GUIDE.md` — developer onboarding
  - `PROGRESS.md` — feature/bug tracker
  - `QA_CHECKLIST.md` — verification evidence
  - `SECURITY.md` — anything security-sensitive
- Documentation-only changes are allowed without code changes, but the
  agent must explicitly mark in the commit message: `docs: ...`.
- Do not delete documentation history without a reason. If a section is
  obsolete, mark it `> **Deprecated (date):** reason` and keep it for
  one release cycle before removing.

### 3.7 Always Verify Against `origin/main` Before Any Decision or Report

- **The local clone and the session/conversation memory are NOT sources
  of truth.** They can lag behind, be stale, or be divergent from the
  actual production state. Always treat `origin/main` on the remote
  repository as the authoritative reference for the current project
  state, and treat deployed production (live URLs, Vercel dashboard,
  Supabase production) as the authoritative reference for the runtime
  state.
- Before **any** of the following actions, the agent MUST run
  `git fetch origin --quiet` and verify that the local `HEAD` matches
  `origin/main`:
  - Claiming the project state (file existence, route count, feature
    status, dependency presence, etc.) in any report or commit message.
  - Starting work on a new task that depends on the current state of
    files, schema, routes, or env vars.
  - Producing a "what's there" / "what's missing" audit.
  - Refusing a task because "the feature doesn't exist" — verify on
    `origin/main`, not on the local clone.
- If the local `HEAD` is behind `origin/main`, the local clone is
  **stale**. Do NOT trust the local working tree as evidence. Either:
  - Run `git pull --ff-only` (preferred) to fast-forward the local
    branch, or
  - Explicitly cite `git ls-tree -r origin/main --name-only` /
    `git show origin/main:<path>` as the source of truth for any
    claim about file existence or content.
- If the local `HEAD` is ahead of `origin/main` (local-only commits) OR
  the local working tree has uncommitted modifications, do NOT silently
  reconcile them. Surface the discrepancy to the Owner in the report and
  let the Owner decide whether to merge, rebase, or discard. Never run
  `git reset --hard`, `git push --force`, or `git checkout -- .` to
  "fix" a divergence without explicit Owner instruction.
- The same rule applies to runtime / production state: before claiming
  "feature X is live" or "route Y returns 200", the agent must verify
  against the actual production URL (or have a verifiable record of a
  recent successful request). Conversation memory and old commit
  messages do not constitute verification.
- This rule overrides any prior assumption in this document about
  "the local clone reflecting the project state". When in doubt, fetch
  and diff.

---

## 4. Definition of Done

A task is "Done" only when ALL of the following are true:

- [ ] Code is written, formatted, and committed with a clear message.
- [ ] Verification command set (§3.5) executed — all checks pass with
      no new errors or warnings beyond pre-existing.
- [ ] Affected routes / pages were smoke-tested locally.
- [ ] Documentation is updated (`README`, `DEVELOPER_GUIDE`, `PROGRESS`,
      `QA_CHECKLIST`, `SECURITY` as applicable).
- [ ] `PROGRESS.md` reflects the new state (feature marked done, bug
      marked fixed, etc.) with a date.
- [ ] `worklog.md` gains a new entry following the template in §12.5.1.
- [ ] No secrets, no customer data, no production-only config was
      committed.
- [ ] The change was pushed, and the human supervisor was notified for
      production deployment.
- [ ] The final report (§12.9) was filed.

"Do not claim PASS unless the acceptance criteria are actually met." —
this rule is non-negotiable.

---

## 5. Source-of-Truth Hierarchy

> **Deprecated (2026-08-24):** Superseded by §12.8. Do not use this hierarchy.

---

## 6. Rules for Database / Schema Changes

- Every schema change MUST be a numbered migration file under
  `supabase/migrations/NNNN_description.sql`.
- Migrations MUST be **idempotent** (use `CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, etc.) so re-running them is safe.
- Migrations MUST include RLS policies for any new table.
- The agent MUST NOT apply migrations to production. The owner runs
  them via the Supabase SQL Editor.
- **RAW-SQL-LINK RULE (FIXED — BINDING FOR ALL CLIENTS/PROJECTS):**
  whenever a task touches the database schema or produces SQL the
  owner must execute manually, the agent MUST write ready-to-run SQL
  and attach its RAW GitHub link in the format
  `https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path>`
  so the owner can open it and paste it straight into the Supabase SQL
  Editor with zero downloads. Describing the SQL without attaching the
  runnable file + raw link is an INVALID delivery.
- For every migration batch, additionally create ONE consolidated
  paste-ready script `supabase/migrations/RUN_ON_SUPABASE_<IDs>.sql`
  containing all steps, the closing `NOTIFY pgrst, 'reload schema';`,
  and a VERIFY query block — following the existing
  `RUN_ON_SUPABASE_*` pattern — and attach its raw link too.
- After applying a migration, the owner MUST run
  `NOTIFY pgrst, 'reload schema';` so PostgREST picks up the change.
- If a migration introduces a column that previously was created
  ad-hoc in production (as happened with `meal_plans`, `plan_swaps`,
  `progress_photos`, `coach_presence` — see `PROGRESS.md` Phase 5),
  the migration file MUST start with `IF NOT EXISTS` checks so it does
  not break on re-run.
- Update `DEVELOPER_GUIDE.md` § "Database + RLS" with the new table
  count and list.

---

## 7. Rules for Security-Sensitive Changes

Any change that touches the following categories requires **explicit
human approval before implementation**, not just after:

- Authentication (`src/lib/auth-server.ts`, `src/middleware.ts`,
  `src/app/auth/*`, Supabase Auth config).
- Authorization / RLS policies (any migration that grants or revokes
  access).
- Payment logic (`src/app/api/tools/*`, `subscription_requests` table,
  receipt review flow, coach approval flow).
- AI provider key handling (`src/lib/ai-provider.ts`, the AI Settings
  page, env var resolution).
- Cookies, session tokens, OAuth callbacks.
- CORS, CSP, HSTS, or any header in `vercel.json`.
- Anything that processes PII (email, phone, photos, body metrics).
- Anything that adds a new external HTTP call (new AI provider, new
  payment gateway, new analytics endpoint).

Process:
1. Agent drafts the proposed change in prose (no code yet).
2. Human supervisor + optional Technical Reviewer review (see §2).
3. Agent implements the approved design.
4. Agent runs `tsc`, `lint`, smoke test.
5. Agent updates `SECURITY.md` to reflect any new policy.
6. Agent commits with prefix `security:`.

---

## 8. Rules for AI Functionality Changes

> **Revised (2026-08-27, owner directive):** the provider set and call
> paths were consolidated. This section now reflects the ACTUAL
> architecture in `src/lib/ai-provider.ts`.

- The AI provider layer (`src/lib/ai-provider.ts`) is the SINGLE source
  of truth for how the app talks to AI providers. Do not duplicate
  fetch logic in route handlers.
- **Allowed providers: OpenRouter + Groq ONLY.** Direct Gemini SDK /
  OpenAI / Anthropic / DeepSeek integrations are removed. To reach a
  Google model, use its OpenRouter slug (e.g. `google/gemma-4-31b-it`).
- Two execution paths exist by design:
  - `callFreeAIFallbackChain()` — sequential interleaved strongest-first
    chain (OpenRouter + Groq), budget-clamped so
    `maxModels × timeoutMs ≤ 52s` (Vercel Hobby safe). Used by chat,
    plans, articles, topics, research, admin tools.
  - `callFreeOpenRouterRace()` — parallel fastest-wins via `Promise.any()`.
    Used by swap only (speed-critical).
  - Do not "simplify" by collapsing them — the trade-off is intentional.
- **Native GitHub Actions execution (2026-08-27 owner directive):** the
  scheduled blog pipeline runs INSIDE the Actions job via
  `scripts/blog-runner/run-step.mts` (imports the same route handlers
  in-process — no Vercel hop). In that context only,
  `AI_CHAIN_TOTAL_BUDGET_MS` overrides the 52s clamp (workflow sets
  180000) for full-length articles. AI keys come from GitHub Secrets;
  EVO chat stays on Vercel streaming. Any new scheduled/batch AI work
  MUST follow this native-GHA pattern instead of adding Vercel-capped
  endpoints.
- **Blog pipeline v3 — LANGUAGE SPLIT (2026-08-27 owner directive,
  supersedes v2's coupled EN+AR runs):** six phases, each a route under
  `/api/cron/blog/`: `p0-research` (keyword+FAQ+5-topic research for
  EXACTLY ONE language — `?lang=en|ar` is REQUIRED; curated fallback
  keeps runs alive) → `p1-outline` (model-ranked topic pick + hard
  duplicate guard against that language's own archive, SEO title/
  subtitle/meta/slug, 5-7 H2s, LSI list, 3-5 image plan) → `p2-content`
  (1500-2500 words from the row's own outline) → `p3-images` (3-5
  images) → `p4-review` (proofread/flow/dedup, keyword coverage,
  conservative fact-guard — never invent citations, 2-4 internal links
  from same-language posts only, ≤2 trusted external links, closing CTA;
  deterministic FAQ section appended as a length safety net) →
  `p5-publish` (pure code: inserts ONE blog_posts row in the row's
  language; dynamic sitemap.ts auto-updates). ONE queue row == ONE
  article in ONE language (`blog_generation_queue.language`, migration
  RUN_ON_SUPABASE_0026_LANG_SPLIT.sql); bundles are FLAT:
  `{research0, outline, content, images, review}`. Queue statuses are
  now: researched→outlined→writing→written→images_done→reviewed→
  published (+failed/skipped_duplicate). Scheduling: TWO independent
  workflows — `blog-post-en.yml` (12:00/16:00/22:00 UTC = 08:00/12:00/
  18:00 US-Eastern) and `blog-post-ar.yml` (05:00/11:00/18:00 UTC =
  08:00/14:00/21:00 Cairo) = 3 articles/day per language at each
  audience's optimal windows; concurrency groups `blog-pipeline-en` /
  `blog-pipeline-ar` stay independent ON PURPOSE so the languages may
  overlap. Legacy step1/step2a..step3 routes AND legacy dual-language
  statuses (writing_en/en_written/writing_ar/ar_written) are retired.
- **IMAGE MODESTY GUARD (hard owner rule):** every image prompt
  anywhere in the product MUST include `IMAGE_MODESTY_SUFFIX`
  (`src/lib/blog-pipeline.ts`): modest attire, no nudity, no revealing
  or suggestive imagery, no women in revealing outfits.
- **Whole-AI-system topology (2026-08-27 owner directive — all four
  systems now run on ONE GitHub Actions queue):** every batch AI call in
  the product is an `ai_jobs` row (migration 0024) processed natively by
  `process-ai-jobs.yml` every 10 minutes via
  `scripts/ai-jobs-runner/process.mts`. Job types:
  `plan_nutrition | plan_workout | meal_regenerate | exercise_regenerate |
  article_tool | social_post`. The ONLY exception is EVO chat, which stays
  on Vercel streaming with the speed-first `INTERLEAVED_FAST_CHAIN`
  (options.chain="fast"). Binding rules:
    - PROVIDER BALANCE + DUAL-KEY POOL (2026-08-27 owner directive
      "توازي/تبادل" after OpenRouter ~50/day free ceiling burned alone):
      `callFreeAIFallbackChain` ALTERNATES which provider LEADS on every
      successive call (parity counter — strongest-available-first within
      each provider, so quality order is preserved). OpenRouter attempts
      rotate across BOTH configured accounts (`OPENROUTER_API` = account #2,
      `OPENROUTER_API_KEY` = account #1) round-robin; a 401/402/403/429
      quota-style error retries the SAME model on the other account before
      falling through the model ladder.
    - `callAIWithFallback` is EXACT: one config → one provider, errors
      surface honestly. NEVER reintroduce a silent cross-provider stage
      inside it (it used to mask who actually answered and starve the
      chain's ladder + key switch). All fallback policy lives in the chain.
    - Vercel API routes may ENQUEUE jobs (`/api/ai/jobs`) but must NEVER
      call a model directly. Retired (routes DELETED 2026-08-27, guard-enforced):
      `/api/ai/plan`, `/api/ai/swap`, `/api/ai/regenerate-meal`,
      `/api/ai/blog-tool`, `/api/ai/pick-topic`, `/api/ai/research-topic`,
      `/api/ai/generate-article`, `/api/ai/generate-image`, and legacy cron
      route `src/app/api/cron/generate-blog-post`. The v1 step name
      `step1-pick` and component `AIGenerateModal` are equally banned.
      `blog-admin.aiTool()` is neutered on purpose (throws) so nobody can
      bypass the queue accidentally.
    - New AI features = new job_type + processor entry in
      `src/lib/ai-job-processors.ts` + a gate row in JOB_GATE. Never add
      direct model calls to routes/components.
    - Plans ship 2 structured alternatives per meal; exercise swaps are
      chosen ONLY from a deterministic injury/equipment-filtered library
      pool (AI ranks inside it — never invents substitutes).
    - Payloads pass `sanitizeJobPayload()` whitelisting at enqueue;
      browsers hold SELECT-own-row RLS only — ai_jobs writes are
      service-role exclusive.
    - Article DRAFTS inside blog editor use only the queued per-section
      tools (`article_tool` / `social_post` via runAiJob); full-article
      generation lives exclusively in the native GHA pipeline. In-editor
      one-click bundle generation was REMOVED with AIGenerateModal.
- **ANTI-REGRESSION LAW (2026-08-27, after two stale-code incidents):**
    - Retiring ANYTHING (route / component / script / step name):
      `git rm` it, sweep callers, fix comments — all in the SAME commit.
      Zero tombstone files. THEN run `bash scripts/check-stale-refs.sh`
      locally; it must exit 0 before push.
    - `.github/workflows/guard-stale-refs.yml` re-scans every push/PR to
      main and fails the build naming any reintroduced retired identifier.
      Add genuinely-new retirements to BOTH the guard PATTERN and this §8.
    - Production-truth protocol: when behavior seems to "revert", FIRST
      open `/api/build-info` and compare `commitShort` with latest GitHub
      main SHA. Mismatch = deploy lag/failure — never debug or re-edit
      against a stale deployment.
    - No resurrection branches: patch branches are never kept after their
      reason expires — archive-tag them (`archive/*`), then delete.
      Branch protection on `main`: force-push disabled (owner setting).
- **UNIVERSAL MODEL SWITCHER COVERAGE (2026-08-27, owner directive
  "نظام التبديل بين النماذج يتعمل لكل منظومة"):** every AI subsystem in
  the platform rides ONE choke point (`callFreeAIFallbackChain`) and
  passes its own observational `tag` so every log line and failure names
  the subsystem + provider + model + key-pool event:
    | System | `tag` |
    |---|---|
    | EVO chat (`/api/ai/chat`) | `evo-chat` (chain:"fast") |
    | Plan generator | `plan:nutrition`, `plan:workout`, `plan:nutrition-alt`, `plan:json-normalize`, `plan:exercise-corrective` |
    | Blog pipeline v3 (GHA) | `blog:pick-topic-<lang>`, `blog:outline-<lang>`, `blog:content-<lang>`, `blog:review-<lang>` |
    | Admin article bundle libs | `article:en`, `article:ar`, `links-social` |
    | Topic research / P0 research | `blog:topics-<lang>`, `blog:research` |
    | External search simulation | `external-search` |
    | Social posts | `social-posts:<lang>` |
    | AI jobs runner | `ai-job:<tool>` |
  - Switching policy lives ONLY inside the chain: dual OpenRouter keys
    (`OPENROUTER_API` #2 + `OPENROUTER_API_KEY` #1, round-robin +
    same-model account switch on quota/auth), Groq lead on alternating
    calls, big-payload Groq guard (>~7.2k est tokens → openrouter-only),
    one immediate identical retry on 200-empty responses. Consumers
    NEVER choose providers or fetch provider URLs themselves.
  - Any NEW AI consumer must import from `ai-provider.ts` AND register
    its tag here; a bare provider fetch outside the chain is banned.
  - Vercel-side prerequisite for the Vercel-hosted consumers: Production
    env must also carry `OPENROUTER_API`, `OPENROUTER_API_KEY`,
    `GROQ_API_KEY` (plus Supabase pair) so tagged switching works there
    exactly as it does in GitHub Actions runners.
- **IMAGE SAFETY LAW — PEOPLE-FREE AI IMAGERY (2026-08-27, owner hard
  rule after live incident on two published posts):**
    - ROOT CAUSE (proven from production URLs): the retired
      `IMAGE_MODESTY_SUFFIX` injected NEGATION phrases ("no nudity",
      "no cleavage", "no women …") into every diffusion prompt.
      Diffusion models do NOT parse negation — those tokens acted as
      positive attractors and DIRECTLY caused immodest renders, plus
      drifted/off-topic subjects and Arabic prompts degrading flux.
    - NEW POLICY (structural): AI blog images are PEOPLE-FREE objects &
      scenes ONLY (equipment / food / interiors / flat vectors).
      1) Single choke point `src/lib/image-safety.ts`:
         `buildSafeImagePrompt()` sanitizes EVERY prompt — strips all
         negation constructions, person words (EN+AR), NSFW vocabulary,
         clothing wording (implies humans); prompts that described a
         people scene are fully REWRITTEN to topical object scenes.
      2) P1 outline instruction demands ENGLISH-only object subjects.
      3) P3 image #1 = topical COVER anchored to focus keyword/title
         (drives featured_image + og:image relevance).
      4) The retired constant name is BANNED by guard-stale-refs;
         unit tests in src/lib/__tests__/image-safety.test.ts replay the
         EXACT incident prompts as permanent regression canaries.
    - Remediation: `scripts/blog-runner/remediate-images.mts` +
      `remediate-blog-images.yml` (workflow_dispatch) regenerate every
      legacy Pollinations URL through the safe pipeline and rewrite
      blog_posts.content/featured_image + queue bundles in DB.
- **IMAGE SAFETY LAW v2 — SEMANTIC PERSON-SCENE ATTRACTORS (2026-08-28 — SUPERSEDED same day by IMAGE SOURCE LAW v3 when the AI generator was retired):**
  live incident #2 on `/blog/12-week-periodized-muscle-building-plan`):**
    - ROOT CAUSE (proven: production URL seed=29197): a prompt with ZERO
      person tokens ("muscle building workout plan … for Intermediate
      Lifters") STILL rendered a shirtless man. Diffusion models associate
      fitness ACTION/program/physique nouns with training BODIES —
      token-level sanitization cannot stop semantic attractors.
    - LAW: `buildSafeImagePrompt()` now treats ANY subject carrying
      person-scene semantics (workout / lifting / program / physique /
      fat-burn / muscle-building vocabulary, EN + AR via
      `promptHasPersonSemantics()`) as a people scene → REPLACED ENTIRELY
      by a curated object scene. Program/plan topics get the planner-
      notebook scene (rule sits ABOVE the muscle rule; first match wins).
    - Style tails are IDEMPOTENT (a tail already inside the subject is
      stripped before a fresh one is appended — fixes production doubled
      "…high detail, …high detail" URLs).
    - `promptHasPersonSemantics` is deliberately NOT part of
      `promptHasBannedVocabulary` (curated scenes must never be refused
      at the URL gate; no bare "row/rows" token — would match "row of
      treadmills").
    - Regression canaries: image-safety.test.ts §LAW v2 replays the exact
      seed=29197 prompt; every curated scene must pass BOTH gates.
- **IMAGE SCENE DIVERSITY LAW (2026-08-28 — SUPERSEDED same day by IMAGE SOURCE LAW v3; rotation now = search-result index):** owner: «كل الصور فى كل
  المقالات عبارة عن نفس الصور ومعاد تغير اى تفصيلة داخلها»):**
    - ROOT CAUSE: the curated-scene rewrite had only ~10 single scenes +
      one fixed photo style → every article (and every position inside
      an article) rendered the SAME composition with only seed noise.
    - LAW: `src/lib/image-safety.ts` now carries a SCENE BANK — 10
      themes × 5 concrete variants + 5 default variants (50 scenes),
      plus 5 rotating photographic style tails. Selection is
      DETERMINISTIC per `variationKey` (= `${articleId}-${position}`)
      via djb2 hash: same article+position always renders the same
      scene, but different articles/positions never collide.
    - EVERY pipeline caller must thread a per-position variationKey:
      p3-images (`${queueId}-cover` / `${queueId}-${n}`), remediation
      runner (`${rowId}-cover` / `${rowId}-body-${n}`), embed backfill
      (`${slug}-body-${n}`).
    - `buildSafeImagePrompt(subject, type?, hint?, variationKey?)` is
      the signature everywhere; without variationKey the classic
      variant[0] is returned (backward compat, og:image stability).
    - PROVIDER-SIDE GUARDS: every Pollinations URL now carries
      `safe=true` (provider refuses NSFW renders — belt & braces under
      the prompt law) and `enhance=false` (their server-side prompt
      rewriting must never mutate our sanitized prompt).
    - Bank authoring rules: objects/interiors only, still-life verbs,
      ENGLISH only, zero person/action/clothing vocabulary — enforced
      by test (every bank entry × both gates × sanitize idempotency).
- **IMAGE SOURCE LAW v3 — PEXELS-FIRST REAL PHOTOGRAPHY (2026-08-28,
  owner directive: «استبدل خطوه الصور تماما الى PEXELS_API_KEY داخل
  GitHub Action ، الصور نستوردها ومع المتبع تتحول الى حجم خفيف بنظام
  الموقع ، وغير نظام اختيار الصور بحيث يكون فى اشخاص عادى لكن لا عرى»):**
    - Pollinations AI image GENERATION is RETIRED entirely — no
      diffusion renders anywhere in the pipeline. Every blog image is
      REAL stock photography: Pexels PRIMARY (PEXELS_API_KEY), Unsplash
      / Pixabay failover (Pixabay enforces safesearch=true).
    - PEOPLE POLICY v3: NORMAL PEOPLE ARE ALLOWED in photos (fitness
      stock photography); NUDITY/immodesty is NOT. Enforcement layers:
      (1) sanitizeImageQuery() strips NSFW vocabulary (EN+AR) and
      negation constructions from every search query — people words
      deliberately preserved; (2) hasNsfwVocabulary() screens every
      result alt-text before picking; (3) Pixabay safesearch=true.
    - LIGHTWEIGHT DELIVERY («حجم خفيف بنظام الموقع»): Pexels
      src.landscape = 1200x627 auto=compress CDN URL, then the site's
      next/image system converts to responsive WebP at the edge —
      featured image, related cards, and blog listing cards all use
      next/image with explicit `sizes`. remotePatterns already cover
      images.pexels.com (+ images.unsplash.com, pixabay).
    - DIVERSITY: search fetches 6 results; pickResultIndex(hashKey)
      rotates the chosen result deterministically per
      variationKey = (article, position) — stable per slot,
      collision-free across posts.
    - FAIL-FAST: remediate-images.mts aborts when PEXELS_API_KEY is
      unset (never silently degrade posts to fallback-only imagery).
      The key must exist BOTH in GitHub Actions secrets (runner
      scripts) AND Vercel Production env (p3-images route).
    - Canaries: image-safety.test.ts v3 suite (people-kept / NSFW
      stripped / negations stripped / alt screening / rotation bounds
      + spread). v1/v2 canary suites retired with the AI generator.
- **BLOG BODY IMAGE RENDER LAW (2026-08-28, owner bug "الصورة داخل
  المقال عبارة عن رابط مش صورة"):** `renderMarkdown()` (src/lib/blog.ts)
  converts `![alt](url)` → `<img loading="lazy" class="my-6 w-full
  rounded-2xl">` in a step 10.5 that runs BEFORE the link rule — with no
  image rule the link regex consumed `[alt](url)` and every embedded
  body image degraded to a bare text link. Unsafe schemes are dropped
  entirely (XSS guard). Guarded by
  `src/lib/__tests__/blog-markdown-images.test.ts`.
- **EVO CHAT SURFACE & HISTORY LAW (2026-08-27, owner directive):** the
  floating widget (`EvoFloatingWidget`) is the ONLY chat surface with EVO.
    1) The old full-page `/chat` route is REMOVED; `next.config.ts`
       permanently redirects `/chat → /evo`. Any CTA that used to link
       there (landing, coaching, /evo page, profile quick links, AppLayout
       nav, SiteHeader menu) must OPEN THE WIDGET instead — via
       `openEvoFloatingChat()` (global `mhe:open-evo-chat` event exported
       from `evo-chat-context.tsx`), never via a chat page link.
    2) BACK-BUTTON LAW: with the drawer open, the browser/hardware Back
       key CLOSES the drawer and never navigates the site. Enforced by the
       `mheEvoChat` sentinel history entry pushed/popped in
       `evo-chat-context.tsx`; `closeChat()` consumes the sentinel.
    3) LINK PERSISTENCE: `chat_messages` has no links column — assistant
       links ride INSIDE the persisted `body` as markdown bullets
       (`src/lib/evo-chat-links.ts`: `buildPersistBody` /
       `parsePersistedBody`, unit-tested canaries in
       `src/lib/__tests__/evo-chat-links.test.ts`). Never persist
       assistant messages without their links, and never render
       assistant bubbles as raw text — `MessageText` renders
       `[label](url)` as anchors.
    4) HYDRATION GATE: persistence writes are gated on the initial load
       completing (`hydrated` flag) — a mount-time write of an empty
       state must never wipe stored history (StrictMode-safe).
    5) The floating icon is ≥48px (owner: "كبر حجم الايقونة الطائرة
       قليلاً" — currently 48px image in a 60px hit target).
    6) SCROLL LAW (2026-08-27 owner report: "الشات بيفتح على بداية
       المحادثة بدل من اخرها"): reopening the drawer MUST land on the
       LATEST message, never the top. Enforced in `EvoFloatingWidget`
       via a scroll-container ref + open-transition snap (instant
       `scrollTo` bottom on open/restore, smooth-follow for new
       messages). Never key the auto-scroll only on
       `[messages, isTyping]` — it does not fire when the drawer opens
       after history already loaded, and never use `scrollIntoView`
       (it also scrolls the page behind the drawer).
    7) PLATFORM TRUTH LAW (2026-08-27 owner report: EVO advertised a
       non-existent "image generation tool"): the system prompt
       (`/api/ai/chat` → `buildSystemPrompt`) contains a hard
       capability whitelist (exercises/programs/foods/tools/blog/
       coaching/memberships/this chat). EVO must say "I can't" and
       stop when asked for anything else — NEVER invent or redirect to
       a tool/feature that is not on the whitelist. Chat answers also
       pass through `src/lib/evo-chat-format.ts`
       (`sanitizeLatexToPlain` + `stripMarkdownSyntax`, unit-tested
       canaries in `src/lib/__tests__/evo-chat-format.test.ts`) — the
       chat renders plain text only; raw LaTeX (`\frac{4}{3}\pi
       r^{3}`) and markdown syntax must never reach users again.
- **AI SURFACE DEEP-AUDIT LAW (2026-08-28, owner directive «فحص أعمق
  للازرار ولوحات الادارة مع المنظومة»):** every UI control that calls an
  API endpoint MUST target a route that actually exists — verified by
  diffing `fetch(…)` call sites against `src/app/api/**/route.ts`.
    1) UPLOAD LAW: file uploads go through `POST /api/upload`
       (requireUser, bucket allowlist questionnaire-photos/
       progress-photos/receipts, MIME+5MB guards, storage path rebuilt
       server-side under the caller's user id, service-role write) and
       render through `GET /api/file?bucket&path` (owner-or-coach authed
       streaming proxy — PRIVATE buckets get permanent same-origin URLs,
       never expiring signed URLs). Buckets are created by
       `supabase/migrations/RUN_ON_SUPABASE_0027_STORAGE_BUCKETS.sql`
       (idempotent, no policies — service role bypasses RLS). Client
       data-URL fallback in QuestionnairesView stays as a safety net.
    2) ADMIN SIDEBAR COMPLETENESS (2026-08-29 role-model v2): AppLayout
       `coachExtraLinks` must list EVERY `/admin/*` page (currently Tool
       Leads + Saved Results) and is rendered for `isAdmin` ONLY — these
       surfaces are admin-exclusive, never coach-visible.
    3) AUDIT BASELINE (all verified wired 2026-08-28): 15 blog-editor AI
       buttons → article_tool(11)+social_post(4) handled by
       `src/lib/ai-job-processors.ts` via GHA runner; plan
       generate/regenerate (plan_nutrition/plan_workout),
       meal_regenerate, exercise_regenerate, payments review, receipts,
       broadcasts, admin leads/referrals/saved-results/blog CRUD — all
       consistent. Re-audit after ANY new button+endpoint pair.
- **ROLE MODEL v2 LAW (2026-08-29, owner directive «فحص حالة الدخول بحساب
  ادمن/كوتش … نفس ما يظهر للمستخدمين يظهر للادمن و نفس حدود الاستخدام وده
  مش منطقى» + approved discussion answers):** `profiles.role` is the
  THREE-value enum `client | coach | admin` (migrations
  RUN_ON_SUPABASE_0029A + 0029B — run in that order; ALTER TYPE and its
  first use cannot share one transaction). The semantics are NON-NEGOTIABLE:
    1) STAFF = coach ∪ admin. `isCoach` in use-auth now means STAFF;
       `is_staff` on `AuthUser` (auth-server) is the server twin.
       SQL `is_coach()` was REDEFINED as `role IN ('coach','admin')` —
       every existing RLS policy keeps working unchanged and the admin
       inherits full coach data access. NEVER rewrite policies back to
       `= 'coach'` only.
    2) ADMIN-EXCLUSIVE surfaces: /admin/* (blog CMS, tool leads, saved
       results, referrals admin) — AdminGate requires `role==='admin'`;
       future coach accounts are bounced to /coach. AppLayout renders
       blog/leads/saved-results/referrals-admin links for isAdmin only.
    3) STAFF-BLOCKED client surfaces: /dashboard /plans /progress
       /questionnaires /referral /support are CLIENT-only — AuthGate
       redirects staff to /coach (ROLE SURFACE LAW: staff and consumers
       never share a UI).
    4) STAFF QUOTA EXEMPTION: staffHint (from auth.is_staff) short-
       circuits checkEvoChatLimit / checkEvoPlanQuota /
       checkAndRecordSwap to unlimited — platform staff are never
       limited by consumer tiers on EVO either. Usage stays recorded.
    5) NO SALES FUNNEL FOR STAFF: SiteHeader hides Paid Services
       (Coaching/Memberships/EVO) + Affiliate groups from staff; the
       profile page shows a ROLE badge (إدارة المنصة / مدرب معتمد),
       never a membership card or upgrade CTA.
    6) PROMOTION: coach_emails allowlist → role='coach' only (auto-
       promote hardened to never downgrade an admin); the owner account
       is admin (0029B promotes every pre-existing coach row). Adding a
       coach = INSERT into coach_emails; adding an admin = manual SQL.
    7) FUTURE (owner-approved design, NOT yet built): multi-coach
       system — coach_assignments (1 client ↔ 1 coach), per-coach
       landing pages (not in menus), notifications routed to the
       assigned coach via target_coach_id, payments scoped per coach,
       client sees their coach. Built ON TOP of this law when owner
       gives the go signal.
- **USAGE LIMIT ENFORCEMENT LAW (2026-08-28, T-AI-DEEP-AUDIT-V2, owner
  directive «توسع وعمق اكبر … والتأكد من ايفو وطبيعه عضوية المستخدم فى
  حدود الاستخدام»):** every limit advertised in `memberships.ts` MUST be
  enforced SERVER-SIDE at the only route that can consume it, and the
  client UI MUST mirror the SAME resolved tier — display/enforcement
  drift is a defect even when the server stays authoritative.
    1) ENFORCEMENT MATRIX (verified 2026-08-28): evoChatDailyLimit →
       `/api/ai/chat` (evo_chat_usage ledger, record-before-dispatch);
       evoNutritionPlanLimit/evoWorkoutPlanLimit → `/api/ai/chat`
       plan-creation intents via `evo-intent.ts` classification, counted
       per domain (sources `plan_nutrition`/`plan_workout`) monthly-UTC;
       evoSwapLimit → `/api/ai/jobs` enqueue (checkAndRecordSwap, weekly
       Monday-anchored); mealPlannerMaxMeals/MaxSaved →
       `/api/tools/save-meal-plan`; savedResultsLimit →
       `/api/tools/save-result`; adsEnabled → AdSenseAd via
       useMembershipTier. savedResultsExport/mealPlannerExport are
       client-only by design (user's own data, no AI cost).
    2) ANON THROTTLE: anonymous chat traffic is throttled SERVER-SIDE
       per SALTED-SHA-256(client IP) in `evo_anon_usage` (migration 0028,
       no policies — service-role only, no raw IPs stored) at the free
       tier daily limit. Fail-open on ledger errors, graceful 501-style
       degradation before the table exists.
    3) CLIENT PARITY: EvoChatProvider resolves the tier
       (useAuth + useMembershipTier) and exposes `dailyLimit: number |
       null` — paid tiers are NEVER client-locked by the free 10/day
       counter; quota UI keys off the resolved limit, not off "being
       logged in". getSubscriptionForClient filters
       `status='active' AND end_date>now()` (expired subs never look
       paid client-side). getSwapUsage displays the SAME weekly window +
       evoSwapLimit as /api/ai/jobs enforces (the retired starter/elite
       `swapLimitFor` system must not be used for limits).
    4) PLAN QUOTA vs SWAP QUOTA: plan-creation intents consume the
       MONTHLY per-domain quota; swap/regenerate intents stay on the
       WEEKLY /api/ai/jobs quota. Never double-count a message in both.
       Changing any advertised number happens ONLY in memberships.ts.
- **SCHEDULE HEALTH LAW (2026-08-27 incident):** GitHub's scheduler can
  silently DE-REGISTER a repository's scheduled workflows — every
  `schedule` trigger stops firing repo-wide while `push` / `dispatch`
  runs keep working (this repo: last schedule fire 2026-08-26T16:39Z,
  then 26+ hours of total silence; blog stuck at 2 posts vs the
  6/day target; `process-ai-jobs.yml` had 0 runs since addition).
    1) DETECT before anything else: any report of "the blog stopped
       publishing" MUST start with a schedule forensics query —
       `GET /actions/runs?event=schedule` for the last scheduled fire
       timestamp — NOT with re-reading pipeline code.
    2) REMEDY (both steps, in order): (a) re-enable every scheduled
       workflow via `PUT /actions/workflows/{wf}/enable` (HTTP 204),
       (b) push a touching commit that edits each affected workflow
       file to force trigger re-registration with the scheduler.
    3) BACKFILL: after any schedule outage, manually
       `POST /actions/workflows/{wf}/dispatches` the blog pipelines so
       the day's articles still publish — never leave a content day
       empty waiting for the next cron slot.
    4) VERIFY: confirm at least one scheduled run exists after the
       remedy (next slots: AR 05/11/18 UTC, EN 12/16/22 UTC, ai-jobs
       */10). If the next TWO slots per workflow still show no
       scheduled fire, escalate with forensics — do not silently retry.
    5) The 3-slots-per-day design doubles as schedule-outage retry:
       a skipped slot self-heals at the next slot the same day — but
       only if the scheduler itself is registered (see 1–2).
    6) SCHEDULER-INDEPENDENT BACKSTOP (never trust GitHub's scheduler
       alone): `/api/cron/dispatch-pipelines` (CRON_SECRET, fail-closed)
       tops each language pipeline up to its daily quota by counting
       today's PUBLISHING runs (failure/cancelled excluded — a failed
       run consumed a slot without producing an article) and dispatching
       only the missing difference; it also dispatches process-ai-jobs
       when its last run is >15 min stale. `vercel.json` fires it daily
       at 21:00 UTC (Hobby's remaining cron slot) as the guaranteed
       6/day floor. Requires Vercel env `GITHUB_DISPATCH_TOKEN`
       (fine-grained PAT, this repo only, Actions: Read and write) —
       never commit the PAT into the repo (§3.2). Exact-slot stagger and
       the ai-jobs worker cadence are restored by pointing an external
       cron service (e.g. cron-job.org, every 10 min) at the same
       endpoint — dedup makes extra firings safe.
    7) QUOTA vs SCHEDULE forensics ordering: when a pipeline run fails
       on `free-models-per-day` 429s (OpenRouter free tier, both
       accounts, reset midnight UTC), do NOT retry — the day's quota is
       spent, not the trigger. Sustainable 6/day requires owner credits
       on OpenRouter ($10 → 1000 free requests/day/account) or stricter
       per-article AI budgeting. Diagnose quota BEFORE touching
       schedules; diagnose schedules (see 1) BEFORE touching code.
- **PLAN JOB RECOVERY LAW (2026-08-28, T-4PILLAR-COMPLETE, owner
  directive «تم ، ابنيهم الاول»):** every long-running AI queue job that
  materializes into a USER-VISIBLE artifact (a `plans` draft row) must be
  treated as SURVIVABLE state — the enqueueing tab closing, reloading, or
  timing out must NEVER strand a finished job's result inside `ai_jobs`.
    1) REGISTRY: CoachClientView persists every enqueued
       plan_nutrition/plan_workout job in localStorage
       (`mhe:pending-plan-jobs` — pure module `src/lib/plan-jobs.ts`,
       24 h TTL, cap 40) and re-attaches a watcher on every mount.
       Completion auto-saves the draft via addPlan and marks the job id
       saved (`mhe:saved-plan-jobs`, cap 100) so recovery never
       double-saves. The client-side swap watcher (`mhe:pending-swaps`)
       remains the template for this pattern.
    2) RECOVERY CARD: `/api/ai/jobs?limit` returns `payload` for OWN
       rows so the ai-plans tab can resolve a finished plan job's
       `payload.clientId`; finished jobs older than the 5-min
       live-watcher grace and not saved/pending surface as a one-click
       "حفظ كمسودة" recovery card. Any new plan-like job type MUST plug
       into `selectRecoverablePlanJobs` (single filter choke point).
    3) REGENERATION ORDER: a regenerate flow enqueues the replacement
       FIRST and deletes the old draft only AFTER the new plan arrives
       AND only if it is still `status='draft'` — a failed/late
       generation must never destroy an existing (possibly approved)
       plan.
    4) STAFF QUOTA SEMANTICS: staff requesters (role `coach` OR `admin`)
       bypass the weekly swap quota at `/api/ai/jobs` — meal/exercise
       swaps are the staff's PLAN-EDITING tools, not client
       self-service. The client-facing C16 weekly limits (free 0 ·
       premium 3 · pro 6 · coaching 3) are untouched. Coach-side
       exercise swap lives in PlanViewerModal edit mode (per-exercise
       Wand2 button → exercise_regenerate → in-place replace → explicit
       حفظ).
- **EVENT-DRIVEN AI DISPATCH LAW (2026-08-28, T-PLAN-GEN-ARTICLEGEN,
  owner «توليد الخطط لا يعمل» + «توليد المقالات للكوتش غير موجود»):**
  the `ai_jobs` queue worker (`process-ai-jobs.yml`) is a GitHub cron —
  and GitHub de-registered repo-wide scheduled workflows (forensics: the
  every-10-min worker had exactly ONE run ever, a manual dispatch; the
  Phase-18 API-enable remedy did NOT restore firing). Enqueue alone is
  therefore NOT enough: **every enqueue path MUST push-trigger the
  runner** via `src/lib/ai-runner-dispatch.ts` (`dispatchAiJobsRunner()`,
  GitHub workflow-dispatch API, 8 s timeout, fail-open). The scheduler
  cron and the daily Vercel `/api/cron/dispatch-pipelines` catch-up are
  BACKSTOP layers, never the primary trigger. Requirements:
    1) `POST /api/ai/jobs` answers with `runnerDispatched: boolean` +
       `etaMinutes` (3 when pushed, 10 otherwise) — UIs surface the
       honest ETA; a `false` push means only backstops remain and the
       owner must check `GITHUB_DISPATCH_TOKEN` on the deployment.
    2) `GITHUB_DISPATCH_TOKEN` (Vercel env, fine-grained PAT, this repo
       only, Actions: Read and write) is a REQUIRED production secret
       for interactive AI generation — its absence silently degrades the
       queue to once-a-day processing.
    3) Any NEW job type must be added in FOUR places: `AI_JOB_TYPES` +
       `JOB_GATE` + `sanitizeJobPayload` (`ai-jobs.ts`), the processor
       registry (`ai-job-processors.ts`), and — for required fields —
       throw `JobPayloadError` (route maps it to HTTP 400, never 500).
    4) COACH ARTICLE GENERATION is the restored `article_generate` queue
       type (Phase-15's client-side generator deletion left coaches with
       no generation entry; the old BlogAdminView banner pointed at a
       dead button). Surface: BlogAdminView modal → enqueue → reload-
       surviving watcher (`mhe:pending-article-job`, same pattern as
       plan jobs) → sessionStorage hand-off (`mhe:ai-article-draft`) →
       BlogEditorView `?ai=1` prefill with an explicit AI-provenance
       banner. Drafts are NEVER auto-published; slug follows the M15
       Latin-only law via `articleSlugFromTitle`.
    5) TOPIC-AUTO LAW (2026-08-28b): `article_generate` topic is
       OPTIONAL — an empty/short topic means the PROCESSOR picks the
       title via `pickSmartTopic()` (`blog-topics.ts`), the SAME smart
       topic brain the automated blog pipeline uses (AI pick in the
       requested language, pillar rotation, curated per-language
       fallbacks, duplicate-check against published posts). The
       sanitizer must NEVER throw for a missing topic; the result carries
       `autoTopic: true` + `focus_keyword` + `topic_rationale` for
       provenance (owner: «مفروض يختار العنوان بنفس نظام التوليد»).
    6) TYPE-ROTATION LAW (2026-08-28c, owner: «عايز يكون فى تدوير لنوع
       المقالات»): auto-picked topics MUST rotate across the content
       pillars. `pickSmartTopic` merges published posts AND recent DONE
       `article_generate` results (`getRecentGeneratedTopics`) into the
       rotation/duplicate state — a pillar just generated (even
       unpublished) is excluded from the next auto-pick; with zero
       history the pillar is randomized (cold start never pins the first
       pillar). BlogAdminView exposes «نوع المقال» pills: "تدوير تلقائي"
       (default, sends no category) or one pinned pillar; the picked
       category flows into the draft prefill. The processor's article
       call reserves maxTokens ≤ 5000 so prompt/4 + maxTokens + 800 stays
       under the 7200 Groq-eligibility line — reserving 7000+ LOCKS the
       job out of Groq (OpenRouter-only → free-pool 429 storms).
    7) DRAFT MATERIALIZATION + HONEST RUN COLOR (2026-08-28d, owner:
       «لم تنجح برده… بيفشل node 20 وبعد كده مبيكملش وبيطلع اشارة خضراء»):
       (a) every completed `article_generate` MUST be materialized as a
       blog_posts DRAFT (`materializeArticleDraft`, is_published=false,
       source=ai:article_generate) — the result carries post_id and the
       watcher routes to /admin/blog/:id; an article may NEVER live only
       inside ai_jobs.result. (b) process.mts exits 1 when any job fails
       permanently → the workflow turns RED; a GREEN run genuinely means
       done=N failedPermanent=0. (c) GHA actions pinned to v5
       (checkout/setup-node, Node 24 internals) — Node 20 deprecation
       warnings in logs are HISTORY; node-version stays 22.
    8) ARTICLE QUALITY FLOOR + ANTI-FORMULA (2026-08-28e, owner:
       «مقال سيء ونفس العناوين الثابتة القديمة ومدة التوليد قصيرة جدا»):
       (a) the article contract is 1100-1400 words MANDATORY with
       6-9 ## sections, concrete numbers, common-mistakes + step-by-step
       sections, and a non-generic hook; (b) each generation draws a
       RANDOM opening archetype (scenario/question/statistic/mistake/
       contrast) so consecutive drafts never share one skeleton;
       (c) markdown under ~550 words throws QUALITY FLOOR → failJob
       requeues (different lead model) → only deep drafts materialize —
       a shallow 5-second draft can never land as done; (d) maxTokens
       6000 keeps the chain Groq-eligible (≈6975 < 7200) while funding
       the depth contract.       2026-08-28g BUNDLE PARITY (owner: «نرجع للمشكلة الاسبق… المقال
       خرج مسوده بشكل سيء وناقص عناصر كتير» — docs-first review found the
       coach generator produced a fraction of what blog-generate.ts's
       ArticleBundle delivers): the generation contract now includes
       (a) FAQ 4-6 Q&As persisted into blog_posts.faq_json — the public
       article page renders it as a real FAQ section; (b) 2-3 INTERNAL
       links woven from REAL published slugs (internalLinkCandidates,
       same-language, offered to the model as ready [anchor](link) pairs
       — insertLinksIntoArticle parity); (c) meta_title distinct from
       title; floors: ≥750 words + ≥5 "## " sections (recalibrated
       2026-08-28h: gpt-oss-120b hovers 728-880 — the 800 floor was a
       coin-flip that burned run 33176102145's final attempt at 728),
       prompt asks 900+ so accepted drafts stay deep.
    9) OWNER IMAGE-SWAP LAW (2026-08-28f, «خلال الانتظار محتاج اقدر اعدل
       الصور للمقال… لان احيانا الصور بتكون غير مناسبة»): the editor's
       featured-image card carries «✨ اقترح صورة آمنة / 🔄 صورة مختلفة»
       backed by POST /api/blog/suggest-image (coach-only) — a thin call
       over the SAME v3.1 sourcing pipeline with an EXCLUDE list:
       rejected URLs flow back (query-string-insensitive compare via
       isExcludedImageUrl) so the same photo is NEVER suggested twice in
       one session; candidates rotate via variationKey. Nothing is
       written server-side — the editor applies the accepted candidate
       to featured_image/cover_alt and saves with the post.
   10) PROJECT-WIDE PREVENTION LAW (2026-08-28, owner: «محتاج اتاكد ان
       مفيش مشاكل مشابهة تحصل مستقبلا فى المشروع كله مش المدونة بس لان
       المشاكل شبة دى بتتكرر كتير فى مختلف الاماكن») — the recurring
       incident classes are now PERMANENTLY guarded, project-wide:
       (a) CLASS A (button → dead target): CI guard
       `scripts/check-ui-wiring.sh` (in guard-stale-refs.yml) fails the
       build on any literal fetch("/api/…") without a matching route file;
       (b) CLASS B (type without processor / orphan processor / ungated
       type): the same guard + ai-jobs-visibility.test.ts pin
       AI_JOB_TYPES ↔ PROCESSORS ↔ JOB_GATE ↔ JOB_LABELS exact parity in
       BOTH directions (TypeScript can't: PROCESSORS is Record<string,…>);
       (c) CLASS C (dishonest success): every scripts/*-runner/* must
       carry an explicit non-zero exit path (CI-enforced); (d) SILENT ROT:
       GET /api/ai/queue-health (coach-only) exposes counts / oldest
       queued age / last done / last successful GHA run + Arabic issue
       list, surfaced as a live health line in the BlogAdminView AI
       banner. DEFINITION OF DONE for any future feature: button → route
       exists (CI), job → processor (CI + test), result has a VISIBLE
       materialization, runner exits honestly (CI), docs updated in the
       SAME commit.
   11) RATE-LIMIT RESILIENCE LAW (2026-08-28h, run 33176102145 — owner:
       «اعتقد الكوتا خلصت… لو ده السبب احنا عندنا مشكلة اكبر»): free-tier
       429s are TRANSIENT (Groq TPM resets per minute; OpenRouter shared
       pools refill) — a retry must OUTLIVE the window, not re-burn it.
       The runner sleeps 70s after any rate-limit requeue before the next
       claim; heavy article calls try maxModels 5 (five independent rate
       buckets: nemotron/groq-120b/gemma-31b/groq-20b/gemma-26b) instead
       of 3. Back-to-back retries dying inside one TPM window are a
       runner bug, not provider fate.
   12) QUALITY-FIRST LAW — OWNER GENERAL CONDITION (2026-08-28i, «قبل ما
       اجرب عايز منضحيش بالجوده للمقالات او توليد الخطط نهائى ده شرط عام
       لازم الجوده لاى شىء تكون اعلى جوده ممكنة لان ده هدف الموقع الاساسى»):
       the site's PRIMARY goal is maximum quality for EVERYTHING.
       (a) The ASK (generation prompt contract) is ALWAYS the maximum
       bar — article 1100-1400 words + FAQ + internal links + self-check;
       NEVER lowered for model convenience, rate survival, or speed.
       Floors are rejection NETS below the ask, never the target.
       (b) Model order = QUALITY order (strongest first); smaller models
       are last-resort fallbacks and must never be promoted above stronger
       ones. Resilience work (maxModels buckets, cooldowns) increases
       AVAILABILITY of strong models — it never substitutes weak output.
       (c) Plan generation carries the same contract: full-depth prompts,
       multi-bucket chains (nutrition 5 / workout 4 + humane 35s window).
       (d) Any change touching prompts, floors, or model order must
       PRESERVE OR RAISE the ask — lowering requires explicit owner
       approval in the same commit message.
   13) SEO-SLUG + IMAGE BUNDLE LAW (2026-08-28i, owner incident
       «خرج مسودة بدون صور و slug مكتوب فيه post-202608281422 وغيره من
       مشاكل»): every article_generate draft lands COMPLETE.
       (a) SLUG: the model produces an English SEO slug inside the JSON
       contract (3-6 lowercase words translating the topic's MEANING —
       Arabic titles are never transliterated into URLs); the
       sanitizeModelSlug net enforces the M15 latin-only law and the dated
       post-YYYYMMDDNNNN articleSlugFromTitle fallback is the LAST net
       only (both model slug AND title latin core unusable).
       (b) IMAGES: the same JSON contract carries image_queries (3-5
       ENGLISH photo-search phrases — photo pipelines are
       language-independent and Pexels results are far better in English
       for AR posts, same choice as the automated pipeline's imagePlan).
       fetchFeaturedImage (Pexels-first, NSFW/immodest-screened) resolves
       them; images[0] = featured_image + cover_alt on the materialized
       draft, images[1..] = embedBodyImages at ## section boundaries.
       process-ai-jobs.yml passes PEXELS_API_KEY to the runner.
       (c) GRACEFUL DEGRADE: image/slug enrichment can NEVER fail the
       article — any failure lands the draft without images exactly as
       the pre-fix flow (the «بدون صور» prompt line stays: the model must
       not invent image URLs; real photos come only from the safe pipeline).
       14) ONE-SLUG-LAW (2026-08-28j, owner: «مش مفروض ان التوليد التلقائي
       وكذلك من لوحة الكوتش موحد؟ كذلك ادوات التحسين هل بتتبع نفس
       النظام؟»): ALL slug logic lives ONLY in src/lib/slug.ts
       (sanitizeModelSlug / slugifyAscii / articleSlugFromTitle /
       resolveSlug). Before this law the same logic existed in FIVE
       drifted copies (p5-publish local slugify, blog-pipeline inline
       slugBase sanitize, ai-jobs-client articleSlugFromTitle,
       ai-job-processors sanitizeModelSlug, blog-admin raw timestamp).
       The slug-law canaries (src/lib/__tests__/slug-law.test.ts) read
       the actual sources and FAIL THE BUILD if a local copy reappears —
       the automated pipeline and the coach generator can never drift
       apart again. Re-export bridges (ai-jobs-client,
       ai-job-processors) keep historical import paths alive.
       SIXTH DRIFT (2026-08-28k): the completion audit of «أدوات
       التحسين» found a hidden local copy in BlogEditorView updateTitle
       that KEPT ARABIC characters — an Arabic title auto-filled an
       Arabic slug the M15 save gate then rejected. Migrated to
       articleSlugFromTitle; the canary now also reads the editor source
       with comments stripped (documenting the old pattern stays legal,
       executing it fails the build). Improvement tools themselves are
       TEXT TRANSFORMERS returning to a copy-only panel — slug/image
       laws N/A; the M15 save gate remains the boundary verifier.
       RECOVER-RESULTS LAW (2026-08-28, owner: «عملت تجربتين من
       المكانين ولم يحدث شيء»): tool results are BACKGROUND jobs
       landing 2-5 min after the click; the panel is memory-only, so
       navigating during the wait stranded finished results in ai_jobs
       with no way back (GHA forensics: run#14 done=3 SUCCESS — the
       system worked, the UI lost the winnings). The editor now
       hydrates DONE article_tool/social_post results (≤3h) from
       GET /api/ai/jobs on mount + a manual «تحديث النتائج» button,
       marked «نتيجة سابقة», with a 2-5 min ETA hint under the grid.
       Formatting is unified (formatToolResult/formatSocialResult) so
       fresh and recovered results render identically.
       COPY-VS-DISPLAY LAW (2026-08-28, owner: «النسخ بياخد الرسالة
       كلها مش المطلوب فقط»): aiResults entries carry {display, copy} —
       the panel DISPLAYS the ♻️ recovered-header, 📝 change-notes and
       social meta-suggestions (cta/image_idea/best_times), while the
       «نسخ» button copies ONLY the paste-able deliverable (the tool
       text itself / post_text+hashtags). One shaping function per
       family serves fresh runs and recovery alike.
       GUARD-COMMITMENT COROLLARY: a guard that is not COMMITTED is not
       a guard — check-ui-wiring.sh was referenced by
       guard-stale-refs.yml since b9c1d16 but the file itself was never
       pushed (every CI run fell at that step until 2026-08-28j). Any
       new script a workflow references must appear in the SAME commit.
       ALL-RESULTS LAW (2026-08-28m, owner: «بيظهر نتيجتين فقط محتاج
       يظهر كل النتايج»): the editor AI-results panel is an APPEND-ONLY
       list, never a per-tool record — running the same tool twice MUST
       yield two cards (keyed records silently overwrite). Every card
       keeps {display, copy, label, time, recovered}; «مسح الكل» clears
       the panel, «إغلاق» removes one card. Hydration covers the last 20
       own jobs ≤24h and appends each recovered job as its OWN card.
       runAiJob resolves {result, id}: callers mark the settled job id so
       a manual refresh can NEVER duplicate a result just watched.
       CLEAR-FAILED LAW (2026-08-28m, owner screenshot + «ضيف طريقة لمسحها
       يدوى»): health alerts must be DISMISSIBLE — failed ai_jobs rows are
       transient diagnostics, so DELETE /api/ai/queue-health (coach-only)
       removes them and the banner recomputes honestly (stuck-queue issues
       are never suppressed, they just reflect live rows). A red banner
       with no clear path rots into wallpaper. 2026-08-28n hotfix (owner:
       «مسح عمليات الفشل لم يعمل»): the handler MUST only ever answer
       JSON (try/catch around everything) and delete via the app's proven
       shape (select ids → .delete().in("id", …)) — the filtered
       .delete(null, {count:"exact"}) variant died in production with a
       NON-JSON error the client could only show as «clear failed».
       PER-IMAGE-SWAP LAW (2026-08-28m, owner: «تبديل صورة المقال … محتاج
       اضافة تبديل لكل صورة داخل المقال لوحدها»): image swap is not a
       cover-only privilege — the PREVIEW segments markdown into blocks
       (splitPreviewBlocks) and every standalone image line renders as a
       first-class block with its own «🔄 بدّل الصورة» button going
       through the SAME safe suggest-image pipeline as the cover,
       replacing EXACTLY that occurrence via absolute content offsets
       (sibling images never move). Unsafe URLs fall back to the
       renderMarkdown path where they are stripped (one safety law).
       CLEAR-PERSISTS LAW (2026-08-28n, owner: «مسح نتائج الادوات لم
       يعمل»): dismissing tool results must SURVIVE re-hydration — the
       panel hydrates from ai_jobs on every mount (24h window), so a
       memory-only «مسح الكل»/«إغلاق» resurrects everything the owner
       just cleared. Dismissed job ids persist in localStorage
       (muscleshub.dismissedToolJobs); hydration and manual refresh skip
       them. A clear button that only clears until the next navigation is
       a broken clear button.
- Never log the AI response in production code paths (it can contain
  user PII or partial reasoning that should not be persisted).
- Local fallbacks (`src/lib/ai-local.ts`) exist so the app degrades
  gracefully when providers are down. Do not remove them.
- Any change to the AI system prompt must be approved by the owner —
  it directly affects user-facing tone and quality.
- EVO chat quota accounting MUST stay server-side in the tamper-proof
  `evo_chat_usage` ledger (migration 0022). Never count client-written
  rows again.

> **Deprecated (2026-08-27):** the previous note describing
> `callFreeOpenRouter()` / `callFreeOpenRouterLimited()` as one of the two
> canonical paths — those functions were removed as dead code and the
> documented trade-off now lives in `callFreeAIFallbackChain`.

---

## 9. Final Report Format

> **Deprecated (2026-08-24):** Superseded by §12.9. Do not use this format.

---

## 10. Git & Commit Conventions

- Branch off `main` for any non-trivial change. The owner may merge
  feature branches or commit directly to `main` for small fixes.
- Commit author email: `muscleshubfit@gmail.com`. The owner has this
  configured locally — agents must use the same identity.
- Commit message prefixes:
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation only
  - `refactor:` no behavior change
  - `security:` security-sensitive (requires pre-approval per §7)
  - `chore:` tooling, deps, build config
- Push to `origin` only after the local verification step (§3.5)
  passes. If `tsc --noEmit` fails, do not push.

---

## 11. When in Doubt

- **Ask the human supervisor.** Ask early, not after a half-built
  feature. The cost of one clarifying question is far lower than the
  cost of a wrong direction.
- **Cite the source.** When proposing a change, cite the exact file +
  line + the current behavior you observed.
- **Prefer reversible changes.** A new file is reversible. A dropped
  column is not. Prefer the reversible option.
- **Document assumptions.** If you assumed something the task did not
  state, write it in the final report under "Potential risks" or
  "Implementation findings" so the reviewer can challenge it.

---

## 12. Project Workflow Rules (Adopted 2026-08-21)

> **Status:** Active binding policy — applies to every task from
> 2026-08-21 onward. Cannot be changed except by explicit Owner
> directive. These rules supplement §3 (Operating Rules) and §4
> (Definition of Done); they do not replace them. Where these rules
> conflict with an older section of this file, these rules win.

### 12.1 Communication

- Reports must be short and direct.
- Do not repeat explanations or steps already executed.
- Do not expand scope beyond the current task or reopen finished
  tasks without a reason.
- Only stop and ask the Owner when there is genuine ambiguity.

### 12.2 Execution Flow

Every task executes in this order inside the same task:

```
IMPLEMENT → VALIDATE → DOCUMENT → COMMIT → PUSH
```

Do NOT wait for a separate instruction to validate, document, commit,
or push — unless the Owner explicitly asked to skip one of these steps
(for example, "show me the report before commit").

### 12.3 No Redundant Verification

- Do not create a separate command to re-verify what was already
  verified.
- Verification results belong in the task's own report.
- After a task succeeds, move directly to the next task.

### 12.4 Task Continuity

- Do not redo completed steps.
- Preserve the current task's state.
- When multiple tasks are queued, advance automatically to the next
  one after the current one completes.
- Do not start a new task from memory or guessing — use the project's
  actual state (code, migrations, docs, worklog).

### 12.5 Documentation

- Document every completed task while executing it.
- Use the existing documentation files (`PROGRESS.md`, `worklog.md`,
  `AGENTS.md`, `DEVELOPER_GUIDE.md`, `SECURITY.md`, `QA_CHECKLIST.md`,
  `README.md`).
- Do not create a new documentation system if the existing one
  suffices.
- At the end of a large body of work, one comprehensive documentation
  review pass is allowed to fix gaps or conflicts.

> **Consolidated (2026-08-24):** executed via `docs/_AUDIT.md`. Do not
> create new documentation files.

#### 12.5.1 `worklog.md` Entry Template (Binding)

Every task MUST append exactly one entry to `worklog.md` following
this template. No free-form entries are allowed.

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

Rules:

- The `---` separator before each entry is mandatory (append-only log).
- `Task ID` MUST be unique across the file — search before adding.
- `Work Log` is bulleted, factual, and ordered chronologically.
- `Stage Summary` includes the commit SHA and push status (matches
  §12.9 Final Report fields).

#### 12.5.2 Periodic Documentation Audit (Cadence)

A full documentation audit MUST be performed at the following cadence:

- **Monthly** — last week of every month.
- **After any major feature addition** — within 7 days of deploy.
- **After any force-push or major git operation** — within 24 hours.

The audit verifies (per `docs/_AUDIT.md` methodology):

1. All file counts in docs match actual `find` / `wc -l` results.
2. No references to files that don't exist (e.g. `PROJECT_CONTEXT.md`,
   `scripts/*.js` if missing).
3. No duplicate commands across `AGENTS.md` §3.5 vs §4 vs
   `QA_CHECKLIST.md` Verification Protocol.
4. No deprecated sections still being cited by other sections.
5. `Last updated` date in every doc file reflects the last commit
   that touched it.
6. Live site (`https://musclehubeg.vercel.app`) status code per
   public route matches the route's documented status.

Each audit's results are appended to `worklog.md` under Task ID
`DOC-AUDIT-YYYY-MM-DD`.

### 12.6 Duplicate Tasks

- Treat **EVO AI** and **AI Chat** as ONE task: `EVO AI / AI Chat`.
- Do not record the same function as two tasks under different names.
- Before adding any task, check whether an equivalent task already
  exists in the project.

### 12.7 AI Master Roadmap

- When building an AI task list, aggregate from: actual source code,
  `PROGRESS.md`, `worklog.md`, `DEVELOPER_GUIDE.md`, and
  conversations/context as needed.
- Classify each task as: `COMPLETED` / `IN PROGRESS` / `DEFERRED` /
  `NOT STARTED`.
- Do NOT start implementation merely because a missing task was
  discovered — stick to the task the Owner assigns.

### 12.8 Source of Truth

Priority (highest wins):

1. Actual Code & Config (`src/**`, `next.config.ts`, `tsconfig.json`,
   `package.json`, `vercel.json`)
2. Database / Migrations (`supabase/migrations/*.sql`)
3. QA Evidence (`QA_CHECKLIST.md`, manual smoke tests in commit
   messages)
4. Project Documentation (`README.md`, `DEVELOPER_GUIDE.md`,
   `PROGRESS.md`, `AGENTS.md`, `SECURITY.md`)
5. Conversation Context
6. General Knowledge

If documentation conflicts with code, **code wins**.

### 12.9 Final Report

After every task, deliver a brief report containing only:

- What was done
- Verification result
- Commit SHA
- Push status
- Next task
- Raw SQL links to run on Supabase (mandatory whenever the task
  produced schema/DB changes — see §6 RAW-SQL-LINK RULE)
- **PLAIN-STEP EXECUTION GUIDE (FIXED — BINDING FOR ALL CLIENTS/
  PROJECTS):** whenever a task requires a MANUAL action from the Owner
  (run SQL, trigger a workflow, set an env var, redeploy, click
  anything in a dashboard), the final report MUST include a short,
  numbered, plain-language walkthrough for each action: exact URL to
  open → exact button/tab name → what to paste or select → what a
  successful result looks like (expected output/screenshot hint) and
  how to roll back if it fails. Assume non-technical reader. Avoid
  jargon; if a technical term is unavoidable, define it inline.
  Reporting a manual step without this guide is an INVALID delivery
  (same severity as §6 without raw link).

### 12.10 Out-of-Scope Prohibited

- Do not add steps or improvements outside the current task's scope.
- Do not wait for a new instruction to validate / document / commit /
  push after task completion, unless the Owner asked otherwise.
