# MuscleHubEG — Comprehensive Sports Platform

> **Live:** [musclehubeg.vercel.app](https://musclehubeg.vercel.app)
> **Repository:** [github.com/muscleshubfit-cpu/musclehubeg](https://github.com/muscleshubfit-cpu/musclehubeg)
> **Stack:** Next.js 16 · React 19 · Supabase · OpenRouter + Groq AI · Tailwind CSS 4
> **Last updated:** 2026-09-02 (docs↔code parity through Phase 81)

A bilingual (Arabic/English) fitness & nutrition platform with 868 exercises, 8,830 foods, 6 free tools, an AI coach (EVO) with a two-window plan-quota system, an automated blog CMS, a full B2B coach system (clients, wallets, activations), an affiliate program with 20% commissions, a 7-day conditional refund system, and membership tiers.

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

1. Go to your Supabase Dashboard → **SQL Editor**
2. Run the migration files from `supabase/migrations/` in order —
   numeric prefixes first (`0001…0041`), then the dated files
   (`2026…0057` → `2026…0062`) — 73 SQL files total.
3. After the migrations, run `NOTIFY pgrst, 'reload schema';` to refresh the PostgREST schema cache
4. Or if you have the Supabase CLI: `supabase db push`

> **Note on production drift:** Three tables (`plan_swaps`,
> `progress_photos`, `coach_presence`) were created ad-hoc on the
> production database during Phase 5 and are still not in any
> migration file — see [`PROGRESS.md`](./PROGRESS.md) § "Phase 5" for
> the SQL scripts that were applied (still an open back-fill item).

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

---

## 🏗️ Project Structure

```
musclehubeg/
├── src/
│   ├── app/                    # Next.js App Router — 76 page.tsx files
│   │   ├── (app)/              # Authenticated routes (dashboard, coach, plans, progress…)
│   │   ├── admin/              # ADMIN-ONLY dashboard — AdminGate (coaches are redirected to /coach,
│   │   │                       #   APIs return 403). 13 top-level sections / 15 page.tsx files:
│   │   │                       #   external-plans (AI plans for non-members + regeneration + version
│   │   │                       #   history), accounts, assignments, blog CMS, coach-pages,
│   │   │                       #   coach-support, coach-system, leads, payments (+7-day refunds),
│   │   │                       #   referrals, saved-results, wallets
│   │   ├── api/                # 67 API endpoints (66 route.ts + og-image route.tsx) — see DEVELOPER_GUIDE §8
│   │   ├── ar/                 # Full Arabic mirror — 15 routes (blog, exercises, foods, programs,
│   │   │                       #   coaches, for-coaches, memberships, faq, about…)
│   │   ├── affiliate/          # Affiliate program page (7-step program, 20% commission)
│   │   ├── blog/               # Blog (list + article)
│   │   ├── checkout/           # Checkout flow
│   │   ├── coaching/           # Human coaching marketing page
│   │   ├── evo/                # EVO AI coach marketing page
│   │   ├── exercises/          # Exercise library (868)
│   │   ├── foods/              # Food database (8,830)
│   │   ├── for-coaches/        # Coach join funnel (+ register)
│   │   ├── meal-planner/       # Interactive meal planning tool
│   │   ├── memberships/        # Pricing + membership tiers + comparison table
│   │   ├── tools/              # 5 calculators (BMI, body fat, calories, macros, water)
│   │   ├── profile/            # User profile + settings
│   │   ├── layout.tsx          # Root layout (providers, analytics, ads, PWA)
│   │   └── metadata.ts         # Site-wide SEO metadata
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (52 files, new-york style)
│   │   ├── views/              # Page-level views (33 views)
│   │   ├── blog/               # Blog article + list components
│   │   ├── SiteHeader.tsx      # Navigation + auth + notifications
│   │   ├── AppLayout.tsx       # Role sidebar (member/coach/admin — admin items gated)
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
│   │   │                       #   callFreeOpenRouterRace, callFreeAIFallbackChain; ≤52s clamp)
│   │   ├── exercises.ts        # 868 exercises dataset (yuhonas MIT-licensed)
│   │   ├── foods.ts            # 8,830 foods dataset
│   │   ├── blog-*.ts           # Blog generation pipeline (research → outline → content → images → publish)
│   │   ├── evo-chat-context.tsx # EVO chat state management
│   │   ├── referral.ts + referral-cookie.ts # Referral + commission system
│   │   ├── result-png-export.ts # Canvas → PDF/PNG export
│   │   ├── seo.ts              # JSON-LD schema generators
│   │   ├── supabase/           # Supabase clients (client.ts, admin.ts, types.ts)
│   │   └── ...
│   ├── middleware.ts            # Session refresh + Content-Language header + locale-aware lang/dir
├── supabase/
│   └── migrations/             # 73 SQL migration files (0001…0041 + dated 2026…0057…0062)
├── scripts/                    # ai-jobs-runner (GHA), blog-runner (GHA), check-stale-refs.sh, check-ui-wiring.sh
├── public/                     # Static assets (icons, QR codes, images, manifest, sw.js)
├── .github/workflows/          # 5 workflows: blog-post-ar, blog-post-en, process-ai-jobs,
│                               #   remediate-blog-images, guard-stale-refs
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
- **EVO AI Coach:** Floating chat widget — free users get 10 msgs/day; subscribers unlimited
- **Blog:** AI-generated articles in Arabic + English (automated research→publish pipeline)
- **Save Results:** Free saves 3 results; premium tiers save 50–200 + PDF export
- **Meal Planner:** Custom meals with per-gram macro calculation (tier-scaled)
- **Progress Tracking:** Weight charts, body measurements, progress photos

### For Members (plan quotas — two windows, one shared pool with EVO)
- **Premium ($14.99/mo):** Unlimited EVO chat · **4 nutrition + 4 workout plans per month, capped 1+1 per week** · 3 swaps/week · cross-session memory · 50 saved results
- **Pro ($29.99/mo):** Everything in Premium ×2 — **8+8 plans monthly, capped 2+2 weekly** · 6 swaps/week · pattern analysis · 200 saved results · no ads
- **Coaching ($39.99/mo):** Human coach + EVO at Premium-tier limits (4+4 monthly, 1+1 weekly)
- Weekly window resets Monday 00:00 UTC; monthly totals reset on the 1st. Editing and manual uploads are always unlimited.

### For Coaches (B2B)
- **Client Dashboard:** filter tabs (active, expiring, no questionnaire, by tier…)
- **Client Management:** per-client tabs (overview, subscription, plans, AI plans, questionnaires, progress)
- **AI Plans:** generation draws from the CLIENT's own balance (ownership-checked); meal/item/day/exercise AI regeneration + manual edits are unlimited
- **Wallet System:** monthly per-client fee paid to the site, receipt-reviewed top-ups (InstaPay/Vodafone Cash/PayPal link), activation gate (402 insufficient_wallet)
- **Affiliate Program:** 20% commission on referred subscription payments ($3.00 per Premium, $6.00 per Pro, $8.00 per Coaching), 7-day payout hold, reversal on refunds

### Platform & Admin (admin-only)
- **AI Plans for Non-Members:** full generation + per-element regeneration (whole plan, one meal, one food item, one day, one exercise) + version history (cap 5) with reversible restore
- **Payments + 7-Day Refunds:** manual payment review, refund console with no-features-used enforcement, automatic affiliate commission reversal
- **Blog CMS:** AI pipeline with automated + manual modes
- **Coach System Center:** fees, pages review, support, wallets, assignments

> **Note:** The tier priority in code is `pro` (3) > `premium` (2) >
> `free` (0). `coaching` is treated separately — it grants Premium-tier
> EVO access plus a human coach, but is NOT a higher membership tier.
> There is no `elite` tier in the actual implementation.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui (new-york style, 52 components) |
| **Backend** | Supabase (Postgres, Auth, Storage, RLS) |
| **AI** | OpenRouter + Groq ONLY — unified layer (`src/lib/ai-provider.ts`), interleaved strongest-chain + Promise.any race, budget-clamped ≤52s |
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

**73 SQL migration files** (numeric `0001…0041` + dated `2026…0057…0062`)
define the schema, all with Row Level Security (RLS) policies. Key
tables beyond the early core:

| Table | Purpose |
|---|---|
| `profiles`, `subscriptions`, `subscription_requests` | Accounts, active tiers, manual payment requests |
| `plans`, `plan_swaps*`, `meal_plans` | Member plans + weekly swap tracking |
| `nutrition_questionnaires`, `fitness_questionnaires`, `progress_entries`, `progress_photos*` | Intake + tracking |
| `chat_messages`, `evo_chat_usage` | EVO chat history + daily usage ledger |
| `ai_jobs` | Queued AI jobs (chat/plan/swap/regeneration) with staff gates |
| `blog_posts`, `blog_generation_queue` | Bilingual blog + pipeline state |
| `saved_results`, `tool_leads` | Saved tool results (customers DB) + leads from all 6 tools + signups |
| `referrals`, `referral_earnings`, `referral_payouts` | Affiliate tracking, 20% commissions (7-day `available_at` hold), payouts |
| `coach_assignments`, `coach_payments` | B2B ownership + activation ledger |
| `coach_wallets`, `coach_topup_requests`, `coach_wallet_transactions` | Coach wallet + audited top-ups |
| `coach_emails`, `support_tickets`, `ticket_messages`, `notifications`, `admin_notifications` | Comms |
| `external_plans` | Admin-generated AI plans for non-members (RLS: admin only) |
| `refund_requests` | 7-day refund flow (RLS: admin + owner read) |

\* `plan_swaps`, `progress_photos`, `coach_presence` were created
ad-hoc on production during Phase 5 and are still not in any migration
file (open back-fill item — see `PROGRESS.md`).

---

## 🌍 Languages

- **English** (primary) — `/`
- **Arabic** (RTL) — full mirror under `/ar/*` (15 routes: blog, exercises, foods, programs, coaches, for-coaches, memberships, faq, about…)
- Language toggle in header (custom i18n provider — no `next-intl`)
- `Content-Language` header set via middleware
- **Dynamic `lang`/`dir` on `<html>`** — route-locale aware (Arabic routes render `lang="ar" dir="rtl"` at the root tag; no more wrapping-div-only approach)
- hreflang alternates on blog articles

---

## ⚡ Performance

Performance optimizations were applied during Phase 6 (2026-08-19) and the
project has been running in production since. For current performance
metrics and any ongoing optimizations, see `worklog.md` recent entries.

- AI chat uses an interleaved strongest-models chain (OpenRouter ↔ Groq, server-side usage ledger)
- Every sequential AI path is budget-clamped to `maxModels × timeoutMs ≤ 52s` (Vercel Hobby 60s cap)
- Long-running generations (blog pipeline, AI jobs) run in GitHub Actions runners with retries instead of serverless timeouts
- Image optimization: AVIF + WebP formats enabled
- Static asset caching via service worker (PWA installable)

| Feature | Before | After | Improvement |
|---|---|---|---|
| **EVO AI Chat** | 18-25s + thinking artifacts | 1.4-3.9s + clean responses | **5-7x faster** ✅ |
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

- **Back-fill pending** — `plan_swaps`, `progress_photos`, `coach_presence`
  exist on production but in no migration file (a fresh Supabase project
  needs the SQL scripts from `PROGRESS.md` § "Phase 5").
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
missing `scripts/` directory) were **fixed** in Phases 7–81 — see
`PROGRESS.md` and `QA_CHECKLIST.md` for evidence.

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
- [`docs/`](./docs/) — SEO frameworks (CWV thresholds, E-E-A-T, schema reference) + historical audits
- [`.env.example`](./.env.example) — Environment variables reference
- [`worklog.md`](./worklog.md) — Per-agent change log (older entries archived in `archive/`)
