# SECURITY.md — MuscleHubEG Security Policy

> **Last updated:** 2026-08-23
> **Owner:** muscleshubfit@gmail.com
> **Reporting security issues:** see §8 below.

This document defines the security posture, secrets policy, and rules
for AI agents working on the MuscleHubEG codebase. It complements
`AGENTS.md` (operating rules) and `DEVELOPER_GUIDE.md` (architecture).

---

## 1. Threat Model Summary

MuscleHubEG is a public-codebase, production-deployed web app that
handles:

- User authentication (email/password + Google OAuth).
- Personally identifiable information: email, phone, body metrics,
  progress photos.
- Payment-adjacent data: payment receipts (InstaPay / Vodafone Cash
  transfer screenshots), subscription tier, billing period.
- AI-generated content (blog articles, plans, chat).
- A coach-side admin surface with access to all clients' data.

The public repository means **attackers can read all the code**. The
security model must therefore rely on:

1. Server-side enforcement (RLS, route handlers, auth helpers) —
   never trust the client.
2. Secrets that are never committed.
3. RLS policies that are correct and tested.
4. Headers that harden the deployed site (HSTS, X-Frame-Options,
   etc. — set in `vercel.json`).

---

## 2. Secrets Policy

### 2.1 What counts as a secret

Any of the following:

- Supabase URL, anon key, service-role key.
- OpenRouter / Groq API keys (2026-08-27: these are the ONLY two AI
  providers integrated — see §3.1).
- `CRON_SECRET` (used to authenticate GitHub Actions → Vercel cron
  calls).
- Vercel / GitHub personal access tokens.
- Any OAuth client ID + secret pair.
- Any future `*_API_KEY` env var added to `.env.example`.

### 2.2 Storage

- Local development: `.env.local` (chmod 600, gitignored — pattern
  `.env*` in `.gitignore`).
- Production: Vercel project environment variables (plaintext at
  rest in Vercel, encrypted in transit). Never logged.
- The agent's own working clone of the repo: the agent must use the
  same `.env.local` pattern. The agent must NEVER commit `.env.local`
  or any file matching `.env*`.

### 2.3 Forbidden actions

- Committing a secret in source code, comments, test fixtures, README
  examples, or commit messages.
- Logging a secret via `console.log`, `JSON.stringify`, error
  reporters, or analytics calls.
- Pasting a real production key into a chat conversation with a
  reviewer (use the masked form — `maskKey()` in
  `src/lib/ai-provider.ts`).
- Hard-coding a coach email or admin identifier (the codebase moved
  off `speerr@gmail.com` to `COACH_EMAILS` env var — keep it that
  way).
- Storing secrets in client-side code. Anything prefixed
  `NEXT_PUBLIC_` is exposed to the browser — only the anon Supabase
  key, GA ID, and AdSense client ID are allowed there. **The
  service-role key must NEVER be prefixed `NEXT_PUBLIC_`**.

### 2.4 If a secret is leaked

1. Stop. Do not push.
2. Notify the owner immediately.
3. Rotate the leaked credential at the provider.
4. Owner cleans git history if needed (rare — usually rotation is
   sufficient because the repo is public anyway).

---

## 3. API Key Policy

### 3.1 AI provider keys

> **Updated (2026-08-27, owner directive):** only TWO providers remain.

- Stored as server-side env vars only (`OPENROUTER_API`, with
  `OPENROUTER_API_KEY` accepted as an alias, and `GROQ_API_KEY`).
- Gemini native SDK / OpenAI / Anthropic / DeepSeek integrations were
  REMOVED from the codebase. Never reintroduce a direct third-party AI
  HTTP call without owner approval (§7 category: new external call).
- Read by `src/lib/ai-provider.ts` (`getOpenRouterKey()` /
  `getGroqKey()` / `getEnvConfig()`) — server-only. This file must
  NEVER be imported by a client component.
- The "AI Settings" page (admin-only) stores per-admin overrides in
  HTTP-only cookies on the admin's browser. The override path:
  `mergeOverride()` in `ai-provider.ts`. The key is never returned
  to the client — only the masked form via `getStatus()`.
- If a key is rotated, the env var must be updated in Vercel project
  settings AND in any local `.env.local`. A redeploy is required for
  Vercel to pick up the new value.

### 3.2 Supabase keys

- `NEXT_PUBLIC_SUPABASE_URL` — public (it's the API endpoint).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public-by-design (Supabase anon
  keys are designed to be shipped to the browser; RLS enforces
  authorization).
- `SUPABASE_SERVICE_ROLE_KEY` — **SECRET. Bypasses RLS.** Used only
  by `src/lib/supabase/admin.ts`. Must NEVER be imported by a client
  component, NEVER prefixed `NEXT_PUBLIC_`, NEVER logged.

### 3.3 CRON_SECRET

- Used by the GitHub Actions workflow
  (`.github/workflows/generate-blog-post.yml`) and the Vercel cron
  job (progress reminder) to authenticate calls to `/api/cron/*`
  routes.
- Stored as a GitHub Secret (for Actions) and as a Vercel env var.
- The `/api/cron/*` routes check
  `request.headers.get("Authorization") === "Bearer ${CRON_SECRET}"`.
- If leaked: rotate in both GitHub Secrets and Vercel, then redeploy.

---

## 4. Supabase Credential Policy

- The browser client (`src/lib/supabase/client.ts`) uses
  `createBrowserClient` from `@supabase/ssr` with the anon key. This
  syncs the auth session + PKCE verifier to cookies (NOT
  localStorage) so the server-side `/auth/callback` can exchange
  the OAuth code.
- The middleware (`src/middleware.ts`) uses `createServerClient` with
  the same cookie strategy. The middleware refreshes expired
  sessions on every request.
- The admin client (`src/lib/supabase/admin.ts`) uses the
  service-role key. It is server-only and bypasses RLS. It is used
  only by trusted server contexts: cron jobs, admin API routes
  where the caller has already been verified as coach.
- Demo mode: when `NEXT_PUBLIC_SUPABASE_URL` is unset, the app falls
  back to a localStorage-backed demo mode. This is for previews and
  testing only — production must have all three Supabase env vars
  set.

---

## 5. Customer Data Policy

- Customer data is any data tied to a specific user: profile fields,
  body measurements, progress photos, meal plans, saved tool
  results, support ticket messages, questionnaires, payment
  receipts.
- Customer data lives in the production Supabase database. RLS
  policies enforce that a user can read/write only their own data,
  except for the coach who can read all clients' data (per the
  coaching service contract).
- **Agents must not read customer data.** If a task requires
  verifying something against the production database (e.g. "do any
  blog posts still have author = 'Ahmed Zake'"), the agent ships
  the SQL as a snippet in the final report and the owner runs it.
  The agent does not run `SELECT` against production from its
  context.
- **Agents must not modify customer data.** No `UPDATE`, `DELETE`,
  `TRUNCATE` against production. Any required data migration goes
  through `supabase/migrations/NNNN_*.sql` and is applied by the
  owner (see `AGENTS.md` §6).
- Progress photos and questionnaire photos are stored in Supabase
  Storage buckets (`progress-photos`, `questionnaire-photos`,
  `receipts`). Bucket policies must enforce that only the owner (or
  coach for their clients) can read these objects.

---

## 6. Production Database Policy

- The production Supabase project URL is hardcoded in
  `supabase/migrations/RUN_ON_SUPABASE.sql` header comment as
  `https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy/sql/new`.
  This is the dashboard URL, not a connection string — it's safe to
  keep in the repo.
- Agents do not have access to the production database. Any
  production-side fix is shipped as a SQL file under
  `supabase/migrations/NNNN_*.sql` and is applied by the owner
  via the Supabase SQL Editor (see `AGENTS.md` §6).
- After any schema change in production, the owner must run
  `NOTIFY pgrst, 'reload schema';` so PostgREST picks up the change.
  (Phase 5 fixes followed this protocol — see `PROGRESS.md`.)
- Schema changes are written as **idempotent** migrations so
  re-running them is safe (this matters because production may
  already have the change applied via ad-hoc SQL).

---

## 7. Personal Data Policy

MuscleHubEG processes the following categories of personal data:

| Category | Examples | Storage | Retention |
|---|---|---|---|
| Identity | email, display name | Supabase Auth + `profiles` table | Until account deletion |
| Contact | phone number | `profiles` table | Until account deletion |
| Body metrics | weight, body-fat %, measurements | `progress_entries` table | Until account deletion |
| Body photos | progress photos | Supabase Storage `progress-photos` bucket | Until account deletion |
| Questionnaire data | nutrition + fitness intake | `nutrition_questionnaires`, `fitness_questionnaires` | Until account deletion |
| Payment-adjacent | InstaPay/Vodafone receipt screenshots | Supabase Storage `receipts` bucket + `subscription_requests` row | Per financial record-keeping requirements |
| Support communication | support ticket messages | `support_tickets`, `ticket_messages` | Until account deletion |
| AI chat history | EVO chat messages (subscribers only) | `chat_messages` table (synced fire-and-forget) | Until account deletion |
| Tool leads | name, email, phone captured from free tools | `tool_leads` table | Per marketing consent |

### Data subject rights

- **Access / export:** users can view their profile and saved
  results from the UI. A full export requires a manual SQL query by
  the owner.
- **Deletion:** account deletion is via Supabase Auth (cascades to
  user-owned rows per RLS / FK rules). The owner handles deletion
  requests manually.
- **Rectification:** users can edit their profile, questionnaires,
  and progress entries from the UI.

### Data residency

- Supabase region: configured at project creation (the production
  project ref is `wyopqryzfjifyeyvyxfy` — see
  `supabase/migrations/RUN_ON_SUPABASE.sql` header).
- Vercel deployment region: `sin1` (Singapore) — see `vercel.json`.
- Agents must NOT change the deployment region without explicit
  owner approval (data residency / latency trade-off).

---

## 8. Security Vulnerability Reporting

If you discover a security vulnerability in MuscleHubEG:

1. **DO NOT open a public GitHub issue.** The repository is public
   and an attacker could exploit the vulnerability before a fix is
   deployed.
2. Email the owner directly at `muscleshubfit@gmail.com` with the
   subject line `[SECURITY] MuscleHubEG — <short summary>`.
3. Include:
   - Affected file(s) / route(s) / component(s).
   - A minimal proof-of-concept (curl commands, request bodies,
     etc.).
   - The impact (what an attacker could do).
   - Suggested fix, if any.
4. The owner will acknowledge within 72 hours and coordinate a fix
   + disclosure timeline.

Responsible disclosure is appreciated. We will credit reporters in
the commit that ships the fix (unless they prefer to remain
anonymous).

---

## 9. Rules for AI Agents (Security-Specific)

These are in addition to the general operating rules in `AGENTS.md`:

1. **Never commit secrets.** See §2.
2. **Never log request bodies, response bodies, or env vars** in
   production code paths. Audit `console.log` / `JSON.stringify`
   calls before committing.
3. **Never import server-only modules into client components.** The
   rule of thumb: if a file reads `process.env.SECRET_NAME` (without
   `NEXT_PUBLIC_`), it must NOT be imported by a file with
   `"use client"` at the top.
4. **Never weaken RLS policies.** Any migration that modifies an RLS
   policy requires explicit owner approval (see `AGENTS.md` §7).
5. **Never disable authentication on a route.** If a route needs to
   be public (e.g. a webhook), it must use a different auth
   mechanism (e.g. `CRON_SECRET` for cron routes).
6. **Never add a new external HTTP call** without owner approval.
   New external calls expand the attack surface (SSRF, data
   exfiltration, vendor trust).
7. **Always validate user input.** Use zod schemas at the boundary
   of every API route that accepts a body or query params.
8. **Always use `requireUser` / `requireCoach`** in API routes that
   touch user data. The auth helpers are in `src/lib/auth-server.ts`.
   In demo mode they return `null` — the route must decide whether
   to 401 or fall through to a local fallback.
9. **Always set `maxDuration`** on long-running API routes to stay
   within the Vercel Hobby plan's 60s default (or 300s for explicit
   long routes like article generation — see `src/app/api/cron/blog/
   step2-generate/route.ts`).
10. **Never expose the service-role key to the browser.** The
    service-role key bypasses RLS — if it leaks, the database is
    fully compromised.
11. **Never auto-apply migrations to production.** Migrations are
    files; the owner runs them.
12. **Always update this file** when adding a new env var, a new
    external service, a new auth flow, or a new data category.

---

## 10. Security Headers (Production)

Enforced via `vercel.json`:

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years, include subdomains, opt into browser preload list |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking via iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage to cross-origin requests |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()` | Disable browser APIs the app doesn't use |

Cache headers (set in `vercel.json` + `next.config.ts`):

- `/images/*` → `public, max-age=31536000, immutable` (1 year)
- `/_next/static/*` → `public, max-age=31536000, immutable` (1 year)
- `/_next/image*` → `public, max-age=86400` (24 hours)
- Root static files (`sitemap.xml`, `robots.txt`, `manifest.json`,
  `sw.js`, favicons, etc.) → `public, max-age=86400, must-revalidate`

---

## 11. Authentication & Authorization Summary

### Authentication

- Email/password via Supabase Auth.
- Google OAuth via PKCE flow (the `@supabase/ssr` cookie-based
  strategy is critical — see `src/middleware.ts` header comment for
  the failure mode if middleware is missing).
- Session refresh handled in middleware on every request.
- Demo mode (no Supabase env vars): two seeded demo accounts
  (`coach@coach.app` / `coach123`, `client@demo.app` / `client123`)
  backed by localStorage.

### Authorization

- **Client-side tier resolution:** `useMembershipTier(profile)` hook
  queries the `subscriptions` table and picks the highest-priority
  active membership.
- **Server-side tier resolution:** `requireUser(request)` /
  `requireCoach(request)` in `src/lib/auth-server.ts` do the same
  query server-side.
- **Tier priority order (verified from code):**
  `pro` (3) > `premium` (2) > `free` (0). `coaching` is treated
  separately — it grants EVO access equivalent to Premium but is NOT
  a higher membership tier. There is NO `elite` tier (an older doc
  claim was incorrect — see `PROGRESS.md` for the discrepancy).
- **RLS:** every table in the database has RLS policies enforced.
  See `DEVELOPER_GUIDE.md` §4 for the per-table policy summary.
- **`is_coach()` SQL function:** SECURITY DEFINER function used by
  RLS policies to check `profiles.role = 'coach'`. Defined in
  migration `0002_blog_posts_and_is_coach_grant.sql`.

---

## 12. PayPal Payment Security

PayPal is the primary payment method (added 2026-08-24). Manual
payment receipts (InstaPay / Vodafone Cash) remain as alternative
flows; PayPal is the only automated online flow.

### 12.1 Credential surface

| Env var | Scope | Notes |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Server-only | Used by `src/lib/paypal.ts` for OAuth2 + Orders API v2 |
| `PAYPAL_CLIENT_SECRET` | Server-only | NEVER prefix `NEXT_PUBLIC_`. Bypasses nothing on its own (PayPal REST is stateless) but enables Order creation/capture |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public (browser) | Loaded by `@paypal/react-paypal-js`. PayPal's design — safe to expose |
| `PAYPAL_WEBHOOK_ID` | Server-only | Used by `/api/paypal/webhook` for `verify-webhook-signature` |
| `PAYPAL_MODE` | Server-only | `sandbox` (default) \| `live` |

`src/lib/paypal.ts` is a server-only module. It must NEVER be imported
by a client component. The `PAYPAL_CLIENT_SECRET` is read via
`process.env` directly (no `NEXT_PUBLIC_` prefix) — Next.js guarantees
these are not shipped to the browser.

### 12.2 Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/paypal/create-order` | POST | User (logged-in) | Create a PayPal Order server-side. **Price is resolved server-side** from `resolvePlanPrice()` (`src/lib/paypal.ts`) — the client NEVER sends the price. Client sends only `planTier` + `durationMonths`. |
| `/api/paypal/capture-order` | POST | User (logged-in) | Capture a PayPal Order server-side. **This is the AUTHORITATIVE payment confirmation** — the client-side `onApprove` callback only signals user intent. After a successful capture, the route inserts a row in `subscription_requests` (status=`approved`) and triggers `processSubscriptionInitialPayment()` for affiliate commission. |
| `/api/paypal/webhook` | POST | PayPal (signature-verified) | Receives webhook events (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `CHECKOUT.ORDER.APPROVED`). **Audit trail only** — does NOT activate subscriptions or commissions. This prevents double-activation if both the webhook and the capture endpoint fire for the same order. |

### 12.3 Idempotency

PayPal's Capture API is idempotent by design. The integration handles
two idempotency paths:

1. **`PayPal-Request-Id` header** — `create-order` uses
   `mhe-create-${userId}-${Date.now()}` and `capture-order` uses
   `mhe-capture-${orderId}`. Same ID returns the same result without
   double-charging.
2. **HTTP 422 / `ORDER_ALREADY_CAPTURED`** — if the order was already
   captured (e.g., webhook fired before the capture call), the route
   treats 422 as success and fetches the order details via
   `fetchPayPalOrderDetails()` to retrieve the capture result.
3. **Affiliate commission idempotency** — `affiliate_commissions` has
   a unique constraint `uq_aff_comm_transaction` on `transaction_id`;
   the `orderId` is used as `external_reference` so a duplicate
   capture call cannot create a duplicate commission.

### 12.4 Webhook signature verification

`/api/paypal/webhook` rejects any request whose signature does not
verify. Verification calls PayPal's
`/v1/notifications/verify-webhook-signature` API with:

- `transmission_id`, `transmission_time`, `cert_url`, `auth_algo`,
  `transmission_sig` — all from the incoming PayPal headers
  (`PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-TIME`,
  `PAYPAL-CERT-URL`, `PAYPAL-AUTH-ALGO`, `PAYPAL-TRANSMISSION-SIG`).
- `webhook_id` — from `PAYPAL_WEBHOOK_ID` env var.

If `verifyWebhookSignature()` returns false OR
`isPaypalConfigured` is false OR `PAYPAL_WEBHOOK_ID` is missing,
the route responds **401** and the event is dropped (not logged as
successful). This prevents forged webhooks from polluting the audit
trail.

### 12.5 What is NEVER logged

- `PAYPAL_CLIENT_SECRET` value — never `console.log`'d, never returned
  in any response.
- The PayPal OAuth2 access token — cached in-memory in `paypal.ts`
  per process; never persisted to disk or DB; never sent to the
  browser.
- The raw webhook body is logged for the audit trail (event type +
  resource ID + timestamp), but the buyer's PII from PayPal's
  response (shipping address, phone, etc.) is NOT logged — only the
  capture status and amount.
- The `custom_id` JSON (`{user_id, plan_tier, duration_months}`) IS
  logged because it's our own metadata (no PayPal-injected PII).

### 12.6 Database touchpoints

| Table | Use |
|---|---|
| `subscription_requests` | After capture: a row is inserted with `status='approved'`, `payment_method='paypal'`, `price_usd` (server-resolved), and metadata linking to the PayPal Order ID (migration `0016_add_paypal_to_payment_method.sql` extended `payment_method` to include `paypal`). |
| `affiliate_commissions` | If the user was referred, `processSubscriptionInitialPayment()` awards the commission using the PayPal Order ID as `external_reference` for idempotency. |
| `admin_notifications` | A bell notification is inserted so the coach sees the PayPal payment in real time. |

### 12.7 Live-mode readiness

The integration is sandbox-tested and live-ready when the owner sets
in Vercel Production env vars:

- `PAYPAL_MODE=live`
- `PAYPAL_CLIENT_ID` + `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (same value)
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID` (obtained from the live PayPal app's webhook
  configuration — points to the URL `/api/paypal/webhook` on the
  production domain)
- Migration `0016` applied to production Supabase.

No code changes are required to switch sandbox → live; the
`PAYPAL_BASE_URL` resolution in `paypal.ts` switches on
`PAYPAL_MODE`.

---

## 13. Incident Response

If a security incident occurs (e.g. suspected data leak, RLS bypass,
compromised key):

1. **Owner** is the incident commander. Notify immediately.
2. **Containment:** rotate the leaked key, revoke sessions
   (`supabase.auth.signOut()` for affected users), disable the
   affected endpoint if needed.
3. **Investigation:** review Vercel logs, Supabase audit log, GitHub
   Actions runs.
4. **Recovery:** ship a fix, redeploy, verify.
5. **Postmortem:** written within 7 days, added to this file as a
   new section ("Past Incidents").

---

## 14. Past Incidents

_None recorded to date._

(When an incident happens, add a section here with: date, summary,
impact, root cause, fix, lessons learned. Keep it factual — no blame,
no marketing spin.)
