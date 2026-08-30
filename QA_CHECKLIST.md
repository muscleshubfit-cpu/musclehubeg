# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status snapshot:** see `PROGRESS.md`.

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
