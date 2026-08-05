# MuscleHubEG — Ahmed Zake Online Coaching Platform

منصة كوتشينج تغذية ولياقة أونلاين لكوتش **أحمد زكي**، مبنية بـ Next.js 16 + Supabase، وجاهزة للنشر على Vercel.

A complete online nutrition & fitness coaching platform for coach **Ahmed Zake**, built with Next.js 16 + Supabase and ready to deploy on Vercel.

---

## ✨ المميزات | Features

- 🌐 **ثنائي اللغة (عربي/إنجليزي)** مع دعم RTL كامل
- 🔐 **مصادقة كاملة** عبر Supabase Auth (بريد + كلمة مرور)
- 👤 **حسابات منفصلة** للعميل والكوتش
- 📋 **استبيانات** (تغذية + لياقة) مع حالات (مسودة، مُرسل، معتمد، يحتاج معلومات)
- 📊 **تتبع التقدم** مع رسوم وزن بيانية وقياسات أسبوعية
- 🥗 **خطط وجبات وتمارين** قابلة للعرض مع تفاصيل الماكروز والتمارين
- 🤖 **كوتش ذكي** للدردشة (AI coach chat)
- 🎫 **نظام تذاكر دعم** مع محادثات
- 💳 **4 باقات اشتراك** (أساسي/متقدم/احترافي/نخبة) مع 3 مدد (3/6/12 شهر)
- 📱 **تصميم متجاوب** بالكامل + شريط تنقل سفلي للموبايل
- 🎨 **نظام تصميم Liquid Glass** بألوان زرقاء ناعمة وglassmorphism

---

## 🛠️ التقنيات | Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript 5** |
| Styling | **Tailwind CSS 4** + شجرة shadcn/ui كاملة |
| Charts | **Recharts** |
| Backend / Auth | **Supabase** (Postgres + Auth + RLS) |
| Icons | **Lucide React** |
| Fonts | **Cairo** (عربي), **Sora** (display), **Inter** (body) |
| Deployment | **Vercel** |

---

## 🚀 التشغيل محلياً | Run Locally

```bash
# 1. تثبيت الحزم
bun install

# 2. (اختياري) إعداد Supabase
cp .env.example .env.local
# ثم ضع NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. تشغيل خادم التطوير
bun run dev
```

> 💡 **وضع تجريبي**: إذا لم تُضبط مفاتيح Supabase، يعمل التطبيق في وضع محلي باستخدام localStorage مع حسابات تجريبية:
> - **كوتش**: `ahmed@coach.app` / `coach123`
> - **عميل**: `client@demo.app` / `client123`

---

## 📦 النشر على Vercel | Deploy to Vercel

### الخطوة 1 — ارفع الكود إلى GitHub
```bash
git init
git add .
git commit -m "feat: MuscleHubEG platform"
git branch -M main
git remote add origin https://github.com/<your-username>/musclehubeg.git
git push -u origin main
```

### الخطوة 2 — أنشئ مشروع Supabase
1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً.
2. من **Project Settings → API**، انسخ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. من **SQL Editor**، افتح ملف `supabase/migrations/0001_init.sql` من هذا المستودع والصقه ثم نفّذه (Run). سينشئ:
   - جداول: `profiles`, `subscriptions`, `nutrition_questionnaires`, `fitness_questionnaires`, `progress_entries`, `plans`, `support_tickets`, `ticket_messages`, `chat_messages`
   - سياسات **Row Level Security (RLS)** لكل جدول
   - تراير لإنشاء profile تلقائياً عند تسجيل مستخدم جديد

### الخطوة 3 — اربط المشروع بـ Vercel
1. اذهب إلى [vercel.com/new](https://vercel.com/new)
2. اختر مستودع GitHub الذي رفعته
3. Vercel سيكتشف Next.js تلقائياً — اترك الإعدادات الافتراضية
4. في **Environment Variables**، أضف:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = YOUR-ANON-KEY
   ```
5. اضغط **Deploy** ✅

### الخطوة 4 — فعّل أول حساب كوتش
بعد أول تسجيل مستخدم، شغّل هذا الاستعلام في Supabase SQL Editor لترقية حسابك إلى كوتش:
```sql
update public.profiles
set role = 'coach'
where email = 'your-email@example.com';
```

---

## 📁 هيكل المشروع | Project Structure

```
src/
├── app/
│   ├── layout.tsx          # RTL + خطوط + Toaster
│   ├── page.tsx            # Router رئيسي + حماية المسارات
│   └── globals.css         # نظام تصميم Liquid Glass
├── components/
│   ├── ui/                 # مكتبة shadcn/ui كاملة
│   ├── AppLayout.tsx       # تخطيط لوحة التحكم + شريط جانبي/سفلي
│   ├── LanguageToggle.tsx  # مبدّل عربي/إنجليزي
│   └── views/              # كل الصفحات
│       ├── LandingView.tsx
│       ├── PricingView.tsx
│       ├── AuthView.tsx
│       ├── CheckoutView.tsx
│       ├── DashboardView.tsx
│       ├── QuestionnairesView.tsx
│       ├── ProgressView.tsx
│       ├── PlansView.tsx
│       ├── ChatView.tsx
│       ├── SupportView.tsx
│       ├── CoachView.tsx
│       └── CoachClientView.tsx
├── hooks/
│   ├── use-auth.tsx        # سياق المصادقة
│   └── use-nav.tsx         # ملاحة بين الواجهات
└── lib/
    ├── i18n.tsx            # قاموس عربي/إنجليزي كامل
    ├── plans.ts            # باقات الأسعار والمميزات
    ├── data.ts             # طبقة بيانات (Supabase + fallback localStorage)
    ├── utils.ts            # أدوات مساعدة
    └── supabase/
        ├── client.ts       # عميل Supabase للمتصفح
        └── types.ts        # أنواع قاعدة البيانات

supabase/migrations/
└── 0001_init.sql           # مخطط قاعدة البيانات الكامل + RLS

vercel.json                 # إعدادات النشر على Vercel
.env.example                # نموذج متغيرات البيئة
```

---

## 🎨 نظام التصميم | Design System

- **الخلفية**: `#FAFDFF` (canvas فاتح)
- **اللون الأساسي**: `#1F8FFF` (أزرق ناعم)
- **الخطوط**:
  - عناوين: **Sora**
  - جسم النص: **Inter**
  - عربي: **Cairo**
- **التأثيرات**: glassmorphism, gradient backgrounds, soft shadows, gold-pulse animation

---

## 📝 الترخيص | License

هذا المشروع مخصص لكوتش **Ahmed Zake**. الكود ملكك — عدّله كما تريد.
