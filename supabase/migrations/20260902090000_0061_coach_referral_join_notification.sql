-- ============================================================
-- 0061 — COACH REFERRAL JOIN NOTIFICATION (Phase 75, owner request)
-- ============================================================
-- Owner request: «5 إشعارات الأفيليت» — one of the missing bells is
-- "a coach I invited just joined": the inviter must know that every
-- future client activation the coach pays for earns him 20% commission
-- automatically (owner decree 2026-09-01, engine hook already live in
-- src/lib/affiliate-engine-server.ts).
--
-- MECHANISM: AFTER INSERT trigger on public.referrals. A referrals row is
-- created exactly once per referred user (first-click attribution, both
-- the landing-signup path and the coach-register cookie path). When the
-- referred user's profile has role='coach', we ring the inviter's bell:
--   - notifications (the member bell — every role reads it)
--   - admin_notifications (target_coach_id = inviter — coaches read this
--     one; mirrors the engine's staff-bell pattern)
--
-- SAFETY:
--   - SECURITY DEFINER + fixed search_path (same pattern as 0057's
--     signup-referral trigger).
--   - Fully exception-guarded: ANY failure inside the notification block
--     is swallowed — a referral insert (i.e. a signup) can NEVER break.
--   - If the referred profile row is not yet visible at insert time
--     (same-transaction ordering edge), we simply skip — the join bell is
--     best-effort; the commission bells at the money moment are the
--     authoritative ones.
--   - Idempotent deploy: DROP TRIGGER IF EXISTS + CREATE OR REPLACE.
--
-- NO DATA MIGRATION. AUTO-APPLIED by the Supabase GitHub integration
-- (proven 3/3 in Phases 60/73) — the owner does NOT need to run this.
-- ============================================================

DROP TRIGGER IF EXISTS referrals_coach_join_notify ON public.referrals;

CREATE OR REPLACE FUNCTION public.notify_referrer_on_coach_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_role text;
  v_referrer_role text;
BEGIN
  -- Which role is the referred user? (skip silently if not resolvable)
  BEGIN
    SELECT p.role INTO v_referred_role
    FROM public.profiles p
    WHERE p.id = NEW.referred_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_referred_role IS NULL OR v_referred_role <> 'coach' THEN
    RETURN NEW;
  END IF;

  -- Referrer role decides which bell(s) to ring
  BEGIN
    SELECT p.role INTO v_referrer_role
    FROM public.profiles p
    WHERE p.id = NEW.referrer_id;
  EXCEPTION WHEN OTHERS THEN
    v_referrer_role := NULL;
  END;

  -- 1) Member bell (everyone reads notifications)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, link, read)
    VALUES (
      NEW.referrer_id,
      'coach_referral_joined',
      'مدرب جديد دعوته انضم! 🤝',
      'مدرب سجل عن طريق رابطك. كل تفعيل عميل بيدفعه للموقع هيكسبك 20% عمولة تلقائيًا (6$ → 1.20$ / 16$ → 3.20$).',
      '/referral',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never break the referral insert
  END;

  -- 2) Staff bell (coach inviter reads admin_notifications, not member bell)
  IF v_referrer_role = 'coach' OR v_referrer_role = 'admin' THEN
    BEGIN
      INSERT INTO public.admin_notifications
        (type, title, body, link, target_role, target_coach_id, read)
      VALUES (
        'coach_referral_joined',
        'مدرب جديد دعوته انضم! 🤝',
        'مدرب سجل عن طريق رابطك. كل تفعيل عميل بيدفعه للموقع هيكسبك 20% عمولة تلقائيًا.',
        '/coach/affiliate',
        'coach',
        NEW.referrer_id,
        false
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER referrals_coach_join_notify
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.notify_referrer_on_coach_referral();

-- Reload PostgREST schema cache (harmless; keeps generated types fresh)
NOTIFY pgrst, 'reload schema';
