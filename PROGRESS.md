# PROGRESS.md — MuscleHub Status Board

> **آخر تحديث:** 2026-08-26 (مرحلة 13 — Security RLS Hardening, migration 0017)
> **قاعدة التحكم:** هذا الملف هو لوحة التحكم والتسليم المشتركة. لا ننتقل لأي خطوة قادمة دون تحديث هذا الملف والحصول على الموافقة البشرية.
> **مصدر الحقيقة:** الكود الفعلي (`src/**` + `supabase/migrations/`) يتفوق على هذا الملف (§12.8). كل الأرقام في القسم 1 تم التحقق منها فعلياً في مهمة #4.
> **الأرشيف الكامل:** المحتوى التاريخي التفصيلي منقول إلى `archive/PROGRESS_ARCHIVE.md`.

---

## 1. الحالة الحالية (Current Status)

### ملخص سريع — الميزات الشغالة فعلاً (مبنية على الكود)

النظام يعمل في الإنتاج على `https://musclehubeg.vercel.app`:

- **الموقع العام (Public Site)**: صفحات EN/AR + 6 صفحات عربية mirror + RTL/LTR ديناميكي عبر `resolveLocale()` في `src/app/layout.tsx`
- **المصادقة**: Email/password + Google OAuth (PKCE) + middleware + auto-bootstrap للكوتش
- **العضويات**: 4 tiers (Free / Premium / Pro / Coaching) + `useMembershipTier` hook + multi-subscription
- **الأدوات**: 6 أدوات (5 calculators + meal planner) + حفظ النتائج + PDF/JSON export
- **EVO AI Chat**: floating widget + `callFreeOpenRouterRace` (3-model parallel) + local fallback
- **Blog CMS**: كامل (قائمة + محرر) + cron pipeline (Step 1 → 2a → 2b → 2c → 2d → 3) + manual coach generation + cleanup endpoint
- **Coach Dashboard**: قائمة العملاء + إدارة العميل + مراجعة الدفعات + صندوق الدعم
- **الإشعارات**: polling 30s + إشعارات الكوتش + weekly cron (Vercel)
- **أنظمة أخرى**: Referral (20% commission) + progress tracking + questionnaires + PayPal checkout
- **PayPal Integration**: ✅ مكتملاً (`src/lib/paypal.ts` + 3 API routes + migration `0016`)
- **SEO + AdSense**: ads.txt + noindex على الصفحات الخاصة + hreflang مصحح + 404 noindex
- **Blog EN/AR Separation**: ✅ EN/AR مستقلان بالكامل (كل لغة لها SEO + FAQ + image + social + reading time مستقلة)

### الـ Bugs المفتوحة الفعلية

| ID | الوصف | الملف | الأولوية |
|---|---|---|---|
| — | لا توجد bugs حرجة أو عالية الأولوية مفتوحة في الكود الحالي — تم إصلاح 124 مشكلة في 2026-08-26 (انظر القسم أدناه) | — | — |

### إصلاحات 2026-08-26 (124 مشكلة عبر 78 commit)

| الفئة | المشاكل | Commits |
|---|---|---|
| 🔒 أمني حرج | C1 (profiles RLS), C2 (earnings RLS), C3-subs (subscriptions RLS), C4 (cron fail-open), C3-notif (admin notif allowlist), C7 (demo mode guard), C9 (PII log), C17 (open-redirect), C6 (listAllSubscriptions client-side) | dcd82c6, 0dcb385 |
| 💰 فقدان أموال | C10 (subscription renewal overwrites), C11 (payout split bug), C12 (double-approval) | 9f4053e, 71f713f |
| ⚙️ ميزات مكسورة | C13 (/chat response field), C14 (coach support sender_id) | 4ffd217 |
| ⏱️ حدود server-side | C15 (EVO chat limit), C16 (swap limit) | 8a065c0 |
| 🔍 SEO | C22 (9,705 pages metadata), C23 (skip-to-content), C24 (hreflang), M29 (blog 404), M30 (metadata i18n) | f502b68, 0778277, d0d2cbf, e0b2b63, 4aaa68a |
| 🎨 UI | C19 (affiliate share), C20 (memberships comparison), C21 (/ar/coaching), M25-M27 (invisible text), M35 (French word), M37 (cookie flash), M38 (duplicated muscles) | b48e669, a526826 |
| 🛡️ Coach/Admin | M3 (expired subs), M8 (PayPal amount), M10 (review status), M18 (client validation), M20 (support polling), M19 (close-ticket), M7 (upload validation), M9 (subreq dedupe), M15 (slug validation), M17 (auto-save), M24 (leads DELETE), M16 (cron retry) | 39c8cf5, 75a55bb, 7277ce6, 8ab78fb, 00afb31, ba3cb0c, 178457b |
| 📝 محتوى | M32-M34 (FAQ PayPal + tiers) | 8ab78fb |
| 🔧 Minor/Polish | dead code, brand name, RTL, ShareButtons aria, OtherTools, referral cookie Secure, package.json name, NotificationBell polling, landing dead code, food card links, exercise counts, PricingView/hreflang/exercises dead code | e2ae247, ba3cb0c, f1d14ea, acf57cb |
| 👤 Auth | M6 (email confirmation redirect bug), M2 (swap race condition) | dbc81e8 |
| 📊 UX | M4 (profile stats dynamic), M14 (plans empty state guidance), M40 (Arabic detection), M39 (404 bilingual), M43 (meal planner persistence), M41 (blog header nav), M42 (link tags in body), M48 (meal planner grams), M46 (progress date picker), M45 (progress validation), M44 (profile SPA links), M49 (weight color), M50 (chart single-entry), M52 (EVO backdrop) | 702340d, ce8199d, 267fde0, 3d6708b, 3023099 |
| 🔒 XSS | M53 (print modal escapeHtml) | fa78120 |

**Migrations المطلوبة على Supabase الإنتاج:**
- `0017_security_rls_hardening.sql` — RLS + trigger + 2 SECURITY DEFINER functions
- `0018_extend_subscription.sql` — extend_subscription() RPC
- ملف موحد للتشغيل: `supabase/migrations/RUN_ON_SUPABASE_SECURITY_0017_0018.sql`
- بعد التشغيل: `NOTIFY pgrst, 'reload schema';`

| ESLint debt | 4 errors + 5 warnings في 7 ملفات `src/` لم تُلمَس (CookieConsent, SaveResultButton, BlogAdminView, checkout/page, foods/[slug], water-tracker, AdSenseAd) — لا تؤثر على production build (Next.js 16 dropped ESLint from build config) | (7 ملفات) | Low (tech-debt) |
| Tests | 0 ملفات اختبار (unit/integration/E2E) — لا يوجد إطار اختبار | — | Low (tech-debt) |
| Z.ai token | `ZAI_TOKEN` غير مهيأ على Vercel Production — Blog Step 2a external research يفشل بـ HTTP 401 (التفاصيل في `archive/PROGRESS_ARCHIVE.md` § MH-ZAI-PROD-008) | `src/lib/external-search.ts` | High (يؤثر على Blog pipeline) |
| Topic picker intermittent | "Topic picker returned an invalid response" أحياناً — يحتاج `parseJSON` robustness أو model-rotation retry | `src/lib/blog-topics.ts` | Medium |
| Step 2a empty research | يكتب `research_done` حتى مع 0 articles — quality gate في Step 2b يجب أن يلتقطها لكنه لم يُختبر runtime | `src/app/api/cron/blog/step2a-research/route.ts` | Medium |
| M28 deferred | Blog article body is client-rendered only — requires larger refactor of BlogArticlePage from "use client" to server component | `src/components/blog/BlogArticlePage.tsx` | Medium |
| M31 deferred | LanguageToggle doesn't navigate to /ar/ mirror — requires creating Arabic mirror routes for all public pages | `src/components/LanguageToggle.tsx` | Medium |

### إحصائيات المشروع المُتحقَّق منها (مهمة #3 + #4)

كل الأرقام تم التحقق منها فعلياً في `origin/main` HEAD `9a890e0`:

| المقياس | القيمة المُتحقَّق منها | كيف التحقق |
|---|---|---|
| ملفات TypeScript / TSX في `src/` | **255** | `find src -name "*.ts" -o -name "*.tsx" \| wc -l` |
| صفحات `page.tsx` | **51** | `find src/app -name "page.tsx" \| wc -l` |
| API routes | **36** | `find src/app/api -name "route.ts*" \| wc -l` |
| مكونات shadcn UI | **51** | `find src/components/ui -name "*.tsx" \| wc -l` |
| Views (`src/components/views/`) | **25** | `find src/components/views -name "*.tsx" \| wc -l` |
| Migrations | **18** (`0001` → `0018`) | `ls supabase/migrations/` |
| Tables مُعرّفة في migrations | **22** | `grep -hE "^create table" supabase/migrations/*.sql \| wc -l` |
| Routes عربية `/ar/*` | **6** | `/ar`, `/ar/blog`, `/ar/blog/[slug]`, `/ar/exercises`, `/ar/foods`, `/ar/memberships` |
| Blog cron routes | **7** | step1-pick + step2-generate (legacy) + step2a-research + step2b-en-article + step2c-ar-article + step2d-links + step3-publish |
| PayPal API routes | **3** | create-order + capture-order + webhook |
| Exercises dataset | **868** ✅ | `grep -cE 'slug: "[^"]+"' src/lib/exercises.ts` — restored from `6c48ca2` (commit `b760dbf`, 2026-08-25) after loss in `a776aa8` ("تصدير") |
| Foods dataset | **8,830** ✅ | `grep -cE 'slug: "[^"]+"' src/lib/foods.ts` — restored from `6c48ca2` (commit `b760dbf`, 2026-08-25) after loss in `a776aa8` ("تصدير") |
| Workout programs | **7 slugs** | `grep -cE 'slug: "[^"]+"' src/lib/workout-programs.ts` |
| Test files | **0** | `find . -name "*.test.ts" -o -name "*.spec.ts" -not -path "./node_modules/*"` |
| `@ts-nocheck` في `src/` | **0** ✅ | `grep -r "@ts-nocheck" src/` |
| `ignoreBuildErrors` في `next.config.ts` | **Not present** ✅ | grep على `next.config.ts` |
| `scripts/` directory | **Not in repo** ✅ | `ls scripts/` → 404 |
| Build script في `package.json` | `"next build"` ✅ | grep على `package.json` |

> **ملاحظة تاريخية:** أعداد Exercises + Foods اتنقصت لـ 33/29 في commit `a776aa8` ("تصدير" — 2026-08-21) عن طريق الخطأ، ثم اتعادت في commit `b760dbf` (2026-08-25) باسترجاع النسخة من `6c48ca2`. التحقيق الكامل في `worklog.md` Task ID `DATA-RESTORE-2026-08-25`.

---

## 2. سجل الميزات (Feature Log)

جدول واحد لكل الميزات — الحالة + تاريخ آخر تحديث:

### الميزات المكتملة (تمت)

| # | الميزة | الحالة | آخر تحديث |
|---|---|---|---|
| F1 | الصفحة الرئيسية (Apple-style sticky + Liquid Glass + 14-section dark premium) | تمت | 2026-08-10 |
| F2 | المدونة (EN + AR + CMS + AI generation + cleanup) | تمت | 2026-08-22 |
| F3 | مكتبة التمارين (868 تمرين — مسترجَعة في `b760dbf`) | تمت | 2026-08-25 |
| F4 | مكتبة الأكلات (8,830 أكلة — مسترجَعة في `b760dbf`) | تمت | 2026-08-25 |
| F5 | برامج التدريب (7 slugs) | تمت | 2026-08-10 |
| F6 | صفحة الكوتشينج | تمت | 2026-08-10 |
| F7 | صفحة EVO | تمت | 2026-08-10 |
| F8 | صفحة العضويات (4 tiers + مقارنة) | تمت | 2026-08-19 |
| F9 | FAQ + About + Contact + Privacy + Terms | تمت | 2026-08-10 |
| F10 | دعم العربية (RTL) — 6 صفحات `/ar/*` | تمت | 2026-08-19 |
| F11 | تسجيل بالبريد + كلمة المرور | تمت | 2026-08-06 |
| F12 | Google OAuth (PKCE) | تمت | 2026-08-06 |
| F13 | إدارة الجلسات (middleware + `@supabase/ssr`) | تمت | 2026-08-06 |
| F14 | Auto-bootstrap للكوتش | تمت | 2026-08-06 |
| F15 | 4 مستويات (Free / Premium / Pro / Coaching) | تمت | 2026-08-10 |
| F16 | أسعار USD ($14.99 / $29.99 / $39.99) | تمت | 2026-08-19 |
| F17 | حدود لكل مستوى (EVO, خطط, حفظ, PDF) | تمت | 2026-08-10 |
| F18 | اشتراكات متعددة (Coaching + Premium معاً — migration 0011) | تمت | 2026-08-10 |
| F19 | `useMembershipTier` hook | تمت | 2026-08-10 |
| F20 | حاسبة السعرات + BMI + Macro + Body-fat + Water tracker | تمت | 2026-08-10 |
| F21 | مخطط الوجبات (meal planner) | تمت | 2026-08-10 |
| F22 | حفظ النتائج (3/50/200/∞ حسب tier) | تمت | 2026-08-10 |
| F23 | تصدير PDF (Canvas → JPEG → PDF 1.4 — بدون مكتبة خارجية) | تمت | 2026-08-10 |
| F24 | تصدير JSON (client-side blob) | تمت | 2026-08-10 |
| F25 | EVO floating widget على كل الصفحات | تمت | 2026-08-10 |
| F26 | Anonymous: 10 رسائل/يوم + Subscriber gating | تمت | 2026-08-10 |
| F27 | Platform search (تمارين + أكلات + برامج + مدونة) | تمت | 2026-08-10 |
| F28 | `callFreeOpenRouterRace` (3-model parallel Promise.any) | تمت | 2026-08-19 |
| F29 | `callFreeOpenRouterLimited` (maxModels=2 للـ Vercel 60s cap) | تمت | 2026-08-20 |
| F30 | داشبورد الكوتش (10 فلاتر + 6 tabs + payments + support) | تمت | 2026-08-10 |
| F31 | إشعارات المستخدمين (polling 30s) | تمت | 2026-08-17 |
| F32 | إشعارات الكوتش (server-side bypass) | تمت | 2026-08-17 |
| F33 | إشعار تذكير التقدم الأسبوعي (Vercel Cron — كل أحد 9am Cairo) | تمت | 2026-08-17 |
| F34 | نظام الإحالات (20% عمولة + payouts + admin) | تمت | 2026-08-10 |
| F35 | تتبع التقدم (weight chart lazy-loaded + photos) | تمت | 2026-08-10 |
| F36 | الاستبيانات (تغذية + لياقة) — تعديل في أي وقت + تنقل + إرسال | تمت | 2026-08-17 |
| F37 | الدفع اليدوي (InstaPay/Vodafone Cash + receipt review) | تمت | 2026-08-19 |
| F38 | **PayPal Integration** (PRIMARY payment method — sandbox tested, Live-ready) | تمت | 2026-08-24 |
| F39 | SEO (sitemap + robots + JSON-LD + hreflang + noindex على private routes) | تمت | 2026-08-22 |
| F40 | ads.txt + AdSense tier-gating | تمت | 2026-08-22 |
| F41 | Vercel Analytics + Speed Insights | تمت | 2026-08-10 |
| F42 | GA4 + AdSense (auto-suppressed على auth routes) | تمت | 2026-08-10 |
| F43 | PWA (manifest + service worker) | تمت | 2026-08-10 |
| F44 | Blog Cron Pipeline (Step 1 → 2a → 2b → 2c → 2d → 3 + controlled retry + queueId threading) | تمت | 2026-08-21 |
| F45 | Blog EN/AR Separation (مستقلان بالكامل — لا inheritance من EN إلى AR) | تمت | 2026-08-22 |
| F46 | Blog Admin UI (compact + searchable + responsive) | تمت | 2026-08-21 |
| F47 | Blog Editor AI Tools (SEO Title + Meta + Improve + FAQ + CTA + Social + Image prompts — all live Gemini) | تمت | 2026-08-21 |
| F48 | Affiliate Engine (migration 0015 + commission tracking) | تمت | 2026-08-24 |
| F49 | Unified `PALETTE` const (Gemini-card palette extended site-wide — WCAG AAA contrast on all landing text) + Premium Memberships cards redesign | تمت | 2026-08-26 |

### الميزات المؤجلة (BACKLOG)

| # | الميزة | الحالة | سبب التأجيل |
|---|---|---|---|
| D1 | BLOG-MULTILANG-ENGINE-001 — محرك محتوى مستقل لكل لغة (EN + AR engines منفصلان). Future implementation Task ID candidate: `BLOG-MULTILANG-ENGINE-002` or `MULTILANG-IMPL-001` | مؤجل | مهمة مستقبلية — تحتاج task ID منفصل + design approval من المالك. التفاصيل الكاملة في `archive/PROGRESS_ARCHIVE.md` |
| D2 | MH-AI-ARCH-002 — Render Backend migration (18 مهمة فرعية) | مؤجل | يحتاج Render Backend repo جديد + API contract design + owner approval لكل مهمة. القرارات الـ 8 في القسم 4 |
| D3 | Terminology Audit stage | مؤجل | سيُصمَّم عند فتح BLOG-MULTILANG-ENGINE-001 |
| D4 | Unit tests / Integration tests / E2E tests | مؤجل | tech-debt منفصل |
| D5 | Stuck-state recovery script للـ blog queue | مؤجل | Future enhancement |
| D6 | Expose queue table في Blog Admin UI | مؤجل | Feature request — out of scope |
| D7 | Remove dead code (`src/lib/ai.ts`) | مؤجل | Low priority — not broken, just unused |

---

## 3. سجل الـ Bugs (Bug Log)

كل bug اتحل → سطر واحد. التفاصيل الكاملة للحل في `archive/PROGRESS_ARCHIVE.md`.

### الـ Bugs المُ stapled محلولة (مُتحقَّق منها في الكود)

| ID | الوصف | حُلّ في | التحقق |
|---|---|---|---|
| B1 | Profile page تعرض Tier="free" دائماً | `776d2fb` (Phase 2) | ✅ `useMembershipTier` hook موجود في `src/app/profile/page.tsx:6,45` |
| B2 | تناقض البراند (MuscleHubFit → MuscleHub) | `776d2fb` (Phase 2) | ✅ verified in code |
| B3 | `start` script لا يعمل محلياً | `776d2fb` (Phase 2) | ✅ `package.json` scripts: `next start` |
| B4 | Migration 0011 + 0012 لم يُطبّق على الإنتاج | `01c17ed` (Phase 2) | ✅ Applied on Supabase SQL Editor |
| B5 | `@ts-nocheck` على 12 ملف | `c024f78` / `4fbab5f` (Phase 4) | ✅ `grep -r "@ts-nocheck" src/` → 0 |
| B6 | `ignoreBuildErrors: true` | `4fbab5f` (Phase 4) | ✅ not present in `next.config.ts` |
| B7 | `supabase/types.ts` قديم | `c024f78` (Phase 4) | ✅ `subscription_type` + `price_usd` موجودة في types.ts (6 matches) |
| B8 | `adsEnabled` limit غير مستخدم | `4fbab5f` (Phase 4) | ✅ `AdSenseAd.tsx` يتحقق من `limits.adsEnabled` |
| B9 | `chat_messages` table غير مستخدم | `4fbab5f` (Phase 4) | ✅ Supabase sync + localStorage fallback |
| B10 | كود `speerr@gmail.com` hardcoded | `4fbab5f` (Phase 4) | ✅ `process.env.COACH_EMAILS` مع fallback في `src/lib/data.ts:190,213` |
| B11 | `/api/og/[slug]` legacy route | `4fbab5f` (Phase 4) | ✅ `src/app/api/og/` غير موجود |
| B12 | `/pricing` page | `4fbab5f` (Phase 4) | ✅ `src/app/pricing/` غير موجود |
| B13 | `/api/admin/run-migration` endpoint | `4fbab5f` (Phase 4) | ✅ `src/app/api/admin/run-migration/` غير موجود |
| B14 | `reactStrictMode: false` | `4fbab5f` (Phase 4) | ✅ `reactStrictMode: true` في `next.config.ts` |
| B15 | `price_egp` field name | `c329f51` (Phase 5, migration 0012) | ✅ `price_usd` في migration 0012 (2 matches) |
| B16 | Recharts (~600KB) lazy-loaded | مقبول كقرار تصميمي | ✅ `dynamic(() => import("@/components/WeightChart"), { ssr: false })` في `ProgressView.tsx` |
| B17 | Framer Motion animations مُعطّلة | مقبول كقرار تصميمي | ✅ `Reveal` + `StaggerGroup` + `StaggerItem` render مباشر في `src/components/motion.tsx` |
| B18 | `scripts/compress-images.js` referenced but dir missing | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `scripts/` غير موجود + `package.json` build هو `"next build"` فقط |
| B002 | `/ar/memberships` 404 | `ce42795` (Phase 7 Master Verification Batch 002) | ✅ `src/app/ar/memberships/page.tsx` موجود |
| C1 | Checkout فاشل: `price_usd` معرّف كـ INTEGER | `c329f51` (Phase 5, migration 0012) | ✅ `numeric(10,2)` في migration 0012 |
| C2 | `meal_plans` table غير موجودة في الإنتاج | `c329f51` (Phase 5, migration 0008) | ✅ migration 0008 يخلق `meal_plans` |
| C3 | `support_tickets` ناقصة الأعمدة | `c329f51` (Phase 5) | ✅ verified in migration 0010 |
| C4 | 3 جداول مفقودة من migrations (`plan_swaps`, `progress_photos`, `coach_presence`) | `c329f51` (Phase 5) | ✅ في migration 0008 / 0010 |
| C5 | EVO AI يستخدم local fallback فقط | `a831f73` (Phase 6) + Production Verified (2026-08-19) | ✅ `OPENROUTER_API_KEY` موجود في Vercel Production (Ready) |
| C6 | Vercel project غير مربوط بـ GitHub | Production Verified (2026-08-19) | ✅ `ce42795` deployment reached Ready status |
| H1 | Root `<html lang="en" dir="ltr">` hardcoded | `78a0e36` (Phase 7) + Production Verified | ✅ async `resolveLocale()` في `src/app/layout.tsx:51` |
| H2 | Membership `features` arrays عربية فقط | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `featuresEn` موجود في `src/lib/memberships.ts:50,87,132` |
| H3 | Hardcoded Arabic في `PlansView` English mode | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ i18n keys تحت `plans.swaps.*` |
| H4 | مفاتيح i18n مفقودة | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `prog.uploadPhoto`, `prog.photos`, `prog.noPhotos` موجودة في `src/lib/i18n.tsx` |
| H5 | اسم الكاتب "Ahmed Zake" في `blog_posts.author` | `ce42795` (Phase 7, migration 0013) + Production Verified | ✅ migration 0013 يغير default إلى `'MuscleHub'` + 46 rows تم تحديثها |
| H6 | `/ar/exercises` و `/ar/foods` 404 | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `src/app/ar/exercises/page.tsx` + `src/app/ar/foods/page.tsx` موجودان |
| M1 | نشرة بريدية في صفحات الأدوات | FALSE POSITIVE (Phase 7) | ✅ `LeadCaptureCard` ميزة lead-capture مقصودة، مش bug |
| M2 | /coach لا يُعيد توجيه المستخدم العادي | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `useEffect` redirect موجود في `src/app/(app)/coach/page.tsx` |
| M3 | URL مكرر في sitemap | Production Verified (2026-08-19) | ✅ `(slug, language)` unique index سليم + 0 duplicate rows في الإنتاج |
| M4 | عدّاد "4 Tools" في البروفايل خاطئ | `f0f3a41` (Phase 7 Master Repair Batch 001) | ✅ `value: "6"` في `src/app/profile/page.tsx:153` |
| M5 | "Pricing" tab في navigation | ⚠️ **DISCREPANCY** — التوثيق القديم قال "تمت" لكن الكود الحالي فيه "Pricing" entry في `src/components/SiteHeader.tsx:159-164` (comment يقول "kept as a separate label per nav spec") | يحتاج توضيح من المالك: هل هو bug أم feature؟ |
| BLOG-PIPELINE-REPAIR-001 | Blog article generation repair (invalid Gemini/OpenRouter model names) | (2026-08-21) | ✅ Fixed — `gemini-3.7-flash` + `nvidia/nemotron-3.5-lightning:free` + resilient fallback loop. Details in archive |
| BLOG-PIPELINE-REDESIGN-001 | Blog step2 vercel-safe fallback (`callFreeOpenRouterLimited` maxModels=2) | `3994aeb` (2026-08-20) | ✅ Production verified |
| BLOG-EXTERNAL-RESEARCH-001 | Blog Step 2a real external search | `9c163a7` (2026-08-21) | ✅ Production verified |
| BLOG-PIPELINE-RESILIENCE-002 | Step 1 retry + 10-min handoff | `9a092ab` (2026-08-21) | ✅ Production verified |
| AI-RESEARCH-EXTERNAL-001 | `/api/ai/research-topic` external search | `5ac079e` (2026-08-21) | ✅ Production verified |
| MH-AI-BLOG-003 | AI + Blog audit + fixes | `cf50052` (2026-08-21) | ✅ Production verified — RESOLVED OpenRouter 429 |
| MH-AI-NEXT-004 | Step 2b quality gate + slug Latin-only | `c897d65` (2026-08-21) | ✅ Production verified |
| MH-BLOG-NEXT-005 | Failure handlers + input gates + partial-publish | `9caadcc` (2026-08-21) | ✅ Production verified |
| MH-AI-OPENROUTER-006 | OpenRouter 429 diagnosis | `a36ed26` (2026-08-21) | ✅ Diagnosed — already resolved by `cf50052` |
| MH-QUEUE-HANDOFF-007 | queueId threading across pipeline | `086a432` (2026-08-21) | ✅ Production verified |
| MH-ZAI-PROD-008 | Z.ai production web_search failure diagnosis | `2ef8394` (2026-08-21) | ⚠️ Diagnosed — observability fix applied, but `ZAI_TOKEN` still needs owner action (راجع القسم 1) |
| MH-ZAI-FETCH-009 | Z.ai `fetch failed` ConnectTimeoutError | documented (2026-08-21) | ✅ Root cause proven — Z.ai internal-IP unreachable from Vercel |
| EN-AR-SEPARATION-v2 | Blog EN/AR full separation | `5c35b46` (2026-08-22) | ✅ Production verified |
| SEO-ADSENSE-FIX | ads.txt + noindex + hreflang + 404 noindex | `35e5b20` (2026-08-22) | ✅ Production verified |
| PAYPAL-INTEGRATION | PayPal checkout + webhook + idempotency | `a079375` (2026-08-24) | ✅ Sandbox tested, Live-ready |
| MH-DOC-001 | Documentation hardening + governance (AGENTS.md, SECURITY.md, LICENSE, 14 doc discrepancies fixed) | `a6259e1` (Phase 7a, 2026-08-19) | ✅ All governance files present + reconciled |

### الـ bugs المفتوحة الفعلية

(مُدرَجة في القسم 1 — لا يوجد bugs حرجة. tech-debt فقط + Z.ai token config.)

---

## 4. القرارات المتخذة (Decisions)

كل قرار معماري/تقني مهم — القرار | السبب | التاريخ | المصدر | ساري؟

### القرارات العامة للمشروع

| # | القرار | السبب | التاريخ | المصدر | ساري؟ |
|---|---|---|---|---|---|
| AD1 | Next.js 16 (App Router) + Turbopack | Modern stack, Vercel-native, SSR + ISR | 2026-08-02 | Phase 0 initial scaffolding | ✅ نعم |
| AD2 | Supabase (Postgres + Auth + Storage + RLS) | Free tier, integrated auth, RLS for security | 2026-08-02 | Phase 0 initial scaffolding | ✅ نعم |
| AD3 | Cookie-based auth via `@supabase/ssr` middleware | PKCE flow needs server-side cookie sync for OAuth callback | 2026-08-06 | Phase 0 (`618f764`, `d35dfbd`) | ✅ نعم |
| AD4 | Dual-mode data layer (Supabase + localStorage "demo mode") | UI can be exercised without backend | 2026-08-06 | Phase 0 | ✅ نعم |
| AD5 | 4 membership tiers (Free / Premium / Pro / Coaching) + tier priority `pro(3) > premium(2) > free(0)` + coaching treated separately | Clear pricing tiers, no "elite" tier (corrected from earlier doc claim) | 2026-08-10 | Phase 1 | ✅ نعم |
| AD6 | Multi-subscription (Coaching + Premium can coexist) | Flexibility for serious clients | 2026-08-10 | Phase 1 (`e9a572e`, `d10b44a`, migration 0011) | ✅ نعم |
| AD7 | AI provider abstraction (`src/lib/ai-provider.ts` is SINGLE source of truth) | Switching providers = config change, not code change | 2026-08-10 | Phase 1 | ✅ نعم |
| AD8 | Two AI call paths: `callFreeOpenRouter` (sequential, best-quality) + `callFreeOpenRouterRace` (parallel, fastest-wins) | Intentional trade-off — race for chat/swap, sequential for plans/articles | 2026-08-19 | Phase 6 (`a831f73`) — documented in `DEVELOPER_GUIDE.md` §14 | ✅ نعم — لا تُدمجهما |
| AD9 | No external PDF library — Canvas 2D → JPEG → minimal PDF 1.4 | Keeps the bundle lean | 2026-08-10 | Phase 1 (`src/lib/result-png-export.ts`) | ✅ نعم |
| AD10 | i18n without a framework (custom `src/lib/i18n.tsx` context provider) | No `next-intl` / `react-i18next` dependency | 2026-08-10 | Phase 1 | ✅ نعم |
| AD11 | B16: Recharts (~600KB) lazy-loaded via `dynamic(() => import("@/components/WeightChart"), { ssr: false })` | Code-split out of initial bundle | 2026-08-10 | Phase 1 | ✅ نعم — مقبول كقرار تصميمي |
| AD12 | B17: Framer Motion animations disabled (`Reveal` / `StaggerGroup` / `StaggerItem` render directly) | Owner decision to avoid layout jank | 2026-08-10 | Phase 1 (`src/components/motion.tsx`) | ✅ نعم — مقبول كقرار تصميمي |
| AD13 | M1: `LeadCaptureCard` is intentional lead-capture feature, not a bug | Collects visitor emails as `tool_leads` | 2026-08-19 | Phase 7 Master Repair Batch 001 | ✅ نعم |
| AD14 | Server-side locale detection (Option B — cookies + headers) for `<html lang dir>` | Pathname > cookie > default precedence; defensive RTL wrapper retained | 2026-08-19 | H1 Closure (`78a0e36`) — `src/app/layout.tsx` async Server Component | ✅ نعم |
| AD15 | PayPal = PRIMARY payment method; Manual (InstaPay/Vodafone Cash) = SECONDARY; Currency = USD | Modern checkout + reliability + multiple options | 2026-08-24 | PayPal Integration (`a079375`) | ✅ نعم |
| AD16 | Blog EN/AR full separation — independent engines per language (no EN→AR inheritance in Step 3) | AR is first-class content, not translation of EN | 2026-08-22 | EN-AR-SEPARATION-v2 (`5c35b46`) | ✅ نعم |
| AD17 | External research via Gemini Flash (3.7 → 3.6 → 3.5) with Google Search Grounding | Replaced broken Z.ai private-IP path + LLM pseudo-research | 2026-08-21 | Phase 8 — `src/lib/external-search.ts` | ✅ نعم |
| AD18 | Image generation via Pollinations / Imagen 3 (replaced Z.ai) | Stability + reliability | 2026-08-21 | Phase 8 — `src/app/api/ai/generate-image/route.ts` | ✅ نعم |
| AD19 | Unified `PALETTE` const in `LandingView.tsx` — single source of truth for landing-page surface colors (cards, hover shadows, badges, price pills). Complementary to `globals.css` Primary Palette (§2.1 in DESIGN.md) — used for inline `style={{}}` where Tailwind can't express dynamic opacity. All text tokens meet WCAG AAA (≥7:1) on intended backgrounds. `textMuted` (`#6E6E73`) is the **only** AA token — reserved for footer/legal text only. | Site-wide visual consistency + WCAG AAA compliance. Memberships cards were broken (`bg-white/5` on light bg = invisible + `text-gray-400/300` designed for dark bg). | 2026-08-26 | Phase 12 — commits `8aff772` → `1447a0b` → `2a449d5` | ✅ نعم |

### قرارات AI Architecture Direction (الـ 8 — مُعاد بناؤها)

> **المصدر الأصلي:** القرارات الـ 8 كانت مُدرَجة في `PROJECT_CONTEXT.md` §11 (ملف تم حذفه في consolidation commit `f32d9a` — 2026-08-24). التفاصيل الكاملة الآن في `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002.

| # | القرار | السبب | التاريخ | المصدر في الأرشيف | ساري؟ |
|---|---|---|---|---|---|
| AAD1 | **EVO stays fast, chat-only** — EVO does NOT generate plans or heavy AI output, does NOT wait on long AI operations, is NOT the execution surface for long-running ops | EVO must remain responsive for chat UX | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #1 | ✅ نعم — الكود الحالي يتوافق (EVO يستخدم `callFreeOpenRouterRace` 15s timeout، لا plan generation) |
| AAD2 | **Dedicated plan-generation surface** — separate page/interface for client plans (Nutrition + Training + Regeneration). Records + persists results. Usable by client + admin with permissions. Does NOT depend on EVO being open | Plan generation needs dedicated UX, not buried in chat | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #2 | ✅ ساري — Direction approved, **NOT implemented** (future task) |
| AAD3 | **Render Backend for heavy operations** — dedicated Render Backend (separate repo) hosts all heavy/long-running AI ops that don't fit Vercel's 60s Hobby cap: full Blog AI generation, Blog external research, nutrition plan generation, training plan generation, plan regeneration/modification, future heavy AI features | Vercel Hobby 60s cap is too restrictive for long AI jobs | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #3 | ✅ ساري — Direction approved, **NOT implemented** (Render repo skeleton exists at `muscleshubfit-cpu/Render` commit `14e87fa`, no migration started) |
| AAD4 | **Vercel stays the fast layer** — Vercel continues to host Next.js frontend, EVO chat, fast operations, light API orchestration, receiving/persisting Render results | Vercel is optimized for fast serverless | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #4 | ✅ نعم — الكود الحالي يتوافق (Vercel role unchanged) |
| AAD5 | **Future AI features classified before placement** — `fast/interactive → Vercel`, `heavy/long-running → Render`, `hybrid → Vercel orchestrator + Render heavy execution` | Clear routing rule prevents architecture drift | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #5 | ✅ ساري — Process rule for all future AI features |
| AAD6 | **Blog stays separate from EVO** — Blog AI remains separate subsystem. Target Blog pipeline shape (on Render): `Topic → Research → Generation → Translation → Smart terminology/content audit → Enrichment → Save/Publish` | Blog = content production; EVO = conversation — different concerns | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #6 | ✅ ساري — Partial implementation exists on Vercel (BLOG-EXTERNAL-RESEARCH-001 + BLOG-PIPELINE-RESILIENCE-002). Future: migrate to Render |
| AAD7 | **Architecture Principle (binding one-liner):** `EVO = conversational experience. Vercel = fast application layer. Render = heavy AI execution layer.` | Concise routing rule | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #7 | ✅ نعم — Binding policy from 2026-08-21 |
| AAD8 | **Current Blog pipeline is NOT removed** — Vercel-based Blog pipeline (Step 1 → 2a → 2b → 2c → 2d → 3) preserved and continues to run until Render Backend replacement is built, tested, and verified | No breaking changes until replacement is proven | 2026-08-21 | `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 decision #8 | ✅ نعم — الكود الحالي يتوافق (pipeline شغّال) |

---

## 5. التاريخ المضغوط (Condensed History)

كل phase → سطر واحد. التفاصيل التاريخية الكاملة في `archive/PROGRESS_ARCHIVE.md`.

| Phase | التاريخ | الوصف (سطر واحد) |
|---|---|---|
| Phase 0 | 2026-08-02 → 2026-08-06 | Initial Next.js + Tailwind + shadcn scaffolding + Google OAuth (PKCE) + RLS recursion fix |
| Phase 1 | 2026-08-06 → 2026-08-10 | Core feature build — landing pages + EVO + Blog CMS + referral + coach dashboard + memberships + tools hub + food/exercise libraries + SEO + PWA |
| Phase 2 | 2026-08-10 → 2026-08-15 | Bug fix sprint B1–B17 (profile tier, branding, start script, migrations, ts-nocheck, ignoreBuildErrors, legacy routes, reactStrictMode, price_egp→price_usd, Recharts/Framer accepted) |
| Phase 3 | 2026-08-15 → 2026-08-17 | Notification system overhaul (weekly cron + shared NotificationForm + admin broadcast) + questionnaire edit-anytime + infinite loading fix |
| Phase 4 | 2026-08-17 → 2026-08-18 | Code quality refactor (single commit `c024f78` — removed @ts-nocheck from 12 files, fixed 115 TS errors, removed ignoreBuildErrors, updated supabase/types.ts, AdSense tier gating, COACH_EMAILS env var) |
| Phase 5 | 2026-08-19 | Production QA + critical DB fixes (C1–C4: checkout price_usd numeric, meal_plans table, support_tickets columns, 3 missing tables) — applied directly on Supabase SQL Editor |
| Phase 6 | 2026-08-19 | AI speed optimization (EVO chat 5-7x faster via race + cleanup, plan/swap timeouts reduced, article chunked generation, cron blog step2 60s→300s) |
| Phase 7 | 2026-08-19 | Documentation + governance + repair (AGENTS.md, SECURITY.md, LICENSE created; 14 doc discrepancies fixed; Master Repair Batch 001 fixes B18/H2/H3/H4/H6/M2/M4/M5; Master Verification Batch 002 verifies C5/C6/H5/M3/H1) |
| Phase 8 | 2026-08-21 | Blog system fixing + Z.ai replacement — replaced Z.ai web search with Gemini Flash + Google Search Grounding, replaced Z.ai image generation with Imagen 3, reconnected blog editor AI tools to live Gemini, optimized blog admin UI, added migration 0014 (blog_posts.source) |
| Phase 9 | 2026-08-22 | EN/AR blog separation (independent content engines per language — no EN→AR inheritance) + SEO/AdSense fixes (ads.txt + noindex on private routes + hreflang + 404 noindex) |
| Phase 10 | 2026-08-24 | PayPal integration (PRIMARY payment method — `src/lib/paypal.ts` + 3 API routes + migration 0016 + idempotency + webhook signature verification) + checkout flow hardening + affiliate engine (migration 0015) |
| Phase 11 | 2026-08-25 | PROGRESS.md restructure into clean status board (هذه المهمة #4) |
| Phase 12 | 2026-08-26 | UI palette unification — extracted Gemini-card palette + applied site-wide via `PALETTE` const in `LandingView.tsx`. Redesigned Premium Memberships cards (were broken: `bg-white/5` invisible + `text-gray-400/300` on light bg). All landing text now WCAG AAA (≥7:1). Commits: `8aff772` (initial palette), `1447a0b` (deepen text colors to AAA), `2a449d5` (site-wide unification + memberships redesign) |

---

## 6. الأرشيف (Archive)

المحتوى التاريخي التفصيلي الكامل منقول إلى:

**`archive/PROGRESS_ARCHIVE.md`** (2826 سطر — was the original PROGRESS.md)

يتضمن:
- تفاصيل Phases 0–10 التنفيذية الكاملة
- سجلات تنفيذ كاملة لكل task (BLOG-PIPELINE-REDESIGN-001, BLOG-EXTERNAL-RESEARCH-001, BLOG-MULTILANG-ENGINE-001, BLOG-PIPELINE-RESILIENCE-002, AI-RESEARCH-EXTERNAL-001, MH-AI-ARCH-002, MH-AI-BLOG-003, MH-AI-NEXT-004, MH-BLOG-NEXT-005, MH-AI-OPENROUTER-006, MH-QUEUE-HANDOFF-007, MH-ZAI-PROD-008, MH-ZAI-FETCH-009, EN-AR-SEPARATION-v2, SEO-ADSENSE-FIX, PAYPAL-INTEGRATION)
- تفاصيل Post-Push Production Verification (2026-08-19)
- Documentation accuracy fixes (Phase 7)
- سرد Phase 5 + Phase 6 الكامل
- `archive/PROGRESS_ARCHIVE.md` § MH-AI-ARCH-002 (AI Architecture Direction) — المحتوى الأصلي الكامل للقرارات الـ 8

---

> **ملاحظة:** هذا الملف يتم تحديثه مع كل تغيير في المشروع. آخر نسخة موجودة دائماً على GitHub: `https://github.com/muscleshubfit-cpu/musclehubeg/blob/main/PROGRESS.md`
