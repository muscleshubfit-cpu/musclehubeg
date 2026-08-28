-- =====================================================================
-- RUN_ON_SUPABASE_0029B_ADMIN_ROLE.sql  (STEP 2 of 2 — run AFTER 0029A)
-- =====================================================================
-- ROLE MODEL v2 (owner directive 2026-08-29) — companion to 0029A.
--
-- What this does:
--   1. is_admin()          — role = 'admin' only.
--   2. is_staff()          — role IN ('coach','admin').
--   3. is_coach()          — REDEFINED as is_staff() semantics
--                            (coach|admin). Every existing RLS policy
--                            that calls is_coach() keeps working and
--                            the admin account inherits full coach
--                            data access — ZERO policies rewritten.
--   4. auto_promote_coach_if_allowed() — hardened: only promotes
--                            client → coach; NEVER downgrades an admin
--                            back to coach when the allowlist fires.
--   5. Promote the CURRENT coach account (owner-confirmed: "حساب
--      الكوتش الحالى هو الادمن والكوتش العام") to role='admin'.
--
-- Run order: 0029A first (enum extension), then this file.
-- Idempotent: safe to run multiple times.
-- After running: NOTIFY pgrst, 'reload schema';  (or run it separately)
-- =====================================================================

-- ---------- 1. is_admin() ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ---------- 2. is_staff() ----------
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('coach', 'admin')
  )
$$;

-- ---------- 3. is_coach() → staff semantics (coach | admin) ----------
-- ALL existing RLS policies calling is_coach() now grant BOTH roles.
-- Do NOT rewrite policies — this alias is the compatibility contract.
create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('coach', 'admin')
  )
$$;

-- ---------- 4. Harden auto_promote_coach_if_allowed() ----------
-- The coach_emails allowlist trigger must never DOWNGRADE an admin.
create or replace function public.auto_promote_coach_if_allowed()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then
    return false;
  end if;

  if exists (
    select 1 from public.coach_emails
    where lower(email) = lower(v_email)
  ) then
    -- Only promote CLIENTS to coach. An admin stays admin.
    update public.profiles
       set role = 'coach'
     where id = auth.uid()
       and role = 'client';
    return true;
  end if;

  return false;
end;
$$;

-- ---------- 5. Promote the current coach account to admin ----------
-- Owner-confirmed (2026-08-29): the existing coach account IS the
-- platform admin AND the general coach. Every profile currently holding
-- role='coach' becomes 'admin'. Future coaches are added via the
-- coach_emails allowlist and arrive as role='coach' (never admin).
update public.profiles set role = 'admin' where role = 'coach';

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- =====================================================================
-- VERIFY (both files applied):
--   select id, email, role from public.profiles where role = 'admin';
--     Expected: the owner account with role='admin'
--
--   select public.is_staff(), public.is_coach(), public.is_admin()
--     -- run impersonating the owner session, or trust the row above
--
--   select proname from pg_proc
--    where proname in ('is_admin','is_staff','is_coach')
--      and pronamespace = 'public'::regnamespace;
--     Expected: 3 rows
-- =====================================================================
