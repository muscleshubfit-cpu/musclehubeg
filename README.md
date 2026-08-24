# MuscleHubEG — Comprehensive Sports Platform

> **Live:** [musclehubeg.vercel.app](https://musclehubeg.vercel.app)
> **Repository:** [github.com/muscleshubfit-cpu/musclehubeg](https://github.com/muscleshubfit-cpu/musclehubeg)
> **Stack:** Next.js 16 · React 19 · Supabase · OpenRouter AI · Tailwind CSS 4
> **Last updated:** 2026-08-23 (rebase + documentation cleanup)

A bilingual (Arabic/English) fitness & nutrition platform with 868+ exercises, 8,830+ foods, 6 free tools, an AI coach (EVO), a blog CMS with automated AI generation, a coach dashboard with client management, a referral system, and membership tiers.

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

# === AI (OpenRouter — free models work) ===
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# === Optional integrations ===
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxx
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://your-domain.com
COACH_EMAILS=coach@example.com,admin@example.com
CRON_SECRET=your-cron-secret
```

### Database Setup

1. Go to your Supabase Dashboard → **SQL Editor**
2. Run each migration file in order (0001 → 0012) from the `supabase/migrations/` folder
3. After the migrations, run `NOTIFY pgrst, 'reload schema';` to refresh the PostgREST schema cache
4. Or if you have the Supabase CLI: `supabase db push`

> **Note on production drift:** Three tables (`plan_swaps`,
> `progress_photos`, `coach_presence`) were created ad-hoc on the
> production database during Phase 5 because they were missing from
> migrations. They are still not in any migration file — see
> [`PROGRESS.md`](./PROGRESS.md) § "Phase 5" for the SQL scripts that
> were applied.

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
- **Cron job:** Weekly progress reminder (Sunday 07:00 UTC)

> **Build script note:** `package.json` defines the build script as
> `node scripts/compress-images.js && next build`, but the `scripts/`
> directory does **not exist** in the repository. Local `bun run build`
> would fail at the first step. Production Vercel builds use
> `vercel.json`'s `buildCommand` (`next build`), so production is
> unaffected. See [`PROGRESS.md`](./PROGRESS.md) for the open issue.

---

## 🏗️ Project Structure

```
musclehubeg/
├── src/
│   ├── app/                    # Next.js App Router pages (47 page.tsx files)
│   │   ├── (app)/              # Authenticated routes (dashboard, coach, plans, etc.)
│   │   ├── admin/              # Coach-only admin pages (blog, leads, saved-results, referrals)
│   │   ├── api/                # API routes (28 endpoints — see DEVELOPER_GUIDE §8)
│   │   ├── ar/                 # Arabic mirror routes (limited — see Known Issues)
│   │   ├── blog/               # Blog pages (list + article)
│   │   ├── checkout/           # Checkout flow
│   │   ├── coaching/           # Coaching marketing page
│   │   ├── evo/                # EVO AI marketing page
│   │   ├── exercises/          # Exercise library (868+)
│   │   ├── foods/              # Food database (8,830+)
│   │   ├── meal-planner/       # Interactive meal planning tool
│   │   ├── memberships/        # Pricing + membership tiers
│   │   ├── tools/              # 5 fitness calculators
│   │   ├── profile/            # User profile + settings
│   │   ├── layout.tsx          # Root layout (providers, analytics, ads, PWA)
│   │   └── metadata.ts         # Site-wide SEO metadata
│   ├── components/
│   │   ├── blog/               # Blog article + list components
│   │   ├── ui/                 # shadcn/ui primitives (50 files, new-york style)
│   │   ├── views/              # Page-level views (23 views)
│   │   ├── AdSenseAd.tsx       # Google AdSense (tier-gated)
│   │   ├── SiteHeader.tsx      # Navigation + auth + notifications
│   │   ├── EvoFloatingWidget.tsx # EVO AI chat floating widget
│   │   ├── SaveResultButton.tsx # Tool result save + PDF export
│   │   └── ...
│   ├── hooks/                   # React hooks (auth, nav, tier, mobile, toast)
│   ├── lib/                    # Business logic + data layer
│   │   ├── memberships.ts      # Tier definitions + pricing + limits
│   │   ├── data.ts             # Supabase data layer (all CRUD operations)
│   │   ├── auth-server.ts     # Server-side auth helpers (requireUser, requireCoach)
│   │   ├── ai-provider.ts     # Universal AI provider (OpenRouter + 5 others, 2 call paths)
│   │   ├── exercises.ts        # 868 exercises dataset (yuhonas MIT-licensed)
│   │   ├── foods.ts            # 8,830 foods dataset
│   │   ├── blog-generate.ts   # AI blog article generation (chunked)
│   │   ├── evo-chat-context.tsx # EVO chat state management
│   │   ├── plan-generator.ts   # AI nutrition/workout plan generation
│   │   ├── referral.ts         # Referral + commission system
│   │   ├── result-png-export.ts # Canvas → PDF/PNG export
│   │   ├── seo.ts              # JSON-LD schema generators
│   │   ├── supabase/           # Supabase clients (client.ts, admin.ts, types.ts)
│   │   └── ...
│   ├── middleware.ts            # Supabase session refresh + Content-Language header
│   └── ...
├── supabase/
│   └── migrations/             # 15 SQL migration files (0001–0015) + RUN_ON_SUPABASE.sql
├── public/                     # Static assets (icons, QR codes, images, manifest, sw.js)
├── .github/workflows/          # GitHub Actions (3-step blog generation pipeline, every 2h)
├── AGENTS.md                   # AI agent operating rules
├── SECURITY.md                 # Security policy
├── LICENSE                     # Proprietary, all rights reserved
├── PROGRESS.md                 # Current status snapshot (1-page, refreshed on each push)
├── DEVELOPER_GUIDE.md          # Developer onboarding + architecture details
├── QA_CHECKLIST.md             # Verification evidence + QA protocol
├── next.config.ts              # Next.js config (images, headers, experiments)
├── vercel.json                 # Vercel deployment config (buildCommand override, headers, cron)
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config (strict: true, no @ts-nocheck)
├── eslint.config.mjs           # ESLint flat config (next core-web-vitals + typescript)
└── package.json
```

---

## 🎯 Key Features

### For Users
- **6 Free Tools:** Calorie calculator, BMI, macros, body fat %, water tracker, meal planner
- **Exercise Library:** 868+ exercises with images (start + end positions)
- **Food Database:** 8,830+ foods with per-100g macros
- **EVO AI Coach:** Floating chat widget — free for all users (10 msgs/day)
- **Blog:** 46+ AI-generated articles in Arabic + English
- **Save Results:** Premium+ users can save + export results as PDF
- **Meal Planner:** Build custom meals with per-gram macro calculation
- **Progress Tracking:** Weight charts, body measurements, progress photos

### For Members
- **Premium ($14.99/mo):** Unlimited EVO, 3 plans/mo, 50 saved results, PDF export
- **Pro ($29.99/mo):** 6 plans/mo, pattern analysis, 200 saved results, no ads, premium content
- **Coaching ($39.99/mo):** Human coach + EVO (Premium-tier EVO access)
- Multiple subscriptions allowed (e.g., Coaching + Premium simultaneously)

### For Coaches
- **Client Dashboard:** 10 filter tabs (active, expiring, no questionnaire, by tier, etc.)
- **Client Management:** 6 tabs per client (overview, subscription, plans, AI plans, questionnaires, progress)
- **Payment Review:** InstaPay/Vodafone Cash receipt review + approve/reject
- **Blog CMS:** AI article generation (manual or automated via cron)
- **Notifications:** Real-time admin notification bell

> **Note:** The tier priority in code is `pro` (3) > `premium` (2) >
> `free` (0). `coaching` is treated separately — it grants EVO access
> equivalent to Premium, but is NOT a higher membership tier. There
> is no `elite` tier in the actual implementation.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui (new-york style, 50 components) |
| **Backend** | Supabase (Postgres, Auth, Storage, RLS) |
| **AI** | OpenRouter free models (6-model fallback + Promise.any race) |
| **Charts** | Recharts 3 (lazy-loaded) |
| **Forms** | react-hook-form + zod |
| **Analytics** | Vercel Analytics + Speed Insights + GA4 (optional) |
| **Ads** | Google AdSense (tier-gated, auto-suppressed on auth routes) |
| **PWA** | manifest.json + service worker |
| **Deployment** | Vercel (Singapore region) |
| **Type System** | TypeScript 5, `strict: true`, 0 `@ts-nocheck`, 0 `ignoreBuildErrors` |

---

## 📊 Database

**22 tables** are formally defined via 15 migrations (0001 → 0015),
all with Row Level Security (RLS) policies. An additional 3 tables
are used in code but were created ad-hoc on production (see Known
Issues):

| Table | Purpose |
|---|---|
| `profiles` | User accounts (role: client/coach) |
| `subscriptions` | Active subscriptions (multi-tier per client) |
| `subscription_requests` | Pending payment requests (price_usd as numeric) |
| `notifications` | Per-user notifications |
| `admin_notifications` | Coach-facing notifications |
| `blog_posts` | Blog articles (bilingual) |
| `blog_generation_queue` | AI blog generation pipeline state |
| `saved_results` | User's saved tool results |
| `meal_plans` | User's saved meal plans (migration 0008) |
| `tool_leads` | Lead capture from free tools |
| `nutrition_questionnaires` | Client nutrition intake forms |
| `fitness_questionnaires` | Client fitness intake forms |
| `progress_entries` | Body measurements over time |
| `plans` | Meal/workout plans (draft/approved/archived) |
| `support_tickets` | Client→coach support tickets (priority + status) |
| `ticket_messages` | Chat messages within tickets |
| `chat_messages` | AI chat history (subscribers) |
| `referrals` | Referrer→referred tracking |
| `referral_earnings` | Commission amounts |
| `referral_payouts` | Payout requests |

**Tables created ad-hoc on production (Phase 5), NOT in any migration:**

| Table | Purpose | Status |
|---|---|---|
| `plan_swaps` | Daily swap usage tracking | Used in code; SQL script in `PROGRESS.md` |
| `progress_photos` | Progress photo references | Used in code; SQL script in `PROGRESS.md` |
| `coach_presence` | Coach online status | Used in code; SQL script in `PROGRESS.md` |

> **Action needed:** These three tables should be back-filled as
> migration files (`0013_*`, `0014_*`, `0015_*`) so a fresh Supabase
> project can be set up from migrations alone. See `PROGRESS.md`.

---

## 🌍 Languages

- **English** (primary) — `/`
- **Arabic** (secondary, RTL) — `/ar/*`
- Language toggle in header (custom i18n provider — no `next-intl`)
- `Content-Language` header set via middleware
- hreflang alternates on blog articles

> **Known limitation:** The root `<html>` tag is hardcoded as
> `<html lang="en" dir="ltr">` in `src/app/layout.tsx`. Arabic
> routes (`/ar/*`) wrap their content in a `<div dir="rtl">` instead.
> The middleware sets `Content-Language: ar-EG` for `/ar/*` requests
> to compensate for crawlers, but a proper fix would use route
> groups + `generateMetadata()` per segment. See `PROGRESS.md` (H1).
>
> **Arabic routes currently available:** `/ar`, `/ar/blog`,
> `/ar/blog/[slug]`. Routes like `/ar/exercises` and `/ar/foods`
> are NOT mirrored and return 404 (see H6 in `PROGRESS.md`).

---

## ⚡ Performance

Performance optimizations were applied during Phase 6 (2026-08-19) and the
project has been running in production since. For current performance
metrics and any ongoing optimizations, see `worklog.md` recent entries.

- AI chat uses an interleaved strongest-models chain (OpenRouter → Groq fallback)
- Image optimization: AVIF + WebP formats enabled
- Static asset caching via service worker (PWA installable)
- Blog generation runs 3×/day via GitHub Actions cron (06:00, 14:00, 22:00 UTC)

| Feature | Before | After | Improvement |
|---|---|---|---|
| **EVO AI Chat** | 18-25s + thinking artifacts | 1.4-3.9s + clean responses | **5-7x faster** ✅ |
| **Plan generation** | 90-180s timeout | 30-60s timeout | **3x faster** ✅ |
| **Swap (meal + exercise)** | 60-90s | 10-30s | **3-4x faster** ✅ |
| **Article generation** | Timeout + short articles | ~100s + 600-900 EN words + 500-800 AR words | **No more timeouts** ✅ |
| **Cron blog step2** | 60s timeout (always failed) | 300s timeout (succeeds) | **Fixed** ✅ |

### AI Provider Strategy

Two functions for different use cases (see [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) §14):

| Function | Use case | Behavior |
|---|---|---|
| `callFreeOpenRouter()` | Plans, Articles, Research | Sequential — tries largest model first, falls back if fails |
| `callFreeOpenRouterRace()` | EVO chat, Swap | Parallel — races top 3 models via `Promise.any()`, returns first success |

The provider layer supports **6 providers** (OpenRouter, OpenAI, Gemini,
Anthropic, Groq, DeepSeek) via the same OpenAI-compatible interface.
Switching providers is a config change (env var or in-app AI Settings
page) — no code changes required.

---

## 🐛 Known Issues (Summary)

A full evidence-based list is in [`PROGRESS.md`](./PROGRESS.md). Highlights:

- **C5** — EVO AI may still fall back to local replies if `OPENROUTER_API_KEY`
  is missing in Vercel env vars. Code path is fixed; verify config.
- **C6** — Vercel auto-deploy from `main` branch status is unverified
  without Vercel API access.
- **H1** — Root `<html>` tag is hardcoded `lang="en" dir="ltr"` (Arabic
  routes use a wrapping div).
- **H2** — Membership `features` arrays are Arabic-only.
- **H3** — Hardcoded Arabic strings in `PlansView` English mode.
- **H4** — Missing i18n keys (`prog.uploadPhoto`, `prog.photos`,
  `prog.noPhotos`).
- **H5** — Some blog posts may still have `author = 'Ahmed Zake'`.
- **H6** — `/ar/exercises` and `/ar/foods` return 404.
- **M2** — Coach routes don't redirect non-coach users (they fall
  through to the dashboard).
- **M4** — Profile page shows "4 Tools" instead of "6 Tools".
- **M5** — SiteHeader has a redundant "Pricing" entry alongside
  "Memberships".
- **B18 (new)** — `package.json` build script references
  `scripts/compress-images.js`, but the `scripts/` directory does not
  exist. Local `bun run build` fails; production Vercel build is
  unaffected (uses `vercel.json` buildCommand).

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
- [`PROGRESS.md`](./PROGRESS.md) — Current status snapshot (1-page, refreshed on each push)
- [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) — Developer onboarding + architecture details
- [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) — Verification evidence + QA protocol
- [`.env.example`](./.env.example) — Environment variables reference
- [`worklog.md`](./worklog.md) — Per-agent change log
