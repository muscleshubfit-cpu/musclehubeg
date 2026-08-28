-- =====================================================================
-- RUN_ON_SUPABASE_0029_ADMIN_ROLE_ALL_IN_ONE.sql   (ONE-SHOT SCRIPT)
-- =====================================================================
-- ROLE MODEL v2 (owner directive 2026-08-29):
--   client  → consumer surfaces only
--   coach   → staff: own clients, coach tools, NO admin surfaces
--   admin   → platform owner / general coach: everything, zero limits
--
-- THIS FILE = RUN_ON_SUPABASE_0029A_ADMIN_ENUM.sql
--           + RUN_ON_SUPABASE_0029B_ADMIN_ROLE.sql
--           + NOTIFY pgrst
-- merged into ONE paste for the Supabase Dashboard → SQL Editor.
--
-- WHY THERE IS A BARE `commit;` IN THE MIDDLE (intentional, do not
-- remove): PostgreSQL 12+ allows ALTER TYPE ... ADD VALUE inside a
-- transaction, but the new value CANNOT BE USED in the same
-- transaction. The SQL Editor sends the whole script as one string and
-- PostgreSQL wraps it in a single implicit transaction — the explicit
-- `commit;` below closes that transaction right after the enum
-- extension so every statement AFTER it can safely write role='admin'.
-- This works in every execution mode:
--   - whole-string execution → the commit splits the implicit block
--   - statement-by-statement → commit is a harmless no-op (warning only)
--   - an outer wrapper transaction → it exits early (warning only)
-- FALLBACK: if your runner ever refuses the mid-script commit, run
--   0029A first, then 0029B (both still kept in supabase/migrations/).
--
-- Idempotent: safe to run multiple times.
-- Run order: JUST THIS FILE. Nothing before, nothing after.
-- =====================================================================

-- ============================================================
-- PART 1 — extend the role enum (its own transaction, see commit)
-- ============================================================
alter type public.user_role add value if not exists 'admin';

-- REQUIRED: end the transaction here so the new value 'admin'
-- becomes usable by the statements below.
commit;

-- ============================================================
-- PART 2 — staff/admin SQL helpers + hardened auto-promotion
-- ============================================================

-- ---------- 2a. is_admin() ----------
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

-- ---------- 2b. is_staff() ----------
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

-- ---------- 2c. is_coach() → staff semantics (coach | admin) ----------
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

-- ---------- 2d. Harden auto_promote_coach_if_allowed() ----------
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

-- ============================================================
-- PART 3 — promote the current coach account to admin
-- ============================================================
-- Owner-confirmed (2026-08-29): the existing coach account IS the
-- platform admin AND the general coach. Every profile currently
-- holding role='coach' becomes 'admin'. Future coaches are added via
-- the coach_emails allowlist and arrive as role='coach' (never admin).
update public.profiles set role = 'admin' where role = 'coach';

-- ============================================================
-- PART 4 — grants + PostgREST schema reload
-- ============================================================
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- VERIFY (paste each query in the SQL Editor after this script):
--   1) select unnest(enum_range(null::public.user_role));
--        Expected: client | coach | admin
--   2) select id, email, role from public.profiles where role = 'admin';
--        Expected: the owner account with role='admin'
--   3) select proname from pg_proc
--       where proname in ('is_admin','is_staff','is_coach')
--         and pronamespace = 'public'::regnamespace;
--        Expected: 3 rows
-- =====================================================================
