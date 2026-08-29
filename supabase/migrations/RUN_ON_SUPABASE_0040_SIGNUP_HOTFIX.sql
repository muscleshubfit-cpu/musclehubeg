-- =====================================================================
-- RUN ON SUPABASE — 0040 SIGNUP HOTFIX (auto-assign metadata bug)
-- =====================================================================
-- ROOT CAUSE — proven by 0039 v3 PROBE-SIGNUP (owner output 2026-08-30):
--   SQLSTATE=42703  'record "new" has no field "raw_user_meta_data"'
--   auto_assign_client_to_admin() is a trigger ON public.profiles, but
--   0033 wrote it reading new.raw_user_meta_data — a column that only
--   exists on auth.users. Every client signup dies:
--     GoTrue inserts auth.users -> handle_new_user inserts profiles
--     -> trg_auto_assign_client fires -> 42703 -> whole insert aborts
--     -> GoTrue 500 «Database error saving new user».
--   Last successful signup = 2026-08-27 17:09 => broken since the 0033
--   rebuild was pasted (on/before 27 Aug) — NOT related to today's
--   USD/brand deploy (code was never the cause).
-- FIX — same 0033 logic, ONE thing changed:
--   v_meta is read from auth.users (by new.id) instead of the invalid
--   new.raw_user_meta_data. coach_emails guard, Priority 1 (coach_id
--   invite), Priority 2 (coach_slug landing), admin fallback — all
--   byte-identical to the 0033 intent. Function stays security definer.
-- Idempotent (create or replace). No tables/RLS/policies touched.
-- HOW TO PASTE SAFELY:
--   1. Copy from the RAW GitHub url ONLY (never the GitHub blob page).
--   2. Supabase → SQL Editor → NEW empty query → paste.
--   3. Press Ctrl+End — the LAST line must be:  END OF SCRIPT 0040
--   4. Run → expect:  Success + 3 small grids, and warning lines:
--        FIX-40 APPLIED ...
--        PROBE-40 SIGNUP OK ...
--        PROBE-40 CLEANUP OK ...
--      (If Supabase hides warnings, read grid V1: fix_present=t,
--       still_broken=f. Grid V2 probe reports the live verdict.)
-- =====================================================================

-- ============================================================
-- PART 1 — rebuild auto_assign_client_to_admin() with FIXED metadata source
-- ============================================================
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

    -- 0040 FIX: profiles has no raw_user_meta_data — read it from auth.users
    select coalesce(u.raw_user_meta_data, '{}'::jsonb) into v_meta
    from auth.users u
    where u.id = new.id;
    if v_meta is null then
      v_meta := '{}'::jsonb;  -- profile without an auth row — never attribute
    end if;
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
-- PART 2 — LIVE SIGNUP PROBE (replays the exact signup chain,
--          exercises Priority 2 miss -> admin fallback, then cleans up)
-- ============================================================
do $probe40$
declare
  v_id   uuid;
  v_ctx  text;
  v_prof boolean;
  v_asg  int;
begin
  delete from auth.users where email in
    ('diag-signup-40@example.com', 'diag-signup-probe@example.com');

  v_id := gen_random_uuid();

  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id,
      'authenticated', 'authenticated',
      'diag-signup-40@example.com',
      crypt('diag-40-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"0040 probe","coach_slug":"no-such-coach-40"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    select exists (select 1 from public.profiles where id = v_id) into v_prof;
    select count(*) into v_asg from public.coach_assignments where client_id = v_id;

    if v_prof then
      raise warning 'PROBE-40 SIGNUP OK >> profile created | coach_assignments rows=% (1 = admin fallback attached, 0 only if no admin profile)', v_asg;
    else
      raise warning 'PROBE-40 WARNING >> auth user inserted but NO profile row';
    end if;

    delete from auth.users where id = v_id;
    raise warning 'PROBE-40 CLEANUP OK >> probe user deleted (FK cascade)';

  exception when others then
    get stacked diagnostics v_ctx = PG_EXCEPTION_CONTEXT;
    raise warning 'PROBE-40 FAILED >> SQLSTATE=% | MSG=% | CONTEXT=[%]',
      sqlstate, sqlerrm, v_ctx;
    begin
      delete from auth.users where id = v_id;
      raise warning 'PROBE-40 CLEANUP OK >> failed probe user removed';
    exception when others then
      raise warning 'PROBE-40 CLEANUP FAILED >> %', sqlerrm;
    end;
  end;
end
$probe40$;

-- ============================================================
-- PART 3 — VERIFY grids
-- ============================================================
-- V1: must show  fix_present = t  |  still_broken = f
select
  position('from auth.users u' in pg_get_functiondef('public.auto_assign_client_to_admin()'::regprocedure)) > 0 as fix_present,
  position('new.raw_user_meta_data' in pg_get_functiondef('public.auto_assign_client_to_admin()'::regprocedure)) > 0 as still_broken;

-- V2: both triggers must still be attached (rebuild keeps them)
select event_object_table as tbl, trigger_name
from information_schema.triggers
where trigger_schema in ('auth','public')
  and event_object_table in ('users','profiles')
order by 1, 2;

-- V3: latest signups — after this fix, the next REAL signup lands here
select email, created_at from auth.users order by created_at desc limit 3;

-- END OF SCRIPT 0040
