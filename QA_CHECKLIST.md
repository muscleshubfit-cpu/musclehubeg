# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status snapshot:** see `PROGRESS.md`.

---

## Latest Verification — 2026-09-02 (Phase 81 — NEW plan-generation limit law (1+1 weekly / 4+4 monthly) + b2b/b2c audit + deferred-tasks closure check)

| Check | Result | How verified |
|---|---|---|
| Deferred tasks — all already done | ✅ VERIFIED | Code + worklog audit: email suite (Phases 72/73), SEO trio (74), affiliate 7-step + 20% + notifications (75), Starter/Elite removal + admin unlimited + earnings cleanup + cron 21:00 (75), 7-day conditional refund + payout hold honoring refunds (76), PayPal automation (capture-order/webhook + wallet top-up) — queue EMPTY, nothing left un-executed |
| b2b/b2c audit | ✅ PASS (1 conflict fixed) | B2C: EVO burns the client's ONE pool (checkEvoPlanQuota) + weekly swaps on plan_swaps. B2B: ownership (coach_assignments) + activation required (402 without active coaching sub) + same pool (checkClientPlanQuota). CONFLICT FIXED: legacy coach-side 4/4 cap (0034) capped the coach surface at 4 even for Pro clients (whose balance is higher) — REMOVED so the one-balance law governs every surface |
| NEW law: 1+1 weekly / 4+4 monthly | ✅ IMPLEMENTED | memberships.ts: premium/coaching 1+1 weekly cap + 4+4 monthly total; pro 2+2 / 8+8 (2× Premium ladder preserved); free 0. `evoNutrition/WorkoutPlanWeeklyLimit` added; features + comparison table copy updated (AR+EN) |
| Weekly window is Monday-anchored UTC | ✅ PASS (unit) | `weekStartUtc()` — Wed 2026-09-02 → Mon 2026-08-31 00:00 UTC; Monday input anchors to itself (client-plan-quota.test.ts) |
| Two-window enforcement | ✅ PASS (unit) | `enforcePlanQuota`: monthly total AND weekly cap must BOTH pass; `blockedBy: "week" \| "month" \| null` drives distinct 429 messages; month checked first when both exhausted |
| Chat 429 message distinguishes windows | ✅ PASS (code) | /api/ai/chat: weekly branch («You've hit the weekly cap … resets on Monday — your monthly total (x/y) is still available») vs monthly branch; Pro upgrade hint now says 8/mo (2/wk) |
| Coach path uses ONLY the client balance | ✅ PASS (code) | /api/ai/jobs: clientQuota 429 with weekly/monthly Arabic variants; the redundant COACH_AI_PLAN_LIMIT count gate deleted; /api/coach/ai-usage returns `clientBalance` (both windows) + `coachOwn` informational; CoachClientView atCap/usageLine show weekly + monthly lines |
| Member quota meter shows both windows | ✅ PASS (code) | /api/ai/quota + EvoFloatingWidget: monthly line + «هذا الأسبوع» line (weeklyUsed/weeklyLimit) |
| Gates | ✅ PASS | tsc 0 errors · eslint 0 errors on touched files · vitest 191/191 (18 files — window-aware quota suite incl. weekly-cap, pro 8/8, staff bypass, free-0) |
| Docs parity | ✅ UPDATED | AGENTS.md §(d) PLAN-BALANCE QUOTA (two windows + legacy-cap removal), PROGRESS Phase 81 section, this table, worklog Task 81, for-coaches page + FAQ copy, LandingView FAQ + pricing cards |

---

## Previous Verification — 2026-09-01 (Phase 80 — LIVE production check of Phases 77-79 with trial accounts (admin QA 0050 + fresh coach funnel) + docs parity + coach-join page copy fix)

| Check | Result | How verified |
|---|---|---|
| Production runs latest commit | ✅ PASS | `GET /api/build-info` → commit `a5e98f3` (Phase 79) on main |
| Admin trial account (migration 0050) | ✅ PASS | `admin.test@musclehub-test.com` logged in via the REAL `/auth` page → lands on `/admin` console |
| Admin AI meal-plan generation (non-members) | ✅ PASS | 2,200 kcal / 5 meals / Cut brief → structured Arabic plan rendered; brief stored in `content.ai.params` (read via GET) |
| Admin AI workout-plan generation | ✅ PASS | 5-day fat-loss brief with «لا باربال» → plan respects constraint (dumbbell/machine-only push day) |
| regenerate_plan (whole plan) | ✅ PASS | UI button → **200 in 34.1s, source `groq:openai/gpt-oss-120b`** (real AI, not fallback); same brief preserved (2200 kcal / 5 meals); `regenerations` counter bumped |
| regenerate_meal (one meal) | ✅ PASS | ×2 via UI + API; avoid-list honored (other meals' foods not reused); history snapshots appended |
| regenerate_item (one food item) | ✅ PASS | ×3; ±15% kcal law respected (180→165 kcal swap); item text re-rendered via renderMealPlanText |
| regenerate_day (one workout day) | ✅ PASS | Day 0 (Push) swapped to fresh constraint-respecting exercises; avoid-list honored |
| regenerate_exercise (one exercise) | ✅ PASS | Dumbbell Bench Press → Barbell Guillotine Press swap; history appended |
| Version history (Phase 79 «حفظ للخطط المولدة») | ✅ PASS | `content.history` = [item, item, meal, plan] snapshots, **cap 5** enforced; «Saved versions (4)» expander visible in UI |
| restore_version | ✅ PASS | UI Restore (confirm dialog) → history shows `restore_backup` (restore is itself reversible) |
| Coach UI: Phase 79 regen suite | ✅ PASS | PlanViewerModal (client page) shows «إعادة توليد» + «إعادة توليد الوجبة» per meal + per-item «استبدال الصنف ببديل مكافئ بالذكاء الاصطناعي» buttons |
| Coach-side food_item_regenerate E2E | ✅ PASS | Enqueue POST /api/ai/jobs → GHA runner → **done** in ~60-90s → valid replacement (`خبز بلدي أبيض` 165kcal for 165kcal bread item, alternatives included) |
| **Admin feature HIDDEN from coaches** (owner Q) | ✅ PASS | Fresh coach (registered through /for-coaches/register funnel) opens `/admin/external-plans` → **redirected to /coach**; POST & GET `/api/admin/external-plans` with coach cookies → **403 "Forbidden — admin only"**; coach sidebar contains ZERO admin items (Blog/Referrals/Site memberships/Coach system/Accounts/Leads/Saved Results/External Plans all absent) |
| Client blocked from staff job types | ✅ (code review) | `JOB_GATE food_item_regenerate/day_regenerate = "coach"` → `requireCoach` in /api/ai/jobs → clients get 403 |
| Transient provider outages handled | ⚠️ NOTE | Observed 2 windows where ALL providers failed (Groq 400 json_validate empty-generation + OpenRouter free models 429 upstream): queued jobs retried (3 attempts) then failed safely with detailed Arabic error, NO quota burn; identical flow succeeded once providers recovered. Also intermittent Vercel 502s on long generation POSTs (3 fail / 4 success) — UI toasts error, retry succeeds |
| Coach-join page copy matches CURRENT law | ✅ FIXED | Old «4 خطط + 4 خطط لكل عميل» (retired 0034 quota) replaced in `for-coaches/content.ts` FAQ (AR+EN) + `for-coaches/page.tsx` card: generation draws from the CLIENT's monthly tier balance (premium 3/3 · pro 6/6 · coaching 3/3 — same EVO pool, resets on the 1st); hand-editing, manual uploads AND AI regeneration of meal/item/day/exercise stated as unlimited |
| Docs ↔ code parity | ✅ FIXED | PROGRESS.md (Phases 77-79 entries + Phase 80 live-check), worklog.md (Task 77-80), DEVELOPER_GUIDE.md §2 structure (AdminGate admin-only, 13 /admin pages, 66 API routes, modern lib files) — previously stale at Phase 76/71 |
| Test data cleanup | ✅ PASS | 2 QA external plans DELETE 200×2; QA coach account deleted via /admin/accounts cascade — production left clean (documented 0050 admin account kept per QA_CHECKLIST Phase 56/60 convention) |

---

## Previous Verification — 2026-09-01 (Phase 76 — 7-day refund (no-features-used condition) + affiliate payout hold honoring subscription cancellations)

| Check | Result | How verified |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ PASS | 0 errors on the whole repo |
| ESLint (whole repo vs baseline) | ✅ PASS | 0 errors; 788 warnings vs 784 baseline — +4 same pre-existing `any` style in new server code |
| Unit tests (`vitest run`) | ✅ PASS | 18 files / **188/188 passed** (6 new: refund window helpers + activation anchor + Arabic reason messages) |
| Production build (`next build`) | ✅ PASS | ✓ Compiled successfully — **1,882 static pages**; new routes `ƒ /api/refund/request` + `ƒ /api/admin/refunds` registered |
| Smoke `:3779` — pages | ✅ PASS | `/` + `/ar` 200; `/profile` 200 (refund card renders inside subscription card); `/referral` 200 (hold tile conditional) |
| Smoke `:3779` — auth guards | ✅ PASS | GET/POST `/api/refund/request` unauth → **401**; GET `/api/admin/refunds` unauth → **401** (requireUser / requireAdmin) |
| Condition enforcement is server-side | ✅ (code review) | Eligibility computed ONLY in `src/lib/refund.ts` from tamper-proof ledgers (evo_chat_usage / plan_swaps / ai_jobs done / saved_results) — client cannot fake zero usage; usage_snapshot stored at request time |
| Affiliate payout hold | ✅ (code review) | Earnings from subscription_initial/renewal created with available_at=+7d (engine + legacy awardCommission hardened); getReferralStats + createPayoutRequest FIFO exclude held rows; unlock is live-read (no cron) |
| Refund → commission clawback | ✅ (code review) | Admin approve → reverseCommissionByReferenceServer (idempotent, PayPal-webhook-shared) + user-based sweep fallback; all queries exclude status=refunded → no double clawback |
| Migration 0062 law | ✅ (code review) | refund_requests FK → public.profiles (matches 0004 law — admin JOIN works); RLS select-own only; writes service-role; available_at backfill: subscription commissions <7d held until created_at+7d |

---

## Latest Verification — 2026-09-01 (Phase 75 — postponed tasks completed: 7-step affiliate + concrete commissions + earnings-page cleanup (4 sections removed) + toolkit relocation + affiliate notification suite)

| Check | Result | How verified |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ PASS | 0 errors on the whole repo |
| ESLint (touched + new files) | ✅ PASS | 0 errors (4 baseline-style warnings on 2 edited files: pre-existing `any` ×3 + `<img>` QR — same patterns pre-edit) |
| Unit tests (`vitest run`) | ✅ PASS | 17 files / **182/182 passed** (no behavior change to tested libs) |
| Production build (`next build`) | ✅ PASS | ✓ Compiled successfully — **1,880 static pages** |
| Smoke `:3779` — program page 7 steps + toolkit | ✅ PASS | `/affiliate` → 200 with «YOUR PROMO TOOLKIT» section + step-7 «Request your payout» present; commission examples tiles in the subscriptions card ($6 → $1.20 / $16 → $3.20) |
| Smoke `:3779` — earnings dashboard slimmed | ✅ PASS | `/referral` → 200; REFERRALS + COMMISSIONS + PROMOTIONAL CONTENT + WEBSITE BANNERS sections removed (4 per owner request); kept: balance, link card, earnings, referred coaches, payouts, payout modal |
| Smoke `:3779` — payout-notify route | ✅ PASS | GET → **405** (POST-only, expected); POST unauthenticated → **401** (requireUser); guards: fresh pending payout ≤10 min + `[uid:…]` dedup |
| Toolkit relocation honesty | ✅ PASS | Promo toolkit now on public `/affiliate` (authenticated = full toolkit, guest = sign-up CTA) — the page's «website banners / promo content» promise stays TRUE after removing it from /referral |
| Reversal bell (engine) | ✅ PASS | `reverseCommissionServer` inserts `referral_commission_reversed` member bell + staff bell (target_coach_id) — non-blocking try/catch, service role |
| Coach-join bell (0061) | ✅ PASS | Migration `20260902090000_0061_coach_referral_join_notification.sql`: AFTER INSERT trigger on `referrals` (SECURITY DEFINER, exception-guarded, idempotent DROP+CREATE) — referred user role='coach' → inviter bell «مدرب جديد دعوته انضم! 🤝» + staff bell → `/coach/affiliate` |
| Owner verification (post-deploy) | ⏳ OWNER | (1) Reload the site → check `/affiliate` shows the 7 steps + toolkit; (2) `/referral` shows the slim earnings dashboard; (3) Supabase auto-applies 0061 (no manual run needed) — then any NEW coach referral via your link should ring your bell |
| Verified-done without changes | ✅ VERIFIED | Postponed list items already satisfied: quota deduction combined pool (EVO `/api/ai/chat` + coach `/api/ai/jobs` + meter), admin unlimited (staff semantics + manual uploads unlimited), Starter/Elite display already removed (legacy checkout links intentionally accepted), admin manual plan generator (upload + paste-normalize, `isAdmin` gate), cron `0 21 * * *` in vercel.json, 20% coach-invite commission engine |

---

## Previous Verification — 2026-09-01 (Phase 74 — SEO: dynamic lang/dir + AR detail pages 404 fix + long-tail blog with auto tool links)

| Check | Result | How verified |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ PASS | 0 errors on the whole repo (after generating gitignored `next-env.d.ts`; the 4 pre-existing `TS2307` image-import errors on baseline vanish the same way Vercel's build handles them) |
| ESLint (all touched + new files) | ✅ PASS | 0 errors (61 warnings = pre-existing `any` baseline style) |
| Unit tests (`vitest run`) | ✅ PASS | 17 files / **182/182 passed** (172 prior + **10 new** `blog-tool-links` canaries) |
| Production build (`next build`) | ✅ PASS | ✓ Compiled successfully — **1,879 static pages** (was 1,011; +868 AR exercise SSG pages); `/ar/exercises/[slug]` + `/ar/foods/[slug]` registered |
| Smoke `:3779` — AR exercise detail | ✅ PASS | `/ar/exercises/ab-roller` → **200** (was 404 live) + `lang="ar" dir="rtl"` + AR title + HowTo/Breadcrumb JSON-LD + hreflang en/ar/x-default |
| Smoke `:3779` — AR food detail | ✅ PASS | `/ar/foods/chicken-breast` → **200** (was 404 live) + AR title «صدور دجاج — السعرات والماكروز لكل 100 جرام» + NutritionInformation schema |
| Smoke `:3779` — EN twins unaffected | ✅ PASS | `/exercises/ab-roller`, `/foods/chicken-breast`, `/exercises`, `/ar/exercises`, `/ar/foods` → 200 with `lang="en"` / `lang="ar"` respectively |
| AR listing internal links | ✅ PASS | SSR HTML of `/ar/exercises` + `/ar/foods` cards link to `/ar/exercises/<slug>` + `/ar/foods/<slug>` (AR crawlable); EN listing still `/exercises/<slug>` |
| Sitemap AR details | ✅ PASS | `/sitemap.xml` contains `/ar/exercises/<slug>` + `/ar/foods/<slug>` entries (~9,700 new URLs) with hreflang alternates |
| Content-Language header | ✅ PASS | `/ar/exercises/ab-roller` → `content-language: ar-EG` |
| Dynamic locale (route law) | ✅ PASS | `isArabicPath()` (exact `/ar` or `/ar/…`) unified in root layout + middleware; live `/ar` → `lang="ar" dir="rtl"`, `/` → `lang="en" dir="ltr"` |
| Tool-link inserter canaries | ✅ PASS | insert/cap-3/first-occurrence/idempotent (EN+AR)/skips existing md links & headings/tables/quotes/internal-URLs-only |
| No SQL migration | ✅ N/A | Phase 74 is code-only — no DB changes |

### Owner follow-ups (Phase 74)
- بعد النشر: تجربة `https://musclehubeg.vercel.app/ar/exercises/ab-roller` و `/ar/foods/chicken-breast` (كانت 404) + إرسال الموقع من جديد في Google Search Console (الخريطة فيها ~19,500 رابط دلوقتي).
- المقال القادم المتولد تلقائياً (معادلة P0→P5) هتلاقي فيه روابط الأدوات تلقائياً — راجع `toolLinksInserted` في استجابة p5 أو Vercel Logs (`[blog-tool-links]`).

---

## Verification — 2026-09-01 (Phase 73 — Email Security & Filtering + Customers DB)

| Check | Result | How verified |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ PASS | 0 errors on the whole repo |
| ESLint | ✅ PASS | 0 errors (warnings = pre-existing baseline only; the 1 new `any` from this phase was fixed to `unknown`) |
| Unit tests (`vitest run`) | ✅ PASS | 16 files / **172/172 passed** |
| Production build (`next build`) | ✅ PASS | Exit 0 — all tool routes + APIs compiled |
| Smoke `:3779` — EN / AR home | ✅ PASS | HTTP 200 both |
| Frontend filter — weird email | ✅ PASS | `weird$mail@@bad` → **400** before any DB/SMTP call |
| Frontend filter — Arabic-letters email | ✅ PASS | `محمد@gmail.com` → **400** (non-Latin chars rejected) |
| Frontend filter — spaces in email | ✅ PASS | `test test@gmail.com` → **400** |
| Frontend filter — empty email | ✅ PASS | `""` → **400** |
| Frontend filter — symbols in name (server) | ✅ PASS | `"Ahmed<>hack"` → **400** + Arabic message «الاسم لازم يكون حروف عربية أو إنجليزية فقط» |
| Newsletter API filter | ✅ PASS | `test@@nope` → **400** · `عربي@mail.com` → **400** |
| Per-IP rate limit still alive | ✅ PASS | 6th request from same IP within 10 min → **429** |
| Daily limit 100/24h (code path) | ✅ PASS | Count query on `tool_leads` (last 24h, `type='tool'`) runs BEFORE save/send; `>=100` → **429** + `console.error DAILY LIMIT REACHED` + `Retry-After: 3600`; plain-count fallback if `type` column missing; DB failure never blocks (logged) |
| Customers DB — migration 0060 | ✅ PASS | `supabase/migrations/20260902040000_0060_signup_leads_and_customer_sync.sql` — idempotent; auto-applied by the Supabase GitHub integration |
| Customers DB — new signups | ✅ PASS | Trigger `on_auth_user_created_add_lead` on `auth.users` (SECURITY DEFINER + exception guard) → every new account saved as `tool_slug='signup'`, `type='member'` |
| Customers DB — coaches labeled | ✅ PASS | `/api/coach/register` + `/api/admin/staff` (3 paths) upgrade the lead to `type='coach'`; failures logged, never fatal |
| Customers DB — backfill | ✅ PASS | Existing profiles inserted once: client→`member`, coach→`coach`, admin→`admin` (dedupe by email) |
| Admin leads view | ✅ PASS | `signup` label + member/coach/admin badge; filter list includes all 8 slugs |

### Phase 73 — Migration 0060 (auto-applied by the Supabase GitHub integration)

- File: `supabase/migrations/20260902040000_0060_signup_leads_and_customer_sync.sql`
- NO manual run needed (timestamp-named migrations are applied automatically — proven 3/3 in Phase 61).
- Do NOT manually re-run the older `RUN_ON_SUPABASE_0059_*` file after 0060 — 0060 already covers everything 0059 did (columns + wider CHECK) and adds `signup`.
- Verify it applied: Supabase → Table Editor → `tool_leads` → rows with `tool_slug = 'signup'` (backfilled members/coaches) → then register a NEW account on the site and watch a fresh `signup` row appear.

---

## Verification — 2026-09-01 (Phase 72 — Tool Results Email + Newsletter)

| Check | Result | How verified |
|---|---|---|
| Git sync (base == `origin/main` `7b8e692`) | ✅ PASS | Fresh clone of `muscleshubfit-cpu/musclehubeg`, branch `main` |
| TypeScript (`npx tsc --noEmit`) | ✅ PASS | 0 errors (the 4 `TS2307` image warnings appear only before `next build` generates `next-env.d.ts` on a fresh clone — pre-existing, unrelated) |
| ESLint (changed files) | ✅ PASS | 0 errors / 13 warnings (pre-existing `no-explicit-any` style shared with LandingView old code) |
| Unit tests (`vitest run`) | ✅ PASS | 16 files / **172/172 passed** |
| Production build (`next build`) | ✅ PASS | Exit 0 — `/api/send-email` + all 6 tool routes compiled |
| Local smoke `:3779` — EN home | ✅ PASS | HTTP 200 + `Subscribe free` (home section + footer strip) present |
| Local smoke `:3779` — AR home | ✅ PASS | HTTP 200 + `اشترك الآن مجاناً` present |
| Local smoke `:3779` — tools | ✅ PASS | `/tools/calorie-calculator` 200, `/meal-planner` 200 |
| API validation — bad email | ✅ PASS | `POST /api/send-email` `{"email":"not-an-email"}` → **400** `Valid email is required` |
| API validation — unknown tool | ✅ PASS | `POST /api/send-email` `{"tool_slug":"hack"}` → **400** `Invalid tool_slug` |
| API — newsletter slug accepted | ✅ PASS | `POST /api/tools/lead` `{"tool_slug":"newsletter"}` → **200** `{ok:true,demo:true}` (demo mode — no Supabase env locally) |
| API — water-tracker slug accepted | ✅ PASS | `POST /api/tools/lead` `{"tool_slug":"water-tracker","name":"أحمد"}` → **200** (was rejected before 0059) |
| API — email env guard | ✅ PASS | Valid body without `EMAIL_SERVER_*` → **500** `Email service is not configured` + `leadSaved:false` (env vars exist on Vercel) |
| Save-before-send order | ✅ PASS | Code path: lead insert → transporter.sendMail (owner directive) |

### Phase 72 — Migration 0059 (owner action in Supabase SQL Editor)

- Raw link: `https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0059_TOOL_LEADS_NAME_TYPE_NEWSLETTER.sql`
- Adds `name` + `type` columns, widens the `tool_slug` CHECK (6 tools + `newsletter`), adds `type` index. Safe to re-run; no data touched; RLS unchanged.
- **Soft-roll safety:** if the code deploys before the migration runs, nothing breaks — `/api/tools/lead` logs the insert error and `/api/send-email` still delivers the email; once the migration runs, saving resumes automatically.
- **Owner post-deploy test:** open any calculator on the live site → calculate → enter your own email → submit → verify the branded email arrives (check Spam) → confirm the row appears in `tool_leads` with your name + `type='tool'`; then subscribe from the footer with `type='newsletter'`.

---

## Latest Verification — 2026-08-26 (Phase 12 — UI Palette Unification + Memberships Redesign)

| Check | Result | How verified |
|---|---|---|
| Git sync (`HEAD == origin/main`) | ✅ PASS | `git rev-parse HEAD` == `git rev-parse origin/main` == `21c3b5b` (post-docs commit) — main implementation commits `8aff772` → `1447a0b` → `2a449d5` all pushed |
| Live site (`https://musclehubeg.vercel.app/`) | ✅ PASS | `curl -sI` → HTTP 200, response time 1.16s |
| Deployed palette (HTML inspection) | ✅ PASS | `curl https://musclehubeg.vercel.app/ \| grep -oE '#4A5260\|#0F5BB5\|#1D252E\|#FDFCFE'` → 41 / 10 / 32 / 12 occurrences respectively (new palette is live) |
| Old palette fully removed | ✅ PASS | `grep -oE 'text-gray-400\|text-gray-300\|bg-white/5\|ring-white/10'` → 0 occurrences (was used in Memberships section, now fully replaced) |
| WCAG AAA contrast on text | ✅ PASS | `textPrim` (#1D252E) on `surface` (#FDFCFE) = 15.0:1; `textSec` (#4A5260) on `surface` = 7.5:1; `brandDeep` (#0F5BB5) on white = 7.3:1 — all meet AAA (≥7:1) |
| Memberships cards visible | ✅ PASS | Premium card uses solid `#FDFCFE` bg (was `bg-white/5` = 5% opacity invisible); Pro card uses solid bg + 2px brand border + brand glow shadow |
| Section backgrounds preserved | ✅ PASS | Alternating `bg-white` / `bg-[#f5f5f7]` per Apple visual rhythm — no new sections added, no layout changes |
| `prefers-reduced-motion` | ⚠️ PARTIAL | Inline `onMouseEnter` handlers (translateY + boxShadow) are NOT covered by `@media (prefers-reduced-motion: reduce)` in `globals.css`. Accepted as known limitation per Owner direction (visual hover only — no auto-playing animations). Future: migrate to `.card-gemini-hover` CSS class. |

### Phase 12 commits (forward-only push — no force)

| SHA | Type | Summary |
|---|---|---|
| `8aff772` | feat(ui) | Initial Gemini-card palette on 4 CTA card groups |
| `1447a0b` | fix(ui) | Deepen text colors (`#656D75` → `#4A5260`; add `brandDeep` `#0F5BB5`) to reach WCAG AAA |
| `2a449d5` | feat(ui) | Expanded `CARD` → `PALETTE` const + redesigned Memberships cards + unified all 12 sections' text colors |
| `21c3b5b` | docs(worklog) | Append `P0-site-palette-redesign` entry |

### Live HTML verification (2026-08-26)

```bash
$ curl -s "https://musclehubeg.vercel.app/" | grep -oE '#[0-9A-Fa-f]{6}' | sort | uniq -c | sort -rn | head
     41 #4A5260   ← textSec (new) ✅
     32 #1D252E   ← textPrim ✅
     17 #6e6e73   ← footer textMuted only (intentional AA for legal text)
     15 #0071e3   ← brand (solid buttons only — intentional)
     12 #FDFCFE   ← surface ✅
     10 #0F5BB5   ← brandDeep (new) ✅
```

---

## Previous Verification — 2026-08-24 (Post-PayPal-Restoration Cycle)

| Check | Result | How verified |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ PASS (0 errors) | Local run after PayPal restoration + duplicate-button fix |
| ESLint (`npx eslint .`) | ✅ PASS (0 errors, 6 pre-existing warnings) | Local run — warnings are unrelated `window.location.href` usage in client components |
| Next.js Build (`npx next build`) | ✅ PASS (exit 0, all routes registered) | Local run — 3 PayPal routes present |
| Git push (`git push origin main`) | ✅ PASS (forward-only, no force) | HEAD `d1e40d1` matches `origin/main` (consolidation cycle) |
| HEAD == origin/main | ✅ YES | `git rev-parse HEAD` == `git rev-parse origin/main` == `d1e40d1` (consolidation commit per docs/_AUDIT.md) |
| Working tree clean | ✅ YES | `git status` shows "nothing to commit" |

### Cycle summary (2026-08-24)
This cycle restored the full PayPal integration that had been lost to a force-push, then iteratively hardened the checkout flow:

1. **PayPal restoration** — `src/lib/paypal.ts`, three API routes (`create-order`, `capture-order`, `webhook`), `CheckoutView.tsx` (PayPal as PRIMARY), affiliate engine + content, copy-button, 4 banner SVGs, migrations `0015` + `0016`. Commit `a079375`.
2. **Checkout duplicate-button fix** — `PayPalButtons` `useEffect` had unstable inline `onSuccess`/`onError` deps causing duplicate SDK renders. Switched to `useRef(renderedRef)` + `useCallback`-wrapped handlers + early-return relocation. Commit `a5b6a9a`.
3. **Coaching CTA + auth return flow** — coaching CTAs now route to checkout (logged-in) or to `/auth?mode=signup&next=...` (logged-out); `next` param is preserved across login/signup/Google OAuth. Commit `e0c6f0e`.

---

## Repository Facts (verified 2026-08-24)

| Metric | Value | How verified |
|---|---|---|
| Migrations | **16** (`0001` → `0016`) | `ls supabase/migrations/*.sql \| grep -v RUN_ON \| wc -l` |
| Pages (`page.tsx`) | **51** | `find src/app -name "page.tsx" \| wc -l` |
| API routes | **36** | `find src/app/api -name "route.ts*" \| wc -l` |
| Affiliate tables in `types.ts` | 1 each (`affiliate_transactions`, `affiliate_commissions`) | `grep -c` after dedup |
| Local TypeScript errors | 0 | `bunx tsc --noEmit` |
| Local ESLint errors | 0 | `bun run lint` |
| Local build errors | 0 | `bun run build` |

---

## Routes Inventory (verified 2026-08-24)

### Public routes (no auth)
- `/` (homepage)
- `/affiliate` (Affiliate Program landing page)
- `/about`, `/contact`, `/faq`, `/privacy`, `/terms`
- `/blog`, `/ar/blog`, `/blog/[slug]`, `/ar/blog/[slug]`
- `/exercises`, `/ar/exercises`, `/exercises/[slug]`
- `/foods`, `/ar/foods`, `/foods/[slug]`
- `/programs`, `/programs/[slug]`
- `/tools`, `/tools/bmi-calculator`, `/tools/body-fat-calculator`, `/tools/calorie-calculator`, `/tools/macro-calculator`, `/tools/water-tracker`
- `/coaching`, `/evo`, `/memberships`

### Authenticated routes (require login)
- `/dashboard`, `/plans`, `/progress`, `/chat`, `/questionnaires`, `/support`
- `/referral` (authenticated Affiliate Dashboard with full Marketing Toolkit)
- `/checkout`, `/profile`

### Coach/Admin routes
- `/coach` (client list), `/coach/[clientId]`, `/coach/payments`, `/coach/support`
- `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]`, `/admin/referrals`, `/admin/leads`, `/admin/saved-results`

---

## Affiliate System Verification (2026-08-24)

- ✅ `/affiliate` route exists (public, no auth)
- ✅ `AffiliateProgramView.tsx` renders correctly (654 lines)
- ✅ `AffiliateToolkit.tsx` embedded in `/referral` dashboard (486 lines)
- ✅ 5 promotional templates (Instagram/FB, WhatsApp, Short Social, Long Social, Story)
- ✅ 4 banner formats (Horizontal 728×90, Medium Rectangle 300×250, Square 250×250, Mobile 320×50)
- ✅ HTML embed codes generated via trusted templates (escapeHtml applied)
- ✅ CopyButton component with 3 states (default / Copied ✓ / Unable to copy)
- ✅ Affiliate Engine (`src/lib/affiliate-engine.ts`) — 575 lines
- ✅ Migration `0015_affiliate_engine.sql` — 223 lines (idempotent, RLS-enabled)
- ✅ `data.ts` `reviewSubscriptionRequest()` calls `processSubscriptionInitialPayment()` (not legacy `awardCommission()`)
- ✅ Idempotency: DB unique constraint `uq_aff_comm_transaction` on `affiliate_commissions.transaction_id`
- ✅ Share buttons (WhatsApp + Facebook + X) contain rich service descriptions in EN + AR

---

## Branding Verification (2026-08-24)

- ✅ Brand name "MuscleHubEG" used consistently across user-facing surfaces
- ✅ Banner SVGs render correctly (`MuscleHub<tspan>EG</tspan>` — colored "EG" suffix)
- ✅ `aria-label` on all 4 banner SVGs: `MuscleHubEG — ...`
- ✅ `i18n.tsx` `brand.name` = `MuscleHubEG` (both EN + AR dictionaries)
- ✅ `manifest.json` `name` + `short_name` = `MuscleHubEG`
- ✅ `metadata.ts` title/description/OG/Twitter use `MuscleHubEG`

### Intentionally preserved standalone "MuscleHub" (technical identifiers)
- `src/lib/openrouter-flash.ts:79` — `X-Title` HTTP header to OpenRouter API
- `src/lib/ai-provider.ts:271` — `X-Title` HTTP header to OpenRouter API
- `src/app/api/exercise-image/route.ts:101,138` — `User-Agent` HTTP header to wger.de API
- `PROGRESS.md` historical records of `'MuscleHub'` as DB column default value (migration 0013)

---

## Verification Protocol

> **Single source of truth:** the canonical verification command set is
> defined in `AGENTS.md` §3.5. The block below is kept for backwards
> reference — when in doubt, use `AGENTS.md` §3.5 as the authoritative
> command set.

When pushing changes, follow `AGENTS.md` §3.5 (Verification command set).
The same six-step flow applies:

```bash
# See AGENTS.md §3.5 for the canonical, current command set.
# (Historical reference — kept for context only.)
npx tsc --noEmit     # 1. TypeScript — 0 errors
npx eslint .         # 2. ESLint — 0 errors
npx next build       # 3. Next.js build — exit 0 (if rendering touched)
git push origin main # 4. Forward-only push
git fetch origin --quiet && git rev-parse HEAD && git rev-parse origin/main
                     # 5. Sync verification — both must be identical
git status --short   # 6. Working tree clean check
```

If any step fails: STOP, preserve state, report the issue.

---

## PayPal Integration Verification (2026-08-24)

| Check | Result | How verified |
|---|---|---|
| Create Order API | ✅ PASS | Live test — order created, $14.99 USD, status=CREATED |
| PayPal JS SDK loading | ✅ PASS | Loads with NEXT_PUBLIC_PAYPAL_CLIENT_ID |
| PayPal button renders | ✅ PASS | Visible on /checkout as PRIMARY method |
| Capture Order API | ✅ PASS | Server-side capture + subscription activation |
| Admin notification | ✅ PASS | Coach gets bell notification "دفع PayPal جديد ✅" |
| Payment record | ✅ PASS | Record in subscription_requests (status=approved) |
| Webhook route | ✅ PASS | Rejects unsigned requests with 401 |
| Webhook signature verification | ✅ PASS | Uses verify-webhook-signature API |
| Idempotency (PayPal-Request-Id) | ✅ PASS | Same ID returns same result |
| Idempotency (HTTP 422 handling) | ✅ PASS | ORDER_ALREADY_CAPTURED → fetch details |
| Idempotency (affiliate commission) | ✅ PASS | orderId as external_reference |
| Manual payment (InstaPay) | ✅ PASS | Unchanged — QR + receipt + coach approval |
| Manual payment (Vodafone Cash) | ✅ PASS | Unchanged |
| TypeScript | ✅ PASS | 0 errors |
| ESLint | ✅ PASS | 0 errors, 6 pre-existing warnings (window.location.href usage in client components) |
| Build | ✅ PASS | exit 0; 3 PayPal routes registered |

### PayPal Routes
- `POST /api/paypal/create-order` — creates PayPal Order (server-side price)
- `POST /api/paypal/capture-order` — captures payment + activates subscription
- `POST /api/paypal/webhook` — verifies signature + logs events

### Live Readiness
- Code is Live-ready when Vercel env vars are set:
  - `PAYPAL_MODE=live`
  - `PAYPAL_CLIENT_ID` + `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (same value)
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_WEBHOOK_ID`
- Migration 0016 must be applied to production Supabase

---

## Checkout Flow Hardening (2026-08-24)

### Duplicate PayPal Buttons Fix
**Root cause:** `PayPalButtons` component's `useEffect` had `onSuccess` and `onError` as inline functions (new identity every render). React's dependency diffing saw them as changed on every render, causing the PayPal SDK to re-mount button instances into the same container — visually duplicating the buttons.

**Fix applied** (commit `a5b6a9a`):
1. `useState(rendered)` → `useRef(renderedRef)` — ref mutations do not trigger re-renders, so the guard is stable.
2. `handlePayPalSuccess` and `handlePayPalError` wrapped in `useCallback` — stable function identity across renders.
3. `useCallback` declarations moved **before** the `if (!plan) return` early return (React hooks rules — hooks must not be called conditionally).
4. Render error resets `renderedRef.current = false`, allowing retry if the first render attempt fails.

**Verification:**
- ✅ No duplicate PayPal button instances observed in `/checkout`
- ✅ Payment logic unchanged (PayPal remains PRIMARY; InstaPay + Vodafone Cash unchanged)
- ✅ No API routes or DB changes

### Coaching Page CTA + Auth Return Flow (commit `e0c6f0e`)
- ✅ "ابدأ تحوّلك" / "Start your transformation" button → smooth-scroll to `#coaching-pricing`
- ✅ "ابدأ الآن" / "Start now" tier buttons → `/checkout?tier=X&months=1` (logged-in) or `/auth?mode=signup&next=/checkout%3Ftier%3DX%26months%3D1` (logged-out)
- ✅ `next` URL param preserved across login form, signup form, and Google OAuth callback
- ✅ After successful auth, user is redirected to the originally-requested checkout URL

---

## AI Provider Consolidation + Critical Fixes (2026-08-27)

### Verification Protocol Evidence

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| ESLint | `npx eslint .` | ✅ 0 errors (543 pre-existing warnings, untouched files) |
| Tests | `npx vitest run` | ✅ 34/34 passed (3 files) |
| Build | `npx next build` | ✅ Compiled successfully |
| Sync | `git fetch && rev-parse HEAD vs origin/main` | SYNCED before work |

### Scope executed (owner directives 1–6 + critical fixes)

1. **Providers → OpenRouter + Groq only**: `AIProvider = "openrouter" | "groq"`; deleted `gemini-wrapper.ts`, `src/lib/ai.ts` (dead Z.ai), `openrouter-flash.ts` (dead); removed `@google/genai` dependency; rewrote `external-search.ts`, `blog-images.ts`, `/api/ai/generate-image`, swap/research/step2-generate routes onto the unified chain.
2. **Per-language article generation preserved and fixed**: step2c now reads queue-row `topic_ar/focus_keyword_ar` (was reading nonexistent `bundle.topic_ar` → AR writer always received the EN topic); migration 0021 back-fills the columns.
3. **Deterministic calories**: `computeNutritionTargets()` server math (Mifflin-St Jeor correct for females, activity multipliers, goal deficit/surplus, protein-first macros, US Navy body fat), mandatory injection into prompts, re-enforcement in `normalizeNutritionPlan()`. AI no longer decides the numbers.
4. **EVO clear-chat button removed** (widget + /chat page) — quota evidence can no longer be wiped.
5. **Vercel 60s cure**: chain self-clamps `maxModels × timeoutMs ≤ 52s`; all `maxDuration=300/180` clamped to 60; GHA workflow gives every pipeline step a 3-attempt retry loop with 120s backoff.
6. **All Gemini via OpenRouter/Groq**: see #1 — no native Google SDK calls remain (`grep -r "@google/genai" src/` → empty).

Critical findings fixed: G1/G2 (tamper-proof `evo_chat_usage` ledger, migration 0022, record-before-dispatch), G3/G4 (verified-session tier with active+expiry filters, admin-client fallback), G5 (subscriber gate by actual tier incl. logged-in free users), regenerate-meal quota (uses weekly meal-swap quota), ilike filter escaping in blog search, message/history length clamps, client renders/persists 429 correctly, step2d no longer overwrites per-language image/social data, female BMR constant fixed in ai-local, questionnaire notes now reach plan prompts.

### Owner actions required after deploy

1. Run on Supabase SQL Editor: `supabase/migrations/RUN_ON_SUPABASE_SECURITY_0017_0018.sql` (if not yet applied) **then** `0021_blog_queue_topic_ar.sql` then `0022_evo_chat_usage.sql`.
2. After each: `NOTIFY pgrst, 'reload schema';`
3. Verify Vercel env vars: `OPENROUTER_API` (or alias) + `GROQ_API_KEY` set; remove unused legacy keys.
4. Trigger one manual `workflow_dispatch` of the blog pipeline and confirm steps 2a→3 go green with the new retry loops.

### Known accepted trade-off (documented)

Blog Step 2a research is model-knowledge based (no live web grounding — that requires the banned direct Gemini SDK). Only trusted health hosts are stored as `host`, URLs are never persisted or published.

## Homepage AR Mirror — /ar Real Page (2026-08-30)

**Task:** HOMEPAGE-AR-MIRROR (owner: «ابدأ خطة إصلاح للأخطاء اللي وجدتها ونفذها»)
**Files:** `src/app/ar/page.tsx`, `src/lib/i18n.tsx`, `src/app/layout.tsx`, `src/app/ar/layout.tsx`, `src/app/sitemap.ts`

| Check | Command / Method | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors (4 pre-existing image-import errors on fresh clone disappear once `next-env.d.ts` is generated — verified identical on a stashed clean tree) |
| ESLint | `npx eslint .` | ✅ 0 errors / 743 pre-existing warnings; changed files: 0 problems |
| Tests | `npx vitest run` | ✅ 160/160 (14 files) |
| Build | `npx next build` | ✅ exit 0, /ar route compiled |
| Live smoke — /ar SSR | `next start` + curl | ✅ HTTP 200, 3144 visible chars / 2308 Arabic chars (was 59/1 — empty redirect shell), no redirect, URL stays `/ar` |
| Live smoke — / regression | `next start` + curl | ✅ 3736 visible chars, English unchanged (1 Arabic char = toggle glyph) |
| Browser E2E (English-locale browser) | agent-browser | ✅ /ar renders full Arabic RTL homepage with no saved preference and English browser settings; toggle /ar→/ (EN) and /→/ar (ع) round-trip correct |
| SEO consistency | code + build output | ✅ sitemap lists `/` + `/ar` with hreflang alternates; /ar canonical = `/ar` |
| Sync | `git fetch && rev-parse HEAD vs origin/main` | SYNCED (5a5d0ff) before work |

### Post-deploy verification (owner/Vercel)

1. Open `https://musclehubeg.vercel.app/ar` in a NON-Arabic browser (or incognito with English settings) → full Arabic homepage, URL unchanged.
2. `curl -s https://musclehubeg.vercel.app/ar | grep -o 'منصتك الرياضية الشاملة' | head -1` → Arabic SSR content present.
3. `https://musclehubeg.vercel.app/sitemap.xml` contains both `/` and `/ar` with `xhtml:link` alternates.
4. Google Search Console: request indexing for `/ar` (it was previously an empty redirect shell and may need a nudge).

## AR Mirrors SEO Completion — Inner Pages (2026-08-30)

**Task:** HOMEPAGE-AR-MIRROR-FOLLOWUP (owner: «كمل باقى الصفحات»)
**Files:** `src/app/ar/{layout,page,blog/page,exercises/page,foods/page,memberships/page}.tsx(x)`, `src/app/blog/page.tsx`, `src/app/{exercises,foods,memberships}/layout.tsx`, `src/app/sitemap.ts`

| Check | Command / Method | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (changed files) | `npx eslint <changed>` | ✅ 0 problems |
| Tests | `npx vitest run` | ✅ 160/160 (14 files) |
| Build | `npx next build` | ✅ exit 0 |
| AR pages SSR (next start) | curl /ar/blog /ar/exercises /ar/foods /ar/memberships | ✅ HTTP 200, Arabic SSR content (336–1940 Arabic chars), per-page Arabic titles («المدونة الرياضية»، «مكتبة التمارين»، «قاعدة بيانات الأكلات»، «العضويات والباقات») |
| Canonical per page | curl + parse `<link rel=canonical>` | ✅ /ar→/ar, /ar/blog→/ar/blog, /ar/exercises→/ar/exercises, /ar/foods→/ar/foods, /ar/memberships→/ar/memberships, /blog→/blog (was leaking "/"!), layout leak removed |
| hreflang both sides | curl + parse `hrefLang` tags (Next 16 renders camelCase — functionally identical) | ✅ en/ar/x-default on every pair member, EN↔AR reciprocal |
| Sitemap | curl /sitemap.xml | ✅ 9732 URLs incl. /ar, /ar/blog, /ar/exercises, /ar/foods, /ar/memberships with xhtml:link alternates |
| Sync | `git fetch && rev-parse` | SYNCED (f8ceccd) before work |

### Post-deploy verification (owner)

1. `curl -s https://musclehubeg.vercel.app/ar/blog | grep -o 'rel="canonical" href="[^"]*"'` → `.../ar/blog` (not `/ar`).
2. `curl -s https://musclehubeg.vercel.app/sitemap.xml | grep -c 'xhtml:link'` → >0 with AR mirror entries.
3. Search Console → Sitemaps: resubmit; request indexing for the 4 new AR urls.

## Full-Site Page-by-Page Audit — EN + AR (2026-08-30)

Method: 2 python scripts hit **37 production URLs** (all EN static pages + detail samples + AR mirrors + noindex controls) and measured: HTTP status, SSR visible chars, Arabic chars, title, description, canonical, robots, hreflang set, h1 count, redirect chain. Same methodology as the homepage audit, extended site-wide.

### Audit verdict table (abridged)

| Check | Result |
|---|---|
| HTTP status / redirect shells | ✅ all 37 pages 200, zero redirect shells (the old /ar defect is gone) |
| Thin content | ✅ public pages 540–12712 visible chars; auth/checkout/profile thin but correctly `noindex, nofollow` |
| AR content | ✅ 6 AR pages 336–5617 Arabic chars, Arabic titles, RTL |
| h1 | ✅ exactly 1 per page (0 on noindex pages) |
| Blog EN↔AR posts | ✅ fully reciprocal hreflang + self canonicals both sides |
| /faq, /for-coaches, /for-coaches/register | ✅ intentional one-bilingual-URL pattern (documented in code) — left as designed |

### Defects found → fixed in this phase

| # | Defect (production-verified) | Fix | Verify |
|---|---|---|---|
| 1 | **Root canonical leak**: root metadata declared `canonical: homepage` + `en-US/ar-EG` hreflang → inherited by every page without own metadata: /about /contact /meal-planner /privacy /terms all said "I am the homepage"; ar-EG→/ar falsely claimed the AR homepage as their twin | Root `alternates` block removed; each indexable page now owns its signals | Local smoke: all 5 pages return self canonicals |
| 2 | **Hreflang code split**: root `en-US/ar-EG` vs per-page `en/ar` (mixed codes invalidate the cluster); homepage had no x-default | Homepage cluster now en/ar/x-default in new `src/app/(home)/layout.tsx` (route group — URL unchanged) | Local: `/` and `/ar` both report en→/, ar→/ar, x-default→/ |
| 3 | **/tools/water-tracker no metadata**: inherited /tools title AND canonical (told Google it IS the tools hub) | New `tools/water-tracker/layout.tsx` with own title/description/canonical | Local: title "Water Tracker \| Musclehubeg", canonical /tools/water-tracker |
| 4 | **5 static pages generic identity** (root default title/description) | Per-page metadata on about/contact/privacy/terms + meal-planner/layout.tsx | Local: distinct titles + canonicals |

### Verification evidence

| Check | Command | Result |
|---|---|---|
| tsc | `npx tsc --noEmit` | ✅ 0 errors |
| eslint | changed files | ✅ 0 errors / 0 warnings |
| vitest | `npx vitest run` | ✅ 160/160 (14 files) |
| build | `npx next build` | ✅ OK |
| Local smoke | 10-page script (8 fixed + faq/calorie controls) | ✅ ALL PASS |
| Homepage regression | visible chars | ✅ 3698 (identical to production pre-change) |
| /ar regression | Arabic chars | ✅ 4171 |

### Post-deploy verification (owner)

1. `curl -s https://musclehubeg.vercel.app/about | grep -o 'rel="canonical" href="[^"]*"'` → `.../about` (NOT the bare domain).
2. `curl -s https://musclehubeg.vercel.app/tools/water-tracker | grep -o '<title>[^<]*</title>'` → "Water Tracker | ..." (not "Free Fitness Tools").
3. `curl -s https://musclehubeg.vercel.app/ | grep -c 'x-default'` → 1.

## SEO/GEO Full-Stack + About/FAQ AR Mirrors (2026-08-30)

### Audit findings (production-verified before this commit)

| Area | Finding | Action |
|---|---|---|
| Speed (TTFB, 6 key pages) | 0.15–0.23s — excellent, no CDN fix needed | none |
| Image alt (homepage) | 22/22 meaningful alt | none |
| 404 handling | correct 404 status | none |
| robots.txt AI crawlers | legacy only (no OAI-SearchBot/ClaudeBot/Applebot) | ADDED 7 crawlers |
| llms.txt | 404 (missing) | CREATED |
| foods/[slug] schema | no nutrition markup | ADDED NutritionInformation |
| memberships schema | no pricing markup | ADDED OfferCatalog |
| /about + /faq AR mirrors | did not exist | BUILT |

### New pages

| Page | Verify (local) |
|---|---|
| /ar/about | canonical /ar/about · hreflang pair both sides · 2188 Arabic chars · 1×h1 · Arabic title «عن Musclehubeg» |
| /ar/faq | canonical /ar/faq · hreflang pair both sides · 4186 Arabic chars · FAQPage JSON-LD 18 questions (AR-first) |

### GEO deliverables

- `public/llms.txt` — machine-readable site guide (sections, prices, key facts) for ChatGPT/Claude/Perplexity citation
- `public/robots.txt` — OAI-SearchBot, ClaudeBot, Applebot(+Extended), Meta-ExternalAgent, Amazonbot, YouBot all `Allow: /`; new AR mirrors + llms.txt in Allow list
- `foods/[slug]` — NutritionInformation schema (per-100g calories/protein/carbs/fat) → AI answer engines can cite
- `/memberships` — OfferCatalog schema (Free/Premium/Pro/Coaching storefront prices, USD)

### Verification evidence

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 · 160/160 · OK (/ar/about + /ar/faq in route list) |
| Local smoke (11 pages) | ALL PASS — hreflang reciprocal on 7 mirror pairs now |
| Sitemap | 9734 urls, 28 xhtml:link alternates (was 20) |
| Homepage regression | 3736 visible chars — identical |

### Post-deploy verification (owner)

1. `curl -s https://musclehubeg.vercel.app/llms.txt` → 200, starts with "# Musclehubeg"
2. `curl -s https://musclehubeg.vercel.app/ar/faq | grep -c 'ar-EG'` → >0 (Arabic OG locale)
3. `curl -s https://musclehubeg.vercel.app/foods/chicken-breast | grep -o NutritionInformation` → found
4. Search Console → Sitemaps: resubmit; request indexing for /ar/about + /ar/faq

## Homepage UI Repair + Reformat (2026-08-30)

### Audit findings (production + real-browser verified before this commit)

| # | Defect | Impact |
|---|---|---|
| 1 | All 4 food cards → `/foods?cat=undefined` (slug field missing from card data) | Every food tile opened the EMPTY «0 foods / No results» state |
| 2 | Cardio card advertised «0 exercises» | Library has ZERO cardio entries; back (114) & shoulders (125) not shown at all |
| 3 | AR leaks: category cards + footer Resources + 7× /memberships + legal buttons (navigate → always-EN) | Arabic visitor dropped onto English pages although AR mirrors exist |
| 4 | Same post in BOTH «Latest» & «Featured» carousels | 4 live duplicates on the homepage |
| 5 | Affiliate program: no homepage section | A whole service invisible on the landing page |
| 6 | Dead code: IMAGES const (15 paths), gray→gray GradientFade, dup section numbering | Maintenance noise |

### Fixes

| Fix | Detail |
|---|---|
| Food slugs | `protein / carb / fat / fruit`; «فواكه وخضار» relabeled «فواكه / Fruits» (matches real filter) |
| Exercise grid | ALL 7 real categories with live counts + 8th dark «All Exercises 868+» tile (replaces old button) |
| AR-aware links | `/ar/exercises?cat=*`, `/ar/foods?cat=*`, `/ar/blog`, `/ar/about`, `/ar/faq`, `/ar/memberships` (×7), `/ar/coaches/[slug]`; legal buttons now crawlable `<a>`; programs/tools stay EN (no mirrors — documented) |
| Dedup carousels | latest = min(8, ceil(n/2)); featured only from remainder — node-simulated n=1..30 ALL PASS |
| Affiliate section | Section 11 (between Memberships & FAQ): badge + «حوّل تأثيرك إلى دخل.» + 20% / 30-day / $10 chips + CTA; hidden for staff (ROLE SURFACE LAW) |
| Cleanup | IMAGES removed, dead fade removed, food fade moved inside blog conditional, sections renumbered 11/12/13 |

### Verification evidence

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors · 160/160 · OK |
| Local smoke EN (agent-browser) | 7 category cards w/ real counts (84/114/125/297/78/71/99) + All tile · `/foods?cat=protein|carb|fat|fruit` · affiliate section + CTA · NO «0 exercises» · NO undefined |
| Local smoke AR (agent-browser) | `/ar/exercises?cat=` ×7 · `/ar/foods?cat=` ×4 · footer: /ar/exercises /ar/foods /ar/blog /ar/about /ar/faq · memberships → /ar/memberships ×7 · ZERO undefined hrefs |
| Dedup simulation | n=1..30 → 0 duplicates possible (n=14: latest 7 + featured 6 unique) |

### Post-deploy verification (owner)

1. Open the homepage → exercise grid shows 8 tiles (Chest/Back/Shoulders/Legs/Biceps/Triceps/Core + dark «All»), NO cardio card
2. Click any food tile → filtered foods list opens (NOT «No results»)
3. Switch to العربية → same tiles now link to /ar/... pages
4. Scroll under Memberships → new «برنامج الأفلييت» section appears (not visible for staff accounts)
5. Blog: no article appears twice across Latest + Featured

## Homepage UI Polish Round 2 (2026-08-30)

### Owner feedback → fixes

| # | Owner report | Root cause | Fix |
|---|---|---|---|
| 1 | «قسم الافلييت مش ظاهر» | Phase-45 section was `{!isCoach && …}` — owner's account is ADMIN → isCoach=true → hidden from the owner himself (anon check in Phase 45 passed, so it looked fine) | Gate removed — section renders for everyone (/affiliate is a public marketing page; header drawer rules untouched) |
| 2 | «قسم أنت مدرب؟ مكرر» | TWO entries: dark section 9.7 + footer CTA strip — same headline + same /for-coaches link | Footer strip removed; the rich dark section is the single coach entry |
| 3 | «عضويات المميزة محتاج تعديل بصرى + زر اشترك الآن بارز» | Cards were flat; «اشترك الآن» was a bare text link | Pro = dark hero card (glow + gradient POPULAR badge + big price + 5-item checklist); Premium = white card with checklist; BOTH got full-width CTA buttons — Pro button: blue gradient + glow shadow + hover scale |
| 4 | «قسم الكوتشينج محتاج يتحسن» | Section was headline + 2 buttons only | Added 4-feature icon grid (تغذية مخصصة / برامج متكيفة / متابعة شخصية / EVO AI 24/7) + clearer subline |
| 5 | «نفذ الاقتراح» | SiteHeader Paid-Services memberships link was always EN | AR-aware → /ar/memberships on every page that uses the shared header |

### Verification evidence

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors (9 pre-existing warnings) · 160/160 · OK |
| Local smoke EN (agent-browser) | affiliate section visible · «Subscribe now» buttons ×2 · «Are you a coach» ×1 (dedup ✓) · footer /for-coaches strip gone |
| Local smoke AR (agent-browser) | same ×4 + /ar/memberships ×8 · RTL rendering of dark Pro card + gradient CTA verified in screenshots |
| Full-page screenshots | EN + AR memberships/coaching/affiliate bands captured & reviewed |

### Post-deploy verification (owner)

1. Log in with the ADMIN account → scroll under Memberships → «برنامج الأفلييت» section now VISIBLE (this was the bug)
2. Search the page for «أنت مدرب؟» → appears ONCE (the dark section), not again in the footer
3. Memberships section → Pro card is dark with a glowing gradient «اشترك الآن» button; Premium has its own blue button
4. Coaching section → 4 small feature cards under the headline
5. Arabic mode → sidebar «الخدمات المدفوعة ← العضويات» opens /ar/memberships

## Homepage CTA Hygiene — Hero Section Navigator + Final-CTA Removal + Coaching De-EVO (2026-08-30)

### Owner feedback → fixes

| # | Owner report | Root cause | Fix |
|---|---|---|---|
| 1 | «قسم ابدأ رحلتك الرياضية يعتبر تكرار بدون داعى» | Old section 13 repeated the hero + memberships CTAs at the very bottom | Section deleted — FAQ is now the closing section before the footer |
| 2 | «شات ايفو بيتم الاعلان عنه فى كل مكان وهو مش CTA هو مجرد خدمة داخل الاشتراكات» | Hero button «جرّب EVO» + coaching-page hero button + coaching EVO section twin buttons + coaching final-CTA link all pushed EVO as a destination | PRINCIPLE: EVO is included-service info, not a CTA. Homepage: EVO = one equal nav chip. Coaching page: EVO hero button → «كيف يعمل الكوتشينج؟» anchor; EVO section reframed «المدرب + EVO معاك 24/7» + «جزء من باقة الكوتشينج، مش اشتراك منفصل» + single quiet outline link; final-CTA EVO link removed |
| 3 | «عدل ازرار الهيرو بحيث تكون ازرار تنقل للاقسام كلها بشكل جميل» | Hero had only 3 product CTAs | «استكشف أقسام الموقع» chip navigator: 11 pills, each with colored icon (Crown/Calculator/Dumbbell/ClipboardList/Salad/BookOpen/Users/Briefcase/Bot/Megaphone/CircleHelp); Memberships = single filled primary; smooth-scroll to new section ids with scroll-mt-20 |

### Verification evidence

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors (743 pre-existing warnings) · 160/160 · OK |
| Section anchors (server HTML) | id=evo/tools/exercises/programs/foods/blog/coaching/for-coaches/memberships/affiliate/faq all present on / and /ar |
| Chip ↔ section pairing | 11 chips EN+AR; blog chip auto-hides when the blog section hides (demo mode: 10 chips, 0 dangling hrefs) |
| Real-browser scroll test | Click «Memberships» chip → smooth-scrolls, section h2 lands exactly 80px below viewport top (sticky-header clearance) |
| Final CTA gone | «Start your fitness journey» / «ابدأ رحلتك الرياضية» — 0 matches in served HTML |
| Coaching page DOM | hero = [Start your transformation / How coaching works]; EVO chat button 0; «Learn more about EVO» ×1 (quiet outline); final CTA single primary |
| Screenshots | EN hero chips · AR hero chips (RTL) · memberships scroll landing · coaching EVO section · homepage bottom (FAQ → footer directly) |

### Post-deploy verification (owner)

1. Homepage top → under the headline you now see «استكشف أقسام الموقع» with 11 round buttons — click any one, the page GLIDES to that section
2. Scroll to the very bottom → page now ends with الأسئلة الشائعة then the footer (no more «ابدأ رحلتك الرياضية»)
3. /coaching → hero buttons are «ابدأ تحوّلك» + «كيف يعمل الكوتشينج؟» (no EVO button); the EVO section headline is now «المدرب + EVO معاك 24/7.» with one small button

## Admin Accounts — Mobile Delete Fix + Bulk «Delete Selected» (2026-08-30)

### Owner feedback → fixes

| # | Owner report | Root cause | Fix |
|---|---|---|---|
| 1 | «ازرار المسح لا تظهر على الموبايل» | Single wide <table> inside overflow-hidden wrapper overflowed the phone viewport → rightmost Actions column clipped off-screen | Below md the list renders as stacked CARDS with a flex-wrap action row — «تعليم تجريبي» + «مسح» always visible & tappable; md+ keeps the table |
| 2 | «مطلوب تحديد الحسابات وزر مسح كل المحدد» | No multi-select existed | Checkbox per row (admins disabled), select-all (desktop header + mobile pill), floating bottom bar: «محدد: N» + red «مسح كل المحدد» → TWO-STEP confirm (bar turns solid red) + «إلغاء التحديد» |

### API contract (DELETE /api/admin/accounts)

| Shape | Behavior |
|---|---|
| `{ user_id }` (legacy single) | unchanged semantics, now returns the batch-style summary |
| `{ user_ids: [...] }` (batch ≤100) | per-id guards: self_delete → skip · not_found → skip · admin_protected → skip; one protected row never blocks the batch |
| Response | `{ ok, deleted[], skipped[{id,reason}], failed[{id,error}] }` — UI drops deleted+skipped from selection, keeps failed for retry, toasts a summary |

### Verification evidence

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors (3 pre-existing any-warnings) · 160/160 · OK |
| Real-browser smoke @390×844 (stubbed-fetch dev page, removed pre-commit) | 6 cards ALL show visible Delete buttons; 2 checkboxes → floating bar; confirm state; bulk delete removed exactly the 2 selected; toast «2 account(s) and all their data deleted»; Test filter 2→1 |
| Admin protection mirrored | admin row: checkbox disabled + Delete disabled (UI) + skipped server-side |
| Desktop @1280 | table + header select-all + centered floating bar; selected rows highlight blue |

### Post-deploy verification (owner)

1. Open داشبورد الأدمن → الحسابات on your PHONE → every account card now shows زر «مسح» وزر «تعليم تجريبي» بوضوح
2. علّم على أي حسابات → يظهر شريط أسفل الشاشة «محدد: N» + زر أحمر «مسح كل المحدد» → أول ضغطة تحويله لـ«تأكيد المسح!» وثاني ضغطة تمسحهم كلهم
3. حسابات الأدمن: مربع التحديد وزر المسح مقفولين عليها (محمية حتى مع المسح الجماعي)

## Coach-Page Review + Staff Console Identity + AR For-Coaches Mirrors (2026-08-30)

### Owner requests → delivered

| # | Owner request | Delivered |
|---|---|---|
| 1 | Delete test account qa2.intruder…@mhtest.mh-qa.com | Purged via one-off GHA worker block (service-role, log verified DELETED_OK, remaining 0); note: the QA account carried role=admin (intrusion-test artifact) |
| 2 | «قائمة جديدة لعرض صفحات المدربين لمراجعتها والموافقة او الرفض عليها مع ارسال السبب» | 0046 review system: migration + /admin/coach-pages queue (pending first) + approve / reject-with-required-reason; every coach edit → pending automatically; rejection reason shown to the coach in his landing editor |
| 3 | «اعاده تنسيق صفحة الادمن وصفحة المدرب لانها بتتعرض كأنهم اعضاء» | Staff console identity: dark banners (admin #1d1d1f / coach violet #8b5cf6) + role chips + section-labelled sidebar + staff-colored active states; NEW /admin console home; admin login lands on /admin |
| 4 | Shelved topics: AR mirrors + speed + SEO/GEO | /ar/for-coaches + /ar/for-coaches/register real twins (reciprocal hreflang, AR-first metadata, AR FAQ schema, sitemap+robots+llms.txt); speed/SEO re-verified post-deploy |

### Review-system policy (single source of truth)

| State | Public page | Trigger |
|---|---|---|
| approved (default) | LIVE | admin approve · admin-own saves · pre-0046 rows |
| pending | HIDDEN | every coach PUT (edit or first publish) |
| rejected (+ note) | HIDDEN | admin reject — note 3-500 chars, shown in coach editor |

### Verification evidence

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors · 160/160 · ✓ (991 pages) |
| Real-browser smoke (temp ?__staff override — removed pre-commit) | /admin home grid + 2-pending badge ✓ · review approve/reject flow + textarea gating + counts ✓ · coach violet console ✓ · mobile review cards all actions visible ✓ |
| AR mirrors (server HTML) | /ar/for-coaches: lang=ar, dir=rtl, AR title + FAQ schema, canonical /ar/for-coaches, hreflang en/ar/x-default pair on BOTH sides ✓ · /ar/for-coaches/register 200 + AR title ✓ |

### Owner actions required after deploy

1. **شغّل هجرة 0046**: افتح Supabase SQL Editor وشغّل `supabase/migrations/RUN_ON_SUPABASE_0046_COACH_PAGE_REVIEW.sql` (آمنة لإعادة التشغيل — الصفحات المعتمدة حاليًا بتفضل شغالة)
2. افتح داشبورد الأدمن → هتلاقي لوجينك بدخلك على «لوحة الأدمن» الجديدة، وقائمة «صفحات المدربين» فيها أي صفحات في الانتظار (شارة برتقالية بالعد)
3. جرّب: ارفض صفحة تجريبية بسبب → سجل دخول بالمدرب → افتح «صفحتي» → هتلاقي سبب الرفض ظاهر في الأعلى

## Notifications — Click Marks Read + Review-Loop Bells (2026-08-31)

Owner feedback: «فى جرس الاشعارات بعد الضغط على الاشعار بيفضل موجود (غير مقروء)، مفروض يختفى (مقروء)» + audit request to verify the system and fill coverage gaps for admin / coach↔client.

### Root cause & fix

| # | Was | Now |
|---|-----|-----|
| 1 | Bell item click only navigated — nothing marked the row read (no per-item mark-read existed at all) | Click = READ: instant visual flip (badge drops, highlight clears) + DB update per row, on BOTH bells (member bell + staff bell) |
| 2 | Only 5 hardcoded links worked; referral / payout / progress notifications did nothing when clicked | Any notification whose link is a real path opens it directly |
| 3 | Coach-page review result (approve/reject) reached the coach only via the editor banner | Coach now ALSO gets a private bell row: approve → link to his live public page; reject → «سبب الرفض: …» + link to his editor |
| 4 | A coach saving his page went to the review queue silently — owner had to poll /admin/coach-pages | Admin gets a bell «صفحة مدرب بانتظار مراجعتك» with a link straight into the queue; deduped to ONE unread reminder per coach (no spam while he iterates; next save after you read it re-rings) |

### Contract notes

- Per-row read: Supabase RLS already allows a member to update his own `notifications` rows and staff/admin to update `admin_notifications` rows (own / broadcast / admin) — no migration needed.
- Review-result + pending-page rows are `admin_notifications` rows: review results carry `target_coach_id` = the reviewed coach (private, no leak); pending-page rows target admin profiles only.
- Notification insert failures are logged, never fail the review/save action itself.

### Verification

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors (0 new warnings) · 160/160 · ✓ |
| Local smoke | home + /admin/coach-pages + /coach/landing + /dashboard 200, touched API routes respond, no compile errors |

### Owner steps to verify after deploy (no migration needed this time)

1. سجّل دخول بحسابك (أدمن) → اضغط على أي تنبيه في الجرس → العداد والخلفية الملوّنة لازم يختفوا فورًا
2. جرّب ترفض أو توافق على صفحة مدرب من «صفحات المدربين» → سجّل دخول بالمدرب → جرس إشعارات المدرب هيظهر التنبيه بالنتيجة (ولو رفض، السبب مكتوب)
3. خلّي المدرب يعدّل صفحته ويحفظ → جرس الأدمن هيوصله «صفحة مدرب بانتظار مراجعتك»

## Staff Navigation Rethink + Coach System Hub + New-Coach Onboarding (2026-08-31)

Owner feedback: header account button opened the member-style /profile («عضويتك/أدواتك/حدودك») for admin+coach; the public page lived only in the main menu; new coaches had no guided page setup; coach-management tools were scattered.

### What changed

| # | Before | Now |
|---|--------|-----|
| 1 | Header account (avatar + drawer) → /profile for EVERY role | admin → لوحة الأدمن (/admin) · coach → لوحة الكوتش (/coach) · member keeps /profile |
| 2 | Member-style page unreachable for staff | «الصفحة الشخصية» card in admin home + button in coach console → /profile (and the member «ترقية» upgrade CTA is hidden for staff there) |
| 3 | Public page only in the main menu | «صفحتي العامة» 🌐 in the staff sidebar + coach console button + admin home card |
| 4 | New coach → dumped on the clients list | New coach lands straight on his page editor (/coach/landing) + gets «أكمل إعداد صفحتك العامة» bell; ALSO fixed: the welcome bell used to go to a channel coaches never see — now it reaches them |
| 5 | Coach with no page was INVISIBLE to the owner | Review queue now lists every staff member — «بدون صفحة» tab + badge, plus a manual «تذكير» button that pings that coach's bell |
| 6 | Coach tools scattered across 6 places | NEW page «إدارة نظام المدربين» (/admin/coach-system) gathers: صفحات المدربين · تعيين المدربين (+الرسوم والدفعات) · محافظ المدربين · دعم المدربين — first card in admin home + first sidebar extra |

### Verification

| Check | Result |
|---|---|
| tsc / eslint / vitest / build | 0 · 0 errors (warnings = exact pre-phase baseline, 0 new) · 160/160 · ✓ |
| Local smoke | 8 routes 200 incl. new /admin/coach-system; notify API responds; no compile errors |

### Owner steps to verify after deploy (no migration needed)

1. اضغط على صورتك في الهيدر وأنت بأدمنك → لازم تفتح «لوحة الأدمن» (مش صفحة العضويتك)
2. في لوحة الأدمن هتلاقي كارت جديد في الأول «إدارة نظام المدربين» — دوس عليه: كل أدوات المدربين في صفحة واحدة
3. «الصفحة الشخصية» و«صفحتي العامة» موجودين دلوقتي ككروت في لوحة الأدمن وأزرار في لوحة الكوتش
4. سجّل مدرب جديد تجريبي → هيفتح له محرر صفحته على طول، وجرسك يوصلك «مدرب جديد سجّل»، وصفحته تظهر في قائمة المراجعة تحت «بدون صفحة» وزر «تذكير» جنبها
5. اضغط «تذكير بإكمال الصفحة» → سجّل دخول بالمدرب التجريبي → هتلاقي التنبيه في جرسه

## Admin Dashboard Regroup + Client List at Scale — Phase 52 (2026-08-31)

Owner ask: «افحص داشبورد الادمن لان محتاج تنسيق الأزرار وتنسيق العملاء لانها مبعثرة (تخيل لو فى ١٠٠٠٠٠٠٠ مستخدم مسجل واقترح شكل ينظمهم)».

### ما اتغيّر
| # | قبل | بعد |
|---|-----|-----|
| 1 | صفحة الأدمن: 13 زرار في شبكة واحدة مبعثرة | 5 أقسام معنونة (المدربون / العملاء والعضويات / المحتوى / النمو والتسويق / حسابي) + شريط أرقام سريع فوق (عملاء · نشط · دفعات معلقة · صفحات للمراجعة) وكل رقم رابط |
| 2 | قائمة العملاء بتحمّل كل العملاء مرة واحدة وبتعرضهم كلهم | التحميل والفلترة والترتيب بيتعملوا في قاعدة البيانات — الصفحة تعرض 25 (أو 50/100) بس + سطر «يعرض كذا–كذا من كذا» + أزرار تنقل بين الصفحات |
| 3 | البحث بيفلتر الجهاز بعد تحميل الكل | بحث لحظي (يستنى 350ms) بيوصل لقاعدة البيانات ويرجّع أول صفحة من النتايج — شغال مهما كان عدد المسجلين |
| 4 | مفيش ترتيب | قائمة ترتيب: الأحدث تسجيلًا / الأقدم / الاسم / الأقرب انتهاءً |
| 5 | اختيار «عميل واحد» للإشعار كان قائمة منسدلة بكل العملاء | اختيار بالبحث: اكتب اسم/إيميل/رقم → تظهر أول 8 نتايج → اختار |
| 6 | عدادات التبويبات محسوبة من القائمة المحمّلة | محسوبة في قاعدة البيانات على كل العملاء (الطلب: get_coach_client_stats) |
| 7 | صفحة الحسابات بتعرض كل الحسابات في جدول واحد | 25 بالصفحة + زر تحديد بقى «تحديد الصفحة الظاهرة» (أأمن في المسح الجماعي) |

### عقود تقنية
- ملف تهجير جديد: `supabase/migrations/RUN_ON_SUPABASE_0047_CLIENT_LIST_PAGED.sql` — دالتين: `get_coach_client_list_paged(...)` + `get_coach_client_stats()` بنفس حدود الصلاحيات (الأدمن الكل، المدرب عملاؤه فقط، واشتراكات الكوتشينج فقط للمدرب). **لحد ما تشغّل الملف: الموقع شغال بالوضع القديم تلقائيًا (fallback) — مفيش أي حاجة هتتكسر.**
- `components/Pagination.tsx` مكوّن ترقيم مشترك (عملاء + حسابات).
- الحدود: صفحة حتى 100 صف؛ الترتيب ثابت (tiebreaker created_at+id) فالصفحات ما تتكررش.

### التحقق الآلي
- tsc 0 · eslint 0 errors (نفس عدد التحذيرات القديم بالظبط — صفر جديد) · vitest 160/160 · next build ✓
- سموكي محلي :3779: / · /admin · /admin/accounts · /admin/coach-system · /auth = 200، ومفيش أخطاء ترجمة في السجل.

### خطوات التحقق للمالك (بعد تشغيل ملف التهجير 0047)
1. افتح رابط الملف الخام من رسالتي وشغّله في Supabase SQL Editor زي كل مرة — المفروض يظهر صف واحد: `1 | 1 | 0 | 0 | 1`.
2. افتح الموقع → سجّل بحساب الأدمن → الصفحة الرئيسية للأدمن: هتلاقي الأزرار مقسّمة أقسام فوقها شريط الأرقام.
3. ادخل «العملاء»: تحت الجدول سطر «يعرض ١–٢٥ من كذا» وأزرار الصفحات — جرّب البحث والترتيب وتغيير عدد الصفوف.
4. جرّب «إرسال إشعار للعملاء» → «عميل واحد»: اكتب جزء من اسم عميل واختاره من النتايج.

## Library Pagination + Bottom Promos + Always-On Other Tools — Phase 53 (2026-08-31)

**الطلب:** «صفحة مكتبة التمارين تظهر ٢٠ تمرين ثم أزرار انتقال — ومكتبة الأكلات نفس الشىء — ثم أقسام دعائية أسفل الصفحات — وصفحات الأدوات: أسفل الصفحة صفحات أدوات أخرى من الموقع»

### إيه اللي اتغير
| # | قبل | بعد |
|---|---|---|
| 1 | مكتبة التمارين: تحميل تدريجي بالسكرول + زر «عرض المزيد» (48/دفعة) | ترقيم حقيقي: 20 تمرين بالصفحة + أزرار (السابق/الأرقام/التالي) + سطر «يعرض ١–٢٠ من ٨٦٨» — 44 صفحة |
| 2 | مكتبة الأكلات: نفس النظام القديم (60/دفعة) | 20 أكلة بالصفحة + نفس الأزرار — «يعرض ١–٢٠ من ٨,٨٣٠» — 442 صفحة |
| 3 | تغيير أي فلتر/بحث كان بيخليك تكمل من مكانك | أي فلتر أو بحث يرجّعك للصفحة الأولى تلقائيًا، وتغيير الصفحة بيرجعك أعلى النتائج بنعومة |
| 4 | المكتبتين مفيهمش أي قسم دعائي | أسفل كل صفحة: بانر داكن «جاهز توصل لمستوى أعلى؟» بزرين (خطط الاشتراك + الكوتشينج) + شبكة «استكشف المزيد من الموقع» بـ 6 روابط (المكتبتين، مخطط الوجبات، البرامج، الحاسبات، المدونة) — الصفحة الحالية مستثناة |
| 5 | «أدوات أخرى» في 4 حاسبات كانت بتظهر فقط بعد الحساب | بقت ظاهرة دايمًا أسفل كل صفحات الأدوات الستة قبل أي حساب |
| 6 | قائمة «أدوات أخرى» = 6 حاسبات/أدوات | بقت 8 بإضافة مكتبة التمارين ومكتبة الأكلات، وصفحة «كل الأدوات» ضاف بطاقتي المكتبتين |

### عقود تقنية
- نفس مكوّن الترقيم المشترك المستخدم في صفحة العملاء والحسابات (Phase 52) — شكل واحد في الموقع كله. مفيش أي ملف تهجير.
- النسخ العربية `/ar/exercises` و `/ar/foods` بتاخد التعديل تلقائيًا لأنها بتستخدم نفس الصفحة.
- الروابط الجديدة كلها روابط عادية قابلة للزحف (SEO-friendly).

### التحقق الآلي
- tsc 0 · eslint نظيف على الملفات المعدّلة · vitest 160/160 (14 ملف) · next build ✓
- سموكي محلي :3779 (ثنائي اللغة): /exercises · /foods · /tools · 5 صفحات أدوات — سطر الترقيم «Showing 1–20 of 868» و«Showing 1–20 of 8,830» يظهر في أول HTML، و«Other Tools» + الأقسام الدعائية موجودة قبل أي حساب.
- اختبار نقر حقيقي بالمتصفح: التمارين صفحة 2 → «Showing 21–40 of 868» · الأكلات «التالي» مرتين → «Showing 41–60 of 8,830» وكل صفحة فيها 20 بطاقة بالظبط.

### خطوات التحقق للمالك (مفيش ملف تهجير)
1. افتح الموقع → مكتبة التمارين: هتلاقي 20 تمرين وتحت سطر «يعرض ١–٢٠ من ٨٦٨» وأزرار الصفحات — دوس صفحة 2 أو «التالي».
2. مكتبة الأكلات: نفس الشكل — جرّب البحث أو فلتر (النتايج بترجع للصفحة 1 لوحدها).
3. انزل آخر صفحة التمارين أو الأكلات: هتلاقي البانر الداكن + شبكة استكشف الموقع.
4. افتح أي حاسبة (BMI مثلًا) من غير ما تحسب: انزل تحت — هتلاقي «أدوات أخرى» ظاهرة، وبها المكتبتين.

## One Coach-System Button + Row-Click Clients — Phase 54 (2026-08-31)

**الطلب:** «تنظيم الأزرار لم أجد أي تغيير — انقل كل ما يخص نظام المدربين في زرار واحد كما طلبت سابقاً + عدل قائمة العملاء للأدمن والمدربين وضيف الضغط في أي مكان في الصف لفتح إدارة العميل»

### ليه ما شفتش التغيير قبل كده
التنظيم السابق (الأقسام الخمسة) كان في **صفحة الرئيسية للأدمن فقط**، لكن القائمة الجانبية (و أزرار الموبايل) كانت لسه تعرض كل الصفحات مبعثرة — دي اللي بتشوفها في كل صفحة. النهارده القائمة نفسها اتنظمت.

### إيه اللي اتغير
| # | قبل | بعد |
|---|---|---|
| 1 | القائمة الجانبية للأدمن فيها 4 أزرار لنظام المدربين (إدارة النظام + الصفحات + التعيين + المحافظ) | زر واحد: «إدارة نظام المدربين» — وكل الأدوات الأربعة جواه في نفس الصفحة |
| 2 | الرئيسية للأدمن: قسم المدربين فيه 5 بطاقات | بطاقة واحدة «إدارة نظام المدربين» بشارة الانتظار الحية |
| 3 | مربع «صفحات بانتظار المراجعة» يفتح قائمة المراجعة مباشرة | يفتح صفحة إدارة نظام المدربين (اتساق مع الزر الواحد) |
| 4 | قائمة العملاء: فتح إدارة العميل كان لازم تضغط زر «إدارة» في آخر الصف | الضغط في أي مكان في الصف يفتح إدارة العميل — للأدمن وللمدربين (المؤشر بيتحول ليد + الصف بيتظلل) |
| 5 | — | في وضع «إرسال إشعار → تحديد عملاء»: الضغط على الصف بيحدد/يلغي التحديد بدل ما يفتح العميل (عشان ما تتخرجش من وضع التحديد)، والعلامة والقائمة المنسدلة لتفقيط المدرب شغالة زي ما هي بدون قفزات |

### عقود تقنية
- الصفحات المنقولة (صفحات المدربين / التعيين / المحافظ / الدعم) لسه موجودة وشغالة — ب ت ت ف ت ح من جوه صفحة «إدارة نظام المدربين» ومن الإشعارات مباشرة. مفيش أي حاجة اتشالت.
- قائمة العملاء واحدة بتخدم الأدمن (كل العملاء) والمدرب (عملاؤه فقط) — التعديل نفذ مرة واحدة على المكوّن المشترك. مفيش ملف تهجير.

### التحقق الآلي
- tsc 0 · eslint 0 errors (نفس تحذيرات الـ any القديمة، صفر جديد) · vitest 160/160 (14 ملف) · next build ✓ (993 صفحة)
- مراجعة فرق الكود: 3 ملفات — القائمة الجانبية، الرئيسية، مكوّن قائمة العملاء.

### خطوات التحقق للمالك
1. افتح الموقع وسجل بحساب الأدمن → بص على القائمة الجانبية: هتلاقي «إدارة نظام المدربين» مرة واحدة، ومفيش «صفحات المدربين» أو «تعيين المدربين» أو «محافظ المدربين» جنبها.
2. ادخل «إدارة نظام المدربين» → هتلاقي الأدوات الأربعة كلها جواه.
3. من الرئيسية: قسم المدربين بقى بطاقة واحدة.
4. افتح «العملاء» → دوس على أي مكان في صف أي عميل (مش على زر الإدارة) → ه يفتح إدارة العميل.
5. جرّب كمان وضع «إرسال إشعار للعملاء» → «تحديد عملاء» → الضغط على الصف بيعلّم عليه، ومش هيفتح العميل.

## Phase 55 — صندوق الدعم (تذاكر العملاء) — إصلاح «الرسائل لا تصل للصندوق»

**المشكلة:** رسالة الدعم من العميل كانت بتتحفظ وبيوصلك إشعار فيها، لكن الصندوق نفسه كان بيقرأ من المتصفح مباشرة وأي فشل فيه كان بيظهر قائمة فاضية من غير أي رسالة خطأ.

**الإصلاح:** الصندوق بقى يقرأ ويرد من الخادم مباشرة، ولو حصل أي فشل هيظهرلك رسالة خطأ واضحة وزر إعادة المحاولة.

**خطوات التحقق (بدون أي هجرة):**
1. من حساب عميل (أو اطلب من أي عميل): افتح «الدعم» واعمل تذكرة جديدة بموضوع ونص واضحين.
2. اتأكد إن إشعار «تذكرة دعم جديدة» وصلك في الجرس.
3. افتح صندوق الدعم (نفس الصفحة اللي بيفتحها الإشعار) → التذكرة لازم تظهر في القائمة باسم العميل.
4. افتح التذكرة → اكتب رد وابعته → اتأكد إن الرد ظهر، وحالة التذكرة بقت «قيد الانتظار»، والعميل استلم إشعار بالرد.
5. جرّب زر «إغلاق» ثم «إعادة فتح» → الحالة تتغير في القائمة.
6. لو ظهرت رسالة خطأ حمراء بدل القائمة → ابعتلي نصها فورًا (ده بيوفر وقت التشخيص).

## Phase 56 — اختبار حقيقي لحساب مدرب + صفحة عامة كاملة

**اللي اتعمل فعلًا على موقعك الحقيقي:** اتعمل حساب مدرب حقيقي، ودخلت عليه من صفحة الدخول الحقيقية، واتملأت صفحته العامة من محرر الصفحة الحقيقي: نبذة عربي وإنجليزي + ٥ تخصصات + صورة شخصية + ٣ صور نتائج عملاء + لينكات انستجرام/فيسبوك/يوتيوب + رقم واتساب، واتضغط Publish. الصفحة اتأكد منها بكل بياناتها، ومفيش أي خطأ ظهر في أي خطوة.

**لقينا ونصلّحنا خطأ حقيقي:** صور المدربين في الصفحات العامة كانت مخلية أصلاً (مش بتظهر). اتصلّحت، والصورة الشخصية للمدرب الحقيقي أحمد زكى في صفحته المنشورة رجعت تظهر فورًا بعد الإصلاح.

**خطوة واحدة مطلوبة منك (اختبار الموافقة):**
1. ادخل حسابك (الادمن) → افتح صندوق الإشعارات → هتلاقي إشعار «صفحة مدرب بانتظار مراجعتك» → دوس عليه.
2. هيفتح لك قائمة مراجعة صفحات المدربين → هتلاقي صفحة «كابتن محمد أحمد» → اضغط موافقة (Approve).
3. افتح الرابط ده: https://musclehubeg.vercel.app/coaches/coach-mohamed-ahmed → الصفحة هتظهر كاملة بالصور والبيانات. جرّب كمان زر تغيير اللغة جواها.

**بيانات حساب المدرب التجريبي (احتفظ بيها أو احذفه وقتما تحب):**
- البريد: coach.mohamed.test@musclehub-test.com
- كلمة السر: MH#CoachTest2026x
- لو عايز تحذف الحساب خالص: من لوحة الادمن مفيش أمر حذف حاليًا — قولي وأنا أشيله من قاعدة البيانات مباشرة.

**خطوة اختيارية (تأمين إضافي — هجرة 0048):**
في ملف هجرة جديد باسم RUN_ON_SUPABASE_0048_COACH_PAGES_RLS_REVIEW.sql في المستودع. تشغيله بيقفل ثغرة صغيرة كانت تسمح بقراءة محتوى الصفحات اللي لسه في المراجعة من خارج الموقع (بما فيها رقم واتساب المدرب).
طريقة التشغيل (نفس طريقة 0047 بالظبط): افتح Supabase → SQL Editor → New query → انسخ محتوى الملف كله والصقه → Run. لو ظهر Success/Success. no rows returned فده تمام.

**ملاحظة مسجلة (مش عاجلة):** الصفحات غير الموجودة (رابط غلط) بتظهر شاشة 404 صح لكن كودها الداخلي 200 — محرك البحث مش هيفهرسها لأنها معلمة noindex، لكن ده محتاج معالجة أعمق في الوقت الحالي وده مسجل في السجل.

## Phase 57 — قسم شهادات المدرب (اختياري) على الصفحة العامة + هجرة 0049

**طلب المالك:** «ضيف قسم رفع شهادات المدرب اختيارى الى الصفحة العامة للمدربين ثم اعطينى رابط الهجرة raw».

**اللي اتعمل:** قسم جديد باسم «شهاداتك واعتماداتك (اختياري)» في محرر صفحة المدرب (بعد صور نتائج العملاء) — المدرب يرفع حتى 8 صور شهادات (JPG/PNG/WEBP حتى 5 ميجا) ويكتب اسم كل شهادة تحتها ويقدر يحذف أي واحدة. على الصفحة العامة القسم يظهر باسم «شهادات المدرب / Coach certificates» بعد نتائج العملاء، والقسم مش إجباري: لو المدرب مارفعش شهادات القسم مش هيظهر خالص. الشهادات بتخضع لنفس نظام مراجعة الأدمن (أي تعديل جديد بيوقف الصفحة للموافقة قبل ظهورها).

**التحقق التقني:** tsc 0 أخطاء / eslint 0 أخطاء / vitest 164/164 (منهم 4 فحوص جديدة لمعالجة الشهادات) / next build ✓.

**خطوة مطلوبة منك (تشغيل الهجرة 0049) — لازم قبل ما يظهر قسم الشهادات:**
1. افتح الرابط التالي في المتصفح: https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0049_COACH_CERTIFICATES.sql
2. حدد كل النص اللي هيظهر (Ctrl+A) وانسخه (Ctrl+C).
3. افتح Supabase → SQL Editor → اضغط New query.
4. الصق النص كله، واضغط Ctrl+End — لازم آخر سطر تقريه «END OF SCRIPT 0049» (لو مش شايفها يبقى النسخ ناقص).
5. اضغط Run — المطلوب يظهر: Success. No rows returned.

**بعد تشغيل الهجرة جرّب كده:**
1. سجّل دخول بحساب المدرب التجريبي (كابتن محمد أحمد) → لوحة الكوتش → «صفحتي العامة» → هتلاقي قسم «شهاداتك واعتماداتك (اختياري)» → ارفع صورة شهادة واكتب اسمها → اضغط «نشر الصفحة».
2. سجّل دخول بأدمنك → صندوق الإشعارات → افتح «صفحة مدرب بانتظار مراجعتك» → وافق على الصفحة.
3. افتح صفحة المدرب العامة → قسم «شهادات المدرب» هيظهر بالصورة والاسم.
4. لو أي مدرب سيب قسم الشهادات فاضي → الصفحة بتاعته بتظهر عادي من غير قسم الشهادات.

**ملاحظة أمان النشر:** ممكن تحدّث الكود يتعرض على الموقع قبل تشغيل الهجرة من غير أي مشكلة — الصفحات هتشتغل طبيعي والقسم هيظهر بس بعد تشغيل الهجرة.

## Phase 58 — معاينة الصفحة قبل الموافقة (بدل 404) + إصلاح زرار «ابدأ المتابعة»

**المشاكل اللي اتحلت:**
1. زرار «معاينة» في لوحة مراجعة صفحات المدربين كان بيفتح الرابط العام — والرابط العام بيرفض عرض أي صفحة لسه موافقتها مش تمت (دي حماية مقصودة). دلوقتي المعاينة بتفتح صفحة معاينة خاصة بالطاقم.
2. زرار «ابدأ متابعتك مع المدرب» في الصفحات العامة كان بيرجع أي زائر مسجل دخول لنفس الصفحة تاني. دلوقتي الزائر الجديد يشوف صفحة التسجيل عادي، والمسجل دخول يروح داشبورده.
3. المدرب كمان دلوقتي يقدر يعاين صفحته هو قبل الموافقة من زراير المعاينة في محرر صفحته.

**روابط الهجرات (raw) — للتشغيل في Supabase SQL Editor:**
- هجرة 0048 (إغلاق ثغرة قراءة الصفحات اللي في المراجعة من بره الموقع — اختيارية لكن يُنصح بيها):
  https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0048_COACH_PAGES_RLS_REVIEW.sql
- هجرة 0049 (قسم شهادات المدرب — لو لسه مش شغالة، قسم الشهادات مش هيظهر):
  https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0049_COACH_CERTIFICATES.sql

**طريقة التشغيل (لكل هجرة):**
1. افتح الرابط في المتصفح — هيظهرلك نص SQL، اعمل نسخ (Select All ثم Copy) أو من صفحة GitHub اضغط زرار «Copy raw file».
2. افتح مشروعك على supabase.com → من القائمة الجانبية اختار «SQL Editor» → زرار «New query».
3. الصق النص كله في المربع واضغط «Run».
4. لازم يطلع «Success. No rows returned» — كده الهجرة اتشغلت.

**اختبار المعاينة الجديدة:**
1. سجل دخول بأدمنك → «إدارة نظام المدربين» → «صفحات المدربين».
2. أي صفحة في الانتظار → اضغط «معاينة» → الصفحة هتفتح كاملة بشريط برتقالي تحت مكتوب فيه إنها معاينة غير منشورة + زرار يبدّل اللغة.
3. اعتمد الصفحة من نفس الشاشة → افتح الرابط العام /coaches/اسم-المدرب → هيظهر للعامة من غير الشريط البرتقالي.


## Phase 59 — الفحص الشامل لمنظومة التدريب + إصلاحين

**اتفحص إيه (كله اختبار حقيقي على الموقع):**
- تدريب الموقع للعميل: التسجيل → لوحة التحكم، صفحة خططي (تابين تمارين وأكلات + عداد الاستبدالات)، صفحة المتابعة (تسجيل وزن مرتين + الرسم البياني اترسم)، الاستبيانات (عبّيت الاثنين واتسجلوا), مساعد EVO (رد بالعربي)، مكتبة التمارين + تفاصيل التمرين، البرامج التدريبية + تفاصيل البرنامج.
- تدريب المدربين: دخول بحساب مدرب حقيقي → قائمة العملاء بالفلاتر والعدادات، فتح مساحة إدارة العميل بالضغط على أي مكان في الصف، كل التابات (الاشتراك، الخطط، خطط الذكاء الاصطناعي، الإشعارات، الاستبيانات، تقدم العميل)، حماية خطط الذكاء الاصطناعي (مقفولة لحد تفعيل اشتراك العميل — والرسالة واضحة)، المحفظة، محرر الصفحة العامة، والصفحة العامة ظاهرة للناس بزرار اشتراك سليم.
- الحماية: أي حد مش مسجل دخول يفتح صفحات الأدمن بيرجع لصفحة الدخول.

**مشكلتين لقيتهم وصلحتهم:**
1. صفحة البرامج التدريبية مكانتش ليها نسخة عربية (/ar/programs كانت بتطلع 404). دلوقتي النسخة العربية شغالة للصفحة الرئيسية وصفحات البرامج كلها، وزرار تغيير اللغة بينقلك ليها، وصفحات البرامج اتحطت في خريطة الموقع.
2. صفحة محفظة المدرب كانت مكتوب فيها «رسوم العميل الشهرية: 0$» للمدرب اللي الأدمن ماعملوش رسوم خاصة — لكن التفعيل الحقيقي بيخصم 6$ للشهر. دلوقتي بتظهر الرسوم الفعلية (6$) مش صفر.

**اللي محتاج منك (اختياري):** الفحص العميق لشاشات الأدمن محتاج تسجيل دخول بأدمنك — أنا اتأكدت إن الحماية شغالة بس مش هقدر أفتح الشاشات نفسها من غير بيانات الدخول. لو عايز فحص كامل للأدمن، ابعت لي بيانات حساب أدمن تجريبي.

## Phase 60 — الفحص العميق لشاشات الأدمن (بحساب الأدمن التجريبي 0050)

**اللي اتعمل:** شغّلت سكريبت 0050 (حساب الأدمن التجريبي) ودخلت بيه من صفحة الدخول الحقيقية ولفيت على كل شاشات الأدمن واحدة واحدة على الموقع الحقيقي.

**النتيجة — كل الشاشات شغالة وصفر أخطاء:**
- لوحة الأدمن: عدادات حية (11 عميل — 9 اشتراكات نشط — 0 صفحات مترجمة للمراجعة) + أقسام مرتبة + نسخة عربية كاملة.
- إدارة نظام المدربين: المركز الموحد بالعدادات (3 مدربين من غير صفحة) وروابطه الأربعة كلها شغالة.
- صفحات المدربين: اختبرت دورة كاملة حقيقية — رفضت صفحة المدرب التجريبي بسبب مكتوب → الصفحة اختفت من العامة → اعتمدتها تاني → رجعت ظاهرة للناس. سبب الرفض إجباري وزرار التذكير موجود.
- التعيينات: قائمة الموظفين بالأدوار وعدد عملاء كل مدرب، جدول الرسوم الشهرية، سجل تفعيلات المدربين، وقائمة 11 عميل بقائمة اختيار المدرب لكل عميل.
- المحافظ: أرصدة كل المدربين + طلبات الشحن + نموذج التعديل اليدوي.
- المدفوعات (عضويات الموقع): التابات والحالة الفاضية سليمة.
- صندوقا الدعم: دعم المدربين + صندوق تذاكر العملاء الموحد (التذاكر بتفتح بتفاصيلها وزر الرد والرد على تذكرة مقفولة).
- الحسابات: تعليم حساب كتجريبي اشتغل فعليًا (علامة TEST ظهرت وتاب Test بقى فيه 1) — أزرار الحذف موجودة ومش استخدمتها على أي حساب حقيقي.
- المدونة والإحالات والعملاء المحتملين والنتائج المحفوظة: كلها بتفتح بعداداتها وتصدير CSV.
- كأدمن عندي كمان صلاحيات المدرب كاملة: قائمة العملاء (11 عميل) والضغط على أي صف بيفتح إدارة العميل — ووزن العميل اللي سجلته ظهر في لوحة الأدمن (البيانات بتنقل صح بين العميل والمدرب والأدمن).
- جرس الإشعارات بيفتح (6 إشعارات حقيقية)، ورابط الحساب في الهيدر بيفتح لوحة الأدمن.

**ملاحظة أمان:** الحساب التجريبي أدمن كامل — لو حبيت تقفله بعد ما تخلص، امسحه من شاشة الحسابات أو شغّل سكريبت يمسحه.

## Phase 61 — ربط سوبابيز بجيتهاب + تجربة التحديث التلقائي (محتاج خطوة منك)

**اللي اتعمل:** وصّلت الربط بين سوبابيز وجيتهاب، ودفعات ملف تجربة بسيط على المستودع عشان أقيس لو التحديثات بتنزل لوحدها. القياس قلت بعد 6 دقايق: **لسه ما نزلش** — يعني فيه خطوة ناقصة أو الربط بيشتغل بطريقة الدمج بس.

**اللي محتاج منك (دقيقة واحدة):**
1. افتح موقع سوبابيز ومن القايمة الجانبية اختار **Integrations** وبعدها **GitHub**
2. بص على صفحة الربط: لو لاقيت زرار مكتوب عليه **Install GitHub App** أو **Configure** اضغط عليه
3. هيفتحلك جيتهاب — اختار مؤسستك وتأكد إن المستودع **musclehubeg** مختار واضغط **Save/Install**
4. ارجع واكتبلي **«تم»** — وأنا هجرب تاني على طول وأقولك النتيجة

**لو صفحة الربط شكلها سليم ومفيش زرار ناقص:** اكتبلي «سليمة» بس — ساعتها هجرب طريقة الدمج من عندي من غير أي خطوة منك.

**إزاي تعرف بنفسك إن التجربة نجحت:** افتح سوبابيز → **Table Editor** → دوّر على جدول اسمه **gh_sync_probe** — لو لقيته يعني التحديث التلقائي شغال، ومن ساعتها مش هتحتاج تشغل ملفات التحديث بإيدك خالص.

## Phase 61 (النتيجة النهائية) — الربط شغال: التحديثات بتنزل لوحدها ✓

**الخبر اللي يهمك:** بعد إصلاحين بسيطين (تنضيف سجل قديم بتاع الأرقام + تغيير أسماء ملفات قديمة)، **التحديث التلقائي من جيتهاب لقاعدة البيانات بقى شغال بالكامل** — التجربة نجحت فعليًا على الموقع: 3 ملفات تجريبية نزلوا لوحدهم في أقل من دقيقة ونص من لحظة الرفع، بدون أي خطوة منك.

**وشوف البرهان بنفسك (اختياري):** سوبابيز → **Table Editor** → هتلاقي جدول اسمه **gh_sync_probe** فيه 3 صفوف — دول ملفات التجربة اللي نزلوا لوحدهم. تقري في أي وقت وأمسحهم مع أول تحديث حقيقي.

**يعني إيه ده ليك من اليوم:**
- لما أحتاج أعمل تحديث في قاعدة البيانات: أرفعه على جيتهاب وهو بينزل لوحده في ثواني
- **مش هبعتلك سكريبتات تانية تفتح SQL Editor وتشغلها بإيدك** — إلا لو كانت حالة نادرة جدًا (إصلاح دفتر أو حاجة استثنائية وهقولك وقتها بوضوح)
- كل محاولة تحديث بتسجل تقريرها على جيتهاب — لو حصلت أي مشكلة بيبان فورًا وبنتعامل معاها من غير ما تحس

**ملاحظة أمان اتأكدت منها بالفحص:** أثناء التشخيص، الربط حاول يشغل ملفات قديمة من تأسيس المشروع — فحصتها واحد واحد قبل وبعد، والمحمية كلها اشتغلت من غير أي تغيير في البيانات، ومقالات المدونة الحقيقية كلها سليمة، واتقفل المسار ده نهائيًا بتغيير الأسماء.

## Phase 63 — تصحيح مهم لما قلته في Phase 61 + حل تنبيه سوبابيز + سر المقالات المكررة

**تصحيح أمانة (مهم):** في Phase 61 قلت لك «كل حاجة سليمة والبيانات ما اتأثرتش» — الجملة دي كانت صحيحة بالنسبة **للبيانات** (المقالات والحسابات والخطط كلها سليمة فعلاً)، لكن الفحص العميق الجديد كشف إن إعادة التشغيل الغلط اللي حصلت رجّعت **قواعد حماية داخلية** (قواعد بتحدد مين يشوف إيه في قاعدة البيانات) لنسخ قديمة. و0055 اللي شغلته سدّ أخطر 3 — والباقي (حوالي 30 قاعدة) سددها اليوم **تلقائيًا** بالنظام الجديد بدون أي خطوة منك.

**إيه اللي كان ممكن يحصل وشوفناه بنفسنا (اتصلح):**
- مدرب كان يقدر يشوف خطط وعملاء مدربين تانيين — جربنا بنفسنا قبل الإصلاح ولقيته حاصل فعلًا (10 خطط لعملاء غيره)، وبعد الإصلاح بقى يشوف عملائه هو فقط
- حساب الأدمن (وأنت) كان مش شايف بيانات العملاء في بعض الشاشات — رجع يشوف الكل بعد الإصلاح
- **التنبيه الأحمر اللي شفته في سوبابيز (RLS Disabled على gh_sync_probe):** ده جدول التجربة بتاع الربط — خدم هدفه، فاتمسح تلقائيًا، والتنبيه هيختفي من صفحة سوبابيز لوحده (ممكن ياخد وقت قصير)

**هل فيه حاجة محتاجة منك؟ لا.** كل حاجة نزلت واتطبقت لوحدها وتقرير جيتهاب الرسمي مكتوب عليه success.

**عن المقالات المكررة والصور الغريبة (اللي حصل بالظبط):**
- آخر مقال ظهرلك اتولد الصبح الساعة 5 بالليل — يعني **قبل** ما إصلاح التكرار ينزل على الموقع بنكتب ساعات
- إصلاح التكرار (تنوع أنواع المقالات + منع تكرار المواضيع + صور مرتبطة بموضوع المقال) رفع على الموقع امبارح بالليل وشغال من ساعتها
- أول دفعة مقالات بالمحرك الجديد هتظهر بعد الـ 11 بالليل بتوقيت القاهرة النهارده (النظام بيجهزها تلقائي كل يوم) — لو لقيت نفس مشكلة التكرار في الدفعة الجديدة ابعتلي روابط المقالات وهتتبع فورًا
- الخطط الغذائية والتدريبية: أي خطة هتتولد من أي مدرب من دلوقتي بتطبق عليها قواعد التنوع الجديدة (ممنوع تكرار أكل/تمارين من خطط العميل السابقة)

## Phases 65-69 — 2026-09-01: دفعة الأفيليت وصدق الصفحات (فحوصات أضيفت)

- **الأفيليت أساسًا:** affiliate_transactions + affiliate_commissions موجودان على الإنتاج (كانا غير موجودين تمامًا — تحقق PGRST205 قبل 0057)؛ referrals تُسجل من السيرفر عبر مشغل 0057 عند أي تسجيل بـ ?ref=CODE (عميل أو مدرب) — اختبر: افتح رابط ?ref=CODE → سجل كعميل → يجب صف referrals pending باسم الداعي
- **عمولة المدرب المُدعو:** اشحن محفظة مدرب سجل برابط أفيليت → فعّل عميلًا (6$ أو 16$) → يجب: affiliate_transaction نوعها coach_client_activation + عمولة 20% للداعي + earning + إشعارات؛ إعادة المحاولة لا تضاعف (فريد على معرف الدفعة)
- **قرار «عميل المدرب لا يُحسب» ما زال قائمًا:** دفعة عميل له مدرب عبر PayPal أو موافقة يدوية → صفر عمولة لأي طرف (البوابة داخل المحرك السيرفري في كلا المسارين)
- **الاسترداد:** حدث PAYMENT.CAPTURE.REFUNDED على طلب PayPal له عمولة → العمولة reversed والـ earning تتجمد أو يُنشأ clawback سالب لو كانت مصروفة
- **لوحات الأفيليت:** /referral (عميل) تُظهر قسم «مدربين دعّيتهم»؛ /coach/affiliate للمدرب والأدمن؛ /admin/referrals لوحة الدعوات — المدرب لا يُطرد من الأفيليت بعد اليوم
- **زر الإلغاء:** صفحة الحساب → إلغاء الاشتراك → cancel_requested_at يسجل، الوصول مستمر لآخر مدة مدفوعة، جرس أدمن، الحالة تظهر للعضو؛ لا يعمل بلا اشتراك نشط
- **أولوية الدعم:** تذكرة من عضو كوتشينج نشط → priority=high تُقرأ في صندوق الفريق بشارة حمراء؛ قرار الأولوية في السيرفر (لا يمكن تزويره من المتصفح)
- **صدق صفحات البيع:** /memberships و/evo و/coaching والرئيسية لم تعد تذكر: محتوى مميز، تحليل أنماط/تنبؤ، حفظ بيانات الجسم، تحديث تلقائي أسبوعي، Starter/Elite — أي إعادة إضافة لميزة تتطلب تنفيذها أولًا (قانون صدق الصفحات)
- **عداد خطط EVO:** شريط العداد في الويدجت للمدفوع يقرأ نفس سجل الإنفاذ — لو ظهر رقم مخالف للحد المعلن فهذا بلاغ فوري
- **حفظ خطط EVO:** زر «احفظ كخطة» يظهر على رد طلب الخطة (المدفوع) → الخطة في /plans فورًا؛ سقف 30 حفظًا/نوع/شهر ضد الإساءة
- **الاستبدال دائم:** بعد اكتمال استبدال AI، تحديث الصفحة يجب أن يحفظ النتيجة (كانت تضيع قبل Phase 69) — لو ظهر تنبيه «تعذر حفظ الاستبدال» فهو فشل شبكة والنتيجة معروضة بالجلسة فقط
- **قفل تصدير مخطط الوجبات:** المجاني يرى رسالة ترقية بدل ملف JSON (متسق مع سياسة الاسترداد التي تعتبر التصدير استخدامًا مدفوعًا)
- **الذاكرة للمدفوع:** المجاني يفقد سجل المحادثة بعد إغلاق المتصفح (localStorage جلسة فقط)؛ المدفوع يسترجع من chat_messages — قرار مالك معتمد

## Phase 70 — 2026-09-01: الرصيد الموحد لتوليد الخطط (فحوصات)

- **الرصيد واحد من كل المصادر:** العميل يولّد خطة من ايفو (يخصم من رصيده) ← المدرب يولّد لنفس العميل (يخصم من نفس الرصيد) ← عداد الويدجت عند العميل يعرض المجموع في الحال. أي رقم في العداد لا يظهر أقل من الاستهلاك الحقيقي مهما كان مصدر الخطط
- **حدود الرصيد حسب باقة العميل:** بريميوم 3 تغذية + 3 تمارين شهريًا، برو 6+6، كوتشينج 3+3 — تصفير أول الشهر بتوقيت UTC
- **سقف المدرب طبقة إضافية:** 4+4 لكل عميل/شهر (الوظائف المكتملة فقط — الفاشل لا يحرق) — الزر يتقفل عند نفاد أي من الحدين
- **رسالة نفاد الرصيد للمدرب:** «رصيد الخطط الشهري للعميل خلص (X/Y)... التوليد منك أو من ايفو بيخصم من نفس الرصيد» مع used/limit حقيقية
- **شرط التفعيل أولًا:** مدرب بعميل غير مفعّل → 402 برسالة التفعيل (لم يتغير)؛ عميل بلا اشتراك نشط → حد 0 (ممنوع التوليد من أي مصدر)
- **الأدمن:** بلا سقف شخصي، لكن كل خطة يولدها لعميل تُحسب في رصيد العميل نفسه (العداد صادق)
- **فحص يدوي مقترح:** فعّل عميلًا لمدرب (6$) → ولّد له 3 خطط تغذية من زر المدرب → حاول رابعة (يجب رفض بسقف المدرب 4 أو رصيد العميل 3 حسب باقته) → العميل يفتح ايفو ويطلب خطة (يجب رفضه بنفس الرصيد) → أول الشهر التالي يرجع الرصيد
- **عداد الويدجت للمدفوع:** يقرأ الرصيد الموحد — لو ظهر رقم لا يشمل خطط المدرب فهذا بلاغ فوري

## Phase 71 — 2026-09-01: مراجعة الباقات + أدمن بلا حدود + خطط لغير الأعضاء (فحوصات)

- **صدق الباقات:** أي صفحة بيع (الرئيسية/العضويات/ايفو/الكوتشينج/المدربين/عن الموقع/الشروط/الأسئلة/السيو) لا تذكر أصلًا: محتوى مميز، تحليل أنماط، تنبؤ بالنتائج، تحديث تلقائي أسبوعي، PDF للخطط، Starter/Elite، «Coaching غير محدود» — كل وعد لازم يقابله تنفيذ
- **حدود الباقات المعروضة:** مجاني (ايفو 10/يوم، خطط 0، مخطط وجبات 3 وجبات/حفظ 1، نتائج 3) — بريميوم 14.99$ (خطط 3+3، تبديلات 3/أسبوع، مخطط 6/10، نتائج 50+تصدير) — برو 29.99$ (6+6، 6/أسبوع، 8/50، نتائج 200، بدون إعلانات) — كوتشينج 39.99$ (كحدود بريميوم + مدرب بشري + أولوية) — أي اختلاف بين الصفحة والتنفيذ بلاغ فوري
- **الأدمن بلا حدود:** سجّل بحساب أدمن → احفظ نتائج أدوات أكتر من 50 → احفظ جداول مخطط وجبات أكتر من 10 → احفظ خطط ايفو أكتر من 30/شهر → كلها لازم تمر بلا رسالة حد؛ وافتح أي صفحة عامة → لا إعلانات للأدمن أبدًا
- **خطط لغير الأعضاء:** /admin/external-plans → أنشئ خطة (اسم + نوع + عنوان + تفاصيل يدوية) → تظهر في القائمة → نسخ كنص وتحميل txt يعملان → تعديل وحذف يعملان → الفلاتر (نوع/حالة) والبحث بالاسم/العنوان يشتغلوا → العدادات صادقة
- **حماية الأداة:** /api/admin/external-plans بدون جلسة أدمن = رفض (401/403 على الإنتاج)؛ كوكب غير أدمن (مدرب) = 403؛ الجدول على قاعدة البيانات مقفول بـ RLS للأدمن فقط
- **الشخص الخارجي:** الخطة تُستلم كنص (نسخ أو ملف) — لا حساب ولا دخول مطلوب من صاحب الخطة، ومفيش أي بيانات بيتجمع منها
