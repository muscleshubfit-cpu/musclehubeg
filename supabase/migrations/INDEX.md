# Migration Index — MuscleHub EG

> **قاعدة ملزمة:** كل تهجيرة جديدة تُضاف هنا في نفس الـ commit.
> الفحص المرجعي: `scripts/migration_audit.py` (Phase 96) يقارن
> كل الملفات بـ `src/lib/supabase/types.ts` — يشغَّل قبل أي تعديل هيكل.
> آخر تدقيق: **Phase 99 — 2026-09-02** (74 ملف → الآن 75 مع 0064).

## 1) عائلات التسمية — من بيِتطبق تلقائيًا ومن لا

| البادئة | أمثلة | يطبقه Supabase GitHub integration؟ |
|---|---|---|
| `0000_*.sql` (أرقام فقط) | `0001_init.sql` … `0005_blog_generation_queue.sql` | ✅ نعم (idempotent + مسجلة في الـ ledger) |
| `YYYYMMDDHHMMSS_*.sql` (تاريخية) | `20260902000000_0057_affiliate_foundation.sql` | ✅ نعم (هذا هو الشكل المعتمد للتهجيرات الجديدة) |
| `RUN_ON_SUPABASE_*` | `RUN_ON_SUPABASE_0035_COACH_WALLET.sql` | ❌ لا — تُطبق يدويًا عبر SQL Editor |
| `RUN_ON_SUPABASE_ORIGINAL_*` | `RUN_ON_SUPABASE_ORIGINAL_0015_affiliate_engine.sql` | ❌ لا — أصلية 0006-0023 أعيدت تسميتها بعد حادثة Phase 61 (إعادة تشغيل غير مقصودة من الـ integration) |
| `VERIFY_*.sql` | `VERIFY_SCHEMA_DRIFT.sql` | ❌ لا — سكريبتات قراءة فقط (read-only) يديرها المالك |

**قانون Phase 96:** أي تهجيرة جديدة = اسم تاريخي `YYYYMMDDHHMMSS_NNNN_<slug>.sql`
+ إدخال في هذا الفهرس + تحديث `types.ts` المولّد + تشغيل سكريبت التدقيق.
**ممنوع إعادة تسمية ملفات موجودة** — درس حادثة Phase 61 وإصلاح الـ ledger (0054).

## 2) خريطة الترقيم 0001 → 0064

| # | الملف | الموضوع | المسار |
|---|---|---|---|
| 0001 | `0001_init.sql` | profiles, plans, subscriptions… الأساس | integration |
| 0002 | `0002_blog_posts_and_is_coach_grant.sql` | blog_posts + is_coach | integration |
| 0003 | `0003_subscriptions_rls_fix_and_notifications.sql` | RLS اشتراكات + notifications | integration |
| 0004 | `0004_referral_commission_system.sql` | referrals + referral_earnings + referral_code | integration |
| 0005 | `0005_blog_generation_queue.sql` | blog_generation_queue | integration |
| 0006-0023 | `RUN_ON_SUPABASE_ORIGINAL_00xx_*.sql` | tool_leads, saved_results, meal_plans, subscription_requests, multi_subscriptions, price_usd, audit_log, extend_subscription, affiliate engine (لم يُطبق إطلاقًا — راجع 0057), paypal, RLS hardening… | يدوي |
| 0019-0023(بديل) | `RUN_ON_SUPABASE_0019_0020.sql`, `0021_0022.sql`, `0023.sql` | أزواج مدموجة طُبقت يدويًا | يدوي |
| 0024 | `RUN_ON_SUPABASE_0024.sql` | ai_jobs | يدوي |
| 0025 | — | لا يوجد (لم يُستخدم الرقم) | — |
| 0026-0028 | `RUN_ON_SUPABASE_0026_LANG_SPLIT.sql`, `0027_STORAGE_BUCKETS.sql`, `0028_EVO_ANON_USAGE.sql` | تقسيم اللغة، Buckets، evo_anon_usage | يدوي |
| 0029A/B/ALL | `RUN_ON_SUPABASE_0029*.sql` | دور الأدمن (النسخة الفعالة: 0029B) | يدوي |
| 0030A-D | `RUN_ON_SUPABASE_0030*_MULTI_COACH*.sql` | تعدد المدربين: schema/RLS/أدمن/إعادة تحميل RPC | يدوي |
| 0030 | `RUN_ON_SUPABASE_0030_MULTI_COACH.sql` | النسخة الشاملة الأصلية | يدوي |
| 0031-0035 | coach_pages, i18n, client attribution, coach activation, coach wallet | يدوي |
| 0036-0040 | harden signup, COACH_BOOST (+coach_support_messages), global USD, signup diagnostic/hotfix | يدوي |
| 0041-0045 | coach/client boundary, evidence gate, payments admin-only, SR policy sweep, coaching product fix | يدوي |
| 0046-0050 | coach page review, paged client list, RLS review, certificates, test admin account | يدوي |
| 0051-0053 | `2026083115/16/170000_github_sync_probe*.sql` | مجسات الربط التلقائي (جدول علامة gh_sync_probe) | integration |
| 0054 | `RUN_ON_SUPABASE_0054_REPAIR_MIGRATION_LEDGER.sql` | إصلاح ledger الـ integration («remote versions not found») | يدوي |
| 0055 | `RUN_ON_SUPABASE_0055_RESTORE_SECURITY_GUARDS.sql` | استرجاع أول دفعة حمايات بعد حادثة Phase 61 | يدوي |
| 0056 | `20260901120000_restore_rls_after_incident_and_drop_probe.sql` | استرجاع كامل الـ RLS (~33 سياسة) + حذف جدول المجس | integration |
| 0057 | `20260902000000_0057_affiliate_foundation.sql` | أساس الأفيليت: affiliate_transactions/commissions + تتبع الإحالة server-side + cancel_requested_at | integration |
| 0058 | `20260902010000_0058_admin_external_plans.sql` | external_plans (خطط يدوية للأدمن) | integration |
| 0059 | `RUN_ON_SUPABASE_0059_TOOL_LEADS_NAME_TYPE_NEWSLETTER.sql` | tool_leads: name/type + توسيع tool_slug | **يدوي** ⚠️ |
| 0060 | `20260902040000_0060_signup_leads_and_customer_sync.sql` | قاعدة العملاء: كل مسجل جديد → tool_leads + backfill | integration |
| 0061 | `20260902090000_0061_coach_referral_join_notification.sql` | جرس انضمام مدرب مُحال | integration |
| 0062 | `20260902110000_0062_refund_requests_and_earnings_hold.sql` | refund_requests + hold 7 أيام للأرباح | integration |
| 0063 | `20260902120000_0063_schema_drift_backfill.sql` | سد انجراف Phase 5: plan_swaps / coach_presence / progress_photos / referrals.last_seen | integration (no-op على الإنتاج) |
| 0064 | `20260902130000_0064_progress_photos_rls_and_hot_indexes.sql` | RLS صارم لـ progress_photos (4 سياسات جدول + سياساتي دلو التخزين) + فهارس المسارات الساخنة ×3 (progress_photos / plan_swaps / coach_presence) | integration |
| — | `VERIFY_SCHEMA_DRIFT.sql` | قراءة فقط: يطبع الأعمدة/RLS/السياسات الحقيقية للانجراف | SQL Editor (يدوي، اختياري) |

⚠️ **0059 بصيغة قديمة (تُطبق يدويًا)** بينما إخوته 0057/0058/0060-0062 تلقائية —
هذا **مقصود لا يُصلَّح بإعادة تسمية** (درس Phase 61): 0060 يغطي أعمدة 0059
idempotentًا، فلو لم تُطبق يدويًا لأي سبب فهي مغطاة. عند إعادة البناء من الصفر
يمكن تطبيق 0059 يدويًا أو الاعتماد على تغطية 0060.

## 3) حدود موثقة معروفة (ليست أخطاء)

- **`audit_log`** (ORIGINAL_0019): مكتوب من trigger `audit_row` server-side فقط؛
  لا يقرأه أي كود تطبيق — غيابه عن `types.ts` مقصود.
- **`blog_posts.source`** (ORIGINAL_0014): التهجيرة موجودة لكن الإنتاج بلا العمود؛
  الكود يتحقق بـ `"source" in row/payload` قبل اللمس — آمن في الحالتين.
- **`price_egp → price_usd`** (0012 لـ subscription_requests، 0038 لـ coach_ads):
  `types.ts` يحمل الاسم النهائي الصحيح؛ ذكر price_egp في ملفات قديمة طبيعي.
- **`gh_sync_probe`**: جدول مجس أُنشئ للمحاكمات الفنية وحُذف في 0056 —
  لا RLS عليه وهذا سليم لأنه غير موجود.
- **`RUN_ON_SUPABASE_0029_ADMIN_ROLE_ALL_IN_ONE.sql`**: النسخة الفعالة منه 0029B —
  يُحتفظ بالملف كمرجع تاريخي.

## 4) سجل التدقيق

| التاريخ | المرحلة | النتيجة |
|---|---|---|
| 2026-09-02 | 96 | تدقيق شامل (73 ملف): الترقيم كامل 0001→0062، آخر 6 تهجيرات مراجعة سطرًا بسطر، RLS كامل، 21 دالة مؤمنة بـ search_path ثابت. **انجراف حقيقي: 4 عناصر بلا تهجيرة** → سُدّت بـ 0063 + سكريبت تحقق + هذا الفهرس |
| 2026-09-02 | 99 | 0064: فهارس ×3 للجداول ad-hoc (كانت بلا فهارس) + فرض RLS صارم على progress_photos (حذف السياسات المجهولة + 4 سياسات مسماة + سياساتي التخزين add-only) — بتوجيه صريح من المالك بعد تحليل Phase-2 |
