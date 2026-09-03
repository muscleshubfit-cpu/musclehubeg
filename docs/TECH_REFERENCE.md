# TECH_REFERENCE.md — المرجع التقني التفصيلي

> **المنشأ (Provenance):** أُنشئ بأمر المالك المباشر 2026-09-03 (Phase 111 — «استخرج منه كل المعلومات التقنية التفصيلية التالية، وانقلها إلى ملف TECH_REFERENCE.md مع تنظيمها»).
> **مصادر النقل:** `AGENTS.md` (المرجع الأساسي للأقسام 1 و2 و4) + `src/components/ui/` (القسم 3 — لأن قانون مصادر الحقيقة في المشروع يقول صراحة: أسماء المكونات مصدرها الكود نفسه، و`AGENTS.md` لا يعدّد مكونات Shadcn).
> **قاعدة الاستخدام:** هذا ملف مرجعي تعليمي — ليس بديلًا عن القانون. `AGENTS.md` يبقى ملف القوانين الملزم، و`STATE.md` يبقى مدخل أي جلسة (§3.6)، والحقيقة العليا دائمًا هي الكود (§12.8).

---

## 1. قاعدة البيانات (Supabase) — كيف تعمل في هذا المشروع

### 1.1 البنية العامة

- قاعدة البيانات **Postgres مُدارة عبر Supabase** (`*.supabase.co`)، والوصول من التطبيق عبر PostgREST (supabase-js) بمفتاحين:
  - **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — وصول مقيد بسياسات RLS، للمتصفح.
  - **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) — يتجاوز RLS بالكامل، **سيرفر فقط** (API routes / GitHub Actions runners)، وممنوع commit أو ظهوره في العميل (§3.2).
- **مرآة الأنواع:** `src/lib/supabase/types.ts` هي المرآة اليدوية الموثوقة لشكل الجداول والدوال — أي تغيير schema إلزامه إعادة توليد هذه المرآة في نفس الكوميت (قانون فهرس الميجريشنز §6).
- **سجل الميجريشنز:** `supabase/migrations/INDEX.md` هو البيت الوحيد الموثق لنطاق الترقيم (0001 → أحدث NNNN) — كل ميجريشن جديدة تضيف صفها فيه في نفس الكوميت.
- **بوابة الانجراف:** `scripts/migration_audit.py` يفرّغ كل ملفات الميجريشنز ويقارن الشكل الناتج بمرآة types.ts + baseline مقبول موثق داخل السكربت — أي جدول/عمود فانتوم جديد = فشل الدفع (وضع `--ci`). السكربت يفهم `ALTER TABLE ... DROP COLUMN` (عمود متقاعد بشكل مشروع في ميجريشن أحدث).

### 1.2 قانون الميجريشنز (من AGENTS.md §6 — ملزم)

1. كل تغيير schema **يجب** أن يكون ملف ميجريشن مرقّمًا تحت `supabase/migrations/`.
2. التسمية الإلزامية: `YYYYMMDDHHMMSS_NNNN_<slug>.sql` — هذا هو **الشكل الوحيد** الذي تتعرف عليه أكمال Supabase GitHub وتطبقه تلقائيًا. **إعادة تسمية ملفات موجودة ممنوعة منعًا باتًا** (حادثة دفتر الحسابات في Phase 61)؛ الشذوذات القديمة الموثقة (0059 بالصيغة القديمة يدويًا، 0056 مؤرخة) تُترك كما هي.
3. الميجريشنز **يجب** أن تكون idempotent (`CREATE TABLE IF NOT EXISTS`، `ADD COLUMN IF NOT EXISTS`، ...) بحيث إعادة تشغيلها آمنة — الدرس المستفاد من الأعمدة التي كانت تُنشأ ad-hoc في الإنتاج (`meal_plans`، `plan_swaps`، `progress_photos`، `coach_presence`).
4. أي جدول جديد **يجب** أن يحمل سياسات RLS الخاصة به في نفس الميجريشن.
5. **قاعدة رابط الـSQL الخام (RAW-SQL-LINK — ملزمة لكل العملاء/المشاريع):** كل مهمة تلمس schema أو تنتج SQL ينفذه المالك يدويًا، تسليمها **غير صالح** ما لم تُرفق معها نسخة SQL جاهزة للتشغيل + رابطها الخام بالصيغة:
   `https://raw.githubusercontent.com/<org>/<repo>/<branch>/<path>`
   ليفتحها المالك ويلصقها مباشرة في Supabase SQL Editor بدون أي تنزيلات.
6. لكل دفعة ميجريشنز يُنشأ **بالإضافة** سكربت مجمّع واحد `supabase/migrations/RUN_ON_SUPABASE_<IDs>.sql` يحوي كل الخطوات + إغلاق `NOTIFY pgrst, 'reload schema';` + بلوك استعلامات VERIFY، على نمط ملفات `RUN_ON_SUPABASE_*` الموجودة — ويُرفق رابطه الخام أيضًا.
7. بعد تطبيق أي ميجريشن يدويًا، يشغّل المالك `NOTIFY pgrst, 'reload schema';` حتى يلتقط PostgREST التغيير.
8. **الوكيل لا يطبق ميجريشنز على الإنتاج أبدًا** — المالك هو من يشغّلها من Supabase SQL Editor (§3.3). وممنوع على الوكيل تشغيل `DELETE`/`UPDATE`/`TRUNCATE`/`DROP` على قاعدة الإنتاج من سياقه؛ القراءات (`SELECT count(*) FROM blog_posts` مثلاً) مسموحة عند الضرورة للتحقق فقط.
9. قبل الدفع: `python3 scripts/migration_audit.py` يجب أن يبلغ **صفر انجراف جديد**.

### 1.3 حماية الإنتاج ومسؤوليات الأدوار

- الإنتاج (Supabase production + Vercel + روابط حية) هو المرجع الحاسم لحالة التشغيل — قبل أي ادعاء «الميزة X حية» يجب تحقق فعلي من الرابط الحي (AGENTS.md §3.7).
- أولوية الحقيقة (§12.8): **الكود والإعدادات أولاً، ثم الميجريشنز، ثم أدلة QA، ثم الوثائق، ثم سياق المحادثة** — لو الوثيقة تعارض الكود، الكود هو اللي يكسب.

### 1.4 جداول ذات قواعد خاصة موثقة في AGENTS.md

| الجدول/المنظومة | القاعدة الخاصة |
|---|---|
| `ai_jobs` (طابور الذكاء الاصطناعي، ميجريشن 0024) | المتصفح يملك **SELECT على صفوفه فقط** — أي كتابة على الجدول **حصرية للـservice role**؛ الـpayloads تمر عبر `sanitizeJobPayload()` (قائمة بيضاء) عند الإدخال |
| `evo_chat_usage` (ميجريشن 0022) | دفتر استخدام EVO **مضاد للعبث** — المحاسبة سيرفر-سايد فقط، وممنوع عد الصفوف المكتوبة من العميل |
| `evo_anon_usage` (ميجريشن 0028) | تقييد الزوار المجهولين بـ**SALTED-SHA-256(client IP)** — بلا سياسات (service-role فقط)، ولا تخزين لـIP الخام |
| `coach_assignments` | `client_id UNIQUE` (عميل واحد ↔ مدرب واحد) — مصدر الحقيقة للإسناد؛ الإسناد للإدارة = «متابعة الإدارة» لا عميل B2B |
| `coach_wallets` / `coach_topup_requests` / `coach_fees` | RLS: الإدارة كل شيء / المدرب صفوفه فقط؛ العملة USD (ميجريشن 0038) |
| `coach_payments` | دفتر تسجيل أموال المدرب الخارجية — RLS: إدارة الكل / مدرب صفوفه / العميل يقرأ ما يخصه |
| `subscription_requests` | ميجريشن 0043 أسقطت **كل** سياسات RLS الخاصة بالمدربين عليها — (select/update/delete = `is_admin()` فقط)، والمراجعة إدارة-حصرية |
| `subscriptions` | تحصين 0041: المدرب يقرأ صفوف coaching فقط، وINSERT/UPDATE المباشر مسحوب (كان يسمح بتجاوز الخصم من المحفظة)؛ حارس `subscriptions_tier_model_guard` (0045) |
| `plans` | سياسة `plans_insert_coach` RLS (0041): توليد/إضافة خطة للعميل يشترط اشتراك coaching نشط + المتصل هو مدربه المُسنَد |
| `coach_pages` | صفحة عامة لكل مدرب (1:1، slug فريد `^[a-z0-9-]{3,40}$`، is_published) + أعمدة i18n الإنجليزية (0032) + إثراء عام (0037: photo_url، results_photos jsonb ≤6، سوشيال) |
| `coach_ads` (0037) + `coach_support_messages` (0037) | إعلانات ذات مدة ثابتة بخصم ذري من المحفظة (`coach_adjust_wallet`, kind 'adjust') + دعم المدربين للمنصة |
| `profiles` | `role` تعداد ثلاثي `client | coach | admin` (ميجريشن 0029) — سياسة SELECT ممتدة (0031): العميل يقرأ **فقط** صف مدربه المُسنَد عبر `coach_of(auth.uid()) = id` |
| `coach_emails` | القائمة البيضاء للترقية — إضافة مدرب = INSERT فيها؛ `auto_promote_coach_if_allowed()` تحمي الدور عند كل دخول، ولا تُنزل أدمن أبدًا |

### 1.5 التخزين (Storage) — من AGENTS.md §8 (UPLOAD LAW)

- الرفع يمر حصريًا عبر `POST /api/upload`: تحقق `requireUser` + قائمة سماح للباكتس (`questionnaire-photos` / `progress-photos` / `receipts`) + حراسة MIME و5MB + **إعادة بناء مسار التخزين سيرفر-سايد تحت user id الخاص بالمتصل** + كتابة service-role.
- القراءة عبر `GET /api/file?bucket&path` (بروكسي streaming بصلاحية owner-or-coach) — **الباكتس الخاصة تأخذ روابط same-origin دائمة**، وليست signed URLs منتهية.
- الباكتس تُنشأ بميجريشن `RUN_ON_SUPABASE_0027_STORAGE_BUCKETS.sql` (idempotent، **بدون سياسات** — service role يتجاوز RLS أصلاً).
- باكت عام `coach-public` (5MB، jpg/png/webp، مجلد `<uid>/` الخاص بكل مستخدم مفروض بـstorage RLS) — صور الصفحة العامة للمدربين؛ والـAPI تقبل فقط مسارات same-origin من `/storage/v1/object/public/coach-public/` أو روابط https.

---

## 2. سياسات الأمان (RLS) — شرح تفصيلي كما وردت في AGENTS.md

### 2.1 المبادئ العامة

1. **RLS هو خط الدفاع الأساسي** على مستوى قاعدة البيانات: كل جدول جديد يولد بسياساته في نفس الميجريشن (§6 بند 4).
2. **service role يتجاوز RLS** — لذا كل API route حساس يبدأ بحارس مصادقة/تصريح خاص به (`requireUser` / `requireCoach` / `requireAdmin`) قبل لمس القاعدة؛ الاعتماد على RLS وحده لا يكفي عند استخدام service role.
3. **المتصفح دائمًا anon + RLS مقيّد** — مثال الموثق: على `ai_jobs` يحمل المتصفح SELECT على صفوفه فقط، والكتابة كلها service-role.

### 2.2 دوال الـpredicates الأساسية (لبنات بناء السياسات)

| الدالة | التعريف الحالي | الاستخدام الصحيح |
|---|---|---|
| `is_coach()` | **أعيد تعريفها** (ميجريشن 0029) لتكون `role IN ('coach','admin')` — «الفريق» = مدرب ∪ أدمن | سياسات البيانات الإدارية/الفريقية؛ كل السياسات القديمة استمرت بالعمل بدون تعديل، والأدمن يرث وصول المدرب كاملًا |
| `is_admin()` | الدور admin | الجداول الإدارية-الحصرية (tool leads، blog، referrals admin، audit_log، coach_emails) مقفلة عليها حصريًا |
| `is_coach_over(client_id)` | **المسند الرسمي لبيانات العميل**: (الأدمن) أو (المدرب المُسنَد لهذا العميل من `coach_assignments`) | **ممنوع** استخدام `is_coach()` المجردة لبيانات العملاء — دائمًا `is_coach_over()` (قانون Multi-coach 0030) |
| `coach_of(auth.uid())` | يُعيد معرف مدرب العميل المُسنَد | سياسة قراءة profiles (0031): العميل يقرأ صف مدربه فقط |

> **قانون غير قابل للتفاوض:** لا تُعاد أبدًا كتابة السياسات إلى `= 'coach'` فقط — إعادة التعريف `role IN ('coach','admin')` هي أساس نمط الدور v2 كله.

### 2.3 نمط الأدوار v2 وأثره على RLS (AGENTS.md §8 ROLE MODEL v2 LAW)

- `profiles.role` = `client | coach | admin` (ميجريشن `RUN_ON_SUPABASE_0029_ADMIN_ROLE_ALL_IN_ONE.sql` بلصقة واحدة، أو 0029A + 0029B بالترتيب — لأن `ALTER TYPE` وأول استخدام له لا يستطيعان مشاركة transaction واحدة، فالسكربت المجمّع يفصلهما بـ`commit;` صريح).
- **ممنوع للعميل تغيير دوره:** سياسة 0017 تمنع تغيير الـrole من العميل؛ و`handle_new_user()` مُحصّنة (0036): metadata التسجيل لا يمكن أن تضبط دورًا — كل profiles تولد `client` والأدوار الفريقية تُمنح سيرفر-سايد فقط (service role يتجاوز سياسة 0017 عند الترقية المشروعة).
- الترقية: قائمة `coach_emails` البيضاء → `role='coach'` فقط (الترقية التلقائية لا تنزلق أدمن أبدًا)؛ إضافة أدمن = SQL يدوي فقط.
- **فصل الأسطح:** أسطح `/admin/*` تتطلب `role==='admin'` (AdminGate)؛ أسطح العميل (/dashboard /plans /progress ...) client-only والموظفون يُحوَّلون لـ/coach.

### 2.4 RLS في منظومة المال (فصل عالمَي المال)

- **كوتشينج الموقع (B2C):** مدفوعات الاشتراكات على الموقع تُراجع من الإدارة فقط — 0043 أسقطت سياسات المدربين على `subscription_requests` (إدارة-حصرية)، والإشعارات تذهب للإدارة لا للمدرب المُسنَد.
- **نظام المدربين (B2B):** الموقع لا يلمس أموال المدرب الخارجية — يسجلها فقط في `coach_payments` (RLS: إدارة الكل / مدرب صفوفه / العميل ما يخصه)، ويأخذ رسومه بخصم من محفظة المدرب؛ `coach_wallets` بقيود (balance >= 0) وRLS إدارة-الكل/مدرب-صفوفه.
- **الحد الفاصل:** المدرب يرى بيانات coaching-tier فقط لعملائه؛ اشتراكات الموقع (premium/pro) غير مرئية له — مفرض سيرفر-سايد **وعلى مستوى DB** (0041: `subscriptions` RLS — المدرب يقرأ صفوف coaching فقط + سحب INSERT/UPDATE المباشر).
- عمولة الأفلييت تُحجب عن أي عميل له صف في `coach_assignments` — الفحص عند نقطتي الاختناق فقط: `reviewSubscriptionRequest()` (الموافقة اليدوية) و`serverProcessAffiliateCommission()` في `/api/paypal/capture-order` (التلقائي).
- **حساب التواريخ:** لا إدخال يدوي لتاريخ البداية/الانتهاء — `extend_subscription` (رياضيات ميجريشن 0018): اشتراك نشط بنفس الطبقة → الأشهر تُكدَّس على `end_date` المتبقي؛ وإلا الآن → الآن+الأشهر.

### 2.5 تدفق إضافة مدرب (المسار الموثق)

1. مسار إداري: `POST /api/admin/staff` (requireAdmin) — بريد مسجل كعميل → ترقية فورية؛ بريد جديد → `auth.admin.inviteUserByEmail` (المدرب يضبط كلمة مروره من الإيميل ثم يُقلب دوره `coach` سيرفر-سايد)، وكلا المسارين يرفعان البريد إلى `coach_emails`.
2. مسار ذاتي: `POST /api/coach/register` **عام** (محدود 3/10د/IP + honeypot) — ينشئ مستخدم auth سيرفر-سايد (`email_confirm: true`)، والدور لا يُؤخذ من metadata العميل إطلاقًا؛ service role يرقّي إلى coach ويملأ القائمة البيضاء ثم يبذر محفظة 0 والإشعارات.
3. كل عميل جديد/قائم يُسند تلقائيًا للإدارة (المدرب العام) حتى يُعاد إسناده؛ إيميلات الفريق المسموحة لا تُسند كعملاء أبدًا.

---

## 3. مكونات الواجهة (Shadcn/ui) — الأسماء الكاملة

> **ملاحظة مصدر صريحة:** `AGENTS.md` لا يعدّد مكونات Shadcn (لا يذكر الاسم حتى) — والقانون في المشروع (خريطة مصادر الحقيقة، STATE.md) يقول: «عدد/أسماء الـcomponents → الكود نفسه `src/components/**`». لذلك هذه القائمة مستخرجة حرفيًا من `src/components/ui/` في الكود.

### 3.1 مكونات Shadcn/ui القياسية المثبتة

| الفئة | المكونات (اسم الملف بدون `.tsx`) |
|---|---|
| **عرض وبنية** | `accordion` · `alert` · `aspect-ratio` · `avatar` · `badge` · `breadcrumb` · `card` · `carousel` · `chart` · `collapsible` · `hover-card` · `pagination` · `progress` · `resizable` · `scroll-area` · `separator` · `skeleton` · `table` · `tabs` · `tooltip` |
| **أزرار وتحكم** | `button` · `toggle` · `toggle-group` |
| **نماذج وإدخال** | `checkbox` · `form` · `input` · `input-otp` · `label` · `radio-group` · `select` · `slider` · `switch` · `textarea` · `calendar` |
| **قوائم** | `command` · `context-menu` · `dropdown-menu` · `menubar` · `navigation-menu` |
| **نوافذ وطبقات عائمة** | `alert-dialog` · `dialog` · `drawer` · `popover` · `sheet` · `sidebar` |
| **إشعارات** | `sonner` · `toast` · `toaster` |

### 3.2 مكونات مضافة خاصة بالمشروع (ليست من مخزون Shadcn القياسي)

| المكون | الوظيفة |
|---|---|
| `copy-button` | زر نسخ بذاته (يستخدم في الكود والحالات القابلة للنسخ) |
| `image-with-fallback` | صورة مع سقوط آمن عند فشل التحميل |
| `3d-testimonials` | بطاقة آراء بتأثير ثلاثي الأبعاد |

> قاعدة التوسع: أي مكون جديد يدخل من مكتبة shadcn/ui القياسية أو يُكتب محليًا في `src/components/ui/` — ولا يُستورد نظام واجهة بديل بدون موافقة المالك (§3.4: ممنوع اختراع معمارية).

---

## 4. أكواد SQL والاستعلامات المعقدة المذكورة في AGENTS.md

> هذه **كل** المقاطع/الصيغ SQL التي يحملها `AGENTS.md` حرفيًا أو يوثق منطقها، مجمعة ومنظومة. التطبيق الفعلي الكامل في ملفات `supabase/migrations/` (وهي مصدر التنفيذ — هذا القسم مرجع فهم فقط).

### 4.1 تعريف دالة الفريق (نمط الدور v2 — ميجريشن 0029)

```sql
-- is_coach() أعيد تعريفها: «الفريق» = مدرب ∪ أدمن
-- كل سياسات RLS القائمة استمرت بالعمل بدون تعديل بعد هذا التغيير
role IN ('coach','admin')
```

### 4.2 المسند الرسمي لبيانات العميل (قانون Multi-coach — ميجريشن 0030)

```sql
-- is_coach_over(client_id) = الأدمن أو المدرب المُسنَد للعميل
-- أساس كل سياسات RLS الخاصة ببيانات العملاء — ممنوع is_coach() المجردة هنا
exists (
  select 1 from coach_assignments ca
  where ca.client_id = <client_id>
    and (is_admin() or ca.coach_id = auth.uid())
)
```

### 4.3 سياسة قراءة ملف المدرب المُسنَد (ميجريشن 0031)

```sql
-- profiles: العميل يقرأ صف مدربه فقط (امتداد سياسة SELECT)
coach_of(auth.uid()) = id
```

### 4.4 إعادة تحميل مخطط PostgREST (إلزامي بعد أي ميجريشن يدوية)

```sql
NOTIFY pgrst, 'reload schema';
```

### 4.5 فلتر الاشتراك النشط (المستخدم في كل حسابات الاشتراك والحدود)

```sql
-- getSubscriptionForClient + بوابات التفعيل + زر واتساب المدرب كلها
-- تقفل على نفس الشكل: نشط وغير منتهي
status = 'active' AND end_date > now()
```

### 4.6 رياضيات تمديد الاشتراك (ميجريشن 0018 — منطق extend_subscription)

```sql
-- اشتراك نشط بنفس الطبقة → الأشهر تُكدَّس على المتبقي؛ وإلا الآن → الآن+الأشهر
-- (ممنوع إدخال التواريخ يدويًا — الواجهة تعرض معاينة محسوبة فقط)
end_date = greatest(end_date, now()) + interval '<months> months'  -- حالة التكديس
end_date = now() + interval '<months> months'                      -- حالة البدء الجديد
```

### 4.7 بصمة IP المجهولة المملحة (ميجريشن 0028 — evo_anon_usage)

```text
SALTED-SHA-256(client IP)
-- بلا سياسات RLS (service-role فقط) — ولا يُخزن IP خام أبدًا
```

### 4.8 حارس طبقة الاشتراك مقابل الموديل (ميجريشن 0045)

```text
subscriptions_tier_model_guard
-- صفوف الاشتراك تُكتب دائمًا بطبقات الموديل القانونية عبر canonicalModelTier()
-- (starter → premium · elite → pro) في مساري التفعيل معًا
-- (PayPal capture-order بالـservice role + موافقة الإدارة اليدوية)
```

### 4.9 الترقية التلقائية المحمية للمدربين

```text
auto_promote_coach_if_allowed()
-- تحمي role='coach' عند كل تسجيل دخول لمن في قائمة coach_emails
-- ولا تنزلق أدمن أبدًا (never downgrade an admin)
```

### 4.10 حذف جماعي بالأشكال المثبتة (درس إنتاج 2026-08-28n)

```typescript
// الشكل المثبت الذي يعمل في الإنتاج (مثلاً مسح إشعارات الفشل):
const ids = [...];            // select ids أولًا
await supabase.from("ai_jobs").delete().in("id", ids);
// المتغير الذي مات في الإنتاج: .delete(null, { count: "exact" }) — خطأ غير-JSON
```

### 4.11 استعلامات التحقق المقروءة (مسموحة للوكيل من §3.3)

```sql
SELECT count(*) FROM blog_posts;  -- نمط القراءة الوحيد المسموح به للتحقق
```

### 4.12 أنماط ملفات الميجريشنز الإلزامية (أسماء وأشكال، وليست SQL تنفيذية)

```text
supabase/migrations/YYYYMMDDHHMMSS_NNNN_<slug>.sql     -- التسمية الوحيدة للتطبيق التلقائي
supabase/migrations/RUN_ON_SUPABASE_<IDs>.sql          -- السكربت المجمّع الجاهز للصق
supabase/migrations/VERIFY_SCHEMA_DRIFT.sql            -- فحص المالك للقراءة فقط
-- قواعد المحتوى: IF NOT EXISTS في المقدمة (idempotent) · سياسات RLS لكل جدول جديد
-- · NOTIFY pgrst, 'reload schema'; في الخاتمة · بلوك VERIFY
```

### 4.13 مخطط مسارات Multi-coach (ميجريشن 0030 — ترتيب اللصق)

```text
RUN AS THE 4-PART PASTE-FRIENDLY SPLIT, IN ORDER:
  0030A schema → 0030B client-RLS → 0030C admin-RLS+notifs → 0030D RPC+reload
RUN_ON_SUPABASE_0030_MULTI_COACH.sql = نسخة مرجعية مطابقة بايت-بايت (ليست للصق)
-- نمط عام: ALTER TYPE وأول استخدامه لا يتشاركان transaction واحدة → فصل بـcommit; صريح
```

---

> **تذكير قانوني ختامي:** هذا الملف مرجع تنظيمي منقول. عند أي تعارض بينه وبين الكود أو الميجريشنز أو `AGENTS.md`، يُعتمد الأعلى في هرم §12.8 (الكود أولًا)، ويُصحح هذا الملف في نفس الفريم وفق §3.8 (قانون تكافؤ التوثيق).
