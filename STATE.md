# STATE.md — الحالة الرسمية للمشروع (أول ملف يُفتح في أي جلسة)

> **قانون (AGENTS.md §3.6):** ده أول ملف أي وكيل يقرأه قبل أي شغل — وبيتحدث إلزاميًا في نفس الفريم اللي بيغيّر الحالة.
> الملف محدود بـ 100 سطر بوابةً (`scripts/docs_audit.py`) — اكتب مضغوط.
> **قانون التوحيد (Phase 115 — أمر المالك «الأمر الخامس»):** الملف ده هو **المصدر الرسمي والوحيد** لحالة المشروع الحية — `PROGRESS.md` و`QA_CHECKLIST.md` اندمجوا هنا واتجمدوا حرفيًا في `archive/` (التاريخ الكامل هناك + `worklog.md`).
> **آخر تحديث:** 2026-09-06 (المرحلة 124 — أصول المالك v2: خلفية هيرو معبد يوناني + لوجو هيدر مركزي + هوية EVO المحارب — كلها WebP مضغوطة)

## المرحلة الحالية

- **المرحلة:** 124 — مجموعة أصول المالك v2 (رفع 14 صورة 1664×928 بجذر الريبو — 7 light + 6 dark + favicon، استُخدمت light فقط بحكم «دارك مود مستقبلًا»؛ الأصل محفوظ download/alkemos-brand/v2/ خارج الريبو + تاريخ git، وحُذفت من جذر الريبو بعد المعالجة): (1) **الضغط/التحويل** WebP method=6: hero-bg-light 70KB · evo-card-light 134KB · evo-character 89KB شفاف · evo-widget-light 40KB شفاف · logo.png 1200×669 أبيض نقي (OG فقط — غير معروض بالصفحات) (2) **قصّ شفاف بفك مزج الخلفية**: C=α·S+(1−α)·BG على بكسلات الحافة + إزالة شوائب منفصلة — VLM على الخلفيات الفعلية: navbar 10/10 · widget 9/10 · character 10/10 على الأبيض (هالة على الرمادي → الشخصية تستخدم على الأبيض فقط والكامل المنظوري للرمادي) (3) **الهيدر**: لوجو في المنتصف مطلقًا (menu يسار + actions يمين + absolute center — RTL/LTR سليم) بلوجو navbar الجديد h-10 + icon-192 للموبايل (4) **الهيرو**: خلفية hero-bg-light opacity 0.22 + حجبات بيضاء متدرجة (نص داكن يبقى واضحًا) + عمود واحد مركزي + H1 = السلوجان الرسمي (EN: Forge Your Legendary Strength / AR: اصنع قوّتك الأسطورية) + شارة ALKEMOS فوقه — فقرة الكلمات المفتاحية كما هي (5) **EVO**: ودجت العامل + رأس صفحة evo → evo-widget-light (6 مراجع) · قسم EVO الرئيسي → evo-card-light 16:9 · هيرو /evo → evo-character المحارب (6) **الأيقونات** من Favicon.png: خوذة معدنية على بادج #f5f5f7 موحد (VLM 9/10)
- **البلاغ الموازي مُغلق:** إصلاح Supabase Auth نُفذ فعليًا عبر Management API (توكن المالك): site_url=alkemos.com + uri_allow_list بمسار alkemos.com/auth/callback صراحةً (القانون: PATCH يتطلب uri_allow_list كـ string مفصولة بفواصل — حقل redirect_urls يُرفض صامتًا — سبب «الارتداد» التاريخي) · GSC تم · PayPal تم · إعلانات ads.txt حية
- **آخر كوميت متحقق منه:** 403f38d (المرحلة 122 — لوجو المالك + السلوجان: CI أخضر [stale-refs ✓ + docs-parity ✓] + تحقق إنتاجي build-info=403f38d · logo.png حي 351KB شفاف · ملف المصدر المرفوع حُذف (raw=404) · فرع brand-preview حُذف) — دُفع fd7cfb1..403f38d main→main 2026-09-06 بتوكن GitHub قدّمه المالك (لم يُخزّن — يُنصح بتدويره)
- **البوابات الثمانية محليًا (تشغيل المرحلة 123):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS (بلا ميجريشن جديدة) · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓ (تشغيل هذه الجلسة)
- **الإنتاج:** alkemos.com حي · آخر ميجريشن مطبّق: 0070 (لا جديد بالمرحلة 122 — أصول+نص فقط) · AdSense ads.txt حي · **Cloudflare نشط من 2026-09-06 (Task 125):** Full Strict + بروكسي A/www + Smart Tiered Cache + HTTP/3 + Early Hints + Rocket Loader OFF — كاش ثابت HIT مُتحقق، API طازج، OAuth/PayPal سليمان، وتحذير «Invalid Configuration» بلوحة Vercel متوقع وطبيعي · إعدادات لم تُطبق لأذونات التوكن (سليمة افتراضيًا): Cache Rules و Bot Fight Mode=OFF افتراضيًا

## المفتوح الآن

- (اختبار تسجيل جوجل مرة واحدة بعد إصلاح site_url — تكوين Auth مُصلح عبر Management API بالفعل)

## بانتظار موافقة المالك

- (لا شيء)

## ممنوعات نشطة

- `auth.users`: ممنوع أي SQL تلقائي يمسّها — يدوي فقط (نمط 0040/0050/0055/0066)
- مزودو AI: **OpenRouter + Groq فقط** — Gemini اتشالت بقرار المالك 2026-08-27
- ممنوع تعديل ميجريشنز مطبَّقة — دايمًا ميجريشن جديدة بصيغة `YYYYMMDDHHMMSS_NNNN` (قانون INDEX.md §3)
- ممنوع أرقام متغيرة داخل README/DEVELOPER_GUIDE — مكانها الكود/INDEX.md (بوابة docs_audit تُفشل الدفع)
- ممنوع إحياء `PROGRESS.md`/`QA_CHECKLIST.md` في الجذر — اتجمدوا في archive/ بأمر Phase 115 (بوابة docs_audit F بتفشل الدفع)
- slug العمود لا يُمس أبدًا في أي إعادة تسمية (قانون ثبات الروابط — المرحلة 121)

## ملخص جودة المرحلة (QA — Phase 124)

- **الأصول v2 (كلها من تصميم المالك، صفر إعادة تصميم):** hero-bg-light.webp 1664×928/70KB · evo-card-light.webp/134KB · evo-character.webp 874×1000 شفاف/89KB · evo-widget-light.webp 522×522 شفاف/40KB · logo-header.png 447×144 شفاف/88KB · logo.png 1200×669/858KB (OG/crawlers فقط) · أيقونات من Favicon.png بادج #f5f5f7 (icon-512 86KB · icon-192 · favicon.ico 2KB · apple-touch معتمة) — الخلفيات المرفوعة ~1.5-2MB PNG خُفّضت إلى 40-134KB webp (خفض ~92%)
- **القصّ الشفاف:** flood-fill من الحواف (المكوّنات الداخلية الفاتحة تنجو) + فك مزج BG من بكسلات الحافة + إزالة شوائب — فحص VLM فوق أبيض/رمادي الموقع: كل القصّات ≥9/10 على خلفيات عرضها الفعلية
- **البوابات محليًا (المرحلة 124):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS (بلا ميجريشن) · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · next build ✓

## خريطة مصادر الحقيقة (ممنوع الوثوق برقم من غير مصدره)

| السؤال | المصدر الوحيد |
|---|---|
| شكل جداول/علاقات DB | `src/lib/supabase/types.ts` + التحقق الحي PostgREST |
| الأسعار والباقات | `src/lib/memberships.ts` |
| الميجريشنز والترقيم | `supabase/migrations/INDEX.md` |
| عدد الصفحات/الـ endpoints/views/components | الكود نفسه: `src/app/**` و`src/components/**` |
| الحالة الراهنة | الملف ده (STATE.md) — المصدر الوحيد من Phase 115 |
| ملخص QA الحالي | قسم «ملخص جودة المرحلة» فوق في الملف ده |
| التاريخ الكامل | `worklog.md` + `archive/` (ومنهم المجمّدان `archive/PROGRESS.md` و`archive/QA_CHECKLIST.md`) |
| قوانين التشغيل | `AGENTS.md` |

## بروتوكول فتح الجلسة (النص الإلزامي الكامل: AGENTS.md §3.6)

1. اقرأ `STATE.md` (30 ثانية — الحقيقة الرسمية الوحيدة)
2. `git fetch origin --quiet` → آخر 3 مدخلات `worklog.md` + آخر 5 كوميتات
3. ممنوع الوثوق بأي رقم في أي وثيقة — خد منها من خريطة المصادر أعلاه
4. قانون البقاء: مساحة العمل بتتمسح في أي لحظة → أي معرفة عايزها تعيش = **commit & push في نفس الجلسة**
