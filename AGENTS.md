# AGENTS.md — MuscleHubEG AI Agent Operating System

> **Status:** Active — required reading for every AI agent (and human
> contributor) before any commit, PR, or production change.
> **Last updated:** 2026-08-19
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
| **Technical Reviewer** | ChatGPT (OpenAI) — invoked by the owner when a second pair of eyes is needed on architecture, security, or trade-offs. | Reviews proposals, suggests alternatives, flags risks. Does NOT commit code directly. |
| **Implementation Agent** | GML (this agent) + any sub-agent it delegates to. | Writes code, runs tests, updates docs, pushes commits. Every change must be reviewed/approved by the human supervisor before going to production. |

The owner may, at their discretion, designate additional agents or
reviewers. Until then, the table above is authoritative.

---

## 3. Operating Rules (Binding on All Agents)

### 3.1 Inspect Before Modifying

- **Read the actual source code, configuration, and migrations before
  changing anything.** Documentation can lag behind implementation — the
  source of truth hierarchy (§5) defines what wins.
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

- After every meaningful change, run **at minimum**:
  - `npx tsc --noEmit` — must report 0 errors.
  - `bun run lint` — should not introduce new errors.
- For changes that touch rendering, run `bun run build` and confirm
  it succeeds. (Note: `package.json` build step references
  `scripts/compress-images.js` which is currently missing — see
  `PROGRESS.md` known issues. `vercel.json` buildCommand uses plain
  `next build` for production, which is unaffected.)
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
- [ ] `npx tsc --noEmit` passes with 0 new errors.
- [ ] `bun run lint` introduces 0 new errors (warnings acceptable only
      if explicitly justified in the commit message).
- [ ] Affected routes / pages were smoke-tested locally.
- [ ] Documentation is updated (`README`, `DEVELOPER_GUIDE`, `PROGRESS`,
      `QA_CHECKLIST`, `SECURITY` as applicable).
- [ ] `PROGRESS.md` reflects the new state (feature marked done, bug
      marked fixed, etc.) with a date.
- [ ] No secrets, no customer data, no production-only config was
      committed.
- [ ] The change was pushed, and the human supervisor was notified for
      production deployment.
- [ ] The final report (§7) was filed.

"Do not claim PASS unless the acceptance criteria are actually met." —
this rule is non-negotiable.

---

## 5. Source-of-Truth Hierarchy

When sources conflict, the higher source wins:

1. **Actual source code and configuration** (`src/**`, `next.config.ts`,
   `tsconfig.json`, `package.json`, `vercel.json`).
2. **Database migrations / schema** (`supabase/migrations/*.sql`).
3. **Verified tests and QA evidence** (`QA_CHECKLIST.md`, manual smoke
   tests recorded in commit messages).
4. **Documentation** (`README.md`, `DEVELOPER_GUIDE.md`, `PROGRESS.md`,
   this file, `SECURITY.md`).

Documentation is a derivative. If it disagrees with code, the code wins
and the documentation gets updated in the same PR.

---

## 6. Rules for Database / Schema Changes

- Every schema change MUST be a numbered migration file under
  `supabase/migrations/NNNN_description.sql`.
- Migrations MUST be **idempotent** (use `CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, etc.) so re-running them is safe.
- Migrations MUST include RLS policies for any new table.
- The agent MUST NOT apply migrations to production. The owner runs
  them via the Supabase SQL Editor.
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
2. Human supervisor + optional ChatGPT review.
3. Agent implements the approved design.
4. Agent runs `tsc`, `lint`, smoke test.
5. Agent updates `SECURITY.md` to reflect any new policy.
6. Agent commits with prefix `security:`.

---

## 8. Rules for AI Functionality Changes

- The AI provider layer (`src/lib/ai-provider.ts`) is the SINGLE source
  of truth for how the app talks to AI providers. Do not duplicate
  fetch logic in route handlers.
- Two execution paths exist by design:
  - `callFreeOpenRouter()` — sequential, best-quality first. Used for
    plan/article/research generation.
  - `callFreeOpenRouterRace()` — parallel, fastest-first-wins. Used for
    chat and swap.
  - Do not "simplify" by collapsing them into one — the trade-off is
    intentional and documented in `DEVELOPER_GUIDE.md` §14.
- Never log the AI response in production code paths (it can contain
  user PII or partial reasoning that should not be persisted).
- Local fallbacks (`src/lib/ai-local.ts`) exist so the app degrades
  gracefully when OpenRouter is down. Do not remove them.
- Any change to the AI system prompt must be approved by the owner —
  it directly affects user-facing tone and quality.

---

## 9. Final Report Format

After every task, the implementation agent must produce a final report
with exactly these sections (the template is in the project root as
part of the master prompt):

```
Task: <TASK-ID>
Status: PASS / PARTIAL / FAIL

Files created:
- ...

Files modified:
- ...

Implementation findings:
- ...

Documentation discrepancies resolved:
- ...

Known unresolved issues:
- ...

Verification performed:
- ...

Commands run:
- ...

Potential risks:
- ...
```

"Do not claim PASS unless the acceptance criteria are actually met."

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
  `AGENTS.md`, `PROJECT_CONTEXT.md`, `DEVELOPER_GUIDE.md`,
  `SECURITY.md`, `QA_CHECKLIST.md`, `README.md`).
- Do not create a new documentation system if the existing one
  suffices.
- At the end of a large body of work, one comprehensive documentation
  review pass is allowed to fix gaps or conflicts.

### 12.6 Duplicate Tasks

- Treat **EVO AI** and **AI Chat** as ONE task: `EVO AI / AI Chat`.
- Do not record the same function as two tasks under different names.
- Before adding any task, check whether an equivalent task already
  exists in the project.

### 12.7 AI Master Roadmap

- When building an AI task list, aggregate from: actual source code,
  `PROJECT_CONTEXT.md`, `PROGRESS.md`, `worklog.md`,
  `DEVELOPER_GUIDE.md`, and conversations/context as needed.
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
   `PROGRESS.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `SECURITY.md`)
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

### 12.10 Out-of-Scope Prohibited

- Do not add steps or improvements outside the current task's scope.
- Do not wait for a new instruction to validate / document / commit /
  push after task completion, unless the Owner asked otherwise.
