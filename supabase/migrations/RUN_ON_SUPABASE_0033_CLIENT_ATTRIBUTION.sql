-- =====================================================================
-- RUN ON SUPABASE — 0033 CLIENT ATTRIBUTION + COACH FEES
-- (multi-coach PHASE 3: «المدرب مسؤول عن جلب عملائه» — owner answers
--  2026-08-29: coaches pay a fixed per-client fee, they bring their own
--  clients via their landing page or personal invite, site clients stay
--  with the admin/general coach, affiliate stays site-clients-only.)
--
-- HOW TO PASTE SAFELY:
--   1. Copy from the RAW GitHub url ONLY (never the GitHub blob page).
--   2. Supabase → SQL Editor → NEW empty query → paste.
--   3. Press Ctrl+End — the LAST line must be:  END OF SCRIPT 0033
--   4. Run → expect:  Success. No rows returned
-- Idempotent — safe to re-run. No tables dropped, no RLS removed.
-- Prereq: 0030A (coach_assignments + trigger) and 0031 (coach_pages).
-- =====================================================================

-- ============================================================
-- PART 1 — REBUILD auto-assign trigger with COACH ATTRIBUTION
-- ============================================================
-- A new client is assigned, in order of priority:
--   1. coach_id   in signup metadata (coach invited him personally)
--   2. coach_slug in signup metadata (he signed up through the coach's
--      landing page /coaches/{slug} — the slug travels in metadata)
--   3. FALLBACK: the admin (general coach) — site clients stay the
--      admin's, exactly as before 0033.
-- Allowlisted staff emails are still NEVER assigned as clients.
create or replace function public.auto_assign_client_to_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_coach uuid;
  v_meta  jsonb;
begin
  if new.role = 'client' then
    if exists (
      select 1 from public.coach_emails
      where lower(email) = lower(new.email)
    ) then
      return new;  -- staff signup — never a client
    end if;

    v_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
    v_coach := null;

    -- Priority 1: personal invite — coach_id uuid in metadata
    if coalesce(v_meta->>'coach_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select p.id into v_coach
      from public.profiles p
      where p.id = (v_meta->>'coach_id')::uuid
        and p.role = 'coach'
      limit 1;
    end if;

    -- Priority 2: landing page — coach_slug in metadata
    if v_coach is null and coalesce(v_meta->>'coach_slug', '') <> '' then
      select p.id into v_coach
      from public.coach_pages cp
      join public.profiles p on p.id = cp.coach_id
      where cp.slug = lower(btrim(v_meta->>'coach_slug'))
        and p.role = 'coach'
      limit 1;
    end if;

    if v_coach is not null then
      insert into public.coach_assignments (client_id, coach_id, assigned_by)
      values (new.id, v_coach, v_coach)
      on conflict (client_id) do nothing;
      return new;
    end if;

    -- Fallback: site client → general coach (admin)
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

-- ============================================================
-- PART 2 — coach_fees: fixed per-client fee, admin-editable
-- ============================================================
create table if not exists public.coach_fees (
  coach_id       uuid primary key references public.profiles(id) on delete cascade,
  fee_per_client numeric not null default 0 check (fee_per_client >= 0),
  currency       text not null default 'USD',
  updated_at     timestamptz not null default now()
);

alter table public.coach_fees enable row level security;

drop policy if exists coach_fees_admin_all on public.coach_fees;
create policy coach_fees_admin_all
  on public.coach_fees for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists coach_fees_coach_read_own on public.coach_fees;
create policy coach_fees_coach_read_own
  on public.coach_fees for select
  to authenticated
  using (coach_id = auth.uid());

-- ============================================================
-- PART 3 — reload PostgREST schema cache
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- VERIFY (run separately after the script succeeds)
--   select proname from pg_proc where proname='auto_assign_client_to_admin';
--   select * from public.coach_fees;   -- 0 rows is correct
-- ============================================================

-- END OF SCRIPT 0033
