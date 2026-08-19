# PROGRESS.md — MuscleHub Shared Dashboard

> **آخر تحديث:** 2026-08-19 (Phase 7: documentation + governance hardening — MH-DOC-001)
> **الحالة السابقة (Phase 6):** ✅ كل المشاكل الحرجة محلولة + تحسينات سرعة Phase 6
> **الحالة الحالية (Phase 7):** تمت مراجعة التوثيق ضد الكود الفعلي وتم
> تصحيح الادعاءات القديمة. انظر قسم "Reconciled Status (Phase 7)" أسفل
> هذا الملف للوضع المُتحقَّق منه.
> **قاعدة التحكم:** هذا الملف هو لوحة التحكم والتسليم المشتركة. لا ننتقل لأي خطوة قادمة دون تحديث هذا الملف والحصول على الموافقة البشرية.

---

## 🔍 Reconciled Status (Phase 7 — 2026-08-19)

This section was added by task **MH-DOC-001** after a full re-inspection
of the actual source code against the previous documentation. The
rest of the file (below this section) is the prior Phase 1–6 record,
preserved for history.

### Verified statistics (from code, not docs)

| Metric | Verified value | How verified |
|---|---|---|
| TypeScript / TSX files in `src/` | **226** | `find src -name "*.ts" -o -name "*.tsx" \| wc -l` |
| Pages (`page.tsx`) | **47** (was claimed "40+") | `find src/app -name "page.tsx" \| wc -l` |
| API routes | **28** (was claimed 22, then 18) | `find src/app/api -name "route.ts*" \| wc -l` |
| shadcn UI components | **50** (was claimed 28) | `find src/components/ui -name "*.tsx" \| wc -l` |
| Views (`src/components/views/`) | **23** (was claimed 17) | `find src/components/views -name "*.tsx" \| wc -l` |
| Migrations | **12** (`0001` → `0012`) — consistent with docs | `ls supabase/migrations/` |
| Tables formally defined in migrations | **20** (was claimed 25 in README, 22 in DEVELOPER_GUIDE) | unique `CREATE TABLE` across migrations |
| Tables referenced in code but NOT in migrations | **3** (`plan_swaps`, `progress_photos`, `coach_presence`) | grep on `src/lib/data.ts` vs migration files |
| Exercises dataset | **870 entries** (868 is the marketing number) | `grep -c "slug:" src/lib/exercises.ts` |
| Foods dataset | **8,832 entries** (8,830 is the marketing number) | `grep -c "slug:" src/lib/foods.ts` |
| Test files (`.test.ts` / `.spec.ts`) | **0** | find across repo |
| `@ts-nocheck` occurrences in `src/` | **0** ✅ (verified removed) | `grep -r "@ts-nocheck" src/` |
| `ignoreBuildErrors` in `next.config.ts` | **Not present** ✅ (verified removed) | grep on `next.config.ts` |
| `scripts/` directory | **MISSING** ❌ (referenced in `package.json` build step) | `git ls-tree -r HEAD --name-only \| grep "^scripts/"` returns nothing |

### Production-readiness — evidence-based reassessment

The previous Phase 6 conclusion claimed "100% ready for commercial
launch" based on smoke-test pass rates. That claim was overconfident.
The reconciled assessment:

| Category | Status |
|---|---|
| Critical user flows (auth, checkout, meal plan save, support ticket) | ✅ Verified working in Phase 5 live QA |
| AI chat (EVO) | ⚠️ Code path fixed in Phase 6, but depends on `OPENROUTER_API_KEY` being set in Vercel env. **Not re-verified post-fix.** |
| Vercel auto-deploy from `main` | ❓ **Unverified** without Vercel API access — owner must confirm in Vercel dashboard |
| Local `bun run build` | ✅ **FIXED** (Phase 7, Master Repair Batch 001) — removed obsolete `node scripts/compress-images.js &&` prefix from `package.json` build script (B18). Now exits 0 with 73/73 static pages. |
| Production Vercel build | ✅ Works (uses `vercel.json` buildCommand `next build`, which bypasses the missing scripts dir) |
| Local i18n completeness | ✅ **FIXED** (Phase 7, Master Repair Batch 001) — added missing keys H4 (`prog.uploadPhoto`, `prog.photos`, `prog.noPhotos`); moved PlansView hardcoded Arabic strings to i18n H3; added `featuresEn` arrays to memberships H2. H1 (root html lang/dir) still unfixed. |
| Arabic route coverage | ✅ **IMPROVED** (Phase 7, Master Repair Batch 001) — `/ar/exercises` and `/ar/foods` now resolve (H6 fixed). Available Arabic routes: `/ar`, `/ar/blog`, `/ar/blog/[slug]`, `/ar/exercises`, `/ar/foods`. |
| Type safety | ✅ 0 errors (`tsc --noEmit` clean — was confirmed in Phase 6 commit log) |
| Test suite | ❌ No automated tests (unit, integration, E2E) exist |
| Documentation accuracy | ✅ Reconciled in Phase 7 (this task) |

### Distinct status taxonomy

To avoid the previous conflation of "passing smoke test" with "fully
verified," the following distinctions are now used:

- **Implemented** — code exists, compiles, no errors.
- **Verified** — manually tested in a real environment (local or
  production) and confirmed working.
- **Not verified** — code exists but was NOT tested in this pass.
- **Known issue** — a documented defect that has not been fixed.
- **Blocked** — work cannot proceed without external action
  (e.g. owner approval, env var config, third-party API access).
- **Pending** — planned but not started.

### Open items — reconciled priorities (updated Phase 7 — Master Verification Batch 002)

| ID | Item | Status | Notes |
|---|---|---|---|
| C5 | EVO AI may fall back to local replies if `OPENROUTER_API_KEY` not set in Vercel | **VERIFIED (code); CONFIGURATION-DEPENDENT (env)** — Phase 7 Master Verification Batch 002 re-inspected the complete AI provider path: `src/lib/ai-provider.ts` reads `OPENROUTER_API_KEY` (with `AI_API_KEY` fallback); `src/app/api/ai/chat/route.ts:179` checks `if (process.env.OPENROUTER_API_KEY \|\| process.env.AI_API_KEY)` before attempting AI call; falls back to `generateLocalReply()` with `source: "local"` on missing key OR AI failure OR reasoning-artifact cleanup failure. No hardcoded secrets found in source. Response shape includes `source: "openrouter:<model>"` / `"local"` / `"subscriber-gate"` for client-side debugging. **Application operates safely without the key** — local rule-based fallback is functional. | Owner must verify `OPENROUTER_API_KEY` is set in Vercel project env vars. |
| C6 | Vercel auto-deploy from `main` | **NOT VERIFIED — REQUIRES OWNER ACTION** — Phase 7 Master Verification Batch 002 confirmed: no `.vercel/` dir in repo, GitHub Actions workflow (`.github/workflows/generate-blog-post.yml`) handles only blog post generation (not deployment), `vercel.json` is deployment config only (no project-link metadata), no Vercel API integration available to agent. | Owner must check Vercel dashboard → Settings → Git → Production Branch + confirm latest deployment matches `f0f3a41`. |
| H1 | Root `<html lang="en" dir="ltr">` hardcoded | **UNFIXED — REQUIRES ARCHITECTURAL REFACTOR** — Phase 7 Master Verification Batch 002 inspected the Next.js App Router architecture. Confirmed: only the root `app/layout.tsx` can render `<html>` and `<body>` tags. Nested layouts (like `src/app/ar/layout.tsx`) can ONLY render `<div>` wrappers. The current mitigation (RTL `<div dir="rtl" lang="ar">` wrapper + `Content-Language: ar-EG` middleware header) is the maximum achievable WITHOUT a major route-group refactor. The proper fix requires one of: (a) moving all 47 `page.tsx` + 16 layouts under `src/app/[locale]/` with `generateStaticParams` (standard Next.js i18n routing — substantial refactor, high risk to OAuth callback, sitemap, redirects, static gen); (b) replacing the client-side `useI18n()` context with server-side `cookies()`-based locale detection in the root layout (medium risk). Neither is safe to implement in a verification batch. Smoke test confirmed current state: all `/ar/*` routes render `<html lang="en" dir="ltr">` at the root level — the RTL wrapper div handles visual RTL but crawlers see the English root attribute. | **Out of scope for verification batch.** Should be its own dedicated task with explicit supervisor sign-off on the architectural approach. H1 stays open. |
| H2 | Membership `features` arrays are Arabic-only | ✅ **FIXED** (Master Repair Batch 001) — added `featuresEn: string[]` field to `MembershipInfo` type + populated for all 4 tiers (Free, Premium, Pro, Coaching) in `src/lib/memberships.ts`. Updated consumers in `src/app/memberships/page.tsx` (lines 136, 227) to use `isAr ? tier.features : tier.featuresEn`. |
| H3 | Hardcoded Arabic in `PlansView` English mode | ✅ **FIXED** (Master Repair Batch 001) — added 11 i18n keys under `plans.swaps.*` namespace in both `en` and `ar` dicts in `src/lib/i18n.tsx`. Replaced 7 hardcoded Arabic strings in `src/components/views/PlansView.tsx` (2 swap quota display strings + 6 toast messages) with `t()` calls. The print/PDF template (lines 149-303) intentionally remains Arabic-only — it's a printable plan document for coach-generated plans and is out of scope. |
| H4 | Missing i18n keys (`prog.uploadPhoto`, `prog.photos`, `prog.noPhotos`) | ✅ **FIXED** (Master Repair Batch 001) — added 3 keys to both `en` and `ar` dicts in `src/lib/i18n.tsx`. Consumed in `src/components/views/ProgressView.tsx` (lines 149, 217, 220, 225, 294). |
| H5 | Some blog posts may still have `author = 'Ahmed Zake'` | **PARTIALLY FIXED — REQUIRES OWNER ACTION for data cleanup** — Phase 7 Master Verification Batch 002 discovered the root cause: migration `0002_blog_posts_and_is_coach_grant.sql:36` sets `author text not null default 'Ahmed Zake'`. Application code already overrides this (`BlogEditorView.tsx:38` sets `author: 'MuscleHub'`; `step3-publish/route.ts:117` sets `author: 'MuscleHub'`). Created migration `0013_blog_posts_author_default_musclehub.sql` that changes ONLY the column default to `'MuscleHub'` — idempotent, non-destructive (doesn't touch existing rows). This prevents FUTURE inserts from inheriting the legacy name. **Existing rows with `author = 'Ahmed Zake'` still require a separate data-cleanup SQL** (owner must run on Supabase SQL Editor): `UPDATE blog_posts SET author='MuscleHub' WHERE author='Ahmed Zake';` Could not verify whether existing rows still contain the legacy name — no DB access available. | Owner must apply migration `0013` to production Supabase + run the `UPDATE` cleanup SQL. |
| H6 | `/ar/exercises`, `/ar/foods` return 404 | ✅ **FIXED** (Master Repair Batch 001, revised) — created `src/app/ar/exercises/page.tsx` and `src/app/ar/foods/page.tsx`. Revised to pass `lang="ar"` prop to source pages so Arabic renders regardless of localStorage state (matches established `/ar/blog/page.tsx` → `<BlogListPage lang="ar" />` pattern). Smoke test confirmed: `/ar/exercises` renders "مكتبة التمارين", `/ar/foods` renders "مكتبة الأكلات" with no localStorage. |
| M1 | Newsletter copy in tool pages | ✅ **FALSE POSITIVE** (Master Repair Batch 001) — `LeadCaptureCard` is an intentional lead-capture feature (component docstring: "Collects the visitor's email and stores it as a lead in the `tool_leads` table"). Not a bug. Used in 4 tool pages (calorie, bmi, macro, body-fat). Not modified. |
| M2 | Coach routes don't redirect non-coaches | ✅ **FIXED** (Master Repair Batch 001) — added `useEffect` redirect to `/dashboard` when `!isCoach` in all 3 coach route pages: `src/app/(app)/coach/page.tsx`, `coach/payments/page.tsx`, `coach/support/page.tsx`. Uses existing `useAuth().isCoach` check (no auth/RLS architecture change). The `(app)/layout.tsx` auth gate already redirects unauthenticated users to `/auth`. |
| M3 | Duplicate blog URL in sitemap | **NOT VERIFIED — REQUIRES OWNER ACTION** — Phase 7 Master Verification Batch 002 confirmed: schema has `(slug, language)` unique index (`blog_posts_slug_language_uidx`, migration `0002:47-48`) so duplicate slugs within the SAME language are impossible at the DB level. The reported duplicate `best-protein-powder-muscle-growth-copy-msn3h2hm` was likely either: (a) a `-copy-` suffixed slug from the admin "duplicate post" flow (`src/lib/blog-admin.ts:77` generates `${original.slug}-copy-${Date.now().toString(36)}` — technically a unique slug, just confusingly named), or (b) EN + AR posts sharing the same slug (allowed by design — see migration comment "so EN and AR can each have /best-workout", they generate different URLs `/blog/foo` vs `/ar/blog/foo`). Sitemap code itself is correct (one URL per `blog_posts` row, no dedup needed given the unique constraint). Could not verify whether actual duplicate rows exist — no DB access available. | Owner should run read-only query on Supabase to find any actual duplicates: `SELECT slug, language, count(*) FROM blog_posts GROUP BY slug, language HAVING count(*) > 1;` (should return 0 rows if the unique index is intact). |
| M4 | Profile shows "4 Tools" instead of "6 Tools" | ✅ **FIXED** (Master Repair Batch 001) — updated `src/app/profile/page.tsx:153` to display "6" (verified: actual tool count is 6 — 5 calculators + 1 meal planner, confirmed via `tools/page.tsx` listing). |
| M5 | Redundant "Pricing" nav entry | ✅ **FIXED** (Master Repair Batch 001) — removed the redundant "Pricing" entry from `src/components/SiteHeader.tsx` (lines 141-146). The "Memberships" entry (which used `href="/memberships"`) was preserved; both previously navigated to the same destination. |
| B18 | `scripts/compress-images.js` referenced but `scripts/` dir missing | ✅ **FIXED** (Master Repair Batch 001) — removed the obsolete `node scripts/compress-images.js && ` prefix from `package.json` `build` script. The standalone `compress-images` script entry is preserved (untouched per supervisor instruction "do not modify unrelated scripts"). `bun run build` now exits 0. Verified: `scripts/` dir was never committed to git history (`git log --all -- scripts/` returns nothing), and `compress-images.js` is not referenced anywhere else in the codebase. |
| **NEW (B002)** | `/ar/memberships` returns 404 (no Arabic mirror route) | ✅ **FIXED** (Phase 7, Master Verification Batch 002, amended) — discovered during smoke test, then fixed in the same batch. Created `src/app/ar/memberships/page.tsx` (Arabic mirror wrapper passing `lang="ar"`). Added optional `lang?: Lang` prop to `MembershipsPage` in `src/app/memberships/page.tsx` using the same override pattern as H6 (`ExercisesPage`, `FoodsPage`). When no `lang` prop is passed, source page behaves exactly as before (`useI18n()` value wins). Smoke test confirmed: `/ar/memberships` returns HTTP 200 with 8/8 Arabic UI markers and 0 English markers, regardless of localStorage state. |
| B16 | Recharts (~600KB) in deps but lazy-loaded | Accepted | Design decision — code-split out of initial bundle |
| B17 | Framer Motion animations disabled | Accepted | Design decision — owner decision to avoid layout jank |

### Master Verification Batch 002 — verification summary (Phase 7, 2026-08-19)

**Scope:** Re-verify the 5 remaining items from Master Repair Batch 001 (C5, C6, H5, M3, H1) against the current repository state at HEAD `f0f3a41`. Targeted remediation only if safe.

**Verification results:**
- ✅ **C5 — VERIFIED (code), CONFIGURATION-DEPENDENT (env)** — AI provider code path is correct and safe. Application operates gracefully without `OPENROUTER_API_KEY` (local rule-based fallback). Owner must verify env var is set in Vercel.
- ⚠️ **C6 — NOT VERIFIED, REQUIRES OWNER ACTION** — No repo-side evidence of Vercel↔GitHub link. Owner must check Vercel dashboard.
- ✅ **H5 — PARTIALLY FIXED** — Created migration `0013_blog_posts_author_default_musclehub.sql` to fix the schema default (root cause). Existing data cleanup requires separate owner-run SQL. Could not verify data state (no DB access).
- ⚠️ **M3 — NOT VERIFIED, REQUIRES OWNER ACTION** — Sitemap code is correct. `(slug, language)` unique index prevents duplicates within a language. Reported "duplicate" was likely a `-copy-` suffixed slug from the duplicate-post flow (technically unique) or EN/AR variants of the same slug (allowed by design, generates different URLs). Owner should run read-only query to confirm.
- ⚠️ **H1 — UNFIXED, REQUIRES ARCHITECTURAL REFACTOR** — Proper fix requires route-group refactor (move 47 pages + 16 layouts under `src/app/[locale]/`) or replacing client-side `useI18n()` with server-side `cookies()`-based detection. Neither is safe to implement in a verification batch. Out of scope. Mitigation (RTL wrapper div + `Content-Language: ar-EG` header) preserved.

**New finding (not previously documented):**
- ✅ `/ar/memberships` initially returned 404 (no Arabic mirror route existed). Discovered during smoke test. **FIXED in the same batch (amended commit)** — created `src/app/ar/memberships/page.tsx` (Arabic mirror wrapper passing `lang="ar"` to `MembershipsPage`). Added optional `lang?: Lang` prop to `MembershipsPage` in `src/app/memberships/page.tsx` using the same override pattern as H6 (`ExercisesPage`, `FoodsPage`). When no `lang` prop is passed, source page behaves exactly as before. Smoke test confirmed: `/ar/memberships` returns HTTP 200 with 8/8 Arabic UI markers (عضويات MuscleHub, شهري, سنوي, الأكثر شعبية, مقارنة العضويات, سياسة الاسترداد, مجاني للأبد, etc.) and 0 English markers, regardless of localStorage state.

**Verification commands run:**
- `tsc --noEmit` → exit 0 (0 TypeScript errors)
- `bun run build` → exit 0, "Compiled successfully in 11.1s", 74/74 static pages (was 73 — added `/ar/memberships`)
- `bun run lint` → 4 errors + 5 warnings — ALL pre-existing in untouched src/ files (CookieConsent, SaveResultButton, checkout/page, foods/[slug], water-tracker, AdSenseAd, BlogAdminView). 0 new errors introduced. Modified files (`src/app/memberships/page.tsx`, `src/app/ar/memberships/page.tsx`) are clean.
- `git diff --check` → no whitespace errors
- Smoke-tested 5 routes via local dev server:
  - `/memberships` → HTTP 200 (English UI intact: "MuscleHub Memberships", "Monthly", "Yearly", "Most Popular", "Compare all plans", "Refund policy", "Free forever"; 0 Arabic markers)
  - `/ar/memberships` → HTTP 200 (Arabic UI: "عضويات MuscleHub", "شهري", "سنوي", "الأكثر شعبية", "مقارنة العضويات", "سياسة الاسترداد", "مجاني للأبد"; 0 English markers) — **works regardless of localStorage state**
  - `/ar/exercises` → HTTP 200, "مكتبة التمارين" ✅ (still works)
  - `/ar/foods` → HTTP 200, "مكتبة الأكلات" ✅ (still works)
  - `/ar/blog` → HTTP 200, "مدونة MuscleHub" ✅ (still works)
- H1 root html lang/dir inspection (still unfixed, per supervisor decision):
  - `/memberships` → `<html lang="en" dir="ltr">` (correct)
  - `/ar/memberships` → `<html lang="en" dir="ltr">` (incorrect — should be `ar/rtl` — but H1 is out of scope per supervisor instruction)



### Master Repair Batch 001 — verification summary (Phase 7, 2026-08-19)

**Repairs completed:** 8 (B18, H2, H3, H4, H6, M2, M4, M5)
**False positives:** 1 (M1 — `LeadCaptureCard` is intentional)
**Not verifiable from code:** 3 (H5 — needs Supabase DB; M3 — needs Supabase DB; C6 — needs Vercel dashboard)
**Config-dependent:** 1 (C5 — code is correct, owner must verify Vercel env var)
**Out of scope:** 1 (H1 — proper fix requires route-group refactor, separate task)

**Verification commands run:**
- `tsc --noEmit` → exit 0 (0 TypeScript errors)
- `bun run lint` → 4 errors + 5 warnings — ALL pre-existing in src/ files NOT touched by this batch (CookieConsent, SaveResultButton, checkout/page, foods/[slug], water-tracker, AdSenseAd, BlogAdminView). 0 new errors introduced.
- `bun run build` → exit 0, "Compiled successfully in 11.7s", 73/73 static pages (was 71 — added `/ar/exercises` + `/ar/foods`)
- Smoke-tested 11 routes via local dev server — all returned HTTP 200



### Documentation accuracy fixes (this task)

The previous docs had the following inaccuracies, all fixed in this
Phase 7 pass:

1. README claimed "25 tables" — actual is 20 via migrations + 3 ad-hoc
   on production.
2. README claimed "11 migrations (0001 → 0011)" — actual is 12
   (0001 → 0012).
3. README claimed "22 API endpoints" — actual is 28.
4. README claimed "40+ pages" — actual is 47.
5. README claimed "28 shadcn components" — actual is 50 files (some
   are utility files, not all are UI components).
6. README claimed "17 views" — actual is 23.
7. DEVELOPER_GUIDE claimed tier priority `coaching (4) > pro (3) >
   premium (2) > elite (1) > free (0)` — actual code has 4 tiers only
   (no `elite`), priority `pro(3) > premium(2) > free(0)`, and
   `coaching` is treated separately.
8. DEVELOPER_GUIDE claimed `typescript.ignoreBuildErrors: true` is
   enabled — verified absent from `next.config.ts`.
9. DEVELOPER_GUIDE claimed "ESLint not enabled in build" — verified
   Next.js 16 dropped the eslint config from `next.config.ts`; lint
   runs via `bun run lint`.
10. QA_CHECKLIST final summary claimed "130/130" tests pass — actual
    breakdown verified but several "pass" entries are smoke checks,
    not functional verification. Re-labelled in QA_CHECKLIST.
11. PROGRESS stats table claimed 22 DB tables — reconciled to 20
    (migrations) + 3 (ad-hoc).
12. PROGRESS stats table claimed 22 API routes — reconciled to 28.
13. PROGRESS stats table claimed "~120 src files" — actual is 226.
14. PROGRESS stats table claimed "40+ pages" — actual is 47.

---

## 📦 التقنيات المستخدمة

| التقنية | الإصدار | الوظيفة |
|---|---|---|
| Next.js | 16.3.0 | Framework (App Router, Turbopack) |
| React | 19.2.8 | UI Library |
| TypeScript | 5.9.3 | ✅ مُفعّل بالكامل — 0 أخطاء, لا @ts-nocheck |
| Tailwind CSS | 4.3.3 | Styling |
| shadcn/ui | كامل | UI Components |
| Supabase | — | Postgres + Auth + Storage + RLS |
| OpenRouter | free models | EVO AI + Blog generation |
| @vercel/og | 1.0.1 | Dynamic OG image generation |
| @vercel/analytics | 2.0.1 | Pageview tracking |
| @vercel/speed-insights | 2.0.0 | Core Web Vitals |
| Recharts | 3.10.1 | Weight charts (lazy-loaded) |
| Framer Motion | 13.1.0 | Animations (مُعطّل حالياً) |

---

## ✅ الميزات المكتملة 100% (مُجمّدة — Feature Freeze)

هذه الميزات تم اختبارها وتعمل بشكل كامل في الإنتاج. **لا يتم تعديلها إلا لإصلاح bug حرج.**

### 1. الصفحات العامة (Public Pages)

| # | الميزة | المسار | الحالة |
|---|---|---|---|
| 1 | الصفحة الرئيسية | `/` | ✅ مكتملة |
| 2 | المدونة (قائمة + مقال) | `/blog`, `/ar/blog` | ✅ مكتملة |
| 3 | مكتبة التمارين (868+) | `/exercises` | ✅ مكتملة |
| 4 | مكتبة الأكلات (8,830+) | `/foods` | ✅ مكتملة |
| 5 | برامج التدريب | `/programs` | ✅ مكتملة |
| 6 | صفحة الكوتشينج | `/coaching` | ✅ مكتملة |
| 7 | صفحة EVO | `/evo` | ✅ مكتملة |
| 8 | صفحة العضويات | `/memberships` | ✅ مكتملة |
| 9 | FAQ | `/faq` | ✅ مكتملة |
| 10 | About / Contact / Privacy / Terms | صفحات ثابتة | ✅ مكتملة |
| 11 | دعم العربية (RTL) | `/ar/*` | ✅ مكتملة |

### 2. نظام المصادقة (Auth)

| # | الميزة | الحالة |
|---|---|---|
| 12 | تسجيل بالبريد + كلمة المرور | ✅ مكتمل |
| 13 | Google OAuth (PKCE) | ✅ مكتمل |
| 14 | إدارة الجلسات (middleware) | ✅ مكتمل |
| 15 | Auto-bootstrap للكوتش | ✅ مكتمل |

### 3. نظام العضويات (Memberships)

| # | الميزة | الحالة |
|---|---|---|
| 16 | 4 مستويات (Free / Premium / Pro / Coaching) | ✅ مكتمل |
| 17 | أسعار: $14.99 / $29.99 / $39.99 | ✅ مكتمل |
| 18 | حدود لكل مستوى (EVO, خطط, حفظ, PDF) | ✅ مكتمل |
| 19 | اشتراكات متعددة (Coaching + Premium معاً) | ✅ مكتمل |
| 20 | `useMembershipTier` hook | ✅ مكتمل |
| 21 | جدول مقارنة العضويات | ✅ مكتمل |

### 4. الأدوات (Tools)

| # | الميزة | المسار | الحالة |
|---|---|---|---|
| 22 | حاسبة السعرات | `/tools/calorie-calculator` | ✅ مكتمل |
| 23 | حاسبة BMI | `/tools/bmi-calculator` | ✅ مكتمل |
| 24 | حاسبة الماكروز | `/tools/macro-calculator` | ✅ مكتمل |
| 25 | حاسبة الدهون | `/tools/body-fat-calculator` | ✅ مكتمل |
| 26 | متتبع الماء | `/tools/water-tracker` | ✅ مكتمل |
| 27 | مخطط الوجبات | `/meal-planner` | ✅ مكتمل |
| 28 | حفظ النتائج (3/50/200/∞) | API + UI | ✅ مكتمل |
| 29 | تصدير PDF (Premium+) | Canvas → JPEG → PDF | ✅ مكتمل |
| 30 | تصدير JSON | Client-side blob | ✅ مكتمل |

### 5. EVO AI Chat

| # | الميزة | الحالة |
|---|---|---|
| 31 | Floating widget على كل الصفحات | ✅ مكتمل |
| 32 | Anonymous: 10 رسائل/يوم | ✅ مكتمل |
| 33 | Subscriber gating (خطة تغذية/تمرين/تبديل) | ✅ مكتمل |
| 34 | Platform search (تمارين + أكلات + برامج + مدونة) | ✅ مكتمل |
| 35 | 6 نماذج free fallback chain | ✅ مكتمل |

### 6. داشبورد الكوتش

| # | الميزة | الحالة |
|---|---|---|
| 36 | قائمة العملاء (10 فلاتر) | ✅ مكتمل |
| 37 | إدارة العميل (6 tabs) | ✅ مكتمل |
| 38 | مراجعة الدفعات | ✅ مكتمل |
| 39 | صندوق الدعم | ✅ مكتمل |
| 40 | اشتراكات متعددة لكل عميل | ✅ مكتمل |

### 7. المدونة

| # | الميزة | الحالة |
|---|---|---|
| 41 | CMS كامل (قائمة + محرر) | ✅ مكتمل |
| 42 | AI generation (cron 3-step pipeline) | ✅ مكتمل |
| 43 | Cleanup endpoint (إصلاح نصوص مشوهة) | ✅ مكتمل |
| 44 | JSON-LD + OG images ديناميكية | ✅ مكتمل |

### 8. الإشعارات

| # | الميزة | الحالة |
|---|---|---|
| 45 | إشعارات المستخدمين (polling 30s) | ✅ مكتمل |
| 46 | إشعارات الكوتش (server-side bypass) | ✅ مكتمل |
| 46a | إشعار تذكير التقدم الأسبوعي (Vercel Cron) | ✅ مكتمل |

### 9. أنظمة أخرى

| # | الميزة | الحالة |
|---|---|---|
| 47 | نظام الإحالات (20% عمولة + payouts) | ✅ مكتمل |
| 48 | تتبع التقدم (weight chart + photos) | ✅ مكتمل |
| 49 | الاستبيانات (تغذية + لياقة) — تعديل في أي وقت + تنقل + إرسال | ✅ مكتمل |
| 50 | الدفع (InstaPay/Vodafone + receipt) | ✅ مكتمل |
| 51 | SEO (sitemap + robots + JSON-LD + hreflang) | ✅ مكتمل |
| 52 | Vercel Analytics + Speed Insights | ✅ مكتمل |
| 53 | GA4 + AdSense (auto-suppressed on auth routes) | ✅ مكتمل |
| 54 | PWA (manifest + service worker) | ✅ مكتمل |

---

## 🐛 المشاكل والثغرات المتبقية (Remaining Bugs/Blockers)

مرتبة حسب الأولوية:

### 🔴 أولوية عالية (تؤثر على تجربة المستخدم)

| # | المشكلة | الملف | الوصف | الحل المقترح |
|---|---|---|---|---|
| B1 | ~~صفحة البروفايل تعرض Tier = "free" دائماً~~ | `src/app/profile/page.tsx` | ✅ **تم الإصلاح** — استبدال بـ `useMembershipTier(profile)` hook | — |
| B2 | ~~تناقض البراند في PDF/OG images~~ | `src/lib/result-png-export.ts`, `src/app/api/og-image/[slug]/route.tsx` | ✅ **تم الإصلاح** — استبدال MuscleHubFit → MuscleHub + musclehubfit.com → musclehubeg.vercel.app | — |
| B3 | ~~`start` script لا يعمل محلياً~~ | `package.json` | ✅ **تم الإصلاح** — تغيير لـ `next start` | — |
| B4 | ~~Migration 0011 + 0012 لم يُطبّق على الإنتاج~~ | `supabase/migrations/` | ✅ **تم التطبيق** — migrations 0011 (multi-subscriptions) + 0012 (price_egp → price_usd) شُغّلت يدوياً على Supabase SQL Editor | — |

### 🔥 مشاكل حرجة اكتُشفت في فحص QA 2026-08-19 (Phase 5)

| # | المشكلة | الوصف | الحالة |
|---|---|---|---|
| C1 | ~~Checkout فاشل: price_usd معرّف كـ INTEGER~~ | `invalid input syntax for type integer: "14.99"` عند الإرسال | ✅ **تم الإصلاح** — `ALTER COLUMN price_usd TYPE numeric(10,2)` على Supabase SQL Editor. تم اختبار checkout بنجاح |
| C2 | ~~meal_plans table غير موجودة في الإنتاج~~ | "Failed to save" عند حفظ مخطط وجبات + خطأ "Could not find the table 'public.meal_plans' in the schema cache" | ✅ **تم الإصلاح** — `CREATE TABLE meal_plans` (+ RLS policies). تم اختبار حفظ خطة بنجاح |
| C3 | ~~support_tickets ناقصة الأعمدة~~ | عمودا `priority` و `status` غير موجودين + ticket_priority/ticket_status enums غير مُعرّفة | ✅ **تم الإصلاح** — `ADD COLUMN priority text` + `ADD COLUMN status text` + CHECK constraints + types. تم اختبار إنشاء تذكرة بنجاح |
| C4 | ~~3 جداول مفقودة من migrations~~ | `plan_swaps`, `progress_photos`, `coach_presence` مستخدمة في `src/lib/data.ts` لكنها غير مُعرّفة في أي migration | ✅ **تم الإصلاح** — `CREATE TABLE` لكل الجداول الثلاثة + RLS policies |
| C5 | ~~EVO AI يستخدم local fallback فقط~~ | `source: "local"` بدلاً من `source: "openrouter:MODEL_NAME"` — ردود غير منطقية | ✅ **تم الإصلاح** (Phase 6) — `OPENROUTER_API_KEY` كان مهيأ لكن النماذج بترجع thinking artifacts. أضفنا `callFreeOpenRouterRace` (Promise.any) + cleanup قوي للـ thinking patterns |
| C6 | Vercel project غير مربوط بـ GitHub | التغييرات في `main` branch لا تُنشر تلقائياً | ⚠️ **متبقي** — Vercel Dashboard → Project Settings → Git → Connect Repository |

### 🟠 مشاكل عالية الأولوية (مكتشفة في فحص QA 2026-08-19)

| # | المشكلة | الوصف | الحالة |
|---|---|---|---|
| H1 | عنصر HTML الجذري dir="ltr" lang="en" على كل الصفحات العربية | `src/app/layout.tsx` hardcoded — يفترض تطبيق `dir="rtl" lang="ar"` على `/ar/*` | ⚠️ **متبقي** — يستلزم refactor لـ route groups أو generateMetadata() |
| H2 | صفحة /memberships تُظهر features بالعربية فقط حتى في النسخة الإنجليزية | `src/lib/memberships.ts` features array مكتوب بالعربية فقط | ✅ **تم** (Phase 7, Master Repair Batch 001) — أضفنا `featuresEn` array لكل الـ 4 tiers + تحديث الـ consumers |
| H3 | صفحة /plans تحتوي نص عربي مُدمج في النسخة الإنجليزية | "تبديل الوجبات اليوم: 2/2 متبقي" في `src/components/views/PlansView.tsx` | ✅ **تم** (Phase 7, Master Repair Batch 001) — نقل 7 نصوص لـ i18n keys + إضافة 11 مفتاح تحت `plans.swaps.*` |
| H4 | مفاتيح i18n مفقودة | `prog.uploadPhoto`, `prog.photos`, `prog.noPhotos` في `src/lib/i18n.tsx` | ✅ **تم** (Phase 7, Master Repair Batch 001) — إضافة المفاتيح الناقصة لكل من en و ar |
| H5 | اسم الكاتب "Ahmed Zake" لا يزال يظهر في مقالات المدونة | في `blog_posts.author` field بـ DB | 🔶 **جزئياً** (Phase 7, Master Verification Batch 002) — migration `0013` بتغيّر الـ column default لـ `'MuscleHub'` (root cause fix). تنظيف البيانات الموجودة يحتاج SQL منفصل من الـ owner |
| H6 | /ar/exercises و /ar/foods تُرجع 404 | لا توجد صفحات mirror عربية | ✅ **تم** (Phase 7, Master Repair Batch 001) — إضافة `src/app/ar/exercises/page.tsx` + `src/app/ar/foods/page.tsx` كـ re-export wrappers |

### 🟡 مشاكل متوسطة الأولوية (مكتشفة في فحص QA 2026-08-19)

| # | المشكلة | الوصف | الحالة |
|---|---|---|---|
| M1 | نشرة بريدية "Subscribe to our newsletter" لا تزال في صفحات الأدوات | رغم PROGRESS.md ذكر إزالتها سابقاً | ✅ **FALSE POSITIVE** (Phase 7) — `LeadCaptureCard` ميزة lead-capture مقصودة، مش bug |
| M2 | /coach و /coach/payments و /coach/support لا تُعيد توجيه المستخدم العادي | يعرضون محتوى dashboard بدلاً من redirect | ✅ **تم** (Phase 7, Master Repair Batch 001) — إضافة redirect لـ `/dashboard` لما `!isCoach` |
| M3 | URL مكرر في sitemap | `/blog/best-protein-powder-muscle-growth-copy-msn3h2hm` | 🔶 **غير قابل للتحقق من الكود** (Phase 7, Master Verification Batch 002) — أكدنا أن schema فيها `(slug, language)` unique index، فالتكرار في نفس اللغة مستحيل. السبب المرجّح: `-copy-` suffix من admin duplicate-post flow، أو EN + AR بنفس slug (مسموح تصميمياً). يلزم استعلام Supabase read-only للتأكد: `SELECT slug, language, count(*) FROM blog_posts GROUP BY slug, language HAVING count(*) > 1;` |
| M4 | عدّاد "4 Tools" في البروفايل خاطئ | يفترض "6 Tools" (5 calculators + meal planner) | ✅ **تم** (Phase 7, Master Repair Batch 001) — تحديث القيمة لـ "6" |
| M5 | "Pricing" tab لا يزال في navigation | رغم إعادة التسمية إلى Memberships | ✅ **تم** (Phase 7, Master Repair Batch 001) — إزالة الـ entry المكرر |

### 🟡 أولوية متوسطة (نوعية الكود)

| # | المشكلة | الملف | الوصف | الحل المقترح |
|---|---|---|---|---|
| B5 | ~~`@ts-nocheck` على 12 ملف~~ | 12 ملف | ✅ **تم الإصلاح** — إزالة `@ts-nocheck` + إصلاح 115 خطأ TypeScript | — |
| B6 | ~~`ignoreBuildErrors: true`~~ | `next.config.ts` | ✅ **تم الإصلاح** — Build يفشصل على أخطاء TS دلوقتي | — |
| B7 | ~~`supabase/types.ts` قديم~~ | `src/lib/supabase/types.ts` | ✅ **تم التحديث** — إضافة 13 جدول ناقص + إصلاح أعمدة (subscription_type, price_usd, email, referral_code) + 3 جداول إضافية | — |
| B8 | ~~`adsEnabled` limit غير مستخدم~~ | `src/lib/memberships.ts`, `src/components/AdSenseAd.tsx` | ✅ **تم الإصلاح** — `AdSenseAd` دلوقتي بيتحقق من `getLimits(tier).adsEnabled` + `adsEnabled: false` لـ Pro/Coaching | — |
| B9 | ~~`chat_messages` table غير مستخدم~~ | `src/lib/evo-chat-context.tsx` | ✅ **تم الإصلاح** — مزامنة Supabase للمشتركين (fire-and-forget) + localStorage كـ fallback | — |
| B10 | ~~كود `speerr@gmail.com` hardcoded~~ | `src/lib/data.ts` | ✅ **تم الإصلاح** — نقل لـ `COACH_EMAILS` env var (comma-separated) | — |

### 🟢 أولوية منخفضة (تنظيف)

| # | المشكلة | الملف | الوصف | الحل المقترح |
|---|---|---|---|---|
| B11 | ~~`/api/og/[slug]` legacy route~~ | ✅ **تم الحذف** — استبدال المرجع في BlogArticlePage بـ `/api/og-image/` | — |
| B12 | ~~`/pricing` page لسه موجودة~~ | ✅ **تم الحذف** — استبدال كل `navigate("pricing")` بـ `navigate("memberships")` + حذف من `View` type | — |
| B13 | ~~`/api/admin/run-migration` endpoint~~ | ✅ **تم الحذف** — endpoint مؤقت تمت إزالته | — |
| B14 | ~~`reactStrictMode: false`~~ | ✅ **تم الإصلاح** — `reactStrictMode: true` | — |
| B15 | ~~`price_egp` field name~~ | `subscription_requests` table | ✅ **تم الإصلاح** — إعادة تسمية لـ `price_usd` (migration 0012) + إصلاح bug قسمة العمولة (/50) | — |
| B16 | **`WeightChart` lazy-loaded but Recharts still in deps** | `package.json` | recharts (~600KB) مثبت لكن lazy-loaded فقط في ProgressView | مقبول — لا حاجة لتغيير |
| B17 | **Framer Motion animations مُعطّلة** | `src/components/motion.tsx` | Reveal + StaggerGroup + StaggerItem بتعمل render مباشر بدون animation | مقبول كقرار تصميمي — 유جر 직عّلها بسبب اهتزاز |

---

## 📚 حالة التوثيق والاختبارات

### التوثيق (مُحدَّث في Phase 7 — 2026-08-19)

| العنصر | الحالة | التفاصيل |
|---|---|---|
| **README.md** | ✅ مُحدَّث (Phase 7) | تم تصحيح أعداد الجداول، migrations، API routes، صفحات، shadcn components، views |
| **DEVELOPER_GUIDE.md** | ✅ مُحدَّث (Phase 7) | تم تصحيح إعدادات TypeScript، ESLint، AI provider architecture، tier priorities |
| **QA_CHECKLIST.md** | ✅ مُحدَّث (Phase 7) | تمييز واضح بين smoke tests و functional verification |
| **AGENTS.md** | ✅ جديد (Phase 7) | قواعد تشغيل الـ AI agents |
| **PROJECT_CONTEXT.md** | ✅ جديد (Phase 7) | هوية المشروع + الحالة الحالية |
| **SECURITY.md** | ✅ جديد (Phase 7) | سياسة أمنية شاملة |
| **LICENSE** | ✅ جديد (Phase 7) | proprietary / all-rights-reserved |
| **worklog.md** | ✅ محدّث | يحتوي على سجل كامل لكل التغييرات |
| **تعليقات الكود** | ✅ ممتاز | كل ملف حر له header comment يشرح الوظيفة + القرارات التصميمية |
| **.env.example** | ✅ موجود | يوثّق كل الـ env vars المطلوبة |
| **API documentation** | ✅ مكتمل (Phase 7) | جدول في DEVELOPER_GUIDE §8 يوثّق كل الـ 28 route |
| **Database schema docs** | ⚠️ جزئي | جدول في DEVELOPER_GUIDE §4 يوثّق الـ tables لكن مفيش ERD رسمي |

### الاختبارات (Tests) — مُحدَّث في Phase 7

| النوع | الحالة | التفاصيل |
|---|---|---|
| **Unit tests** | ❌ غير موجود | مفيش أي ملفات `.test.ts` أو `.spec.ts` في المشروع (تأكيد عبر `find`) |
| **Integration tests** | ❌ غير موجود | مفيش اختبارات للـ API routes |
| **E2E tests** | ❌ غير موجود | مفيش Playwright / Cypress / Selenium |
| **Type checking** | ✅ مُفعّل | 0 أخطاء — `tsc --noEmit` نظيف + `@ts-nocheck` مُزالة من الكود + `ignoreBuildErrors` غير موجود في `next.config.ts` |
| **ESLint** | ✅ مُفعّل | `bun run lint` يشغّل ESLint (`eslint.config.mjs` flat config). Next.js 16 dropped eslint config from `next.config.ts` — مش معطّل، بيشتغل عبر `bun run lint` |
| **Smoke tests (manual)** | ⚠️ Phase 1 + 5 | تم فحص 95+30 نقطة يدوياً عبر curl + agent-browser على المباشر — لكن هذه **smoke tests** وليست functional verification |
| **Build verification** | ⚠️ مكسور محلياً | `bun run build` يفشل بسبب `scripts/compress-images.js` غير موجود (B18). Vercel production build يعمل (يستخدم `next build` مباشرة من `vercel.json`) |

---

## 📊 إحصائيات المشروع

> **ملاحظة Phase 7 (2026-08-19):** القيم التالية تم تصحيحها بناءً على
> فحص الكود الفعلي. القيم القديمة (المشطوبة) محفوظة للمرجعية التاريخية.

| المقياس | القيمة (مُتحقَّق منها) | القيمة القديمة |
|---|---|---|
| عدد ملفات الكود (`.ts` + `.tsx`) في `src/` | **226** | ~120 |
| عدد الـ API routes | **28** | 22 |
| عدد الصفحات (`page.tsx`) | **47** | 40+ |
| عدد جداول الـ DB (مُعرّفة في migrations) | **20** | 22 |
| عدد جداول مُستخدمة في الكود لكن غير موجودة في migrations | **3** (`plan_swaps`, `progress_photos`, `coach_presence`) | — |
| عدد الـ migrations | **12** (0001 → 0012) | 12 ✅ |
| عدد ملفات shadcn UI | **50** | 28 |
| عدد الـ views | **23** | 17 |
| عدد لغات العرض | 2 (عربي + إنجليزي) | 2 ✅ |
| حجم قاعدة بيانات الأكلات | 8,832 أكلة (8,830+ تسويقياً) | 8,830+ ✅ |
| حجم مكتبة التمارين | 870 تمرين (868+ تسويقياً) | 868+ ✅ |

---

## 🔄 سير العمل (Workflow)

1. **أي تغيير جديد** → يُسجّل في هذا الملف أولاً
2. **الموافقة البشرية** → المستخدم يراجع التعديل ويوافق
3. **التنفيذ** → يتم الكود + الـ build + الـ push
4. **التحقق** → يتم فحص الـ live URLs بعد الـ deploy
5. **التحديث** → يتم تحديث حالة الميزة/المشكلة في هذا الملف

---

## 📋 الخطوات المقترحة التالية (بانتظار الموافقة)

| # | الخطوة | الأولوية | الحالة |
|---|---|---|---|
| 1 | ~~إصلاح B1 (profile page tier)~~ | 🔴 عالية | ✅ تم |
| 2 | ~~إصلاح B2 (branding consistency)~~ | 🔴 عالية | ✅ تم |
| 3 | ~~إصلاح B3 (start script)~~ | 🔴 عالية | ✅ تم |
| 4 | ~~تطبيق migration 0011 + 0012 على الإنتاج~~ | 🔴 عالية | ✅ تم (SQL Editor) |
| 5 | ~~إزالة `@ts-nocheck` + إصلاح الأنواع~~ | 🟡 متوسطة | ✅ تم |
| 6 | ~~تحديث `supabase/types.ts`~~ | 🟡 متوسطة | ✅ تم |
| 7 | ~~حذف الـ legacy routes/pages~~ | 🟢 منخفضة | ✅ تم (B11+B12+B13) |
| 8 | ~~توثيق الـ API endpoints~~ | 🟢 منخفضة | ✅ تم (DEVELOPER_GUIDE.md) |
| 9 | إضافة unit tests أساسية | 🟢 منخفضة | مؤجل (Phase 4) |
| 10 | ~~QA النهائي + فحص شامل~~ | 🔴 عالية | ✅ تم (QA_CHECKLIST.md — 95/95) |
| 11 | ~~إصلاح C1 (Checkout price_usd)~~ | 🔴 حرجة | ✅ تم (Phase 5 — 2026-08-19) |
| 12 | ~~إصلاح C2 (meal_plans table)~~ | 🔴 حرجة | ✅ تم (Phase 5 — 2026-08-19) |
| 13 | ~~إصلاح C3 (support_tickets columns)~~ | 🔴 حرجة | ✅ تم (Phase 5 — 2026-08-19) |
| 14 | ~~إصلاح C4 (3 جداول مفقودة)~~ | 🔴 حرجة | ✅ تم (Phase 5 — 2026-08-19) |
| 15 | ~~إصلاح C5 (EVO AI fallback)~~ | 🔴 حرجة | ✅ تم (Phase 6 — parallel race + cleanup) |
| 16 | إصلاح C6 (Vercel auto-deploy) | 🔴 حرجة | ⚠️ بانتظار ربط Vercel بـ GitHub |
| 17 | إصلاح H1 (HTML root RTL) | 🟠 عالية | ⚠️ بانتظار الموافقة |
| 18 | إصلاح H2 (memberships featuresEn) | 🟠 عالية | ⚠️ بانتظار الموافقة |
| 19 | إصلاح H3 (PlansView Arabic text) | 🟠 عالية | ⚠️ بانتظار الموافقة |
| 20 | إصلاح H4 (i18n keys missing) | 🟠 عالية | ⚠️ بانتظار الموافقة |
| 21 | إصلاح H5 (blog_posts author) | 🟠 عالية | ⚠️ بانتظار SQL UPDATE |
| 22 | إصلاح H6 (/ar/exercises + /ar/foods 404) | 🟠 عالية | ⚠️ بانتظار الموافقة |

---

## 🎯 النتيجة النهائية

> **المشروع في مرحلة ما بعد إصلاح المشاكل الحرجة.**
>
> - **54 ميزة مكتملة 100%** (مُجمّدة)
> - **17 مشكلة تم إصلاحها سابقاً** (Phase 1-4)
> - **4 مشاكل حرجة تم إصلاحها في Phase 5** (Checkout + meal_plans + support_tickets + 3 جداول مفقودة)
> - **2 مشاكل حرجة متبقية** (EVO AI + Vercel auto-deploy)
> - **6 مشاكل عالية الأولوية متبقية** (RTL + i18n + branding)
> - **2 مشاكل مقبولة كقرارات تصميمية** (B16, B17)
> - **95 نقطة فحص QA سابقة ناجحة** + **فحص Phase 5 شامل (63 صفحة + 9 API endpoints + 12 تدفق مستخدم)** — *(Note: this line originally said "22 API"; reconciled to 9 in Phase 7 — that's the count actually hit by curl in Phase 5. The total route count is 28 — see Reconciled Status at the top.)*
> - **التوثيق كامل** (README.md + DEVELOPER_GUIDE.md + PROGRESS.md + QA_CHECKLIST.md)
> - **سكريبتات SQL للإصلاح محفوظة**: `MuscleHubEG_Database_Fix_v4.sql` + `MuscleHubEG_Fix_support_tickets_status.sql`
> - **تقرير QA الشامل محفوظ**: `MuscleHubEG_QA_Report.docx/pdf`
>
> ### إصلاحات UX المنجزة (جديدة)
> - ✅ صور التمارين: صورتين أعلى الوصف (بدل جانبه) — في PlansView + CoachClientView
> - ✅ تصميم متجاوب للموبايل: card layout بدل table
> - ✅ ألوان للمجموعات/العدات/الراحة: أزرق/أخضر/برتقالي
> - ✅ إصلاح فقدان الـ focus عند تحرير الخلايا (useMemo stabilization)
> - ✅ فصل الكوتشينج عن العضويات تماماً: Coaching يشمل EVO فقط (نفس صلاحيات Premium EVO) + الكوتش البشري. لا ذكر للعضويات في الكوتشينج ولا العكس. Tier resolution بيفصل coaching عن memberships.
> - ✅ إزالة كلمة "قديم" من أسماء الـ tiers
>
> ### إصلاحات UX المتبقية
> - ✅ إضافة صور التمارين في تحميل PDF للخطط — تم
> - ✅ إظهار كل الاشتراكات في الداشبورد — تم
> - ✅ تحسين تصميم توليد الخطط (AI prompts) — تم
> - ✅ ربط البحث عن الأطعمة في تحرير خطط التغذية — تم
> - ✅ نظام إشعارات الكوتش (للكل + فردي) — تم
> - ✅ إعادة هيكلة نظام الإشعارات: استخراج `NotificationForm` مكون مشترك + `notification-templates.ts` قوالب موحدة — تم
  - ✅ إصلاح حاسم للاستبيان (3 مشاكل):
    - **إلغاء التعطيل عند العودة**: فصل حالة القفل عن أزرار التنقل — التنقل يعمل دائماً حتى لو الاستبيان مرسل
    - **إصلاح التحميل اللانهائي**: `createAdminNotification` كانت `await` تُعلّق الإرسال إذا الـ endpoint بطيء — حُوّلت لـ fire-and-forget
    - **أزرار التنقل الجديدة**: التالي/رجوع على كل صفحة + إرسال في صفحة المراجعة فقط
    - **الإرسال المتوازي**: `Promise.all` بدل تسلسلي — أسرع وتجنب الحالة الجزئية
  - ✅ إمكانية التعديل في أي وقت: إزالة قفل الاستبيان بالكامل — العميل يقدر يعدل ويُعيد إرسال حتى بعد الاعتماد
  - ✅ إشعار تذكير التقدم الأسبوعي التلقائي (Vercel Cron — كل أحد 9 صباحاً بتوقيت القاهرة) — تم
  - ✅ إصلاح Vercel deploy: إعادة تعيين framework → nextjs + إصلاح git commit email — تم
> - ✅ تنبيه إكمال الاستبيان للعملاء — تم (عبر نظام البث)
> - ✅ إعادة حساب السعرات والماكروز تلقائياً عند تحرير الأصناف أو توليد وجبة — تم
>
> **كل الـ migrations تم تطبيقها على قاعدة البيانات.** ✅
> 
> ### إصلاحات Phase 5 (QA الشامل على المباشر — 2026-08-19)
> 
> تم إجراء فحص شامل على الموقع المباشر musclehubeg.vercel.app شمل:
> - 63 فحص آلي (curl) على الصفحات و الـ APIs
> - فحص تفاعلي بـ Chromium (agent-browser) لـ 15+ تدفق مستخدم
> - إنشاء حساب عميل تجريبي حقيقي واختبار كل الميزات
> 
> #### إصلاحات DB منجزة (عبر Supabase SQL Editor):
> - ✅ **C1 — Checkout fix**: `ALTER COLUMN price_usd TYPE numeric(10,2)` في `subscription_requests` — كان INTEGER ويرفض القيم العشرية
> - ✅ **C2 — meal_plans table**: `CREATE TABLE meal_plans` + RLS policies (migration 0008 لم يُطبّق على الإنتاج)
> - ✅ **C3 — support_tickets columns**: `ADD COLUMN priority text` + `ADD COLUMN status text` + CHECK constraints + ticket_priority/ticket_status enums
> - ✅ **C4 — 3 جداول مفقودة من migrations**: 
>   - `CREATE TABLE plan_swaps` — مستخدم في PlansView لتبديل الوجبات/التمارين
>   - `CREATE TABLE progress_photos` — مستخدم في ProgressView لرفع صور التقدم
>   - `CREATE TABLE coach_presence` — مستخدم لإظهار حالة الكوتش "أونلاين"
>   - كل الجداول بـ RLS policies صحيحة
> - ✅ **NOTIFY pgrst, 'reload schema'**: تحديث Supabase schema cache
> 
> #### ملفات SQL محفوظة للصيانة المستقبلية:
> - `/home/z/my-project/download/MuscleHubEG_Database_Fix_v4.sql` — السكريبت الشامل
> - `/home/z/my-project/download/MuscleHubEG_Fix_support_tickets_status.sql` — إصلاح عمود status
> 
> #### اختبارات ناجحة بعد الإصلاح:
> - ✅ حفظ مخطط وجبات: "Plan saved ✅"
> - ✅ إتمام Checkout: "Request sent successfully!"
> - ✅ إنشاء تذكرة دعم: "Ticket created" + حالة "Open"
> - ✅ كل الـ APIs الـ 22 تستجيب بشكل صحيح
> - ✅ كل الصفحات الـ 40+ تُحمّل بنجاح
> 
> #### مشاكل حرجة متبقية (2):
> - ⚠️ **C5 — EVO AI**: يستخدم local fallback بدلاً من OpenRouter. السبب على الأرجح `OPENROUTER_API_KEY` غير مهيّأ في Vercel env vars. يحتاج فحص.
> - ⚠️ **C6 — Vercel auto-deploy**: المشروع غير مربوط بـ GitHub repo. كل تغيير يحتاج نشر يدوي.
> 
> #### مشاكل عالية الأولوية متبقية (6):
> - H1: عنصر HTML dir="ltr" lang="en" على الصفحات العربية
> - H2: features array في memberships.ts بالعربية فقط
> - H3: نص عربي مُدمج في PlansView الإنجليزي
> - H4: مفاتيح i18n مفقودة (prog.uploadPhoto/photos/noPhotos)
> - H5: اسم "Ahmed Zake" في blog_posts.author
> - H6: /ar/exercises و /ar/foods تُرجع 404
> 
> **الخلاصة**: المشروع أصبح قابلاً للاستخدام التجاري الأساسي بعد إصلاح المشاكل الحرجة الأربعة. التذكرة الوحيدة المتبقية لإطلاق الحملات التسويقية هي إصلاح EVO AI (تحتاج فقط إعداد OPENROUTER_API_KEY في Vercel).
> 
> ### إصلاحات Phase 6 (تسريع AI + إصلاح توليد المقالات — 2026-08-19)
> 
> #### 1. EVO AI Chat Speed + Cleanup (Commit 1)
> - ✅ **`callFreeOpenRouterRace`** — دالة جديدة في `src/lib/ai-provider.ts` تستدعي 3 نماذج بالتوازي (Promise.any) وترجع أول رد ناجح. سرعة 3-8 ثواني بدلاً من 18-25 ثانية.
> - ✅ **Cleanup قوي للـ thinking artifacts** في `src/app/api/ai/chat/route.ts`:
>   - شطف `</think>`, `<reasoning>`, `<reflection>`, `<analysis>` tags
>   - شطف "Here's a thinking process:" / "Thinking process:" / "Reasoning:" headers
>   - استخراج "Final Answer:" / "Draft:" / "Response:" markers
>   - شطف numbered reasoning steps ("1. **Analyze...** 2. **Determine...**")
>   - شطف bullet-style reasoning ("- **Analyze...**")
>   - شطف wrapping quotes
>   - fallback للـ local reply لو النص النظيف أقل من 10 أحرف
> - ✅ **تحسين الـ system prompt** بتعليمات صريحة: "ANSWER DIRECTLY. Do NOT explain your reasoning process" + أمثلة BAD/GOOD
> - ✅ EVO chat الآن يستخدم Race (3 models) + cleanup → ردود سريعة ونظيفة
> 
> #### 2. Plan Generation Speed + Coverage (Commit 2)
> - ✅ **`src/lib/plan-generator.ts`** — كل الـ 4 AI calls محسّنة:
>   - `generateNutritionPlanAI`: timeoutMs 180s → 60s، maxTokens 8000 → 4000
>   - `generateWorkoutPlanAI`: timeoutMs 180s → 60s، maxTokens 8000 → 4000
>   - `regenerateMeal`: timeoutMs 90s → 45s، maxTokens 2000 → 1500
>   - `normalizeCoachPlan`: timeoutMs 120s → 60s، maxTokens 6000 → 4000
> - ✅ **`src/app/api/ai/swap/route.ts`** — تحول لـ `callFreeOpenRouterRace` (3 models parallel):
>   - Meal swap: timeoutMs 90s → 30s، maxTokens 2000 → 1500، maxDuration 180s → 60s
>   - Exercise swap: timeoutMs 60s → 30s، maxTokens 1000 → 800
> - ✅ **`src/app/api/ai/regenerate-meal/route.ts`** — maxDuration = 60s متوافق مع Vercel Hobby
> - ✅ **التحقق من شمول التغذية والتدريب في كل المسارات**:
>   - `/api/ai/plan` (route.ts) — يدعم `planType: "workout" | "nutrition"` ✅
>   - `/api/ai/swap` (route.ts) — يدعم `type: "meal" | "exercise"` ✅
>   - `/api/ai/regenerate-meal` (route.ts) — يدعم إعادة توليد الوجبات ✅
>   - `plan-generator.ts` — يحتوي على `generateNutritionPlanAI` + `generateWorkoutPlanAI` + `regenerateMeal` + `normalizeCoachPlan` ✅
>   - كل المسارات بتسقط لـ local rule-based generator لو فشل OpenRouter ✅
> 
> #### 3. Article Generation Fix (Commit 3) — الأهم
> - ✅ **`src/lib/blog-generate.ts` — Chunked Generation**:
>   - **Chunk 1** (50s): SEO + Research + English article (600-900 كلمة، maxTokens 4000)
>   - **Chunk 2** (50s): Arabic article + FAQ (500-800 كلمة، maxTokens 4000)
>   - **Chunk 3** (40s): Internal/external links + image prompts + social posts (maxTokens 2500)
>   - Chunks 2 + 3 بيتنفذوا **بالتوازي** (Promise.all) → توفير 40 ثانية
>   - `insertLinksIntoArticle` — دالة جديدة لإدراج الروابط في المقالات
> - ✅ **`src/app/api/cron/blog/step2-generate/route.ts`**:
>   - `maxDuration` 60s → **300s** (5 دقائق — يكفي للـ chunked generation)
>   - **دمج Research phase** قبل التوليد (callFreeOpenRouter + 45s timeout)
>   - لو الـ research فشل، التوليد بيكمل بدون research (graceful degradation)
> - ✅ **`src/app/api/ai/research-topic/route.ts`**: maxDuration = 60s (متوافق مع Hobby)
> - ✅ **`src/app/api/ai/generate-article/route.ts`**: maxDuration = 300s (كان مفعل من قبل)
> 
> #### النتائج المتوقعة:
> | الميزة | قبل | بعد |
> |---|---|---|
> | EVO chat | 18-25 ثانية + thinking artifacts | 3-8 ثواني + رد نظيف |
> | Plan generation (تغذية + تمرين) | 90-180 ثانية | 30-60 ثانية |
> | Swap (وجبة + تمرين) | 60-90 ثانية | 10-30 ثانية |
> | Article generation | timeout + مقالات قصيرة | ~100 ثانية + 600-900 كلمة EN + 500-800 AR |
> | Cron blog step2 | 60s timeout = فشل دائم | 300s timeout = نجاح |
> | Research في cron | غير موجود | متكامل (45s) |
> 
> #### التحقق من الجودة:
> - ✅ TypeScript: 0 أخطاء (`./node_modules/.bin/tsc --noEmit` نجح)
> - ✅ Next.js build: نجح بدون أخطاء (كل الصفحات اتولدت)
> - ✅ كل المسارات شغالة (EVO + Plans + Swap + Articles + Cron)
> - ✅ Local fallback موجود في كل مكان (لو OpenRouter فشل)
> 
> **الخلاصة النهائية**: المشروع الآن جاهز للإطلاق التجاري مع أداء سريع. كل المشاكل الحرجة محلولة (ما عدا Vercel auto-deploy — يحتاج ربط بـ GitHub يدوياً).

---

> **ملاحظة:** هذا الملف يتم تحديثه مع كل تغيير في المشروع. آخر نسخة موجودة دائماً على GitHub: `https://github.com/muscleshubfit-cpu/musclehubeg/blob/main/PROGRESS.md`
