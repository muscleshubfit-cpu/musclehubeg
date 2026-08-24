# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §5, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status snapshot:** see `PROGRESS.md`.

---

## Latest Verification — 2026-08-24 (Post-PayPal-Restoration Cycle)

| Check | Result | How verified |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ PASS (0 errors) | Local run after PayPal restoration + duplicate-button fix |
| ESLint (`npx eslint .`) | ✅ PASS (0 errors, 6 pre-existing warnings) | Local run — warnings are unrelated `window.location.href` usage in client components |
| Next.js Build (`npx next build`) | ✅ PASS (exit 0, all routes registered) | Local run — 3 PayPal routes present |
| Git push (`git push origin main`) | ✅ PASS (forward-only, no force) | HEAD `a5b6a9a` matches `origin/main` |
| HEAD == origin/main | ✅ YES | `git rev-parse HEAD` == `git rev-parse origin/main` == `a5b6a9a` |
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

When pushing changes, run this checklist:

```bash
# 1. TypeScript
bunx tsc --noEmit
# Expected: 0 errors

# 2. Lint
bun run lint
# Expected: 0 errors (warnings are acceptable if pre-existing)

# 3. Build
bun run build
# Expected: exit 0

# 4. Git push (forward-only, no force)
git push origin main

# 5. Verify synchronization
git rev-parse HEAD
git rev-parse origin/main
# Both must be identical

# 6. Verify clean working tree
git status
# Expected: "nothing to commit, working tree clean"
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
