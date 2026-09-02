-- ============================================================================
-- 0068 — ADMIN CLIENT TYPE FIX (Phase 103b, 2026-09-03)
-- ============================================================================
-- Owner bug report right after using the new unified page:
--   «فى خطاء ، جميع العملاء مكتوب عملاء b2b وده خطاء»
--
-- ROOT CAUSE (proven, not guessed):
--   0030A's auto_assign_client_to_admin() trigger + its backfill put EVERY
--   client into coach_assignments with coach_id = THE ADMIN («followed by
--   the general coach (admin)» — the mechanism behind the old /coach
--   admin-mode listing). 0067 then classified `client_of_coach` as
--   `assigned_coach_id is not null` — which is TRUE for every single
--   client because of that admin row → every member was labeled
--   «عميل مدرب B2B» and the type buttons were useless (member_site ≈ 0).
--
-- THE FIX — a client is a «B2B coach client» only when the assignment
-- targets a profile whose role = 'coach'. Assignment to the ADMIN is the
-- default site-member follow-up (متابعة الإدارة) → classified
-- member_site, and the row exposes assigned_coach_role so the UI can
-- label it honestly instead of showing «كوتش B2B» for the owner himself.
--
--   * get_admin_clients_paged: + assigned_coach_role column,
--     _has_b2b_coach = ca.coach_id is not null AND cp.role = 'coach',
--     p_type member_site/client_of_coach rebalanced on it.
--     SAME 7-arg signature (app call unchanged), same lifecycle math,
--     same security-definer is_admin() boundary, same 0047-compat.
--   * get_admin_clients_stats: identical member_site/client_of_coach fix
--     (joins the coach profile now) so the button counts match.
--   * coach_assignments itself is UNTOUCHED — it stays the B2B money
--     relation; only the CLASSIFICATION reads it differently.
--   * /admin/coaches roster unaffected: its p_type='coach'/'coach_site'/
--     'coach_b2b' keys are role-based.
--
-- Idempotent: drop + create end to end. No data touched.
-- ============================================================================

-- ---------------------------------------------------------------
-- PART A — get_admin_clients_paged (recreate: return type gains a column)
-- ---------------------------------------------------------------
drop function if exists public.get_admin_clients_paged(int, int, text, text, text, text, text);
create or replace function public.get_admin_clients_paged(
  p_limit   int  default 25,
  p_offset  int  default 0,
  p_search  text default null,
  p_filter  text default 'all',   -- all|active|expiring|expired|no_plan|pending_payment|premium|pro|coaching
  p_type    text default 'all',   -- all|member_site|client_of_coach|coach|coach_site|coach_b2b|admin
  p_test    text default 'all',   -- all|test|real
  p_sort    text default 'newest' -- newest|oldest|name|expiry
)
returns table (
  client_id uuid,
  client_email text,
  client_full_name text,
  client_phone text,
  client_avatar_url text,
  client_created_at timestamptz,
  role text,
  coach_kind text,
  is_test_account boolean,
  sub_tier text,
  sub_status text,
  sub_end_date timestamptz,
  sub_months int,
  pending_payments int,
  assigned_coach_id uuid,
  assigned_coach_name text,
  assigned_coach_role text,
  site_coach_id uuid,
  site_coach_name text,
  b2b_clients int,
  site_members int,
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
      p.role          as role,
      coalesce(p.coach_kind, 'b2b') as coach_kind,
      p.is_test_account as is_test_account,

      bs.tier     as sub_tier,
      bs.status   as sub_status,
      bs.end_date as sub_end_date,
      bs.months   as sub_months,

      (select count(*) from public.subscription_requests sr
        where sr.user_id = p.id and sr.status = 'pending')::int as pending_payments,

      ca.coach_id   as assigned_coach_id,
      cp.full_name  as assigned_coach_name,
      cp.role       as assigned_coach_role,
      sca.coach_id  as site_coach_id,
      scp.full_name as site_coach_name,

      -- per-coach counts (meaningful when p.role='coach'; 0 otherwise)
      (select count(*) from public.coach_assignments cax
        where cax.coach_id = p.id)::int as b2b_clients,
      (select count(*) from public.site_coach_assignments scax
        where scax.coach_id = p.id)::int as site_members,

      -- 0068: a B2B client = assigned to a profile that IS a coach.
      -- The 0030A admin auto-assignment must NOT count (that is the
      -- default admin follow-up of every site member).
      (ca.coach_id is not null and cp.role = 'coach')            as _has_b2b_coach,

      -- lifecycle flags — IDENTICAL math to 0047
      (bs.status = 'active' and bs.end_date >  now())                          as _is_active,
      (bs.status = 'active' and bs.end_date >  now()
        and bs.end_date < now() + interval '14 days')                          as _is_expiring,
      (bs.tier is not null and (bs.status <> 'active'
        or bs.end_date <= now()))                                              as _is_expired,
      (bs.tier is null)                                                        as _no_plan,
      exists (select 1 from public.subscription_requests sr
        where sr.user_id = p.id and sr.status = 'pending')                     as _pending
    from public.profiles p
    left join lateral (
      select s.tier, s.status, s.end_date, s.months
      from public.subscriptions s
      where s.client_id = p.id
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ) bs on true
    left join public.coach_assignments ca on ca.client_id = p.id
    left join public.profiles cp on cp.id = ca.coach_id
    left join public.site_coach_assignments sca on sca.client_id = p.id
    left join public.profiles scp on scp.id = sca.coach_id
  )
  select
    b.client_id, b.client_email, b.client_full_name, b.client_phone,
    b.client_avatar_url, b.client_created_at,
    b.role, b.coach_kind, b.is_test_account,
    b.sub_tier, b.sub_status, b.sub_end_date, b.sub_months,
    b.pending_payments,
    b.assigned_coach_id, b.assigned_coach_name, b.assigned_coach_role,
    b.site_coach_id, b.site_coach_name,
    b.b2b_clients, b.site_members,
    count(*) over () as total_count
  from base b
  where
    -- admin-only boundary (security definer: non-admin callers get an empty set)
    public.is_admin()
    -- p_filter — lifecycle/tier, same keys as 0047
    and case coalesce(p_filter, 'all')
      when 'active'           then b._is_active
      when 'expiring'         then b._is_expiring
      when 'expired'          then b._is_expired
      when 'no_plan'          then b._no_plan
      when 'pending_payment'  then b._pending
      when 'premium'          then b.sub_tier = 'premium'
      when 'pro'              then b.sub_tier = 'pro'
      when 'coaching'         then b.sub_tier = 'coaching'
      else true
    end
    -- p_type — the customer-type filter buttons (owner directive)
    and case coalesce(p_type, 'all')
      when 'member_site'     then b.role = 'client' and not b._has_b2b_coach
      when 'client_of_coach' then b.role = 'client' and b._has_b2b_coach
      when 'coach'           then b.role = 'coach'
      when 'coach_site'      then b.role = 'coach' and b.coach_kind = 'site'
      when 'coach_b2b'       then b.role = 'coach' and b.coach_kind = 'b2b'
      when 'admin'           then b.role = 'admin'
      else true
    end
    -- p_test — test-account filter
    and case coalesce(p_test, 'all')
      when 'test' then coalesce(b.is_test_account, false)
      when 'real' then not coalesce(b.is_test_account, false)
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

grant execute on function public.get_admin_clients_paged(int, int, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------
-- PART B — get_admin_clients_stats (same member_site/client_of_coach fix)
-- ---------------------------------------------------------------
drop function if exists public.get_admin_clients_stats();
create or replace function public.get_admin_clients_stats()
returns table (
  total           bigint,
  member_site     bigint,
  client_of_coach bigint,
  coach_site      bigint,
  coach_b2b       bigint,
  admin_count     bigint,
  test_count      bigint,
  active          bigint,
  expiring        bigint,
  expired         bigint,
  pending_payment bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      p.role,
      coalesce(p.coach_kind, 'b2b') as coach_kind,
      coalesce(p.is_test_account, false) as is_test_account,
      -- 0068: admin auto-assignment is NOT a B2B relation — only an
      -- assignment onto a real coach counts (cp join is new here).
      (ca.coach_id is not null and cp.role = 'coach') as _has_b2b_coach,
      bs.tier,
      (bs.status = 'active' and bs.end_date > now())                          as _is_active,
      (bs.status = 'active' and bs.end_date > now()
        and bs.end_date < now() + interval '14 days')                         as _is_expiring,
      (bs.tier is not null and (bs.status <> 'active'
        or bs.end_date <= now()))                                             as _is_expired,
      exists (select 1 from public.subscription_requests sr
        where sr.user_id = p.id and sr.status = 'pending')                    as _pending
    from public.profiles p
    left join lateral (
      select s.tier, s.status, s.end_date
      from public.subscriptions s
      where s.client_id = p.id
      order by
        case s.tier when 'pro' then 3 when 'premium' then 2 when 'coaching' then 1 else 0 end desc,
        s.created_at desc
      limit 1
    ) bs on true
    left join public.coach_assignments ca on ca.client_id = p.id
    left join public.profiles cp on cp.id = ca.coach_id
    where public.is_admin()
  )
  select
    count(*),
    count(*) filter (where role = 'client' and not _has_b2b_coach),
    count(*) filter (where role = 'client' and _has_b2b_coach),
    count(*) filter (where role = 'coach' and coach_kind = 'site'),
    count(*) filter (where role = 'coach' and coach_kind = 'b2b'),
    count(*) filter (where role = 'admin'),
    count(*) filter (where is_test_account),
    count(*) filter (where _is_active),
    count(*) filter (where _is_expiring),
    count(*) filter (where _is_expired),
    count(*) filter (where _pending)
  from base
$$;

grant execute on function public.get_admin_clients_stats() to authenticated;

-- ---------------------------------------------------------------
-- Reload PostgREST schema cache
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';

-- ============================================================
-- VERIFY — one grid, one row
--  paged_rebuilt     : new definition carries assigned_coach_role
--  paged_coach_gate  : the classification gates on cp.role = 'coach'
--  stats_rebuilt     : stats gates the same way
--  old_rpc_untouched : 0047 paged RPC still in place
--  roster_rls_alive  : site_coach_assignments still RLS-forced
-- ============================================================
select
  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_admin_clients_paged'
      and pg_get_functiondef(oid) like '%assigned_coach_role%')    as paged_rebuilt,
  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_admin_clients_paged'
      and pg_get_functiondef(oid) like '%cp.role = ''coach''')      as paged_coach_gate,
  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_admin_clients_stats'
      and pg_get_functiondef(oid) like '%cp.role = ''coach''')      as stats_coach_gate,
  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_coach_client_list_paged')                 as old_rpc_untouched,
  (select count(*) from pg_tables
    where schemaname = 'public' and tablename = 'site_coach_assignments'
      and rowsecurity = true)                                      as roster_rls_alive;

-- Expected: | 1 | 1 | 1 | 1 | 1 |
