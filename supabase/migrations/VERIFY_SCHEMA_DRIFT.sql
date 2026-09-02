-- ============================================================================
-- VERIFY_SCHEMA_DRIFT — MuscleHub EG (Phase 96, 2026-09-02)
-- ============================================================================
-- READ-ONLY. Paste the whole file into the Supabase SQL Editor and run.
-- It writes NOTHING. It prints the REAL state of the 4 objects that the
-- Phase 96 audit found living in production with no migration file, plus
-- confirmation that migration 0063 (schema drift backfill) is a no-op here.
--
-- What to do with the output:
--   A) Compare the column dumps with migration 20260902120000_0063 — any
--      difference means the mirror needs a correction.
--   B) Send back the SECTION 3/4 output (RLS + policies + constraints) —
--      if production policies are missing or weaker than AGENTS.md §6
--      requires, a follow-up migration will reconcile them FROM TRUTH.
-- ============================================================================

-- ============================================================
-- SECTION 1 — real columns of the 4 drift objects
-- ============================================================
select 'plan_swaps' as object, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'plan_swaps'
union all
select 'coach_presence', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'coach_presence'
union all
select 'progress_photos', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'progress_photos'
union all
select 'referrals.last_seen', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'referrals'
  and column_name = 'last_seen'
order by 1, 2;

-- ============================================================
-- SECTION 2 — row counts (proves the features are live on these tables)
-- ============================================================
select 'plan_swaps' as object, count(*) as rows from public.plan_swaps
union all
select 'coach_presence', count(*) from public.coach_presence
union all
select 'progress_photos', count(*) from public.progress_photos;

-- ============================================================
-- SECTION 3 — RLS state + policies on the 3 tables
-- ============================================================
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       coalesce(pol.policy_count, 0) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join (
  select tablename, count(*) as policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('plan_swaps', 'coach_presence', 'progress_photos')
  group by tablename
) pol on pol.tablename = c.relname
where n.nspname = 'public'
  and c.relname in ('plan_swaps', 'coach_presence', 'progress_photos');

select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('plan_swaps', 'coach_presence', 'progress_photos')
order by tablename, policyname;

-- ============================================================
-- SECTION 4 — constraints (PK / unique / FK) on the 3 tables
-- ============================================================
select conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid in (
    'public.plan_swaps'::regclass,
    'public.coach_presence'::regclass,
    'public.progress_photos'::regclass
  )
order by 1, 2;

-- ============================================================
-- SECTION 5 — confirm 0063 is a NO-OP on this database
-- (all four objects already exist → every statement in 0063
--  is IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================
select
  to_regclass('public.plan_swaps')        is not null as plan_swaps_exists,
  to_regclass('public.coach_presence')    is not null as coach_presence_exists,
  to_regclass('public.progress_photos')   is not null as progress_photos_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'referrals'
      and column_name = 'last_seen'
  ) as referrals_last_seen_exists;
