# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status snapshot:** see `PROGRESS.md`.

---

## Latest Verification — 2026-09-02 (Phase 90 — legacy-`any` cleanup batch 2: 795 → 749)

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
