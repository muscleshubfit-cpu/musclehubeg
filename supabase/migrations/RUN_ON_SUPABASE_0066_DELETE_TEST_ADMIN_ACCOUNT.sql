-- =====================================================================
-- RUN_ON_SUPABASE_0066_DELETE_TEST_ADMIN_ACCOUNT.sql
-- =====================================================================
-- الهدف: مسح الحساب التجريبي للأدمن بالكامل من قاعدة البيانات
--        (العكس الكامل لـ 0050 اللي أنشأه — الاختبار خلص والحساب
--        بقى بيانات اختبار لازم تتشال من الإنتاج).
--
-- الحساب الممسوح:
--   البريد:  admin.test@musclehub-test.com
--   الدور:   admin (اترقّى في 0050 وأُعيد ترقيته في 0055 بعد حادثة 61)
--
-- ليه سكريبت يدوي مش تهجيرة تلقائية (YYYYMMDDHHMMSS)؟
--   العملية بتلمس auth.users — وكل عمليات auth في المشروع تاريخيًا
--   يدوية (0040 / 0050 / 0055). لو اتعملت تهجيرة تلقائية ودور الـ
--   GitHub integration مالوش صلاحية DELETE على auth.users فهتفشل
--   الترحيل وتوقف خط النشر كله (درس إصلاح الـ ledger في 0054).
--   SQL Editor بيتنفذ بدور postgres — وده المجرَّب بنفس أسلوب المسح
--   ده في الـ preamble بتاع 0050.
--
-- خريطة المسح (مبنية على مرآة types.ts المولَّدة من الإنتاج — مش تخمين):
--   الخطوة 0: تحديد user_id من auth.users أو profiles بالبريد بالظبط.
--            لو الحساب مش موجود أصلاً → إقفال آمن (Idempotent).
--   الخطوة 1: صفوف الحساب في الجداول اللي المرآة مؤكدة إنها بدون أي
--            FK حي في الإنتاج (الكاسكيد مش هيوصلها أبدًا):
--              chat_messages.client_id · saved_results.user_id ·
--              meal_plans.user_id · plan_swaps.user_id ·
--              coach_presence.coach_id · progress_photos.user_id ·
--              subscription_requests.user_id
--            + حذف وقائي (لو الـ FK cascade فعلًا فالأثر صفر):
--              evo_chat_usage.user_id · ticket_messages.sender_id
--              (ردود الدعم اللي بعتها الحساب التجريبي)
--            + tool_leads بالإيميل (مفتاح مزامنة العملاء في 0060 هو
--              الإيميل وبلا FK — الحساب اتسجل فيه كـ lead).
--            + coach_wallet_transactions.created_by → NULL بدل حذف
--              الصف (عمود نسبة بلا FK — الحذف كان هيخرّب حركات محافظ
--              حقيقية؛ التصفير هو نفس سلوك ON DELETE SET NULL).
--   الخطوة 2: حذف profiles — بيشغّل الكاسكيد الحي المثبت فعليًا على:
--              subscriptions · notifications · admin_notifications
--              (target_coach_id) · coach_ads/fees/payments/wallets/
--              topup_requests(reviewer)/support_messages/pages/
--              assignments · referrals/earnings/payouts ·
--              affiliate_transactions/commissions · refund_requests ·
--              external_plans · questionnaires/progress_entries/plans
--   الخطوة 3: حذف auth.users — كاسكيد داخلية في مخطط auth:
--              identities · sessions · refresh tokens + كاسكيد
--              storage.objects (ملفات رفع الحساب) + ai_jobs.
--              requested_by → NULL.
--
-- الأمان:
--   * المسح محصور بالبريد بالظبط — مستحيل يمسح أي حساب تاني.
--   * audit_log.changed_by هيفضل NULL (سجل تاريخي محايد — مقصود).
--   * صفر تغيير في الـ schema → types.ts مش محتاج إعادة توليد
--     (قانون MIGRATION INDEX §c: سياسات/بيانات فقط).
--   * Idempotent: تشغيله أكتر من مرة آمن تمامًا.
--
-- RUN: Supabase Dashboard → SQL Editor → paste → Run
-- التحقق: استعلام التحقق الأخير لازم يرجّع 3 أصفار → reply تم
--
-- v2 تصحيح (بعد أول تشغيل حي):
--   أول تشغيل وقف بـ 42703 «column user_id does not exist» على
--   coach_presence — الفحص الحي (PostgREST probe عمود-عمود على الإنتاج)
--   ثبت إن الجدول في الإنتاج أعمدته: id · coach_id · last_seen ·
--   updated_at (مفيش user_id ولا status — مرآة types.ts كانت غلط في
--   الجدول ده بس). باقي الـ 10 أعمدة اتأكدت حية عمود-عمود ✅.
--   الـ DO block معاملة واحدة → الإقفال التلقائي رجّع كل حاجة =
--   صفر مسح جزئي في التشغيل الفاشل والحساب سليم. المصحح الوحيد:
--   coach_presence.coach_id بدل user_id.
-- =====================================================================

do $$
declare
  v_uid  uuid;
  v_mail constant text := 'admin.test@musclehub-test.com';
begin
  -- ---------- الخطوة 0: تحديد الحساب ----------
  select id into v_uid from auth.users where email = v_mail;
  if v_uid is null then
    select id into v_uid from public.profiles where email = v_mail;
  end if;

  if v_uid is null then
    raise notice 'الحساب التجريبي مش موجود أصلاً — مفيش حاجة تتعمل (Idempotent).';
    return;
  end if;
  raise notice 'جاري مسح الحساب التجريبي: %', v_uid;

  -- ---------- الخطوة 1: الجداول بدون FK حي (بقايا مضمونة لو اتسابت) ----------
  if to_regclass('public.chat_messages') is not null then
    delete from public.chat_messages where client_id = v_uid;
  end if;

  if to_regclass('public.saved_results') is not null then
    delete from public.saved_results where user_id = v_uid;
  end if;

  if to_regclass('public.meal_plans') is not null then
    delete from public.meal_plans where user_id = v_uid;
  end if;

  if to_regclass('public.plan_swaps') is not null then
    delete from public.plan_swaps where user_id = v_uid;
  end if;

  -- v2: العمود الحي في الإنتاج هو coach_id (مش user_id — 42703 حي)
  if to_regclass('public.coach_presence') is not null then
    delete from public.coach_presence where coach_id = v_uid;
  end if;

  if to_regclass('public.progress_photos') is not null then
    delete from public.progress_photos where user_id = v_uid;
  end if;

  if to_regclass('public.subscription_requests') is not null then
    delete from public.subscription_requests where user_id = v_uid;
  end if;

  -- وقائي (لو الـ FK cascade فعلًا يبقى الأثر صفر):
  if to_regclass('public.evo_chat_usage') is not null then
    delete from public.evo_chat_usage where user_id = v_uid;
  end if;

  if to_regclass('public.ticket_messages') is not null then
    delete from public.ticket_messages where sender_id = v_uid;
  end if;

  if to_regclass('public.tool_leads') is not null then
    delete from public.tool_leads where email = v_mail;
  end if;

  -- عمود نسبة بلا FK → تصفير مش حذف (حماية لحركات المحافظ الحقيقية):
  if to_regclass('public.coach_wallet_transactions') is not null then
    update public.coach_wallet_transactions
       set created_by = null
     where created_by = v_uid;
  end if;

  -- ---------- الخطوة 2: البروفايل (يشغّل الكاسكيد الحي) ----------
  delete from public.profiles where id = v_uid;

  -- ---------- الخطوة 3: مستخدم المصادقة (كاسكيد auth + التخزين) ----------
  delete from auth.users where id = v_uid;

  raise notice 'تم مسح الحساب التجريبي بالكامل — راجع جدول التحقق تحت.';
end $$;

-- ---------- التحقق النهائي (لازم الأعمدة الثلاثة = 0) ----------
select
  (select count(*) from auth.users
    where email = 'admin.test@musclehub-test.com')   as auth_users_left,
  (select count(*) from public.profiles
    where email = 'admin.test@musclehub-test.com')   as profiles_left,
  (select count(*) from public.tool_leads
    where email = 'admin.test@musclehub-test.com')   as leads_left;
