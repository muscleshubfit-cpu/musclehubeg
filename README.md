# MuscleHubEG — Comprehensive Sports Platform

> **Live:** [musclehubeg.vercel.app](https://musclehubeg.vercel.app)
> **Repository:** [github.com/muscleshubfit-cpu/musclehubeg](https://github.com/muscleshubfit-cpu/musclehubeg)
> **Stack:** Next.js 16 · React 19 · Supabase · OpenRouter + Groq AI · Tailwind CSS 4
> **Last updated:** 2026-09-03 (docs↔code parity through Phase 103b)

A bilingual (Arabic/English) fitness & nutrition platform with 868 exercises, 8,830 foods, a workout-programs library, 6 free tools, an AI coach (EVO) with live streaming chat and a two-window plan-quota system, a public coach directory, an automated bilingual blog CMS, a full B2B coach system (clients, wallets, activations, certificates, public coach pages), a B2C site-coach follow-up layer (`coach_kind` + `site_coach_assignments`), Admin Panel 2.0 (unified client roster with type filters, finances, site-assignments), an affiliate program with 20% commissions, a 7-day conditional refund system, and membership tiers.

---

## ⚠️ Public Repository ≠ Open-Source Product

This repository is **public for development transparency, agent-assisted
collaboration, and auditing** — but the product is **proprietary**. The
code is NOT open source.

- You may read, study, and discuss the code for educational purposes.
- You may submit issues / pull requests back to this repository.
- You may **NOT** redistribute the code, deploy a competing service,
  remove the license notice, or use it to train commercial
  code-generation models.

Production infrastructure (Supabase project, OpenRouter keys, Vercel
deployment), customer data, financial data, and confidential business
information are **private** and never appear in this repository.

See [`LICENSE`](./LICENSE) for the full proprietary terms and
[`SECURITY.md`](./SECURITY.md) for the security policy.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (or **Bun** 1.3+)
- **Supabase** project (free tier works)
- **OpenRouter** API key (free tier works — uses free models)

### Installation

```bash
# Clone the repo
git clone https://github.com/muscleshubfit-cpu/musclehubeg.git
cd musclehubeg

# Install dependencies
bun install
# or: npm install

# Copy env file and fill in your keys
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with the following (see `.env.example` for full reference):

```env
# === Required for production ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === AI (OpenRouter + Groq ONLY — owner directive 2026-08-27) ===
OPENROUTER_API=sk-or-v1-xxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# === Optional integrations ===
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxx
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://your-domain.com
COACH_EMAILS=coach@example.com,admin@example.com
CRON_SECRET=your-cron-secret
```

### Database Setup

`supabase/migrations/` contains **81 SQL files** in four naming
families (see [`supabase/migrations/INDEX.md`](./supabase/migrations/INDEX.md) — the
binding registry). The numbering map currently runs **0001 → 0069**:

| Family | Example | Applied by |
|---|---|---|
| `0001_*.sql` (numeric only) | `0001_init.sql` … `0005_blog_generation_queue.sql` | Supabase GitHub integration (automatic) |
| `YYYYMMDDHHMMSS_NNNN_*.sql` (dated) | `20260902120000_0063_schema_drift_backfill.sql` … `20260903153000_0068_admin_client_type_fix.sql` | Supabase GitHub integration (automatic) — **the required format for all new migrations** |
| `RUN_ON_SUPABASE_*` | `RUN_ON_SUPABASE_0066_DELETE_TEST_ADMIN_ACCOUNT.sql` | Manual only (SQL Editor) — never auto-applied |
| `VERIFY_*.sql` | `VERIFY_SCHEMA_DRIFT.sql` | Manual, read-only verification scripts |

For a fresh project: run the numeric files first (`0001…0005`), then the
dated files in timestamp order (`2026…0057` → `2026…0068`), then
`NOTIFY pgrst, 'reload schema';` to refresh the PostgREST schema cache —
or just `supabase db push` with the CLI. Manual `RUN_ON_SUPABASE_*`
scripts are applied only when the corresponding legacy feature is needed.

> **Historical drift — RESOLVED (Phase 99-run, 2026-09-03):** three
> tables created ad-hoc on production during Phase 5 (`plan_swaps`,
> `progress_photos`, `coach_presence`) were back-filled into migration
> `0063_schema_drift_backfill.sql`, RLS-hardened in `0064`
> (progress_photos) and `0065` (plan_swaps), and the stalled pipeline
> (0064→0067) was unblocked and live-verified. A first failed migration
> rolls back atomically and HALTS the auto pipeline — that is by design
> (loud failure over silent drift; see the 0054 ledger repair).

### Run Locally

```bash
bun dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Mode

If Supabase env vars are NOT set, the app runs in **demo mode** (localStorage-backed):
- Demo coach: `coach@coach.app` / `coach123`
- Demo client: `client@demo.app` / `client123`

---

## 📦 Deployment (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select your repo
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Deploy

The app is configured for Vercel with (see [`vercel.json`](./vercel.json)):
- **Framework:** Next.js
- **Region:** Singapore (sin1)
- **Install command:** `bun install`
- **Build command:** `next build` (production — vercel.json override)
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Caching:** 1-year immutable for `/_next/static` and `/images/*`
- **Cron jobs (2):** weekly progress reminder (Sunday 07:00 UTC) + daily `dispatch-pipelines` (21:00 UTC — tops up missed blog slots + rescues the AI-jobs worker)
- **Blog cadence:** 6 articles/day — 3 EN (`blog-post-en.yml` at 12/16/22 UTC) + 3 AR (`blog-post-ar.yml` at 05/11/18 UTC); ONE workflow run == ONE article in ONE language, and the dispatcher only tops up missed slots (never exceeds 3+3)

**Database migrations on deploy:** the Supabase GitHub integration
auto-applies every auto-named migration (numeric + dated families) on
push, in order. One failing migration halts the whole pipeline until
fixed — proven live in Phase 99-run, where a single 42703 on two phantom
columns froze the ledger at 0063 and silently held back 0064→0067
(RLS hardening + the entire Phase 103 admin unification) until corrected.

---

## 🏗️ Project Structure

```
musclehubeg/
├── src/
│   ├── app/                    # Next.js App Router — 82 page.tsx files
│   │   ├── (app)/              # Authenticated routes (dashboard, coach, plans, progress…)
│   │   ├── (home)/             # Landing page route group
│   │   ├── admin/              # ADMIN-ONLY — Admin Panel 2.0 with dedicated AdminShell
│   │   │                       #   (AdminGate redirects coaches to /coach; APIs return 403).
│   │   │                       #   Sections: dashboard (KPIs + quick actions, /admin redirects
│   │   │                       #   here), clients (UNIFIED roster — type filter buttons
│   │   │                       #   الكل/أعضاء الموقع/عملاء B2B/مدربو الموقع/مدربو B2B/الإدارة +
│   │   │                       #   lifecycle tabs + danger tools), site-assignments (B2C
│   │   │                       #   member↔site-coach 1↔1), coaches (real roster + one-tap
│   │   │                       #   site/B2B kind toggle), finances (SITE money B2C vs COACH
│   │   │                       #   money B2B), payments (+7-day refund console), members +
│   │   │                       #   accounts (legacy redirects), assignments, blog CMS,
│   │   │                       #   coach-pages, coach-support, coach-system, referrals,
│   │   │                       #   leads, saved-results, wallets, external-plans
│   │   ├── api/                # 69 API endpoints (68 route.ts + og-image route.tsx) — see DEVELOPER_GUIDE §8
│   │   ├── ar/                 # Full Arabic RTL mirror (blog, exercises, foods, programs,
│   │   │                       #   coaches, for-coaches, memberships, faq…)
│   │   ├── affiliate/          # Affiliate program page (7-step program, 20% commission)
│   │   ├── blog/               # Blog (list + article + OG images)
│   │   ├── checkout/           # Checkout flow
│   │   ├── coaching/           # Human coaching marketing page
│   │   ├── coaches/[slug]/     # Public coach directory pages (+ featured API + preview route)
│   │   ├── evo/                # EVO AI coach marketing page
│   │   ├── exercises/          # Exercise library (868)
│   │   ├── foods/              # Food database (8,830)
│   │   ├── for-coaches/        # Coach join funnel (+ register)
│   │   ├── meal-planner/       # Interactive meal planning tool
│   │   ├── memberships/        # Pricing + membership tiers + comparison table
│   │   ├── programs/           # Workout programs library (7 programs)
│   │   ├── tools/              # 5 calculators (BMI, body fat, calories, macros, water)
│   │   ├── profile/            # User profile + settings
│   │   ├── layout.tsx          # Root layout (providers, analytics, ads, PWA)
│   │   └── metadata.ts         # Site-wide SEO metadata
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (51 files, new-york style)
│   │   ├── views/              # Page-level views (31 views)
│   │   ├── admin/              # AdminShell (sidebar + mobile button grid + live badges)
│   │   │                       #   + admin/ui.tsx shared primitives (StatTile, badges, tabs…)
│   │   ├── blog/               # Blog article + list components
│   │   ├── coach/              # Coach landing content
│   │   ├── SiteHeader.tsx      # Navigation + auth + notifications
│   │   ├── AppLayout.tsx       # Role sidebar (member/coach — admins live in /admin)
│   │   ├── EvoFloatingWidget.tsx # EVO AI chat floating widget (quota meters)
│   │   ├── AdminNotificationBell.tsx / NotificationBell.tsx
│   │   ├── SaveResultButton.tsx # Tool result save + PDF export
│   │   └── ...
│   ├── hooks/                   # React hooks (auth, nav, tier, mobile, toast, scroll, voice)
│   ├── lib/                    # Business logic + data layer
│   │   ├── memberships.ts      # Tier definitions + pricing + limits (incl. weekly+monthly plan quotas)
│   │   ├── tier-limits.ts      # Quota engine: chat/swaps/plans — weekStartUtc (Monday UTC),
│   │   │                       #   enforcePlanQuota (weekly cap + monthly total, blockedBy week|month)
│   │   ├── coach-limits.ts     # B2B pricing + activation fees
│   │   ├── data/               # Data layer — 13 modules (index re-exports auth, blog, chat, coach,
│   │   │                       #   notifications, plans, progress, questionnaires, referrals,
│   │   │                       #   subscriptions, tickets + helpers; Supabase OR localStorage demo)
│   │   ├── plan-generator.ts   # AI nutrition/workout plan generation + meal/food-item/day
│   │   │                       #   regeneration + exercise substitution
│   │   ├── external-plan-text.ts # Structured non-member plan types + Arabic text rendering
│   │   ├── ai-jobs.ts          # Queued AI job types + staff gates (JOB_GATE) + payload sanitization
│   │   ├── ai-job-processors.ts # GHA-runner job processors + draft materialization
│   │   ├── refund.ts           # 7-day refund eligibility (no-features-used, ledger-based)
│   │   ├── affiliate-engine.ts # Affiliate engine + COMMISSION_RATE 20% + payout holds
│   │   ├── auth-server.ts      # Server auth helpers (requireUser, requireCoach, requireAdmin)
│   │   ├── ai-provider.ts      # Unified AI layer: OpenRouter + Groq ONLY (callAI, callAIWithFallback,
│   │   │                       #   callFreeOpenRouterRace, callFreeAIFallbackChain, callAIStream; ≤52s clamp)
│   │   ├── exercises.ts        # 868 exercises dataset (yuhonas MIT-licensed)
│   │   ├── foods.ts            # 8,830 foods dataset
│   │   ├── workout-programs.ts # Workout programs library content
│   │   ├── blog-*.ts           # Blog generation pipeline (research → outline → content → images → publish)
│   │   ├── evo-chat-context.tsx # EVO chat state management
│   │   ├── referral.ts + referral-cookie.ts # Referral + commission system
│   │   ├── result-png-export.ts # Canvas → PDF/PNG export
│   │   ├── seo.ts              # JSON-LD schema generators
│   │   ├── supabase/           # Supabase clients (client.ts, admin.ts, types.ts)
│   │   └── ...
│   ├── middleware.ts            # Session refresh + Content-Language header + locale-aware lang/dir
├── supabase/
│   └── migrations/             # 81 SQL files (0001→0069 registry in INDEX.md; manual
│                               #   RUN_ON_SUPABASE_* + VERIFY_* scripts included)
├── scripts/                    # ai-jobs-runner (GHA), blog-runner (GHA), migration_audit.py
│                               #   (schema-drift gate, Phase 96), docs_parity.py (docs-counts
│                               #   gate, Phase 106), check-stale-refs.sh
├── public/                     # Static assets (icons, QR codes, images, manifest, sw.js)
├── .github/workflows/          # 6 workflows: blog-post-ar, blog-post-en, process-ai-jobs,
│                               #   remediate-blog-images, guard-stale-refs, docs-parity-gate
├── AGENTS.md                   # AI agent operating rules
├── SECURITY.md                 # Security policy
├── LICENSE                     # Proprietary, all rights reserved
├── PROGRESS.md                 # Recent phases snapshot (older phases archived in archive/)
├── DEVELOPER_GUIDE.md          # Developer onboarding + architecture details
├── QA_CHECKLIST.md             # Verification evidence + QA protocol (older evidence archived)
└── package.json
```

---

## 🎯 Key Features

### For Users
- **6 Free Tools:** Calorie calculator, BMI, macros, body fat %, water tracker, meal planner — each with email delivery of results + lead capture
- **Exercise Library:** 868 exercises with images (start + end positions), Arabic + English
- **Food Database:** 8,830 foods with per-100g macros
- **Workout Programs Library:** 7 structured programs (home, gym, HIIT…)
- **EVO AI Coach:** Floating chat widget with SSE streaming (live typing) — free users get 10 msgs/day; subscribers unlimited
- **Coach Directory:** public coach pages (`/coaches/[slug]`) with landing editor, featured API, and preview mode
- **Blog:** AI-generated articles in Arabic + English (automated research→publish pipeline)
- **Save Results:** Free saves 3 results; premium tiers save 50–200 + PDF export
- **Meal Planner:** Custom meals with per-gram macro calculation (tier-scaled)
- **Progress Tracking:** Weight charts, body measurements, progress photos

### For Members (plan quotas — two windows, one shared pool with EVO)
- **Premium ($14.99/mo or $119/yr):** Unlimited EVO chat · **4 nutrition + 4 workout plans per month, capped 1+1 per week** · 3 swaps/week · cross-session memory · 50 saved results
- **Pro ($29.99/mo or $239/yr):** Everything in Premium ×2 — **8+8 plans monthly, capped 2+2 weekly** · 6 swaps/week · pattern analysis · 200 saved results · no ads
- **Coaching ($39.99/mo or $359/yr):** Human coach + EVO at Premium-tier limits (4+4 monthly, 1+1 weekly)
- Weekly window resets Monday 00:00 UTC; monthly totals reset on the 1st. Editing and manual uploads are always unlimited.

### For Coaches (B2B)
- **Client Dashboard:** filter tabs (active, expiring, no questionnaire, by tier…)
- **Client Management:** per-client tabs (overview, subscription, plans, AI plans, questionnaires, progress)
- **AI Plans:** generation draws from the CLIENT's own balance (ownership-checked); meal/item/day/exercise AI regeneration + manual edits are unlimited
- **Wallet System:** monthly per-client fee paid to the site, receipt-reviewed top-ups (InstaPay/Vodafone Cash/PayPal link), activation gate (402 insufficient_wallet)
- **Public Coach Page:** claimable slug + landing editor + ads + certificates
- **Affiliate Program:** 20% commission on referred subscription payments ($3.00 per Premium, $6.00 per Pro, $8.00 per Coaching), 7-day payout hold, reversal on refunds

### For Site Coaches (B2C — Phase 103)
- **Coach Kind:** every coach profile is `'site'` (platform-employed) or `'b2b'` (independent business) — one-tap toggle in `/admin/coaches`
- **Member Follow-ups:** admin assigns any member to a site coach via `/admin/site-assignments` (1↔1, move/unassign) — B2C members get human follow-up without touching the B2B money relation
- **Separation guarantee:** `site_coach_assignments` is deliberately a SEPARATE table from `coach_assignments` (the B2B money relation that drives wallet billing + affiliate attribution) — B2C rows can never pollute billing

### Platform & Admin (Admin Panel 2.0 — admin-only)
- **Dedicated AdminShell:** replaces AppLayout inside `/admin` — sectioned sidebar with active-state identity, live pending badges (payment requests, coach-page reviews), mobile tappable button grid
- **Unified Client Roster `/admin/clients`:** every person in ONE page — type filter buttons (الكل/أعضاء الموقع/عملاء مدربي B2B/مدربو الموقع/مدربو B2B/الإدارة), membership lifecycle tabs (نشط/ينتهي قريباً/منتهي/بانتظار الدفع/بدون اشتراك), tier badges, test filter, search/sort/pagination, danger tools (test-mark, two-step delete, mobile-proof bulk bar); served by the role-aware `get_admin_clients_paged` RPC (0067 + 0068 correct classification: B2B client ⇔ assignment onto a REAL coach; admin follow-up shows «متابعة الإدارة»)
- **Finances `/admin/finances`:** SITE money (approved revenue, refunds, NET, pending + 6-month trend) separated from COACH money (prepaid wallet balances, top-ups, offline ledger + expected monthly bill)
- **Members `/admin/members`:** membership-status table (legacy redirect → unified roster)
- **Coaches Roster `/admin/coaches`:** the real coach list — kind badge, B2B clients + follow-up counts, membership status, wallet, one-tap site/B2B toggle
- **Site Assignments `/admin/site-assignments`:** pick site coach → search member → assign/move/unassign
- **AI Plans for Non-Members:** full generation + per-element regeneration (whole plan, one meal, one food item, one day, one exercise) + version history (cap 5) with reversible restore
- **Payments + 7-Day Refunds:** manual payment review, refund console with no-features-used enforcement, automatic affiliate commission reversal
- **Blog CMS:** AI pipeline with automated + manual modes
- **Coach System Center:** fees, pages review, support, wallets, assignments, staff accounts

> **Note:** The tier priority in code is `pro` (3) > `premium` (2) >
> `free` (0). `coaching` is treated separately — it grants Premium-tier
> EVO access plus a human coach, but is NOT a higher membership tier.
> There is no `elite` tier in the actual implementation.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui (new-york style, 51 components) |
| **Backend** | Supabase (Postgres, Auth, Storage, RLS + GitHub-integration auto-migrations) |
| **AI** | OpenRouter + Groq ONLY — unified layer (`src/lib/ai-provider.ts`), interleaved strongest-chain + Promise.any race + SSE streaming, budget-clamped ≤52s |
| **Charts** | Recharts 3 (lazy-loaded) |
| **Forms** | react-hook-form + zod |
| **Email** | Nodemailer (tool results, newsletters, validation + daily 100/24h cap) |
| **Payments** | PayPal (create/capture/webhook) + manual review (InstaPay/Vodafone Cash/bank) |
| **Analytics** | Vercel Analytics + Speed Insights + GA4 (optional) |
| **Ads** | Google AdSense (tier-gated, auto-suppressed on auth routes) |
| **PWA** | manifest.json + service worker |
| **Deployment** | Vercel (Singapore region) |
| **Type System** | TypeScript 5, `strict: true`, 0 `@ts-nocheck`, 0 `ignoreBuildErrors` |

---

## 📊 Database

**81 SQL files** across four naming families (see
[`supabase/migrations/INDEX.md`](./supabase/migrations/INDEX.md)) with the
numbering map running **0001 → 0069**. All auto-applied families carry
Row Level Security (RLS) policies — hardened progressively (Phases
99–100: strict RLS for `progress_photos` and the tamper-proof
`plan_swaps` usage ledger, with table-level revokes for loud failures).
Key tables:

| Table | Purpose |
|---|---|
| `profiles`, `subscriptions`, `subscription_requests` | Accounts, active tiers, manual payment requests; `profiles.coach_kind` = `'site'`\|`'b2b'` (0067) |
| `plans`, `plan_swaps`, `meal_plans` | Member plans + weekly swap tracking (immutable usage ledger) |
| `nutrition_questionnaires`, `fitness_questionnaires`, `progress_entries`, `progress_photos` | Intake + tracking |
| `chat_messages`, `evo_chat_usage` | EVO chat history + daily usage ledger |
| `ai_jobs` | Queued AI jobs (chat/plan/swap/regeneration) with staff gates |
| `blog_posts`, `blog_generation_queue` | Bilingual blog + pipeline state |
| `saved_results`, `tool_leads` | Saved tool results (customers DB) + leads from all 6 tools + signups (0059/0060: name/type/newsletter) |
| `referrals`, `referral_earnings`, `referral_payouts` | Affiliate tracking, 20% commissions (7-day `available_at` hold), payouts |
| `coach_assignments`, `coach_payments` | B2B MONEY relation (wallet billing + affiliate attribution) + activation ledger |
| `site_coach_assignments` | B2C member↔site-coach 1↔1 follow-ups (0067 — deliberately separate from money) |
| `coach_wallets`, `coach_topup_requests`, `coach_wallet_transactions` | Coach wallet + audited top-ups |
| `coach_emails`, `support_tickets`, `ticket_messages`, `notifications`, `admin_notifications` | Comms |
| `external_plans` | Admin-generated AI plans for non-members (RLS: admin only) |
| `refund_requests` | 7-day refund flow (RLS: admin + owner read) |
| `get_admin_clients_paged` / `get_admin_clients_stats` | Role-aware roster RPCs (0067, corrected 0068) covering every role — members, B2B coaches, site coaches, staff |

> The three Phase-5 ad-hoc tables (`plan_swaps`, `progress_photos`,
> `coach_presence`) are now IN the migration registry: back-filled by
> `0063`, RLS-hardened by `0064`/`0065` (closed Phase 99-run, 2026-09-03).

---

## 🌍 Languages

- **English** (primary) — `/`
- **Arabic** (RTL) — full mirror under `/ar/*` (blog, exercises, foods, programs, coaches, for-coaches, memberships, faq…)
- Language toggle in header (custom i18n provider — no `next-intl`)
- `Content-Language` header set via middleware
- **Dynamic `lang`/`dir` on `<html>`** — route-locale aware (Arabic routes render `lang="ar" dir="rtl"` at the root tag)
- hreflang alternates on blog articles

---

## ⚡ Performance

Performance optimizations were applied during Phase 6 (2026-08-19) and the
project has been running in production since. For current performance
metrics and any ongoing optimizations, see `worklog.md` recent entries.

- AI chat uses an interleaved strongest-models chain (OpenRouter ↔ Groq, server-side usage ledger) with **SSE streaming** — raw tokens arrive live (`event: delta` → `event: final`)
- Every sequential AI path is budget-clamped to `maxModels × timeoutMs ≤ 52s` (Vercel Hobby 60s cap)
- Long-running generations (blog pipeline, AI jobs) run in GitHub Actions runners with retries instead of serverless timeouts
- Image optimization: AVIF + WebP formats enabled
- Static asset caching via service worker (PWA installable)

| Feature | Before | After | Improvement |
|---|---|---|---|
| **EVO AI Chat** | 18-25s + thinking artifacts | 1.4-3.9s + clean streaming responses | **5-7x faster** ✅ |
| **Plan generation** | 90-180s timeout | 30-60s (or GHA queue) | **3x faster** ✅ |
| **Swap (meal + exercise)** | 60-90s | 10-30s | **3-4x faster** ✅ |
| **Article generation** | Timeout + short articles | ~100s + 600-900 EN words + 500-800 AR words | **No more timeouts** ✅ |

### AI Provider Strategy

One unified layer (see [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) §14):

| Function | Use case | Behavior |
|---|---|---|
| `callAI()` | Single entrypoint | Routes to OpenRouter/Groq with model chain |
| `callAIWithFallback()` | Plans, Articles, Research | Sequential strongest-chain with fallbacks |
| `callFreeOpenRouterRace()` | Swap | Parallel — races top models via `Promise.any()`, returns first success |
| `callFreeAIFallbackChain()` | EVO chat, Blog pipeline, Plans | Sequential interleaved chain (fast/strongest) + key rotation — optional `onDelta` forwards raw tokens live |
| `callAIStream()` | EVO chat (Phase 89) | Streaming single-provider call — `stream:true`, forwards SSE content deltas to `onDelta`, returns full text; reasoning deltas buffered silently |

**EVO chat streaming (Phase 89):** the chat endpoint answers with SSE —
`event: delta` (raw tokens, live typing) → `event: final` (cleaned full
text + links + source) — while 429/errors stay JSON.

**Owner directive (2026-08-27):** the platform uses **OpenRouter and Groq
ONLY** through `src/lib/ai-provider.ts`. The old direct Gemini SDK /
OpenAI / Anthropic / DeepSeek integrations were removed; Google models
are reachable via their OpenRouter slugs (`google/*`). The GitHub
Actions workflows add an outer retry loop (3 attempts, 120s backoff)
around each pipeline step.

---

## 🐛 Known Issues (Summary)

A full evidence-based list is in [`PROGRESS.md`](./PROGRESS.md). Currently open:

- **Types mirror drift (Phase 105 candidate)** — `src/lib/supabase/types.ts`
  still mirrors two Phase-5 legacy tables wrongly: `coach_presence`
  (`user_id`/`status` — live columns are `coach_id`/`last_seen`) and
  parts of `progress.ts` (`taken_on`/`file_path`/`note` — live is
  `taken_at`/`photo_url`). Proven live column-by-column in Phase 99-run;
  `migration_audit.py` reports no NEW drift, but the app's presence
  helpers silently degrade until the mirror is regenerated. Migration
  files themselves are aligned with LIVE schema (that was the 0064 v2 fix).
- **H5 (partial)** — the blog generation CTA prompt still names
  "coach Ahmed Zake" (`src/lib/blog-pipeline.ts`); the author field
  itself defaults to Musclehubeg.
- **Environment, not code** — Vercel occasionally returns 502 on very
  long generation POSTs (UI toasts an error; retry succeeds), and AI
  providers have brief outage windows (jobs retry 3× then fail safely
  without burning quota).

Previously listed issues (root `<html>` lang hard-coded, Arabic-only
membership features, `/ar/exercises` 404s, coach-route redirects,
profile tool count, duplicate Pricing nav item, missing i18n keys,
missing `scripts/` directory, **and the Phase-5 ad-hoc table back-fill**
— resolved by `0063` in Phase 99-run) were **fixed** in Phases 7–103b —
see `PROGRESS.md` and `QA_CHECKLIST.md` for evidence.

---

## 📝 License

This project is **proprietary**. All rights reserved.

The repository is public for development, auditing, transparency, and
agent-assisted collaboration — but the code is **NOT open source**.

See [`LICENSE`](./LICENSE) for the full proprietary terms.

---

## 📋 Additional Documentation

- [`AGENTS.md`](./AGENTS.md) — AI agent operating rules (required reading)
- [`SECURITY.md`](./SECURITY.md) — Security policy
- [`PROGRESS.md`](./PROGRESS.md) — Recent phases snapshot (older phases archived in `archive/`)
- [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) — Developer onboarding + architecture details
- [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) — Verification evidence + QA protocol (older evidence archived)
- [`supabase/migrations/INDEX.md`](./supabase/migrations/INDEX.md) — Binding migration registry (0001→0069) + naming laws
- [`docs/`](./docs/) — SEO frameworks (CWV thresholds, E-E-A-T, schema reference) + historical audits
- [`.env.example`](./.env.example) — Environment variables reference
- [`worklog.md`](./worklog.md) — Per-agent change log (older entries archived in `archive/`)
