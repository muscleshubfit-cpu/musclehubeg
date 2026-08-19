# MuscleHub — Comprehensive Sports Platform

> **Live:** [musclehubeg.vercel.app](https://musclehubeg.vercel.app)
> **Repository:** [github.com/muscleshubfit-cpu/musclehubeg](https://github.com/muscleshubfit-cpu/musclehubeg)
> **Stack:** Next.js 16 · React 19 · Supabase · OpenRouter AI · Tailwind CSS 4
> **Last updated:** 2026-08-19 (Phase 6: AI speed + chunked article generation)

A bilingual (Arabic/English) fitness & nutrition platform with 868+ exercises, 8,830+ foods, 6 free tools, an AI coach (EVO), a blog CMS with automated AI generation, a coach dashboard with client management, a referral system, and membership tiers.

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
2. Run each migration file in order (0001 → 0011) from the `supabase/migrations/` folder
3. Or if you have the Supabase CLI: `supabase db push`

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

The app is configured for Vercel with:
- **Region:** Singapore (sin1)
- **Build:** `node scripts/compress-images.js && next build`
- **Security headers:** HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Caching:** 1-year immutable for `/_next/static` and `/images/*`

---

## 🏗️ Project Structure

```
musclehubeg/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/              # Authenticated routes (dashboard, coach, plans, etc.)
│   │   ├── admin/              # Coach-only admin pages (blog, leads, saved-results)
│   │   ├── api/                # API routes (22 endpoints)
│   │   ├── ar/                 # Arabic mirror routes
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
│   │   ├── ui/                 # shadcn/ui primitives (28 components)
│   │   ├── views/              # Page-level views (17 views)
│   │   ├── AdSenseAd.tsx       # Google AdSense (tier-gated)
│   │   ├── SiteHeader.tsx      # Navigation + auth + notifications
│   │   ├── EvoFloatingWidget.tsx # EVO AI chat floating widget
│   │   ├── SaveResultButton.tsx # Tool result save + PDF export
│   │   └── ...
│   ├── hooks/                   # React hooks (auth, nav, tier, mobile, toast)
│   ├── lib/                    # Business logic + data layer
│   │   ├── memberships.ts      # Tier definitions + pricing + limits
│   │   ├── data.ts             # Supabase data layer (all CRUD operations)
│   │   ├── auth-server.ts      # Server-side auth helpers
│   │   ├── ai-provider.ts      # OpenRouter AI provider (6 models, fallback chain)
│   │   ├── exercises.ts        # 868 exercises dataset
│   │   ├── foods.ts            # 8,830 foods dataset
│   │   ├── blog-generate.ts   # AI blog article generation
│   │   ├── evo-chat-context.tsx # EVO chat state management
│   │   ├── plan-generator.ts   # AI nutrition/workout plan generation
│   │   ├── referral.ts         # Referral + commission system
│   │   ├── result-png-export.ts # Canvas → PDF/PNG export
│   │   ├── seo.ts              # JSON-LD schema generators
│   │   └── ...
│   ├── middleware.ts            # Supabase session refresh + Content-Language header
│   └── ...
├── supabase/
│   └── migrations/             # 11 SQL migration files (0001–0011)
├── public/                     # Static assets (icons, QR codes, images, manifest, sw.js)
├── .github/workflows/          # GitHub Actions (automated blog generation)
├── PROGRESS.md                 # Shared dashboard (feature freeze + bugs tracker)
├── DEVELOPER_GUIDE.md          # Developer onboarding guide
├── next.config.ts              # Next.js config (images, headers, experiments)
├── vercel.json                 # Vercel deployment config
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
- **Coaching ($39.99/mo):** Human coach + everything in Pro
- Multiple subscriptions allowed (e.g., Coaching + Premium simultaneously)

### For Coaches
- **Client Dashboard:** 10 filter tabs (active, expiring, no questionnaire, by tier, etc.)
- **Client Management:** 6 tabs per client (overview, subscription, plans, AI plans, questionnaires, progress)
- **Payment Review:** InstaPay/Vodafone Cash receipt review + approve/reject
- **Blog CMS:** AI article generation (manual or automated via cron)
- **Notifications:** Real-time admin notification bell

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui (28 Radix components) |
| **Backend** | Supabase (Postgres, Auth, Storage, RLS) |
| **AI** | OpenRouter free models (NVIDIA Nemotron → Google Gemma → OpenAI GPT-OSS) |
| **Charts** | Recharts 3 (lazy-loaded) |
| **Forms** | react-hook-form + zod |
| **Analytics** | Vercel Analytics + Speed Insights + GA4 |
| **Ads** | Google AdSense (tier-gated, auto-suppressed on auth routes) |
| **PWA** | manifest.json + service worker |
| **Deployment** | Vercel (Singapore region) |

---

## 📊 Database

25 tables with Row Level Security (RLS) policies:

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
| `meal_plans` | User's saved meal plans (Phase 5 — created) |
| `tool_leads` | Lead capture from free tools |
| `nutrition_questionnaires` | Client nutrition intake forms |
| `fitness_questionnaires` | Client fitness intake forms |
| `progress_entries` | Body measurements over time |
| `progress_photos` | Progress photo references (Phase 5 — created) |
| `plans` | Meal/workout plans (draft/approved/archived) |
| `plan_swaps` | Daily swap usage tracking (Phase 5 — created) |
| `support_tickets` | Client→coach support tickets (priority + status) |
| `ticket_messages` | Chat messages within tickets |
| `chat_messages` | Legacy AI chat history |
| `referrals` | Referrer→referred tracking |
| `referral_earnings` | Commission amounts |
| `referral_payouts` | Payout requests |
| `coach_presence` | Coach online status (Phase 5 — created) |

---

## 🌍 Languages

- **English** (primary) — `/`
- **Arabic** (secondary, RTL) — `/ar/*`
- Language toggle in header
- `Content-Language` header set via middleware
- hreflang alternates on blog articles

---

## ⚡ Performance (Phase 6 — 2026-08-19)

| Feature | Before | After | Improvement |
|---|---|---|---|
| **EVO AI Chat** | 18-25s + thinking artifacts | 1.4-3.9s + clean responses | **5-7x faster** ✅ |
| **Plan generation** | 90-180s timeout | 30-60s timeout | **3x faster** ✅ |
| **Swap (meal + exercise)** | 60-90s | 10-30s | **3-4x faster** ✅ |
| **Article generation** | Timeout + short articles | ~100s + 600-900 EN words + 500-800 AR words | **No more timeouts** ✅ |
| **Cron blog step2** | 60s timeout (always failed) | 300s timeout (succeeds) | **Fixed** ✅ |

### AI Provider Strategy

Two functions for different use cases:

| Function | Use case | Behavior |
|---|---|---|
| `callFreeOpenRouter()` | Plans, Articles, Research | Sequential — tries largest model first, falls back if fails |
| `callFreeOpenRouterRace()` | EVO chat, Swap | Parallel — races 3 models via `Promise.any()`, returns first success |

See [DEVELOPER_GUIDE.md § 14](./DEVELOPER_GUIDE.md) for implementation details.

---

## 🗄️ Database Fixes (Phase 5 — 2026-08-19)

The following tables/columns were missing in production and have been created via Supabase SQL Editor:

| Table/Column | Issue | Fix |
|---|---|---|
| `meal_plans` | Migration 0008 was not applied | `CREATE TABLE` + RLS policies |
| `support_tickets.priority` | Column missing | `ADD COLUMN priority text` + CHECK constraint |
| `support_tickets.status` | Column missing | `ADD COLUMN status text` + CHECK constraint |
| `subscription_requests.price_usd` | Was INTEGER (rejected 14.99) | `ALTER COLUMN TYPE numeric(10,2)` |
| `plan_swaps` | Not in any migration | `CREATE TABLE` + RLS policies |
| `progress_photos` | Not in any migration | `CREATE TABLE` + RLS policies |
| `coach_presence` | Not in any migration | `CREATE TABLE` + RLS policies |

SQL fix scripts are preserved at:
- `/home/z/my-project/download/MuscleHubEG_Database_Fix_v4.sql`
- `/home/z/my-project/download/MuscleHubEG_Fix_support_tickets_status.sql`

---

## 📝 License

This project is proprietary. All rights reserved.

---

## 📋 Additional Documentation

- [PROGRESS.md](./PROGRESS.md) — Feature freeze list + Phase 5/6 fixes tracker
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — Developer onboarding + Phase 5/6 architecture details
- [QA_CHECKLIST.md](./QA_CHECKLIST.md) — 130 test points (Phase 1 + 5 + 6) — all passing
- [`.env.example`](./.env.example) — Environment variables reference
