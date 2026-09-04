# Developer Guide — MuscleHub

> **آخر تحديث:** 2026-09-03 (Phase 112 — أمر المالك: اختصار الملف وحذف الشرح التقني العميق إلى `docs/TECH_REFERENCE.md`)
> **الجمهور المستهدف:** مطورين جدد ينضمون للمشروع، أو المطور الحالي كمرجع
> **المرجع التقني العميق:** [`docs/TECH_REFERENCE.md`](./docs/TECH_REFERENCE.md) — بنية Supabase وقانون الميجريشنز وجداول القواعد الخاصة · شرح RLS التفصيلي (predicates · نمط الأدوار v2 · عوالم المال) · قائمة Shadcn كاملة بأسمائها · كل أكواد SQL المعقدة منظمة. الملف ده بيفضل مختصص: الإعداد والتدفقات والمراجع السريعة فقط.
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
│   │   ├── coach/               # لوحة الكوتش (العملاء + صفحة عامة + محفظة + أفيليت + إعلانات + دعم)
│   │   ├── plans/               # خطط العضو
│   │   ├── progress/            # تتبع التقدم
│   │   ├── questionnaires/      # الاستبيانات
│   │   ├── referral/           # لوحة أرباح الإحالات
│   │   └── support/            # الدعم الفني
│   ├── admin/                   # لوحة الأدمن — محمية بـ AdminGate (admin-only، المدرب يُحوّل لـ /coach)
│   │   ├── admin-gate.tsx       # حارس الواجهة: غير الأدمن يُردّ لمكانه + API نفسه requireAdmin (403)
│   │   ├── external-plans/      # توليد خطط بالـAI لغير الأعضاء + إعادة توليد (وجبة/صنف/يوم/تمرين) + سجل نسخ
│   │   ├── accounts/            # تعليم حسابات الاختبار + حذف متسلسل
│   │   ├── assignments/         # تعيين عملاء للمدربين + سجل التفعيلات
│   │   ├── blog/                # CMS المدونة
│   │   ├── coach-pages/         # مراجعة صفحات المدربين
│   │   ├── coach-support/       # صندوق دعم المدربين
│   │   ├── coach-system/        # مركز موحد لإدارة نظام المدربين
│   │   ├── leads/               # Leads من الأدوات
│   │   ├── payments/            # عضويات الموقع (طلبات الدفع اليدوي + استردادات 7 أيام)
│   │   ├── referrals/           # إدارة الإحالات
│   │   ├── saved-results/       # نتائج محفوظة لكل المستخدمين
│   │   └── wallets/             # محافظ المدربين (طلبات الشحن + تعديل يدوي)
│   ├── api/                     # API Routes (count = code truth — see §8)
│   │   ├── ai/                  # AI (chat, jobs الطابير + quota, queue-health)
│   │   ├── admin/               # Admin (external-plans, accounts, wallets, refunds, staff, blog, …)
│   │   ├── coach/               # B2B (clients/invite, wallet, subscriptions/activate, support, …)
│   │   ├── tools/               # Tool endpoints (save-result, save-meal-plan, lead, …)
│   │   ├── cron/                # Cron (dispatch-pipelines 23:00 UTC + blog p0-p5 + progress-reminder)
│   │   ├── paypal/              # PayPal (create-order, capture-order, webhook)
│   │   └── …                    # send-email, food-search, og-image, build-info, …
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
│   ├── ui/                      # shadcn/ui primitives — القائمة الكاملة بالأسماء في docs/TECH_REFERENCE.md §3
│   ├── views/                   # page-level views (منها AdminExternalPlansView — توليد غير الأعضاء)
│   ├── blog/                    # مكونات المدونة
│   ├── SiteHeader.tsx           # الهيدر + التنقل + الإشعارات
│   ├── AppLayout.tsx            # سايدبار الأدوار (عضو/مدرب/أدمن — عناصر الأدمن isAdmin فقط)
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
│   ├── data/                    # طبقة البيانات (13 وحدة: auth, blog, chat, coach, plans,
│   │                            #   progress, questionnaires, referrals, subscriptions,
│   │                            #   tickets, notifications + helpers + index re-export)
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
│   ├── plan-generator.ts        # توليد خطط تغذية/تمرين بـ AI (+ regenerateMeal/FoodItem/WorkoutDay, substituteExercise)
│   ├── external-plan-text.ts    # أنواع خطط غير الأعضاء المهيكلة + تصييرها نصًا
│   ├── ai-jobs.ts               # أنواع مهام AI الطابير + البوابات (JOB_GATE) + تعقيم الحمولات
│   ├── ai-job-processors.ts     # معالجات المهام (تُشغّل في GHA runner) + تجسيد مسودات الخطط
│   ├── ai-jobs-client.ts        # إرسال مهمة ومتابعتها من المتصفح (poll حتى done)
│   ├── tier-limits.ts           # حدود الباقات (شات/تبديلات/رصيد خطط العميل الموحد — سقف أسبوعي 1+1 + إجمالي شهري 4+4، برو 2×)
│   ├── coach-limits.ts          # أسعار نظام المدربين B2B + تفعيل العملاء (الرصيد الموحد في tier-limits)
│   ├── refund.ts                # أهلية استرداد 7 أيام (server-only)
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
│  (src/lib/data/ — Supabase CRUD + localStorage)  │
├──────────────────────────────────────────────────┤
│             Supabase                             │
│  (Postgres + Auth + Storage + RLS)               │
└──────────────────────────────────────────────────┘
```

### أنماط التصميم الرئيسية:

1. **Dual-mode data layer**: `src/lib/data/` يعمل مع Supabase أو localStorage (demo mode)
2. **Server-side auth**: `auth-server.ts` يقرأ session من cookies + يحلل الـ tier
3. **Client-side tier resolution**: `useMembershipTier` hook يجلب الـ tier من `subscriptions` table
4. **Navigation adapter**: `useNav` يحوّل `navigate("view")` إلى URL حقيقي
5. **AI fallback chain**: `callAIWithFallback` يجرب سلسلة النماذج بالترتيب (OpenRouter + Groq)
6. **PDF export without libraries**: Canvas 2D → JPEG → minimal PDF 1.4

---

## 4. قاعدة البيانات + RLS

> **الشرح التقني العميق انتقل** (أمر المالك 2026-09-03 — Phase 112): [`docs/TECH_REFERENCE.md`](./docs/TECH_REFERENCE.md) — بنية Supabase (anon vs service-role · مرآة `types.ts` · بوابة الانجراف `migration_audit.py`) · قانون الميجريشنز (التسمية `YYYYMMDDHHMMSS_NNNN` · التطبيق تلقائي عبر تكامل Supabase–GitHub عند الهبوط على main — تصحيح المرحلة 120 · idempotency · RAW-SQL-LINK للمسار اليدوي · نمط RUN_ON_SUPABASE) · جداول القواعد الخاصة (`ai_jobs` · `evo_chat_usage` · `evo_anon_usage` · تحصينات `subscriptions` · عائلة `coach_*`) · **شرح RLS التفصيلي** (دوال الـpredicates `is_coach`/`is_admin`/`is_coach_over`/`coach_of` · نمط الأدوار v2 · فصل عالمَي المال · تدفقات إضافة المدربين) · كل أكواد SQL المعقدة المذكورة في AGENTS.md مجمعة ومنظمة.
>
> **الحقيقة الحالية:** `src/lib/supabase/types.ts` (الأعمدة والعلاقات) +
> `supabase/migrations/INDEX.md` (الترقيم والسجل) — الكود هو الحقيقة.
> جدول جديد = ميجريشن جديدة بسياسات RLS الخاصة به + صف في `INDEX.md` +
> تحديث المرآة في نفس الكوميت، والقواعد الخاصة تتوثق في
> `TECH_REFERENCE.md` §1.4.
>
> **Storage buckets:** `questionnaire-photos` · `progress-photos` · `receipts` + باكت العام `coach-public` (التفاصيل: TECH_REFERENCE §1.5).

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
EvoFloatingWidget / ChatView (UI)
  → EvoChatProvider (state — localStorage + chat_messages sync للعرض فقط)
  → /api/ai/chat (server route)
    → Tier gate — auth.membership_tier من الجلسة الموثقة (active + غير منتهية)
    → دفتر استخدام server-side غير قابل للعبث: evo_chat_usage (migration 0022)
      يُسجَّل قبل استدعاء الـ AI — مسح المحادثة لا يؤثر على الحصة
    → بوابة ميزات المشتركين (regex) على كل من ليس لديه paid tier فعلي
      (بما في ذلك حسابات Free المسجلة — إصلاح G5)
    → Platform search (تمارين، أكلات، برامج، أدوات) + بحث المدونة
    → callFreeAIFallbackChain (OpenRouter + Groq interleaved، ≤52s budget)
      — Phase 89: خيار onDelta يمرر قطع الرد الخام لحظياً
    → النجاح يُبث SSE (text/event-stream):
        event: delta  → قطع خام أول بأول (المستخدم يشوف الرد وهو بيتكتب)
        event: final  → النص الكامل المنظف + links + source (يستبدل القطع الخام)
        event: error  → انقطاع منتصف البث (العميل يحتفظ بالنص الجزئي)
      والأخطاء/429 تبقى JSON — العميل يميز بالنوع (content-type)
    → التنظيف (LaTeX/تفكير/ماركداون) يحتاج النص كاملاً فيعمل بعد الجمع
      وبيتبعت في final — ممكن يختلف شوية عن القطع الخام بالتصميم
    → Local fallback عند عدم توفر المزودين (يبث final محلياً)
```

> **2026-08-27:** زر "مسح المحادثة" أُزيل نهائياً من الـ widget وصفحة /chat
> (توجيه المالك #4). كان يسمح بمسح صفوف chat_messages التي كان العداد
> القديم يعتمد عليها → تجاوز الحد اليومي.

### السلسلة المتشابكة (أقوى نموذج أولاً)

1. `openrouter nvidia/nemotron-3-ultra-550b-a55b:free` (الأضخم — 550B)
2. `groq openai/gpt-oss-120b`
3. `openrouter google/gemma-4-31b-it` (عربي ممتاز)
4. `groq openai/gpt-oss-20b`
5. `openrouter google/gemma-4-26b-a4b-it`
6. `groq qwen/qwen3.6-27b`
7. `openrouter nvidia/nemotron-3-super-120b-a12b:free`
8. `openrouter nvidia/nemotron-3.5-lightning:free`
9. `groq compound-beta`

المحادثة تستخدم maxModels=3؛ باقي المسارات maxModels=2 مع ضمانة أن
maxModels × timeoutMs ≤ 52 ثانية داخلياً في `ai-provider.ts`.

### Subscriber Gating

18 نمط regex بالعربية + الإنجليزية لميزات المشتركين (خطط/تبديل/regenerate):
- تُطبق على **الجميع بدون paid tier فعلي** — بما فيهم حسابات Free المسجلة
- paid tier = اشتراك active وغير منتهية (Premium/Pro/Coaching) من الجلسة الموثقة
- لا اشتراك فعلي → رسالة مع رابط `/memberships`

---

## 7. نظام المدونة + AI Generation

### التدفق اليدوي

```
Coach → /admin/blog/new → "Generate with AI" button
  → /api/ai/generate-article (coach-only)
  → generateArticleBundle() in blog-generate.ts
  → callAIWithFallback() with ARTICLE_SYSTEM_PROMPT
  → Returns: SEO data + EN article + AR article + FAQ + image prompts + social posts
  → Coach reviews → saves draft → publishes
```

### التدفق الآلي (Cron)

```
GitHub Actions — TWO language workflows (ONE run == ONE article in ONE language):
  blog-post-en.yml  22:00 UTC  = 1 EN article/day (18:00 US Eastern — evening peak)
  blog-post-ar.yml  05:00 UTC  = 1 AR article/day (08:00 Cairo EEST — morning window)
  → TOTAL 2 articles/day — different times per audience geography (Phase 119)

Each run drives that language's queue row through the pipeline steps
  (all CRON_SECRET-authed):
  p0-research → p1-outline → p2-content → p3-images → p4-review → p5-publish
  Row statuses: researched→outlined→writing→written→images_done→reviewed→published

Vercel cron /api/cron/dispatch-pipelines (daily 23:00 UTC — AFTER both daily
  slots) TOPS UP any missed slots only (counts successful runs today vs
  expected-through-now; failure/cancelled runs don't count) — it never
  exceeds the 1+1 quota (Phase 119: one article per language per day).

State tracked in blog_generation_queue table (one row per language).
```

---

## 8. API Routes Reference

> **Phase 82 parity fix (2026-09-02) + Phase 104 docs-parity (2026-09-03)
> + Phase 107 single-source law:** the table below was rebuilt from the
> code and re-verified per file (exported handlers + auth guards). This
> doc deliberately carries NO endpoint totals — the live count is
> whatever `find src/app/api -name "route.ts*" | wc -l` says, and
> `scripts/docs_audit.py` fails any total written here (AGENTS.md §3.8).

| Route | Method | Auth | الوظيفة |
|---|---|---|---|
| `/api/admin/accounts` | GET/PATCH/DELETE | Admin | تعليم حسابات الاختبار + حذف متسلسل |
| `/api/admin/assignments` | GET/PATCH | Admin | تعيين العملاء للمدربين + سجل التفعيلات |
| `/api/admin/blog/cleanup` | POST | Admin/Cron | إصلاح النصوص المشوهة في المقالات |
| `/api/admin/coach-fees` | GET/PATCH | Admin | رسوم نظام المدربين الشهرية لكل عميل |
| `/api/admin/coach-kind` | POST | Admin | تحويل نوع المدرب site ↔ b2b (profiles.coach_kind — Phase 103) |
| `/api/admin/coach-pages` | GET/PATCH | Admin | مراجعة صفحات المدربين (نشر/رفض) |
| `/api/admin/coach-pages/notify` | POST | Admin | إشعار مدرب بقرار مراجعة صفحته |
| `/api/admin/coach-payments` | GET | Admin | سجل تفعيلات المدربين (coach_payments) |
| `/api/admin/coach-support` | GET/POST | Admin | صندوق دعم المدربين (رد الأدمن) |
| `/api/admin/external-plans` | POST/GET/PATCH/DELETE | Admin (RLS: is_admin) | خطط AI لغير الأعضاء + إعادة توليد (خطة/وجبة/صنف/يوم/تمرين) + سجل نسخ (5) + استرجاع |
| `/api/admin/leads` | GET/PATCH/DELETE | Admin | قاعدة العملاء (leads من الأدوات + التسجيلات) |
| `/api/admin/refunds` | GET/POST | Admin | طلبات الاسترداد 7 أيام + قرار الإدارة (إنهاء الاشتراك + عكس العمولة) |
| `/api/admin/saved-results` | GET | Admin | كل النتائج المحفوظة لكل المستخدمين |
| `/api/admin/site-assignments` | GET/POST/PATCH/DELETE | Admin (service-role) | إسنادات متابعة B2C عضو↔مدرب موقع (site_coach_assignments — Phase 103) |
| `/api/admin/staff` | POST/PATCH | Admin | إدارة حسابات الموظفين |
| `/api/admin/wallets` | GET | Admin | محافظ المدربين (أرصدة + حركات) |
| `/api/admin/wallets/adjust` | POST | Admin | تعديل يدوي لمحفظة مدرب (مُدقَّق) |
| `/api/admin/wallets/topups` | PATCH | Admin | مراجعة طلبات الشحن (إيصال → اعتماد/رفض) |
| `/api/affiliate/commission` | POST | Admin | تسجيل/تسوية عمولة أفيليت (20%) |
| `/api/affiliate/payout-notify` | POST | User | إشعار الأدمن بطلب سحب أفيليت |
| `/api/affiliate/referred-coaches` | GET | User | المدربون المسجلون عبر رابط الإحالة |
| `/api/ai/chat` | POST | User (اختياري للمجهول) | محادثة EVO — توليد الخطة يخصم من الرصيد الموحد (429 يميز أسبوعي/شهري) · النجاح يُبث SSE (delta/final) والأخطاء JSON |
| `/api/ai/jobs` | POST/GET | User/Coach + JOB_GATE | طابور مهام AI (توليد/استبدال/إعادة توليد) — فحص ملكية + رصيد العميل، مهام الموظفين محجوبة عن العملاء |
| `/api/ai/queue-health` | GET/DELETE | Admin | صحة الطابور + تنظيف المهام العالقة |
| `/api/ai/quota` | GET | User session | عدادات الرصيد الموحد (أسبوعي + شهري + التبديلات) |
| `/api/blog/fetch-images` | POST | Admin | جلب صور مقترحة للمقال |
| `/api/blog/suggest-image` | POST | Admin | اقتراح وصف صورة للمقال بـ AI |
| `/api/build-info` | GET | Public | معلومات البناء (commit الحالي) |
| `/api/coach/ads` | GET/POST | Coach | إعلانات المدرب على صفحته |
| `/api/coach/ai-usage` | GET | User (coach/admin) | استهلاك رصيد عميل (النافذتان الأسبوعية والشهرية) |
| `/api/coach/claim` | POST | User | مطالبة مدرب بعميل عبر كود |
| `/api/coach/clients/invite` | POST | Coach | دعوة عميل جديد للمدرب |
| `/api/coach/landing` | GET/PUT | Coach | صفحة المدرب العامة (slug + محتوى) |
| `/api/coach/register` | POST | Public (hardened) | تسجيل مدرب — rate-limit 3/10min + honeypot + role server-side |
| `/api/coach/subscriptions/activate` | POST | User (staff) | تفعيل اشتراك عميل — خصم المحفظة أولاً (402 نقص) + ledger |
| `/api/coach/support` | GET/POST | Coach | تذاكر دعم المدرب من جهته |
| `/api/coach/wallet` | GET | User (coach) | محفظة المدرب + الحركات |
| `/api/coach/wallet/topup` | POST | User (staff) | طلب شحن محفظة (إيصال إلزامي) |
| `/api/coaches/featured` | GET | Public | المدربون المميزون (صفحات عامة) |
| `/api/cron/blog/p0-research` | GET | Cron (CRON_SECRET) | بحث الموضوع (مرحلة 0) |
| `/api/cron/blog/p1-outline` | GET | Cron (CRON_SECRET) | مخطط المقال (مرحلة 1) |
| `/api/cron/blog/p2-content` | GET | Cron (CRON_SECRET) | كتابة المحتوى AR+EN (مرحلة 2) |
| `/api/cron/blog/p3-images` | GET | Cron (CRON_SECRET) | الصور (مرحلة 3) |
| `/api/cron/blog/p4-review` | GET | Cron (CRON_SECRET) | المراجعة (مرحلة 4) |
| `/api/cron/blog/p5-publish` | GET | Cron (CRON_SECRET) | النشر (مرحلة 5) |
| `/api/cron/dispatch-pipelines` | GET | Cron (CRON_SECRET) | الموزع اليومي 23:00 UTC (مدونة + مهام AI + إشعارات) |
| `/api/cron/progress-reminder` | GET | Cron (CRON_SECRET) | تذكير التقدم الأسبوعي (الأحد 07:00 UTC) |
| `/api/exercise-image` | GET | Public | بروكسي صور التمارين |
| `/api/file` | GET | User | قراءة ملف من التخزين للمستخدم المصرّح |
| `/api/food-search` | GET | Public | بحث الأكلات (محلي + Open Food Facts) |
| `/api/my/coach-whatsapp` | GET | User | رقم واتساب مدرب العميل |
| `/api/notifications/admin` | POST | User | إنشاء إشعار أدمن (service_role) |
| `/api/notifications/broadcast` | POST | Coach/Admin | بث إشعارات لمجموعة مستخدمين |
| `/api/og-image/[slug]` | GET | Public (edge) | صورة OG ديناميكية للمقالات (route.tsx) |
| `/api/paypal/capture-order` | POST | User | تأكيد دفع PayPal (مصدر الحقيقة للسعر والتفعيل) |
| `/api/paypal/create-order` | POST | User | إنشاء طلب PayPal (السعر يُحسم خادمياً) |
| `/api/paypal/webhook` | POST | PayPal (توقيع) | أحداث PayPal (سجل تدقيق) |
| `/api/plans/member-edit` | POST | User | تعديل العضو لخطته (تتبع التعديلات اليدوية — غير محدودة) |
| `/api/plans/normalize` | POST | Coach/Admin | تطبيع نص خطة يدوية إلى بنية مهيكلة |
| `/api/refund/request` | GET/POST | User | طلب استرداد العضو + فحص الأهلية (7 أيام + عدم استخدام المميزات من الدفاتر المحمية) |
| `/api/send-email` | POST | Server (service-role) | إرسال بريد nodemailer + تحقق صارم + حد 100/24h |
| `/api/subscription/cancel` | POST | User | إلغاء اشتراك (يمنح أهلية استرداد + عكس عمولات معلّقة) |
| `/api/support/tickets` | GET/POST | User | تذاكر الدعم بين العميل والمدرب |
| `/api/tools/lead` | POST | Public (rate-limited) | التقاط عميل محتمل من الأدوات الست |
| `/api/tools/save-meal-plan` | POST | User | حفظ خطة وجبات |
| `/api/tools/save-result` | POST | User | حفظ نتيجة أداة |
| `/api/tools/saved-meal-plans` | GET/DELETE | User | إدارة خطط الوجبات المحفوظة |
| `/api/tools/saved-results` | GET/DELETE | User | إدارة النتائج المحفوظة |
| `/api/upload` | POST | User | رفع ملف للتخزين (حدود + تعقيم) |

**Total:** عمدًا غير مكتوب — الكود هو الحقيقة (`find src/app/api -name "route.ts*" | wc -l`)، والبوابة `scripts/docs_audit.py` تمنع كتابة أي إجمالي هنا (AGENTS.md §3.8 — Phase 107).

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

### GitHub Actions (التدفق الآلي للمدونة — pipeline v3 فصل اللغات)

منذ 2026-08-27 يوجد ورك فلو مستقل لكل لغة، مقال واحد في كل تشغيل:
- `.github/workflows/blog-post-ar.yml` — مقال عربي واحد يوميًا (05:00 UTC = 08:00 بتوقيت القاهرة صيفًا — نافذة الصباح؛ تصبح 07:00 شتاءً)
- `.github/workflows/blog-post-en.yml` — مقال إنجليزي واحد يوميًا (22:00 UTC = 18:00 بتوقيت شرق أمريكا — ذروة ما بعد العمل؛ تصبح 17:00 شتاءً)
- المرحلة 119 (أمر المالك 2026-09-04): مقال واحد لكل لغة يوميًا في مواعيد مختلفة حسب التوقيت الجغرافي لجمهور كل لغة — كانت 3+3 يوميًا قبلها
- الخطوات P0…P5 تُنفَّذ أصليًا داخل الأكشن عبر `scripts/blog-runner/run-step.mts`
- متطلبات Secrets: `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` + واحد من `OPENROUTER_API` أو `OPENROUTER_API_KEY` (يمكن الاثنين — تدوير مزدوج)
- اللغة تُمرَّر عبر `PIPELINE_LANG` (ar/en) — خطوة P0 ترفض العمل بدونها

---

## 11. الاختبار + الصيانة

### الحالة الحالية (Phase 7 correction — 2026-08-19, re-verified 2026-08-25)

| النوع | الحالة |
|---|---|
| Unit tests (vitest) | ✅ 18 ملف اختبار / 191 حالة — `npx vitest run` (منقح 2026-09-02) |
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

### الـ `PALETTE` Const — Landing page (Phase 12 — 2026-08-26)

`src/components/views/LandingView.tsx` يحتوي على `const PALETTE = { ... }`
مستقل عن `globals.css`. هذا ليس بديلاً عن الـ Primary palette، بل
**مكمِّل** له — يُستخدم فقط للعناصر التي تحتاج `inline style={{}}`
(hover effects, dynamic shadows, badges, price pills).

| Token | Hex | الاستخدام | الـ contrast |
|---|---|---|---|
| `PALETTE.surface` | `#FDFCFE` | خلفية الكروت (أبيض نقي) | — |
| `PALETTE.tint` | `#F5F7FC` | خلفية الكروت الثانوية | — |
| `PALETTE.textPrim` | `#1D252E` | h1/h2/h3 (أزرق داكن بديل الأسود) | 15:1 AAA |
| `PALETTE.textSec` | `#4A5260` | النص الوصفي/الـ body | 7.5:1 AAA |
| `PALETTE.textMuted` | `#6E6E73` | footer/legal فقط (AA مقبول) | 4.5:1 AA |
| `PALETTE.brand` | `#0071e3` | خلفية الأزرار الصلبة فقط | — |
| `PALETTE.brandDeep` | `#0F5BB5` | روابط نصية على خلفية فاتحة | 7.3:1 AAA |
| `PALETTE.brandSoft` | `#E9F2FD` | خلفية badges/pills | — |
| `PALETTE.border` | `#D2D2D7` | حدود Apple الرمادية | — |

**قاعدة:** إذا العنصر على landing page ويحتاج hover effect أو box-shadow
ديناميكي → استخدم `PALETTE.*` عبر `style={{}}`. إذا العنصر ثابت
(`bg-white`, `text-[#1d1d1f]`) → استخدم Tailwind classes العادية.

**مرجع كامل:** `DESIGN.md` §2.2 (الجدول الكامل + الـ contrast ratios).

### الـ AI Model Selection

مبدأ موحد في كل الموقع: `callAIWithFallback` يجرب النماذج بالترتيب من الأكبر للأصغر:
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

طبقة AI موحدة (`callAI` هي المدخل العام) — أهم الدوال وحالات استخدامها (منقح 2026-09-02):

| الدالة | متى تستخدمها | السلوك |
|---|---|---|
| `callAI(prompt, options)` | المدخل العام الموحد | يوجّه لمزود OpenRouter/Groq بحسب الإعدادات |
| `callAIWithFallback(prompt, options)` | **Plans, Articles, Research** — جودة عالية | Sequential — يجرب النموذج الأكبر الأول ثم ينتقل للتالي عند الفشل |
| `callFreeOpenRouterRace(prompt, options, raceCount)` | **EVO chat, Swap** — سرعة فائقة | Parallel — يستدعي نماذج بالتوازي ويرجع أول رد ناجح |
| `callFreeAIFallbackChain()` | Local fallback | مولّد محلي حتمي عند فشل كل المزودات |

```typescript
import { callAIWithFallback, callFreeOpenRouterRace } from "@/lib/ai-provider";

// للسرعة (chat, swap):
const { text, model } = await callFreeOpenRouterRace(prompt, {
  temperature: 0.6,
  maxTokens: 500,
  timeoutMs: 15_000,  // أقل من 60s عشان Vercel Hobby
}, 3);  // race count

// للجودة (plans, articles):
const { text, model } = await callAIWithFallback(prompt, {
  temperature: 0.7,
  maxTokens: 4000,
  jsonMode: true,
  timeoutMs: 52_000,  // clamp ≤52s
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

## 14. ميزانية AI الزمنية + GHA Orchestration (محدّث 2026-08-27)

> **Revised:** هذا القسم حلّ محل جدول Phase 6 القديم بعد توجيه المالك
> 2026-08-27 (قصر المزودين + علاج حد Vercel 60s عبر GitHub Actions).

### 1. قاعدة الميزانية الزمنية (Vercel Hobby = 60s)

`callFreeAIFallbackChain()` في `src/lib/ai-provider.ts` يفرض داخلياً:

```
effTimeoutMs = min(callerTimeoutMs, floor(52_000 / maxModels))
maxModels افتراضي = 2 (يمكن تمريره عبر options.maxModels)
```

أي أنه مستحيل نظرياً أن يتجاوز مسار AI واحد الـ 55 ثانية داخل الدالة —
كل الـ `maxDuration=300/180` القديمة تم clamping إلى 60.

| المسار | maxModels | timeoutMs | Worst case |
|---|---|---|---|
| EVO chat | 3 | 16s | ~48s |
| Article EN (blog p2-content) | 2 | 26s | ~52s |
| Article AR (blog p2-content) | 2 | 26s | ~52s |
| Links/social (blog-generate) | 2 | 22s | ~44s |
| Topic pick | 2 | 22s | ~44s |
| Research (LLM-based) | 2 | 26s | ~52s |
| Plan nutrition/workout | 2 | 26s | ~52s |
| regenerate-meal | 2 | 24s | ~48s |
| normalize coach plan | 2 | 26s | ~52s |
| Swap (race) | 3 متوازي | 30s | ~30s |

### 2. دور GitHub Actions كطبقة إعادة المحاولة

خطوات البايبلاين تُنفَّذ **أصليًا داخل الأكشن** (in-process، بدون Vercel
hop — منذ pipeline v2/v3)، لكن إعادة المحاولة ما زالت على مستوى الـorchestration
في `.github/workflows/blog-post-en.yml` + `blog-post-ar.yml`:

- كل خطوة من خطوات البايبلاين (P0…P5) لها retry loop حتى 3 محاولات مع
  backoff 120/240 ثانية بينها (عبر scripts/blog-runner/run-step.sh).
- المسارات تقبل معالجة الصفوف status="failed" → إعادة المحاولة فعالة
  فعلاً لا مجرد تشغيل متكرر.
- عند فشل نموذج داخل محاولة واحدة، تتولى المحاولة التالية (أو النموذج
  التالي في السلسلة المتبادلة Groq/OpenRouter) بنافذة زمنية جديدة.

### 3. الأسعار والتكلفة

كل الموديلات المستخدمة ضمن FREE tiers من OpenRouter + Groq؛ الميزانية
الزمنية فوق هي أيضاً سقف لاستهلاك rate limits.

---

> **Deprecated (2026-08-27):** تفاصيل Phase 6 القديمة (callFreeOpenRouterRace
> للمحادثة، timeouts 45/35s، Gemini SDK للتوليد) أصبحت تاريخية — الكود الفعلي
> هو المرجع (§12.8). انظر أرشيف Git لإصدار ما قبل التوجيه إذا لزم.

---

سياسة الأرشفة: يتم نقل أي مرحلة (Phase) أقدم من 6 مراحل إلى مجلد archive/ بشكل دوري تلقائي.
