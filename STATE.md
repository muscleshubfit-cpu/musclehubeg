# STATE.md — الحالة الرسمية للمشروع (أول ملف يُفتح في أي جلسة)

> **قانون (AGENTS.md §3.6):** ده أول ملف أي وكيل يقرأه قبل أي شغل — وبيتحدث إلزاميًا في نفس الفريم اللي بيغيّر الحالة.
> الملف محدود بـ 100 سطر بوابةً (`scripts/docs_audit.py`) — اكتب مضغوط.
> **قانون التوحيد (Phase 115 — أمر المالك «الأمر الخامس»):** الملف ده هو **المصدر الرسمي والوحيد** لحالة المشروع الحية — `PROGRESS.md` و`QA_CHECKLIST.md` اندمجوا هنا واتجمدوا حرفيًا في `archive/` (التاريخ الكامل هناك + `worklog.md`).
> **آخر تحديث:** 2026-09-06 (المرحلة 126 — «الرخام والكروم»: الهوية البصرية الجديدة Light+Dark بتغيير تلقائي بالنظام + زر يدوي، من 24 صورة المالك v3)

## المرحلة الحالية

- **المرحلة:** 126 — الهوية «Marble & Chrome» (أمر المالك بخريطة 17 بندًا + معايير قبول): (1) **بنية الثيم:** متغيرات CSS بالمهمة الحرفية (--bg/--text/--muted/--chrome/--border-chrome/--shadow/--ai) في :root + [data-theme=dark] + سكريبت no-flash أول body (localStorage «alkemos-theme» أو prefers-color-scheme) + زر ThemeToggle يدور light→dark→system (تابع للنظام حيًا) + preload لهيروَي light/dark (لا CLS — الهيرو CSS background بارتفاع 92vh ثابت) (2) **الخط:** Playfair Display للعناوين LTR (lapidary serif) والعربية تفضل Cairo (3) **الأصول من 24 صورة المالك:** hero-light/dark 47/76KB · لوجو navbar light/dark شفاف 36px · لوجو فوتر أبيض (من logo-mono-black — التسمية معكوسة عن المحتوى!) · خوذة mark-helmet → favicon 16/32/48/180 + كل الأيقونات · مقسّمات ماندر يونانية قابلة repeat-x (29 فترة) · نسيج رخام 3/23KB (طبقة 5%) · evo-card/widget لكل سمة · **38 أيقونة محفورة** من ورقتين مختلفتي التخطيط (الفاتحة 5 صفوف والداكنة 5 بترتيب مختلف — خرائط مستقلة + قسمة الخلية المركّبة fruits/carbs) (4) **الصفحة الرئيسية:** هيرو جديد (عنوان المهمة «Your complete fitness platform.» + subline + btn-chrome/btn-outline + 3 أختام seal-chip) · كل الأقسام kروت marble-card + الأرقام chrome-text + أيقونات محفورة (صفر إيموجي DOM) · الأسعار: Pro بحلقة كروم 2px + غار Popular + أسعار كرومية · جدول المقارنة: خوذة على عمود Alkemos + ختم ✓ محفور + × خافت · فوتر رخامي داكن دائمًا + ماندر + لوجو أبيض (5) **الودجت:** أفاتار 56px لكل سمة + حلقة توهج var(--ai) في الدارك + --ai حصريًا لعناصر AI (6) **Dark-Shim:** إعادة توجيه أدوات Tailwind القديمة (bg-white/bg-[#f5f5f7]/text-[#1d1d1f]…) للتوكنز في الدارك فقط — الصفحات الثانوية تُعرض داكنة سليمة بلا تعديل مئات الملفات — اللايت بمساس صفر
- **البلاغ الموازي مُغلق:** إصلاح Supabase Auth نُفذ فعليًا عبر Management API (توكن المالك): site_url=alkemos.com + uri_allow_list بمسار alkemos.com/auth/callback صراحةً (القانون: PATCH يتطلب uri_allow_list كـ string مفصولة بفواصل — حقل redirect_urls يُرفض صامتًا — سبب «الارتداد» التاريخي) · GSC تم · PayPal تم · إعلانات ads.txt حية
- **آخر كوميت متحقق منه:** cbf5bce (المرحلة 125 — بلاغ المالك: CI أخضر + تحقق إنتاجي build-info=cbf5bce · الأصول الجديدة كلها حية بعد تنظيف كاش CF للودجت 41KB→24.6KB · لقطات VLM موبايل/ديسكتوب/درج كلها PASS) — دُفع b3e9906..cbf5bce main→main 2026-09-06 (سابقه الموثق: 3046647 المرحلة 124)
- **البوابات الثمانية محليًا (تشغيل المرحلة 126):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS (بلا ميجريشن جديدة) · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓ (تشغيل هذه الجلسة)
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

## ملخص جودة المرحلة (QA — Phase 126)

- **فحوص VLM محلية (server إنتاجي):** هيرو لايت/دارك مطابق للمعاينات (معبد + serif + أزرار كروم) · الأقسام مقروءة بالكامل في الدارك (لا black-on-black) · عربي RTL سليم مرآة + اللوجو يفضل LTR · الموبايل 390px بلا overflow · المبدّل يدور ويخزن (system→light→dark) · الأسعار: أسعار كرومية + حلقة Pro + غار · الفوتر: رخام داكن + ماندر + لوجو أبيض + روابط فاتحة · جدول المقارنة: خوذة + أختام ✓ + × خافت · صفحات /tools و/memberships بالدارك سليمة عبر الـ shim
- **شيتات المقارنة للتسليم:** scripts/qa_assets/v3/DIFF_hero_{light,dark}.png + DIFF_sections_{light,dark}.png (تطبيقنا يسارًا × معاينة المالك يمينًا) — الفروق المرصودة وظيفية فقط (هامبرجر بدل روابط نصية — بنية التطبيق، ولوجو المالك بترجمة يونانية)
- **أحجام الأصول:** إجمالي الأحمال الجديدة للصفحة الرئيسية ≈ 480KB (hero 47/76 · evo-card 126/142 · 38 أيقونة 3-11KB · ماندر 20/12 · رخام 3/23 · لوجوهات) — WebP method=6 من مصادر 1.5-2MB
- **البوابات (المرحلة 126):** tsc 0 · eslint 0 · vitest 213/213 · migration_audit --ci PASS (بلا ميجريشن) · docs_parity 0 · docs_audit 0 · check-stale-refs 0 · check-ui-wiring 0 · next build ✓

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
