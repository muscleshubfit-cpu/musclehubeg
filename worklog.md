# Worklog

> 🗄️ **الأرشفة (Phase 82):** المهام الأقدم (قبل آخر 10 مهام) نُقلت إلى `archive/WORKLOG_ARCHIVE.md` (ملحق 2026-09-02) — السجل كامل ومحفوظ، وهذا الملف يستمر append-only من آخر 10 مهام.

---
Task ID: 14
Agent: Super Z (main)
Task: Phase 57 — optional coach certificates section on the public coach page + migration 0049 (owner: «ضيف قسم رفع شهادات المدرب اختيارى الى الصفحة العامة للمدربين ثم اعطينى رابط الهجرة raw»)

Work Log:
- Sandbox reset; repo re-cloned fresh from origin (6a41f63) and deps installed with bun
- Migration 0049 (RUN_ON_SUPABASE_0049_COACH_CERTIFICATES.sql): coach_pages.certificates jsonb not null default '[]' — array of {url,title} max 8; NO new tables, NO RLS changes (0031/0048 policies cover the row); 0046 review law untouched; notify pgrst; raw link delivered to owner
- coach-landing-server.ts: CoachCertificate type + parseCertificates (defensive: non-array→[], url required, title≤120, cap 8; exported for tests); certificates fetched via a SEPARATE lightweight select so a missing 0049 column can never touch the 0046 review gate (pending/rejected stay hidden); legacy fallbacks keep 42703/PGRST204 handling
- /api/coach/landing PUT: safeCertificates (safeMediaUrl per url + trimmed title≤120, max 8) + soft-roll retry — first upsert includes certificates; PGRST204/42703 → retry ONCE without certificates so pre-migration deploys never break coach saves; 42703 hint message updated to list 0032/0037/0046/0049
- CoachLandingEditor: LandingPage.certificates + state/load/save + MAX_CERTIFICATES=8 + handleCertsUpload (multi-upload to coach-public/{uid}/cert-*, guardImage enforced, busy "certs") + optional UI section «شهاداتك واعتماداتك (اختياري)» after results photos (title input per cert, delete, upload button hides at cap)
- CoachLandingContent: public section «شهادات المدرب / Coach certificates» after results gallery — 4:3 grid, title captions, loading=lazy, hidden entirely while empty
- NEW test coach-certificates.test.ts (4): malformed input→[], urlless rows dropped, title capped at 120, 8-cap
- Docs: PROGRESS.md Phase 57 entry (top), QA_CHECKLIST.md Phase 57 owner steps (run-0049 how-to + post-migration coach→admin→public verification + soft-roll note)
- §3.5: tsc 0 · eslint 0 errors (760 warnings = pre-existing baseline) · vitest 164/164 · next build ✓ (both coaches mirrors registered) · :3779 smoke / + /coaches/unknown + /ar/coaches/unknown + /coach/landing (soft-404 = documented Phase 56 finding, out of scope)

Stage Summary:
- Committed + pushed; owner step: run 0049 via raw link (how-to in QA_CHECKLIST) — before that, site fully works and the section simply stays hidden (soft-roll law, zero disruption)

---
Task ID: 14-b
Agent: Super Z (main)
Task: Phase 57 — production verification (post-deploy)

Work Log:
- Vercel deploy live: site 200; raw 0049 link 200 with correct content (END OF SCRIPT 0049 marker verified in served raw file)
- anon REST check: coach-mohamed-ahmed = is_published:true + review_status:pending → public not-found page is the EXPECTED 0046 gate state (owner approval step from Phase 56 still pending), NOT a regression
- REAL browser E2E on production as the Phase 56 test coach: login OK → /coach/landing shows «Your certificates (optional)» → uploaded test JPEG (thumbnail rendered) → typed name «ISSA Certified Personal Trainer» → Update published → success state (pending-review banner), DB updated_at fresh, review_status pending (0046 law), no console errors, no failed requests
- Reload persistence check pre-migration: all other fields intact, certificates empty (expected soft-roll: column not created yet → certificates dropped on save, zero errors) — section goes live once owner runs 0049

Stage Summary:
- Feature verified working end-to-end on production within soft-roll limits; certificates section activates after the owner runs migration 0049 (raw link + how-to in QA_CHECKLIST Phase 57)

## Phases 65-69 (2026-09-01) — Affiliate engine + honest copy + cancel + priority + EVO
- 0057 auto-applied: engine tables + signup-referral trigger (SECURITY DEFINER) + coach_client_activation + cancel_requested_at
- Phase 66: server-side engine (processSubscriptionInitialPaymentServer / processCoachClientActivationServer / reversal) shared by PayPal capture + manual approval (/api/affiliate/commission) + coach activation hook; referral_code travels in signup metadata (client + /api/coach/register cookie read)
- Phase 67: /coach/affiliate + /api/affiliate/referred-coaches + ReferralView «مدربين دعّيتهم» + AdminReferralsView coach panel + coach nav
- Phase 68: dead advertised features removed (premium content, pattern analysis/prediction, save body data, weekly auto-updates, Starter/Elite display) + /api/subscription/cancel + profile subscription card + server-decided ticket priority (coaching→high) + staff badges
- Phase 69: /api/ai/quota meter in widget + save-evo plans (/api/plans/member-edit) + swap persistence + meal-planner export gate + cross-session memory gated to paid
- Gates every phase: tsc 0 / eslint 0-new / vitest 164/164 / build ✓ / :3779 bilingual smoke / production verified (tables exist, guards 401, /coaching clean)
- Commits: f1322e3 (0057 alone) → c0ce65a (66) → 7abb5f5 (67) → eed4c7d (68) → 72c2f7c (69)

---
Task ID: 3
Agent: Main (Z User)
Task: Phase 72 (owner request) — nodemailer results email API + wire all SIX free tools + newsletter form (footer + homepage) + tool_leads lead persistence (email, name, tool) before sending + newsletter type='newsletter' + full checks + deploy.

Work Log:
- Fresh clone of origin/main @ 7b8e692 (env reset between sessions; owner provided repo URL + token again).
- Migration RUN_ON_SUPABASE_0059_TOOL_LEADS_NAME_TYPE_NEWSLETTER.sql: +name, +type (default 'tool'), tool_slug CHECK widened to 6 tools + 'newsletter' (dynamic constraint drop/re-create), type index; RLS untouched (public insert per 0006/0030C).
- New POST /api/send-email (nodejs runtime): validates tool_slug/email/results, per-IP 5/10min + per-email 3/hour limits, saves lead FIRST (tool_leads: email, name, tool_slug, result_summary, result_json, lang, type='tool'), then sends bilingual (ar/en, RTL/LTR) professional HTML email with per-tool labeled results table + per-tool smart tips + CTA; EMAIL_SERVER_HOST/PORT/USER/PASSWORD read from env; EMAIL_FROM/EMAIL_REPLY_TO optional; 500 with clear message when email env missing; DB failure never blocks delivery (logged).
- Upgraded LeadCaptureCard: posts to /api/send-email, exact owner copy «أدخل بريدك الإلكتروني لتصلك النتائج كاملة مع نصائح ذكية», optional name field, success state «تم الإرسال! تفقد بريدك الإلكتروني خلال دقائق.» + spam hint; same visual language.
- Wired water-tracker + meal-planner (had NO lead card): card shows with goal/logged/progress and plan totals respectively.
- New NewsletterForm component (footer/home variants): «اشترك الآن مجاناً» → /api/tools/lead with tool_slug='newsletter' + type='newsletter'; placed in LandingView footer strip + new homepage section before footer.
- Extended /api/tools/lead: ALLOWED_TOOLS + water-tracker/meal-planner/newsletter, optional name, auto type (newsletter|tool) — single save endpoint, keeps rate limit.
- types.ts tool_leads Row/Insert/Update updated; .env.example EMAIL_SERVER_* section added.
- Gates: tsc 0 errors (image TS2307 = missing next-env.d.ts on fresh clone, pre-existing) / eslint 0 errors (13 pre-existing-style warnings) / vitest 172/172 / next build ✓ / :3779 smoke: EN+AR homes 200 with both CTA strings, tools 200, API 400s + newsletter & water-tracker accepted + env-guard 500 — all PASS.

Stage Summary:
- Commits: d0cd430 (0059 migration alone) → 0b1a862 (code: API + 6 tools + newsletter + docs) pushed to main; Vercel auto-deploy.
- Owner actions: run 0059 in Supabase SQL Editor (raw link in QA_CHECKLIST), then live-test one email + one newsletter subscription.

---

## Phase 73 — 2026-09-01: Email security & filtering + customers DB for all registered members

Work Log:
- Owner request: frontend email filtering on all 6 tools + newsletter, daily SMTP cap 100/24h, clean error handling, and «كل اعضاء الموقع المسجلين (اعضاء او مدربين)» into the customers DB (tool_leads).
- New shared lib src/lib/email-validation.ts (strict email: ASCII local part, one @, dotted domain + 2+ letter TLD, 254 cap, no spaces/Arabic/symbols/'..'; bilingual messages; optional-name rules: Arabic/English letters + spaces + ' - . only).
- LeadCaptureCard + NewsletterForm validate BEFORE any request, clear Arabic error per case, role=alert, placeholder name@example.com, maxLength/inputMode.
- /api/send-email: strict email + name server-side; NEW daily limit — count tool_leads (created_at >= now-24h, type='tool') before save/send; >=100 → 429 + Retry-After 3600 + console DAILY LIMIT REACHED; fallbacks: plain count if type missing, log-and-continue if query fails; single supabase client reused for count+save.
- /api/tools/lead: strict email too.
- Migration 20260902040000_0060_signup_leads_and_customer_sync.sql: ensure name/type columns (covers 0059), CHECK widened to 8 slugs (+signup), trigger on auth.users (SECURITY DEFINER, dedupe by email, exception-guarded → signup can never break) inserting tool_slug='signup' type='member', backfill of all existing profiles (client→member, coach→coach, admin→admin). Auto-applied by the Supabase GitHub integration (proven 3/3).
- /api/coach/register + /api/admin/staff (3 paths): upgrade the signup lead to type='coach'; failures logged, never fatal.
- types.ts tool_slug unions + 'signup'; AdminLeadsView: signup label «تسجيل حساب», member/coach/admin badge, filter list completed (water/meal/newsletter were missing from Phase 72).
- Gates: tsc 0 / eslint 0 errors (baseline warnings only) / vitest 172/172 / build ✓ / :3779 smoke — EN+AR 200, Arabic/space/empty/symbols emails → 400, weird name → 400 with Arabic message, per-IP 429 alive, newsletter API 400s — all PASS. (First smoke hit a stale Phase-72 server on :3779 — killed it and re-verified on the fresh build.)

Stage Summary:
- Supabase SMTP account is shielded: 3 layers (IP 5/10min, per-email 3/h, global 100/24h) + strict filtering both sides.
- Customers DB now receives EVERY registered account automatically + all previously registered users backfilled; coaches labeled.
- Migration 0060 needs NO manual run; owner should NOT re-run RUN_ON_SUPABASE_0059 manually after it.

---

## Phase 73 hotfix — 2026-09-01: email CTA links to live domain + live verification

Work Log:
- Owner fixed EMAIL_SERVER_* on Vercel; live send on ab39ed9 → 200 {ok:true, leadSaved:true, id} — SMTP OK at that moment, migration 0060 columns proven live.
- Owner confirmed live domain = musclehubeg.vercel.app → hotfix 0381a49: SITE_URL const (NEXT_PUBLIC_SITE_URL fallback https://musclehubeg.vercel.app) replaces the dead https://musclehubeg.com in both email HTML CTA and text version.
- Post-deploy live sends → 500 ×3 (same JSON catch path); code change is template-only → env snapshot / Gmail throttling suspicion; owner action: read [api/send-email] Exception line in Vercel logs, verify 4 EMAIL_SERVER_* on Production, Redeploy.
- Live filter checks pass: bad email → 400 on production.

Stage Summary:
- tsc 0, push ab39ed9..0381a49, deploy verified via /api/build-info (0381a49 live).
- Test rows (live-check*/final-check*) in tool_leads can be deleted from /admin/leads.

---
Task ID: 5 (Phase 74)
Agent: Super Z (main agent)
Task: المرحلة 74 (طلب المالك): منظومة الأرشفة والنمو العضوي — (1) وسم lang/dir ديناميكي من لغة المسار، (2) إصلاح 404 صفحات التمارين والأغذية العربية وربطها بالبيانات، (3) مدونة طويلة الذيل + روابط أدوات داخلية تلقائية، ثم فحص شامل ورفع GitHub لنشر Vercel.

Work Log:
- تشخيص حي: /ar بيرجع lang="ar" dir="rtl" فعلاً (الآلية موجودة) — قوّينا المطابقة بـ isArabicPath() موحدة (layout.tsx + middleware.ts): عربي = /ar بالظبط أو /ar/... فقط.
- تأكيد 404 حي على /ar/exercises/push-up و /ar/foods/chicken-breast — السبب: المسارين غير موجودين نهائياً + روابط القوائم العربية كانت تفتح الإنجليزية.
- إنشاء src/app/ar/exercises/[slug]/page.tsx (SSG لكل 868) و src/app/ar/foods/[slug]/page.tsx (ondemand لكل 8,830): ميتاداتا عربية + canonical/hreflang ثلاثي على الطرفين + og:locale ar_EG + JSON-LD عربي (HowTo/NutritionInformation/Breadcrumb).
- ExerciseDetailClient/FoodDetailClient: خاصية lang اختيارية (نمط ProgramDetailClient) + كل الروابط الداخلية لغة-واعية؛ روابط كروت القوائم /ar/... للعربية؛ sitemap.ts أضاف ~9,700 رابط عربي بـ hreflang متبادل.
- مدونة: وحدة جديدة src/lib/blog-tool-links.ts (إدراج حتمي لروابط الأدوات: 6 أدوات + 3 محاور؛ سقف 3/مقال؛ أول ظهور؛ idempotent؛ لا يمس الروابط/العناوين/الجداول/الاقتباسات؛ عربي+إنجليزي) مربوطة في p5-publish بعد المراجعة وفي generateArticleBundle/buildFinalBundle للمسار القديم + تعليمات P4.
- كلمات طويلة الذيل: P0 يُلزم ≥6/10 عبارات طويلة وأسئلة PAA ومواضيع طويلة (عربي+إنجليزي fallback محسّن)؛ P1 عنوان + H2×2 + LSI×5 طويلة؛ P2 تضمين حرفي؛ P4 FAQ بصيغة البحث؛ blog-generate.ts (system/chunk1/chunk2) نفس القوانين.
- اختبارات جديدة src/lib/__tests__/blog-tool-links.test.ts (10).
- بوابات: tsc 0 (بعد توليد next-env.d.ts المهمل — 4 أخطاء TS2307 موجودة أصلاً في baseline) / eslint 0 أخطاء / vitest 182/182 / build ✓ 1,879 صفحة ثابتة / دخان :3779: التفاصيل العربية 200 بعنوان عربي وhreflang وContent-Language: ar-EG والإنجليزية سليمة.
- توثيق PROGRESS.md (المرحلة 74) + QA_CHECKLIST.md + worklog.md؛ رفع main (كود فقط — لا SQL).

Stage Summary:
- 404 العربي انتهى: كل صفحات التمارين والأكلات لها مرايا عربية مفهرسة بروابط داخلية عربية.
- كل مقال جديد تلقائياً بيتوجه لعبارات البحث الطويلة وبيحمل حتى 3 روابط أدوات مجانية داخلياً.
- المطلوب من المالك: بعد النشر جرّب صفحة تفاصيل عربية + أعد إرسال الـ sitemap في Search Console.

---
Task ID: 6 (Phase 75)
Agent: Super Z (main agent)
Task: المرحلة 75 (طلب المالك «نعم نكمل المهام المؤجلة») — تنفيذ/إتمام قائمة المهام المؤجلة: خطوات الأفيليت 1-7 + عمولة ملموسة، حذف 4 أقسام من صفحة الأرباح، إكمال إشعارات الأفيليت، والتحقق من البنود المُنجزة سابقاً (خصم الرصيد، الأدمن بلا حدود، Starter/Elite، مولد الخطط اليدوي، cron 21:00، عمولة دعوة المدرب).

Work Log:
- فحص شامل أثبت إنجاز 6/9 بنود في مراحل سابقة (72-74 + مراحل أفيليت أقدم) — وثّق التحقق في PROGRESS/QA بدون تعديل كود عليها.
- AffiliateProgramView: how.steps 4→7 (AR+EN كاملة) + بلاطتا أمثلة $6→$1.20 / $16→$3.20 في كارت الاشتراكات + نوع examples موثق في Copy.
- ReferralView: حذف الإحالات + العمولات + المحتوى الترويجي + بانرات الموقع (الأقسام الأربعة) + تنظيف استيرادات (AffiliateToolkit/Users/Coins/FileText/LayoutGrid) + نداء payout-notify بعد نجاح طلب الصرف.
- نقل AffiliateToolkit لصفحة /affiliate العامة بقسم «أدواتك الترويجية» (مسجل = أدوات كاملة، زائر = CTA تسجيل) — حفاظاً على وعد الصفحة ببلاطات «محتوى ترويجي + بانرات».
- NEW POST /api/affiliate/payout-notify: requireUser + service role + حراس (طلب pending ≤10 دقائق + dedup [uid:]) → admin_notification «طلب صرف عمولة جديد 💸» → /admin/referrals.
- affiliate-engine-server: إشعار انعكاس العمولة (notifications + admin_notifications للموظفين) داخل reverseCommissionServer — غير حاجز.
- Migration 0061: تريجر AFTER INSERT على referrals → لو المُحال coach → جرس الداعي «مدرب جديد دعوته انضم! 🤝» (+جرس موظفين /coach/affiliate) — SECURITY DEFINER، استثناءات مبتلعة بالكامل، idempotent. تطبيق تلقائي عبر تكامل Supabase-GitHub.
- بوابات: tsc 0 / eslint 0 أخطاء (4 baseline على الملفين المعدلين) / vitest 182/182 / build ✓ 1,880 صفحة / دخان :3779: /affiliate 200 بالقسم والخطوة 7، /referral 200، payout-notify GET→405 (POST فقط)، unauth POST→401.

Stage Summary:
- رفع main → Vercel نشر تلقائي. المطلوب من المالك: جولة تحقق حية (الأفيليت 7 خطوات + لوحة أرباح نظيفة + انتظار تطبيق 0061 تلقائياً) — لا خطوات SQL يدوية.

## Phase 76 — 2026-09-01: 7-day refund system (no-features-used condition) + affiliate payout hold honoring subscription cancellations

Work Log:
- Owner request: «فى نقطة الغاء الاشتراكات واسترجاع الفلوس خلال ٧ ايام يكون فى شرط عدم استخدام المميزات، وكذلك فى سحب الارباح من الافيليت لازم نراعى نقطة الغاء الاشتراكات». The /memberships promise existed with NO backing system — Phase 76 built it end-to-end.
- Migration 0062 (20260902110000): refund_requests table (FK → public.profiles per 0004 law; usage_snapshot jsonb; status pending|approved|rejected; RLS select-own; writes service-role only) + referral_earnings.available_at (default now; backfill: subscription commissions <7d held until created_at+7d).
- src/lib/refund.ts (server-only): 7-day window anchored on subscriptions.start_date + no-features-used condition measured from tamper-proof ledgers (evo_chat_usage chats+plans, plan_swaps, ai_jobs done coach plans, saved_results); payment resolution via affiliate_transactions → subscription_requests fallback (coach-client payers have no txn rows by design).
- POST/GET /api/refund/request: server-side eligibility, idempotent pending return, usage snapshot insert, admin bell (daily dedup); GET returns live verdict (daysLeft + reason) for the profile card.
- GET/POST /api/admin/refunds (requireAdmin): approve = lock request (pending-only) + end subscription NOW (status=expired, end_date=now) + reverse linked affiliate commissions via reverseCommissionByReferenceServer (webhook-shared, idempotent) + user-based sweep fallback + member notification; reject = + reason to member. Money transfer stays manual (InstaPay/Vodafone/PayPal).
- Affiliate hold: engine creates subscription_initial/renewal earnings with available_at=+7d (coach activations/one-time unheld); legacy awardCommission hardened defensively; getReferralStats adds onHoldBalance and excludes held from availableBalance; createPayoutRequest FIFO selects only unlocked rows (.or available_at) with Arabic hold-aware error messages; unlock is a live read — no cron.
- ReferralView: «قيد فترة الأمان (7 أيام)» tile on the balance card + hold note inside the payout modal + updated program description; AdminPaymentsView: new refund-requests section showing the usage snapshot chips (zero at request time) + approve button labeled «قبول + إيقاف الاشتراك + عكس العمولات»; profile page: refund card (window left, condition text, request state, disabled when ineligible).
- Gates: tsc 0 / eslint 0 errors (788 vs 784 baseline warnings, same any-style) / vitest 188/188 (6 new refund-helper tests) / build ✓ 1,882 pages with ƒ /api/refund/request + ƒ /api/admin/refunds / smoke :3779: EN+AR+profile+referral 200, unauth refund & admin-refunds → 401.
- Docs: PROGRESS.md (المرحلة 76) + QA_CHECKLIST.md latest-verification table.

Stage Summary:
- Push to main → Vercel auto-deploy. Migration 0062 auto-applies via the Supabase GitHub integration (proven 3/3) — NO manual SQL for the owner.
- Owner verification path: (1) member: profile → «استرداد كامل خلال 7 أيام» card inside subscription card; (2) affiliate: /referral hold tile after a referred subscription payment; (3) admin: /admin/payments → refund requests section.

---
Task ID: 77
Agent: Super Z (main)
Task: Phase 77 — affiliate subscription commission examples with real Musclehubeg products (owner request)

Work Log:
- Replaced generic $6/$16 examples with real plans: Premium $14.99→$3.00, Pro $29.99→$6.00, Human Coaching $39.99→$8.00 (monthly, 20%)
- AR + EN cards and how-it-works steps updated; 3-column responsive example grid on /affiliate

Stage Summary:
- Commit e67de60 pushed to main; Vercel auto-deploy; no DB changes

---
Task ID: 78
Agent: Super Z (main)
Task: Phases 78 + 78b — admin external-plans generator fully AI-powered + regeneration suite (owner request)

Work Log:
- Phase 78 (2f456e5): POST /api/admin/external-plans {ai:true} runs the SAME engine as member plans (plan-generator: OpenRouter+Groq chain + local fallback) — meal brief (3-6 meals, target calories or auto BMR/TDEE, 8 diet types, optional person data, details) + workout brief (days/week, goal, level, location); structured result in content.plan + Arabic text in content.text; brief stored in content.ai.params (powers whole-plan regeneration); maxDuration 60s
- Phase 78b (571c0d6): regeneration suite — regenerate_plan (same stored brief, fresh variety roll), regenerate_meal (regenerateMeal + other-meals avoid-list + 2 full alternatives), regenerate_item (new regenerateFoodItem: same role, calories ±15%), regenerate_day (new regenerateWorkoutDay: same focus, avoid other days), regenerate_exercise (substituteExercise, library-ranked); AdminExternalPlansView renders structured cards with per-element regen buttons + AI badge with regen counter; legacy manual plans keep plain-text view

Stage Summary:
- Pushed to main; verified live on production in Phase 80 (below)

---
Task ID: 79
Agent: Super Z (main)
Task: Phase 79 — coaches get the FULL admin regeneration suite + plan draft materialization + admin version history (owner: «الكوتشينج يستفيدوا من نفس الخصائص، ايضا للادمن حفظ للخطط المولده»)

Work Log:
- ai-jobs.ts: new job types food_item_regenerate + day_regenerate (staff-gated "coach", quota-free, same GHA queue) with payload sanitizers
- ai-job-processors.ts: runFoodItemRegenerate + runDayRegenerate (+ materializePlanDraftRow) — GHA runner inserts the plans draft row itself (materialized:true + plan_id in result; browser skips its insert — no doubles); generated member plans survive dead tabs/devices
- CoachClientView PlanViewerModal: per-item Wand2 swap in meal tables (regenerateSingleItem with whole-plan avoid-list), per-day regen button in day headers (regenerateSingleDay), exercise swap visible in view mode too
- Admin external-plans: every regeneration action snapshots previous text+plan into content.history (cap 5) + restore_version action (reversible — current state re-snapshotted) + saved-versions UI (expander + one-click restore)
- Commit a5e98f3 pushed to main

Stage Summary:
- Fully verified LIVE on production in Phase 80

---
Task ID: 80
Agent: Super Z (main)
Task: Phase 80 — LIVE production check of Phases 77-79 with trial accounts + gating proof + docs parity + coach-join copy fix (owner request)

Work Log:
- Re-cloned repo fresh (sandbox reset); verified Phase 79 implemented (a5e98f3) and production build-info returns a5e98f3
- LIVE as admin trial (0050 admin.test@): AI meal generation (2200kcal/5 meals/Cut — matches brief, params stored), AI workout generation (honors «لا باربال»), regenerate_plan (34.1s via groq:gpt-oss-120b), regenerate_meal ×2, regenerate_item ×3 (±15% kcal honored: 180→165), regenerate_day (constraint-respecting), regenerate_exercise, history cap-5 snapshots + Saved versions UI + restore_version (reversible, restore_backup logged)
- LIVE as admin-in-coach-view: PlanViewerModal shows إعادة توليد + per-meal regen + per-item Wand2; food_item_regenerate job ran E2E (enqueue → GHA → done ~60-90s → valid 165→165kcal replacement)
- Coach gating PROOF (owner question): fresh coach registered via /for-coaches/register funnel → /admin/external-plans redirects to /coach; POST/GET /api/admin/external-plans with coach cookies → 403 "Forbidden — admin only"; coach sidebar has ZERO admin items; JOB_GATE requireCoach blocks clients from staff job types
- Environment notes (not code bugs): 2 all-provider outage windows (groq 400 json_validate empty generation + openrouter free 429s) → jobs retried 3× then failed safely, no quota burn, succeeded after recovery; intermittent Vercel 502s on long generation POSTs (UI toasts, retry OK)
- FIXED for-coaches copy (content.ts + page.tsx, AR+EN): retired «4+4 per client» replaced by client-tier monthly balance law (premium 3/3 · pro 6/6 · coaching 3/3 — same EVO pool, resets on the 1st) + unlimited editing/manual upload/AI regeneration of meal/item/day/exercise highlighted
- Docs parity: PROGRESS.md (77-79 entries + Phase 80), QA_CHECKLIST.md (live-check evidence table), DEVELOPER_GUIDE.md §2 (AdminGate admin-only, 13 /admin pages, 66 API routes, modern lib files), this worklog
- Cleanup: 2 QA external plans deleted (200×2) + QA coach account deleted via /admin/accounts cascade
- Gates: tsc 0 / eslint 0 errors / vitest 188/188 (see QA_CHECKLIST)

Stage Summary:
- Committed + pushed; owner verification: read PROGRESS Phase 80 section — the coach-gating answer is definitive (redirect + 403 + clean sidebar)
- GitHub token used ONLY in git commands — owner should revoke it now that work is done

---
Task ID: 81
Agent: Super Z (main)
Task: Phase 81 (owner request) — NEW plan-generation limit law «١+١ أسبوعية اجمالى ٤+٤ شهريا بدلا من ٣+٣ شهريا» + b2b/b2c limits audit + deferred-tasks closure check + copy/docs parity

Work Log:
- Deferred tasks audit (owner: «تاكد انها لم تتم تنفيذها اولا ثم نفذ ما لم يتم بعد»): ALL already executed in Phases 72-76 — email suite (tool emails+newsletter+security 100/24h+customers DB), SEO trio (dynamic lang/dir + Arabic 404 + long-tail blog wired to GHA), affiliate 7-step + 20% + 5 notifications, Starter/Elite removal, admin unlimited, earnings-page cleanup, cron 21:00 UTC, PayPal automation (capture-order/webhook + coach wallet top-up), 7-day conditional refund + payout hold honoring refunds. Queue EMPTY.
- b2b/b2c audit: B2C (EVO → checkEvoPlanQuota on the ONE combined pool; swaps weekly on plan_swaps) + B2B (ownership via coach_assignments, activation-required 402, same pool via checkClientPlanQuota) both sound. ONE CONFLICT FOUND + FIXED: legacy coach-side 4/4 cap (0034 COACH_AI_PLAN_LIMIT) double-capped the coach surface (Pro clients capped at 4 by the coach path while EVO allowed more) → REMOVED; the one client balance is the only quota.
- NEW LAW implemented: memberships.ts evoNutritionPlanWeeklyLimit/evoWorkoutPlanWeeklyLimit added — premium/coaching 1+1 weekly cap + 4+4 monthly total (was 3+3), pro 2+2 / 8+8 (2× Premium ladder preserved), free 0; features + COMPARISON_ROWS + CELL_TRANSLATIONS updated AR/EN.
- tier-limits.ts: weekStartUtc (Monday-anchored UTC, same convention as swaps reset) + window-aware counters (countEvoPlanRowsSince/countCoachPlanJobsSince/countClientPlanUsageSince/countClientWeeklyPlanUsage) + planWeeklyQuotaFor + enforcePlanQuota (two-window: monthly AND weekly; blockedBy "week"|"month") wired into checkEvoPlanQuota + checkClientPlanQuota (PlanQuotaVerdict).
- Routes: /api/ai/chat 429 message distinguishes weekly vs monthly (+Pro hint 8/mo 2/wk); /api/ai/jobs coach-path Arabic message weekly/monthly variants + legacy 4/4 gate deleted; /api/ai/quota adds weeklyUsed/weeklyLimit; /api/coach/ai-usage → clientBalance (both windows) + coachOwn informational, COACH_AI_PLAN_LIMIT dropped.
- UI: CoachClientView AiUsage type + atCap/usageLine (weekly + monthly lines, resets Monday note); EvoFloatingWidget meter adds «هذا الأسبوع» line; coach-limits.ts dead constant removed.
- Copy: LandingView FAQ + Premium/Pro cards (AR+EN), for-coaches content.ts FAQ (AR+EN) + page.tsx AI-plans card — all show weekly cap + monthly total.
- Tests: client-plan-quota.test.ts rewritten with a WINDOW-AWARE fake builder (gte("created_at", since) distinguishes monthStartUtc/weekStartUtc) — monthly-full, weekly-full-while-month-open, pro 8/8+2/2, coaching allowed, coach-path weekly block, staff bypass, free-0, Monday-anchor helper. tsc 0 · eslint 0 errors on touched files · vitest 191/191.
- Docs parity: AGENTS.md §(d) rewritten as PLAN-BALANCE QUOTA (two windows + legacy cap removal), PROGRESS.md Phase 81 section + header, QA_CHECKLIST.md Phase 81 evidence table (Phase 80 → Previous), DEVELOPER_GUIDE.md lib lines, this worklog.

Stage Summary:
- The advertised numbers ARE the enforced numbers: premium/coaching 1+1 weekly (Monday reset) · 4+4 monthly; pro 2+2 · 8+8 — one pool fed by coach AND EVO surfaces, legacy double-cap gone.
- Owner note: pro scaled 2× (8+8 monthly / 2+2 weekly) to preserve the advertised ladder — owner can pin different numbers anytime.
- Reminder: revoke the GitHub token after this push.

---
Task ID: 82
Agent: Super Z (main)
Task: Phase 82 (owner request) — deep docs↔code parity audit (differences shown first, owner approved) + full doc repair + size reduction of large files without functional harm

Work Log:
- Deep audit (owner: «فحص عميق جدا…اعرض عليا اولا اى اختلافات واستنى تاكيد منى»): verified AGENTS/PROGRESS/QA/worklog current (Phase 81) + quota law code matches memberships.ts/tier-limits.ts (premium 4+4/1+1, pro 8+8/2+2, free 0) + for-coaches/landing/memberships copy parity + affiliate 20% ($3/$6/$8) + refund 7-day law + vercel 2 crons + 868/8830 datasets + 52 ui/33 views + DESIGN palette/fonts. Differences reported and owner approved execution.
- README.md rewritten (was stale at Phase-8 era, 2026-08-26): 76 pages, 67 endpoints, admin-only 13 sections/15 page.tsx, full /ar mirror (15 routes), weekly+monthly quota law in member features, lib/data/ dir, 73 migrations, 5 GHA workflows, 2 crons, scripts/ exists, updated DB table map, dynamic lang/dir, known-issues list reduced to truly-open items (plan_swaps back-fill, Ahmed Zake CTA prompt, env 502s), fixed issues documented as fixed.
- DEVELOPER_GUIDE.md §8 rebuilt: full 67-endpoint table (methods + auth extracted per-file via script) replacing the stale 36-route table (12 dead routes removed, 30+ missing routes added); data.ts → src/lib/data/ fixed in 4 places; §11 testing table now shows vitest 18 files/191 tests; §14 AI provider table updated to real functions (callAI, callAIWithFallback, callFreeOpenRouterRace, callFreeAIFallbackChain — callFreeOpenRouter retired).
- PROGRESS.md + QA_CHECKLIST.md: «13 صفحة» wording unified to «13 قسماً = 15 ملف page.tsx»; docs/_AUDIT.md + docs/_NAV_MAP.md got HISTORICAL SNAPSHOT banners; SECURITY.md gained §15 (AI-job staff gates, external_plans admin-only RLS, email 100/24h cap, refund ledgers + 7-day payout hold).
- Size reduction (owner: «تقليص حجم الملفات الكبير بدون ما نضر المشروع») — archive-appendix method, NOTHING deleted: PROGRESS.md 260→52KB (Phase-76-entries + 112KB Condensed History + trailing Phase 58-71 → archive/PROGRESS_ARCHIVE.md appendix; status board sections 1-6 kept), QA_CHECKLIST.md 108→12KB (older evidence → new archive/QA_CHECKLIST_ARCHIVE.md; kept Phase 81+80+Verification Protocol), worklog.md 332→32KB (pre-last-10 tasks → new archive/WORKLOG_ARCHIVE.md; append-only continues), stale untracked package-lock.json removed from disk (never git-tracked; Vercel=bun.lock, GHA=npm install).
- Gates: tsc --noEmit 0 errors · vitest 191/191 · no code files touched (docs-only phase).

Stage Summary:
- Docs now claim exactly what the code does; every number re-verified against source (67 endpoints, 76 pages, quotas, commissions, migrations).
- Repo weight: ~1.02MB of tracked+local doc bulk reduced; full history preserved verbatim under archive/ with dated appendix banners.
- Owner note: revoke the GitHub token after this push.
