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

---
Task ID: 83
Agent: Super Z (main)
Task: Phase 83 — owner-requested live health check post-Phase-82 («فحص حى سريع … مفيش اى ضرر + تجربة مستخدم حقيقية ومدرب وادمن وكوتش + عدد مرات توليد المقالات فى اليوم»)

Work Log:
- Push parity verified: origin/main == 18453c3 (Phase 82) — nothing unpushed; working tree clean
- Gates re-run live: tsc --noEmit 0 errors · vitest 191/191 (18 files, 16.8s)
- Live guest UX (agent-browser, dev server): / renders full EN landing (PWA SW ok, cookie consent, all nav sections, zero console errors — 1 benign next/image sizes warning on hero), /ar full Arabic RTL landing verified visually (screenshot), /blog renders search+categories, /auth renders
- Live gate proof as anonymous guest: /dashboard → bounced to /auth ✓ · /admin → /auth ✓ · /coach → /auth ✓ (client gates firing in real browser)
- API auth matrix live: 401 on wallets/coach-wallet/ai-usage/support/refund/admin-refunds/cron-blog-p0/progress-reminder (cron fail-closed ✓); 405 POST-only on staff/invite/cancel/member-edit/broadcast/send-email/upload; local-only 500/501/{results:[]} on external-plans/leads/ai-jobs/saved-results = isAuthConfigured=false dev pattern (auth skipped locally, returns "Server not configured" or empty list BEFORE any DB touch — production requireAdmin/requireUser proven in Phase 80)
- Dev-server flakiness noted: local next dev died 3× under sequential route compilation (3.9GB RAM box) — environment-only, no code fault; restarted each time and continued
- Production live: / , /ar , /blog , /api/build-info all 200 on musclehubeg.vercel.app; blog listing full of real published AI articles (protein plans, pre-workout, macro prep, splits…)
- Article/day law documented from code: EN workflow crons 12/16/22 UTC = 3/day · AR crons 05/11/18 UTC = 3/day → TOTAL 6 articles/day (each run publishes exactly ONE article); Vercel dispatch-pipelines (21:00 UTC daily) only TOPS UP missed slots to quota — never exceeds 3+3; failure/cancelled runs don't count toward quota (2026-08-27 law)
- 68 total route files confirmed: 66 route.ts under /api + auth/callback + og-image route.tsx (matches Phase-82 docs table)

Stage Summary:
- ZERO damage found — code, gates, tests, docs all healthy post-Phase-82
- Roles: guest bounce proven live (member+admin+coach surfaces); staff/role laws re-verified by code+API responses; full logged-in role E2E remains proven by Phase 80 production session (local has no DB keys by design)
- Article cadence: 6/day (3 EN + 3 AR), dispatcher self-healing, active on production
- No code changes in this phase — verification-only + this worklog entry

---
Task ID: 84
Agent: Super Z (main)
Task: Phase 84 — owner verification-only check («تأكد إن التوثيق مكتوب فيه توليد المقالات 6/يوم فعلاً ولا رقم تاني» + إعادة فحص أمر SEO النهائي القديم (Phase 74) للتحقق من معالجته — بدون تنفيذ)

Work Log:
- Sandbox reset discovered (repo gone) → re-cloned fresh from origin; HEAD = eea0c33 (Phase 83) — nothing lost
- Article-cadence docs audit: AGENTS.md L336 «3 articles/day per language» (EN 12/16/22 + AR 05/11/18) = 6 total ✓ · worklog Task 83 «TOTAL 6 articles/day» ✓ · archive/PROGRESS_ARCHIVE Phase 16 «3 مقالات/يوم لكل لغة = 6/يوم» ✓ · README/PROGRESS mention the dispatch cron but NOT an explicit count (incomplete, not wrong) · QA_CHECKLIST has no cadence line · DEVELOPER_GUIDE «التدفق الآلي (Cron)» L423-430 still describes RETIRED step1/step2/step3 flow (current = p0-p5) — stale, flagged to owner
- SEO-command re-verification (owner directive 2026-09-01, delivered as Phase 74 / 82568f8): (1) layout.tsx resolveLocale() dynamic lang/dir from x-pathname (middleware) with URL>cookie precedence + stale-cookie fix — Googlebot sees ar/rtl on /ar/* ✓ (2) /ar/exercises + /ar/foods routes exist ([slug]+list) and LIVE 200 on production for 3 exercise slugs + 3 food slugs + both lists ✓ (3) blog-research.ts LONG-TAIL KEYWORD LAW (≥6/10 long-tail, question-format, per-topic long-tail binding) + blog-pipeline.ts LONG-TAIL SEO LAW (title + 2 H2 + 5 LSI) + AR prompts in Egyptian/Gulf-friendly MSA ✓; internal linking = blog-tool-links.ts deterministic guarantee layer (6 tools: calorie/macro/body-fat/bmi/water/meal-planner, EN+AR triggers, max 3/article, idempotent, vitest-covered) + prompt-level FREE-TOOL LINKING in blog-generate.ts ✓
- LIVE PROOF of tool links on post-Phase-74 articles: progressive-overload-no-weight + 12-week-progressive-overload-intermediate (both published 2026-09-01T18:49Z) contain href=/tools/calorie-calculator, /tools/bmi-calculator, /tools/body-fat-calculator, /meal-planner; pre-Phase-74 articles predate the feature (expected)
- Gates live this session: tsc 0 · vitest 191/191 (incl. blog-tool-links tests)
- NO code changes (verification-only + this entry)

Stage Summary:
- No wrong article number anywhere in docs — the only stated figures (3/lang = 6/day) are correct; README/PROGRESS/QA lack an explicit count (optional polish), DEVELOPER_GUIDE cron-flow section is the one stale spot (step1-3 → should say p0-p5)
- All three SEO-command items PROVEN treated and live in production (Phase 74)
- Awaiting owner decision on the optional docs polish (README/PROGRESS explicit 6/day + DEVELOPER_GUIDE flow fix)

---
Task ID: 85
Agent: Super Z (main)
Task: Phase 85 — owner order «نفذ ملاحظاتك + اقتراحك»: explicit 6/day cadence in docs + stale cron-flow fix + hero `sizes` perf fix

Work Log:
- README: cron line sharpened (dispatch-pipelines tops up + rescues) + NEW «Blog cadence» line — 6 articles/day = 3 EN (blog-post-en.yml 12/16/22 UTC) + 3 AR (blog-post-ar.yml 05/11/18 UTC), one run == one article, dispatcher never exceeds 3+3
- PROGRESS: «آخر تحديث» → المرحلة 85 + new Phase-85 section + Blog CMS line now carries the explicit 6/day cadence with slots
- DEVELOPER_GUIDE: «التدفق الآلي (Cron)» rewritten — was describing the RETIRED step1-pick/step2-generate/step3-publish flow; now documents the two language workflows (slots), p0-research→p5-publish CRON_SECRET chain, row statuses, dispatcher top-up law, blog_generation_queue state; perf table rows step2b/2c/2d → blog p2-content / blog-generate
- QA_CHECKLIST: new «Latest Verification — Phase 85» evidence table (cadence parity, un-stale fix, sizes fix, gates); Phase 81 section reheaded to «Previous»
- LandingView.tsx (the ONLY code change): hero-athlete.jpg + evo-1.jpg were `fill` without `sizes` (next/image warning seen live in Phase 83 console) — added sizes="(max-width: 768px) 100vw, 50vw" (hero = 2-col grid column, max-w-6xl) and sizes="(max-width: 1024px) 100vw, 1024px" (EVO = centered max-w-5xl) → correct srcset + smaller mobile download
- Fresh-clone env note: node_modules + gitignored next-env.d.ts regenerated (bun install 708 pkgs; standard next-env.d.ts content — untracked by design); sandbox had been reset since Phase 84
- Gates: tsc --noEmit 0 · eslint LandingView 0 errors (4 pre-existing `any` warnings at L1286-1401, untouched by this change) · vitest 191/191 · dev homepage 200 with hero served via /_next/image optimizer

Stage Summary:
- Docs now state the 6/day article cadence EXPLICITLY in every main file (README/PROGRESS/QA_CHECKLIST) — zero wrong numbers repo-wide
- DEVELOPER_GUIDE cron-flow section matches the real p0-p5 pipeline (last stale spot from the Phase-82 audit closed)
- Landing perf warning eliminated; only functional-code touch is the two `sizes` props — no behavior change

---
Task ID: 86
Agent: Super Z (main)
Task: Phase 86 — owner order «نفذ المقترح واعمل اختبار سرعه واداء للموقع بالكامل، وفحص seo، geo ومل ما يلزم لاقوى درجة انتشار سريع عالمى اورجاني»

Work Log:
- Production build verified: /api/build-info = 832e6db (Phase 85 live)
- SPEED AUDIT (13 key pages EN+AR, best of 2 curl runs): TTFB 0.15-0.22s (Google good < 0.8s) · total ≤ 0.36s · HTML 53-150KB — home EN/AR 130KB, blogs 53KB, article 103KB, exercises 150KB, all excellent, zero outliers
- SEO AUDIT: hreflang en/ar/x-default EVERYWHERE (home, static pages, articles both languages — earlier "missing" reading was a case-sensitive grep artifact: React renders hrefLang, valid per HTML spec) · canonical on every page · full OG + Twitter cards · JSON-LD Organization + WebSite/SearchAction + FAQPage(5Q) on home + Article/BreadcrumbList/ImageObject on articles · sitemap 19,480 URLs with xhtml:link per-URL hreflang alternates covering all sections in both languages
- GEO AUDIT: robots.txt explicitly allows 14 AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Google-Extended, Bingbot, Applebot, Applebot-Extended, Meta-ExternalAgent, Amazonbot, YouBot) · public/llms.txt curated + live
- GAPS FOUND & FIXED: (1) no RSS → NEW /rss.xml (EN) + /ar/rss.xml (AR): RSS 2.0, latest 50 published posts/language, hourly ISR, empty-channel-safe; shared builder src/lib/rss.ts; NEW server-side listPublishedPostsForFeed() in blog-server.ts (fetchBlogForOG env/client pattern — the client listBlogPosts() from blog.ts CANNOT be called from route handlers: "Attempted to call client function from the server" 500s caught in dev smoke and fixed); RSS autodiscovery <link rel="alternate" type="application/rss+xml"> ×2 added to root layout <head> (site-wide); (2) no llms-full.txt → NEW dynamic route: curated sections + latest 30 articles/language with excerpts (AI engines cite fresh posts without full-site crawl); hourly ISR, text/plain
- WIRING: robots.txt Allow /llms-full.txt /rss.xml /ar/rss.xml · llms.txt pointer lines to feeds + expanded guide
- Gates: tsc 0 · eslint 0 errors (pre-existing any warnings L131/L175 blog-server + L1286-1401 LandingView untouched) · vitest 191/191 · dev smoke: all 3 new routes 200 with correct content-types
- Docs: PROGRESS Phase 86 section + QA_CHECKLIST Latest Verification table + this entry

Stage Summary:
- Site is in TOP shape for organic global growth: performance excellent, SEO complete, GEO already best-practice
- Two real distribution gaps closed: bilingual RSS feeds + llms-full.txt (AI engines)
- New routes are DB-absent-safe (empty channel/guide, never 500) and ISR-cached hourly

---
Task ID: 87
Agent: Super Z (main)
Task: Phase 87 — owner questions «هل llms.txt يحتاج إضافة في مكان زي GSC للسايت ماب؟» + «التحذيرات القديمة محتاجين نعمل فيها حاجة لمنع أي لغبطة في المستقبل؟»

Work Log:
- Confirmed Phase 86 was already pushed (origin/main == HEAD 5925589); production re-verified: /llms.txt, /llms-full.txt, /rss.xml, /ar/rss.xml, /sitemap.xml, /robots.txt ALL 200 with correct content-types
- Answered Q1: llms.txt needs NO registration anywhere — no AI-search console exists; AI crawlers auto-discover it at the root (documented in QA_CHECKLIST + PROGRESS)
- Answered Q2 by executing: located the 6 recurring eslint `any` warnings (blog-server.ts L131/L175 + LandingView.tsx L1286/L1322/L1361/L1401) and replaced them with real types
- blog-server.ts: added `import type { BlogPost } from "./blog"` (type-only import — erased at runtime, server-safe); `BlogPostFull = Omit<BlogPost, "faq_json"> & { faq_json: BlogFaq[] | null }` + `export type BlogFaq = { question: string; answer: string }`; fetcher signature → Promise<BlogPostFull | null>
- First tsc run caught a REAL gap the `any` was hiding: BlogPostFull lacked focus_keyword/tags/schema_json required by BlogArticlePage's BlogPost prop — deriving from BlogPost fixed it structurally (verified faq shape {question,answer} against BlogArticlePage L220-223 + p5-publish writer before typing)
- LandingView.tsx: 4 typed props for helper cards (LandingTool/LandingExerciseCategory/LandingProgram/LandingFoodCategory) matching the inline data arrays exactly (structural typing, zero call-site changes)
- Anti-confusion policy documented: full-repo eslint shows ~810 LEGACY `any` warnings outside the per-change gate = known noise, never blind-fixed, cleaned only on deliberate refactor with owner approval; standard gate = eslint on changed files must print NOTHING
- Gates: tsc 0 · eslint 0 warnings/0 errors (both touched files — was 6 warnings every run) · vitest 191/191
- Docs: QA_CHECKLIST Phase 87 table + PROGRESS Phase 87 section + this entry

Stage Summary:
- llms.txt: nothing to register, discovery is automatic — sitemap stays the only GSC submission (all GEO files re-proven live 200)
- Recurring warnings permanently closed: gates output is now silent-clean, so ANY future warning appearing is genuinely new and worth attention
- Type system got stronger for free: BlogPostFull can never drift from BlogPost again

---
Task ID: 88
Agent: Super Z (main)
Task: Phase 88 — owner order «نبدأ في تقليص التحذيرات القديمة المتراكمة ملف ملف بأمان، محتاج تاكيد ان ايفو بيشتغل streaming على vercel»

Work Log:
- EVO live proof (production, anonymous mode): POST /api/ai/chat {"message":"what is a good post-workout meal?"} → HTTP 200, real reply, source groq:openai/gpt-oss-20b, TTFB 4.79s == TOTAL 4.79s, 350B single JSON
- Streaming truth established: route returns NextResponse.json AFTER awaiting full model text (LaTeX/reasoning cleaning needs the whole text); client evo-chat-context.tsx does await response.json() — NO token streaming exists; the "EVO chat streams from Vercel" build-info wording was topology shorthand that caused the owner's confusion → corrected to "served from Vercel — full JSON reply, not token-streamed; heavy AI jobs on GitHub Actions"
- Full-repo warning census (eslint -f json): 120 files / 804 warnings; biggest: CoachClientView 78, blog-generate 45, plan-generator 44, ai-job-processors 34
- Batch 1 selected (safety rule: 1-2 warnings/file, away from payments/auth/cron): exercise-image, send-email, tools/lead, NewsletterForm, ContactView, use-membership-tier, social-posts + BlogView
- Fixes: catch(e:any)→catch(e)+e instanceof Error ×4 (behavior identical) · WgerSuggestion type for wger API JSON · normalizeHashtags(raw: unknown)+unknown[] · .then((sub:{tier?:string|null}|null)) · BlogView.tsx DELETED (dead code: imported nowhere; stale columns title_ar/cover_image absent from blog_posts Row type — future-confusion landmine, git history preserves it)
- vercel.json checked: no per-function maxDuration overrides (platform defaults apply; EVO ~5s fits comfortably; heavy AI jobs deliberately run on GitHub Actions per topology)
- Gates: tsc 0 · eslint 0 warnings/0 errors on all 8 touched files · vitest 191/191 · post-fix census: 804 → 795
- Docs: QA_CHECKLIST Phase 88 (incl. running tally + next-batch order) + PROGRESS Phase 88 + this entry

Stage Summary:
- EVO on Vercel: PROVEN working live (200, groq fast-chain, ~4.8s); honest status = full-JSON reply, NOT token-streamed — true SSE streaming offered as a separate future phase
- Cleanup batch 1 complete: 804 → 795 (−9: 8 typed + 1 dead file deleted); order for next batches documented (small→medium→sensitive-last)

---
Task ID: 89
Agent: Super Z (main)
Task: Phase 89 — owner order «ابدأ ب ايفو الاول، ودايما عدل التوثيقات وملفات هيكل المشروع علشان ميحصلش لغبطة، خليها قاعده فى توثيق الايجنت»

Work Log:
- ENV: repo re-cloned (3rd env reset) from origin @4e3ce2c + bun install + next-env.d.ts regenerated; tsc 0 before starting
- ai-provider.ts: NEW callAIStream() — stream:true, OpenAI-compatible SSE parse, content deltas → onDelta, reasoning deltas buffered silently (content→reasoning fallback mirrors callAI); FallbackChainOptions.onDelta added; chain inner loop streams via streamTap — silent fallback only BEFORE first delta, mid-stream failure throws "stream failed mid-way on <provider>/<model>" and aborts the chain
- route.ts step 7 rewritten: success = ReadableStream SSE (event: delta per token → event: final with cleaned text + links + source; event: error on mid-stream); cleaning pipeline (steps 1-7) unchanged, runs on the complete text and ships in final; too-short → local fallback as final; all-providers-failed (no deltas) → local fallback as final; 429/pre-stream failures remain JSON; outer catch untouched
- evo-chat-context.tsx: content-type sniffing once (isSSE ? null : response.json() — never double-consume); SSE path: placeholder assistant bubble inserted immediately (isTyping false), grows per delta via pure setState map, parseEvent RETURNS effects (no closure mutation — fixes TS2339 'never' narrowing), final swap with cleaned text + links + planKind tag + paid persistence via buildPersistBody; legacy JSON path intact for safety
- Gates: tsc 0 (after the narrowing fix) · eslint 0 NEW warnings (21 pre-existing = 15 route + 6 ai-provider) · vitest 191/191
- PUSHED 1662c4d → Vercel built → LIVE TEST (curl -N, timed): word-by-word event:delta frames ({"text":"Aim"}{"text":" to"}…) then event:final with cleaned text — TRUE token streaming PROVEN on production; build-info label now "EVO chat token-streams via SSE from Vercel — Phase 89"
- Documentation Parity Law added as AGENTS.md §3.6 (owner directive; cites the old misleading "streams from Vercel" label as proof-of-why); README function table (+callAIStream row; fixed callFreeAIFallbackChain use-case that wrongly said "Local fallback") + SSE note; DEVELOPER_GUIDE EVO flow (SSE events + cleaning note) + API table row; this entry + QA_CHECKLIST + PROGRESS
- Commit plan: 1662c4d = code + AGENTS/README/DEVELOPER_GUIDE/build-info; follow-up docs commit = QA_CHECKLIST + PROGRESS + worklog with the REAL live evidence

Stage Summary:
- EVO chat now streams token-by-token on Vercel (SSE) — live-proven; quality floor unchanged (cleaned final still authoritative); quota/auth/error paths untouched; fallback policy preserved with an explicit mid-stream contract
- Documentation Parity Law (§3.6) is now a binding operating rule for all future agents

---
Task ID: 90
Agent: Super Z (main)
Task: Phase 90 — owner order «كمل الدفعة الثانية» — legacy-`any` cleanup batch 2 (all non-sensitive 1-2-warning files + notifications data layer)

Work Log:
- Full-repo eslint JSON inventory (795 baseline confirmed, 112 files) → batch 2 = every non-sensitive 1-2-warning file per the QA_CHECKLIST batch order; sensitive set (admin/coach/cron/auth/paypal routes) intentionally deferred to the LAST batch
- 25 files cleaned to ZERO warnings with real types (no suppression): paypal.ts `getTier(planTier as TierId)` (existing CheckoutView/AdminPaymentsView cast pattern) · data/chat.ts ChatRow · data/referrals.ts `{status?: string|null}` row filters · blog.ts NEW BlogFaq + BlogPost.faq_json `BlogFaq[] | null` + schema_json `Record<string, unknown> | null` (BlogFaq single-source: defined in client-safe blog.ts, re-exported by blog-server.ts; BlogPostFull derivation untouched) · BlogArticlePage faq map param → BlogFaq · plan-jobs.ts payload `{clientId?: string | null} | null` · ai-runner-dispatch.ts catch instanceof pattern · result-png-export.ts ToolResultData (5-tool PNG/PDF card) · AppLayout `(view as string)` honest widening (View union vs legacy "admin-leads") · HealthMetricsDashboard num() param `string | number | null | undefined` · AdminAssignmentsView CoachClientListRow (get_coach_client_list 0030D shape) · LeadCaptureCard resultJson Record<string, unknown> + catch pattern · AffiliateToolkit catch pattern · meal-planner sub `{tier?: string | null}` + catch pattern · water-tracker catch pattern · checkout `tierParam as TierId | MembershipTier` (real prop type, not any) · suggest-image body typed at the boundary (SuggestImageBody, unknown fields + runtime guards, no double-narrowing reliance) · food-search OffProduct (product-database rows, nutriments Record<string, number>)
- notifications data layer fully typed (9 warnings): NEW exported NotificationRow + AdminNotificationRow; supabase branches cast at the single return point, localStorage mirrors via read<Row[]>; both bells (NotificationBell/AdminNotificationBell) consume the exported types + `ReturnType<typeof setInterval>` for the poll handle
- chart.tsx (vendored shadcn, recharts v3): ChartPayloadItem = Omit<Payload,"dataKey"|"value"> & { dataKey?: string|number; value?: string|number } — narrowed because recharts types dataKey as DataKey<any> (function possible → illegal React key) and ValueType carries arrays; tsc caught the value/React-key gap on the first pass, fixed by narrowing value too
- Behavior riders (same files, zero risk): water-tracker membership redirect window.location.href → navigate("memberships") (client-side nav) · AffiliateToolkit banner <img> kept with documented inline eslint-disable + rationale (static SVG asset — next/image adds no value; the file already documented the reason)
- DEAD CODE deleted: ui/image-stream-hero.tsx — zero imports anywhere; only reference is a comment in LandingView ("Replaced ImageStreamHero with a clean static hero"); git history preserves it
- Gates: tsc 0 (one real catch: chart value/React-key above) · eslint 0 warnings / 0 errors on ALL 25 touched files · vitest 191/191 · full-repo re-inventory: 795 → 749 warnings, 112 → 87 files
- Docs in the SAME phase (Parity Law §3.6): QA_CHECKLIST Latest Verification table (Phase 90 + demoted 89) + PROGRESS Phase 90 section + «آخر تحديث» + this entry

Stage Summary:
- Batch 2 complete: 795 → 749 (−46 = 45 typed/cleaned + 1 dead file deleted); every remaining ≤2-warning file is in the SENSITIVE set (admin/coach routes, paypal create-order/webhook, auth/callback, cron/blog ×4, wallet topup) — they wait for the final batch with double review, per the documented order
- Running tally: 804 → 795 (batch 1) → 749 (batch 2); next batch options: medium files (blog-admin, SaveResultButton ×5, BlogEditorView ×11, ai-job-processors ×34…) or the sensitive small set with extra review — owner's call

---
Task ID: 91
Agent: Super Z (main)
Task: Phase 91 — owner order «نفذ الافضل من اقتراحاتك … عايزين نقفل باب الاخطاء القديمة ونركز فى تطوير المشروع» — legacy-any cleanup batch 3 (data-layer-first + the 3 biggest non-sensitive files)

Work Log:
- Started from 749/87 files (batch 2 already pushed by the previous session); owner asked for the best-suggestion continuation → documented batch order says medium files next, sensitive set last
- KEY DISCOVERY: src/lib/supabase/types.ts (generated) covers ALL tables incl. progress_photos/subscription_requests, and supabase client is createBrowserClient<Database> — select() rows were already typed; warnings lived in localStorage fallbacks + needless `(s: any)` annotations. Strategy: define types ONCE in the data layer, views inherit them for free
- Stage A (749→707, commit 8efa8ca): types.ts +4 exported Rows (NutritionQuestionnaire/FitnessQuestionnaire/ProgressPhoto) · subscriptions.ts 14→0 (Subscription/SubscriptionRequest/SubscriptionRequestInput; local fallback rows gained reviewed_at/subscription_type/cancel_requested_at — tsc caught the gaps) · plans.ts 10→0 (Plan/SupportTicket/PlanInsert/PlanUpdate/PlanContent via type-only import from plan-generator; addPlan explicit Row build; updatePlan builds PlanUpdate + single documented Json cast; getSwapUsage tier as MembershipTier) · progress.ts 7→0 (ProgressEntry/ProgressPhoto/ProgressEntryInsert; addProgress explicit Row build — tsc caught undefined-vs-null; photos fallback mirrors signed-url url field) · questionnaires.ts 4→0 (QuestionnaireRow union; data param Json) · ProgressView 7→0 (typed states + catch instanceof + chart filter type predicate — tsc PROVED the old any hid a null-weight leak into the chart)
- Stage B (707→629, commit ef2ded1): CoachClientView 78→0 — state from data-layer types · RecoverableJobInput[]/AiJobRow/PlanJobResult · PlanContent narrowing via in-guards · NutritionPlanContent extended to reality (item carbs_g/fat_g + meal total_carbs_g/total_fat_g) · updateMealItem/updateExercise literal field unions · EditCell string|number|undefined · QuestionnaireForm Json form + asForm() + String() boundaries · plan-jobs RecoverableJobInput +finished_at · BUG FIXED: buildRecentPlanNames compared p.type==="nutrition" (impossible per DB enum meal|workout) — nutrition variety names were silently dead; now matches meal + legacy nutrition rows, documented inline
- Stage C (629→589, commit d74ced1): PlansView 27→0 (Plan[] state · SwapUsage = Awaited<ReturnType<typeof getSwapUsage>> · asPlanContent() narrowing · applySwapToPlans mutate on narrow views · MealContent/WorkoutContent/PlanCard/PlanDetailModal/Stat typed · EVO text-plan branch "text" in content) · QuestionnairesView 13→0 (QuestionnaireRow state · Record<string,Json> forms · String() at every render boundary · Array.isArray photos guards ×4)
- Method note: the tool display strips `[m` sequences from shown text — copying displayed text into replacement patterns caused silent no-ops once (python str.replace); recovered by rebuilding patterns programmatically with bracket-safe composition and per-edit match reporting; scripts persisted under /home/z/my-project/scripts/
- Gates: tsc 0 (run after EVERY stage) · eslint 0 warnings/0 errors on all touched files · vitest 191/191 ×3 · census: 749 → 707 → 629 → **589** (79 files)
- Docs parity §3.6: QA_CHECKLIST new Latest section + PROGRESS Phase 91 section + «آخر تحديث» + this entry

Stage Summary:
- Batch 3 complete: 749 → 589 (−160); running tally 804 → 795 → 749 → 589; the project's biggest file (CoachClientView) is now fully typed with zero suppressions
- Data layer now the single type source for views — new pattern documented (types.ts → data layer → views)
- Remaining: technical giants (blog-generate 45, plan-generator 44, ai-job-processors 34, ai-local 28, referral 25, ai-jobs 24) then the sensitive set (admin/coach/paypal/auth/cron/wallet) last with double review
- REMINDER to owner: revoke the GitHub token (ghp_SV…IvWO) once all work is done — it is only used transiently in git push commands, never stored in files

---
Task ID: 92
Agent: Super Z (main)
Task: Phase 92 — owner order «كمل اخر دفعه» — legacy-any cleanup batch 4: the six technical giants

Work Log:
- Started at 589/79 files (Phase 91 pushed); batch = ai-jobs, referral, ai-local, ai-job-processors, plan-generator, blog-generate — six staged commits, full gates after each
- 4a (589→561, b2cef55): ai_jobs table added to generated types (mirror RUN_ON_SUPABASE_0024) — all `from("ai_jobs" as any)` dead · supabaseAdmin already Database-typed → its as-any casts removed · AiJobRow payload/result Record<string, unknown> · sanitizeJobPayload(raw: unknown)→Json with per-case Record views · ripple casts at CoachClientView (job.result as PlanJobResult) + test file sanitize() wrapper (its own 4 as-anys also removed)
- 4b (561→536): referral.ts — callback annotations dropped over Database-typed rows; isUnlocked takes structural { available_at } view
- 4c (536→508): ai-local.ts — ClientContext.nutrition/fitness → unknown + exported loose() helper (LooseFields view, one cast per entry point); current_plans typed { type, content: PlanContent | null }; ExerciseVariant for EXERCISE_LIBRARY/pickExercises (filter predicate); chat replies narrow plan content via 'meals'/'days' in guards; String() wraps preserve ||-fallback semantics exactly
- 4d (508→476): ai-job-processors.ts — all (supabaseAdmin as any) deleted; plans/blog_posts inserts typed (PlanContent→Json; blog row cast documented for legacy optional source column); PROCESSORS/ProcessorResult Record<string, unknown>; parseJSON<Record<string, unknown>> ×2; social platform/tone as SocialPlatform/SocialTone; regenerate* arg views matching param required fields
- 4e (476→430): plan-generator.ts — loose() reused; normalizeNutrition/Workout per-item Record views; RegeneratedMeal exported (unknown fields read defensively; external-plans route item map normalized with typeof guards — behavior identical); Exercise[] pool family; parseJSON typed ×5; catch instanceof ×5; trending/notes prompt reads via LooseFields
- 4f (430→385): blog-generate.ts — ResearchData = ResearchResult (imported); ArticleSeo exported; FaqItem/LinkItem/ImagePrompts/SocialPosts; result-type aliases; ArticleBundle.research widened honestly to ResearchResult | {angle,searchIntent,rationale} | null; legacy optional result fields documented (arResult.seo / *.research / internalLinksAr — undefined at runtime → same fallbacks); dead research.trendingAngles access dropped; parseJSON typed ×4; buildFinalBundle parts fully typed
- Gates: tsc 0 ×6 · eslint 0 on all touched · vitest 191/191 ×6 · census 589 → 561 → 536 → 508 → 476 → 430 → 385 (72 files)
- Docs parity §3.6: QA_CHECKLIST Phase 92 section + PROGRESS Phase 92 + «آخر تحديث» + this entry

Stage Summary:
- Batch 4 complete: 589 → 385 (−204); running tally 804 → 795 → 749 → 589 → 385; the ENTIRE AI pipeline (enqueue → sanitize → GHA processors → generators → blog bundle) is now end-to-end typed with zero suppressions
- Remaining 385: small/medium non-sensitive files + the sensitive set (payments/auth/cron) last with double review
- REMINDER to owner: revoke the GitHub token (ghp_SV…IvWO) once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 93
Agent: Super Z (main)
Task: Phase 93 — owner order «كمل» — legacy-any cleanup batch 5: medium non-sensitive files (two staged commits)

Work Log:
- Started at 385/72 files (Phase 92 pushed); documented batch order says medium non-sensitive next, sensitive set (admin/coach/paypal/auth/cron/wallet routes) LAST with double review
- Stage 1 (385→292, commit 854356a): GENERATED TYPES EXPANDED per the mirror law — +coach_ads (0037/0038), +evo_chat_usage (0022), +evo_anon_usage (0028), +Function coach_adjust_wallet (0035), coach_pages rows completed with the missing 0037/0046/0049 columns (review_status, photo_url, results_photos, socials, whatsapp_phone, certificates); new exports CoachAd/CoachTopupRequest/CoachWalletTransaction/TicketMessage/EvoChatUsage/EvoAnonUsage. Files zeroed: tier-limits 11→0 (casts dropped over typed tables) · data/tickets 11→0 (SupportTicket/TicketMessage + StaffTicket + typed /api/support/tickets envelope) · coach/ads 18→0 (real CoachAd rows, typed wallet rpc) · blog-images 8→0 (Pexels/Unsplash/Pixabay result shapes) · blog-admin 8→0 (BlogFaq + typed insert/update; legacy source column outside Insert type, single boundary cast per call) · coach-landing-server 8→0 · blog-topics 8→0 (Json Record views) · ai/chat 15→0 (EvoClientContext + typed history + createClient<Database>) · ai-provider 6→0 (typed completions response, parseJSON<T=unknown>)
- Stage 2 (292→244, commit e480207): BlogEditorView 11→0 (unknown result shapers + typed jobs scan + catch instanceof ×4 + dead directive) · CoachWalletView 11→0 (generated row types + typed PayPal window view + catch instanceof; QR <img> kept with documented inline rationale — optimization must never touch a scannable QR, AffiliateToolkit precedent) · BlogAdminView 9→0 (BlogStats + GeneratedArticleJob watcher + catch ×5 + dead directive) · CoachView 9→0 (ClientSubInfo + SubscriptionRequest[] + casts dropped over typed data layer + getTier(subTier as TierId) Phase 90 pattern) · profile 8→0 (typed profiles.Update + SavedResultRow/SavedMealPlanRow views + catch ×2)
- tsc caught REAL gaps mid-phase (each fixed): missing title line in adminCreatePost payload · supabase-js RejectExcessProperties rejecting the legacy source prop inside insert/update generics → boundary casts · localStorage ticket literal widened status · BlogAdminView stats null-narrowing in JSX · data/index has no SubscriptionRequest re-export → import from types.ts
- Gates: tsc 0 after EVERY stage · eslint 0 warnings/0 errors on ALL touched files · vitest 191/191 ×2 · census 385 → 292 → 244 (58 files)
- Docs parity §3.6: QA_CHECKLIST Phase 93 section + PROGRESS Phase 93 + «آخر تحديث» + this entry

Stage Summary:
- Batch 5 complete: 385 → 244 (−141); running tally 804 → 795 → 749 → 589 → 385 → 244
- The LIVE EVO pair (chat route + ai-provider) is now zero-any with the SSE streaming contract byte-identical — the biggest risk item of the batch verified by the full gate suite
- Remaining 244 = sensitive set (admin/coach/paypal/auth/cron/wallet ≈150) + scattered small files (≈94); sensitive set runs LAST with double review per the documented order
- REMINDER to owner: revoke the GitHub token once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 94
Agent: Super Z (main)
Task: Phase 94 — owner order «كمل» — legacy-any cleanup batch 6: scattered small non-sensitive files (two staged commits) — non-sensitive census reaches ZERO

Work Log:
- Environment was reset again (3rd time): repo re-cloned, npm install re-run, next-env.d.ts recreated locally (gitignored — never committed). Local-only; production unaffected
- Started at 244/58 files (Phase 93 pushed, commit 3ffdda7); documented batch order: scattered small non-sensitive files NOW, sensitive set (admin/coach/paypal/auth/cron/wallet routes + auth-server + ai/jobs + queue-health + CheckoutView + refund.ts = 137/33) LAST with double review
- Stage 1 (244→193, commit baddb37): AdminWalletsView 7→0 (topups → CoachTopupRequest & {coach relation}) · CoachSupportView 7→0 (StaffTicket + TicketMessage; NOTE: the data barrel does NOT re-export SupportTicket/TicketMessage → import from supabase/types directly) · SupportView 6→0 (same ticket types) · external-search 6→0 (parseJSON unknown[] + per-item Record views) · SaveResultButton 5→0 (Record<string,any> → ToolResultData EXPORTED from result-png-export — the renderer's own contract, verified all 4 tool pages pass primitive-only results; window.location.href ×2 → router.push) · SiteHeader 5→0 (icon: LucideIcon; logo + icon-192 → next/image priority — LCP on every page; avatars kept <img> with documented rationale — user-provided arbitrary hosts would need a wildcard remotePatterns entry) · AdminExternalPlansView 5→0 (plan: PlanContent union + in-guards PRESERVING Array.isArray runtime safety against malformed legacy rows) · blog-pipeline 5→0 (typed parseJSONLoose generics; links filtered via type predicates on Record views — behavior identical) · blog-research 5→0 (normalizeResearch(unknown) + per-item views; tsc caught parsed-null gap in P4 → guard extended with !parsed ||)
- Stage 2 (193→137, commit 0cd4438): coach-whatsapp route 4→0 (all casts dropped over typed tables incl. coach_pages.whatsapp_phone) · AdminLeadsView/AdminAccountsView/AdminPaymentsView/AdminCoachPagesView/AdminReferralsView/AdminSavedResultsView/ReferralView catches batch-fixed via scripts/fix_catch.py (per-match regex, catch instanceof pattern) · AdminPaymentsView rows → SubscriptionRequest[] (tsc caught openReceipt null path → widened locally, JSX guard unchanged) · DashboardView 4→0 (ProgressEntry/Plan/Subscription from types.ts + getTier(tier as TierId) Phase 90 pattern) · CoachLandingEditor 4→0 (dead directive removed + 3 catches + 6 interpolations) · use-voice-input 4→0 (SpeechRecognitionEventLike/ErrorEventLike structural views — no DOM lib types needed) · ai-jobs-client 4→0 (getAiJob → AiJobRow, runAiJob → Record<string,unknown>; CoachClientView narrows replacement per regen flow — exercise/meal/food-item/day, meal site documented trust-boundary cast preserving EXACT old crash-path semantics) · blog-queue 4→0 + GENERATED TYPE CORRECTED: blog_generation_queue in types.ts was STALE vs migration 0005 (+0021/0026) — removed phantom columns (blog_post_id, updated_at), added real ones (topic_ar, focus_keyword_ar, focus_keyword, category, rationale, article_bundle Json, en_post_id, ar_post_id, generated_at, published_at) · fetch-images 3→0 (CoverCandidate row view) · EvoFloatingWidget 3→0 (evo-standalone.jpg ×3 → next/image 48/40/80px, button one priority) · use-nav 3→0 (params: Record<string,string> — verified ALL navigate callsites pass strings) · AdminCoachPagesView dead directive removed
- MultiEdit tool quirk hit twice: edits apply sequentially and a mid-batch failure leaves earlier edits applied while reporting total failure — always verify with grep/python after any MultiEdit failure before re-applying (recovered a dropped meals-reassignment block in CoachClientView that tsc immediately caught)
- Gates: tsc 0 after EVERY stage · eslint 0 warnings/0 errors on ALL 28 touched files · vitest 191/191 ×2 · census 244 → 193 → 137 (33 files = exactly the sensitive set)
- Docs parity §3.6: QA_CHECKLIST Phase 94 section + PROGRESS Phase 94 + «آخر تحديث» + this entry

Stage Summary:
- Batch 6 complete: 244 → 137 (−107); running tally 804 → 795 → 749 → 589 → 385 → 244 → 137
- MILESTONE: the non-sensitive census is now ZERO — every remaining warning (137/33 files) lives in the sensitive set reserved for the final double-review batch (admin/coach/paypal/auth/cron/wallet routes + auth-server + ai/jobs + ai/queue-health + CheckoutView + refund.ts)
- REMINDER to owner: revoke the GitHub token once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 95
Agent: Super Z (main)
Task: Phase 95 — owner order «ابدأ» — legacy-any cleanup batch 7 FINAL: the sensitive set (137→0) with double review — census reaches ZERO

Work Log:
- Session opened at [ahead 3] — a STALE remote-tracking ref; git fetch proved origin/main = a61da46 (Phase 94 docs commit was already pushed by the prior session). Re-verified gates before continuing: tsc 0 · vitest 191/191 · census 137/33 (all sensitive)
- Stage A cron 19→0 (commit 5e37f0d): p0-research 3 (as-any casts dropped over the Phase 94-corrected blog_generation_queue — queueId now data.id) · p1-p4 1×4 + p5-publish 6 (blog_posts casts dropped: uniqueSlug/titleAlreadyExists/insert+single typed, post.id direct) · progress-reminder 6
- REAL BUG FIXED in progress-reminder: the route selected a PHANTOM profiles.lang column — profiles has NO per-user language column (verified against 0001_init + ALL migrations); PostgREST rejects the entire select → the weekly reminder cron 500'd every Sunday and sent NOTHING, hidden for its whole life by an any annotation. Fix: select("id, full_name") only; the route's own designed ternary fallback was "ar" (MuscleHub EG core audience) → AR text kept as-is, unreachable EN branch deleted as dead code, NOTE comment documents the full story
- Stage B ai 14→0 (ai/jobs 7 + ai/queue-health 7): ai_jobs casts dropped everywhere (Phase 92 table), payload?.clientId de-casted, GitHub probe JSON given a structural view (workflow_runs[0].run_started_at)
- MultiEdit sequential-failure quirk hit TWICE more (ai/jobs + webhook): mid-batch failure leaves earlier edits applied while reporting total failure — grep-verified state after each failure before re-applying (documented lesson from Phase 94, still true)
- Stage C admin 35→0 (10 files): GENERATED TYPES PARITY — +table coach_support_messages (mirror 0037 COACH_BOOST, FKs documented) + coach_pages.review_note/reviewed_at (mirror 0046 — Phase 93 added review_status but missed these two; tsc caught both the moment casts dropped). wallet trio casts dropped over coach_wallets/coach_fees/coach_topup_requests/coach_wallet_transactions + typed coach_adjust_wallet rpc (Phase 93 Function type). blog/cleanup: post[field] direct over the const fields union + updates typed BlogTextPatch (Partial<Pick<blog_posts.Update,...>>) · leads: update typed Partial<Pick<tool_leads.Update,...>> + tool as ToolSlug enum cast (DB enum = runtime guard) · saved-results: createClient<Database> + SavedToolSlug cast + transitive profiles embed (user_id → auth.users, NO direct profiles FK) typed via ONE documented boundary cast SavedResultWithUser — runtime query unchanged · refunds map callback de-annotated over the typed refund_requests embed
- Stage D coach/coaches 38→0 (7 files): subscriptions/activate 11 (coach_fees/coach_wallets casts dropped, extend_subscription Returns typed → subscription.id/end_date direct, coach_adjust_wallet debit+refund rpc typed, coach_payments insert typed) · coach/wallet 8 · coach/landing 6 (upsert payload REBUILT as CoachPageBaseUpsert = Omit<coach_pages.Insert,"certificates"> — the 0049 soft-roll retry omits certificates exactly as designed) · coach/support 6 (incl. admin_notifications cast dropped) · coaches/featured 5 (coach_ads typed, 0046 review-gate retry chain typed) · ai-usage 1 · wallet/topup 1
- Stage E money 22→0 (double-review law active): paypal/capture-order 6 (wallet_transactions/topup casts dropped, coach_adjust_wallet rpc typed, 3 catches → instanceof) · paypal/create-order 2 · paypal/webhook 2 (event: any → PayPalWebhookEvent structural view covering event_type/resource_type/resource.id/custom_id/supplementary_data.related_ids.order_id — only the fields the route reads) · refund.ts 6 (evo_chat_usage/plan_swaps/ai_jobs casts dropped; subscription_requests find callback typed, stale as-cast removed) · CheckoutView 6 (PayPal SDK global → typed PayPalWindow view with Buttons config contract; catches → instanceof; QR <img> kept with documented rationale — CoachWalletView precedent, the ONLY eslint-disable added in the phase)
- Stage F auth 9→0: auth-server 8 (both membership-tier resolution blocks: some/filter/sort callbacks de-annotated over typed subscriptions rows — 0045 legacy starter/elite mapping intact) · auth/callback 1 (instanceof pattern; file has 1-space indentation — matched exactly)
- DOUBLE REVIEW (sensitive-set law): full diff of money+auth hunks inspected line-by-line — casts dropped only over generated Rows/Functions (runtime calls byte-identical), catch pattern preserves exact message routing, webhook view is superset-compatible narrowing, tier-resolution semantics unchanged
- Gates: tsc 0 after EVERY stage ×6 · eslint 0 warnings/0 errors on ALL 33 touched files · vitest 191/191 at phase end · census 137 → 0 across 0 files
- Docs parity §3.6: QA_CHECKLIST Phase 95 section (Phase 94 demoted to Previous) + PROGRESS Phase 95 section + «آخر تحديث» + this entry

Stage Summary:
- FINAL MILESTONE: legacy-any census = 0. Running tally 804 → 795 → 749 → 589 → 385 → 244 → 137 → 0 across Phases 89-95 (batches 1-7)
- Every @typescript-eslint/no-explicit-any eliminated with REAL types — zero blanket suppressions; exactly 2 documented <img> exceptions remain (CoachWalletView + CheckoutView QRs)
- 2 real production-facing defects surfaced by the typing work: progress-reminder phantom column (FIXED this phase) + stale/missing generated types (blog_generation_queue Phase 94, coach_pages/coach_support_messages this phase)
- Cleanup era CLOSED. Next: development focus — Phase 89-SSE (EVO streaming + build-info + evo-chat-context getReader) is the first deferred dev item
- REMINDER to owner: revoke the GitHub token (ghp_SV…IvWO) once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 96
Agent: Super Z (main)
Task: Phase 96 — owner context «كنا شغالين على فحص ملفات تهجير لقواعد البيانات وخرجنا عن السياق» — full database-migrations audit + real drift closed (0063 + INDEX.md)

Work Log:
- Environment reset (4th time): repo re-cloned from GitHub at 967d0df (Phase 95 docs commit, live in production); worklog/QA history re-read before touching anything
- Migration census: 73 files in supabase/migrations. Apparent "missing" numbers resolved via git archaeology — 0051/0052/0053 = the three GitHub-sync probes (timestamped filenames), 0056 = 20260901120000_restore_rls_after_incident_and_drop_probe.sql (timestamped name, 315 lines intact). Numbering 0001→0062 COMPLETE; only 0025 never used
- Line-by-line review of the 6 newest migrations (0057-0062): all idempotent, RLS complete, SECURITY DEFINER with fixed search_path, exception guards, pgrst reload — clean
- Built scripts/migration_audit.py (committed to repo): paren-depth CREATE TABLE + multi-line ALTER parser vs types.ts generated Row blocks — 39 migration tables ↔ 40 types.ts tables
- All flagged mismatches triaged: multi-line ALTER artifacts (grep-verified), price_egp→price_usd renames 0012/0038 (types correct), audit_log absence benign (trigger-only, zero app reads), blog_posts.source boundary (0014 exists, prod lacks column, code guards with "source" in row — safe both ways)
- REAL DRIFT (4 objects live in production with NO migration file): plan_swaps (refund eligibility input — refund.ts/data/plans.ts/tier-limits.ts) · coach_presence (data/coach.ts online/offline) · progress_photos (data/progress.ts) · referrals.last_seen column. Phase-5-era ad-hoc tables, already suspected in AGENTS §6, never backfilled — a fresh rebuild from the repo would have crashed refunds/presence/photos
- CLOSED SAFELY: 20260902120000_0063_schema_drift_backfill.sql — IF NOT EXISTS only → guaranteed NO-OP on production; column definitions from types.ts mirror (generated FROM live DB, Relationships:[] proves no FKs → faithfully none added). DELIBERATE documented deviation: no blind RLS/policy writes on live tables (owner-forbidden behavior change risk)
- Companion VERIFY_SCHEMA_DRIFT.sql (READ-ONLY, 5 sections: columns · row counts · RLS+policies · constraints · 0063 no-op proof) for the owner to run once in SQL Editor → any future policy reconciliation happens FROM TRUTH. Raw GitHub link attached in final report per RAW-SQL-LINK RULE
- supabase/migrations/INDEX.md created: naming-family table (what auto-applies vs manual), full 0001→0063 map, ⚠️ on 0059 old-format manual anomaly (NOT renamed — Phase 61 ledger-incident lesson; 0060 idempotently covers it), known-boundaries section, audit log section
- AGENTS.md §6 MIGRATION INDEX LAW added: timestamped naming + same-commit INDEX.md row + types.ts regen + audit script before push + RENAMING EXISTING FILES FORBIDDEN
- Gates: tsc 0 · eslint 0 (zero src changes — git status proven) · vitest 191/191
- Docs parity §3.6: QA_CHECKLIST Phase 96 section + PROGRESS Phase 96 + «آخر تحديث» + this entry + INDEX.md + AGENTS §6

Stage Summary:
- The migrations-audit task (lost to context) is now COMPLETE with a real finding closed: production schema ↔ repo migrations gap of Phase-5 era sealed by 0063 (no-op on prod) + truth-verification script for the owner + permanent anti-confusion law
- Next development item remains Phase 89-SSE (EVO streaming + build-info + evo-chat-context getReader) — first deferred dev item
- REMINDER to owner: revoke the GitHub token (ghp_SV…IvWO) once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 97
Agent: Super Z (main)
Task: Phase 97 — owner directive: «Fix Vercel Free Tier Image Optimization Issue: add unoptimized: true inside the images object» — thousands of images would exhaust the free-tier optimization quota immediately

Work Log:
- Confirmed the risk surface: blog pipeline adds 3-5 photos × 6 articles/day × EN+AR plus tool/landing/admin imagery — every render used to hop through /_next/image against the Vercel free quota; once exhausted ALL site images throttle/fail
- Applied the fix exactly as directed: images.unoptimized: true in next.config.ts with a Phase 97-documented comment block (why, what carries the load now, one-line revert path)
- Impact measured: 20 files import next/image — markup stays valid (rendering-mode flag, not API change); priority still maps to fetchpriority=high so the Phase 94 LCP work (SiteHeader logo, EvoFloatingWidget) keeps its semantics
- Dependency sweep: grep for _next/image / custom loader= across src → only middleware.ts matcher EXCLUDES _next/image (those requests simply stop existing) — zero code changes needed
- Stale comment corrected per the anti-misleading-docs law: the remotePatterns block claimed next/image converts blog images to WebP at the edge — rewritten to state origin-CDN query params (?auto=compress&cs=tinysrgb&w=…) carry the weight under unoptimized; Supabase Storage serves originals; local assets tiny
- remotePatterns/formats/minimumCacheTTL kept untouched — inert under the flag; re-enabling paid optimization after a plan upgrade = one-line revert
- Gates: tsc 0 · eslint 0 (census still ZERO — only next.config.ts touched) · vitest 191/191
- Docs parity §3.6: QA_CHECKLIST Phase 97 section + PROGRESS Phase 97 + «آخر تحديث» + this entry

Stage Summary:
- Vercel free-tier image quota risk eliminated with a single documented flag; zero src changes; rollback path is one line
- REMINDER to owner: revoke the GitHub token (ghp_SV…IvWO) once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 98
Agent: Super Z (main)
Task: Phase 98 — owner question «هل فى طريقة اخرى لتحسين السرعه وضغط الصور خارج فيرسل؟» — image speed beyond Vercel: on-device upload compression (implemented) + option map

Work Log:
- Mapped the options with numbers: (1) on-device upload compression — free/permanent/no quota, implemented now; (2) Cloudinary free loader (25 credits/mo + global CDN, f_auto/q_auto) — the true external Vercel-style optimizer, needs owner free-account cloud name, wiring ready; (3) Supabase Storage Transformations — free quota ≈100/mo ≪ our thousands → ruled out
- Real heavy-image audit: the heaviest bytes are USER uploads (avatars, progress/questionnaire photos, coach photos — phone cameras 3-8MB stored forever in Supabase Storage and shipped whole on every render) + local logo.png 774K
- NEW src/lib/image-compress.ts: EXIF-honoring decode (createImageBitmap from-image + <img> fallback) → longest-edge cap → WebP with JPEG fallback (older Safari) → File. SAFETY CONTRACT: never throws — any failure or "not smaller" returns the ORIGINAL file; GIF/SVG/WebP/≤80KB passthrough
- Wired into all 4 client upload paths: progress-photos 1600/q0.82 · avatar 512/q0.85 BEFORE the 2MB gate · questionnaire photos 1600/q0.82 before the 5MB gate · coach photo/result 1600/q0.85
- Deliberate exclusions (money/legibility law): receipts untouched (pixel-identical payment proof), coach CERTIFICATES untouched (admin review legibility), /api/upload server route contract unchanged (compression happens before it client-side)
- One-time sharp recompression of local assets (same format/dims, zero reference changes): logo.png 774K→245K (−68%), hero/coaching-1 −34%, total −20% (3365K→2691K); QR files NEVER touched (scannable-QR law); script kept at scripts/compress_local_assets.js (local tooling, /scripts/* gitignored)
- Preconnects completed in layout head: images.pexels.com + cdn.pixabay.com (the blog's PRIMARY featured-image origins were missing)
- Import-path miss caught mid-phase: compressImageFile initially added to the ./helpers import (wrong module) — fixed to its own @/lib/image-compress import before gates ran
- Gates: tsc 0 · eslint 0 on all 6 touched files · vitest 191/191
- Docs parity §3.6: QA_CHECKLIST Phase 98 section + PROGRESS Phase 98 + «آخر تحديث» + this entry

Stage Summary:
- Image speed beyond Vercel delivered: uploads compressed on-device (permanent storage + bandwidth win), local assets −20%, blog image origins preconnected; Cloudinary upgrade path documented and ready pending owner's free-account cloud name
- REMINDER to owner: revoke the GitHub token (ghp_SV…IvWO) once all work is done — used transiently in git push commands only, never stored in files

---
Task ID: 99
Agent: Super Z (main)
Task: Phase 99 — PHASE 2 OPTIMIZATIONS (owner 3-task directive, deep analysis then «GO! 🚀»): Task 1 hot-path indexes (after proving foods/exercises libraries are in-code static files, NOT DB tables) · Task 2 strict progress_photos RLS · Task 3 optimistic UI

Work Log:
- Task 1 truth-check: enumerated ALL 39 distinct .from() tables + types.ts 40-table mirror + 73 migrations → ZERO food/exercise DB tables anywhere (foods.ts 8,830 = hand-curated core + USDA FoodData Central import c4b2022; exercises.ts 868 = free-exercise-db MIT import c92ff4c, images live from raw.githubusercontent.com — all verified 200 on production)
- BONUS bug found by direct measurement: /api/food-search external half DEAD — commit 00d6dfa ("remove source names") find-replaced world.openfoodfacts.org → nonexistent world.product-database.org (DNS HTTP 000); type OffProduct was the tell
- 0064 PART A: idx_progress_photos_user_taken(user_id,taken_on desc) + idx_plan_swaps_user_type_created(user_id,swap_type,created_at desc) + idx_coach_presence_user(user_id) — the three ad-hoc Phase-5-era tables had ZERO indexes despite per-request .eq(user_id) queries
- 0064 PART B: enable RLS + catalog-driven drop of unknown-name policies + 4 named policies (select_own/insert_own/delete_own/select_assigned_coach via coach_assignments) — DELETE required (deletePhoto live), UPDATE deliberately withheld (no code path); single transaction
- 0064 PART C: storage.objects policies add-only — owner own-folder prefix + coach SELECT on assigned clients (createSignedUrl needs object read); unknown existing storage policies untouched
- Domain fix: route.ts world.openfoodfacts.org restored + honest naming (comments/union "openfoodfacts") synced in meal-planner page.tsx + save-meal-plan comment; consumers only compare === "local" (compat verified)
- Optimistic UI (PlansView): applyOptimisticUsage decrements counter on click (display-only, server authority unchanged) · refreshUsage fire-and-forget reconcile + rollback on catch · pendingSwaps state mirrors localStorage queue (mount/add/remove sync) · persistent ⏳ badge + «قيد الاستبدال» button state + double-submit disabled guard on meal cards & exercise cards · EVO chat verified ALREADY optimistic (instant bubble + 429 reconcile + Phase 89 SSE) — documented only
- Gates: tsc 0 · eslint 0 on touched files · vitest 191/191 · scripts/migration_audit.py clean
- Docs parity §3.6: INDEX.md 0064 row + audit-log row + counts · QA_CHECKLIST Phase 99 · PROGRESS Phase 99 + «آخر تحديث» · this entry

Stage Summary:
- All three owner tasks delivered in one push: 0064 migration (auto-applies via integration), food-search domain fix, PlansView optimistic UX
- Owner follow-ups available: run VERIFY_SCHEMA_DRIFT.sql (read-only) to see the new RLS state on progress_photos; test meal-planner external product search
- REMINDER: revoke the GitHub token once all work is done — transient git-push use only

---
Task ID: 100
Agent: Super Z (main)
Task: [BACKFILL — الأصل ضاع في إعادة تجهيز مساحة العمل؛ مُستكمل من رسالة كوميت 2b78027 وسجل PROGRESS] Phase 100 — PLAN_SWAPS STRICT RLS (سجل التبديلات المضاد للعبث)

Work Log:
- تفعيل RLS على plan_swaps + حذف أي سياسات بأسماء مجهولة عبر pg_policies (سياسة متبقية متساهلة كانت هتكسر القفل)
- 3 سياسات مسماة: select_own + insert_own (auth.uid() = user_id) + select_assigned_coach عبر coach_assignments — صفر سياسات UPDATE/DELETE (سجل تاريخي) + revoke update,delete على مستوى الجدول لي فشل بصوت عالي
- إثبات التوافق قبل الـ SQL: مساري التنفيذ والاسترجاع service-role (يتجاوز RLS) والعرض الوحيد getSwapUsage بيفلتر user_id=self — صفر .update()/.delete() على الجدول في src كله
- توثيق: INDEX.md 0065 · QA_CHECKLIST · PROGRESS · worklog (المفقود) — بوابات: tsc 0 · eslint 0 ×396 · vitest 191/191

Stage Summary:
- سجل الاسترجاع بقى غير قابل للعبث من أي طرف — التزامًا بوعد نظام استرجاع الفلوس

---
Task ID: 101
Agent: Super Z (main)
Task: [BACKFILL — الأصل ضاع في إعادة تجهيز مساحة العمل؛ مُستكمل من رسالة كوميت 63cb788 وسجل PROGRESS] Phase 101 — ADMIN PANEL 2.0 (شل أدمن مستقل + أعضاء + مالية — تنفيذ «GO» بعد التدقيق المعماري)

Work Log:
- AdminShell جديد داخل /admin فقط: قائمة جانبية 7 أقسام/16 رابط بهوية داكنة pathname-active (#1d1d1f) + عدّادات حية (طلبات دفع معلقة/صفحات للمراجعة) + شريط شرائح للموبايل؛ AdminGate بيرندر الشل الجديد
- /admin/dashboard (6 KPIات + روابط سريعة؛ /admin يحوّل عليها) · /admin/members (جدول العضويات الناقص: شارات دورة حياة نشط/ينتهي قريباً 14 يوم/منتهي/بانتظار الدفع/بدون اشتراك عبر memberStatus موحدة + فلاتر وترقيم — بنفس RPC المُقسّم 0047 بلا أي سطح قاعدة بيانات جديد)
- /admin/finances بفصل قانون المصطلحات §10: أموال الموقع B2C (إيراد معتمد/استردادات/صافي + رسم 6 شهور) مقابل أموال المدربين B2B (محافظ = رصيد استخدام مش إيراد + شحنات + فاتورة شهرية متوقعة) — من نفس endpoints القراءة المحمية بلا endpoint جديد
- /admin/coaches هب جديد (تحويل من coach-system) + src/components/admin/ui.tsx لتوحيد PageHeader/StatTile/MemberStatusBadge/TierBadge/RequestStatusPill/SegmentedTabs/EmptyState/SectionCard
- استرجاع src/app/api/upload/route.ts اللي حذفه إعادة التجهيز من القرص (مش تغييرنا)
- توثيق: QA_CHECKLIST · PROGRESS · worklog (المفقود) — بوابات: tsc 0 · eslint 0 ×401 · vitest 191/191

Stage Summary:
- كل نقاط الخطة المعمارية الثلاثة منفذة: التوجيه المتداخل + فصل الحالات والمالية + إعادة استخدام المكونات — وصفر تغيير قاعدة بيانات

---
Task ID: 102
Agent: Super Z (main)
Task: Phase 102 — TEST ADMIN ACCOUNT DELETION (owner: «admin.test@musclehub-test.com ده حساب تجريبى امسحة») — full wipe with zero orphans

Work Log:
- Origin traced: account born in RUN_ON_SUPABASE_0050 (email + role=admin, re-promoted in 0055) — grep proves ZERO src references (docs + historical SQL only) → no code change needed
- Live-mirror FK audit (types.ts full Relationships parse, correct 6/8/10-space indents — first sloppy parse corrected): 9 user-keyed surfaces have NO live FK so cascade never reaches them: chat_messages.client_id · saved_results.user_id · meal_plans.user_id · plan_swaps.user_id · coach_presence.user_id · progress_photos.user_id · subscription_requests.user_id · tool_leads (email-keyed, 0060 lead sync) · coach_wallet_transactions.created_by (attribution → NULLed, not deleted — mirrors ON DELETE SET NULL without corrupting real wallet rows)
- RUN_ON_SUPABASE_0066_DELETE_TEST_ADMIN_ACCOUNT.sql written: idempotent DO block scoped to the exact email only; 3 steps = FK-less pre-delete (+ defensive evo_chat_usage/ticket_messages deletes) → profiles (fires all live cascades: subscriptions/notifications/coach_*/affiliate_*/refunds/external_plans/questionnaires) → auth.users (auth identities/sessions/tokens + storage.objects + ai_jobs set-null); final verification grid MUST show 3 zeros
- Manual-run by design (NOT a timestamped auto-migration): touches auth.users — all auth ops in this project are manual by precedent (0040/0050/0055); a failing auto-migration on integration-role auth privileges would block the whole migration pipeline (0054 lesson); INDEX.md registered as يدوي
- Gates: tsc 0 · eslint 0 ×402 files · vitest 191/191 · migration_audit no NEW drift (remaining flags = documented §3 boundaries); data-only → types.ts regen NOT needed per MIGRATION INDEX LAW (c)
- Docs parity §3.6: INDEX.md 0066 row + heading 0001→0066 + audit-count line · QA_CHECKLIST Phase 102 (Phase 101 → Previous) · PROGRESS Phase 102 + «آخر تحديث» · this entry + backfilled Task 100/101 (lost to workspace re-provisioning); AGENTS.md law text unchanged

Stage Summary:
- Deletion script delivered and registered — PENDING owner action: run 0066 in Supabase SQL Editor, expect the 3-zero grid, reply تم
- Historical QA rows referencing the account (Phase 80) intentionally preserved as history
- REMINDER: revoke the GitHub token (ghp_SV…IvWO) once all work is done — transient git-push use only, never stored in files

---
Task ID: 103
Date: 2026-09-03
Phase: 103 — ADMIN CLIENTS UNIFICATION (Admin Panel 2.0 correction round)
Owner directives: «go , + مفروض سكريبتات سوبابيز تتنفذ تلقائي» on the presented plan; plan-first law «راجع الطلبات الاول وادرس الامر ثم اعرضة قبل التنفيذ»; 5 complaints + 5 new details (site/B2B coach split, unified clients with type filters, B2B coaches show memberships, NEW B2C site-coach roster, verify all linked DBs)

Work Log:
- Plan-first audit delivered (read-only) → GO → one timestamped AUTO migration 20260903120000_0067_admin_clients_unification.sql (owner: scripts run automatically — zero manual SQL this phase, auth.users untouched)
- 0067: profiles.coach_kind ('site'|'b2b', default b2b) + site_coach_assignments (unique client_id 1↔1, CASCADE, assigned_by SET NULL, 2 indexes) + deterministic RLS (6 policies 0064/0065 pattern, authenticated writes revoked = loud failure) + get_admin_clients_paged (ALL roles — the role='client' hard-filter was why subscribing B2B coaches were invisible) + get_admin_clients_stats; 0047 RPCs untouched
- types.ts live mirror: coach_kind ×3 + site_coach_assignments (Row/Insert/Update + 3 Relationships) + 2 Functions + SiteCoachAssignment export; lib/data wrappers getAdminClientsPaged/Stats; Profile literals in auth.ts gain coach_kind
- APIs: /api/admin/site-assignments (GET roster / POST assign-upsert with role guards / DELETE) + /api/admin/coach-kind (PATCH, role='coach' guard, never touches role); danger tools reuse /api/admin/accounts PATCH+DELETE
- UI: /admin/clients unified page (type filter buttons + lifecycle tabs + test filter + search/sort/pagination + test-mark/delete/bulk-delete ported + rpcFailed empty state); /admin/members + /admin/accounts → redirects; /admin/coaches rebuilt (real roster: kind badge + counts + membership + wallet + one-tap kind toggle + tools below); /admin/site-assignments (coach picker → member search → assign + roster table); AdminShell (mobile chips strip → 2-col button grid by section; banner «واجهة المدرب ›» deleted; «أسطري» loses /coach link); dashboard QUICK + KPI hrefs → /admin/clients; /profile limits card hidden for admins; orphaned AdminAccountsView.tsx deleted (ported); AppLayout admin extra link → /admin/clients
- Docs parity §3.6: INDEX.md 0067 row + heading + audit line · QA_CHECKLIST Phase 103 · PROGRESS Phase 103 + آخر تحديث · this worklog
- Gates: tsc 0 · eslint 0 ×406 · vitest 191/191 · migration_audit no NEW drift (coach_kind joins the documented alter-column bucket)

Stage Summary:
- Phase 103 complete pending push: unified clients + coach-kind split + B2C roster + button grid + admin-profile fix + old-dashboard links removed; Phase 104 candidate (owner decision pending): extend coach RLS so site coaches can open assigned members' data in-app

---
Task ID: 102-run
Agent: Super Z (main)
Task: تصحيح 0066 v2 بعد أول تشغيل حي فاشل (42703 على coach_presence.user_id) — فحص المخطط الحي عمود-عمود وإصلاح سطر واحد

Work Log:
- أول تشغيل للمالك وقف: 42703 «column user_id does not exist» على delete from public.coach_presence — الـ DO block معاملة واحدة → إقفال تلقائي = صفر مسح جزئي (الحساب لسه حي — probe دخول HTTP 200 بعد الحادثة مباشرة)
- فحص حي PostgREST لكل عمود السكريبت بيمسّه (select=<col>&limit=1 → 200/42703): chat_messages.client_id ✅ saved_results.user_id ✅ meal_plans.user_id ✅ plan_swaps.user_id ✅ coach_presence.user_id ❌ progress_photos.user_id ✅ subscription_requests.user_id ✅ evo_chat_usage.user_id ✅ ticket_messages.sender_id ✅ tool_leads.email ✅ coach_wallet_transactions.created_by ✅
- أعمدة coach_presence الحقيقية في الإنتاج: id · coach_id · last_seen · updated_at (مفيش user_id ولا status) — مرآة types.ts كانت غلط في الجدول ده بس
- v2: تصحيح سطر واحد (coach_presence.coach_id = v_uid) + ملاحظة v2 في رأس الملف + INDEX.md صف 0066 اتحدث + QA_CHECKLIST Phase 102-run + PROGRESS Phase 102-run + آخر تحديث
- مكتشف جانبي مسجل مش منفذ: helpers الحضور في data/coach.ts بيسأل على user_id/status غير الموجودين حيًا → بيرجع offline بصمت (مرشح Phase 104)
- السكريبت فضل ذري/Idempotent/محصور بالبريد — عمليات auth فضلت يدوية بالسابقة (0040/0050/0055 + درس 0054)

Stage Summary:
- 0066 v2 جاهزة بنفس المسار/اللينك — كل عمود متحقق منه حيًا قبل إعادة الشحن
- الحالة: بانتظار تشغيل المالك تاني → جدول التحقق 3 أصفار → probe تأكيد نهائي

---
Task ID: 99-run
Agent: Super Z (main)
Task: فتح انسداد خط الترحيل (0064 v2) — «افحص ايه المشكلة وليه متعملش ميجريشن من جيتهب ل ٠٠٦٤ الى ٠٠٦٧ واصلح المشكلة»

Work Log:
- تأكيد حي لتقرير المالك (آخر ميجريشن مطبق 0063): profiles.coach_kind → 42703 مفقود · site_coach_assignments → PGRST205 جدول غير موجود · rpc get_admin_clients_paged → PGRST202 دالة غير موجودة = 0064/0065/0067 ما اطبقوش أبدًا
- الجذر: أول نشر لـ 0064 فشل 42703 على عمودين وهميين من مرآة types.ts (اللي طلعت غلط في الجدولين ad-hoc — 0063 كان no-op مقصود على الإنتاج): coach_presence.user_id (الحقيقي coach_id — أعمدة حية: id/coach_id/last_seen/updated_at) + progress_photos.taken_on (الحقيقي taken_at — أعمدة حية: id/user_id/photo_url/taken_at/created_at)
- فحص PostgREST عمود-عمود لكل مراجع 0064/0065/0067 قبل إعادة الدفع: plan_swaps.user_id/swap_type/created_at ✅ · coach_assignments.coach_id/client_id ✅ · subscriptions.client_id/tier/status/end_date/months/created_at ✅ · subscription_requests.status ✅ · profiles.id/email/full_name/phone/avatar_url/role/is_test_account ✅ · is_admin() → 200 true حيًا — 0065/0067 صفر تعديلات
- 0064 v2: فهرس progress_photos (user_id, taken_at desc) + فهرس coach_presence (coach_id) — سياسات RLS لم تُمس
- أثر الانسداد اتوثق: RLS بتاع 99/100 ما نزلش + Phase 103 (coach_kind/site_coach_assignments/RPCs) مش حية → صفحات /admin/clients و /admin/site-assignments وزر نوع المدرب كانت مكسورة في الإنتاج
- انجراف المرآة وكود التطبيق المبني عليه (progress.ts taken_on/file_path/note · coach.ts user_id/status → فشل صامت لقائمة الصور ومؤشر الحضور) مسجل كمرشحين Phase 104 — غير ملموس هنا
- توثيق §3.6: INDEX.md صف 0064 v2 + QA_CHECKLIST Phase 99-run + PROGRESS Phase 99-run + آخر تحديث + worklog

Stage Summary:
- إعادة الدفع تفتح الترحيل تلقائيًا (0064 v2 ← 0065 ← 0067) — تحقق حي بعدها: coach_kind/site_coach_assignments/RPC تظهر

---
Task ID: 99-run-verify
Agent: Super Z (main)
Task: تحقق ما بعد الدفع — فتح الترحيل + تأكيد مسح الحساب التجريبي

Work Log:
- بعد ~100 ثانية من الدفع: profiles.coach_kind → موجودة · site_coach_assignments → الجدول موجود (رفض anon بـ 42501 = سلوك revoke-all-from-anon المصمم، مش PGRST205) · rpc get_admin_clients_paged → موجودة وقابلة للاستدعاء (200) — نشر واحد طبق 0064 v2 ← 0065 ← 0067 بالترتيب
- قراءة صفحات /admin/site-assignments و API: المتصفح بيقرأ عبر /api/admin/site-assignments (service role) → غياب grant authenticated على الجدول الجديد مبيأثرش على حاجة اليوم (السياسات نائمة لحد Phase 104 مع grant مصاحب)
- لغز is_admin=false/[] المؤقت: الحساب التجريبي اتمسح في نفس النافذة — probe دخول جديد → 400 = auth.users row GONE = المالك شغّل 0066 v2 بنجاح والمعاملة الذرية مسحت كل حاجة
- توثيق: QA_CHECKLIST صفّي Owner action/0066 اتحدثوا + PROGRESS سطر تحقق ما بعد الدفع

Stage Summary:
- خط الترحيل فتح: 0064 v2 + 0065 + 0067 حية على الإنتاج (RLS بتاعت 99/100 نزلت فعليًا + مساحات Phase 103 اشتغلت)
- الحساب التجريبي admin.test@musclehub-test.com اتمسح نهائيًا (0066 v2 بنجاح)

---
Task ID: 103b
Agent: Super Z (main)
Task: تصحيح تصنيف أنواع العملاء (0068) — «فى خطاء ، جميع العملاء مكتوب عملاء b2b وده خطاء»

Work Log:
- الجذر مثبت: auto_assign_client_to_admin (0030A) بيسجل كل عميل تحت الإدارة في coach_assignments + backfill لكل الموجودين — و0067 عدّ أي سجل = عميل B2B (assigned_coach_id is not null) → كل الأعضاء «عملاء B2B» وزر أعضاء الموقع فاضي
- 0068 (تلقائي): إعادة بناء get_admin_clients_paged (نفس التوقيع + عمود assigned_coach_role) وget_admin_clients_stats مع _has_b2b_coach = ca.coach_id is not null and cp.role='coach' — member_site يشمل متابعة الإدارة، client_of_coach للمدرب الحقيقي فقط
- UI: typeOf يصنف على assigned_coach_role + خلية المدرب تعرض «متابعة الإدارة: الاسم» للأعضاء العاديين — types.ts مرآة محدثة
- coach_assignments لم تُمس (علاقة الفلوس) — صفحة المدربين غير متأثرة (فلاتر role-based) — 0047 RPCs لم تُمس
- توثيق §3.6: INDEX صف 0068 + سطر العدّاد · QA_CHECKLIST Phase 103b · PROGRESS Phase 103b + آخر تحديث · worklog

Stage Summary:
- التصنيف اتصلح من الجذر — المالك هيشوف أعضاء الموقع > 0 وعملاء B2B للمشتركين فعلاً بس بعد نشر 0068

---
Task ID: 104
Agent: Super Z (main)
Task: مزامنة الوثائق والوصف (docs-only) — «عايز اتاكد ان كل خصائص ومميزات المشروع مكتوبة فى وصف وهيكل المشروع بالظبط ، وصف الريبو مكتوب قديم محتاج يتعدل»

Work Log:
- تدقيق أرقام من الملفات مباشرة: 82 page.tsx (README قال 76) · 69 API route (قال 67) · 80 ملف SQL (قال 73 ولغاية 0062 — الحقيقي 0001→0068) · 31 views (قال 33) · 51 ui (قال 52) · 13 data modules ✓ · 5 workflows ✓
- README.md متزامن من الصفر لحد Phase 103b: مقدمة المنصة الكاملة، قسم «For Site Coaches (B2C)» جديد، Platform & Admin معاد كتابته على Admin Panel 2.0، Database Setup على عائلات التسمية الأربعة من INDEX.md + ملاحظة أن انجراف Phase 5 مقفول بـ 0063/0064/0065، أسعار سنوية متحققة من memberships.ts
- Known Issues: «back-fill pending» اتشال (محلول) والمرشح المفتوح اتوثق كـ Phase 105 (مرآة types.ts: coach_presence user_id/status · progress.ts taken_on/file_path/note)
- وصف الريبو على GitHub عبر API: PATCH /repos → HTTP 200 (من «Ahmed Zake Online Nutrition & Fitness Coaching Platform» للوصف الكامل للمنصة) + PUT topics → HTTP 200 (10 topics) — واتأكدت بالقراءة بعد التعديل
- metadata.json: شارة MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API اتشالت (Gemini المباشر متشال بأمر المالك 2026-08-27)
- DEVELOPER_GUIDE §8: 67 → 69 endpoints + صفين الجداد (coach-kind · site-assignments)
- بوابات docs: check-stale-refs.sh exit 0 · كل روابط README النسبية اتحققت على القرص · tsc/eslint/vitest لا تنطبق (صفر كود)

Stage Summary:
- كل الوصف الواجه للمستخدم (README + GitHub About + metadata + DEVELOPER_GUIDE) بقى مطابق للكود الفعلي عند Phase 103b — الفجوة 81→103b اتقفلت، ووصف الريبو القديم اتصلح نهائيًا

---
Task ID: 105
Agent: Super Z (main)
Task: إصلاح حقيقة المرآة (0069) — موافقة «go» على مرشح 99-run/104: types.ts + مسارات التطبيق + توفيق البيئات الجديدة

Work Log:
- types.ts: coach_presence = id·coach_id·last_seen·updated_at وprogress_photos = id·user_id·photo_url·taken_at·created_at (الشكل الحي المثبت عمود-عمود في 99-run) مع تعليقات نسبة الحادثة
- data/progress.ts: listPhotos ترتيب taken_at + موقعنة من photo_url · uploadPhoto يكتب {user_id, photo_url, taken_at} (بلا note — العمود غير موجود حيًا) · deletePhoto storagePath
- data/coach.ts: دالات الحضور معاد كتابتها على coach_id/last_seen — online = last_seen ≤ 2 دقائق، offline = حذف الصف (لا status حيًا) — دفاعي: select-then-update/insert لأن uniqueness الحية لـ coach_id غير مثبتة
- ProgressView: حقل ملاحظة الصورة اتشال (كان بيكتب في عمود وهمي — واجهة كاذبة) + العرض taken_at + الحذف photo_url
- 0069 تلقائي (20260903173000): ALTERات سطر واحد بالأعلى (إضافة ×4 + حذف ×5 — idempotent بالاتجاهين، no-op نقي على الإنتاج) + نسخ بيانات محكومة بـ information_schema قبل الحذف — حد موثق: البيئة النظيفة بتوقف عند 0064 قبل 0069 → bootstrap في عدة النسخة النظيفة (معروضة للمالك قبل التنفيذ)
- migration_audit.py: بيفهم alter drop column (تطور أداة Phase 96) — مقارنة كاملة بخط الأساس (git stash): الفرق الوحيد files scanned 80→81 — صفر انجراف جديد
- INDEX.md: صف 0069 + heading 0001→0069 + عداد + سجل تدقيق 105 · QA_CHECKLIST Phase 105 · PROGRESS Phase 105 + آخر تحديث · worklog ×2

Stage Summary:
- المرآة بقى بتعكس الحقيقة الحية — قائمة صور العضو شغالة حيًا لأول مرة (كانت مكسورة بصمت) — الحضور جاهز للتوصيل مستقبلًا — والبوابات كلها خضرا

---
Task ID: 105-post
Agent: Super Z (main)
Task: تحقق حي بعد دفع 0069 — إثبات no-op نقي على الإنتاج

Work Log:
- بروبس PostgREST قراءة فقط على الإنتاج (~2 دقيقة بعد الدفع، مفتاح anon مستخرج من الباندل المنشور): coach_presence coach_id 200 · updated_at 200 · user_id 42703 غائب · status 42703 غائب — progress_photos photo_url 200 · taken_at 200 · file_path 42703 · note 42703 → 8/8 مطابق

Stage Summary:
- مخطط الإنتاج مطابق بالظبط لمرآة types.ts المصححة و0069 ما لمسش حاجة — الدليل مسجل في QA_CHECKLIST صف Post-push

---
Task ID: 106
Agent: Super Z (main)
Task: Phase 106 — بوابة docs-parity الآلية (CI) — «عايز حل ثابت انها متحصلش تانى خصوصاً ان ملفات التوثيق دايما بتسبب مشاكل» + سؤال المالك عن البرانش قبل الجو («عرفنى فقط الافضل ونفذ مباشر»)

Work Log:
- إجابة سؤال البرانش بالصراحة: البرانش ما يغنيش عن الاستنساخ (الشغل محتاج ملفات على القرص — build/fحوصات/تعديل) والاستنساخ ثواني بـ shallow clone؛ البرانش = نفس الامكانيات 100% والفرق الوحيد النشر (main → production · برانش → preview)؛ الأفضل للمشروع: main مباشرة زي ما احنا + برانش مؤقت فقط للتغييرات الخطرة المحتاجة معاينة
- الحل المختار من الدراسة: GitHub Actions gate (يعيش جوه الريبو — مستقل عن الجلسات والمساحات المؤقتة — نفس نمط guard-stale-refs المجرب — وبونص: بيتنقل مع النسخة النظيفة القادمة تلقائيًا)
- scripts/docs_parity.py (جديد): يشتق كل رقم من الملفات (82 صفحة · 69 endpoint · 81 SQL · 31 views · 51 ui · أحدث NNNN) ويقارن كل ورقة في README/DEVELOPER_GUIDE/INDEX — line_scope يستثني السطور التاريخية الصحيحة — حذف جملة الادعاء = فشل
- scripts/migration_audit.py (ترقية): وضع --ci بـ exit 1 على انجراف جديد خارج baseline موثق (حدود INDEX §3 + النقاط العمياء: DO blocks · 0012 المتقسم) — الـ baseline مجموعات EXACT فأي عمود وهمي جديد على جدول مقبول بيتصطاد — RENAME COLUMN parsing — REPO_ROOT نسبي (كان مسار sandbox ثابت كان هكسر الـ runner)
- .github/workflows/docs-parity-gate.yml (جديد): push/PR/manual — يشغل البوابتين بصفر dependencies
- الصيد الأول حيًا: 7 ادعاءات README قديمة من Phase 105 (3× 80 SQL → 81 · 4× 0001→0068 → 0069) + «5 workflows» → 6 — كلها اتصلحت في نفس الفريم
- إثبات الاتجاهين: حقن brand_new_phantom في plans → exit 1 مع ::error:: دقيق → إرجاع → exit 0 وgit نظيف
- البوابات: tsc 0 · eslint 0 · vitest 191/191 · check-stale-refs 0 · docs_parity 0 · migration_audit --ci 0
- توثيق §3.6: QA_CHECKLIST Phase 106 · PROGRESS Phase 106 + آخر تحديث · INDEX.md ملاحظة البوابة · worklog ×2

Stage Summary:
- انجراف التوثيق بقى مستحيل بصمت: كل push بيتفحص على GitHub نفسه — الأرقام من الملفات لاير، والمرآة تحت مراقبة exit-code
- الملفات: scripts/docs_parity.py · scripts/migration_audit.py · .github/workflows/docs-parity-gate.yml · README · QA_CHECKLIST · PROGRESS · INDEX · worklog

---
Task ID: 107
Agent: Super Z (main)
Task: Phase 107 — منظومة معرفة المشروع (STATE.md + قانون المصدر الواحد + بوابة docs_audit + أرشفة PROGRESS/QA) — «go لتنفذيها» بعد اللخبطة اللي سبقت

Work Log:
- توضيح اللخبطة للمالك: الدراسة الشاملة (6 مكونات) ما كانتش منفذة — اللي اتنفذ باسم 106 كان بوابة docs-parity الأضيق، والـ go الجديد استُلم للمنظومة كاملة كـ Phase 107
- إثبات حساسية البوابة قبل أي تجريد: docs_audit.py اصطاد 19 ادعاء رقمي متغير في README/GUIDE (منهم «66 endpoint» مخفي في شجرة GUIDE) — ثم صفر بعد التجريد
- STATE.md جديد (47 سطر): المرحلة 107 + آخر كوميت متحقق 8b48ce7 + المفتوح (bootstrap + kit النسخة النظيفة) + بانتظار المالك (لا شيء) + الممنوعات (auth.users يدوي · OpenRouter+Groq فقط · ممنوع تعديل ميجريشنز مطبقة · ممنوع أرقام في README/GUIDE) + خريطة مصادر الحقيقة + بروتوكول الجلسة
- AGENTS.md: §3.6 المكرر (سطر 134 + 191) اتعالج — §3.6 بقت Session Protocol (STATE أولًا · آخر 3 worklog + 5 كوميتات بعد fetch · ممنوع الوثوق برقم · قانون البقاء: commit&push نفس الجلسة) · القديم اندمج في §3.8 Documentation Parity Law + قانون المصدر الواحد + قواعد docs:/الأرشفة · §4 اكتمل ببوكس STATE · §12.5 باستثناء STATE الموثق
- scripts/docs_audit.py (جديد): 7 عائلات فحص — A سلامة STATE (≤100 سطر + أقسام إلزامية) · B كوميت STATE سلف لـ HEAD (merge-base) · C تساوي المراحل STATE=PROGRESS=QA · D صفر أرقام متغيرة في README/GUIDE · E منع تكرار عناوين AGENTS · F ملفات حية نحيفة (سقف 6 أقسام/200 سطر) + مؤشرات الأرشيف + Latest واحد بالظبط · G STATE مربوط من README
- scripts/docs_parity.py: نطاقه تحدد بصدق على INDEX.md (البيت الموثق الوحيد للنطاق) بعد ما README/GUIDE بقوا بلا أرقام — والـ docstring يسجل التطور
- .github/workflows/docs-parity-gate.yml: docs_audit.py تالت step جنب docs_parity وmigration_audit — البوابة شغالة على GitHub نفسه مستقلة عن أي جلسة
- README: تجريد كامل (Database Setup · شجرة المشروع · Tech Stack · قائمة الوثائق) + STATE.md اتضاف للقائمة الأمامية
- DEVELOPER_GUIDE: §8 Total بقى «عمدًا غير مكتوب — الكود هو الحقيقة» · §4 الجداول اتكتبت من جديد (ادعاء «22 جدول» كان متقادم سنين + قسم الـ ad-hoc اتعلّم RESOLVED بـ 0063/0069 مع الإشارة لـ types.ts)
- أرشفة حرفية: PROGRESS 741→118 سطر (آخر 5 مراحل + مؤشرات) · QA 414→108 (Latest جديد + 4 Previous + البروتوكول) · كله اتضاف لـ archive/* بملحق مؤرخ ورؤوس الأرشيف اتعمت لطقس append-only
- البوابات: tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0

Stage Summary:
- المنظومة المعرفية بقت كود مش أمل: بوابة CI بتفشل عند أي رجوع للفوضى (أرقام في README · تضارب مراحل · تكرار عناوين · تضخم ملفات حية) — والحالة الرسمية STATE.md أول ملف يتقري في أي جلسة
- إصلاح صدق قديم كامن: ادعاء «22 جدول» و«3 جداول ad-hoc مش في ميجريشنز» في GUIDE كان غلط من زمن 0063 — اتصلح كتاريخ موسوم RESOLVED
- Commit SHA: a0b776a
- Push status: pushed (8b48ce7..a0b776a) — post-push fixup: this line recorded the real SHA

---
Task ID: 107-post
Agent: Super Z (main)
Task: Phase 107 post-push — first CI run of docs_audit FAILED (shallow checkout) → fixed

Work Log:
- CI على a0b776a: docs_parity ✅ لكن docs_audit ❌ — المحلي أخضر والفرق الوحيد: actions/checkout الافتراضي depth=1، فكوميت الحالة 8b48ce7 (الأب) مش موجود على الـ runner وفحص السلفية (git cat-file + merge-base) بيفشل كذب
- إعادة إنتاج محليًا باستنساخ --depth 1: نفس الفشل بالظبط (إثبات الجذر)
- الإصلاح المزدوج: fetch-depth: 0 في الـ workflow (تاريخ كامل — الريبو صغير) + رسالة تشخيص في docs_audit بتفرّق بين shallow والانجراف الحقيقي لو حصل تاني
- الدرس المسجل: أي فحص git-تاريخي في CI لازم يُختبر ضد استنساخ سطحي — اتسجل هنا كأثر دائم

Stage Summary:
- البوابة الثلاثية (docs_parity + docs_audit + migration_audit) على CI بقت متوقعة خضرا بتاريخ كامل — الإصلاح في نفس الفريم زي ما القانون يطالب

---
Task ID: 108
Agent: Super Z (main)
Task: Phase 108 — إبراز البوابات الآلية في وصف المشروع (owner: «ضيف وصف البوابة الآلية فى وصف المشروع اعتقد دى ميذة قوية لازم تتعرض ، كذلك لو فى اى امور قوية زيها اعرضها برده فى وصف المشروع»)

Work Log:
- تحقق حي قبل الشغل: main==origin/main==fbb27f4 · CI أخضر 3/3 بالـ API على fbb27f4 (Supabase Preview · guard · parity) · STATE.md 47 سطر وscripts/docs_audit.py موجودين (Phase 107 منجزة بالكامل)
- README: قسم 🛡️ Automated Quality Gates — Every Push Is Audited كامل (بعد قسم الرخصة قبل Quick Start): مقدمة (البوابات بتعيد اشتقاق الحقيقة من الكود نفسه وبتفشل بصوت عالي على رانرز GitHub — مستقلة عن أي جلسة أو جهاز محلي) + جدول البوابة/بتلقط إيه/الحادثة اللي خلدتها: migration_audit (انجراف المرآة · 42703) · docs_parity (وثائق متجمدة) · docs_audit (حقائق متكررة + §3.6 مكرر + حالة مش ممكن تشاور لقدام) · check-stale-refs + check-ui-wiring (edits vanish) · Supabase Preview (ميجريشن فاشل بيقف قبل الإنتاج) + فقرة البطارية القياسية (tsc/eslint/vitest/::error::) + «ليه ده مهم»: الوثائق مش ممكن تكذب · المرآة مش بتتنزاح · الكود المتقاعد مش بيرجع · البوابات بتسافر تلقائيًا مع أي clean-copy/rebrand لأنها جوه الريبو
- README ترويسة: سطر CI Gates جديد + Last updated → Phase 108 + جملة في الفقرة التعريفية بتشاور على القسم الجديد
- README Known Issues إصلاح صدق: «Types mirror drift (Phase 105 candidate)» اتشال من المفتوح (اتقفل فعليًا في 105: مرآة حية + 0069 + بروب إنتاج 8/8) واتنقل لقائمة المقفول؛ H5 اتأكد إنه لسة حي (blog-pipeline.ts:411) — فقلة fixed «Phases 7–103b» بقت 7–107
- GitHub About عبر API: PATCH /repos → HTTP 200 — الوصف بقى يقود بالانضباط الهندسي «Audited by automated CI quality gates on every push: schema-drift · registry-parity · knowledge-system · anti-regression» + PUT /topics: github-actions · quality-gates · ci-cd · typescript انضموا (إجمالي 14)
- قانون الأرقام: صفر عدادات متغيرة في المضاف — أسماء البوابات معرفات ملفات ثابتة مش عدادات (docs_audit D 0 hits على README المعدل)
- أرشفة (بوابة F): قسم Phase 99-run اتنقل حرفيًا (19 سطر) لـ archive/PROGRESS_ARCHIVE.md ملحق 2026-09-03 (Phase 108) — PROGRESS فضل 6 أقسام (108→103b) بـ110 سطر
- طقس §3.6: STATE → مرحلة 108 + كوميت متحقق fbb27f4 + docs_audit/check-ui-wiring انضموا لسطر البوابات · QA: Latest Phase 108 (7 صفوف أدلة) + 107 بقت Previous (6 أقسام verification بالظبط عند السقف) · PROGRESS قسم Phase 108 كامل
- البوابات محليًا قبل الدفع: tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0

Stage Summary:
- وصف المشروع بقى بيعرض القوة الهندسية مش المنتج بس: البوابات الخمس كلها موثقة بحوادثها الحقيقية في README وعلى About الريبو — إبراز مطلوب من المالك مباشرة
- Commit SHA: 44ec74c
- Push status: pushed (fbb27f4..44ec74c) — CI حي أخضر 3/3 (Supabase Preview · guard · parity) — post-push fixup: this line recorded the real SHA

---
Task ID: 109
Agent: Super Z (main)
Task: Phase 109 — خطة المحتوى العربي وSEO للصفحة الرئيسية (owner: خطة كاملة 2026-09-03 + «كل المحتوى العربي المطلوب إدخاله موجود كامل في قسم المحتوى المقترح فوق» + «تقدر تبعت الأوامر الأربعة بالترتيب من غير أي تعديل» — سجل go: رسالة الخطة نفسها)

Work Log:
- تحقق حي قبل الشغل: main==28377db · شجرة نظيفة (331 ملف كانت mode-bits noise من نظام ملفات الـ workspace → core.fileMode=false + استعادة upload/route.ts المحذوف محليًا) · الموقع حي 200
- كشف مفصلي: الأوامر 2 و3 (routing SSR + JSON-LD) منفذين مسبقًا في homepage AR mirror (2026-08-30) — فحص حي: /ar بيرجع 200 · lang="ar" dir="rtl" · نص عربي SSR في مصدر الصفحة · hreflang متبادل en/ar/x-default على النسختين · 5 سكريبتات ld+json على / و /ar · LanguageToggle MIRROR_ROUTES يتنقل للمرايا — توثيق تحقق، مش إعادة تنفيذ (نفس درس «الملخصات تتأخر عن الواقع»)
- الأمر 1 (تنفيذ فعلي): LandingView.tsx = سطح i18n الصفحة الفعلي (112 ternary + SECTIONS) — نسخ المالك الحرفي بالفصحى المصرية دخل: hero H1 «رحلتك الرياضية الكاملة.. في منصة واحدة» · المنظومة · EVO · الأدوات + الكروت الأربعة (حاسبة السعرات الحرارية/كتلة الجسم BMI/الماكروز/نسبة الدهون بأوصاف حرفية) · التمارين «تفوق 868» · البرامج «على مستواك وهدفك» · الأطعمة «8830 نوع طعام» · الكوتشينج «مش مجرد خطة PDF» · for-coaches «ابني بيزنسك على منصتنا» · الاشتراكات «تناسب كل مستوى» · الأفلييت «دخل حقيقي» · FAQ الخماسية الحرفية (فودافون كاش/إنستاباي/PayPal · الجمهور العربي مش بلد) — الإنجليزي byte-identical · [EVO] notation → EVO (نفس convention [SEO]/[Client-side] في الخطة)
- الأمر 1 تابع: ar/layout.tsx — Meta Title «Musclehubeg | منصة رياضية شاملة: تمارين وتغذية وكوتشينج اونلاين» + Description الجديدة على title/OG/Twitter
- الأمر 1 تابع: CTA رئيسية جديدة (قسم 11.5 بين الأفلييت والأسئلة) — «ابدأ رحلتك دلوقتي مجانًا.. مالكش عذر تأجل بعد اليوم» + زر «جرّب المنصة مجانًا» → /ar/memberships — ملتزمة باعتراض إزالة CTA القديمة 2026-08-30 (بدون تكرار وبدون دفع EVO)
- الأمر 4 (تنفيذ فعلي): alt الصورة الرئيسية → «منصة رياضية شاملة - تمارين وتغذية» · alt EVO → «EVO مساعد اللياقة الذكي» (نصوص المالك المقترحة حرفيًا — الكلمة المفتاحية الرئيسية جوه alt) — الإنجليزي لم يُمس
- الأمر 3 تبعًا: FAQPage JSON-LD بيتبني من نفس مصفوفة faqs فاتحدث تلقائيًا بنص المالك للغتين (مصدر واحد — بنية 107 اشتغلت زي ما هي مصممة)
- تخصيص عرض الحاويات للنصوص الأطول (max-w-md → max-w-2xl في EVO/الكوتشينج/الاشتراكات) — الإنجليزي محافظ على شكله
- طقس §3.6: STATE → مرحلة 109 + كوميت متحقق 28377db (post-push هيثبّت الـ SHA الجديد) · QA: Latest Phase 109 (8 صفوف أدلة) + 108 بقت Previous + 99-run اتنقلت حرفيًا للأرشيف (6 أقسام بالظبط) · PROGRESS: قسم 109 كامل + 103b اتنقلت حرفيًا للملحق (109→104) + سطر الملاحظة اتحدث · الفيديو الإعلاني المعلق اتسجل في STATE/بانتظار المالك
- البوابات محليًا قبل الدفع: tsc 0 · eslint 0 · vitest 191/191 · migration_audit --ci 0 · docs_parity 0 · docs_audit 0 (STATE=PROGRESS=QA=109) · check-stale-refs 0 · check-ui-wiring 0

Stage Summary:
- الصفحة الرئيسية العربية بقت بنسخ المالك الحرفي كاملة (عامية مصرية متسقة) + CTA مجانية جديدة + meta/alt محسّنة SEO — والإنتاج هيستلمها تلقائيًا عبر Vercel مع الدفع
- Commit SHA: PENDING_POST_PUSH
- Push status: PENDING
