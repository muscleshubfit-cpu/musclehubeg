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
    2) COACH SIDEBAR COMPLETENESS: AppLayout `coachExtraLinks` must list
       EVERY `/admin/*` page (currently Tool Leads + Saved Results); a
       coach-only page reachable from one surface only is a defect.
    3) AUDIT BASELINE (all verified wired 2026-08-28): 15 blog-editor AI
       buttons → article_tool(11)+social_post(4) handled by
       `src/lib/ai-job-processors.ts` via GHA runner; plan
       generate/regenerate (plan_nutrition/plan_workout),
       meal_regenerate, exercise_regenerate, payments review, receipts,
       broadcasts, admin leads/referrals/saved-results/blog CRUD — all
       consistent. Re-audit after ANY new button+endpoint pair.
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
