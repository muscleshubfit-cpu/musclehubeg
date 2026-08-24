# Developer Guide — MuscleHub

> **آخر تحديث:** 2026-08-25 (documentation consolidation per `docs/_AUDIT.md`)
> **الجمهور المستهدف:** مطورين جدد ينضمون للمشروع، أو المطور الحالي كمرجع
> **Note (Phase 7):** Several stale claims in this file were reconciled
> against the actual source code. Look for `> **Phase 7 correction:**`
> notes inline. See also `PROGRESS.md` § "Reconciled Status" for the
> reconciled repository statistics.

---

## 📋 المحتويات

1. [الإعداد المحلي](#1-الإعداد-المحلي-local-setup)
2. [هيكلية الملفات التفصيلية](#2-هيكلية-الملفات-التفصيلية)
3. [طبقات البناء المعماري](#3-طبقات-البناء-المعماري-architecture-layers)
4. [قاعدة البيانات + RLS](#4-قاعدة-البيانات--rls)
5. [نظام المصادقة + العضويات](#5-نظام-المصادقة--العضويات)
6. [EVO AI Chat](#6-evo-ai-chat)
7. [نظام المدونة + AI Generation](#7-نظام-المدونة--ai-generation)
8. [API Routes Reference](#8-api-routes-reference)
9. [الاعتماديات الكاملة](#9-الاعتماديات-الكاملة-dependencies)
10. [الـ Deploy على Vercel](#10-الـ-deploy-على-vercel)
11. [الاختبار + الصيانة](#11-الاختبار--الصيانة)
12. [الاصطلاحات البرمجية](#12-الاصطلاحات-البرمجية-conventions)

---

## 1. الإعداد المحلي (Local Setup)

### المتطلبات

```bash
node --version   # 18+ أو استخدم Bun
bun --version    # 1.3+
git --version    # أي إصدار حديث
```

### التثبيت

```bash
git clone https://github.com/muscleshubfit-cpu/musclehubeg.git
cd musclehubeg
bun install
```

### متغيرات البيئة

انسخ `.env.example` إلى `.env.local`:

```bash
cp .env.example .env.local
```

الحد الأدنى المطلوب للتشغيل:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

بدون هذه المتغيرات، يعمل الموقع في **demo mode** (localStorage):
- Coach تجريبي: `coach@coach.app` / `coach123`
- Client تجريبي: `client@demo.app` / `client123`

### تشغيل البيئة التطويرية

```bash
bun dev          # يشغل Next.js على المنفذ 3000
# أو: npm run dev
```

افتح: http://localhost:3000

### Build للإنتاج

```bash
bun run build    # يضغط الصور + يبني Next.js
bun start        # يشغل نسخة الإنتاج محلياً
```

### Lint

```bash
bun run lint     # ESLint
```

> **Phase 7 correction (2026-08-19):** The previous claim that
> `typescript.ignoreBuildErrors: true` is set in `next.config.ts` is
> **incorrect**. Verified by reading `next.config.ts` — the property
> is NOT present. TypeScript strict checks are enabled, all
> `@ts-nocheck` pragmas have been removed, and `tsc --noEmit` is
> clean (0 errors).
>
> The previous claim that ESLint is "disabled" is also incorrect.
> Next.js 16 dropped the `eslint` config block from `next.config.ts`
> entirely (the inline comment in `next.config.ts` documents this).
> ESLint runs via the `bun run lint` script using the flat config
> in `eslint.config.mjs` (next core-web-vitals + typescript presets).

---

## 2. هيكلية الملفات التفصيلية

```
src/
├── app/                         # Next.js App Router
│   ├── (app)/                   # Route group — محمي بـ auth gate
│   │   ├── layout.tsx           # Auth gate: يتحقق من تسجيل الدخول
│   │   ├── dashboard/           # لوحة تحكم العضو
│   │   ├── coach/               # صفحات الكوتش (4 صفحات)
│   │   ├── plans/               # خطط العضو
│   │   ├── progress/            # تتبع التقدم
│   │   ├── questionnaires/      # الاستبيانات
│   │   ├── referral/           # نظام الإحالات
│   │   ├── support/            # الدعم الفني
│   │   └── chat/               # صفحة EVO الكاملة
│   ├── admin/                   # Route group — محمي بـ coach role
│   │   ├── layout.tsx           # Coach gate: يتحقق من role === "coach"
│   │   ├── blog/               # CMS المدونة
│   │   ├── leads/              # Leads من الأدوات
│   │   ├── saved-results/      # نتائج محفوظة لكل المستخدمين
│   │   └── referrals/           # إدارة الإحالات
│   ├── api/                     # API Routes (36 endpoints — see §8)
│   │   ├── ai/                  # AI endpoints (chat, plan, swap, generate)
│   │   ├── admin/               # Admin endpoints (blog cleanup, leads, saved-results)
│   │   ├── tools/               # Tool endpoints (save-result, save-meal-plan, lead)
│   │   ├── cron/                # Cron job endpoints (blog generation pipeline)
│   │   ├── paypal/              # PayPal payment endpoints (create-order, capture-order, webhook)
│   │   ├── food-search/         # البحث عن الأكلات
│   │   ├── og-image/[slug]/     # توليد صور OG ديناميكية
│   │   └── notifications/admin/ # إنشاء إشعارات الكوتش
│   ├── ar/                      # النسخة العربية (mirror)
│   ├── blog/                    # المدونة (EN)
│   ├── checkout/                # صفحة الدفع
│   ├── coaching/                # صفحة الكوتشينج التسويقية
│   ├── evo/                     # صفحة EVO التسويقية
│   ├── exercises/               # مكتبة التمارين
│   ├── foods/                   # قاعدة الأكلات
│   ├── meal-planner/            # مخطط الوجبات
│   ├── memberships/             # صفحة العضويات
│   ├── tools/                   # 5 حاسبات
│   ├── profile/                 # الملف الشخصي
│   ├── layout.tsx               # Root layout (providers + analytics + PWA)
│   └── metadata.ts              # SEO metadata شاملة
├── components/
│   ├── ui/                      # 51 shadcn/ui component
│   ├── views/                   # 25 page-level view
│   ├── blog/                    # مكونات المدونة
│   ├── SiteHeader.tsx           # الهيدر + التنقل + الإشعارات
│   ├── EvoFloatingWidget.tsx    # EVO floating chat
│   ├── AdSenseAd.tsx            # إعلانات AdSense (tier-gated)
│   ├── SaveResultButton.tsx    # حفظ + تصدير النتائج
│   ├── NotificationBell.tsx     # إشعارات المستخدم
│   ├── AdminNotificationBell.tsx # إشعارات الكوتش
│   └── ...
├── hooks/
│   ├── use-auth.tsx             # Auth context + state
│   ├── use-nav.tsx              # Navigation adapter (View → URL)
│   ├── use-membership-tier.ts   # Client-side tier resolution
│   ├── use-mobile.ts            # Mobile detection
│   └── use-toast.ts              # Toast notifications
├── lib/
│   ├── memberships.ts           # تعريف العضويات + الأسعار + الحدود
│   ├── data.ts                  # طبقة البيانات (كل CRUD operations)
│   ├── auth-server.ts           # مصادقة الخادم (requireUser, requireCoach)
│   ├── ai-provider.ts           # موفر AI موحد (OpenRouter + fallbacks)
│   ├── exercises.ts             # 868 تمرين
│   ├── foods.ts                 # 8,830 أكلة
│   ├── blog-generate.ts         # توليد مقالات المدونة بـ AI
│   ├── blog-topics.ts           # اختيار مواضيع المدونة
│   ├── blog-admin.ts            # أدوات تحرير المدونة
│   ├── blog-server.ts           # جلب بيانات المدونة (server-side)
│   ├── blog.ts                  # جلب بيانات المدونة (client-side)
│   ├── blog-images.ts           # جلب صور المدونة
│   ├── evo-chat-context.tsx     # حالة محادثة EVO
│   ├── evo-search.ts            # بحث المنصة لـ EVO
│   ├── plan-generator.ts        # توليد خطط تغذية/تمرين بـ AI
│   ├── referral.ts              # نظام الإحالات + العمولات
│   ├── referral-cookie.ts       # تتبع كوكيز الإحالة
│   ├── result-png-export.ts     # تصدير PDF/PNG (Canvas-based)
│   ├── seo.ts                   # JSON-LD schema generators
│   ├── plans.ts                 # أنظمة الاشتراكات القديمة (legacy)
│   ├── workout-programs.ts      # برامج التدريب الجاهزة
│   ├── exercise-images.ts       # حل روابط صور التمارين
│   ├── supabase/
│   │   ├── client.ts            # Supabase browser client
│   │   ├── admin.ts             # Supabase admin client (service_role)
│   │   └── types.ts             # TypeScript types (قديم جزئياً)
│   └── ...
├── middleware.ts                # Session refresh + Content-Language header
└── ...
```

---

## 3. طبقات البناء المعماري (Architecture Layers)

```
┌──────────────────────────────────────────────────┐
│                    Pages                        │
│  (App Router — server + client components)      │
├──────────────────────────────────────────────────┤
│                   Views                          │
│  (src/components/views/ — page-level UI)         │
├──────────────────────────────────────────────────┤
│               Components                         │
│  (src/components/ — reusable UI parts)           │
├──────────────────────────────────────────────────┤
│                  Hooks                           │
│  (useAuth, useNav, useMembershipTier)             │
├──────────────────────────────────────────────────┤
│             Data Layer                           │
│  (src/lib/data.ts — Supabase CRUD + localStorage)│
├──────────────────────────────────────────────────┤
│             Supabase                             │
│  (Postgres + Auth + Storage + RLS)               │
└──────────────────────────────────────────────────┘
```

### أنماط التصميم الرئيسية:

1. **Dual-mode data layer**: `data.ts` يعمل مع Supabase أو localStorage (demo mode)
2. **Server-side auth**: `auth-server.ts` يقرأ session من cookies + يحلل الـ tier
3. **Client-side tier resolution**: `useMembershipTier` hook يجلب الـ tier من `subscriptions` table
4. **Navigation adapter**: `useNav` يحوّل `navigate("view")` إلى URL حقيقي
5. **AI fallback chain**: `callFreeOpenRouter` يجرب 6 نماذج free بالترتيب
6. **PDF export without libraries**: Canvas 2D → JPEG → minimal PDF 1.4

---

## 4. قاعدة البيانات + RLS

### الجداول (22 جدول مُعرّفة في migrations + 3 مُستخدمة في الكود بدون migration)

> **Phase 7 correction (2026-08-19):** The previous count of "20 tables"
> was inaccurate. The actual state (re-verified 2026-08-25):
> - **22 tables** are formally defined via `CREATE TABLE` in
>   migrations `0001` → `0016`.
> - **3 additional tables** (`plan_swaps`, `progress_photos`,
>   `coach_presence`) are referenced in `src/lib/data.ts` and were
>   created ad-hoc on the production database during Phase 5 via
>   Supabase SQL Editor. They are NOT in any migration file — this
>   is technical debt that should be back-filled as migrations.
>
> The 22 migration-defined tables are listed below. The 3 ad-hoc
> tables follow in a separate sub-section.

| الجدول | RLS Policy |
|---|---|
| `profiles` | Owner read/update; coach read all |
| `subscriptions` | Self insert + coach insert/update/select; multi-tier per client |
| `subscription_requests` | User inserts own; coach reviews all |
| `notifications` | Self read/insert/update; coach read all |
| `admin_notifications` | Coach-only (inserted via service_role bypass endpoint) |
| `blog_posts` | Public read published; coach read/write all |
| `saved_results` | Owner-only |
| `meal_plans` | Owner-only |
| `tool_leads` | Public insert; coach read/update |
| `nutrition_questionnaires` | Owner + coach |
| `fitness_questionnaires` | Owner + coach |
| `progress_entries` | Owner + coach |
| `progress_photos` | Owner + coach |
| `plans` | Owner sees approved only; coach sees all |
| `plan_swaps` | Owner + coach |
| `support_tickets` | Owner + coach |
| `ticket_messages` | Owner + coach |
| `referrals` | Owner read own; coach read all |
| `referral_earnings` | Owner read own; coach read all |
| `referral_payouts` | Owner read own; coach read/approve all |
| `blog_generation_queue` | Coach-only |
| `coach_presence` | Public read; coach update own |

### الدوال المُعرّفة (Database Functions)

- `is_coach()` — SECURITY DEFINER function تتحقق من `role = 'coach'` (يستخدم في RLS policies)

### Tables used in code but NOT in migrations (Phase 5 ad-hoc)

> These were created on the production database via Supabase SQL
> Editor during Phase 5. SQL scripts are referenced in `PROGRESS.md`
> Phase 5 section.

| Table | Purpose |
|---|---|
| `plan_swaps` | Daily swap usage tracking (used by PlansView) |
| `progress_photos` | Progress photo references (used by ProgressView) |
| `coach_presence` | Coach online status |

> **Action item:** Back-fill these as migration files so a fresh
> Supabase project can be set up from migrations alone.

### Storage Buckets

- `questionnaire-photos` — صور الاستبيانات
- `progress-photos` — صور التقدم
- `receipts` — إيصالات الدفع

---

## 5. نظام المصادقة + العضويات

### تدفق المصادقة

```
User → /auth (email/password أو Google OAuth)
  → Supabase Auth (PKCE flow)
  → Cookie set via middleware
  → Profile fetched from `profiles` table
  → Role checked (client vs coach)
  → Redirect to /dashboard (client) or /coach (coach)
```

### حل الـ Tier

```
Client-side:  useMembershipTier(profile) → queries subscriptions table → picks highest priority membership
Server-side:  requireUser(request) → queries subscriptions table → picks highest priority membership

Membership priority (verified from src/lib/auth-server.ts):
  pro (3) > premium (2) > free (0)

Coaching is treated SEPARATELY — it is NOT a higher membership tier.
It grants EVO access equivalent to Premium, but does not upgrade
the membership_tier field.
```

> **Phase 7 correction (2026-08-19):** The previous claim of
> `coaching (4) > pro (3) > premium (2) > elite (1) > free (0)` is
> **incorrect**. There is NO `elite` tier in the actual implementation
> (verified by reading `src/lib/memberships.ts` and
> `src/lib/auth-server.ts`). The `MembershipTier` type is
> `"free" | "premium" | "pro" | "coaching"` — four tiers only.

### العضويات (4 مستويات)

| Tier | شهري | سنوي | EVO | خطط/شهر | حفظ نتائج | PDF | إعلانات |
|---|---|---|---|---|---|---|---|
| Free | $0 | $0 | 10/يوم | 0 | 3 | ❌ | ✅ |
| Premium | $14.99 | $119 | غير محدود | 3 | 50 | ✅ | ✅ |
| Pro | $29.99 | $239 | غير محدود | 6 | 200 | ✅ | ❌ |
| Coaching | $39.99 | $359 | غير محدود | غير محدود | غير محدود | ✅ | ❌ |

---

## 6. EVO AI Chat

### البنية

```
EvoFloatingWidget (UI)
  → EvoChatProvider (state — localStorage)
  → /api/ai/chat (server route)
    → Anonymous: 10 msgs/day (localStorage counter)
    → Subscriber: unlimited (gated by regex on message content)
    → Platform search (exercises, foods, programs, blog)
    → callFreeOpenRouter (6 free models fallback chain)
    → Local fallback (ai-local.ts) when OpenRouter unconfigured
```

### النماذج المستخدمة (بالتسلسل)

1. `nvidia/nemotron-3-ultra-550b-a55b:free` (الأضخم)
2. `nvidia/nemotron-3.5-lightning:free`
3. `nvidia/nemotron-3-super-120b-a12b:free`
4. `google/gemma-4-31b-it:free`
5. `google/gemma-4-26b-a4b-it:free`
6. `openai/gpt-oss-20b:free`

### Subscriber Gating

رسائل تحتوي على كلمات معينة (خطة، تبديل، regenerate) تتطلب Premium+:
- regex patterns بالعربية + الإنجليزية
- لو المستخدم Free → يرجّع رسالة مع رابط `/memberships`

---

## 7. نظام المدونة + AI Generation

### التدفق اليدوي

```
Coach → /admin/blog/new → "Generate with AI" button
  → /api/ai/generate-article (coach-only)
  → generateArticleBundle() in blog-generate.ts
  → callFreeOpenRouter() with ARTICLE_SYSTEM_PROMPT
  → Returns: SEO data + EN article + AR article + FAQ + image prompts + social posts
  → Coach reviews → saves draft → publishes
```

### التدفق الآلي (Cron)

```
GitHub Actions (every 2 hours)
  → Step 1: /api/cron/blog/step1-pick (pick topic)
  → Step 2: /api/cron/blog/step2-generate (generate article)
  → Step 3: /api/cron/blog/step3-publish (publish)
  → Each step uses CRON_SECRET for auth
  → State tracked in blog_generation_queue table
```

---

## 8. API Routes Reference

> **Phase 7 correction (2026-08-19, re-verified 2026-08-25):** The
> previous doc listed 22 → 28 API routes. The actual count (verified
> by `find src/app/api -name "route.ts*"`) is **36 routes**. The table
> below has been updated to include all 36.

| Route | Method | Auth | الوظيفة |
|---|---|---|---|
| `/api/ai/blog-tool` | POST | Coach | Blog editor AI tools (SEO title, FAQ, CTA, social posts) — routes to `callGemini` |
| `/api/ai/chat` | POST | Optional | EVO AI chat (anonymous allowed) |
| `/api/ai/generate-article` | POST | Coach | Manual blog article generation |
| `/api/ai/generate-image` | POST | Coach | Generate image for blog article |
| `/api/ai/plan` | POST | Coach | Generate nutrition/workout plan |
| `/api/ai/pick-topic` | POST | Coach | Pick blog topic |
| `/api/ai/regenerate-meal` | POST | User | Regenerate meal in plan |
| `/api/ai/research-topic` | POST | Coach | Research blog topic |
| `/api/ai/swap` | POST | User | Swap meal/exercise in plan |
| `/api/admin/blog/cleanup` | POST | Coach/Cron | Fix garbled text in articles |
| `/api/admin/leads` | GET/PATCH | Coach | View + update tool leads |
| `/api/admin/saved-results` | GET | Coach | View all saved results |
| `/api/blog/fetch-images` | POST | Coach | Fetch images for blog article |
| `/api/cron/blog/step1-pick` | GET | Cron | Pick blog topic (current pipeline) |
| `/api/cron/blog/step2a-research` | GET | Cron | External research (Gemini Flash + Google Search grounding) |
| `/api/cron/blog/step2b-en-article` | POST | Cron | Generate EN article (separated pipeline) |
| `/api/cron/blog/step2c-ar-article` | POST | Cron | Generate AR article (separated pipeline) |
| `/api/cron/blog/step2d-links` | POST | Cron | Generate links + image prompts + social posts |
| `/api/cron/blog/step2-generate` | GET | Cron | Legacy single-step blog generation (calls `generateArticleBundle` internally) |
| `/api/cron/blog/step3-publish` | GET | Cron | Publish article (EN + AR rows) |
| `/api/cron/generate-blog-post` | GET | Cron | Legacy single-step blog generation (kept for backward compat) |
| `/api/cron/progress-reminder` | GET | Cron | Weekly progress reminder (Vercel Cron — Sun 07:00 UTC) |
| `/api/exercise-image` | GET | Public | Proxy exercise images |
| `/api/food-search` | GET | Public | Search foods (local + Open Food Facts) |
| `/api/notifications/admin` | POST | User | Create admin notification (service_role bypass) |
| `/api/notifications/broadcast` | POST | Coach | Broadcast notification to multiple users |
| `/api/og-image/[slug]` | GET | Public | Dynamic OG image (edge runtime) |
| `/api/paypal/capture-order` | POST | User | Capture PayPal Order server-side (authoritative payment confirmation) — see `SECURITY.md` §12 |
| `/api/paypal/create-order` | POST | User | Create PayPal Order server-side (price resolved server-side) — see `SECURITY.md` §12 |
| `/api/paypal/webhook` | POST | PayPal (signature-verified) | PayPal webhook events (audit trail only) — see `SECURITY.md` §12 |
| `/api/plans/normalize` | POST | Coach | Normalize coach-pasted plan text → structured JSON |
| `/api/tools/lead` | POST | Public | Capture lead from tool |
| `/api/tools/save-meal-plan` | POST | User | Save meal plan |
| `/api/tools/save-result` | POST | User | Save tool result |
| `/api/tools/saved-meal-plans` | GET/DELETE | User | List/delete meal plans |
| `/api/tools/saved-results` | GET/DELETE | User | List/delete saved results |

**Total: 36 routes** (verified via `find src/app/api -name "route.ts*" | wc -l`).

---

## 9. الاعتماديات الكاملة (Dependencies)

### Production Dependencies

| الحزمة | الإصدار | الوظيفة |
|---|---|---|
| `next` | ^16.1.1 | Framework |
| `react` / `react-dom` | ^19.0.0 | UI |
| `@supabase/ssr` | ^0.12.4 | Supabase auth (cookie-based) |
| `@supabase/supabase-js` | ^2.111.0 | Supabase client + admin |
| `tailwindcss` | ^4 | Styling |
| `@radix-ui/*` | 28 packages | Headless UI primitives |
| `framer-motion` | ^13.1.0 | Animations (مُعطّلة حالياً) |
| `recharts` | ^3.10.1 | Charts (lazy-loaded) |
| `lucide-react` | ^0.525.0 | Icons |
| `react-hook-form` | ^7.60.0 | Forms |
| `zod` | ^4.0.2 | Schema validation |
| `react-markdown` | ^10.1.0 | Blog markdown rendering |
| `@vercel/og` | ^1.0.1 | Dynamic OG images |
| `@vercel/analytics` | ^2.0.1 | Pageview analytics |
| `@vercel/speed-insights` | ^2.0.0 | Core Web Vitals |
| `sonner` | ^2.0.6 | Toast notifications |
| `zustand` | ^5.0.6 | State management |
| `@tanstack/react-query` | ^5.82.0 | Async data fetching |
| `@tanstack/react-table` | ^8.21.3 | Data tables |
| `date-fns` | ^4.1.0 | Date utilities |
| `sharp` | ^0.35.3 | Image compression |
| `embla-carousel-react` | ^8.6.0 | Testimonials carousel |
| `vaul` | ^1.1.2 | Drawer component |
| `cmdk` | ^1.1.1 | Command palette |
| `class-variance-authority` | ^0.7.1 | Component variants |
| `clsx` | ^2.1.1 | Class merging |
| `@fontsource/inter` | ^5.3.0 | Inter font |
| `@fontsource/cairo` | ^5.3.0 | Cairo font (Arabic) |
| `next-themes` | ^0.4.6 | Theme switching |
| `z-ai-web-dev-sdk` | ^0.0.18 | Z.AI SDK |

### Dev Dependencies

| الحزمة | الإصدار | الوظيفة |
|---|---|---|
| `typescript` | ^5 | Type checking |
| `eslint` / `eslint-config-next` | ^9 / ^16 | Linting |
| `@tailwindcss/postcss` | ^4 | Tailwind PostCSS plugin |
| `@types/react` / `@types/react-dom` | ^19 | React types |
| `bun-types` | ^1.3.4 | Bun runtime types |
| `tw-animate-css` | ^1.3.5 | Tailwind animation utilities |

---

## 10. الـ Deploy على Vercel

### الخطوات

1. ادفع الكود إلى GitHub
2. اذهب إلى [vercel.com](https://vercel.com) → New Project → اختر الريبو
3. أضف متغيرات البيئة (Settings → Environment Variables)
4. اضغط Deploy

### إعدادات Vercel (مدمجة في `vercel.json`)

```json
{
  "framework": "nextjs",
  "regions": ["sin1"],
  "installCommand": "bun install",
  "buildCommand": "next build",
  "headers": [
    { "source": "/(.*)", "headers": [/* security headers */] },
    { "source": "/images/(.*)", "headers": [/* 1yr cache */] },
    { "source": "/_next/static/(.*)", "headers": [/* 1yr cache */] }
  ]
}
```

### GitHub Actions (التدفق الآلي للمدونة)

ملف `.github/workflows/generate-blog-post.yml` يشغّل 3-step pipeline كل ساعتين:
- يحتاج `CRON_SECRET` في GitHub Secrets
- يحتاج `SITE_URL` في GitHub Variables

---

## 11. الاختبار + الصيانة

### الحالة الحالية (Phase 7 correction — 2026-08-19, re-verified 2026-08-25)

| النوع | الحالة |
|---|---|
| Unit tests | ❌ غير موجود |
| Integration tests | ❌ غير موجود |
| E2E tests | ❌ غير موجود |
| Type checking | ✅ مُفعّل (0 errors — `tsc --noEmit` clean, `@ts-nocheck` removed, `ignoreBuildErrors` NOT in `next.config.ts`) |
| ESLint | ✅ مُفعّل عبر `bun run lint` (Next.js 16 dropped eslint config from `next.config.ts`; runs via `eslint.config.mjs` flat config) |
| Smoke tests (manual) | ⚠️ Phase 1 + Phase 5 — 95 + 30 نقطة تم فحصها يدوياً عبر curl + agent-browser. هذه **smoke tests** وليست functional verification |
| Build (local) | ✅ يعمل — `bun run build` exits 0 (B18 fixed in Phase 7 Master Repair Batch 001; the obsolete `node scripts/compress-images.js &&` prefix was removed from the build script) |
| Build (Vercel production) | ✅ يعمل (يستخدم `vercel.json` buildCommand `next build`) |

### أوامر مفيدة للصيانة

```bash
# فحص TypeScript (دون إيقاف الـ build)
npx tsc --noEmit

# تشغيل ESLint
bun run lint

# Build للإنتاج (محلياً)
bun run build
```

---

## 12. الاصطلاحات البرمجية (Conventions)

### تسمية الملفات

- **Pages:** `page.tsx` (Next.js App Router convention)
- **Views:** `PascalCase.tsx` (مثل `CoachView.tsx`, `LandingView.tsx`)
- **Components:** `PascalCase.tsx` (مثل `SiteHeader.tsx`, `SaveResultButton.tsx`)
- **Hooks:** `use-kebab-case.tsx` (مثل `use-auth.tsx`, `use-membership-tier.ts`)
- **Libs:** `kebab-case.ts` (مثل `ai-provider.ts`, `blog-generate.ts`)

### الـ Colors المستخدمة (Tailwind CSS 4)

```css
/* Primary palette — Apple-inspired */
--primary: #0071e3;     /* أزرق Apple */
--background: #ffffff;
--foreground: #1d1d1f;
--card: #f5f5f7;
--muted: #6e6e73;
--border: #d2d2d7;
--success: #34c759;     /* أخضر */
--warning: #ff9500;     /* برتقالي */
--danger: #ff3b30;      /* أحمر */
--purple: #8b5cf6;      /* بنفسجي (Coaching) */
```

### الـ AI Model Selection

مبدأ موحد في كل الموقع: `callFreeOpenRouter` يجرب النماذج بالترتيب من الأكبر للأصغر:
1. nvidia/nemotron-3-ultra-550b (الأضخم)
2. → fallback إلى 5 نماذج أصغر

> **Phase 7 note (2026-08-19):** `src/lib/ai-provider.ts` supports
> SIX providers, not just OpenRouter: openrouter, openai, gemini,
> anthropic, groq, deepseek. Switching providers is a config change
> (env var or in-app AI Settings page) — no code changes required.
> The default is `openrouter`. Provider-specific quirks (Anthropic
> and Gemini don't support `response_format`, some reasoning models
> put text in `reasoning_details` instead of `content`) are handled
> in `callAI()`.

### الـ AI Provider Pattern (Phase 6 — 2026-08-19)

يوجد **دالتان** لاستدعاء OpenRouter، كل واحدة لها حالة استخدام:

| الدالة | متى تستخدمها | السلوك |
|---|---|---|
| `callFreeOpenRouter(prompt, options)` | **Plans, Articles, Research** — محتاج جودة عالية وانتظار مقبول | Sequential — يجرب النموذج الأكبر الأول، ثم ينتقل للتالي عند الفشل |
| `callFreeOpenRouterRace(prompt, options, raceCount=3)` | **EVO chat, Swap** — محتاج سرعة فائقة | Parallel — يستدعي 3 نماذج بالتوازي ويرجع أول رد ناجح |

```typescript
import { callFreeOpenRouter, callFreeOpenRouterRace } from "@/lib/ai-provider";

// للسرعة (chat, swap):
const { text, model } = await callFreeOpenRouterRace(prompt, {
  temperature: 0.6,
  maxTokens: 500,
  timeoutMs: 15_000,  // أقل من 60s عشان Vercel Hobby
}, 3);  // race count

// للجودة (plans, articles):
const { text, model } = await callFreeOpenRouter(prompt, {
  temperature: 0.7,
  maxTokens: 4000,
  jsonMode: true,
  timeoutMs: 60_000,  // حد Vercel Hobby
});
```

### الـ Auth Pattern

```typescript
// Server-side (API routes):
const auth = await requireUser(request);  // أو requireCoach
if (auth instanceof Response) return auth; // 401/403

// Client-side (components):
const { profile } = useAuth();
const { tier } = useMembershipTier(profile);
```

### الـ Navigation Pattern

```typescript
const { navigate } = useNav();
navigate("memberships");                    // → /memberships
navigate("checkout", { tier: "premium", months: 12 }); // → /checkout?tier=premium&months=12
navigate("coach-client", { clientId: "xxx" }); // → /coach/xxx
```

---

## 13. Phase 5: إصلاحات قاعدة البيانات (2026-08-19)

### جداول تم إنشاؤها/إصلاحها على Supabase الإنتاجي

| الجدول | الحالة قبل | الإصلاح |
|---|---|---|
| `meal_plans` | ❌ غير موجود (migration 0008 لم يُطبّق) | `CREATE TABLE meal_plans` + RLS policies |
| `support_tickets.priority` | ❌ العمود غير موجود | `ADD COLUMN priority text` + CHECK constraint |
| `support_tickets.status` | ❌ العمود غير موجود | `ADD COLUMN status text` + CHECK constraint |
| `subscription_requests.price_usd` | ❌ معرّف كـ INTEGER (يرفض 14.99) | `ALTER COLUMN price_usd TYPE numeric(10,2)` |
| `plan_swaps` | ❌ غير موجود في أي migration | `CREATE TABLE plan_swaps` + RLS policies |
| `progress_photos` | ❌ غير موجود في أي migration | `CREATE TABLE progress_photos` + RLS policies |
| `coach_presence` | ❌ غير موجود في أي migration | `CREATE TABLE coach_presence` + RLS policies |

### ملفات SQL للصيانة

ملفات SQL التى أُنشِئَت لإصلاحات Phase 5 تم توقيعها كـ migration files
تحت `supabase/migrations/` أو تم تطبيقها مباشرة على Supabase SQL Editor.
انظر `PROGRESS.md` Phase 5 للتفاصيل.

### تحديث Supabase Schema Cache

بعد أي تعديل على schema، يجب تشغيل:

```sql
NOTIFY pgrst, 'reload schema';
```

في Supabase SQL Editor لتحديث PostgREST schema cache.

---

## 14. Phase 6: تسريع AI + إصلاح توليد المقالات (2026-08-19)

### 1. EVO AI Chat — تسريع 5x

**المشكلة:** EVO كان بياخد 18-25 ثانية + بيرجع thinking artifacts (numbered reasoning steps).

**الحل:**
- `callFreeOpenRouterRace()` في `src/lib/ai-provider.ts` — Promise.any() بـ 3 نماذج بالتوازي
- Cleanup قوي في `src/app/api/ai/chat/route.ts`:
  - شطف `, <reasoning>, <reflection>, <analysis> tags
  - شطف "Here's a thinking process:" / "Thinking process:" headers
  - استخراج "Final Answer:" / "Draft:" markers
  - شطف numbered reasoning steps + bullet-style reasoning
  - fallback للـ local reply لو النص النظيف أقل من 10 أحرف
- تحسين الـ system prompt بـ "ANSWER DIRECTLY" + أمثلة BAD/GOOD

**النتيجة:** 1.3-3.9 ثانية (5-7x أسرع) + ردود نظيفة.

### 2. Plan Generation — تسريع 3x

**المشكلة:** timeoutMs = 180s كان فوق حد Vercel Hobby (60s).

**الإصلاح في `src/lib/plan-generator.ts`:**

| الدالة | قبل | بعد |
|---|---|---|
| `generateNutritionPlanAI` | 180s, 8000 tokens | 60s, 4000 tokens |
| `generateWorkoutPlanAI` | 180s, 8000 tokens | 60s, 4000 tokens |
| `regenerateMeal` | 90s, 2000 tokens | 45s, 1500 tokens |
| `normalizeCoachPlan` | 120s, 6000 tokens | 60s, 4000 tokens |

**`src/app/api/ai/swap/route.ts`:** تحول لـ `callFreeOpenRouterRace` (3 models parallel) + maxDuration 180s → 60s.

### 3. Article Generation — Chunked Generation

**المشكلة:** توليد المقالات كان بيفشل بـ timeout + المقالات كانت قصيرة.

**الحل في `src/lib/blog-generate.ts`:**

تقسيم التوليد لـ 3 chunks:

```typescript
// Chunk 1 (50s): SEO + Research + English article (600-900 words, maxTokens 4000)
const chunk1 = await callFreeOpenRouter(chunk1Prompt, {
  maxTokens: 4000, timeoutMs: 50_000,
});

// Chunk 2 + 3 بالتوازي (Promise.all)
const [chunk2, chunk3] = await Promise.all([
  // Chunk 2 (50s): Arabic article + FAQ (500-800 words)
  callFreeOpenRouter(chunk2Prompt, { maxTokens: 4000, timeoutMs: 50_000 }),
  // Chunk 3 (40s): Links + image prompts + social posts
  callFreeOpenRouter(chunk3Prompt, { maxTokens: 2500, timeoutMs: 40_000 }),
]);

// إدراج الروابط في المقالات
const englishArticle = insertLinksIntoArticle(chunk1.englishArticle, links, false);
const arabicArticle = insertLinksIntoArticle(chunk2.arabicArticle, links, true);
```

**`src/app/api/cron/blog/step2-generate/route.ts`:**
- `maxDuration` 60s → **300s** (5 دقائق)
- **دمج Research phase** قبل التوليد (45s timeout)
- Graceful degradation لو الـ research فشل

### 4. Vercel Hobby Plan Limits (مهم!)

| النوع | الحد | ملاحظة |
|---|---|---|
| Serverless Function timeout | 60s | يجب ضبط `maxDuration` |
| Cron job timeout | 60s | يجب استخدام Background functions للعمليات الطويلة |
| Build timeout | 45 min | كافٍ |
| Bandwidth | 100 GB/شهر | — |

**للعمليات الطويلة (>60s):**
- استخدم `maxDuration = 300` (Vercel Pro يدعم 900s)
- أو قسم العملية لـ chunks (زي ما عملنا في توليد المقالات)
- أو استخدم Background Functions (Pro plan)

---

> **ملاحظة أخيرة:** هذا الدليل يتم تحديثه مع كل تغيير جوهري في المشروع. تأكد دائماً من مراجعة `PROGRESS.md` قبل البدء في أي عمل جديد.
