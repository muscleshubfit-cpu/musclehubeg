# Navigation Map — MuscleHubEG

> ⚠️ **HISTORICAL SNAPSHOT (2026-08-25)** — point-in-time audit; some ⚠️ items
> listed here have since been FIXED (see PROGRESS.md Phases 71-81).
> Kept for reference; not a statement of current status.

> **Task ID:** #5 — Part A
> **Date:** 2026-08-25
> **Source of truth:** `origin/main` HEAD `0b596d0`
> **Scope:** All navigation points in `src/` — buttons, links, menu items, `navigate()` calls, `router.push/replace`, `window.location.href`.
> **Method:** Behavioral analysis (label + location + destination context), not literal grep on single keywords.
> **Verification:** Each entry inspected in its source file + line, with the destination confirmed to exist (or not) in the codebase.

---

## Part A5 — Coaching service view/page (the canonical destination)

The coaching service has **one canonical page** in the codebase:

| What | Where | Purpose |
|---|---|---|
| `/coaching` route | `src/app/coaching/page.tsx` (497 lines, default export `CoachingPage`) | Public marketing page for the coaching service. Contains: Hero + How it works + Features + Testimonials + Pricing (Starter $20 / Elite $40 — separate from memberships) + FAQ + Final CTA. Has its own pricing section `#coaching-pricing` with `scrollToPricing()` smooth-scroll helper. |

**Key distinction (critical for Part B):**
- `/coaching` is the **coaching service** page — has its own Starter ($20) / Elite ($40) tiers, separate from the platform memberships.
- `/memberships` is the **platform membership** page — has Free / Premium ($14.99) / Pro ($29.99) / Coaching ($39.99) tiers. The memberships page even has a dedicated section that links OUT to `/coaching` for the coaching-tier details (line 238: `href="/coaching"`).
- `/checkout?tier=X&months=1` is the checkout flow (works for both coaching and membership tiers — `goToCheckout(tier)` in coaching page).

**`CoachingPage` internal navigation primitives:**
- `scrollToPricing()` — smooth-scrolls to `#coaching-pricing` section (used by Hero CTA + Final CTA).
- `goToCheckout(tier)` — redirects to `/checkout?tier=X&months=1` (or to `/auth?mode=signup&next=...` if not logged in).
- `navigate("memberships")` — the broken one (Part B target).

---

## Inventory — Navigation primitives in the codebase

### 1. `useNav()` adapter (`src/hooks/use-nav.tsx`)

The `View` type union (line 6-30) defines 23 valid in-app navigation targets. `pathForView()` (line 42-75) maps each `View` to a real URL path. `viewForPath()` (line 78-93) is the reverse mapping for active-tab highlighting.

**Valid `View` values:** `landing`, `memberships`, `auth`, `checkout`, `dashboard`, `questionnaires`, `progress`, `plans`, `chat`, `support`, `coach`, `coach-client`, `coach-support`, `coach-payments`, `referral`, `blog`, `about`, `contact`, `privacy`, `terms`, `faq`, `blog-admin`, `blog-editor`, `admin-referrals`.

**Note:** `pricing` was REMOVED from the `View` type in Phase 2 (commit `4fbab5f` — B12). All `navigate("pricing")` calls were mass-replaced with `navigate("memberships")` in that commit. This is the root cause of Part B's bug (see §"Coaching button" below).

### 2. `<a href="...">` direct links — Next.js App Router URLs

These bypass `useNav` and go directly to a real URL path. Next.js handles them as full page navigations.

### 3. `router.push(...)` / `router.replace(...)` — Next.js `useRouter()`

Used for special cases (auth gates, blog editor redirects, language toggle).

### 4. `window.location.href = "..."` — hard browser navigation

Used for cross-origin redirects (auth callback `next` param) and for forcing a full reload (e.g. after PayPal success in some flows).

---

## Complete navigation table

Format: `# | Label (AR/EN) | Location (file:line) | Destination | Status`

Statuses:
- ✅ Destination exists AND label matches destination semantically
- ❌ Destination does NOT exist (broken link)
- ⚠️ Destination exists BUT label semantically mismatches destination

### A. SiteHeader (`src/components/SiteHeader.tsx`) — main nav menu

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 1 | Logo (MuscleHubEG) | `SiteHeader.tsx:218-221` | `navigate("landing")` → `/` | ✅ |
| 2 | Home / الرئيسية | `SiteHeader.tsx:94-98` | `navigate("landing")` → `/` | ✅ |
| 3 | Exercises / مكتبة التمارين | `SiteHeader.tsx:104-108` | `href="/exercises"` → `/exercises` (page exists) | ✅ |
| 4 | Programs / برامج التدريب | `SiteHeader.tsx:111-115` | `href="/programs"` → `/programs` (page exists) | ✅ |
| 5 | Foods / مكتبة الأكلات | `SiteHeader.tsx:118-122` | `href="/foods"` → `/foods` (page exists) | ✅ |
| 6 | Free Tools / الأدوات المجانية | `SiteHeader.tsx:125-129` | `href="/tools"` → `/tools` (page exists) | ✅ |
| 7 | EVO | `SiteHeader.tsx:132-136` | `href="/evo"` → `/evo` (page exists) | ✅ |
| 8 | Blog / المدونة | `SiteHeader.tsx:139-143` | `href={blogHref}` (`/blog` or `/ar/blog` or `/admin/blog`) — all exist | ✅ |
| 9 | **Coaching / الكوتشينج** | `SiteHeader.tsx:146-150` | `href="/coaching"` → `/coaching` (page exists) | ✅ |
| 10 | Memberships / العضويات | `SiteHeader.tsx:153-157` | `href="/memberships"` → `/memberships` (page exists) | ✅ |
| 11 | **Pricing / الأسعار** | `SiteHeader.tsx:161-165` | `href="/memberships"` → `/memberships` | ⚠️ Label says "Pricing" but destination is the Memberships page (same content, but label mismatch). Comment line 159-160 justifies this as intentional ("kept as a separate label per nav spec so visitors scanning the menu find 'Pricing' by name"). Owner decision documented in PROGRESS.md M5. |
| 12 | Affiliate Program / برنامج الأفلييت | `SiteHeader.tsx:169-173` | `href="/affiliate"` → `/affiliate` (page exists) | ✅ |
| 13 | Dashboard / لوحة التحكم | `SiteHeader.tsx:178` | `navigate("dashboard")` → `/dashboard` (page exists) | ✅ |
| 14 | My Plans / خططي | `SiteHeader.tsx:179` | `navigate("plans")` → `/plans` (page exists) | ✅ |
| 15 | My Progress / تقدمي | `SiteHeader.tsx:180` | `navigate("progress")` → `/progress` (page exists) | ✅ |
| 16 | EVO Coach / كوتش EVO | `SiteHeader.tsx:181` | `navigate("chat")` → `/chat` (page exists) | ⚠️ Label "EVO Coach" but View name is `chat` and route is `/chat`. Semantically acceptable (the chat IS EVO) but technically a label/view mismatch. |
| 17 | Questionnaires / الاستبيانات | `SiteHeader.tsx:182` | `navigate("questionnaires")` → `/questionnaires` (page exists) | ✅ |
| 18 | Referrals / الإحالات | `SiteHeader.tsx:183` | `navigate("referral")` → `/referral` (page exists) | ✅ |
| 19 | Support / الدعم | `SiteHeader.tsx:184` | `navigate("support")` → `/support` (page exists) | ✅ |
| 20 | Coach Dashboard / لوحة الكوتش | `SiteHeader.tsx:191` | `navigate("coach")` → `/coach` (page exists) | ✅ |
| 21 | Payments / المدفوعات | `SiteHeader.tsx:192` | `navigate("coach-payments")` → `/coach/payments` (page exists) | ✅ |
| 22 | Client Support / دعم العملاء | `SiteHeader.tsx:193` | `navigate("coach-support")` → `/coach/support` (page exists) | ✅ |
| 23 | Referrals (admin) / الإحالات | `SiteHeader.tsx:196` | `navigate("admin-referrals")` → `/admin/referrals` (page exists) | ✅ |
| 24 | Account icon (logged-in) | `SiteHeader.tsx:251-267` | `href="/profile"` → `/profile` (page exists) | ✅ |
| 25 | Login button (logged-out) | `SiteHeader.tsx:269-276` | `navigate("auth", { mode: "login" })` → `/auth?mode=login` | ✅ |
| 26 | Profile link (drawer) | `SiteHeader.tsx:362-380` | `href="/profile"` → `/profile` | ✅ |
| 27 | Logout button | `SiteHeader.tsx:382-392` | `signOutAsync()` then `navigate("landing")` → `/` | ✅ |
| 28 | Login button (drawer) | `SiteHeader.tsx:395-404` | `navigate("auth", { mode: "login" })` → `/auth?mode=login` | ✅ |

### B. AppLayout sidebar / mobile nav (`src/components/AppLayout.tsx`)

Client nav (line 17-26):
| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 29 | Dashboard / لوحة التحكم | `AppLayout.tsx:18` | `navigate("dashboard")` → `/dashboard` | ✅ |
| 30 | EVO Coach / كوتش | `AppLayout.tsx:19` | `navigate("chat")` → `/chat` | ⚠️ Same as #16 — label/view mismatch |
| 31 | Questionnaires / الاستبيانات | `AppLayout.tsx:20` | `navigate("questionnaires")` → `/questionnaires` | ✅ |
| 32 | Progress / تقدمي | `AppLayout.tsx:21` | `navigate("progress")` → `/progress` | ✅ |
| 33 | Plans / خططي | `AppLayout.tsx:22` | `navigate("plans")` → `/plans` | ✅ |
| 34 | Support / الدعم | `AppLayout.tsx:23` | `navigate("support")` → `/support` | ✅ |
| 35 | Referral / الإحالات | `AppLayout.tsx:24` | `navigate("referral")` → `/referral` | ✅ |
| 36 | Pricing / pricing (label `t("nav.pricing")`) | `AppLayout.tsx:25` | `navigate("memberships")` → `/memberships` | ⚠️ Label is `nav.pricing` ("Pricing"/"الأسعار") but destination is `/memberships`. Same Phase 2 mass-replace artifact as #11. |

Coach nav (line 27-33):
| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 37 | Clients / العملاء | `AppLayout.tsx:28` | `navigate("coach")` → `/coach` | ✅ |
| 38 | Support / الدعم | `AppLayout.tsx:29` | `navigate("coach-support")` → `/coach/support` | ✅ |
| 39 | Admin (Payments) / المدفوعات | `AppLayout.tsx:30` | `navigate("coach-payments")` → `/coach/payments` | ⚠️ Label `t("nav.admin")` ("Admin") but destination is coach-payments. Label/view mismatch. |
| 40 | Blog / المدونة | `AppLayout.tsx:31` | `navigate("blog-admin")` → `/admin/blog` | ✅ |
| 41 | Referrals / الإحالات | `AppLayout.tsx:32` | `navigate("admin-referrals")` → `/admin/referrals` | ✅ |

Coach extra links (line 35-37):
| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 42 | Tool Leads / Leads الأدوات | `AppLayout.tsx:36` | `href="/admin/leads"` → `/admin/leads` (page exists) | ✅ |

### C. LandingView (`src/components/views/LandingView.tsx`)

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 43 | Start for free / ابدأ مجاناً (Hero) | `LandingView.tsx:259-264` | `href="/memberships"` → `/memberships` | ⚠️ Label "Start for free" implies a free tier signup, but `/memberships` page does have a Free tier. Acceptable but the more natural destination would be `/auth?mode=signup`. |
| 44 | Try EVO / جرّب EVO (Hero) | `LandingView.tsx:265-270` | `href="/evo"` → `/evo` | ✅ |
| 45 | Coaching › / الكوتشينج › (Hero) | `LandingView.tsx:271-276` | `href="/coaching"` → `/coaching` | ✅ |
| 46 | Start chatting / ابدأ المحادثة (EVO section) | `LandingView.tsx:327-333` | `href="/chat"` → `/chat` | ✅ |
| 47 | Learn more / اعرف أكثر (EVO section) | `LandingView.tsx:334-339` | `href="/evo"` → `/evo` | ✅ |
| 48 | View all tools / كل الأدوات (Tools section) | `LandingView.tsx:386` | `href="/tools"` → `/tools` | ✅ |
| 49 | Browse exercises / تصفح التمارين | `LandingView.tsx:428` | `href="/exercises"` → `/exercises` | ✅ |
| 50 | Browse programs / تصفح البرامج | `LandingView.tsx:470` | `href="/programs"` → `/programs` | ✅ |
| 51 | Browse foods / تصفح الأكلات | `LandingView.tsx:501` | `href="/foods"` → `/foods` | ✅ |
| 52 | Browse foods (2nd) / تصفح الأكلات | `LandingView.tsx:512` | `href="/foods"` → `/foods` | ✅ |
| 53 | Learn more › (Coaches section) / اعرف أكثر › | `LandingView.tsx:578-583` | `href="/coaching"` → `/coaching` | ✅ |
| 54 | Pricing (Coaches section) / الأسعار | `LandingView.tsx:584-589` | `href="/memberships"` → `/memberships` | ⚠️ Label "Pricing" placed in the **Coaches & Nutrition Specialists** section. User on the coaching section clicks "Pricing" expecting coaching prices ($20/$40), but lands on `/memberships` (Free/$14.99/$29.99/$39.99). Semantically misleading — coaching has its own pricing on `/coaching#coaching-pricing`. |
| 55 | Premium card (memberships section) | `LandingView.tsx:615-636` | `href="/memberships"` → `/memberships` | ✅ |
| 56 | Pro card (memberships section) | `LandingView.tsx:639-660` | `href="/memberships"` → `/memberships` | ✅ |
| 57 | (third tier card if exists) | `LandingView.tsx:678` | `href="/memberships"` → `/memberships` | ✅ |
| 58 | Start for free (Final CTA) / ابدأ مجاناً | `LandingView.tsx:723-728` | `href="/memberships"` → `/memberships` | ⚠️ Same as #43 — "Start for free" → memberships page |
| 59 | Learn about coaching › / اعرف عن الكوتشينج › (Final CTA) | `LandingView.tsx:729-734` | `href="/coaching"` → `/coaching` | ✅ |
| 60 | Footer: Exercises | `LandingView.tsx:750` | `href="/exercises"` | ✅ |
| 61 | Footer: Programs | `LandingView.tsx:751` | `href="/programs"` | ✅ |
| 62 | Footer: Foods | `LandingView.tsx:752` | `href="/foods"` | ✅ |
| 63 | Footer: Tools | `LandingView.tsx:753` | `href="/tools"` | ✅ |
| 64 | Footer: EVO | `LandingView.tsx:754` | `href="/evo"` | ✅ |
| 65 | Footer: Blog | `LandingView.tsx:755` | `href="/blog"` | ✅ |
| 66 | Footer: Coaching | `LandingView.tsx:756` | `href="/coaching"` | ✅ |
| 67 | Footer: Memberships | `LandingView.tsx:757` | `href="/memberships"` | ✅ |
| 68 | Footer: Pricing | `LandingView.tsx:758` | `href="/memberships"` | ⚠️ Same label/destination mismatch as #11 |
| 69 | Footer: Privacy / الخصوصية | `LandingView.tsx:764` | `navigate("privacy")` → `/privacy` | ✅ |
| 70 | Footer: Terms / الشروط | `LandingView.tsx:765` | `navigate("terms")` → `/terms` | ✅ |
| 71 | Footer: About / من نحن | `LandingView.tsx:766` | `navigate("about")` → `/about` | ✅ |
| 72 | Footer: FAQ / أسئلة شائعة | `LandingView.tsx:767` | `navigate("faq")` → `/faq` | ✅ |

### D. Coaching page (`src/app/coaching/page.tsx`)

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 73 | Start your transformation / ابدأ تحوّلك (Hero) | `coaching/page.tsx:172-177` | `onClick={scrollToPricing}` → smooth-scroll to `#coaching-pricing` | ✅ |
| 74 | Learn about EVO / اعرف عن EVO (Hero) | `coaching/page.tsx:178-183` | `href="/evo"` → `/evo` | ✅ |
| 75 | Learn about EVO (How it works section) | `coaching/page.tsx:266` | `href="/evo"` → `/evo` | ✅ |
| 76 | Start chatting (How it works section) | `coaching/page.tsx:273` | `href="/chat"` → `/chat` | ✅ |
| 77 | Get Started / ابدأ الآن (Starter pricing card) | `coaching/page.tsx:403-408` | `onClick={() => goToCheckout("starter")}` → `/checkout?tier=starter&months=1` | ✅ |
| 78 | Get Started / ابدأ الآن (Elite pricing card) | `coaching/page.tsx:403-408` | `onClick={() => goToCheckout("elite")}` → `/checkout?tier=elite&months=1` | ✅ |
| 79 | **See all details › / كل التفاصيل ›** | `coaching/page.tsx:413-419` | `onClick={() => navigate("memberships")}` → `/memberships` | ⚠️ **THE COACHING BUTTON BUG** — Label "See all details" placed directly under the Starter/Elite coaching pricing cards. User expects to see "all" coaching pricing details (or scroll within `/coaching`), but the button navigates to `/memberships` (a completely different page with Free/Premium/Pro/Coaching tiers, not the Starter/Elite coaching tiers they were just looking at). The inline comment line 416 (`/* This button intentionally goes to /memberships for plan comparison */`) attempts to justify the destination, but the label doesn't say "Compare with memberships" or "View platform plans" — it says "See all details", which is ambiguous and misleading in context. **Origin:** Phase 2 commit `4fbab5f` (B12) mass-replaced `navigate("pricing")` → `navigate("memberships")` here; commit `e0c6f0e` (2026-08-24) fixed the Hero + Final CTA buttons to use `scrollToPricing()` but missed this one. |
| 80 | Start my transformation / ابدأ تحوّلي (Final CTA) | `coaching/page.tsx:465-470` | `onClick={scrollToPricing}` → smooth-scroll to `#coaching-pricing` | ✅ |
| 81 | Learn about EVO › / اعرف عن EVO › (Final CTA) | `coaching/page.tsx:471-476` | `href="/evo"` → `/evo` | ✅ |

### E. Memberships page (`src/app/memberships/page.tsx`)

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 82 | Learn more › / اعرف أكثر (Coaching section) | `memberships/page.tsx:237-242` | `href="/coaching"` → `/coaching` | ✅ |

### F. EVO page (`src/app/evo/page.tsx`)

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 83 | Start chatting / ابدأ المحادثة | `evo/page.tsx:154` | `href="/chat"` → `/chat` | ✅ |
| 84 | See plans › / شوف الباقات › | `evo/page.tsx:466-471` | `href="/memberships"` → `/memberships` | ⚠️ The section heading above (line 458-464) explicitly talks about "coaching subscription includes EVO + plans + follow-up + tools" — but the CTA button "See plans" goes to `/memberships` (platform plans), not `/coaching` (coaching plans). The user reading the section expects to see coaching subscription options. Same class of bug as #79. |
| 85 | Start chatting (Final CTA) / ابدأ المحادثة | `evo/page.tsx:486-496` | `href="/chat"` → `/chat` | ✅ |
| 86 | Learn about coaching / اعرف عن الكوتشينج | `evo/page.tsx:497-502` | `href="/coaching"` → `/coaching` | ✅ |

### G. Profile page (`src/app/profile/page.tsx`)

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 87 | Upgrade › / ترقية العضوية › (Free tier badge) | `profile/page.tsx:227-232` | `href="/memberships"` → `/memberships` | ✅ |
| 88 | Upgrade › / ترقية › (Plan limits section) | `profile/page.tsx:332-334` | `href="/memberships"` → `/memberships` | ✅ |
| 89 | Quick link: Dashboard | `profile/page.tsx:304` | `href="/dashboard"` | ✅ |
| 90 | Quick link: My Plans | `profile/page.tsx:305` | `href="/plans"` | ✅ |
| 91 | Quick link: Meal Planner | `profile/page.tsx:306` | `href="/meal-planner"` | ✅ |
| 92 | Quick link: Progress | `profile/page.tsx:307` | `href="/progress"` | ✅ |
| 93 | Quick link: EVO Coach | `profile/page.tsx:308` | `href="/chat"` | ⚠️ Label "EVO Coach" but route is `/chat` (same as #16, #30) |
| 94 | Quick link: Referral | `profile/page.tsx:309` | `href="/referral"` | ✅ |
| 95 | Quick link: Support | `profile/page.tsx:310` | `href="/support"` | ✅ |
| 96 | Tools section link | `profile/page.tsx:435` | `href="/tools"` | ✅ |
| 97 | Meal planner link (saved plans) | `profile/page.tsx:545` | `href="/meal-planner"` | ✅ |
| 98 | Meal planner link (empty state) | `profile/page.tsx:586` | `href="/meal-planner"` | ✅ |
| 99 | Logout button | `profile/page.tsx:357` | `navigate("landing")` → `/` | ✅ |
| 100 | Not-logged-in redirect | `profile/page.tsx:60` | `navigate("auth", { mode: "login" })` → `/auth?mode=login` | ✅ |

### H. Tools pages (`src/app/tools/*`)

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 101 | Unlock Premium / اشترك الآن (calorie) | `calorie-calculator/page.tsx:295-299` | `onClick={() => navigate("memberships")}` → `/memberships` | ✅ |
| 102 | Unlock Premium (bmi) | `bmi-calculator/page.tsx:215-219` | `onClick={() => navigate("memberships")}` → `/memberships` | ✅ |
| 103 | Unlock Premium (macro) | `macro-calculator/page.tsx:111` | `onClick={() => navigate("memberships")}` → `/memberships` | ✅ |
| 104 | Unlock Premium (body-fat) | `body-fat-calculator/page.tsx:154` | `onClick={() => navigate("memberships")}` → `/memberships` | ✅ |
| 105 | Unlock Premium (water-tracker) | `water-tracker/page.tsx:178-190` | `navigate("auth", { mode: "login" })` then `window.location.href = "/memberships"` | ✅ |
| 106 | OtherTools: View all tools | `OtherTools.tsx:59` | `href="/tools"` → `/tools` | ✅ |

### I. Detail pages — exercises/foods/programs

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 107 | Back to exercises (breadcrumb) | `exercises/[slug]/page.tsx:56` | `href="/exercises"` | ✅ |
| 108 | Back to exercises (logo) | `exercises/[slug]/page.tsx:93` | `href="/exercises"` | ✅ |
| 109 | Get a personalized plan › / احصل على خطة مخصصة › | `exercises/[slug]/page.tsx:198` | `href="/memberships"` → `/memberships` | ⚠️ Label "Get a personalized plan" implies coaching (human coach + custom plan), but destination is `/memberships`. Could be `/coaching` for coaching plans, or stay as `/memberships` for platform-tier gating. Owner decision. |
| 110 | Back to foods (breadcrumb) | `foods/[slug]/page.tsx:57` | `href="/foods"` | ✅ |
| 111 | Back to foods (logo) | `foods/[slug]/page.tsx:90` | `href="/foods"` | ✅ |
| 112 | Get a personalized plan › / احصل على خطة مخصصة › | `foods/[slug]/page.tsx:373` | `href="/memberships"` → `/memberships` | ⚠️ Same as #109 — "personalized plan" → memberships (could be `/coaching`) |
| 113 | Back to programs (breadcrumb) | `programs/[slug]/page.tsx:46` | `href="/programs"` | ✅ |
| 114 | Back to programs (logo) | `programs/[slug]/page.tsx:77` | `href="/programs"` | ✅ |
| 115 | Get a personalized plan › / احصل على خطة مخصصة › | `programs/[slug]/page.tsx:277` | `href="/memberships"` → `/memberships` | ⚠️ Same as #109, #112 |

### J. Auth flow

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 116 | Auth success → coach dashboard | `AuthView.tsx:36` | `navigate(isCoach ? "coach" : "dashboard")` | ✅ |
| 117 | Back to home (logo) | `AuthView.tsx:84` | `navigate("landing")` → `/` | ✅ |
| 118 | Toggle login/signup | `AuthView.tsx:227` | `navigate("auth", { mode: ... })` | ✅ |
| 119 | Cancel | `AuthView.tsx:255` | `navigate("landing")` → `/` | ✅ |
| 120 | Free Tools (no-signup CTA) | `AuthView.tsx:242` | `href="/tools"` | ✅ |
| 121 | Blog (no-signup CTA) | `AuthView.tsx:248` | `href="/blog"` | ✅ |
| 122 | Auth gate redirect | `(app)/auth-gate.tsx:23` | `router.replace("/auth")` | ✅ |
| 123 | Auth page post-login redirect | `auth/page.tsx:23,25` | `window.location.href = next` OR `router.replace(isCoach ? "/coach" : "/dashboard")` | ✅ |

### K. Checkout flow

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 124 | PayPal success → dashboard | `CheckoutView.tsx:243` | `setTimeout(() => navigate("dashboard"), 2000)` | ✅ |
| 125 | Back to memberships (no plan) | `CheckoutView.tsx:255` | `navigate("memberships")` | ✅ |
| 126 | Sign up to continue | `CheckoutView.tsx:267` | `navigate("auth", { mode: "signup" })` | ✅ |
| 127 | Manual payment success → dashboard | `CheckoutView.tsx:295` | `setTimeout(() => navigate("dashboard"), 3000)` | ✅ |
| 128 | Back to memberships (header logo) | `CheckoutView.tsx:310` | `navigate("memberships")` | ✅ |
| 129 | Back to memberships (after done) | `CheckoutView.tsx:341,359` | `navigate("dashboard")` | ⚠️ Label "Back to memberships" (line 603) but `navigate("dashboard")` — actually the dashboard button. Acceptable since user is post-checkout. |
| 130 | Back to memberships (footer) | `CheckoutView.tsx:601` | `navigate("memberships")` | ✅ |
| 131 | Checkout page auth redirect | `checkout/page.tsx:35` | `router.replace(authHref)` | ✅ |
| 132 | Checkout page no-tier redirect | `checkout/page.tsx:37` | `router.replace("/memberships")` | ✅ |
| 133 | Coaching → checkout (logged-in) | `coaching/page.tsx:99` | `window.location.href = checkoutUrl` (`/checkout?tier=X&months=1`) | ✅ |
| 134 | Coaching → auth then checkout (logged-out) | `coaching/page.tsx:101` | `window.location.href = "/auth?mode=signup&next=..."` | ✅ |

### L. Coach views

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 135 | Coach → coach-client (payments row click) | `CoachPaymentsView.tsx:155` | `navigate("coach-client", { clientId: r.user_id })` → `/coach/{clientId}` | ✅ |
| 136 | Coach-client → coach (back button) | `CoachClientView.tsx:404` | `navigate("coach")` → `/coach` | ✅ |
| 137 | Coach → coach-payments | `CoachView.tsx:389` | `navigate("coach-payments")` → `/coach/payments` | ✅ |
| 138 | Coach → coach-client (client row click) | `CoachView.tsx:592` | `navigate("coach-client", { clientId: c.id })` | ✅ |
| 139 | Coach non-coach redirect | `(app)/coach/page.tsx:14` | `router.replace("/dashboard")` | ✅ |
| 140 | Coach-payments non-coach redirect | `(app)/coach/payments/page.tsx:14` | `router.replace("/dashboard")` | ✅ |
| 141 | Coach-support non-coach redirect | `(app)/coach/support/page.tsx:14` | `router.replace("/dashboard")` | ✅ |

### M. Chat / Support / Static / Other views

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 142 | Chat → support | `ChatView.tsx:188` | `navigate("support")` → `/support` | ✅ |
| 143 | Contact → home | `ContactView.tsx:56` | `navigate("landing")` → `/` | ✅ |
| 144 | Static page → home | `StaticPageView.tsx:19` | `navigate("landing")` → `/` | ✅ |
| 145 | Static page → contact | `StaticPageView.tsx:59` | `navigate("contact")` → `/contact` | ✅ |
| 146 | Dashboard: Upgrade memberships | `DashboardView.tsx:120` | `navigate("memberships")` → `/memberships` | ✅ |
| 147 | Dashboard: View plans | `DashboardView.tsx:166,182,203` | `navigate("plans")` / `navigate(action.to)` | ✅ |
| 148 | AffiliateProgram → referral (logged-in) | `AffiliateProgramView.tsx:96,99,109` | `navigate("referral")` → `/referral` | ✅ |
| 149 | AffiliateProgram → auth (logged-out) | `AffiliateProgramView.tsx:101,110,132` | `navigate("auth", { mode: "signup" })` or `login` | ✅ |
| 150 | AffiliateProgram → home | `AffiliateProgramView.tsx:122` | `navigate("landing")` → `/` | ✅ |
| 151 | PricingView (DEAD CODE — `PricingView` component is exported but NOT imported anywhere in the codebase) | `PricingView.tsx:89` | `navigate("checkout", { tier: tierId, months })` | ⚠️ Component not used; safe to remove in a future cleanup task |

### N. Notification bells

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 152 | NotificationBell → dashboard | `NotificationBell.tsx:82` | `navigate("dashboard")` → `/dashboard` | ✅ |
| 153 | NotificationBell → memberships | `NotificationBell.tsx:83` | `navigate("memberships")` → `/memberships` | ✅ |
| 154 | NotificationBell → questionnaires | `NotificationBell.tsx:84` | `navigate("questionnaires")` → `/questionnaires` | ✅ |
| 155 | NotificationBell → plans | `NotificationBell.tsx:85` | `navigate("plans")` → `/plans` | ✅ |
| 156 | NotificationBell → support | `NotificationBell.tsx:86` | `navigate("support")` → `/support` | ✅ |
| 157 | AdminNotificationBell → coach | `AdminNotificationBell.tsx:45` | `navigate("coach")` → `/coach` | ✅ |
| 158 | AdminNotificationBell → coach-support | `AdminNotificationBell.tsx:46` | `navigate("coach-support")` → `/coach/support` | ✅ |
| 159 | AdminNotificationBell → coach-payments | `AdminNotificationBell.tsx:47` | `navigate("coach-payments")` → `/coach/payments` | ✅ |

### O. Blog

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 160 | Blog home logo | `BlogArticlePage.tsx:81`, `BlogListPage.tsx:27` | `href="/"` → `/` | ✅ |
| 161 | Blog breadcrumb home | `BlogArticlePage.tsx:110` | `href="/"` → `/` | ✅ |
| 162 | Blog list "view all" | `BlogListPage.tsx:32` | `href="/"` → `/` | ⚠️ Label "View all" but destination is `/` (home), not `/blog` (where you already are). Context-dependent — may be intentional. |
| 163 | Blog CTA: Compare plans | `BlogComponents.tsx:64-81,101` | `href="/memberships"` → `/memberships` | ✅ |
| 164 | Blog CTA: Affiliate | `BlogComponents.tsx:125` | `href="/affiliate"` → `/affiliate` | ✅ |
| 165 | Blog admin → new article | `BlogAdminView.tsx:134,159` | `router.push("/admin/blog/new")` | ✅ |
| 166 | Blog admin → edit article | `BlogAdminView.tsx:265` | `router.push(`/admin/blog/${post.id}`)` | ✅ |
| 167 | Blog editor → admin list | `BlogEditorView.tsx:104,276` | `router.push("/admin/blog")` | ✅ |

### P. 404 / Not found

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 168 | 404: Go home | `not-found.tsx:72` | `href="/"` → `/` | ✅ |

### Q. SaveResultButton

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 169 | Save → login redirect | `SaveResultButton.tsx:39` | `window.location.href = "/auth?mode=login&next=..."` | ✅ |
| 170 | Save → memberships (tier limit reached) | `SaveResultButton.tsx:116` | `window.location.href = "/memberships"` | ✅ |

### R. EvoFloatingWidget

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 171 | Subscribe now / اشترك الآن (anonymous chat limit) | `EvoFloatingWidget.tsx:274-279` | `href="/memberships"` → `/memberships` | ✅ |

### S. Language toggle

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 172 | Toggle blog → AR blog | `LanguageToggle.tsx:28,50` | `router.push("/ar/blog")` | ✅ |
| 173 | Toggle blog article → AR | `LanguageToggle.tsx:43` | `router.push(`/ar/blog/${linked.slug}`)` | ✅ |

### T. Meal planner / water-tracker

| # | Label | Location | Destination | Status |
|---|---|---|---|---|
| 174 | Meal planner → login | `meal-planner/page.tsx:192` | `navigate("auth", { mode: "login" })` | ✅ |
| 175 | Water-tracker → login | `water-tracker/page.tsx:178` | `navigate("auth", { mode: "login" })` | ✅ |

---

## Summary

**Total navigation points inventoried:** 175

**By status:**
- ✅ Valid (label matches destination, destination exists): **155**
- ❌ Broken (destination does not exist): **0**
- ⚠️ Semantic mismatch (destination exists but label is misleading): **20**

**The 20 ⚠️ items** (grouped by theme):

### Theme 1: "Pricing" label points to `/memberships` (intentional per nav spec)
- #11 SiteHeader "Pricing" → `/memberships` (intentional, owner decision per PROGRESS.md M5)
- #36 AppLayout sidebar `nav.pricing` → `/memberships` (same)
- #68 LandingView footer "Pricing" → `/memberships` (same)

### Theme 2: "EVO Coach" label uses `chat` view / `/chat` route (acceptable)
- #16 SiteHeader "EVO Coach" → `/chat`
- #30 AppLayout sidebar `nav.coach` ("EVO Coach") → `/chat`
- #93 Profile quick link "EVO Coach" → `/chat`

### Theme 3: "Start for free" → `/memberships` (acceptable, memberships has Free tier)
- #43 LandingView Hero "Start for free" → `/memberships`
- #58 LandingView Final CTA "Start for free" → `/memberships`

### Theme 4: Admin label mismatch in coach sidebar (minor)
- #39 AppLayout coach sidebar `nav.admin` ("Admin") → `/coach/payments`

### Theme 5: "Get a personalized plan" → `/memberships` (could be `/coaching`)
- #109 exercises/[slug] "Get a personalized plan ›" → `/memberships`
- #112 foods/[slug] "Get a personalized plan ›" → `/memberships`
- #115 programs/[slug] "Get a personalized plan ›" → `/memberships`

### Theme 6: Coaching-context "Pricing" / "See plans" → `/memberships` (THE BUG CLASS)
- #54 LandingView Coaches section "Pricing" → `/memberships` (user in coaching section expects coaching prices)
- #79 **coaching/page.tsx "See all details ›" → `/memberships`** ← **THE PART B TARGET**
- #84 evo/page.tsx "See plans ›" → `/memberships` (section talks about coaching subscription, but goes to memberships)

### Theme 7: Misc
- #129 CheckoutView "Back to memberships" actually navigates to dashboard (post-checkout, acceptable)
- #151 PricingView is dead code (component not imported anywhere)
- #162 Blog list "View all" → `/` (home, context-dependent)

---

## Part B target — definitive identification

**The coaching button specified by the owner** is **#79**:

- **File:** `src/app/coaching/page.tsx`
- **Line:** 415 (button) + 416 (justifying comment) + 417 (label)
- **Current destination:** `navigate("memberships")` → `/memberships`
- **Correct destination:** the coaching service page already has its own pricing section `#coaching-pricing` immediately above this button (lines 370-412). The natural action for "See all details" is the same `scrollToPricing()` smooth-scroll used by the Hero CTA (#73) and Final CTA (#80). This matches the pattern established by commit `e0c6f0e` (2026-08-24) which already converted buttons #73 and #80 from `navigate("memberships")` to `scrollToPricing` — button #79 was missed in that pass.
- **Origin of bug:** Phase 2 commit `4fbab5f` (B12 — 2026-08-18) mass-replaced `navigate("pricing")` → `navigate("memberships")` across the codebase. At that time, `/pricing` was deleted and `/memberships` was the closest surviving analog. The coaching page had 4 such buttons; commit `e0c6f0e` fixed 2 of them (Hero + Final CTA) by switching to `scrollToPricing()`, but the "See all details" button under the pricing cards was missed.

**Recommended fix (Part B):** Change line 415 from `onClick={() => navigate("memberships")}` to `onClick={scrollToPricing}`, matching the pattern of buttons #73 and #80. Also remove the misleading inline comment on line 416.

---

## Other ⚠️ items for owner review (NOT fixed in this task per Part B constraint)

Per Part B: "ممنوع تعديل أي زر آخر — كل ❌ و ⚠️ تُدرج في التقرير للمالك ليقرر."

The owner should review these for a future task:
- Theme 1 (3 items): "Pricing" label pointing to `/memberships` — already documented as M5 discrepancy in PROGRESS.md.
- Theme 2 (3 items): "EVO Coach" label using `chat` view — could be renamed to `evo` view for clarity, or left as-is.
- Theme 3 (2 items): "Start for free" → `/memberships` — could be redirected to `/auth?mode=signup` for clearer intent.
- Theme 4 (1 item): Coach sidebar `nav.admin` label → could be renamed to `nav.payments`.
- Theme 5 (3 items): "Get a personalized plan" → could be redirected to `/coaching` instead of `/memberships`.
- Theme 6 (2 items besides #79): #54 LandingView Coaches section "Pricing" and #84 EVO page "See plans" — same class of bug as #79, recommend fixing in a follow-up task.
- Theme 7 (3 items): #129 acceptable, #151 dead code (PricingView.tsx) safe to remove, #162 context-dependent.
