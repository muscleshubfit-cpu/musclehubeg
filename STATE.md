# STATE.md — الحالة الرسمية للمشروع (أول ملف يُفتح في أي جلسة)

> **قانون (AGENTS.md §3.6):** ده أول ملف أي وكيل يقرأه قبل أي شغل — وبيتحدث إلزاميًا في نفس الفريم اللي بيغيّر الحالة.
> الملف محدود بـ 100 سطر بوابةً (`scripts/docs_audit.py`) — اكتب مضغوط.
> **قانون التوحيد (Phase 115 — أمر المالك «الأمر الخامس»):** الملف ده هو **المصدر الرسمي والوحيد** لحالة المشروع الحية — `PROGRESS.md` و`QA_CHECKLIST.md` اندمجوا هنا واتجمدوا حرفيًا في `archive/` (التاريخ الكامل هناك + `worklog.md`).
> **آخر تحديث:** 2026-09-06 (المرحلة 121 — إعادة التسمية الشاملة للبراند Musclehubeg → Alkemos في الكود والأصول والبيانات)

## المرحلة الحالية

- **المرحلة:** 121 — إعادة التسمية الشاملة Musclehubeg → Alkemos (أمر المالك 2026-09-06 «ابدأ التغيير» بعد إطلاق alkemos.com وإضافة AdSense): (1) الكود: 139 ملفًا حيًّا/487 سطرًا عبر سلسلة استبدال مرتبة حساسة لحالة الأحرف (المحميات الوظيفية: مسارات ريبو GitHub `muscleshubfit-cpu/musclehubeg` + `musclehubeg-backups` + `project_id` في config.toml + إيميلات muscleshubfit — كلها بلا تطابق ممكن) · التاريخ المجمّد (migrations/archive/worklog) لم يُمس (2) الأصول البصرية: لوجو/أيقونات/favicon جديدة بنفس لغة الهوية (أسود + فضي معدني + أزرق كهربائي #00AAFF) بمونوجرام A باربل بدل MH (cairosvg + 2x supersampling، VLM QA 8/10) (3) **ميجريشن 0070** تلقائية (بيانات فقط، idempotent، slug محمي): إعادة تسمية صفوف البراند في blog_posts (نصوص + keywords/tags + author وDEFAULT من 'MuscleHub' إلى 'Alkemos') + مسح محكوم على notifications/coach_pages/external_plans/plans + روابط musclehubeg.vercel.app→alkemos.com (4) LICENSE حُدث بالعلامة الجديدة مع إبقاء القديمة محمية كعلامات سابقة (5) AdSense: ads.txt حي ومطابق pub-8658364692422583 (تحقق سابق + بلاغ المالك)
- **بلاغ OAuth المالك (2026-09-06):** تسجيل الدخول بجوجل ينتهي على `wyopqryzfjifyeyvyxfy.supabase.co` — الكود سليم 100% (signInWithGoogle يستخدم window.location.origin · middleware PKCE/@supabase/ssr · /auth/callback حي 307) · NEXT_PUBLIC_SITE_URL=https://alkemos.com في Vercel — **الجذر = تكوين Supabase Auth نفسه (site_url ارتدّ مجددًا بعد نشر a4e0af6 — نمط تكرار موثق منذ المرحلة 119)** — الإصلاح: Supabase Dashboard → Authentication → URL Configuration: Site URL=https://alkemos.com + Redirect URLs تشمل alkemos.com/** — توكن Management API غير متوفر بالجلسة (نُفذ بالإصلاح اليدوي أو بمعتمد جديد)
- **آخر كوميت متحقق منه:** a4e0af6 (المرحلة 119b — إصلاح دردشة dir=auto: منشور ومتحقق حيًا) — كوميت المرحلة 121 (إعادة التسمية) جاهز محليًا وبانتظار الدفع؛ يُقدّم هذا السطر في كوميت ما بعد الدفع كنمط 105-120
- **البوابات الثمانية محليًا (تشغيل المرحلة 121):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS (0070 بلا انجراف جديد — بيانات فقط) · docs_parity 0 (newest NNNN=0070 مسجل) · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓ (تشغيل هذه الجلسة)
- **الإنتاج:** alkemos.com حي · آخر ميجريشن مطبّق: 0070 بعد الدفع (بيانات فقط) · AdSense ads.txt حي ومطابق

## المفتوح الآن

- رصد Supabase site_url بعد إصلاح المالك (نمط الارتداد موثق — لو ارتد مرة أخرى بعد نشر: Dashboard → Auth → URL Configuration)
- (اختبار تسجيل جوجل مرة واحدة بعد إصلاح site_url — التعليمات مسلمة للمالك)

## بانتظار موافقة المالك

- (لا شيء)

## ممنوعات نشطة

- `auth.users`: ممنوع أي SQL تلقائي يمسّها — يدوي فقط (نمط 0040/0050/0055/0066)
- مزودو AI: **OpenRouter + Groq فقط** — Gemini اتشالت بقرار المالك 2026-08-27
- ممنوع تعديل ميجريشنز مطبَّقة — دايمًا ميجريشن جديدة بصيغة `YYYYMMDDHHMMSS_NNNN` (قانون INDEX.md §3)
- ممنوع أرقام متغيرة داخل README/DEVELOPER_GUIDE — مكانها الكود/INDEX.md (بوابة docs_audit تُفشل الدفع)
- ممنوع إحياء `PROGRESS.md`/`QA_CHECKLIST.md` في الجذر — اتجمدوا في archive/ بأمر Phase 115 (بوابة docs_audit F بتفشل الدفع)
- slug العمود لا يُمس أبدًا في أي إعادة تسمية (قانون ثبات الروابط — المرحلة 121)

## ملخص جودة المرحلة (QA — Phase 121)

- **نطاق الاستبدال (قبل):** 764 سطر مرجع براند في الريبو؛ البعد: صفر مراجع في الملفات الحية خارج المحميات الوظيفية (تحقق rg بعد السكريبت) — سلسلة الاستبدال: MuscleHubFit→MuscleHubEG→MusclehubEG→Musclehubeg→MUSCLEHUBEG→مسافات EG→lowercase→MuscleHub→Musclehub→MUSCLEHUB→musclehub (الأطول أولًا دائمًا)
- **الأصول:** نفس نظام الألوان/التاجلاين «TRAIN. FUEL. TRANSFORM.» — logo.png 1536×1024 (81KB مقابل 245KB قديم) · icon-512/192 · apple-touch 180 · favicon.png 64 + ico 16 · logo.svg (شارة متحركة)
- **الميجريشن 0070:** بيانات فقط (types.ts لم يتغير — migration_audit بلا تأثير) · محكومة بـ ILIKE guards (إعادة تشغيل = صفر صفوف) · jsonb عبر ::text سلسلة ثم ::jsonb · regex PostgreSQL يعكس سلسلة الكود بنفس الترتيب
- **البوابات محليًا (المرحلة 121):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · CHANGELOG.md باقٍ فارغًا بأمر Phase 111

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
