# STATE.md — الحالة الرسمية للمشروع (أول ملف يُفتح في أي جلسة)

> **قانون (AGENTS.md §3.6):** ده أول ملف أي وكيل يقرأه قبل أي شغل — وبيتحدث إلزاميًا في نفس الفريم اللي بيغيّر الحالة.
> الملف محدود بـ 100 سطر بوابةً (`scripts/docs_audit.py`) — اكتب مضغوط.
> **قانون التوحيد (Phase 115 — أمر المالك «الأمر الخامس»):** الملف ده هو **المصدر الرسمي والوحيد** لحالة المشروع الحية — `PROGRESS.md` و`QA_CHECKLIST.md` اندمجوا هنا واتجمدوا حرفيًا في `archive/` (التاريخ الكامل هناك + `worklog.md`).
> **آخر تحديث:** 2026-09-07 (المرحلة 133 — تدقيق أمني عميق شامل + إصلاحات حرجة: ثغرة قراءة التخزين المجهولة (مثبتة عمليًا وأُغلقت) · إدراج الاشتراكات الذاتي · fail-closed على 24 مسار إداري · حدود رفع موزعة · إصلاحات SEO)

## المرحلة الحالية

- **المرحلة:** 133 — تدقيق أمني عميق (كود + إنتاج + Vercel/Supabase/Cloudflare) وإصلاحات منفذة: (1) **ثغرة حرجة مغلقة على الإنتاج قبل الكود:** سياستا التخزين التاريخيتان «Public can read photos»/«Authenticated can upload photos» كانتا تكشفان 7 دلوات خاصة (إيصالات/صور استبيانات/ملفات خطط) لأي زائر مجهول بمفتاح anon — أثبت التدقيق عمليًا (تعداد ملفات حقيقية) ثم نُفذ الإصلاح SQL مباشرة: حذف السياستين + سياسات ملكية questionnaire-photos (مسار الأفاتار) + subscriptions INSERT=is_admin() فقط (كان أي مستخدم يسجل لنفسه اشتراك pro نشط مجانًا) + progress-photos خاص + حدود 5/10MB وMIME لكل الدلول + توثيق coach_presence — مطابق في ميجريشن 0071 (2) **fail-closed (H1):** بوابة authRequired جديدة في auth-server.ts (المفتاح الخدمي موجود ⇒ المصادقة إلزامية حتى لو فُقدت متغيرات المصادقة العامة) مطبقة على 24 مسارًا إداريًا + إصلاح isCoach الفارغ بـ/api/file + إلزام مستخدم بـ/api/upload (3) **حدود الرفع (H2):** Rate-limit 30/10د لكل مستخدم + سقف 200 ملف + تحقق magic-bytes للنوع (4) **Rate-limit موزع (H3):** send-email/coach-register عبر Upstash (كان Map ذاكرية تت reset بالكولد ستارت) + clientIp() يأخذ آخر قفزة XFF (5) **M2-M7:** سقف result_json 10KB · timingSafeEqual لمسارات cron الثمانية (cron-auth.ts) · jsonLd() يحصّن 26 موقع حقن JSON-LD (6) **SEO:** hreflang المدونة معلق بالكامل (التحقق الحي: 27EN/32AR صفر أزواج) فأزيل من صفحات المقالات · ترميز affiliate en/ar+x-default · noindex لصفحات /coaches · lastmod الثابت حُذف من خرائط الأدوات · مدونة lastmod=greatest(published,updated) · logo.png 877KB→55KB بقص 1200×630 · preload الهيرو صار للرئيسية فقط · CSP-RO أضيف PayPal لscript-src
- **آخر كوميت متحقق منه:** 95a486e (المرحلة 132 — build-info=commitShort 95a486e حي · logo-footer-black.png حي 200 · فوتر الإنتاج متحقق VLM بالسمتين: لايت رخام فاتح+أسود / دارك رخام أسود+أبيض · شيتات download/alkemos-signoff/132/ تشمل LIVE-footer-{light,dark}) — دُفع a21f922..95a486e main→main 2026-09-06 · سابقه: d6a16b0 (المرحلة 129) (فوتر لايت/دارك ديسكتوب+موبايل + جدول EN + 10 صفحات محولة — لقطات VLM كلها PASS)
- **البوابات الثمانية محليًا (تشغيل المرحلة 132):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS (بلا ميجريشن) · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓
- **الإنتاج:** alkemos.com حي · آخر ميجريشن مطبّق: 0071 (المرحلة 133 — طُبّق يدويًا أولًا على الإنتاج 2026-09-07 ثم انعكس ملفًا — تحقق حي: تعداد التخزين المجهول يعيد [] فارغًا وأفاتار المستخدم الحقيقي ما زال 200) · AdSense ads.txt حي · **Cloudflare نشط:** Full Strict + بروكسي A/www + Smart Tiered Cache + HTTP/3 + Early Hints · **قانون الكاش:** /images/brand/* وsw.js بـ max-age=0 must-revalidate و/images/* عام 86400 وsw v4 network-first + تسجيل ?v=4 — **أصل جديد logo-footer-black.png** ياخد purge مسار /images/brand/ بعد الدفع (ترويسته must-revalidate فالكاش احتياطي فقط)

## المفتوح الآن

- (لا شيء — اختبار المالك للمتصفح العادي بعد هذا الإصلاح: أول تحميل بعد التفعيل قد يعمل reload تلقائي مرة واحدة عند تفعيل sw v4 — سلوك مقصود)

## بانتظار موافقة المالك

- (لا شيء)

## ممنوعات نشطة

- `auth.users`: ممنوع أي SQL تلقائي يمسّها — يدوي فقط (نمط 0040/0050/0055/0066)
- مزودو AI: **OpenRouter + Groq فقط** — Gemini اتشالت بقرار المالك 2026-08-27
- ممنوع تعديل ميجريشنز مطبَّقة — دايمًا ميجريشن جديدة بصيغة `YYYYMMDDHHMMSS_NNNN` (قانون INDEX.md §3)
- ممنوع أرقام متغيرة داخل README/DEVELOPER_GUIDE — مكانها الكود/INDEX.md (بوابة docs_audit تُفشل الدفع)
- ممنوع إحياء `PROGRESS.md`/`QA_CHECKLIST.md` في الجذر — اتجمدوا في archive/ بأمر Phase 115 (بوابة docs_audit F بتفشل الدفع)
- slug العمود لا يُمس أبدًا في أي إعادة تسمية (قانون ثبات الروابط — المرحلة 121)

## ملخص جودة المرحلة (QA — Phase 133)

- **إثبات إغلاق الثغرة (حي):** نفس مفتاح anon المستخرج من حزمة JS الحية: تعداد receipts/questionnaire-photos يعيد [] (كان يعرض أسماء ملفات حقيقية) · رفع مجهول 401/400 · أفاتار موجود 200 (بلا كسر) · رابط عام progress-photos محجوب
- **البوابات (المرحلة 133):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓ (كله محليًا قبل الدفع)
- **حجم التغيير:** 68+ ملفًا · ميجريشن 0071 · logo.png 877KB→55KB · بلا تغيير أعمدة DB (types.ts سليم)

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
