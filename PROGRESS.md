# PROGRESS.md — MuscleHub Status Board

> **آخر تحديث:** 2026-08-27 (توجيهات المالك — قصر المزودين OpenRouter+Groq، إصلاحات EVO الحرجة، ميزانية ≤60s، migrations 0021+0022)
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

### إصلاحات وتوجيهات 2026-08-27 (AI Provider Consolidation + Critical Fixes)

| # | التوجيه/الإصلاح | الحالة |
|---|---|---|
| 1 | قصر المزودين على OpenRouter + Groq فقط — حذف Gemini SDK المباشر وOpenAI/Anthropic/DeepSeek من `ai-provider.ts` | ✅ |
| 2 | كل استدعاءات Gemini الآن عبر OpenRouter (`google/*` slugs) أو Groq — حذف `gemini-wrapper.ts` والكود الميت (`ai.ts`, `openrouter-flash.ts`) وإزالة `@google/genai` من package.json | ✅ |
| 3 | توليد المقالات منفصل لكل لغة (step2b EN / step2c AR موجودان أصلاً) + إصلاح جوهري: step2c كان يقرأ `bundle.topic_ar` غير الموجود → كان يستلم الموضوع الإنجليزياً دائماً؛ الآن يقرأ أعمدة الصف `topic_ar/focus_keyword_ar` | ✅ |
| 4 | migration `0021_blog_queue_topic_ar.sql` للأعمدة الناقصة (كانت ستكسر Step 1 في بيئة نظيفة) | ⏳ المالك يشغّلها على Supabase |
| 5 | حساب السعرات/Macros حتمي في السيرفر: `computeNutritionTargets()` (Mifflin-St Jeor صحيح للأنثى −161، مضاعفات النشاط AR/EN، عجز −20%/فائض +10%، بروتين 2g/kg، US Navy body fat) + حقن إلزامي في prompt + إنفاذ في normalizer — الـ AI لم يعد يحسب الأرقام بنفسه | ✅ |
| 6 | إلغاء زر مسح محادثة EVO نهائياً (widget + صفحة /chat) | ✅ |
| 7 | حرج G1/G2: دفتر استخدام غير قابل للعبث `evo_chat_usage` (migration 0022 — RLS بدون سياسات كتابة للمستخدم) يُسجَّل من السيرفر قبل استدعاء الـ AI | ✅ كود + ⏳ migration |
| 8 | حرج G3/G4: resolveTier الآن يستخدم tier الجلسة الموثقة (active + expiry filtered) مع fallback عبر admin client بدلاً من browser client داخل route | ✅ |
| 9 | حرج G5: بوابة ميزات المشتركين تطبق على الجميع بدون paid tier فعلي (حتى المسجلين Free) + system prompt لن يصف المستخدم بمشترك إلا فعلاً | ✅ |
| 10 | حرج regenerate-meal: بلا quota سابقاً → الآن يستهلك نفس كوتا meal-swap الأسبوعية | ✅ |
| 11 | حد Vercel 60s: السلسلة تضمن maxModels×timeoutMs≤52s داخلياً + clamping لكل maxDuration=300/180→60 + GHA retry loops (3 attempts، backoff 120s) لكل خطوات البايبلاين | ✅ |
| 12 | HIGH: pollinations.ai/pixabay أُضيفت لـ next/image remotePatterns (الأغلفة كانت تفشل في العرض) | ✅ |
| 13 | HIGH: توحيد اسم متغير OpenRouter — الكود يقرأ OPENROUTER_API ويقبل OPENROUTER_API_KEY alias؛ التوثيق موحّد | ✅ |
| 14 | إصلاحات إضافية: escape فلتر ilike في بحث المدونة (injection)، clamp طول الرسالة/التاريخ، response.ok في العميل (لم تعد رسائل 429 تُخزن كردود)، step2d لم يعد يطمس imagePrompts/social الخاصة بكل لغة، إصلاح BMR الأنثى في ai-local، تمرير notes الاستبيانات للـ prompts، GHA صحّحت مزاعم z-ai القديمة | ✅ |

**معروف ومقبول (Trade-off موثق بتوجيه المالك):** Step 2a research أصبح معرفياً
بالنموذج (بدون Google Search grounding الحقيقي) لأن الـ grounding يتطلب SDK
مباشر ممنوع بالتوجيه #6. hosts الموثوقة فقط ولا URLs مصطنعة تُخزن.

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
| Phase 14 | 2026-08-27 | Whole-AI-system on GHA queue (owner 4-system spec) — `ai_jobs` table (0024) + `/api/ai/jobs` enqueue/poll + `process-ai-jobs.yml` (*/10) + `scripts/ai-jobs-runner/process.mts`; processors: plans (+2 alts/meal, server BMR/TDEE), meal_regen (+3 suggestions), injury-safe library-filtered exercise swap, article tools (paraphrase/summarize/proofread/subheadings/SEO-pack + legacy aliases), social posts (4 platforms × 3 tones, platform length contracts); EVO chat: fast-chain (Groq-first) + Web-Speech voice mic; retired Vercel AI routes plan/swap/regenerate-meal/blog-tool; tsc 0 · vitest 34/34 · eslint 0 errors |
| Phase 14 | 2026-08-27 | Blog pipeline v2 (owner six-phase spec) — P0 keyword/FAQ/topic research → P1 outline+LSI+image plan → P2 full 1500–2500-word content per language → P3 modesty-guarded images (hard rule: no nudity/revealing imagery) → P4 quality review (fact-guard, links, CTA, FAQ safety net) → P5 pure-code publish + auto-sitemap; legacy step routes removed; migration 0023 (legacy queue cleanup) + libs blog-research.ts / blog-pipeline.ts |
| Phase 15 | 2026-08-27 | Anti-regression hardening (forensic audit after stale-code incidents) — forensics: 0 force-pushes in 100 events, no repo-write workflows; FINAL purge of every retired-but-alive parallel path: deleted legacy cron `/api/cron/generate-blog-post` + `/api/ai/{pick-topic,research-topic,generate-article,generate-image}` + `AIGenerateModal.tsx` (897 lines) + editor bundle button/applyAIBundle + orphan `generateImagePublic()`; NEW guard `scripts/check-stale-refs.sh` (+ negative/clean canary tests) wired as `guard-stale-refs.yml` on push/PR to main; deploy beacon `/api/build-info` (commitShort vs GitHub main = instant stale-deploy detection); resurrection branch `muscleshubfit-cpu-patch-1` archive-tagged (`archive/patch-1-uploads-20260819`) then deleted — only `main` remains; AGENTS.md §8 ANTI-REGRESSION LAW + runner fix 9d51b7b (p0-research queueId exemption); tsc 0 · vitest 34/34 · guard clean |
| Phase 15b | 2026-08-27 | Provider balance + dual-key pool (owner directive توازي/تبادل) — GHA forensics chain: ws crash fixed (setup-node@22 + optional 'ws' shim in both runners, commit d900312); dispatch revealed hidden bug: `callAIWithFallback` silently cross-provider-fell-back → mislabeled responder + starved the model ladder; made it EXACT (single config→single provider); NEW in `callFreeAIFallbackChain`: alternating provider LEAD per call (parity counter, strongest-available-first within provider) + OpenRouter dual-account round-robin (`OPENROUTER_API`=#2 / `OPENROUTER_API_KEY`=#1) with same-model account-switch on 401/402/403/429 before ladder fall-through; OFFLINE PROOF scripts/dev/prove-rotation.mts ALL PASS (B→402→switch→A→ok; call#2 groq-led; orKeys=2); tsc 0 · vitest 34/34 · guard clean · eslint 0 errors |
| Phase 16 | 2026-08-27 | Blog pipeline v3 — FULL LANGUAGE SPLIT (owner directive: كل لغة منفصلة تماما، 3 مقالات/يوم لكل لغة = 6/يوم بمواعيد نشر مختلفة) — ONE queue row == ONE article in ONE language: new `blog_generation_queue.language` column (RUN_ON_SUPABASE_0026_LANG_SPLIT.sql, idempotent, backfills legacy rows en/ar + supersedes unfinished dual-language work); P0 requires `?lang=en|ar` and researches exactly ONE language; P1 dup-guard now checks that language's archive only; P4 internal links same-language only; P5 inserts a single-language blog_posts row (no more forced EN↔AR twins / linked_post_id pairing — independent topics by design); bundles FLAT `{research0,outline,content,images,review}`; status chain simplified researched→outlined→writing→written→images_done→reviewed→published; runner threads `--lang` (PIPELINE_LANG env in workflows); scheduling split into TWO workflows: `blog-post-en.yml` crons 12/16/22 UTC (08:00/12:00/18:00 US-Eastern peak windows) and `blog-post-ar.yml` crons 05/11/18 UTC (08:00/14:00/21:00 Cairo peak windows), concurrency groups intentionally independent so languages may overlap; DELETED coupled `generate-blog-post.yml`; deep gate `scripts/blog-runner/gate-lang-split.mts` ALL GREEN (no-lang exit2 · bad-lang exit2 · ar passes guards to DB layer with dummy creds); tsc 0 · guard clean |
| Phase 16b | 2026-08-27 | UNIVERSAL MODEL SWITCHER COVERAGE (owner directive: نظام التبديل بين النماذج يتعمل لكل منظومة) — audit proved ai-provider.ts is the ONLY fetch point for chat/completions in src/ (grep-verified: evo-chat, plan-generator ×5, blog-pipeline ×4, blog-generate ×3, blog-topics, blog-research, external-search, social-posts, ai-job-processors — all on the chain; evo-search/affiliate/notifications/image-P3 are non-LLM); added observational `tag` to FallbackChainOptions and threaded it through ALL 18 call sites (evo-chat · plan:nutrition/workout/nutrition-alt/json-normalize/exercise-corrective · blog:pick-topic/outline/content/review-<lang> · article:en/ar · links-social · blog:topics-<lang> · blog:research · external-search · social-posts:<lang> · ai-job:<tool>) so every log line + failure names subsystem+provider+model+key-event; OFFLINE PROOF v2 scripts/test-ai-switcher.mts 13/13 GREEN via dynamic mock responder (S1 OR-lead+dual-key-start · S2 Groq-lead alternation · S3 402→same-model account-switch rescue under big-payload Groq guard · S4a alternation survives tags · S5 empty→immediate-retry · S6 total-failure message carries tag); AGENTS.md §8 new coverage law incl. Vercel env prerequisite note; tsc-safe property-only edits
| Phase 16c | 2026-08-27 | IMAGE SAFETY LAW — PEOPLE-FREE AI IMAGERY (owner hard rule after live immodest-render incident on 2 published posts) — ROOT CAUSE proven from production URLs: retired IMAGE_MODESTY_SUFFIX injected negation phrases ("no nudity","no cleavage","no women") into diffusion prompts; models do NOT parse negation → tokens acted as POSITIVE attractors = direct cause; NEW structural policy: people-free objects/scenes ONLY via single choke point src/lib/image-safety.ts (strips ALL negations + person words EN/AR + NSFW vocab + clothing wording ⇒ implies humans; person-scene prompts fully REWRITTEN to topical object scenes from focus_keyword/title); P1 outline now demands ENGLISH-only object subjects; P3 image #1 anchored to focus keyword (featured+og:image on-topic); retired name BANNED in guard-stale-refs; vitest canaries replay EXACT incident prompts (7 new tests); remediation runner scripts/blog-runner/remediate-images.mts + workflow_dispatch remediate-blog-images.yml regenerates every legacy Pollinations URL & rewrites blog_posts.content/featured_image + queue bundles; tsc 0 · vitest 41/41 · guard clean
| Phase 17 | 2026-08-27 | EVO CHAT SURFACE & HISTORY LAW (owner directive: الشات الطائر هو مكان المحادثة الوحيد + تصليح اختفاء الروابط + زر الرجوع + تكبير الأيقونة) — (1) SINGLE SURFACE: removed /chat page + ChatView; next.config permanent redirect /chat→/evo; removed chat.* i18n keys + AdSense /chat prefix; (2) ALL EVO CTAs now open the floating widget via openEvoFloatingChat() global event (mhe:open-evo-chat): /evo hero+final CTAs, landing Start-chatting, coaching Start-chatting, profile quick-link, AppLayout sidebar+mobile nav, SiteHeader account menu; (3) BACK-BUTTON LAW: mheEvoChat sentinel history entry pushed while drawer open → Back closes drawer, never navigates site; closeChat() consumes sentinel (verified live: URL stays, drawer closes, icon returns); (4) LINK PERSISTENCE FIX (owner bug: answer shows without links after reopen): chat_messages has no links column → links now ride inside persisted body as markdown bullets via src/lib/evo-chat-links.ts buildPersistBody/parsePersistedBody; MessageText markdown-lite renderer anchors [label](url) in bubbles; 7 new canary tests; (5) HYDRATION GATE: mount-time empty-state save no longer wipes stored history (StrictMode double-mount race + authed local-cache clobber both fixed); (6) ICON: 36px→48px image in 60px hit-target; browser-verified E2E: seed→reload→links restored as chips, live send→reply+platform chips, /chat redirect, back-closes-drawer | tsc 0 · vitest 48/48 · lint 0 errors · guard clean |
| Phase 17b | 2026-08-27 | EVO CHAT SCROLL LAW + PLATFORM TRUTH LAW (owner live-report with screenshot) — (A) SCROLL BUG (الشات بيفتح على بداية المحادثة بدل من اخرها): auto-scroll was keyed only on [messages, isTyping] → never fired when drawer opened after history already loaded (ref null while closed) → drawer showed conversation TOP; FIXED in EvoFloatingWidget: scroll-container ref + open-transition detection → instant scrollTo-bottom snap on open/restore, smooth-follow on new messages while open; container.scrollTo replaces scrollIntoView (page-behind-drawer side-scroll eliminated); (B) HALLUCINATED FEATURE (EVO said "يمكنك استخدام أداة توليد الصور على الموقع" — tool does not exist): NEW PLATFORM TRUTH LAW in /api/ai/chat buildSystemPrompt — hard capability whitelist (exercises/programs/foods/tools/blog/coaching/memberships/chat), explicit CANNOT list (images/photos/videos/files/browsing/human), rule: say "can't" and STOP, never redirect to invented features; (C) RAW LATEX LEAK (screenshot: V = \frac{4}{3}\pi\ r^{3} shown verbatim): prompt now bans LaTeX/markdown AND new pure module src/lib/evo-chat-format.ts (sanitizeLatexToPlain: \frac→(a/b), \sqrt→√, 16 symbol macros→unicode, ^{n}→superscript, _{n}→subscript, spacing macros, delimiter strip; stripMarkdownSyntax: **bold**/headings/hr removed, bullets+links preserved) wired as cleanup step 6.5 in the reply pipeline; 16 new canary tests replay the EXACT screenshot strings | tsc 0 · vitest 64/64 · lint clean · guard clean |
| Phase 18 | 2026-08-27 | SCHEDULE HEALTH LAW — GitHub scheduler de-registration outages + blog backfill (owner directive «نرجع للمدونة») — FORENSICS: live audit (anon REST read of blog_posts) proved the blog was stuck at ONLY 2 posts (1 EN + 1 AR, both 08-27) vs the 6/day target; `GET /actions/runs?event=schedule` showed last scheduled fire of ANY workflow = 2026-08-26T16:39Z (old unified pipeline) → 26+ h of zero scheduled fires repo-wide while dispatch/push runs kept working (repo public → not billing); new language-split workflows NEVER schedule-fired and process-ai-jobs.yml (*/10) had 0 runs since addition; REMEDY: `PUT /actions/workflows/{wf}/enable` ×3 (HTTP 204) + touching commit on all 3 workflow files (commit 9352808) to force trigger re-registration; BACKFILL: manual dispatch of blog-post-en.yml + blog-post-ar.yml on 9352808 (HTTP 204 ×2, runs 33094247949/33094250107); LIVE IMAGE AUDIT of both published posts via decoded Pollinations prompts: EN cover "dumbbell rack with kettlebell and barbell plates…" · AR cover "modern fitness studio interior with equipment rack…" — both people-free + on-topic (IMAGE SAFETY LAW holding in production); deploy beacon b38ada4 pre-push (no stale deploy); AGENTS.md §8 SCHEDULE HEALTH LAW added (detect via schedule-events query FIRST, remedy = enable API + touching commit, backfill via manual dispatch, verify at next slots, 3-slots/day doubles as outage retry) | guard clean · workflows YAML-validated · scheduled-fire verification at AR 18:00Z / EN 22:00Z slots |
| Phase 18b | 2026-08-27 | BODY IMAGE EMBEDDING LAW + scheduler-independent backstop + quota forensics (continuation of «نرجع للمدونة») — (A) PIPELINE GAP: P3 sourced 3–5 images/article but P5 consumed only images[0] (featured/og) → ALL posts were walls of text (live audit: 0 in-body images on all 4 posts); NEW pure embedBodyImages() in blog-images.ts (inserts images[1..N] cap 3 under evenly-spaced ## headings; cover never duplicated; idempotent; fenced-code safe; alt sanitized) wired into p5-publish; 7 vitest canaries → 71/71; backfill runner scripts/blog-runner/embed-post-images.mts (+ step in remediate-blog-images.yml) sources 2 fresh people-free images per cover-only post via the same safety pipeline; run-1 embedded 1/8 → GHA logs proved 10s pollinations timeout aborts (queue-based flux renders need 15–60s) → render window 10s→40s (commit 610c227) + 20s/25s pacing; run-3 embedded 2+2 → LIVE NOW: 6 in-body images across 4 posts, covers clean, zero duplication; (B) SCHEDULE VERDICT: AR 18:00Z slot ALSO missed post-remedy (90 min, 9+ ai-jobs slots + 1 AR slot) → GitHub scheduler stays de-registered beyond repo-side fixes; SCHEDULER-INDEPENDENT BACKSTOP: /api/cron/dispatch-pipelines (CRON_SECRET fail-closed) tops up each language to daily quota by counting today's PUBLISHING runs (failure/cancelled excluded) + dispatches process-ai-jobs when >15 min stale; vercel.json daily 21:00 UTC catch-up (Hobby's remaining cron slot) = guaranteed 6/day floor; needs owner env GITHUB_DISPATCH_TOKEN; (C) QUOTA FORENSICS: AR backfill run failed P2 at 18:29 — openrouter_free_tier_daily exhausted on BOTH accounts (50/day each, Remaining 0, reset 2026-08-28T00:00:00Z) with Groq big-payload-guarded → day ends at 2 EN + 2 AR published; sustainable 6/day needs owner OpenRouter credits ($10 → 1000 free req/day/account); AGENTS.md §8 law extended (clauses 6–7: backstop architecture + quota-vs-schedule forensics ordering) | tsc 0 · vitest 71/71 · guard clean · commits f9d022c 0374048 610c227 c5ce456 3f063a4 |
| Phase 18c | 2026-08-28 | IMAGE SAFETY LAW v2 (semantic attractors) + BODY IMAGE RENDER FIX (owner: «الصور كلها اشخاص عريانين» + «الصورة داخل المقال عبارع عن رابط مش صورة») — FORENSICS: live audit + visual verification of all 4 published posts found (1) /blog/12-week-periodized-muscle-building-plan cover rendered a SHIRTLESS MAN from a ZERO-person-token prompt (seed=29197 proof) — diffusion models associate fitness action/program/physique nouns with training bodies, token sanitization cannot stop semantic attractors; (2) the 6 in-body images embedded in Phase 18b rendered as BARE TEXT LINKS because renderMarkdown() had NO image rule (link regex consumed [alt](url) leaving the "!"); FIXES: image-safety.ts LAW v2 — promptHasPersonSemantics() (action/program/physique tokens EN+AR) forces FULL curated-scene rewrite; planner-notebook scene rule added ABOVE muscle rule for program topics; style tails IDEMPOTENT (fixes production doubled-tail URLs); blog.ts step 10.5 image rule ![alt](url) → <img> BEFORE link rule + unsafe-scheme drop (XSS); re-running remediate-blog-images.yml rebuilds every Pollinations URL through v2 | tsc 0 · vitest 80/80 (8 files) · lint 0 errors · guard clean · next build ✓ |
| Phase 18d | 2026-08-28 | IMAGE SCENE DIVERSITY LAW (owner: «كل الصور فى كل المقالات عبارة عن نفس الصور ومعاد تغير اى تفصيلة داخلها») — ROOT CAUSE: curated-scene rewrite had ~10 single scenes + 1 fixed photo style → all articles/positions rendered the SAME composition (seed noise only); FIX: SCENE BANK 10 themes × 5 variants + 5 defaults (50 people-free scenes, still-life authored) + 5 rotating photographic style tails; deterministic djb2 selection per variationKey=`${articleId}-${position}`; variationKey threaded through every caller: p3-images (${queueId}-cover/-n), remediate-images.mts (${rowId}-cover/-body-n), embed-post-images.mts (${slug}-body-n), fetchFeaturedImage/ImageSourceOptions + MultiQuery per-query suffix; Pollinations URLs now carry safe=true (provider NSFW refusal) + enhance=false (no server-side prompt mutation); bank-wide test enforces every scene × both safety gates × sanitize idempotency; fixed 2 bank entries that contained attractor tokens (rowing/workout); vitest 85/85 (8 files) · tsc 0 · lint 0 errors · guard clean · next build ✓ |
| Phase 18e | 2026-08-28 | IMAGE SOURCE LAW v3 — PEXELS-FIRST (owner: «استبدل خطوه الصور تماما الى PEXELS_API_KEY داخل GitHub Action … اشخاص عادى لكن لا عرى» + «حجم خفيف بنظام الموقع») — Pollinations AI generation RETIRED entirely; Pexels = PRIMARY (Unsplash/Pixabay failover, pixabay safesearch); PEOPLE POLICY v3: normal people ALLOWED, nudity screened at query level (sanitizeImageQuery strips NSFW EN+AR + negations, people words preserved) AND result level (hasNsfwVocabulary alt-text screening); image-safety.ts fully rewritten (scene bank/semantic attractors retired with the AI generator, djb2 rotation kept as pickResultIndex over 6-result pools); remediate-images.mts rewritten as async migration runner (pollinations URLs → Pexels photos, fail-fast without PEXELS_API_KEY, cover_alt refreshed from photo alt); embed runner queries now people-inclusive (hint+workout / hint+gym equipment); LIGHTWEIGHT: Pexels src.landscape 1200x627 auto=compress + next/image with explicit sizes on featured/related/listing cards (remotePatterns already had pexels/unsplash); PEXELS_API_KEY added to remediate workflow env (fail-fast guard) — key must exist in GH secrets AND Vercel Production env; vitest 79/79 · tsc 0 · lint 0 errors · guard clean · next build ✓ |
| Phase 19 | 2026-08-28 | AI SURFACE DEEP AUDIT — buttons × admin panels × AI system (owner: «ابداء واعمل الاول فحص اعمق للازرار ولوحات الادارة مع المنظومة») — METHOD: route map (all src/app routes + (app) group + /admin group) × button/handler inventory of ALL admin views (AdminLeadsView 10, AdminReferralsView 8, AdminSavedResultsView 4, BlogAdminView 15) + coach panels (CoachView 16, CoachPaymentsView 10, CoachSupportView 7, CoachClientView 58) × fetch-vs-route diff (every UI fetch() call site checked against src/app/api/**/route.ts) × AI chain consistency (editor tools → AiJobType registry → JOB_GATE → sanitizeJobPayload → ai-job-processors PROCESSORS → GHA process-ai-jobs.yml); VERDICT: AI system 100% wired — 15 blog-editor buttons (11 article_tool incl. aliases improve/summary + 4 social_post platforms) all processed; plan_nutrition/plan_workout/meal_regenerate/exercise_regenerate enqueue+gate+sanitize+process consistent; leads GET/PATCH/DELETE, cleanup POST, broadcast, referrals lib, receipts signed-URLs, EVO widget root-mounted all clean; DEFECT #1 FIXED: QuestionnairesView photo upload called POST /api/upload which NEVER existed → silent multi-MB base64 data-URL fallback bloating questionnaire JSONB; NEW POST /api/upload (requireUser, bucket allowlist, server-rebuilt path under caller id, MIME+5MB guards, service-role write) + GET /api/file owner-or-coach authed streaming proxy (PRIVATE buckets get permanent same-origin URLs, no signed-URL expiry) + data-URL fallback kept; DEFECT #2 FIXED: /admin/saved-results missing from AppLayout coach sidebar (drawer-only) → added to coachExtraLinks; stale 'AI settings' docstrings removed; DB: supabase/migrations/RUN_ON_SUPABASE_0027_STORAGE_BUCKETS.sql (idempotent private buckets, no policies needed); AGENTS.md §8 AI SURFACE DEEP-AUDIT LAW added; tsc 0 · vitest 82/82 · lint 0 errors · guard clean · next build ✓ (/api/upload + /api/file registered) · commits 8a42ec2 7ae0c40 |
| Phase 20 | 2026-08-28 | AI USAGE-LIMIT DEEP AUDIT V2 — EVO × membership tiers × quota enforcement (owner: «شغل التحقق مره كمان بس توسع وعمق اكبر لمنظومة الذكاء الاصطناعي بالكامل ، والتأكد من ايفو وطبيعه عضوية المستخدم فى حدود الاستخدام») — METHOD: full limits-enforcement matrix (every memberships.ts field → enforced where: server route / client / NOWHERE) × EVO chain re-trace (chat route + provider + widget + ledgers) × tier-resolution parity × stale-system hunt; VERIFIED-OK: daily chat quota (tamper-proof evo_chat_usage, record-before-dispatch, verified tier), weekly swap quota (/api/ai/jobs checkAndRecordSwap), meal-planner + saved-results server limits, ads gating, JOB_GATE coach-only; DEFECT D1 FIXED (paid users client-locked): EvoChatProvider applied the anonymous 10/session counter to EVERYONE → Premium/Pro/Coaching (advertised unlimited) silently dead after 10 in-session sends → provider resolves the real tier (useAuth+useMembershipTier), exposes dailyLimit:number|null, paid tiers never locally locked; DEFECT D2 FIXED (free logged-in UI lied): widget isSubscriber=!!profile → no countdown + enabled-but-dead input after server 429 → all quota UI keys off resolved dailyLimit/isPaidTier; DEFECT D3 FIXED (anonymous unbounded): /api/ai/chat had ZERO server throttling for anonymous traffic → scripted loops could bleed OpenRouter credits → salted-SHA-256(IP) evo_anon_usage ledger (RUN_ON_SUPABASE_0028, idempotent, NO policies, no raw IPs) enforces the free daily limit, fail-open on ledger errors; DEFECT D4 FIXED (advertised monthly plan quotas never enforced): evoNutritionPlanLimit/evoWorkoutPlanLimit (3/3 premium, 6/6 pro) were display-only — chat (only member-reachable plan surface) unlimited → NEW evo-intent.ts (pure, 13 tests) classifies plan-creation vs swap; plan-creation counted per domain (ledger sources plan_nutrition/plan_workout, monthly-UTC) with 429 + upgrade hint when exhausted; swaps stay on weekly jobs quota (no double-count); \b anchors fixed 'reGENERATE'⊂'generate'; DEFECT D5 FIXED (expired subs looked paid client-side): getSubscriptionForClient ignored status/end_date → now filters status='active' AND end_date>now() mirroring auth-server; DEFECT D6 FIXED (swap display used RETIRED starter/elite daily system): PlansView getSwapUsage showed premium→undefined→'unlimited' vs server weekly 0/3/6/3 → rewritten Monday-anchored + getLimits().evoSwapLimit (display==enforcement); dead client recordSwap deleted; swapLimitForTier deduplicated onto memberships.ts; AGENTS.md §8 USAGE LIMIT ENFORCEMENT LAW added; OWNER MANUAL STEP: run RUN_ON_SUPABASE_0028_EVO_ANON_USAGE.sql in Supabase SQL Editor (route degrades gracefully before it exists); tsc 0 · vitest 95/95 (9 files) · lint 0 errors (572 warnings) · guard clean · next build ✓ |
| Phase 21 | 2026-08-28 | 4-PILLAR COMPLETION — coach plan-generation surface made SURVIVABLE (owner: «تم ، ابنيهم الاول» on T-4PILLAR-COMPLETE) — ROOT CAUSE: CoachClientView plan generation used a BLOCKING runAiJob poll (25-min ceiling, dies with the tab) — a coach closing the page during the ~10-min GHA wait stranded the finished result inside ai_jobs FOREVER (no draft was ever created; client swaps already had a reload-surviving watcher, plan jobs did not); NEW src/lib/plan-jobs.ts (pure, 15 tests): pending-plan-job registry (mhe:pending-plan-jobs, 24h TTL, cap 40) + saved-id store (mhe:saved-plan-jobs, cap 100) + selectRecoverablePlanJobs filter (plan types · status=done · payload.clientId present · >5-min live-watcher grace · not saved/pending); CoachClientView: generateAIPlan/handleRegeneratePlan rewired to enqueueAiJobClient + registry + watchPlanJob (20s poll, 26-min window, auto-materializes draft via addPlan on done, survives reloads via mount-time re-attach) + live pending-jobs strip in ai-plans tab + one-click 'حفظ كمسودة' RECOVERY CARD for stranded jobs (GET /api/ai/jobs?limit now returns payload for own rows so the card can resolve the client); REGENERATION ORDER fixed: replacement is enqueued FIRST and the old draft deleted only AFTER arrival AND only while still status=draft (failed/late generation can no longer destroy an existing possibly-approved plan); STAFF QUOTA FIX: role=coach bypasses the weekly swap quota at /api/ai/jobs (meal/exercise swaps are the coach's plan-editing tools — client C16 weekly limits free 0/premium 3/pro 6/coaching 3 and EVO monthly plan quotas untouched) — this also un-broke coach meal_regenerate which was burning the coach's personal coaching-tier quota; COACH EXERCISE AI-SWAP completed (the last missing 4-pillar action): PlanViewerModal edit mode gains a per-exercise Wand2 button → exercise_regenerate (injury-safe library-filtered) → in-place replacement with explicit حفظ; AGENTS.md §8 PLAN JOB RECOVERY LAW added; tsc 0 · vitest 110/110 (10 files) · lint 0 errors (582 warnings) · guard clean · next build ✓ |
| Phase 22 | 2026-08-28 | EVENT-DRIVEN AI DISPATCH + COACH ARTICLE GENERATION RESTORED (owner: «توليد الخطط لا يعمل» + «توليد المقالات للكوتش غير موجود غير زرار فى لوحه الكوتش لكن بيفتح كتابة مقال جديد») — FORENSICS ×2: (A) PLAN GENERATION WAS DEAD IN PRODUCTION: GitHub Actions API audit proved process-ai-jobs.yml had exactly ONE run EVER (manual dispatch 2026-08-27T21:24Z) — the */10 schedule NEVER fired (GitHub de-registered repo-wide scheduled workflows, Phase 18 disease never healed; blog pipelines equally show 0 scheduled fires) — so every plan_nutrition/plan_workout job enqueued since sat `queued` forever while every line of queue code was correct (the one worker run succeeded = secrets + processors fine); the daily Vercel backstop (/api/cron/dispatch-pipelines 21:00 UTC) was dormant without GITHUB_DISPATCH_TOKEN; (B) COACH ARTICLE GENERATION DID NOT EXIST: the Phase-15 deletion of the client-side AIGenerateModal left the BlogAdminView "AI Assistant" banner pointing coaches at a generate button that no longer existed — "New Article" opened only the manual composer; FIX A — EVENT-DRIVEN DISPATCH LAW: NEW src/lib/ai-runner-dispatch.ts dispatchAiJobsRunner() (GitHub workflow-dispatch API, 8s timeout, fail-open) wired into POST /api/ai/jobs after every successful enqueue → runner starts in seconds; response now carries runnerDispatched + honest etaMinutes (3 pushed / 10 backstop); touching commit on process-ai-jobs.yml re-asserts the schedule per SCHEDULE HEALTH LAW; OWNER STEP: GITHUB_DISPATCH_TOKEN (fine-grained PAT, this repo, Actions RW) must exist as a Vercel env; FIX B — article_generate QUEUE TYPE: AI_JOB_TYPES+JOB_GATE(coach)+sanitizeJobPayload (topic≥5 required → new JobPayloadError mapped to HTTP 400, language/tone/audience/keywords≤8 clamps) + PROCESSORS.article_generate (HEAVY, maxTokens 7000, jsonMode, tag ai-job:article-generate; ar/en prompts; returns title+markdown+excerpt+meta_description+tags, validated ≥200 chars); COACH SURFACE: BlogAdminView lying banner replaced with a REAL "توليد مقال جديد" modal (topic/language/tone/keywords) → enqueue → live status strip → reload-surviving watcher (mhe:pending-article-job, 20s poll/26-min, mount re-attach) → sessionStorage hand-off (mhe:ai-article-draft) → BlogEditorView ?ai=1 prefill (title/content/excerpt/meta/tags + M15 Latin slug via articleSlugFromTitle fallback post-YYYYMMDDHHmm + reading_time) with explicit AI-provenance review banner; NEW tests ai-article-generate.test.ts (10 canaries: registry/gate, sanitizer clamps+JobPayloadError, slug law); AGENTS.md §8 EVENT-DRIVEN AI DISPATCH LAW added | tsc 0 · vitest 120/120 (11 files) · lint 0 errors (594 warnings) · guard clean · next build ✓ |
| Phase 23 | 2026-08-28 | TOPIC-AUTO — THE GENERATION SYSTEM PICKS THE ARTICLE TITLE (owner: «ظهر التوليد لكن بدون اختيار عنوان الموضوع مفروض يختار العنوان بنفس نظام التوليد») — generation was live (Phase 22 + owner-configured GITHUB_DISPATCH_TOKEN) but the coach modal FORCED manual topic typing (sanitizer threw JobPayloadError under 5 chars); FIX — TOPIC-AUTO LAW: sanitizeJobPayload(article_generate) accepts an empty/short topic (no throw — JobPayloadError stays for future required fields); PROCESSORS.article_generate now calls pickSmartTopic(category, language) from blog-topics.ts — the SAME smart topic brain of the automated blog pipeline (AI pick in the requested language, pillar rotation, curated AR/EN fallbacks, duplicate-check vs published posts) — and enriches the result with autoTopic/focus_keyword/topic_rationale provenance; BlogAdminView: topic field demoted to optional (label «موضوع المقال (اختياري)», auto-pick explainer under the textarea, banner + live status strip say the system picks the title when left empty, submit button no longer disabled on empty topic); stale canary updated (ai-article-generate.test.ts now pins the accept-empty contract instead of the old throw); AGENTS.md §8 clause 5 TOPIC-AUTO LAW added | tsc 0 · vitest 120/120 (11 files) · lint 0 errors · guard clean · next build ✓ |
| Phase 24 | 2026-08-28 | TYPE-ROTATION + ARTICLE-GEN RELIABILITY (owner: «لم تولد المقال، عايز يكون فى تدوير لنوع المقالات (fitness, nutrition, workout, health, وهكذا)») — FORENSICS (run 33168556482 job logs): the article_generate job ACTUALLY SUCCEEDED on attempt 2 (✓ done in 138s, summary done=1 failedPermanent=0) but attempt 1 died + attempt 2 crawled because (a) maxTokens 7000 made prompt/4+7000+800 > 7200 → the chain's Groq big-payload guard forced OpenRouter-ONLY → nemotron 60s abort + gemma free-pool 429 storms, and (b) both auto-picks landed pillar=nutrition because pickRotationCategory saw only PUBLISHED posts (blog young → zero rows → all pillars Infinity → stable sort pins the first pillar); FIX A — GROQ ELIGIBILITY: article_generate maxTokens 7000→5000 (still ≈3600+ Arabic words vs the 800-1200-word contract; real request ≈ prompt+5000 < Groq 8000 TPM) → Groq (gpt-oss-120b, the model that answered the topic pick instantly) is reachable again; FIX B — ROTATION MEMORY: new blog-topics.getRecentGeneratedTopics(lang) reads recent DONE article_generate results from ai_jobs and pickSmartTopic merges them with published posts for BOTH pillar rotation AND duplicate-check (two consecutive auto-picks can no longer land on near-identical topics) + cold-start randomization when history is empty; FIX C — TYPE SELECTOR: BlogAdminView modal gains «نوع المقال» pills (تدوير تلقائي default = no category sent / or one pinned pillar of the 10 BLOG_CATEGORIES) with live explainer, payload carries category, sanitizer already whitelists it; category flows through the draft hand-off (result.category → sessionStorage draft → BlogEditorView prefill guarded by VALID_CATEGORY_IDS) so rotated articles are filed under the right pillar; canaries +3 (rotation away from last pillar, owner's named types present, mixed-history never repeats most recent) — CONTENT_PILLARS exposed read-only as PILLAR_IDS; AGENTS.md §8 clause 6 TYPE-ROTATION LAW added | tsc 0 · vitest 123/123 (11 files) · lint 0 errors (596 warnings) · guard clean · next build ✓ |
| Phase 25 | 2026-08-28 | DRAFT MATERIALIZATION + HONEST RUN COLOR (owner: «لم تنجح برده، انا تابعت اللوج هو بيفشل nod 20 وبعد كده مبيكملش وبيطلع اشارة خضراء كأن العملية نجحت») — FORENSICS: pulled runs 33170093433 + 33170236598 logs — BOTH article_generate jobs SUCCEEDED (✓ 30s and ✓ 12s on groq/gpt-oss-120b — the maxTokens fix landed) with rotation MOVING (weight-loss → muscle-gain); the owner's real problem: finished articles lived ONLY inside ai_jobs.result — visible solely if the live browser watcher caught the done event (mobile tab death / navigation = invisible article), plus log noise (Node 20 deprecation warnings from checkout@v4/setup-node@v4 internals + normal fallback-chain retry lines) read as failures under a green run; FIX A — DRAFT MATERIALIZATION LAW: materializeArticleDraft() in ai-job-processors inserts the finished article as a blog_posts DRAFT (is_published=false, source=ai:article_generate, M15 slug + collision retry, VALID_CATEGORY_IDS-guarded category, inline reading_time) BEFORE finishJob → result.post_id → BlogAdminView watcher routes to /admin/blog/:id (edit the real draft) with sessionStorage hand-off kept as fallback — the article is now IN the list no matter what the browser does; FIX B — HONEST RUN COLOR: process.mts exits 1 on failedPermanent>0 (workflow RED) + explicit summary lines + ::error annotation, green now genuinely means done=N failedPermanent=0; FIX C — Node hygiene: actions/checkout+setup-node bumped v4→v5 across ALL 5 workflows (Node 24 internals — Node 20 deprecation warnings gone; node-version stays 22 per the 2026-08-27 WebSocket law); FIX D — topic-pick maxTokens 600→800 (Groq json_validate_failed 'max completion' truncation observed) ; Summary step documents GREEN/RED semantics | tsc 0 · vitest 123/123 (11 files) · lint 0 errors (599 warnings) · guard clean · workflows yaml ✓ · next build ✓ |
| Phase 26 | 2026-08-28 | ARTICLE QUALITY FLOOR + ANTI-FORMULA OPENINGS (owner: «المقال خرج مشابه للمقالات القديمة قبل التعديلات، مقال سيء ونفس العناوين الثابتة القديمة والمدة للتوليد قصيرة جدا») — FORENSICS (run 33172035972): the topic pick was FRESH AI (HRV guide, pillar=health — rotation still moving, no curated fallback this time) and materialization worked (draft blog_posts#6a48ba56 logged) BUT the article was written by groq/gpt-oss-120b in ~5 SECONDS and passed only the markdown<200-char check → a shallow short draft landed as done; FIX: (a) QUALITY FLOOR — markdown word count < 550 throws → failJob requeues with a different lead model next round, so only drafts fulfilling the depth contract ever materialize + word count logged per generation; (b) DEPTH CONTRACT hardened — AR/EN prompts now demand 1100-1400 words mandatory, 6-9 ## sections, concrete numbers inside sections, «أخطاء شائعة» section, actionable step-by-step section, non-generic hook (bans «في عالم اللياقة» filler openings); (c) ANTI-FORMULA — each generation draws a random opening archetype (real scenario / genuine question / surprising statistic / common mistake / before-after contrast) so consecutive articles never share one skeleton; (d) maxTokens 5000→6000 (est ≈6975 < 7200, still Groq-eligible) funding the depth; system prompt now states shallow articles are rejected; AGENTS.md §8 clause 8 added | tsc 0 · vitest 123/123 (11 files) · lint 0 errors (599 warnings) · guard clean · next build ✓ |

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
