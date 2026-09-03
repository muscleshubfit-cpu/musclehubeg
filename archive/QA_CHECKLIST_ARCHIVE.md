# archive/QA_CHECKLIST_ARCHIVE.md — Historical QA evidence

> **Created:** 2026-09-02 (Phase 82 shrink) — moved verbatim from root QA_CHECKLIST.md. Nothing deleted. **Append-only ritual (Phase 107):** dated blocks are ADDED here when the living QA_CHECKLIST.md slims down — nothing is edited or deleted.

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


---

# ملحق 2026-09-03 (Phase 107 — knowledge operating system)

> جداول التحقق من «Phase 102-run» لحد «Phase 80» منقولة حرفيًا من `QA_CHECKLIST.md` وقت التنحيف — آخر 5 مراحل بس اللي فضلت حية فوق، والحالة الرسمية بقت في `STATE.md`.

## Previous Verification — 2026-09-03 (Phase 102-run — 0066 v2 CORRECTION: owner ran the script live and hit `42703 column "user_id" does not exist` on coach_presence; live column-by-column probe of production found the mirror wrong for that ONE table — fixed to coach_id and re-shipped via the same raw link — owner «شغل الاسكريبت الى بعتهولى ٠٠٦٦ وعرفنى النتيجة»)

| Check | Result | How verified |
|---|---|---|
| Live incident report | ✅ | owner's SQL Editor run aborted with `42703: column "user_id" does not exist` at `delete from public.coach_presence where user_id = v_uid` — the DO block is ONE transaction → automatic rollback = ZERO partial deletion (account verified still alive immediately after, login probe HTTP 200) |
| Live schema probe (no guessing, no mirror) | ✅ | PostgREST probe on production for every column 0066 touches (`select=<col>&limit=1` → 200 exists / 42703 missing): chat_messages.client_id ✅ · saved_results.user_id ✅ · meal_plans.user_id ✅ · plan_swaps.user_id ✅ · **coach_presence.user_id ❌ GONE** · progress_photos.user_id ✅ · subscription_requests.user_id ✅ · evo_chat_usage.user_id ✅ · ticket_messages.sender_id ✅ · tool_leads.email ✅ · coach_wallet_transactions.created_by ✅ — the ONLY wrong column was coach_presence |
| coach_presence REAL live columns | ✅ | id · coach_id · last_seen · updated_at (NO user_id, NO status) — types.ts mirror was wrong for this ad-hoc Phase-5 table (app's presence helpers in data/coach.ts query user_id/status that don't exist live → silently return offline; recorded as a Phase 104 candidate, NOT touched here) |
| 0066 v2 fix | ✅ | one-line correction `coach_presence.coach_id = v_uid` + header v2 note + INDEX.md 0066 row updated; all 10 other columns hard-verified live before re-shipping; script stays atomic/idempotent/email-scoped |
| Account state after failed run | ✅ ALIVE | login probe with the 0050-documented credentials → HTTP 200 + profile row (role=admin, is_test_account=false, created 2026-08-31) — proves the failed run deleted nothing |
| Why this script stays manual | ✅ | auth.users ops are manual by project precedent (0040/0050/0055); auto-migrating it risks blocking the whole pipeline (0054 lesson) — all timestamped scripts (0064/0065/0067) DO run automatically |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0066 row (v2 note) · QA_CHECKLIST Phase 102-run · PROGRESS Phase 102-run + «آخر تحديث» · worklog Task 102-run · AGENTS.md law text unchanged |
| Owner action | ⏳ | SAME raw link (now serves v2) → SQL Editor → paste → Run → final grid MUST show 3 zeros → reply تم |

## Previous Verification — 2026-09-03 (Phase 103 — ADMIN CLIENTS UNIFICATION: the 5-point Admin Panel 2.0 correction round — owner «go , + مفروض سكريبتات سوبابيز تتنفذ تلقائي» after the plan-first audit)

| Check | Result | How verified |
|---|---|---|
| Plan-first compliance | ✅ | full read-only audit presented BEFORE any file change (owner: «راجع الطلبات الاول وادرس الامر ثم اعرضة قبل التنفيذ») — all 5 complaints root-caused + the owner's 5 new details folded in; implementation started only after «go» |
| Unified clients page (/admin/clients) | ✅ | ONE page merges /admin/members + /admin/accounts + the /coach admin-mode listing (owner: «كلهم نفس الغرض مفروض صفحة واحده تشمل كل دول»): type filter BUTTONS (الكل/أعضاء الموقع/عملاء مدربي B2B/مدربو الموقع/مدربو B2B/الإدارة — owner: «العملاء تشمل جميع عملاء الموقع ومنهم مدربين b2b وعملائهم مع ازرار تصفيه»), lifecycle tabs, test filter, tier select, sort, debounced search, pagination; danger tools ported intact (test-mark toggle, two-step delete, checkbox bulk delete via the SAME guarded /api/admin/accounts endpoints); /admin/members + /admin/accounts now redirect (old links keep working) |
| Coach-kind split (site vs B2B) | ✅ | owner: «تفرقة بين مدربين الموقع ومدربين b2b» — profiles.coach_kind ('site'\|'b2b', default 'b2b' = today's behavior for every existing coach) + PATCH /api/admin/coach-kind (requireAdmin, role guard, never touches role) + coaches page roster with one-tap kind toggle |
| Coaches page rebuilt with a REAL roster | ✅ | owner: «ادارة المدربين مفيهاش قائمة بالمدربين» — /admin/coaches now opens with the coach table (kind badge, B2B clients + follow-up member counts, membership status, wallet balance) with the tool cards kept BELOW the roster (no more hub-only page) |
| B2C follow-up roster (NEW) | ✅ | owner: «قائمة جديده لتعين مدربين للموقع وتعيين أعضاء ليهم لمتابعتهم (b2c)» — /admin/site-assignments: pick site coach → search member → assign (upsert moves, one member ↔ one site coach via unique client_id) → roster table with unassign; NEW API /api/admin/site-assignments GET/POST/DELETE (requireAdmin + role guards: coach must be coach, member must be client) |
| B2B money isolation (DB-linked surfaces verified) | ✅ | owner: «التاكد من كل قواعد البيانات المربوطة باي تغيير هيتم» — coach_assignments UNTOUCHED (wallet billing = fee_per_client × assigned rows in /api/admin/wallets + affiliate attribution in affiliate-engine-server.ts); site_coach_assignments is a NEW table with zero money; subscriptions/subscription_requests/coach_emails/coach_pages/coach_wallets read-only; 0047 RPCs untouched (zero coach-console breakage); auth.users untouched → NO manual script this phase (owner: «مفروض سكريبتات سوبابيز تتنفذ تلقائي» — one timestamped auto migration 20260903120000_0067) |
| B2B coaches visible with memberships | ✅ | root cause proven: get_coach_client_list_paged hard-filters role='client' → subscribing coaches (allowed, submitSubscriptionRequest has no role guard) were invisible; new get_admin_clients_paged covers role client+coach+admin with the SAME lifecycle flag math as 0047 |
| Mobile nav = button grid | ✅ | owner: «الشريط فى الاعلى بتاع التنقل غيره لازرار» — the horizontal chips strip replaced by a 2-column tappable button grid grouped by section (badges visible); desktop sidebar unchanged |
| Old admin dashboard links removed | ✅ | owner: «داشبورد الادمن القديمة لسة بتفتح برابط كوتش» — root cause: isCoach=true for admins + AdminShell banner «واجهة المدرب ›» + sidebar «إدارة العملاء الكاملة» both opened /coach (CoachView admin-mode = the old dashboard); both links REMOVED from the shell (banner button deleted, «أسطري» keeps public-page + profile only); /coach/<id> deep manager stays reachable from /admin/clients rows; orphaned AdminAccountsView.tsx deleted (logic ported) |
| Admin profile page sanity | ✅ | owner: «الادمن فى صفحتة الشخصية بتظهر بيانات وحدود استخدام مثل العضويات وده مش منطقى» — the «حدود عضويتك» limits card is hidden for admins (!isAdmin); coaches keep it (Phase 51 intent) |
| Migration 0067 | ✅ | `20260903120000_0067_admin_clients_unification.sql` (automatic): PART A coach_kind + CHECK constraint (DO-guarded idempotent) · PART B site_coach_assignments (unique client_id, CASCADE both directions, assigned_by SET NULL, 2 hot indexes) · PART C RLS deterministic 0064/0065 pattern (6 policies: admin full via is_admin(), coach select own, client select own + revoke authenticated writes = loud failure; writes via service-role API) · PART D get_admin_clients_paged (security definer, is_admin() guard in outer WHERE, p_filter/p_type/p_test/p_sort) + get_admin_clients_stats · notify pgrst · verify grid expects \|1\|1\|6\|1\|1\|0\|1\| |
| types.ts live mirror | ✅ | coach_kind in profiles Row/Insert/Update · site_coach_assignments table + Relationships (3 FKs) · get_admin_clients_paged + get_admin_clients_stats Functions · SiteCoachAssignment export · data wrappers getAdminClientsPaged/getAdminClientsStats in lib/data/subscriptions.ts |
| Gates | ✅ PASS | tsc 0 · eslint 0 ×406 files · vitest 191/191 · migration_audit: no NEW drift (coach_kind joins the known alter-column bucket like is_test_account/referral_code; site_coach_assignments present in both migrations and types.ts) |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0067 row + heading 0001→0067 + audit-count line · QA_CHECKLIST Phase 103 · PROGRESS Phase 103 + «آخر تحديث» · worklog Task 103 · AGENTS.md law text unchanged |

## Previous Verification — 2026-09-03 (Phase 102 — TEST ADMIN ACCOUNT DELETION: full wipe of admin.test@musclehub-test.com (created in 0050, re-promoted in 0055) — owner «ده حساب تجريبى امسحة»)

| Check | Result | How verified |
|---|---|---|
| Deletion target traced to origin | ✅ | account created by `RUN_ON_SUPABASE_0050_TEST_ADMIN_ACCOUNT.sql` (email + role=admin) — grep proves ZERO src references (only docs + historical SQL 0050/0055) → no code change needed |
| Orphan-risk audit (types.ts live mirror, NOT migration guesswork) | ✅ | full parse of every table's Relationships: 9 user-keyed surfaces have NO live FK → cascade would never reach them: chat_messages.client_id · saved_results.user_id · meal_plans.user_id · plan_swaps.user_id · coach_presence.user_id · progress_photos.user_id · subscription_requests.user_id · tool_leads (email-keyed lead from 0060 sync) · coach_wallet_transactions.created_by (attribution → NULLed, mirrors ON DELETE SET NULL without corrupting real wallet rows) |
| 0066 manual script (RUN_ON_SUPABASE_0066) | ✅ | scoped to the exact email only (cannot touch any other account) · idempotent DO block (safe re-run, safe if already gone) · 3 steps: FK-less pre-delete → profiles (fires all live cascades: subscriptions/notifications/coach_*/affiliate_*/refunds/external_plans) → auth.users (auth identities/sessions/tokens + storage.objects + ai_jobs set-null) · data-only, ZERO schema change → types.ts regen NOT needed per MIGRATION INDEX LAW (c) |
| Why manual, not auto-migration | ✅ | touches auth.users — all auth-schema ops in this project are manual by precedent (0040/0050/0055); an auto migration failing on integration-role auth privileges would block the whole migration pipeline (0054 lesson) — registered in INDEX.md as يدوي |
| Owner action required | ⏳ | Supabase Dashboard → SQL Editor → paste `RUN_ON_SUPABASE_0066_DELETE_TEST_ADMIN_ACCOUNT.sql` → Run → final grid MUST show 3 zeros (auth_users_left / profiles_left / leads_left) → reply تم |
| Historical QA records | ℹ️ | Phase 80 rows above reference this account's login tests — they remain as history; the account no longer exists after 0066 is run |
| Gates | ✅ PASS | tsc 0 · eslint 0 ×402 files · vitest 191/191 · migration_audit: no NEW drift (remaining flags = documented §3 boundaries) |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0066 row + heading 0001→0066 + audit-count line · QA_CHECKLIST Phase 102 · PROGRESS Phase 102 + «آخر تحديث» · worklog Task 102 (+ backfilled Task 100/101 entries lost to workspace re-provisioning) · AGENTS.md law text unchanged |

## Previous Verification — 2026-09-03 (Phase 101 — ADMIN PANEL 2.0: dedicated admin shell + nested sidebar routing + members table with real subscription lifecycle badges + finances page separating site money (B2C) from coach money (B2B) — owner «go يا برنس» after the architectural audit)

| Check | Result | How verified |
|---|---|---|
| Dedicated AdminShell replaces AppLayout inside /admin only | ✅ | `src/components/admin/AdminShell.tsx` (new): sectioned sidebar (Overview / Clients & memberships / Coaches / Finances / Content / Growth / My surfaces), pathname-active dark identity #1d1d1f (2026-08-30 staff-identity law preserved), live orange badges for pending payment requests + pending coach-page reviews (best-effort, never block); AdminGate now renders `<AdminShell>` — member/coach app at (app)/* untouched |
| Nav-context safety (no provider coupling) | ✅ | useNav() is a thin URL adapter over next/navigation (no React context) → works identically under the new shell; only AdminPaymentsView imports useNav among admin views and its navigate("coach-client") maps to the real URL /coach/<id>; admin views never import AppLayout internals |
| New routing structure | ✅ | /admin/dashboard (KPI dashboard replaces the 13-card launcher of launchers) · /admin/members (full membership table) · /admin/finances (money overview) · /admin/coaches (coach hub) — /admin → redirect(/admin/dashboard), /admin/coach-system → redirect(/admin/coaches) so every old link keeps working; metadata noindex inherited from layout |
| Members page (the missing surface) | ✅ | /admin/members = subscription-status table the old panel never had: lifecycle badge نشط/ينتهي قريباً/منتهي/بانتظار الدفع/بدون اشتراك computed by ONE shared helper (memberStatus in admin/ui.tsx mirroring the 0047 RPC flag logic + CoachView enrichClientRow), tier badges, end-date, coach column, «إدارة العميل» → /coach/<id> (admin is coach-of-all); filters = lifecycle tabs (counts from get_coach_client_stats) + MEMBERSHIPS tier select + sort (newest/oldest/name/expiry — valid p_sort values from 0047 SQL) + debounced search; Pagination component reused; zero new DB surface — same paged RPC the coach console uses |
| Finances page (Revenue vs Coach Payouts separation) | ✅ | /admin/finances two labeled sections per TERMINOLOGY LAW §10: (A) SITE MONEY B2C — approved revenue sum/count, approved refunds, NET, pending, 6-month approved-revenue BarChart (recharts, client-side bucketing), recent approved table; (B) COACH MONEY B2B — wallet balances (prepaid credit, explicitly NOT revenue), approved/pending top-ups, offline activation ledger + per-coach expected monthly bill (fee×clients); ZERO new API surface — composes existing read-only endpoints (listSubscriptionRequests + /api/admin/refunds + /api/admin/wallets + /api/admin/coach-payments), admin-only page |
| Component reusability (dedup) | ✅ | new `src/components/admin/ui.tsx` primitives: PageHeader, StatTile, MemberStatusBadge + memberStatus, TierBadge (was a private map in AdminPaymentsView), RequestStatusPill (StatusPill was duplicated ×2), SegmentedTabs (2 hand-rolled pill patterns unified), EmptyState, SectionCard, fmt helpers; dashboard/finances/coaches/members all compose them |
| Mobile UX | ✅ | the old shell pushed a 13-big-button grid above content on phones; the new shell renders one compact scrollable chip row — content first |
| Gates | ✅ PASS | tsc 0 · eslint 0 ×401 files (5 new) · vitest 191/191 |
| Docs parity §3.6 | ✅ UPDATED | QA_CHECKLIST Phase 101 · PROGRESS Phase 101 + «آخر تحديث» · worklog Task 101; no migration → INDEX.md untouched; AGENTS.md law text unchanged (unchanged per §3.6 practice) |

## Previous Verification — 2026-09-02 (Phase 100 — PLAN_SWAPS STRICT RLS: the tamper-proof swap-history ledger gets the same lock progress_photos got in Phase 99 — owner directive)

| Check | Result | How verified |
|---|---|---|
| Owner spec (3 rules) | ✅ | (1) users SELECT+INSERT own rows only — `plan_swaps_select_own` using + `plan_swaps_insert_own` with check, both `auth.uid() = user_id`; (2) coaches SELECT assigned clients' swaps via `coach_assignments(client_id = plan_swaps.user_id ∧ coach_id = auth.uid())` — `plan_swaps_select_assigned_coach`, same relation 0064 granted for progress_photos; (3) NO UPDATE/DELETE policy created for anyone — historical log |
| Immutability belt-and-braces | ✅ | RLS already blocks UPDATE/DELETE (zero policies for those commands) AND table-level `revoke update, delete from anon, authenticated` makes any accidental attempt fail LOUDLY with permission-denied instead of silently matching 0 rows; service_role deliberately untouched — server ledger writer (tier-limits.recordSwap) + refund counter keep working |
| Code-compatibility audit (pre-SQL, 4 files grepped + 3 read) | ✅ | tier-limits countThisWeekSwaps/recordSwap → supabaseAdmin (bypasses RLS) · refund.ts countFeatureUsageSince → supabaseAdmin, module server-only by contract · data/plans.getSwapUsage → browser client (RLS applies) BUT always `.eq("user_id", profile.id)`, sole caller PlansView → select_own covers it; coach reading a client's usage → select_assigned_coach · ZERO `.update()`/`.delete()` on plan_swaps in the whole src tree |
| Deterministic reset (0064 pattern) | ✅ | enable RLS + pg_policies-driven drop of ANY unknown-name policies on plan_swaps first — a leftover permissive policy would void the lock; everything in one transaction + `notify pgrst, 'reload schema'` |
| Schema impact | ✅ none | policies + grants only — no column/table change → types.ts regen NOT needed per MIGRATION INDEX LAW (c); migration_audit: no NEW drift (remaining flags are the documented §3 boundaries) |
| Gates | ✅ PASS | tsc 0 · eslint 0 · vitest 191/191 · migration_audit clean |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0065 row + heading 0001→0065 + audit-log row + last-audit count · QA_CHECKLIST Phase 100 · PROGRESS Phase 100 + «آخر تحديث» · worklog Task 100 |

## Previous Verification — 2026-09-02 (Phase 99 — PHASE 2 OPTIMIZATIONS: hot-path indexes + strict progress_photos RLS + Open Food Facts domain fix + Plan Swaps optimistic UI — owner «GO! 🚀» after the 3-task deep analysis)

| Check | Result | How verified |
|---|---|---|
| Task 1 truth-check (foods/exercises) | ✅ | 3 independent proofs the libraries are IN-CODE static files, NOT DB tables: (a) all 39 distinct `.from()` tables enumerated, (b) types.ts mirror 40 tables zero food/exercise, (c) 73 migrations zero library CREATE TABLE; owner verified live site himself then confirmed «You were 100% right about the static files» |
| 0064 PART A — 3 hot-path indexes | ✅ | `idx_progress_photos_user_taken (user_id, taken_on desc)` mirrors listPhotos() · `idx_plan_swaps_user_type_created (user_id, swap_type, created_at desc)` mirrors tier-limits.getSwapUsage() · `idx_coach_presence_user (user_id)` mirrors data/coach.ts — the ad-hoc Phase-5-era tables never had ANY index |
| 0064 PART B — strict progress_photos RLS | ✅ | enable RLS + catalog-driven drop of ANY unknown-name policies (a leftover permissive policy would void the lock) + 4 named policies: select_own / insert_own / delete_own (deletePhoto() is a live feature) / select_assigned_coach via coach_assignments (client_id=user_id AND coach_id=auth.uid()); UPDATE deliberately NOT granted (no code path updates photo rows) — all in ONE transaction, no RLS-on-with-zero-policies window |
| 0064 PART C — storage bucket policies (add-only) | ✅ | progress_photos_storage_owner (own folder prefix, mirrors working behavior) + progress_photos_storage_coach (SELECT on assigned clients' objects — without it createSignedUrl fails for coaches); existing unknown storage.objects policies NOT touched |
| Task 2 — broken OFF domain fixed | ✅ | 00d6dfa ("remove source names") find-replaced world.openfoodfacts.org → nonexistent world.product-database.org (DNS HTTP 000, external product search dead silently); restored + honest naming (OffProduct type was the tell) + union literal "product-database"→"openfoodfacts" synced in meal-planner page + save-meal-plan comment; consumers only compare === "local" (compat verified) |
| Task 3 — Plan Swaps optimistic UI | ✅ | quota counter decrements INSTANTLY on click (applyOptimisticUsage, display-only; server stays the authority) · refreshUsage() is fire-and-forget reconcile after enqueue + rollback on catch · persistent ⏳ badge («جاري التبديل» / «قيد الاستبدال») on the queued meal/exercise from the localStorage mirror (pendingSwaps state synced on mount/add/remove) · double-submit guard via disabled button · EVO chat verified ALREADY optimistic (instant user bubble + 429 reconcile + Phase 89 SSE streaming) — documented, no changes |
| Gates | ✅ PASS | tsc 0 · eslint 0 on touched files · vitest 191/191 · migration_audit.py clean |
| Docs parity §3.6 | ✅ UPDATED | INDEX.md 0064 row + audit-log row + counts · QA_CHECKLIST Phase 99 · PROGRESS Phase 99 + «آخر تحديث» · worklog Task 99 |

## Previous Verification — 2026-09-02 (Phase 98 — IMAGE SPEED BEYOND VERCEL: on-device upload compression + local-asset recompression + preconnects — owner question «هل فى طريقة اخرى لتحسين السرعه وضغط الصور خارج فيرسل؟»)

| Check | Result | How verified |
|---|---|---|
| Owner question answered with a mapped option set | ✅ | (1) ON-DEVICE upload compression — implemented now, free, permanent, no quota (2) Cloudinary free loader (25 credits/mo + global CDN) — the true Vercel-style external optimizer, REQUIRES owner free-account cloud name → ready to wire when provided (3) Supabase Storage Transformations — free quota ≈100/mo, far below our thousands/month → ruled out |
| NEW `src/lib/image-compress.ts` | ✅ | Canvas-based compressImageFile(): EXIF-honoring decode (createImageBitmap from-image with <img> fallback) → longest-edge cap → WebP encode with JPEG fallback for older Safari → returns a File. SAFETY CONTRACT: never throws — ANY failure or “not smaller than original” returns the ORIGINAL file; GIF/SVG/WebP passthrough; ≤80KB passthrough |
| Wired into all 4 client upload paths | ✅ | progress-photos (data/progress.ts, 1600px q0.82) · profile avatar (512px q0.85, BEFORE the 2MB gate so multi-MB phone photos pass naturally) · questionnaire photos (QuestionnairesView, 1600px q0.82, before the 5MB gate) · coach public photo/result (CoachLandingEditor, 1600px q0.85) |
| Deliberate exclusions (money/legibility law) | ✅ | receipts uploads (subscriptions.ts) untouched — payment proof must stay pixel-identical · coach CERTIFICATES untouched — admin review needs perfectly legible text · server /api/upload route untouched (compression happens before it in the browser; contract unchanged) |
| Local asset recompression (one-time, sharp) | ✅ −20% total | logo.png 774K → 245K (−68%, palette q90, dims unchanged) · hero/coaching-1.jpg −34% · rest −2-7% (already well-compressed) — same formats/dimensions, ZERO reference changes · QR files NEVER touched (scannable-QR law) · script kept at scripts/compress_local_assets.js (gitignored /scripts/*, not a repo artifact) |
| Preconnects completed | ✅ | images.pexels.com + cdn.pixabay.com added to layout head (the blog’s PRIMARY featured-image origins were missing while unsplash/wger/qrserver existed) — warms the connection before the first LCP image fetch on /blog |
| Gates | ✅ PASS | tsc 0 · eslint 0 on all 6 touched files · vitest 191/191 |
| Docs parity §3.6 | ✅ UPDATED | QA_CHECKLIST Phase 98 section + PROGRESS Phase 98 + «آخر تحديث» + worklog Task 98 |

## Previous Verification — 2026-09-02 (Phase 97 — VERCEL FREE-TIER IMAGE QUOTA GUARD: images.unoptimized=true in next.config.ts — owner directive)

| Check | Result | How verified |
|---|---|---|
| Owner report: thousands of images vs Vercel free-tier Image Optimization quota | ✅ CONFIRMED RISK | Blog pipeline adds 3-5 photos × 6 articles/day × EN+AR + tool/landing/admin imagery → the /_next/image hop would exhaust the free quota almost immediately, after which EVERY next/image on the site throttles/fails |
| Fix — one flag | ✅ APPLIED | `images.unoptimized: true` in next.config.ts (Phase 97-documented comment block): next/image now renders plain <img> and serves the SOURCE URL directly — no optimizer hop, no quota, nothing to hit |
| Impact surface measured | ✅ | 20 files import next/image — ALL affected markup stays valid (unoptimized is a rendering-mode flag, not an API change); `priority` still maps to fetchpriority=high so the Phase 94 LCP work (SiteHeader logo, EvoFloatingWidget) keeps its prioritization semantics |
| Optimization load already carried by origins | ✅ | Blog images come from Pexels/Pixabay/Unsplash whose URLs ship their own `?auto=compress&cs=tinysrgb&w=…` CDN params; Supabase Storage serves originals for avatars/progress photos; local assets are tiny (logos/icons) |
| Direct-optimizer dependencies swept | ✅ ZERO | grep for `_next/image` / custom `loader=` across src → only middleware.ts matcher EXCLUDES `_next/image` (harmless under the flag — those requests simply stop existing) |
| Stale comment corrected (anti-misleading-docs law) | ✅ | remotePatterns block previously claimed “next/image converts these to lightweight WebP at the edge” → rewritten to state the origin-CDN params carry the weight under unoptimized (same honesty law as the Phase 88 build-info fix) |
| remotePatterns/formats/minimumCacheTTL kept | ✅ | Dead under the flag but harmless; re-enabling paid optimization later = ONE-LINE revert |
| Gates | ✅ PASS | tsc 0 · eslint 0 (census still ZERO — only next.config.ts touched) · vitest 191/191 |
| Docs parity §3.6 | ✅ UPDATED | QA_CHECKLIST Phase 97 section + PROGRESS Phase 97 + «آخر تحديث» + worklog Task 97 |

## Previous Verification — 2026-09-02 (Phase 96 — DATABASE MIGRATIONS AUDIT: all 73 files cross-checked vs types.ts — real Phase-5-era drift found & CLOSED by 0063 + INDEX.md)

| Check | Result | How verified |
|---|---|---|
| Environment reset (4th) | ✅ RECOVERED | repo re-cloned from GitHub at 967d0df (Phase 95 docs commit, live in production). worklog/QA history re-read; no context lost |
| Migration file census | ✅ 73 files, numbering 0001→0062 COMPLETE | `ls supabase/migrations` + git archaeology: "missing" 0051-0053 = the 3 GitHub-sync probes (timestamped names); 0056 = `20260901120000_restore_rls_after_incident_and_drop_probe.sql` (timestamped name, 315 lines intact); no number ever skipped except 0025 (unused). Numbering map documented in `supabase/migrations/INDEX.md` |
| NEW migrations 0057-0062 line-by-line review | ✅ ALL CLEAN | affiliate foundation (idempotent, RLS complete, SECURITY DEFINER + fixed search_path, pgrst reload) · external_plans (admin-only RLS) · 0059 tool_leads (safe re-run, RLS untouched by design) · customer sync (exception-guarded trigger, backfill, covers 0059 idempotently) · coach-join bell (fully exception-guarded) · refund system (select-own only, service-role writes law 0041 mirrored) |
| Parity audit: migrations ↔ `types.ts` | ✅ SCRIPTED | `scripts/migration_audit.py` (committed to repo): paren-depth CREATE TABLE parser + multi-line ALTER parser vs generated Row blocks. 39 migration tables ↔ 40 types.ts tables; all column mismatches triaged: multi-line ALTER artifacts (verified by grep), price_egp→price_usd renames (0012/0038 — types correct), 2 real boundaries |
| REAL DRIFT FOUND — 4 objects live in production with NO migration file | ✅ CLOSED by 0063 | `plan_swaps` (refund eligibility input! · refund.ts, data/plans.ts, tier-limits.ts) · `coach_presence` (coach online/offline · data/coach.ts) · `progress_photos` (progress.ts uploads) · `referrals.last_seen` column. Phase-5-era ad-hoc tables (already suspected in AGENTS §6, never backfilled). Zero src changes — types.ts Row blocks (generated FROM live DB) are the authoritative column source; Relationships:[] proves no FKs → faithfully mirrored. On production 0063 is a guaranteed NO-OP (all IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) |
| 0063 deliberate RLS omission (documented deviation) | ✅ SAFE | Blind `drop/create policy` on tables whose live policy state is unreadable from here could ALTER production behavior (owner-forbidden). Companion `VERIFY_SCHEMA_DRIFT.sql` (READ-ONLY, 5 sections: columns, row counts, RLS+policies, constraints, no-op proof) prints the truth for a from-truth follow-up if any gap appears |
| Naming anomaly triaged | ✅ DOCUMENTED, NOT TOUCHED | 0059 = old `RUN_ON_SUPABASE_*` manual-apply format while siblings 0057/0058/0060-0062 are integration-visible. NO rename (Phase 61 ledger-incident lesson) — 0060 idempotently covers 0059's columns anyway. Documented in INDEX.md §2 with ⚠️ |
| Known boundaries re-verified (not bugs) | ✅ | `audit_log`: trigger-written, zero app reads → absent from types.ts by design · `blog_posts.source`: 0014 exists but production lacks the column; code guards with `"source" in row/payload` — safe both ways · `gh_sync_probe`: created+dropped, RLS absence benign |
| RLS coverage sweep | ✅ EVERY real table covered | All 39 migration tables have `enable row level security` somewhere EXCEPT gh_sync_probe (dropped 0056) — matches the 0055/0056 restoration posture |
| MIGRATION INDEX LAW added to AGENTS §6 | ✅ | timestamped naming + same-commit INDEX.md row + types.ts regen + audit script before push + rename-forbidden rule — future schema work can't reopen the confusion door |
| Gates | ✅ PASS | tsc 0 · eslint census 0 warnings (no src changes this phase — proven by git status) · vitest 191/191 |
| Docs parity §3.6 | ✅ UPDATED | QA_CHECKLIST Phase 96 section + PROGRESS Phase 96 + «آخر تحديث» + worklog Task 96 + INDEX.md + AGENTS §6 |
| ⚠️ OWNER ACTION (optional, read-only) | 📋 | Run `VERIFY_SCHEMA_DRIFT.sql` in Supabase SQL Editor once → output confirms 0063 was a no-op + reveals live RLS/policy state for the 3 drift tables (raw link in the final report) |

## Previous Verification — 2026-09-02 (Phase 95 — legacy-`any` cleanup batch 7 FINAL: the sensitive set, 137 → 0 — census ZERO)

| Check | Result | How verified |
|---|---|---|
| Phase 94 push state discovered | ✅ ALREADY LIVE | Session opened with `git status [ahead 3]` — a stale remote-tracking ref: `git fetch` proved origin/main = a61da46 (Phase 94 docs commit). Production was already current; no re-push needed. Gates re-verified before continuing: tsc 0 · vitest 191/191 · census 137/33 (all sensitive) |
| Batch 7 — THE SENSITIVE SET (double review) | ✅ 137 → 0 (−137, 33 → 0 files) | Stage A cron 19→0 (5e37f0d): p0 3, p1–p4 1×4, p5 6, progress-reminder 6 · Stage B ai/jobs + queue-health 14→0 · Stage C admin 35→0: coach-support 8, wallets/topups 8, wallets 7, adjust 3, blog/cleanup 2, coach-pages 2, leads 2, coach-payments 1, refunds 1, saved-results 1 · Stage D coach/coaches 38→0: subscriptions/activate 11, wallet 8, landing 6, support 6, coaches/featured 5, ai-usage 1, wallet/topup 1 · Stage E money 22→0: capture-order 6, refund.ts 6, CheckoutView 6, create-order 2, webhook 2 · Stage F auth 9→0: auth-server 8, auth/callback 1 |
| REAL BUG FIXED — progress-reminder cron was 100% broken | ✅ FIXED | The route selected a PHANTOM `profiles.lang` column (profiles has no per-user language column — verified against 0001_init + ALL migrations). PostgREST rejects the entire select → the weekly reminder cron 500'd every Sunday and sent NOTHING, hidden for its whole life by an `any` annotation. Fix: select real columns only; the route's own designed ternary fallback was "ar" (MuscleHub EG core audience) → AR text kept, unreachable EN branch deleted as dead code, NOTE comment documents the whole story |
| Generated types parity (mirror law) | ✅ | +table `coach_support_messages` (mirror 0037 COACH_BOOST) · coach_pages completed with `review_note` + `reviewed_at` (mirror 0046 — Phase 93 had added review_status but missed these two). tsc caught BOTH gaps the moment the `as any` casts were dropped — proof the mirror law works |
| tsc caught REAL gaps (each fixed) | ✅ | phantom profiles.lang (above) · coach_pages.review_note/reviewed_at missing from Update type · saved_results→profiles transitive embed (no direct FK — user_id → auth.users) cannot be statically resolved → ONE documented boundary cast (runtime query unchanged, PostgREST resolves it live) · landing upsert payload rebuilt against real `coach_pages.Insert` (Omit certificates on the 0049 soft-roll retry) |
| Honest boundary casts (each documented inline) | ✅ | leads `tool as ToolSlug` + saved-results `tool as SavedToolSlug` — DB enum/check-constraint is the runtime guard, identical match-no-rows behavior · webhook `JSON.parse(body) as PayPalWebhookEvent` structural view (only the fields the route reads) · CheckoutView PayPal SDK global → typed `PayPalWindow` view (no `any` escape) |
| QR `<img>` documented exception (2nd instance) | ✅ | CheckoutView InstaPay/Vodafone QR kept as `<img>` with inline rationale — same law as CoachWalletView (Phase 93): image optimization must NEVER touch a scannable QR. Only eslint-disable added in the whole phase |
| Double review (sensitive-set law) | ✅ DONE | Full diff of money+auth hunks inspected line-by-line: casts dropped only over generated Rows/Functions (runtime calls byte-identical) · catch pattern preserves exact message routing · webhook view is a superset-compatible narrowing · tier-resolution sort/filter semantics unchanged (0045 legacy mapping intact) |
| Gates | ✅ PASS ×6 stages | tsc 0 after EVERY stage · eslint 0 warnings/0 errors on ALL 33 touched files · vitest 191/191 (re-run at phase end) · census 137 → **0 across 0 files** |
| FINAL MILESTONE: legacy-`any` census = 0 | ✅ CLOSED | Running tally: 804 → 795 (b1) → 749 (b2) → 589 (b3) → 385 (b4) → 244 (b5) → 137 (b6) → **0** (b7). Every `@typescript-eslint/no-explicit-any` eliminated with REAL types — zero blanket suppressions. The cleanup era ends; focus returns to development (Phase 89-SSE design remains the next deferred dev item) |
| Docs parity §3.6 | ✅ UPDATED | QA_CHECKLIST Phase 95 section + PROGRESS Phase 95 + «آخر تحديث» + worklog Task 95 |

## Archived Verification — 2026-09-02 (Phase 94 — legacy-`any` cleanup batch 6: 244 → 137, non-sensitive set now ZERO)

| Check | Result | How verified |
|---|---|---|
| Batch 6 — scattered small non-sensitive files | ✅ 244 → 137 (−107, 58 → 33 files) | Stage 1 (−51, commit baddb37): AdminWalletsView 7, CoachSupportView 7, SupportView 6, external-search 6, SaveResultButton 5, SiteHeader 5, AdminExternalPlansView 5, blog-pipeline 5, blog-research 5 + result-png-export (ToolResultData exported) · Stage 2 (−56, commit 0cd4438): coach-whatsapp route 4, AdminLeadsView 4, CoachLandingEditor 4, DashboardView 4, ReferralView 4, use-voice-input 4, ai-jobs-client 4, blog-queue 4, fetch-images route 3, EvoFloatingWidget 3, AdminAccountsView 3, AdminCoachPagesView 3, AdminPaymentsView 3, AdminReferralsView 3, AdminSavedResultsView 3, use-nav 3 + CoachClientView job-result narrowings |
| MILESTONE: non-sensitive census = 0 | ✅ CLOSED | Census split: TOTAL 137 across 33 files — ALL of them the documented sensitive set (admin/coach/paypal/auth/cron/wallet routes + auth-server + ai/jobs + ai/queue-health + CheckoutView + refund.ts). Every remaining warning now lives in a file reserved for the final double-review batch |
| tsc caught a REAL stale generated type | ✅ FIXED | `blog_generation_queue` in types.ts did NOT match migration 0005 (+0021/0026): stale columns (blog_post_id, updated_at) removed; real columns added (topic_ar, focus_keyword_ar, focus_keyword, category, rationale, article_bundle Json, en_post_id, ar_post_id, generated_at, published_at). blog-queue.ts `as any` casts dropped — update paths now type-checked against the real Update shape |
| tsc caught a REAL null gap | ✅ FIXED | blog-pipeline P4: `parsed` could be null past the md-guard → added `!parsed \|\|` to the guard (same error thrown, identical behavior). runAiJob now returns `Record<string, unknown>` + `getAiJob` returns typed `AiJobRow` — CoachClientView regen flows narrow `replacement` to the engine contract per call site (exercise/meal/food-item/day) |
| Next.js lint turned into REAL improvements | ✅ | SaveResultButton: `window.location.href` ×2 → `router.push` (SPA navigation) · SiteHeader logo + icon-192 → `next/image` with priority (LCP on every page) · EvoFloatingWidget ×3 → `next/image` (48/40/80px, lazy for in-panel) · Avatars (user-provided arbitrary hosts) + ReferralView QR (third-party QR API) kept as `<img>` with documented inline rationale — QR-asset precedent |
| Route payloads typed from real contracts | ✅ | AdminPaymentsView rows → `SubscriptionRequest[]` · CoachSupportView/SupportView → `StaffTicket`/`SupportTicket`/`TicketMessage` (imported from supabase/types; the data barrel doesn't re-export them) · AdminWalletsView topups → `CoachTopupRequest & { coach relation }` · DashboardView → `ProgressEntry[]/Plan[]/Subscription[]` · adminGetReferralOverview → `Awaited<ReturnType<>>` |
| Web Speech API typed without DOM lib support | ✅ | use-voice-input: `SpeechRecognitionEventLike` + `SpeechRecognitionErrorEventLike` structural views + ctor lookup typed — zero `any` in the hook, runtime identical |
| Gates | ✅ PASS ×2 stages | tsc 0 after EVERY stage · eslint 0 warnings/0 errors on ALL 28 touched files · vitest 191/191 ×2 · census 244 → 193 → 137 |
| Docs parity §3.6 | ✅ UPDATED | QA_CHECKLIST Phase 94 section + PROGRESS Phase 94 + «آخر تحديث» + worklog Task 94 |

## Previous Verification — 2026-09-02 (Phase 93 — legacy-`any` cleanup batch 5: 385 → 244)

| Check | Result | How verified |
|---|---|---|
| Batch 5 — medium non-sensitive files | ✅ 385 → 244 (−141, 72 → 58 files) | Stage 1 libs + EVO pair + coach/ads (−93: tier-limits 11, data/tickets 11, coach/ads 18, blog-images 8, blog-admin 8, coach-landing-server 8, blog-topics 8, ai/chat 15, ai-provider 6) · Stage 2 views (−48: BlogEditorView 11, CoachWalletView 11, BlogAdminView 9, CoachView 9, profile 8). 14 files cleaned to ZERO |
| Generated types expanded (mirror law, Phase 92 precedent) | ✅ | +table `coach_ads` (mirror 0037 + 0038 price_usd) · +`evo_chat_usage` (mirror 0022) · +`evo_anon_usage` (mirror 0028) · +Function `coach_adjust_wallet` (mirror 0035) · `coach_pages` completed with the missing 0037/0046/0049 columns (review_status, photo_url, results_photos, socials, whatsapp_phone, certificates) · new exports: CoachAd, CoachTopupRequest, CoachWalletTransaction, TicketMessage, EvoChatUsage, EvoAnonUsage |
| EVO pair zero-`any` — streaming contract intact | ✅ | ai/chat 15→0 (EvoClientContext type, typed history filter predicate, createClient<Database> blog search, prompt-builder Record views) · ai-provider 6→0 (typed chat-completions response incl. reasoning_details view, Record<string,unknown> request body, AggregateError instanceof, parseJSON default T=unknown — every caller already passes an explicit generic). SSE delta/final/error contract untouched |
| Honest boundary casts (each documented inline) | ✅ | blog-admin legacy `source` column lives outside the generated Insert type → payload fully typed, single `as BlogPostInsert`/`as BlogPostUpdate` cast per call (Phase 92 precedent) · `language as "en"\|"ar"` DB-enum cast keeps the \|\|-fallback · CoachView `getTier(subTier as TierId)` legacy-tier cast (Phase 90 pattern) |
| tsc caught REAL gaps (proof the typing works) | ✅ | dropped `title` line in the adminCreatePost payload (caught + fixed) · supabase-js RejectExcessProperties refused the extra `source` prop inside insert/update generics → boundary casts · localStorage ticket literal widened `status` to string → annotated as SupportTicket · AdminBlogPost.faq_json/schema_json now BlogFaq[]/Record views (Phase 90 single-source) |
| QR `<img>` documented exception | ✅ | CoachWalletView InstaPay/Vodafone QR kept as `<img>` with inline rationale — image optimization must NEVER touch a scannable QR (AffiliateToolkit banner precedent) |
| Dead directives removed | ✅ | 2 unused `eslint-disable react-hooks/exhaustive-deps` lines (BlogEditorView, BlogAdminView) — leftovers after their cause moved |
| Gates | ✅ PASS ×2 | tsc 0 after every stage · eslint 0 warnings/0 errors on ALL touched files (10 + 6) · vitest 191/191 ×2 |
| Cleanup running tally | 📌 TRACKED | Start 804 → 795 (b1) → 749 (b2) → 589 (b3) → 385 (b4) → **244** (b5). Remaining 58 files: the SENSITIVE set (admin/coach/paypal/auth/callback/cron/wallet routes ≈150 warnings) + scattered small views/libs (≈94) — sensitive set stays LAST with double review per the documented batch order |

## Latest Verification — 2026-09-02 (Phase 92 — legacy-`any` cleanup batch 4: 589 → 385)

| Check | Result | How verified |
|---|---|---|
| Batch 4 — the six technical giants | ✅ 589 → 385 (−204, 79 → 72 files) | ai-jobs −24 (st. 4a) · referral −25 (4b) · ai-local −28 (4c) · ai-job-processors −34 (4d) · plan-generator −44 (4e) · blog-generate −45 (4f). Six staged commits, gates after each |
| ai_jobs table typed | ✅ | Added to generated types (mirror RUN_ON_SUPABASE_0024) → all `from("ai_jobs" as any)` casts deleted; supabaseAdmin was already `createClient<Database>` — its `as any` casts were bypass friction, now deleted (plans/blog_posts inserts typed, content: PlanContent → Json proven assignable) |
| AI payload/result pipeline typed | ✅ | AiJobRow.payload/result → Record<string, unknown> · sanitizeJobPayload(raw: unknown) → Json (enqueue trust boundary, per-case Record views) · parseJSON<Record<string, unknown>> ×7 · PROCESSORS payload aligned · runAiJob/getAiJob callers cast honestly at their boundaries |
| ClientContext hardened | ✅ | nutrition/fitness → unknown (questionnaire JSON blobs) + exported `loose()` view helper (single honest cast per entry point, reused by ai-local + plan-generator) · current_plans → { type, content: PlanContent \| null } · subscription { swapLimit } |
| PlanContent family end-to-end | ✅ | plan-generator normalize* functions: per-item Record views + String() at render boundaries · RegeneratedMeal type (AI-supplied, fields read defensively — external-plans route typeof-checks protein_g/alternatives, behavior identical) · Exercise[] family for substitute-exercise pool |
| blog-generate fully typed | ✅ | ResearchData = ResearchResult (imported — single source) · ArticleSeo exported · FaqItem/LinkItem/ImagePrompts/SocialPosts · result-type aliases · ArticleBundle.research widened HONESTLY: ResearchResult \| {angle,searchIntent,rationale} \| null (AI path stores the external ResearchResult — was hidden by any) · legacy optional reads documented (arResult.seo, internalLinksAr — undefined at runtime → same fallback behavior) |
| Dead access removed | ✅ | `research.trendingAngles` in chunk1Prompt — field never existed on ResearchResult (kept `trendingKeywords` only; behavior identical) |
| Gates | ✅ PASS ×6 | tsc 0 after every stage · eslint 0 on all touched files · vitest 191/191 ×6 runs |
| Cleanup running tally | 📌 TRACKED | Start 804 → 795 (b1) → 749 (b2) → 589 (b3) → **385** (b4). Remaining 72 files: 40 non-sensitive small/medium views+libs (BlogEditorView 11, CoachWalletView 11, data/tickets 11, tier-limits 11, subscriptions 14, chat route 15, coach/ads 18 …) + sensitive set (admin/coach routes, paypal, auth/callback, cron/blog, wallet) LAST with double review |

## Latest Verification — 2026-09-02 (Phase 91 — legacy-`any` cleanup batch 3: 749 → 589)

| Check | Result | How verified |
|---|---|---|
| Batch 3 — data-layer-first strategy | ✅ 749 → 589 (−160, 87 → 79 files) | Stage A data layer (−42) → Stage B CoachClientView (−78) → Stage C PlansView + QuestionnairesView (−40). Full-repo eslint JSON inventory after each stage: 749 → 707 → 629 → 589 |
| Single source of truth | ✅ | Discovered generated supabase types (src/lib/supabase/types.ts) are COMPLETE and the browser client is `createBrowserClient<Database>` — supabase select() rows were ALREADY typed; the `any`s lived in localStorage fallbacks + needless callback annotations. Row types now flow: types.ts → data layer (typed returns) → views (inferred state) |
| New exported Row types | ✅ | types.ts: +NutritionQuestionnaire, +FitnessQuestionnaire, +ProgressPhoto · data/plans.ts: PlanContent (union of generator content types, type-only import — erased, zero bundle cost), PlanInsert, PlanUpdate · data/progress.ts: ProgressEntryInsert · data/questionnaires.ts: QuestionnaireRow · data/subscriptions.ts: SubscriptionRequestInput (Pick<SubscriptionRequest,…> — payment_method union == lib/plans PaymentMethod) |
| NutritionPlanContent corrected to reality | ✅ | items: +carbs_g?, +fat_g? · meals: +total_carbs_g?, +total_fat_g? — fields the CoachClientView editor already produced/consumed; the old `any` hid this type drift |
| CoachClientView (78 → 0) | ✅ ZERO | State typed from data layer (Profile/Subscription/ProgressEntry/Plan/QuestionnaireRow) · RecoverableJobInput[] + AiJobRow · PlanJobResult · PlanContent narrowing via `in` guards (no casts where narrowing works) · updateMealItem/updateExercise field params = literal unions · QuestionnaireForm: Json form + asForm() + String() at render boundaries · EditCell value: string\|number\|undefined |
| BUG FIXED (latent, owner-flagged) | ✅ | buildRecentPlanNames compared `p.type === "nutrition"` — a value the DB enum (meal\|workout) can NEVER contain → nutrition variety names silently dead since the feature shipped. Now matches `meal` + legacy `nutrition` localStorage rows (documented inline). Same `any`-blindness class this whole phase exists to kill |
| PlansView (27 → 0) + QuestionnairesView (13 → 0) | ✅ ZERO | PlansView: Plan[] state · SwapUsage = Awaited<ReturnType<typeof getSwapUsage>> · asPlanContent() helper · applySwapToPlans mutate() on narrow views (DayView) · MealContent(content: NutritionPlanContent) / WorkoutContent(content: WorkoutPlanContent) · EVO text-plan branch narrowed `"text" in content` · QV: QuestionnaireRow state + Record<string, Json> forms + String() at every render boundary + Array.isArray photos guards |
| tsc caught REAL gaps (proof the cleanup matters) | ✅ | ProgressView chart data accepted null-weight rows without a type predicate · progress/subscriptions local-fallback rows missing required columns (reviewed_at, subscription_type, cancel_requested_at) · undefined-vs-null at Insert→Row boundaries — all fixed, all caught BEFORE runtime |
| Gates | ✅ PASS | tsc 0 (after each stage) · eslint 0 warnings/0 errors on all touched files · vitest 191/191 (×3 runs) |
| Cleanup running tally | 📌 TRACKED | Start 804 → 795 (b1) → 749 (b2) → **589** (b3). Remaining giants: blog-generate 45, plan-generator 44, ai-job-processors 34, ai-local 28, referral 25, ai-jobs 24. Sensitive set (admin/coach routes, paypal, auth/callback, cron/blog, wallet) stays LAST with double review |

## Previous Verification — 2026-09-02 (Phase 90 — legacy-`any` cleanup batch 2: 795 → 749)

| Check | Result | How verified |
|---|---|---|
| Batch 2 (owner: «كمل الدفعة الثانية») | ✅ 795 → 749 (−46) | Full-repo eslint JSON inventory before/after: warnings 795 → 749, files-with-issues 112 → 87. 25 files cleaned to ZERO + 1 dead file deleted |
| Real types — no suppression | ✅ | paypal `getTier(planTier as TierId)` (existing CheckoutView/AdminPaymentsView pattern) · data/chat ChatRow · data/referrals row filters · blog.ts BlogFaq (single source: client-safe blog.ts, re-exported by blog-server) + BlogPost.faq_json `BlogFaq[] \| null` + schema_json `Record<string, unknown> \| null` · BlogArticlePage map param → BlogFaq · plan-jobs payload `{clientId?: string \| null}` · result-png-export ToolResultData · AdminAssignmentsView CoachClientListRow (0030D RPC shape) · food-search OffProduct · suggest-image body typed at boundary (unknown + runtime guards) · checkout `as TierId \| MembershipTier` (real prop union) |
| Data layer fully typed | ✅ | notifications.ts: NEW exported NotificationRow + AdminNotificationRow (9 warnings closed); both bells consume them + `ReturnType<typeof setInterval>` poll handle |
| Vendored shadcn chart.tsx (recharts v3) | ✅ 2 closed, 0 new | ChartPayloadItem = Omit<Payload,"dataKey"\|"value"> + narrowed primitives (recharts dataKey = DataKey<any> → illegal React key; ValueType carries arrays). tsc caught the value/React-key gap on first pass → fixed properly |
| Behavior riders (same files) | ✅ IMPROVED | water-tracker membership redirect: window.location.href → navigate("memberships") (client-side nav, no full reload) · bmi card row falls back to "—" like its sibling rows |
| Documented exception | ✅ | AffiliateToolkit banner `<img>` kept — inline eslint-disable + rationale comment (static SVG asset embedded as-is; next/image adds no value) — the file already documented the reason |
| Dead code | ✅ DELETED | ui/image-stream-hero.tsx — zero imports anywhere; only reference is a comment in LandingView ("Replaced ImageStreamHero with a clean static hero"); git history preserves it |
| Gates | ✅ PASS | tsc 0 · eslint 0 warnings/0 errors on ALL 25 touched files · vitest 191/191 |
| Cleanup running tally | 📌 TRACKED | Start 804 → batch 1: **795** → batch 2: **749**. Remaining ≤2-warning files are ALL in the sensitive set (admin/coach routes, paypal create-order/webhook, auth/callback, cron/blog ×4, wallet topup) — they wait for the final batch with extra review; medium files (blog-admin, SaveResultButton ×5, BlogEditorView ×11, ai-job-processors ×34…) also queued |

## Previous Verification — 2026-09-02 (Phase 89 — EVO TRUE token streaming LIVE + Documentation Parity Law)

| Check | Result | How verified |
|---|---|---|
| EVO token streaming LIVE on Vercel | ✅ WORKS | Production curl -N POST /api/ai/chat: word-by-word `event: delta` frames ({"text":"Aim"} → {"text":" to"} → …) then `event: final` with the cleaned full text + links + source. Build-info commit 1662c4d + label "EVO chat token-streams via SSE from Vercel — Phase 89" |
| Fallback semantics preserved | ✅ SAME POLICY | Chain falls back silently across models/keys BEFORE the first delta; a mid-stream failure (after user-visible tokens) aborts the chain and sends `event: error` — the client keeps the partial text. Local fallback streams as `final` (identical UX to before) |
| 429 / pre-stream errors unchanged | ✅ JSON | Quota + auth + server errors stay JSON; client sniffs content-type once and never double-consumes the body |
| Cleaning pipeline unchanged | ✅ | LaTeX/reasoning/markdown cleaning still runs on the complete text and ships in `final` — may differ slightly from raw deltas BY DESIGN (quality floor intact) |
| Documentation Parity Law | ✅ ADDED — AGENTS.md §3.6 | Owner directive «دايماً عدل التوثيقات…»: docs ship in the SAME phase — minimum worklog+QA+PROGRESS, plus README/DEVELOPER_GUIDE/AGENTS/build-info when the changed behavior is described there (the old misleading "streams from Vercel" label is cited as the proof-of-why) |
| Docs updated in this phase | ✅ ALL | README function table (+callAIStream row, fixed callFreeAIFallbackChain use-case) + streaming note · DEVELOPER_GUIDE EVO flow (SSE events) + API table row · build-info aiTopology label · QA_CHECKLIST + PROGRESS + worklog |
| Gates | ✅ PASS | tsc 0 · eslint 0 NEW warnings (21 pre-existing legacy in the 2 touched AI files) · vitest 191/191 |

## Previous Verification — 2026-09-02 (Phase 88 — EVO streaming verified live + legacy-`any` cleanup batch 1)

| Check | Result | How verified |
|---|---|---|
| EVO chat live on Vercel | ✅ WORKS | Production POST /api/ai/chat (anonymous mode): HTTP 200, real AI reply, source `groq:openai/gpt-oss-20b` (fast chain #1), TTFB 4.79s / total 4.79s |
| EVO "streaming" truth | ✅ CLARIFIED | The reply arrives as ONE complete JSON (TTFB == TOTAL proves no progressive chunks): route returns `NextResponse.json` after awaiting the full model text (needed for LaTeX/reasoning cleaning), client does `await response.json()`. NOT token-streamed. Misleading build-info wording "EVO chat streams from Vercel" corrected to "served from Vercel — full JSON reply, not token-streamed; heavy AI jobs on GitHub Actions" |
| Legacy warnings batch 1 | ✅ 804 → 795 | 8 files fixed with real types: `catch (e: any)` → `catch (e)` + `e instanceof Error` pattern (send-email, tools/lead, NewsletterForm, ContactView) · wger suggestion type in exercise-image · `unknown[]` in social-posts normalizeHashtags · minimal `{tier?: string \| null}` in use-membership-tier · build-info string. Plus DEAD CODE deleted: BlogView.tsx (imported nowhere, referenced stale columns title_ar/cover_image absent from current blog_posts schema — git history preserves it) |
| Gates | ✅ PASS | tsc 0 · eslint 0 warnings/0 errors (all batch files) · vitest 191/191 |
| Cleanup running tally | 📌 TRACKED | Start 804 → after batch 1: **795**. Next safest batches: 1-2-warning files first (lib/paypal, data/chat, data/referrals, ui files), then medium (data layer), sensitive files (auth, payments, cron) LAST with extra review |

## Previous Verification — 2026-09-02 (Phase 87 — legacy lint warnings closed + llms.txt question answered)

| Check | Result | How verified |
|---|---|---|
| Owner Q: does llms.txt need registration (like sitemap in GSC)? | ✅ NO — nothing to register | No "AI Search Console" exists; AI crawlers (GPTBot/ClaudeBot/PerplexityBot…) auto-discover /llms.txt at the root by design. Production verified: /llms.txt, /llms-full.txt, /rss.xml, /ar/rss.xml, /robots.txt ALL 200 with correct content-types. Sitemap remains the only file submitted in GSC. |
| Owner Q: close the old recurring warnings for good | ✅ CLOSED — gates output now prints zero warnings | The 6 pre-existing `any` warnings (blog-server.ts ×2 + LandingView.tsx ×4) replaced with real types: `BlogPostFull = Omit<BlogPost,"faq_json"> & { faq_json: BlogFaq[] \| null }` (derived — can never drift from BlogPost again) · `BlogFaq = {question, answer}` · 4 helper-card prop types (LandingTool/LandingExerciseCategory/LandingProgram/LandingFoodCategory). eslint on both files: 0 warnings, 0 errors (was 6 every run). |
| Type-safety side benefit | ✅ BETTER | `any` was masking a real gap: BlogPostFull lacked focus_keyword/tags/schema_json required by BlogArticlePage's BlogPost type — deriving from BlogPost surfaced it (tsc caught it), then structurally fixed it (tsc 0). |
| Standing note (anti-confusion policy) | 📌 DOCUMENTED | Full-repo eslint (`npx eslint src`) reports ~810 legacy `any` warnings in files OUTSIDE the per-change gate — known legacy noise, NOT regressions, NOT part of the standard gates. Policy: never blind-fix them; a legacy file is only cleaned when deliberately refactored with owner approval. Standard gate stays: `npx eslint <changed files>` must print NOTHING. |
| Gates | ✅ PASS | tsc 0 · eslint 0 warnings/0 errors (touched files) · vitest 191/191 |

## Previous Verification — 2026-09-02 (Phase 86 — speed/perf audit + SEO/GEO audit + RSS feeds + llms-full.txt)

| Check | Result | How verified |
|---|---|---|
| Speed & performance (13 key pages, EN+AR) | ✅ EXCELLENT | Production curl ×2/page best: TTFB 0.15–0.22s (Google good < 0.8s) · total ≤ 0.36s · HTML 53–150KB — home EN/AR, blog EN/AR, article, exercises, AR exercise detail, foods, AR food detail, memberships, tool, for-coaches, programs |
| SEO fundamentals | ✅ ALL PRESENT | hreflang en/ar/x-default on home + static pages + articles (BOTH languages) · canonical everywhere · full OG + Twitter cards · JSON-LD: Organization, WebSite+SearchAction, FAQPage (home), Article+BreadcrumbList+ImageObject (articles) · sitemap 19,480 URLs with per-URL xhtml:link hreflang alternates · dynamic lang/dir — note: grep for lowercase "hreflang" misses React's "hrefLang" attribute (case-insensitive per HTML spec; Google parses it) |
| GEO (AI search readiness) | ✅ ALREADY STRONG | robots.txt explicitly allows GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Google-Extended, Bingbot, Applebot, Applebot-Extended, Meta-ExternalAgent, Amazonbot, YouBot · curated llms.txt live (200) |
| NEW: RSS feeds (organic distribution) | ✅ ADDED | /rss.xml (EN) + /ar/rss.xml (AR) — RSS 2.0, latest 50 published posts each, hourly ISR, empty-channel-safe without DB (listPublishedPostsForFeed in blog-server.ts, fetchBlogForOG pattern) · RSS autodiscovery <link>s in root layout head (site-wide) · local 200 with correct content-type |
| NEW: llms-full.txt (expanded AI guide) | ✅ ADDED | Dynamic route — curated sections + latest 30 articles per language with excerpts (AI engines cite fresh posts directly) · hourly ISR · text/plain · local 200 |
| robots.txt + llms.txt wiring | ✅ UPDATED | robots: Allow /llms-full.txt, /rss.xml, /ar/rss.xml · llms.txt: feeds + expanded-guide pointer lines added |
| Gates | ✅ PASS | tsc 0 · eslint 0 errors (pre-existing `any` warnings only) · vitest 191/191 · dev smoke: 3 new routes 200 |

## Previous Verification — 2026-09-02 (Phase 85 — blog cadence docs parity + stale cron-flow fix + landing hero `sizes` perf fix)

| Check | Result | How verified |
|---|---|---|
| Article cadence documented — no wrong number anywhere | ✅ PASS | Repo-wide audit: AGENTS.md «3 articles/day per language» ✓ · worklog Task 83 «TOTAL 6 articles/day» ✓ · archive Phase 16 «3/لكل لغة = 6/يوم» ✓ — NOW ALSO explicit in README (Blog cadence line), PROGRESS (Blog CMS line) and this file. Cadence: 6/day = 3 EN (12/16/22 UTC) + 3 AR (05/11/18 UTC); one run = one article; dispatch-pipelines tops up only, never exceeds 3+3 |
| DEVELOPER_GUIDE cron-flow section un-staled | ✅ FIXED | «التدفق الآلي (Cron)» no longer describes the RETIRED step1-pick/step2-generate/step3-publish flow — now shows the two language workflows + p0-research→p5-publish steps + row statuses + dispatcher top-up law; perf table rows renamed step2b/2c/2d → blog p2-content / blog-generate |
| Landing hero image `sizes` warning | ✅ FIXED | Phase 83 live console warned hero-athlete.jpg "fill but missing sizes" — added `sizes="(max-width: 768px) 100vw, 50vw"` (2-col grid column) to hero and `sizes="(max-width: 1024px) 100vw, 1024px"` (max-w-5xl centered) to evo-1.jpg in LandingView.tsx → proper srcset + smaller mobile download |
| Gates | ✅ PASS | `tsc --noEmit` 0 · eslint 0 errors on LandingView.tsx · `vitest run` 191/191 |

## Previous Verification — 2026-09-02 (Phase 81 — NEW plan-generation limit law (1+1 weekly / 4+4 monthly) + b2b/b2c audit + deferred-tasks closure check)

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
| Docs ↔ code parity | ✅ FIXED | PROGRESS.md (Phases 77-79 entries + Phase 80 live-check), worklog.md (Task 77-80), DEVELOPER_GUIDE.md §2 structure (AdminGate admin-only, 13 top-level /admin sections = 15 page.tsx files, 66 API routes, modern lib files) — previously stale at Phase 76/71 |
| Test data cleanup | ✅ PASS | 2 QA external plans DELETE 200×2; QA coach account deleted via /admin/accounts cascade — production left clean (documented 0050 admin account kept per QA_CHECKLIST Phase 56/60 convention) |

---


> 🗄️ **الأرشفة (Phase 82):** جداول التحقق الأقدم (Phase 76 وما قبلها + لقطات 2026-08-24/27/30) ونُسخ Phase 52-71 نُقلت إلى `archive/QA_CHECKLIST_ARCHIVE.md` (ملحق 2026-09-02).
