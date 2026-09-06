# STATE.md — الحالة الرسمية للمشروع (أول ملف يُفتح في أي جلسة)

> **قانون (AGENTS.md §3.6):** ده أول ملف أي وكيل يقرأه قبل أي شغل — وبيتحدث إلزاميًا في نفس الفريم اللي بيغيّر الحالة.
> الملف محدود بـ 100 سطر بوابةً (`scripts/docs_audit.py`) — اكتب مضغوط.
> **قانون التوحيد (Phase 115 — أمر المالك «الأمر الخامس»):** الملف ده هو **المصدر الرسمي والوحيد** لحالة المشروع الحية — `PROGRESS.md` و`QA_CHECKLIST.md` اندمجوا هنا واتجمدوا حرفيًا في `archive/` (التاريخ الكامل هناك + `worklog.md`).
> **آخر تحديث:** 2026-09-07 (المرحلة 135 — سرعة ما بعد كلاودفلير: تشخيص شامل CF+Vercel+متصفح حي · تفعيل 0-RTT · تحميل مسبق للهيرو مقيد بـ prefers-color-scheme · إضافة logo-hero-dark للداكن · إثبات أن Rate Limit لا يمس التصفح: 8 طلبات API فقط لكل تحميل)

## المرحلة الحالية
- **المرحلة:** 135 — سرعة بعد بلاغ المالك «السرعة أصبحت سيئة بعد ربط كلاودفلير»: (1) **تشخيص حي شامل:** TTFB عبر CF 28-63ms مقابل 310-1100ms مباشرة لـ Vercel (روابط CF الدافئة أسرع من اتصال بارد) · HTTP/3 + Brotli + HIT للأصول الثابتة حي · زيارة أولى 1.3MB/67 ملفًا هي الوزن الحقيقي · زيارة متكررة 17KB فقط (56/72 من الكاش) · HTML دائمًا DYNAMIC (يُبث ~0.5s — تخطيط جذري ديناميكي، ليس CF) (2) **CF:** تفعيل 0-RTT (PATCH API) + التحقق من Smart Tiered Cache=on · Rate Limit مُثبت بريئًا من البطء (8 طلبات /api/* لكل تحميل رئيسية مقابل حد 50/10ث) (3) **الكود:** preloads الهيرو مقيدة بـ media=prefers-color-scheme — لايت يوفر 68KB (hero-dark) · دارك يوفر 38KB + يكسب preload logo-hero-dark 87KB (كان LCP بلا preload) · تجاوز السمة اليدوي يرجع لسلوك ما قبل التغيير تمامًا (4) **قرار مالك محفوظ:** /images/brand/* must-revalidate (المرحلة 128 «تحديث فوري») لم يُمس — التحويل لـ max-age=3600 مطروح بقرار المالك
- **آخر كوميت متحقق منه:** 570d09f (سابقه المُتحقق — المرحلة 134؛ SHA المرحلة 135 يُوثَّق في كوميت post-push بعد الدفع)
- **البوابات محليًا (المرحلة 135):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓ (1899 صفحة) (بلا ميجريشن — لا تغيير DB)
- **الإنتاج:** alkemos.com حي · آخر ميجريشن مطبّق: 0071 · Auth حي: password_min_length=8 · **DNS مقفل (تحقق DoH حي):** SPF -all · DMARC reject صارم · DKIM فارغ · MX null · AdSense ads.txt حي · **Cloudflare نشط:** Full Strict + بروكسي A/www + Smart Tiered Cache + HTTP/3 + Early Hints + 0-RTT (135) + Rate Limit /api/* 50/10ث لكل IP بحجب 10ث ورد 429 · **قانون الكاش:** /images/brand/* وsw.js بـ max-age=0 must-revalidate و/images/* عام 86400 وsw v4 network-first + تسجيل ?v=4

## المفتوح الآن

- **يدوي (المالك) — إلزامي:** تدوير مفاتيح المنصات الأربعة المشتركة بالدردشة (GitHub PAT · Vercel · Supabase · Cloudflare)
- **يدوي اختياري (سرعة):** تفعيل Speed Brain من لوحة CF (alkemos.com → Speed → Optimization → Speed Brain) — الرمز مرفوض من prefetched_preload (1015)
- **قرار مالك معلق (سرعة مقابل فورية البراند):** تحويل /images/brand/* من must-revalidate إلى max-age=3600 يوفر ~15 طلب إعادة تحقق لكل زيارة متكررة لكن تحديثات البراند تحتاج ساعة/بـ purge — لم يُنفذ بلا موافقة
- **لاحق:** فرض CSP الكاملة بعد مراجعة تقارير RO: Vercel Dashboard → Deployments → Functions Logs → فلتر csp-report — لو صفر تقارير لأسبوع انقل قيمة RO للترويسة المفروضة وأضف paypal + google-analytics لـ connect-src
- (أول تحميل بعد التفعيل قد يعمل reload تلقائي مرة عند تفعيل sw v4 — سلوك مقصود)

## بانتظار موافقة المالك

- تحويل /images/brand/* من must-revalidate إلى max-age=3600 (سرعة أعلى للزيارات المتكررة مقابل تأخير تحديثات البراند حتى ساعة — قابل للعكس مع purge)

## ممنوعات نشطة

- `auth.users`: ممنوع أي SQL تلقائي يمسّها — يدوي فقط (نمط 0040/0050/0055/0066)
- مزودو AI: **OpenRouter + Groq فقط** — Gemini اتشالت بقرار المالك 2026-08-27
- ممنوع تعديل ميجريشنز مطبَّقة — دايمًا ميجريشن جديدة بصيغة `YYYYMMDDHHMMSS_NNNN` (قانون INDEX.md §3)
- ممنوع أرقام متغيرة داخل README/DEVELOPER_GUIDE — مكانها الكود/INDEX.md (بوابة docs_audit تُفشل الدفع)
- ممنوع إحياء `PROGRESS.md`/`QA_CHECKLIST.md` في الجذر — اتجمدوا في archive/ بأمر Phase 115 (بوابة docs_audit F بتفشل الدفع)
- slug العمود لا يُمس أبدًا في أي إعادة تسمية (قانون ثبات الروابط — المرحلة 121)

## ملخص جودة المرحلة (QA — Phase 135)

- **تشخيص السرعة (متصفح حي agent-browser):** زيارة أولى نظيفة: TTFB 63ms (HTTP/3) · DCL 1039ms · Load 1613ms · 67 ملفًا/1.3MB · متكررة: 17KB و56/72 من الكاش · /api/* فقط 8 طلبات (حد RL 50) · curl عبر CF 28-34ms مقابل 310ms+ مباشرة
- **0-RTT:** PATCH zones/settings/0rtt on ✓ · Smart Tiered Cache: on منذ Task 125 ✓
- **(يُستكمل بالتحقق الإنتاجي بعد الدفع في كوميت التوثيق — نفس نمط المراحل السابقة)

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
