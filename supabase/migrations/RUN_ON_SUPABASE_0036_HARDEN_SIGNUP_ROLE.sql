-- =====================================================================
-- RUN_ON_SUPABASE_0036_HARDEN_SIGNUP_ROLE.sql
-- 0036 — HARDEN handle_new_user(): signup role is NEVER client-sent.
--
-- WHY NOW: /for-coaches opens a PUBLIC coach registration funnel
-- (owner-approved «التسجيل الفورى», 2026-08-29). The 0001 trigger read
-- role from raw_user_meta_data — meaning anyone calling the Supabase
-- signup API directly could pass {"role":"coach"} in user metadata and
-- self-promote. With a public coach funnel this becomes a real attack
-- surface, so the trigger now ALWAYS creates the profile as 'client'.
--
-- WHO GRANTS COACH (unchanged, all server-side):
--   - POST /api/admin/staff        (owner adds/invites a coach)
--   - POST /api/coach/register     (self-registration → service role
--     promotes + adds email to coach_emails allowlist)
--   - coach_emails + auto_promote_coach_if_allowed() (0017) keep
--     protecting the role on every future login.
--
-- COMPATIBILITY CHECK (all safe):
--   - Client signup sends metadata role:'client' → same result.
--   - Google OAuth signup sends no role → same result ('client').
--   - Staff invite sends no role → staff route updates role server-side.
--
-- IDEMPOTENT: create or replace. Re-running is safe.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    -- 0036 HARDENING: role is decided SERVER-SIDE ONLY (admin staff
    -- route / coach register route). Client metadata can never set it.
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Ensure the trigger itself is in place (idempotent — mirrors 0001).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';

-- =====================================================================
-- VERIFY (run after applying):
--
--   -- 1. Function body carries the hardening comment:
--   select prosrc from pg_proc
--   where proname = 'handle_new_user';
--     Expected: source contains "0036 HARDENING" and 'client' literal.
--
--   -- 2. Trigger exists on auth.users:
--   select tgname from pg_trigger
--   where tgrelid = 'auth.users'::regclass and not tgisinternal;
--     Expected: on_auth_user_created
--
--   -- 3. Smoke test (optional): sign up a throwaway user with metadata
--   --    {"role":"coach"} via the client SDK, then:
--   --    select role from public.profiles where id = '<new-user-id>';
--   --    Expected: 'client' (NOT coach).
-- =====================================================================

-- END OF SCRIPT 0036
