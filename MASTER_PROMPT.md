# Master Prompt — MuscleHub Project

> **انسخ كل المحتوى ده والصقه في شات جديد** مع أي طلب تاني.

---

## هوية المشروع

**الاسم:** MuscleHub (musclehubeg) — منصة تدريب لياقة وتغذية عربية/إنجليزية
**اللاعب الأساسي:** أحمد (الكوتش + المالك)
**البريد:** muscleshubfit@gmail.com
**اللغة:** تحدث بالعربي دايماً. الكود والتعليقات بالإنجليزي.

---

## التقنيات

| التقنية | الإصدار | ملاحظة |
|---|---|---|
| Next.js | 16.3.0 | App Router, Turbopack |
| React | 19.2.8 | — |
| TypeScript | 5.9.3 | Strict mode, 0 errors |
| Tailwind CSS | 4.3.3 | — |
| shadcn/ui | كامل | UI Components |
| Supabase | — | Postgres + Auth + Storage + RLS |
| Bun | — | Package manager (`bun install`) |
| Vercel | — | Deploy + Cron Jobs |
| OpenRouter | free models | EVO AI + Blog generation |

---

## بنية المشروع

```
musclehubeg/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # صفحات التطبيق (محمية)
│   │   │   ├── questionnaires/ # الاستبيانات
│   │   │   ├── dashboard/      # داشبورد العميل
│   │   │   ├── plans/          # خطط التدريب والتغذية
│   │   │   ├── progress/       # تتبع التقدم
│   │   │   ├── support/        # صندوق الدعم
│   │   │   ├── coach/          # داشبورد الكوتش
│   │   │   ├── admin/          # لوحة الإدارة
│   │   │   ├── blog-admin/     # إدارة المدونة
│   │   │   └── ...             # باقي الصفحات المحمية
│   │   ├── api/                # API Routes (26 route)
│   │   │   ├── ai/             # chat, generate-article, plan, swap, regenerate-meal
│   │   │   ├── admin/          # blog cleanup, leads, saved-results
│   │   │   ├── cron/           # blog (3-step pipeline), progress-reminder
│   │   │   ├── notifications/  # admin, broadcast
│   │   │   ├── tools/          # lead, save-result, saved-results, save-meal-plan, saved-meal-plans
│   │   │   ├── blog/           # fetch-images
│   │   │   ├── plans/          # normalize
│   │   │   ├── food-search/    # بحث الأطعمة
│   │   │   ├── exercise-image/ # صور التمارين
│   │   │   └── og-image/       # OG images ديناميكية
│   │   ├── blog/, exercises/, foods/, programs/  # صفحات عامة
│   │   ├── coaching/, evo/, memberships/         # صفحات تسويقية
│   │   └── tools/              # الأدوات (calorie, BMI, macro, body-fat, water-tracker)
│   ├── components/
│   │   ├── views/              # كل الـ Views (23 ملف) — المكونات الرئيسية
│   │   ├── ui/                 # shadcn/ui components
│   │   └── ...                 # مكونات مشتركة (AdSenseAd, NotificationBell, SiteHeader, ...)
│   ├── lib/
│   │   ├── data.ts             # ⭐ طبقة البيانات الرئيسية (Supabase + localStorage fallback)
│   │   ├── i18n.tsx            # ⭐ الترجمة (عربي/إنجليزي) — كل الـ keys هنا
│   │   ├── memberships.ts      # ⭐ نظام العضويات والحدود
│   │   ├── supabase/           # client.ts, admin.ts, types.ts
│   │   ├── ai.ts, ai-local.ts, ai-provider.ts  # نظام AI
│   │   ├── plan-generator.ts, plans.ts           # خطط التدريب والتغذية
│   │   ├── blog.ts, blog-admin.ts, blog-generate.ts, blog-server.ts  # المدونة
│   │   ├── referral.ts, referral-cookie.ts       # نظام الإحالات
│   │   ├── notification-templates.ts              # قوالب الإشعارات
│   │   ├── exercises.ts, foods.ts, workout-programs.ts  # البيانات الثابتة
│   │   └── ...
│   ├── hooks/                  # use-auth, use-membership-tier, use-nav, use-mobile, use-toast
│   └── middleware.ts           # المصادقة + اللغة + إعادة التوجيه
├── supabase/migrations/       # 12 migration files
├── public/images/              # صور الموقع
├── vercel.json                 # Vercel config + Crons + Headers
├── PROGRESS.md                 # ⭐ لوحة التحكم الرئيسية — اقرأها أول شيء
├── DEVELOPER_GUIDE.md          # دليل المطور
├── QA_CHECKLIST.md             # قائمة فحص الجودة (95/95)
└── .env.example                # توثيق المتغيرات البيئية
```

---

## قواعد صارمة (مهم جداً)

### 1. Git
- **البريد:** `muscleshubfit@gmail.com` — كل commit لازم يكون بيها
- **الاسم:** `MuscleHub`
- **الأمر:** `git -c user.email="muscleshubfit@gmail.com" -c user.name="MuscleHub" commit -m "..."`
- **لا تستخدم `git config --global` أبداً** — استخدم `-c` فقط

### 2. اللغة
- تحدث بالعربي مع المستخدم
- الكود والتعليقات والمتغيرات بالإنجليزي
- الترجمة في `src/lib/i18n.tsx` — أي نص جديد يُضاف هناك (عربي + إنجليزي)
- لا تضيف نصوص عربية مباشرة في الكود (استخدم `t("key")`)

### 3. البيانات (data.ts)
- `src/lib/data.ts` هو طبقة البيانات المركزية — كل القراءة/الكتابة من خلاله
- يدعم Supabase (إنتاج) + localStorage fallback (تطوير/عرض)
- **لا تستدعي Supabase مباشرة من المكونات** — استخدم الدوال في data.ts

### 4. الإشعارات
- `createAdminNotification` في data.ts — **لا تستخدم await معاها** (fire-and-forget)
- الإشعارات للكوتش تروح عبر `/api/notifications/admin` (server-side, service_role bypass RLS)
- قوالب الإشعارات في `src/lib/notification-templates.ts`

### 5. العضويات
- 4 مستويات: `free` / `premium` / `pro` / `coaching`
- استخدم `useMembershipTier(profile)` hook لمعرفة مستوى المستخدم
- حدود كل مستوى في `src/lib/memberships.ts` → `getLimits(tier)`
- Coaching مش عضوية — هو اشتراك منفصل (EVO + كوتش بشري)

### 6. الكوتشينج
- الكوتش يستخدم `admin.ts` (service_role) للوصول لكل البيانات
- العملاء يستخدمون `client.ts` (RLS)
- `COACH_EMAILS` env var — قائمة بريدات الكوتش (comma-separated)

### 7. Styling
- Tailwind CSS 4 — لا تستخدم `@apply` كثيراً
- الألوان الأساسية: `#0071e3` (أزرق), `#34c759` (أخضر), `#ff3b30` (أحمر), `#ff9500` (برتقالي)
- الخلفيات: `#f5f5f7` (رمادي فاتح), `white` للكروت
- Border radius: `rounded-xl` للكروت, `rounded-full` للأزرار
- تصميم Apple-style

### 8. Vercel Crons
- CRON_SECRET env var — لو مش موجود، الـ auth check بيتبقى ساكن (graceful fallback)
- كل cron endpoint لازم يتحقق من `Authorization: Bearer <CRON_SECRET>` بس لو المتغير موجود
- الـ crons مسجلة في `vercel.json`

---

## حالة المشروع الحالية

- **54 ميزة مكتملة 100%** (Feature Freeze — لا تعدلها إلا لإصلاح bug)
- **~120 ملف كود**, **26 API route**, **40+ صفحة**, **23 جدول DB**
- **إجراء يدوي واحد متبقي:** تشغيل migrations 0011 + 0012 على Supabase SQL Editor
- **PROGRESS.md** هو الملف المرجعي — يُحدث مع كل تغيير
- **0 أخطاء TypeScript** — كل `@ts-nocheck` محذوفة
- **كل الـ known issues اتحلت** (types.ts كامل، chat_messages مستخدمة، price_egp → price_usd)

---

## ملفات يجب قراءتها أولاً

1. **`PROGRESS.md`** — الحالة الكاملة للمشروع + الميزات + الباقي
2. **`src/lib/data.ts`** — كل عمليات البيانات
3. **`src/lib/i18n.tsx`** — كل الترجمات
4. **`src/lib/memberships.ts`** — نظام العضويات
5. **`src/hooks/use-nav.tsx`** — نظام التنقل والتوجيه
6. **`src/middleware.ts`** — المصادقة واللغة

---

## نشر وتشغيل

- **Deploy:** Vercel (auto-deploy on push to main)
- **Region:** sin1 (Singapore)
- **Framework:** nextjs (محط في vercel.json + Vercel project settings)
- **Domain:** musclehubeg.vercel.app
- **GitHub:** github.com/muscleshubfit-cpu/musclehubeg
- **Supabase Project:** wyopqryzfjifyeyvyxfy
- **Package Manager:** bun

---

## ملاحظات مهمة

- الفورمات مش موجودة في المشروع (no tests) — كل اختبار يدوي
- الـ Views في `src/components/views/` هي المكونات الرئيسية (كل صفحة = View واحد)
- الصفحات في `src/app/` مجرد wrappers رفيعة حول الـ Views
- الـ i18n system بسيط: `t("key")` يرجع النص حسب اللغة الحالية
- كل صفحة عامة لها `layout.tsx` خاص (SEO metadata)
- الصفحات المحمية في `(app)/` — middleware بيحماها

---

> **آخر تحديث:** 2026-08-19
> **الغرض:** تحميل سياق كامل للمشروع في شات جديد بدون إعادة شرح
