# QA_CHECKLIST.md — Verification Evidence

> **Role:** Per AGENTS.md §12.8, this file is source-of-truth #3 (below code and migrations, above docs). It records what has been verified, when, and how.
> **For task history:** see `worklog.md` (append-only chronological log).
> **For current status snapshot:** see `PROGRESS.md`.

---

## Latest Verification — 2026-09-02 (Phase 97 — VERCEL FREE-TIER IMAGE QUOTA GUARD: images.unoptimized=true in next.config.ts — owner directive)

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
