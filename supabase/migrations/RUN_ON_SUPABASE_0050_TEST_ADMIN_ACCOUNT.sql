-- =====================================================================
-- RUN_ON_SUPABASE_0050_TEST_ADMIN_ACCOUNT.sql
-- =====================================================================
-- هدف السكريبت: إنشاء حساب أدمن تجريبي للاختبار العميق لشاشات الأدمن.
--
-- الحساب:
--   البريد:    admin.test@musclehub-test.com
--   كلمة السر: MH#AdminTest2026x
--   الاسم:     تجربة أدمن فحص (مُعلَّم بوضوح كبيانات اختبار)
--
-- ملاحظات:
--   1. السكريبت يعتمد على ترقير handle_new_user() الموجود (بيعمل
--      بروفايل تلقائي لأي مستخدم جديد بدور client)، وبعدين يرقّي
--      البروفايل لعبدور admin مباشرة من SQL (من غير metadata).
--   2. ملف Idempotent: تشغيله أكتر من مرة آمن — بيمسح النسخة القديمة
--      بنفس البريد الأول ويعيدها من جديد.
--   3. مش بيغير أي بيانات موجودة تانية، وبصفر تأثير على حسابك الحالي.
--   4. بعد التشغيل لازم يظهر «Success» وفي آخر الخطوات جدول تحقق
--      فيه السطر بتاع الحساب ودوره admin.
-- =====================================================================

-- ---------- 1) مسح أي نسخة قديمة من نفس الحساب (لو اتشغّل قبل كده) ----------
delete from public.profiles where email = 'admin.test@musclehub-test.com';
delete from auth.users where email = 'admin.test@musclehub-test.com';

-- ---------- 2) إنشاء مستخدم المصادقة (نفس نمط 0040 المُجرَّب) ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin.test@musclehub-test.com',
  crypt('MH#AdminTest2026x', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"تجربة أدمن فحص","phone":"+201000000043"}'::jsonb,
  now(), now(), '', '', '', ''
);

-- ---------- 3) ترقية البروفايل لعبدور admin (سيرفر-سايد، مش metadata) ----------
update public.profiles
set role = 'admin',
    phone = '+201000000043'
where email = 'admin.test@musclehub-test.com';

-- ---------- 4) تحقق نهائي (لازم السطر هنا يظهر role = admin) ----------
select p.id, p.email, p.full_name, p.phone, p.role, p.created_at
from public.profiles p
where p.email = 'admin.test@musclehub-test.com';
