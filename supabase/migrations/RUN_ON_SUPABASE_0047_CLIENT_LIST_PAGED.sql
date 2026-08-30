-- =====================================================================
--  MuscleHubEG — 0047 CLIENT LIST PAGED (Phase 52)
--  Owner directive: «تخيل لو فى ١٠٠٠٠٠٠٠ مستخدم مسجل واقترح شكل ينظمهم»
--
--  PROBLEM: get_coach_client_list() returns EVERY client in one shot
--  and CoachView renders all of them. At millions of rows the browser
--  and the network both die.
--
--  FIX — two new RPCs, same role boundary as 0043/0041 (admin sees
--  everyone + best tier + real pending counts; a coach sees ONLY his
--  own clients + coaching tier):
--
--   PART 1  get_coach_client_list_paged(p_limit, p_offset, p_search,
--           p_filter, p_segment, p_sort)
--           → one PAGE of rows (same 15 columns as the 0043 RPC)
--             + total_count = how many rows match the filters,
--           filtering/sorting/paging all INSIDE Postgres.
--   PART 2  get_coach_client_stats()
--           → ONE row of tab counts (total/active/expiring/...) so the
--             pills never need the full list again.
--
--  SAFETY: security definer (same as the existing RPC); idempotent
--  (drop+create); no tables touched; no grants changed except the two
--  new functions. The old get_coach_client_list() stays untouched so
--  the site keeps working BEFORE this migration is applied (the UI
--  falls back to it automatically).
--
--  Owner must run this in Supabase SQL Editor.
-- =====================================================================

-- ============================================================
-- PART 1 — get_coach_client_list_paged(...)
--  p_limit   : page size, clamped 1..100 (default 25)
--  p_offset  : rows to skip (>= 0)
--  p_search  : free text on name / email / phone (null or '' = no filter)
--  p_filter  : all | active | expiring | no_plan | no_questionnaire |
--              pending_payment | expired | premium | pro | coaching
--  p_segment : all | coach | site   (admin split; coaches see only
--              their own rows anyway — base WHERE is unchanged)
--  p_sort    : newest | oldest | name | expiry
--
--  Flag logic mirrors CoachView exactly:
--    is_active   = status='active' AND end_date >  now()
--    is_expiring = is_active AND end_date < now() + 14 days
--    is_expired  = has_sub AND (status<>'active' OR end_date <= now())
--    no_plan     = no best-sub row
--    pending     = admin ? pending_requests > 0 : false   (0043 law)
-- ============================================================
drop function if exists public.get_coach_client_list_paged(int, int, text, text, text, text);
create or replace function public.get_coach_client_list_paged(
  p_limit   int    default 25,
  p_offset  int    default 0,
  p_search  text   default null,
  p_filter  text   default 'all',
  p_segment text   default 'all',
  p_sort    text   default 'newest'
)
returns table (
  client_id uuid,
  client_email text,
  client_full_name text,
  client_phone text,
  client_avatar_url text,
  client_created_at timestamptz,
  sub_tier text,
  sub_status text,
  sub_end_date timestamptz,
  sub_months int,
  pending_payments int,
  nutri_q_status text,
  fit_q_status text,
  assigned_coach_id uuid,
  assigned_coach_name text,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      p.id            as client_id,
      p.email         as client_email,
      p.full_name     as client_full_name,
      p.phone         as client_phone,
      p.avatar_url    as client_avatar_url,
      p.created_at    as client_created_at,

      -- 0041/0043 boundary: one lateral = the SAME best-sub row feeds
      -- all four sub_* columns (admin → best tier; coach → coaching only)
      bs.tier     as sub_tier,
      bs.status   as sub_status,
      bs.end_date as sub_end_date,
      bs.months   as sub_months,

      case when public.is_admin() then
        (select count(*) from public.subscription_requests sr
          where sr.user_id = p.id and sr.status = 'pending')::int
      else 0 end as pending_payments,

      (select nq.status from public.nutrition_questionnaires nq
        where nq.client_id = p.id limit 1) as nutri_q_status,
      (select fq.status from public.fitness_questionnaires fq
        where fq.client_id = p.id limit 1) as fit_q_status,

      ca.coach_id   as assigned_coach_id,
      cp.full_name  as assigned_coach_name,

      -- flags used by p_filter (mirrors the JS logic in CoachView)
      (bs.status = 'active' and bs.end_date >  now())                          as _is_active,
      (bs.status = 'active' and bs.end_date >  now()
        and bs.end_date < now() + interval '14 days')                          as _is_expiring,
      (bs.tier is not null and (bs.status <> 'active'
        or bs.end_date <= now()))                                              as _is_expired,
      (bs.tier is null)                                                        as _no_plan,
      case when public.is_admin() then
        exists (select 1 from public.subscription_requests sr
          where sr.user_id = p.id and sr.status = 'pending')
      else false end                                                           as _pending,
      ((select 1 from public.nutrition_questionnaires nq
         where nq.client_id = p.id limit 1) is null
       and (select 1 from public.fitness_questionnaires fq
         where fq.client_id = p.id limit 1) is null)                           as _no_questionnaire
    from public.profiles p
    left join lateral (
      select s.tier, s.status, s.end_date, s.months
      from public.subscriptions s
      where s.client_id = p.id
        and (public.is_admin() or s.tier = 'coaching')
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ) bs on true
    left join public.coach_assignments ca on ca.client_id = p.id
    left join public.profiles cp on cp.id = ca.coach_id
    where p.role = 'client'
      and (public.is_admin() or ca.coach_id = auth.uid())
  )
  select
    b.client_id, b.client_email, b.client_full_name, b.client_phone,
    b.client_avatar_url, b.client_created_at,
    b.sub_tier, b.sub_status, b.sub_end_date, b.sub_months,
    b.pending_payments, b.nutri_q_status, b.fit_q_status,
    b.assigned_coach_id, b.assigned_coach_name,
    count(*) over () as total_count
  from base b
  where
    -- p_filter
    case coalesce(p_filter, 'all')
      when 'active'           then b._is_active
      when 'expiring'         then b._is_expiring
      when 'expired'          then b._is_expired
      when 'no_plan'          then b._no_plan
      when 'no_questionnaire' then b._no_questionnaire
      when 'pending_payment'  then b._pending
      when 'premium'          then b.sub_tier = 'premium'
      when 'pro'              then b.sub_tier = 'pro'
      when 'coaching'         then b.sub_tier = 'coaching'
      else true
    end
    -- p_segment (admin split; no-op for coaches — already scoped)
    and case coalesce(p_segment, 'all')
      when 'coach' then b.assigned_coach_id is not null
      when 'site'  then b.assigned_coach_id is null
      else true
    end
    -- p_search on name / email / phone
    and (
      nullif(btrim(coalesce(p_search, '')), '') is null
      or b.client_full_name ilike '%' || btrim(p_search) || '%'
      or b.client_email     ilike '%' || btrim(p_search) || '%'
      or b.client_phone     ilike '%' || btrim(p_search) || '%'
    )
  order by
    case coalesce(p_sort, 'newest')
      when 'oldest' then b.client_created_at end asc nulls last,
    case coalesce(p_sort, 'newest')
      when 'newest' then b.client_created_at end desc nulls last,
    case coalesce(p_sort, 'newest')
      when 'name' then lower(coalesce(b.client_full_name, b.client_email, '')) end asc nulls last,
    case coalesce(p_sort, 'newest')
      when 'expiry' then b.sub_end_date end asc nulls last,
    -- stable tiebreaker so pages never repeat or skip rows
    b.client_created_at desc,
    b.client_id desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

grant execute on function public.get_coach_client_list_paged(int, int, text, text, text, text) to authenticated;

-- ============================================================
-- PART 2 — get_coach_client_stats()
--  ONE row of counts over the caller's whole scope (same boundary),
--  so the tab pills and the big stat cards never need the full list.
--  Counts mirror the CoachView filters 1:1.
-- ============================================================
drop function if exists public.get_coach_client_stats();
create or replace function public.get_coach_client_stats()
returns table (
  total            bigint,
  active           bigint,
  expiring         bigint,
  no_plan          bigint,
  no_questionnaire bigint,
  pending_payment  bigint,
  expired          bigint,
  premium          bigint,
  pro              bigint,
  coaching         bigint,
  coach_clients    bigint,
  site_clients     bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      p.id,
      ca.coach_id is not null as _has_coach,
      bs.tier,
      (bs.status = 'active' and bs.end_date > now())                          as _is_active,
      (bs.status = 'active' and bs.end_date > now()
        and bs.end_date < now() + interval '14 days')                         as _is_expiring,
      (bs.tier is not null and (bs.status <> 'active'
        or bs.end_date <= now()))                                             as _is_expired,
      case when public.is_admin() then
        exists (select 1 from public.subscription_requests sr
          where sr.user_id = p.id and sr.status = 'pending')
      else false end                                                          as _pending,
      ((select 1 from public.nutrition_questionnaires nq
         where nq.client_id = p.id limit 1) is null
       and (select 1 from public.fitness_questionnaires fq
         where fq.client_id = p.id limit 1) is null)                          as _no_questionnaire
    from public.profiles p
    left join lateral (
      select s.tier, s.status, s.end_date
      from public.subscriptions s
      where s.client_id = p.id
        and (public.is_admin() or s.tier = 'coaching')
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ) bs on true
    left join public.coach_assignments ca on ca.client_id = p.id
    where p.role = 'client'
      and (public.is_admin() or ca.coach_id = auth.uid())
  )
  select
    count(*),
    count(*) filter (where _is_active),
    count(*) filter (where _is_expiring),
    count(*) filter (where tier is null),
    count(*) filter (where _no_questionnaire),
    count(*) filter (where _pending),
    count(*) filter (where _is_expired),
    count(*) filter (where tier = 'premium'),
    count(*) filter (where tier = 'pro'),
    count(*) filter (where tier = 'coaching'),
    count(*) filter (where _has_coach),
    count(*) filter (where not _has_coach)
  from base
$$;

grant execute on function public.get_coach_client_stats() to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- PART 3 — VERIFY: one grid, one row (same style as 0046)
--  paged_rpc_built   : the paged function exists and returns total_count
--  stats_rpc_built   : the stats function exists and returns the counts
--  paged_smoke_ok    : a call with tiny params runs and returns a row
--                      set without error (0 rows in the SQL editor is
--                      expected — there is no logged-in user there)
--  stats_smoke_ok    : same for stats (one row, all zeros)
--  old_rpc_untouched : get_coach_client_list() still in place (fallback)
-- ============================================================
select
  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_coach_client_list_paged'
      and pg_get_functiondef(oid) like '%total_count%')      as paged_rpc_built,

  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_coach_client_stats'
      and pg_get_functiondef(oid) like '%coach_clients%')    as stats_rpc_built,

  (select count(*) from public.get_coach_client_list_paged(
      5, 0, null, 'all', 'all', 'newest'))                    as paged_smoke_rows,

  (select total from public.get_coach_client_stats())         as stats_smoke_total,

  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_coach_client_list')                  as old_rpc_untouched;

-- Expected: | 1 | 1 | 0 | 0 | 1 |
