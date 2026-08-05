# أمر شامل لـ z.ai (GLM) — تجهيز البنية التحتية بالكامل

## 1) ربط Vercel بالـ GitHub Repo (أولوية قصوى — ده سبب كل الأعطال اللي شفناها)
المشروع الحالي على Vercel (`musclehubeg`, team: `muscleshubfit-2941s-projects`, project ID: `prj_y4pHM9B7NGBu50sfEmL9uxxeUP5O`) **مش متصل بأي Git repo خالص** (لسه شايل "Connect Git Repository"). ده معناه إن أي تحديث كود اترفع على GitHub من 3 أيام ماوصلش للموقع الفعلي.

- اربط المشروع في Vercel بالـ repo: `https://github.com/muscleshubfit-cpu/musclehubeg`
- الـ branch: `main`
- بعد الربط، شغّل Deploy جديد فورًا (Redeploy from latest commit على main)
- تأكد إن الـ build نجح (Status: Ready) قبل ما تقولي خلصت

## 2) تأكيد الـ Environment Variables على Vercel
تأكد إن المتغيرات دي كلها مضبوطة صح في إعدادات المشروع على Vercel (Settings → Environment Variables، على بيئة Production):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Google OAuth (لو الكود محتاجهم كـ env vars مباشرة، تأكد من الأسماء الصحيحة في الكود)

## 3) تأكيد إعداد Google OAuth (نقطة فشل شائعة)
- في **Supabase Dashboard → Authentication → Providers → Google**: تأكد إن الـ Client ID والـ Client Secret متظبطين ومفعّلين
- في **Google Cloud Console → Credentials → OAuth Client**: تأكد إن الـ Authorized redirect URIs فيها:
  - `https://[project-ref].supabase.co/auth/v1/callback`
  - `https://musclehubeg.vercel.app/auth/callback`
- تأكد إن الـ Authorized JavaScript origins فيها `https://musclehubeg.vercel.app`

## 4) تأكيد قاعدة البيانات
تأكد إن الـ migration الموجودة في `supabase/migrations/0001_init.sql` اتنفذت فعليًا على مشروع Supabase الجديد (`wyopqryzfjifyeyvyxfy`) — يعني الجداول والـ trigger بتاع `handle_new_user` (اللي بيعمل profile تلقائي لأي مستخدم جديد) موجودين فعلاً وشغالين.

## 5) اختبار كامل بعد الديبلوي
بعد ما الموقع يبقى شغال بآخر نسخة، اختبر الرحلة دي بالظبط وأكّد إنها من غير أخطاء:
1. تسجيل دخول بـ Google (Continue with Google) على `https://musclehubeg.vercel.app`
2. الدخول على Dashboard بعد تسجيل الدخول
3. الدخول على صفحة Pricing والدوس على زرار الاشتراك (Subscribe/Checkout)
4. لو الحساب Coach: الدخول على صفحة Payments بتاعة الكوتش
5. فتح `/pricing` و `/blog` كروابط مباشرة (مش بس من جوه التطبيق) والتأكد إنهم بيشتغلوا

## ملحوظة مهمة
الكود على `main` فيه بالفعل إصلاحات لـ 3 أخطاء كانت بتسبب "Application error" (استيراد أيقونات ناقص في `AppLayout.tsx` ومتغيّر غير معرّف في `CheckoutView.tsx`) — **متعدلش عليهم تاني**، دول متأكد منهم بالفعل بعد اختبار حقيقي. لو ظهر أي خطأ جديد بعد الديبلوي، ابعت نص الخطأ بالظبط.

## التقرير المطلوب في الآخر
بعد التنفيذ، اكتب تقرير مختصر بـ:
- هل الربط بـ GitHub نجح؟
- هل الـ Deploy الأخير نجح (Ready)؟
- هل كل خطوات الاختبار في القسم (5) نجحت من غير أخطاء؟
- أي مشكلة واجهتها وإزاي اتصرفت فيها
