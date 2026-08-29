-- ============================================================ 0039 ======
-- SIGNUP DIAGNOSTIC (2026-08-30) — REAL BUG FOUND BY THE USAGE TEST:
--   ALL signups fail with «Database error saving new user»
--   (auth/v1/signup → 500, admin.createUser → 500) since at least
--   2026-08-30. The auth.users → handle_new_user → profiles →
--   trg_auto_assign_client chain throws INSIDE the database; this
--   script makes the database TELL US the exact error.
--
-- READ THIS: this script WRITES NOTHING (every probe rolls back).
-- Run it in the Supabase SQL editor, then COPY THE FULL OUTPUT
-- (the Messages / Results tab) and send it back.
-- END OF SCRIPT 0039 — no schema is modified by this file.
-- =========================================================================

-- ============ PROBE A — profiles insert alone (no auth.users) ============
do $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.profiles (id, email, full_name, role)
  values (v_id, 'diag-profile-probe@example.com', 'diag probe', 'client');

  -- success → abort the DO block so NOTHING is saved
  raise exception 'PROBE-A OK: profiles insert works (rolled back, nothing saved)';
exception
  when others then
    raise exception 'PROBE-A FAILED >> SQLSTATE=% | SQLERRM=% | CONTEXT=%',
      sqlstate, sqlerrm, coalesce(sqlerrm, '') || ' ' || 'see CONTEXT above';
end $$;

-- ============ PROBE B — full signup replay (auth.users insert) ===========
do $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    'diag-signup-probe@example.com', crypt('diag-probe-password', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"diag probe"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- success → abort the DO block so NOTHING is saved
  raise exception 'PROBE-B OK: full signup chain works (rolled back, nothing saved)';
exception
  when others then
    raise exception 'PROBE-B FAILED >> SQLSTATE=% | SQLERRM=%',
      sqlstate, sqlerrm;
end $$;

-- ============ INVENTORY 1 — every custom trigger on the chain ============
select tgrelid::regclass as on_table, tgname as trigger_name,
       p.proname as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
  and not tgisinternal
order by 1, 2;

-- ============ INVENTORY 2 — live source of handle_new_user ===============
select prosrc as handle_new_user_source
from pg_proc where proname = 'handle_new_user';

-- ============ INVENTORY 3 — live source of auto_assign ===================
select prosrc as auto_assign_client_source
from pg_proc where proname = 'auto_assign_client_to_admin';

-- ============ INVENTORY 4 — profiles constraints (unique/not-null) =======
select conname as constraint_name, contype as type,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass;

-- ============ INVENTORY 5 — auth.users own state =========================
select count(*) as total_auth_users from auth.users;
select email, confirmed_at is not null as confirmed, created_at
from auth.users order by created_at desc limit 5;
-- ==================================================== END OF SCRIPT 0039
