-- ============================================================ 0039 ======
-- SIGNUP DIAGNOSTIC v2 (2026-08-30) — REAL BUG FROM THE USAGE TEST:
--   ALL signups fail with «Database error saving new user»
--   (auth/v1/signup → 500, admin.createUser → 500).
--
-- v1 RESULT: PROBE-A hit profiles_id_fkey (expected — a profile cannot
-- exist without a real auth.users row), which ABORTED the script before
-- the real probe ran. v2 fixes that:
--   • NO aborting exceptions — every probe reports via WARNING and the
--     script always reaches the end.
--   • PROBE-SIGNUP replays the EXACT signup insert (auth.users row →
--     on_auth_user_created → handle_new_user → profiles →
--     trg_auto_assign_client) and surfaces SQLSTATE + SQLERRM +
--     PG_EXCEPTION_CONTEXT (the exact function and line that throws).
--   • Success path reports the created profile + assignment, then
--     DELETES the probe user (profile cascades via FK) — nothing left.
--
-- THIS SCRIPT WRITES NOTHING PERMANENT. Run it, then copy the FULL
-- "Messages" output back to the chat.
-- END OF SCRIPT 0039 — no schema is modified by this file.
-- =========================================================================

-- ============ PROBE — full signup replay (the real path) =================
do $$
declare
  v_id   uuid := gen_random_uuid();
  v_msg  text;
  v_ctx  text;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id,
      'authenticated', 'authenticated',
      'diag-signup-probe@example.com',
      crypt('diag-probe-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"diag probe"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    -- The insert + trigger chain survived — report what it created.
    select coalesce(
      (select 'profile created, role=' || role::text from public.profiles where id = v_id),
      'profile NOT created (trigger returned but inserted nothing)'
    ) into v_msg;

    select coalesce(
      (select 'assignment → coach=' || coach_id::text
         from public.coach_assignments where client_id = v_id),
      'no coach assignment'
    ) into v_ctx;

    -- Cleanup (profiles.id FK is ON DELETE CASCADE)
    delete from auth.users where id = v_id;

    raise warning 'PROBE-SIGNUP OK >> % | % (probe user deleted — nothing left behind)',
      v_msg, v_ctx;

  exception when others then
    get stacked diagnostics v_ctx = PG_EXCEPTION_CONTEXT;
    raise warning
      'PROBE-SIGNUP FAILED >> SQLSTATE=% | MSG=% | CONTEXT=[%]',
      sqlstate, sqlerrm, v_ctx;
    -- best-effort cleanup in case a partial row survived
    begin delete from auth.users where id = v_id; exception when others then null; end;
  end;
end $$;

-- ============ INVENTORY 1 — every custom trigger on the chain ============
select tgrelid::regclass as on_table,
       tgname            as trigger_name,
       p.proname         as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
  and not tgisinternal
order by 1, 2;

-- ============ INVENTORY 2 — live source of handle_new_user ===============
-- (which version is ACTUALLY deployed: 0001 casts metadata role to the
--  user_role enum; 0036 hardcodes 'client' and contains the text
--  "0036 HARDENING")
select prosrc as handle_new_user_source
from pg_proc where proname = 'handle_new_user';

-- ============ INVENTORY 3 — live source of auto_assign ===================
select prosrc as auto_assign_client_source
from pg_proc where proname = 'auto_assign_client_to_admin';

-- ============ INVENTORY 4 — profiles constraints ==========================
select conname as constraint_name, contype as type,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.profiles'::regclass;

-- ============ INVENTORY 5 — recent auth users (did ANY signup land?) =====
select count(*) as total_auth_users from auth.users;
select email, confirmed_at is not null as confirmed, created_at
from auth.users order by created_at desc limit 5;
-- ==================================================== END OF SCRIPT 0039
