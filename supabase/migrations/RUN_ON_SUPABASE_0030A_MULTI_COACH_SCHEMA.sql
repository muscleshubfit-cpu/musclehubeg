-- =====================================================================
-- RUN_ON_SUPABASE_0030A_MULTI_COACH_SCHEMA.sql   (PART 1 of 4)
-- =====================================================================
-- MULTI-COACH FOUNDATION split into 4 SMALL scripts (the one-paste
-- 22KB file was too long to paste into the SQL editor).
--
-- RUN ORDER (strict):  0030A -> 0030B -> 0030C -> 0030D
--   A = coach_assignments (1 client <-> 1 coach) + helpers
--       coach_of / is_coach_over + auto-assign trigger + backfill
--   B = RLS: client-data scoped to the assigned coach
--   C = RLS: admin-exclusive locks + notifications routing
--   D = get_coach_client_list() rebuilt + API schema reload
--
-- Nothing is half-applied from earlier failed attempts (the server
-- rejects the whole paste) — and every part is idempotent: re-running
-- any part is safe.
--
-- HOW TO PASTE EACH PART: open the RAW url -> select all (Ctrl+A),
-- copy (Ctrl+C) -> Supabase SQL Editor -> NEW empty query -> paste ->
-- press Ctrl+End -> you MUST see this part's "END OF SCRIPT" marker
-- at the bottom -> Run -> expected: "Success. No rows returned".
--
-- RAW (this part A):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030A_MULTI_COACH_SCHEMA.sql
-- RAW (next — B):
-- https://raw.githubusercontent.com/muscleshubfit-cpu/musclehubeg/main/supabase/migrations/RUN_ON_SUPABASE_0030B_MULTI_COACH_CLIENT_RLS.sql
-- =====================================================================

-- ============================================================
-- PART 1 — coach_assignments table + RLS
-- ============================================================
create table if not exists public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_assignments_no_self check (client_id <> coach_id)
);

create index if not exists idx_coach_assignments_coach on public.coach_assignments(coach_id);
create index if not exists idx_coach_assignments_client on public.coach_assignments(client_id);

alter table public.coach_assignments enable row level security;

-- Read: admin (all) | the coach himself (his clients) | the client (his own row)
drop policy if exists ca_select on public.coach_assignments;
create policy ca_select
  on public.coach_assignments for select
  to authenticated
  using (
    public.is_admin()
    or coach_id = auth.uid()
    or client_id = auth.uid()
  );

-- Write: ADMIN ONLY (assignment is the platform owner's job).
-- The auto-assign trigger below is SECURITY DEFINER → bypasses RLS.
drop policy if exists ca_insert_admin on public.coach_assignments;
create policy ca_insert_admin
  on public.coach_assignments for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists ca_update_admin on public.coach_assignments;
create policy ca_update_admin
  on public.coach_assignments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists ca_delete_admin on public.coach_assignments;
create policy ca_delete_admin
  on public.coach_assignments for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- PART 2 — helper functions
-- ============================================================
-- coach_of(client) → the ASSIGNED coach's profile id (or null).
create or replace function public.coach_of(p_client uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.coach_id
  from public.coach_assignments a
  where a.client_id = p_client
  limit 1
$$;

-- is_coach_over(client) → THE client-data predicate from now on:
-- true for the admin (sees everything) and for the coach ASSIGNED to
-- this exact client. NEVER use bare is_coach() for client data again.
create or replace function public.is_coach_over(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.coach_assignments a
    where a.client_id = p_client
      and a.coach_id = auth.uid()
  )
$$;

grant execute on function public.coach_of(uuid) to anon, authenticated;
grant execute on function public.is_coach_over(uuid) to anon, authenticated;

-- ============================================================
-- PART 3 — auto-assign every NEW client to the admin (general coach)
-- ============================================================
-- Clients belong to the site; until the owner reassigns them they are
-- followed by the general coach (admin). Allowlisted staff signups are
-- NEVER assigned as clients (guard works regardless of trigger order).
create or replace function public.auto_assign_client_to_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
begin
  if new.role = 'client' then
    if exists (
      select 1 from public.coach_emails
      where lower(email) = lower(new.email)
    ) then
      return new;  -- staff signup — never a client
    end if;

    select id into v_admin
    from public.profiles
    where role = 'admin'
    order by created_at
    limit 1;

    if v_admin is not null and v_admin <> new.id then
      insert into public.coach_assignments (client_id, coach_id, assigned_by)
      values (new.id, v_admin, v_admin)
      on conflict (client_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_assign_client on public.profiles;
create trigger trg_auto_assign_client
  after insert on public.profiles
  for each row execute function public.auto_assign_client_to_admin();

-- ============================================================
-- PART 4 — backfill: every EXISTING client → the admin
-- ============================================================
insert into public.coach_assignments (client_id, coach_id, assigned_by)
select p.id, a.id, a.id
from public.profiles p
cross join lateral (
  select id from public.profiles where role = 'admin' order by created_at limit 1
) a
where p.role = 'client'
  and not exists (
    select 1 from public.coach_emails ce where lower(ce.email) = lower(p.email)
  )
on conflict (client_id) do nothing;


-- =====================================================================
-- ===== END OF SCRIPT 0030A — if you can see this line (Ctrl+End), the
-- ===== paste is complete. NOW RUN PART 0030B.
-- =====================================================================
