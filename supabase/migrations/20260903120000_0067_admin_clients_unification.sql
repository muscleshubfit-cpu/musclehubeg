-- ============================================================================
-- 0067 — ADMIN CLIENTS UNIFICATION (Phase 103, 2026-09-03)
-- ============================================================================
-- Owner directive (2026-09-03) after the Admin Panel 2.0 feedback round:
--   «الاعضاء/ الحسابات / ادارة العملاء الكاملة : كلهم نفس الغرض مفروض صفحة
--    واحده تشمل كل دول»
--   «تفرقة بين مدربين الموقع ومدربين b2b ، العملاء تشمل جميع عملاء الموقع
--    ومنهم مدربين b2b وعملائهم مع ازرار تصفيه تحديد نوع العملاء ، مدربين b2b
--    بيتعملهم صفحة عضوية عادى لان مسموح ليهم بالاشتراك فى العضويات ، قائمة
--    جديده لتعين مدربين للموقع وتعيين أعضاء ليهم لمتابعتهم ( b2c ) ، التاكد
--    من كل قواعد البيانات المربوطة باى تغيير هيتم»
--
-- ONE automatic migration (owner: «مفروض سكريبتات سوبابيز تتنفذ تلقائي») —
-- ZERO auth.users touch (the 0040/0050/0055/0066 manual-script law is not
-- triggered), ZERO changes to the B2B money tables.
--
-- PART A — profiles.coach_kind ('site' | 'b2b', default 'b2b'):
--   The coach-type distinction the panel never had. Every EXISTING coach
--   stays 'b2b' (today's exact behavior); the admin flips coaches to 'site'
--   from the new coaches page. Clients/admins carry the default too but it
--   is only meaningful when role='coach' (UI never reads it otherwise).
--
-- PART B — site_coach_assignments (NEW table, B2C follow-up roster):
--   member ↔ site-coach assignment. Deliberately SEPARATE from
--   coach_assignments: that table is the B2B MONEY relation (wallet bills =
--   coach_fees.fee_per_client × assigned rows in /api/admin/wallets, and
--   affiliate attribution in affiliate-engine-server.ts keys off it) —
--   mixing B2C members into it would bill site coaches for members who
--   already paid the SITE. One member ↔ one site coach (unique client_id,
--   same 1↔1 shape as coach_assignments_client_id_fkey isOneToOne).
--   ON DELETE CASCADE both directions (deleting a user cleans his roster
--   rows), assigned_by SET NULL (history survives, mirrors 0045 audit law).
--
-- PART C — site_coach_assignments RLS (the deterministic 0064/0065 pattern):
--   enable RLS → drop ANY unknown-name policies → recreate exactly what the
--   app needs: admin full control (public.is_admin()), coach SELECT own
--   roster rows, member SELECT his own row. Writes for authenticated are
--   revoked at TABLE level so a browser-side write fails LOUDLY instead of
--   silently matching 0 rows — all writes go through the service-role
--   admin API (/api/admin/site-assignments), same house style as accounts.
--
-- PART D — get_admin_clients_paged(...) + get_admin_clients_stats():
--   The unified data feed behind /admin/clients: EVERY profile (client +
--   coach + admin — the 0047 RPC hard-filters role='client' which is why
--   subscribing B2B coaches were invisible to the members page), with
--   membership lifecycle flags (identical math to 0047), B2B coach name
--   (coach_assignments), site-coach follow-up name (site_coach_assignments),
--   coach_kind, is_test_account and per-coach client counts. p_type is the
--   owner's customer-type filter buttons; p_test the test-account filter;
--   p_filter/p_sort mirror 0047 exactly. Security definer + is_admin()
--   guard in the outer WHERE (non-admin callers get an empty set), same
--   role boundary as 0043/0041/0047. The 0047 RPCs stay UNTOUCHED so the
--   coach console keeps working with zero drift.
--
-- Idempotent: re-runnable end to end (drop+create, if-not-exists, DO guards).
-- ============================================================================

-- ---------------------------------------------------------------
-- PART A — profiles.coach_kind
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists coach_kind text default 'b2b';

-- Deterministic constraint (drop + re-add; DO-guarded so re-runs are safe)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_coach_kind_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_coach_kind_check;
  end if;
  alter table public.profiles
    add constraint profiles_coach_kind_check check (coach_kind in ('site', 'b2b'));
end $$;

-- ---------------------------------------------------------------
-- PART B — site_coach_assignments (B2C follow-up roster)
-- ---------------------------------------------------------------
create table if not exists public.site_coach_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Hot path: the coaches page and the admin API read by coach; the roster
-- page reads by client; both directions get an index.
create index if not exists site_coach_assignments_coach_id_idx
  on public.site_coach_assignments (coach_id);
create index if not exists site_coach_assignments_client_id_idx
  on public.site_coach_assignments (client_id);

-- ---------------------------------------------------------------
-- PART C — RLS (deterministic 0064/0065 pattern)
-- ---------------------------------------------------------------
alter table public.site_coach_assignments enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'site_coach_assignments'
  loop
    execute format('drop policy if exists %I on public.site_coach_assignments', r.policyname);
  end loop;
end $$;

-- admin: full control
create policy site_coach_assignments_select_admin on public.site_coach_assignments
  for select to authenticated
  using (public.is_admin());

create policy site_coach_assignments_insert_admin on public.site_coach_assignments
  for insert to authenticated
  with check (public.is_admin());

create policy site_coach_assignments_update_admin on public.site_coach_assignments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy site_coach_assignments_delete_admin on public.site_coach_assignments
  for delete to authenticated
  using (public.is_admin());

-- coach: read his own roster (follow-up visibility, Phase-104 will build on it)
create policy site_coach_assignments_select_coach_own on public.site_coach_assignments
  for select to authenticated
  using (coach_id = auth.uid());

-- member: read his own row (who is my follow-up coach)
create policy site_coach_assignments_select_client_own on public.site_coach_assignments
  for select to authenticated
  using (client_id = auth.uid());

-- Loud-failure belt-and-braces: browser sessions never write this table —
-- all writes go through the service-role admin API. anon keeps nothing.
revoke all on public.site_coach_assignments from anon;
revoke insert, update, delete on public.site_coach_assignments from authenticated;

-- ---------------------------------------------------------------
-- PART D1 — get_admin_clients_paged(...)
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
      sca.coach_id  as site_coach_id,
      scp.full_name as site_coach_name,

      -- per-coach counts (meaningful when p.role='coach'; 0 otherwise)
      (select count(*) from public.coach_assignments cax
        where cax.coach_id = p.id)::int as b2b_clients,
      (select count(*) from public.site_coach_assignments scax
        where scax.coach_id = p.id)::int as site_members,

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
    b.assigned_coach_id, b.assigned_coach_name,
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
      when 'member_site'     then b.role = 'client' and b.assigned_coach_id is null
      when 'client_of_coach' then b.role = 'client' and b.assigned_coach_id is not null
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
-- PART D2 — get_admin_clients_stats()
--   ONE row of counts for the unified clients page tiles + type buttons.
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
      ca.coach_id is not null as _has_b2b_coach,
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
--  coach_kind_column     : profiles.coach_kind exists with the CHECK
--  roster_table          : site_coach_assignments exists with RLS forced
--  roster_policies       : exactly 6 policies on the roster table
--  paged_rpc_built       : the paged function exists
--  stats_rpc_built       : the stats function exists
--  paged_smoke_ok        : RPC callable (0 rows in SQL editor = expected,
--                          there is no logged-in admin there)
--  old_rpc_untouched     : 0047 paged RPC still in place
-- ============================================================
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'coach_kind'
      and data_type = 'text')                                        as coach_kind_column,

  (select count(*) from pg_tables
    where schemaname = 'public' and tablename = 'site_coach_assignments'
      and rowsecurity = true)                                        as roster_table,

  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename = 'site_coach_assignments')                      as roster_policies,

  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_admin_clients_paged'
      and pg_get_functiondef(oid) like '%site_coach_name%')          as paged_rpc_built,

  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_admin_clients_stats'
      and pg_get_functiondef(oid) like '%coach_b2b%')                as stats_rpc_built,

  (select count(*) from public.get_admin_clients_paged(
      5, 0, null, 'all', 'all', 'all', 'newest'))                    as paged_smoke_rows,

  (select count(*) from pg_catalog.pg_proc
    where proname = 'get_coach_client_list_paged')                   as old_rpc_untouched;

-- Expected: | 1 | 1 | 6 | 1 | 1 | 0 | 1 |
