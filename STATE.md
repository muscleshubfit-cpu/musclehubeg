# STATE.md — الحالة الرسمية للمشروع (أول ملف يُفتح في أي جلسة)

> **قانون (AGENTS.md §3.6):** ده أول ملف أي وكيل يقرأه قبل أي شغل — وبيتحدث إلزاميًا في نفس الفريم اللي بيغيّر الحالة.
> الملف محدود بـ 100 سطر بوابةً (`scripts/docs_audit.py`) — اكتب مضغوط.
> **قانون التوحيد (Phase 115 — أمر المالك «الأمر الخامس»):** الملف ده هو **المصدر الرسمي والوحيد** لحالة المشروع الحية — `PROGRESS.md` و`QA_CHECKLIST.md` اندمجوا هنا واتجمدوا حرفيًا في `archive/` (التاريخ الكامل هناك + `worklog.md`).
> **آخر تحديث:** 2026-09-07 (المرحلة 134 — بنود ما بعد التدقيق المتبقية: تعتيم بريد النطاق DNS بالكامل (SPF -all · DMARC p=reject صارم · DKIM فارغ · MX null — النطاق غير مرسل، البريد عبر Gmail) · حماية كلمات المرور HIBP + حد 8 · حمية حمولة المدونة 476KB→134KB · فرض CSP جزئي حي · حذف RESEND_API_KEY الميت)

## المرحلة الحالية

- **المرحلة:** 134 — إغلاق البنود المتبقية من التدقيق (بلا تغيير DB): (1) **تعتيم بريد النطاق (M5):** alkemos.com لا يرسل بريدًا أبدًا (بلا SMTP مخصص — Supabase المدمج يرسل من نطاقه؛ المالك على Gmail) → DNS على Cloudflare: SPF `v=spf1 -all` · DMARC `p=reject; sp=reject; adkim=s; aspf=s` · DKIM فارغ `*._domainkey` · MX null (RFC 7505) · تفويض تقارير DMARC لـ Gmail — انتحال no-reply@alkemos.com يُرفض لدى المستقبِلين الآن (2) **كلمات المرور (M6):** password_min_length 6→8 حي على Supabase Auth (hibp المدمج ميزة Pro فرُفض 402 → بديل مجاني في الكود: `password-breach.ts` فحص HIBP k-anonymity عميلًا في AuthView وخادمًا في coach/register — fail-open) + minlength=8 في التسجيل فقط (الدخول بلا حد كي لا تُقفل كلمات 6-7 القديمة) (3) **حمية المدونة (P4):** نوع `BlogPostCard` — استعلامات القوائم (listBlogPosts/listPublishedPostsForListPage/getRelatedPosts/getLinkedPost) تشحق حقول البطاقة فقط بلا content/schema_json/faq_json: HTML /blog 476KB→134KB (‑72%) · المقالات per-slug كما كانت (4) **CSP (M3):** ترويسة مفروضة حية `frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'` (صفر مخاطر كسر) + السياسة الكاملة باقية Report-Over-Only وأضافت api.pwnedpasswords.com لـ connect-src — الفرض الكامل مؤجل لتقارير RO (5) **بيئة Vercel:** حذف RESEND_API_KEY الميت (صفر استخدام — المالك بلا مزود بريد) — OPENROUTER_API/KEY **ليستا مكررتين** بل مجموعة مفاتيح مزدوجة (حسابان يتناوبان — قرار مالك 2026-08-27) فلا تُمسان
- **آخر كوميت متحقق منه:** 570d09f (المرحلة 134) — دُفع 6c0543f..570d09f main→main 2026-09-07 · النشر dpl_du8DThanRuT9wvS93u5woudAE7sN READY (production · sha 570d09f4) · تحقق حي: /blog=134KB · ترويستا CSP المزدوجة · POST coach/register بكلمة مسربة → 400 breached_password · minlength=8 بالتسجيل و null بالدخول · تعداد التخزين المجهول [] في 8 دلاء · 17 صفحة 200 · cron 401 — سابقه: 70a1444 (المرحلة 133)
- **البوابات محليًا (المرحلة 134):** tsc 0 · eslint 0 · vitest 213/213 · next build ✓ (بلا ميجريشن — لا تغيير DB)
- **الإنتاج:** alkemos.com حي · آخر ميجريشن مطبّق: 0071 · Auth حي: password_min_length=8 · **DNS مقفل (تحقق DoH حي):** SPF ‑all · DMARC reject صارم · DKIM فارغ · MX null · AdSense ads.txt حي · **Cloudflare نشط:** Full Strict + بروكسي A/www + Smart Tiered Cache + HTTP/3 + Early Hints · **قانون الكاش:** /images/brand/* وsw.js بـ max-age=0 must-revalidate و/images/* عام 86400 وsw v4 network-first + تسجيل ?v=4

## المفتوح الآن

- **يدوي (المالك) — إلزامي:** تدوير مفاتيح المنصات الأربعة المشتركة بالدردشة (GitHub PAT · Vercel · Supabase · Cloudflare)
- **يدوي:** قاعدة Rate Limiting على Cloudflare (الرمز بلا صلاحية التعديل — الخطوات بتقرير المرحلة 134)
- **لاحق:** فرض CSP الكاملة بعد مراجعة تقارير RO: Vercel Dashboard → Deployments → Functions Logs → فلتر `csp-report` — لو صفر تقارير لأسبوع انقل قيمة RO للترويسة المفروضة وأضف paypal + google-analytics لـ connect-src
- (أول تحميل بعد التفعيل قد يعمل reload تلقائي مرة عند تفعيل sw v4 — سلوك مقصود)

## بانتظار موافقة المالك

- (لا شيء)

## ممنوعات نشطة

- `auth.users`: ممنوع أي SQL تلقائي يمسّها — يدوي فقط (نمط 0040/0050/0055/0066)
- مزودو AI: **OpenRouter + Groq فقط** — Gemini اتشالت بقرار المالك 2026-08-27
- ممنوع تعديل ميجريشنز مطبَّقة — دايمًا ميجريشن جديدة بصيغة `YYYYMMDDHHMMSS_NNNN` (قانون INDEX.md §3)
- ممنوع أرقام متغيرة داخل README/DEVELOPER_GUIDE — مكانها الكود/INDEX.md (بوابة docs_audit تُفشل الدفع)
- ممنوع إحياء `PROGRESS.md`/`QA_CHECKLIST.md` في الجذر — اتجمدوا في archive/ بأمر Phase 115 (بوابة docs_audit F بتفشل الدفع)
- slug العمود لا يُمس أبدًا في أي إعادة تسمية (قانون ثبات الروابط — المرحلة 121)

## ملخص جودة المرحلة (QA — Phase 134)

- **تحقق حي عبر DoH:** TXT alkemos.com = SPF `v=spf1 -all` · TXT _dmarc = `p=reject; sp=reject; adkim=s; aspf=s` · TXT *._domainkey = `v=DKIM1; p=` · تفويض تقارير Gmail حي
- **HIBP حي:** POST /api/coach/register بكلمة `password123` → 400 `breached_password` · التسجيل `minlength=8` والدخول بلا حد
- **المدونة حية:** /blog HTML 134KB (كان 476KB) · TTFB 39ms · 27 بطاقة · صفر أخطاء متصفح (agent-browser) · مقال 200/30KB
- **أمان التخزين (إعادة إثبات بعد 570d09f):** تعداد مجهول بمفتاح anon من الحزمة الحية → [] في 8 دلاء
- **CSP:** ترويستا مفروضة + RO معًا (curl -I مثبت) · 17 صفحة 200 · admin/cron/upload 401/405
- **البوابات:** tsc 0 · eslint 0 · vitest 213/213 · next build ✓ · 10 ملفات · +157/‑29 · بلا ميجريشن

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
