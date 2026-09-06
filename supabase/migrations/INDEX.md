# Migration Index — MuscleHub EG

> **قاعدة ملزمة:** كل تهجيرة جديدة تُضاف هنا في نفس الـ commit.
> الفحص المرجعي: `scripts/migration_audit.py` (Phase 96) يقارن
> كل الملفات بـ `src/lib/supabase/types.ts` — يشغَّل قبل أي تعديل هيكل.
> منذ Phase 106 يعمل تلقائيًا (--ci) داخل بوابة `docs-parity-gate.yml`
> مع كل push — أي انجراف جديد خارج الـ baseline الموثق في السكريبت يوقف البناء.
> آخر تدقيق: **Phase 100 — 2026-09-02** (76 ملف → الآن 77 مع 0065 — بعدّاد سكريبت التدقيق) · +1 يدوي مع 0066 (Phase 102، بيانات فقط) · +1 تلقائي مع 0067 (Phase 103) · +1 تلقائي مع 0068 (Phase 103b، تصحيح تصنيف أنواع العملاء) · +1 تلقائي مع 0069 (Phase 105، توفيق الجداول الليجاسي بالشكل الحي المثبت في 99-run) · +1 تلقائي مع 0070 (المرحلة 121، إعادة تسمية بيانات البراند → Alkemos — بيانات فقط بلا تغيير هيكلي) · +1 يدوي مع 0071 (المرحلة 133، تحصين أمني: سياسات التخزين + سياسة إدراج الاشتراكات + حدود الصناديق — مطبّقة يدويًا على الإنتاج 2026-09-07 ثم انعكست ميجريشنًا للمطابقة).

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

## 2) خريطة الترقيم 0001 → 0071

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
| 0064 | `20260902130000_0064_progress_photos_rls_and_hot_indexes.sql` | RLS صارم لـ progress_photos (4 سياسات جدول + سياساتي دلو التخزين) + فهارس المسارات الساخنة ×3 (progress_photos / plan_swaps / coach_presence) — **v2**: أول نشر فشل بـ 42703 على عمودين وهميين من المرآة (coach_presence.user_id + progress_photos.taken_on) **ووقف خط الترحيل كله عند 0063** — 0065/0067 ما اتحاولش تطبيقهم إطلاقًا (RLS بتاعت 99/100 ما نزلتش وصفحات Phase 103 فضلت مكسورة حيًا)؛ الفحص الحي عمود-عمود أثبت الأعمدة الحقيقية (coach_id / taken_at) واتصلحا، وكل مراجع 0064-0067 اتأكدت حية قبل إعادة الدفع | integration |
| 0065 | `20260902154500_0065_plan_swaps_strict_rls.sql` | RLS صارم لسجل التبديلات plan_swaps (سجل الاسترجاع المضاد للعبث — كان بدون RLS إطلاقًا): المستخدم يقرأ/يسجل تبديلاته هو بس + الكوتش يقرأ فقط تبديلات عملائه المسندين (عبر coach_assignments) + لا UPDATE ولا DELETE لأي أحد للأبد (سجل تاريخي — ومنع إضافي بإلغاء الصلاحيات على مستوى الجدول) | integration |
| 0066 | `RUN_ON_SUPABASE_0066_DELETE_TEST_ADMIN_ACCOUNT.sql` | مسح الحساب التجريبي للأدمن admin.test@musclehub-test.com بالكامل (عكس 0050): الخطوة 1 تمسح صفوفه من الجداول اللي اتحققت حيًا إنها بلا FK حي في الإنتاج (chat_messages / saved_results / meal_plans / plan_swaps / **coach_presence برعمود coach_id الحي** / progress_photos / subscription_requests + tool_leads بالإيميل) وتصفّر coach_wallet_transactions.created_by، الخطوة 2/3 تحذف profiles ثم auth.users فيشتغل الكاسكيد الحي والتخزين — بيانات فقط بدون أي تغيير مخطط — **v2**: أول تشغيل حي وقف بـ 42703 على coach_presence.user_id (مرآة types.ts كانت غلط في الجدول ده — الفحص الحي ثبت أن أعمدته id/coach_id/last_seen/updated_at)؛ الـ DO block رجّع كل حاجة = صفر مسح جزئي | يدوي ⚠️ |
| 0067 | `20260903120000_0067_admin_clients_unification.sql` | توحيد عملاء الأدمن (Phase 103): A- عمود profiles.coach_kind ('site'\|'b2b'، الافتراضي b2b) لتفرقة مدربي الموقع عن مدربي B2B بتوجيه المالك، B- جدول جديد site_coach_assignments (عضو↔مدرب موقع 1↔1 بـ unique client_id — منفصل عمداً عن coach_assignments اللي بيهتسب فواتير المحافظ والإحالات، CASCADE بالاتجاهين وSET NULL للمدقق)، C- RLS حتمي بنمط 0064/0065 (أدمن كامل + قراءة الكوتش لقائمته + قراءة العضو لصفه + سحب صلاحيات الكتابة من authenticated لفشل صاخب — الكتابة عبر API service-role)، D- RPC موحد get_admin_clients_paged (كل الأدوار مش role='client' بس — ده سبب اختفاء مدربي B2B المشتركين) + get_admin_clients_stats بفلاتر النوع/الحالة/التجريبي؛ RPCs الـ 0047 لم تُمس (صفر كسر لواجهة الكوتش) — بدون لمس auth.users | integration |
| 0068 | `20260903153000_0068_admin_client_type_fix.sql` | تصحيح تصنيف أنواع العملاء بعد تقرير المالك «جميع العملاء مكتوب عملاء b2b وده خطاء»: الجذر = ترigers 0030A بيسجل كل عميل تلقائيًا تحت الإدارة في coach_assignments («متابعة المدرب العام»)، و0067 عدّ أي سجل في الجدول = عميل B2B — فكل البتاعة طلعوا «عملاء مدربي B2B» وزر أعضاء الموقع بقال فاضي؛ الإصلاح: العميل يبقى «عميل B2B» فقط لو الإسناد لبروفايل دوره coach فعلاً (cp.role='coach')، والإسناد للإدارة = «متابعة الإدارة» تحت أعضاء الموقع + عمود assigned_coach_role جديد للعرض الصادق، نفس المعالجة في get_admin_clients_stats عشان عدادات الأزرار تتطابق — coach_assignments نفسها لم تُمس (علاقة الفلوس B2B زي ما هي) وصفحة المدربين غير متأثرة (فلاترها role-based) | integration |
| 0069 | `20260903173000_0069_legacy_tables_live_convergence.sql` | توفيق جداول Phase-5 الليجاسي بالشكل الحي المثبت عمود-عمود في 99-run (Phase 105): coach_presence = id · coach_id · last_seen · updated_at وprogress_photos = id · user_id · photo_url · taken_at · created_at — 0063 كانت أعلنتهم بأعمدة المرآة الوهمية (user_id/status · file_path/taken_on/note) اللي سببت 42703 في 0066 v1 ووقفخط الترحيل في 0064 v1 وكسرت قائمة الصور ومؤشر الحضور بصمت؛ على الإنتاج كل جملة no-op محمية (IF NOT EXISTS / IF EXISTS / تحديثات محكومة بـ information_schema)، وعلى البيئات الجديدة بتنقل البيانات من الأعمدة القديمة وتحذفها؛ RLS 0064/0065 لم تُمس (user_id موجود حيًا في progress_photos) — **حد موثق بصدق:** بيئة جديدة نظيفة بتصطدم بـ 0064 قبل ما توصل هنا (فهارسها على أعمدة حية لم تُنشأ بعد) — التثبيت النظيف محتاج خطوة bootstrap موثقة (دراسة الحل الجذري معروضة على المالك) | integration |
| 0070 | `20260906120000_0070_rebrand_alkemos.sql` | إعادة تسمية بيانات البراند Musclehubeg → Alkemos (المرحلة 121، أمر المالك 2026-09-06 «ابدأ التغيير»): تحديثات محكومة idempotent بلا تغيير هيكلي — A) blog_posts (56 مقالة): سلاسل استبدال مرتبة على title/excerpt/content/meta_title/meta_description/focus_keyword/cover_alt + faq_json/schema_json (::text→::jsonb) + keywords/tags عنصر-عنصر + author='Alkemos' وتغيير DEFAULT العمود من 'MuscleHub' (0013) إلى 'Alkemos'؛ B) مسح محكوم على notifications (title/body/link) وcoach_pages (headline/bio/specialties + _en + review_note) وexternal_plans وplans (title/notes/content jsonb)؛ روابط الدومين القديم musclehubeg.vercel.app → alkemos.com تُستبدل قبل السلسلة العامة؛ slug لا يُمس أبدًا (قانون ثبات الروابط) والإيميلات/muscleshubfit لا يمكن أن تتطابق مع أي regex (لا تحتوي musclehub) — بيانات فقط: types.ts وmigration_audit بلا تأثير | integration |
| 0071 | `20260907120000_0071_storage_rls_hardening.sql` | تحصين أمني شامل (المرحلة 133 — تدقيق عميق 2026-09-07): A) حذف سياستي التخزين التاريخيتين المتساهلتين («Public can read photos» و«Authenticated can upload photos») اللتين أثبت التدقيق عمليًا أنهما تكشفان 7 دلوات خاصة لأي زائر مجهول (تعداد إيصالات حقيقية بص مفتاح anon) B) سياسات ملكية لدلو questionnaire-photos (مسار الأفاتار من المتصفح) قبل الحذف C) إدراج subscriptions صار is_admin() فقط (كان أي مستخدم يسجل لنفسه tier='pro' نشط مجانًا عبر PostgREST — العميل أصلاً يستخدم subscription_requests) D) دلو progress-photos خاص (العرض كان ومازال Signed URL) + حدود 5MB/10MB وأنواع MIME لكل الدلول E) توثيق RLS coach_presence الحي (أنشئ يدويًا زمانًا ولم يوثق بميجريشن) — مطبّقة يدويًا على الإنتاج 2026-09-07 (تحقق حي: التعداد المجهول عاد [] فارغًا) — بلا تغيير أعمدة: types.ts سليم | يدوي (معكوسًا من الحالة الحية) |
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
| 2026-09-02 | 100 | 0065: RLS صارم لـ plan_swaps (كان RLS معطّل كليًا على سجل الاسترجاع المضاد للعبث!) — select/insert للمستخدم نفسه + قراءة الكوتش للمسندين فقط + منع UPDATE/DELETE للجميع بتوجيه صريح من المالك؛ إثبات التوافق قبل كتابة أي SQL: tier-limits وrefund استخدامهما service-role (يتجاوز RLS)، ومسار العرض الوحيد getSwapUsage يفلتر user_id=self دائمًا، وصفر استدعاءات update/delete في src |
| 2026-09-03 | 105 | 0069: توفيق coach_presence وprogress_photos بالشكل الحي المثبت في 99-run — إصلاح مرآة types.ts (كانت سبب 42703 في 0066 v1 ووقف 0064 v1) + إصلاح مسارات التطبيق الصامتة (listPhotos كانت بترتب بـ taken_on الوهمي وترفع بـ file_path/note → قائمة الصور كانت فاضية حيًا؛ دالات الحضور كانت بتسأل user_id/status → دايمًا offline) — سكريبت التدقيق اطور ليفهم drop column عشان الأعمدة المسقطة من 0069 ما تحسبش وهمية |
| 2026-09-06 | 121 | 0070: إعادة تسمية بيانات البراند → Alkemos — تحديثات محكومة فقط (بيانات لا هيكل) على blog_posts/notifications/coach_pages/external_plans/plans + DEFAULT author الجديد؛ سلاسل الاستبدال تعكس نفس ترتيب سلسلة إعادة التسمية في الكود بنفس الكوميت |
