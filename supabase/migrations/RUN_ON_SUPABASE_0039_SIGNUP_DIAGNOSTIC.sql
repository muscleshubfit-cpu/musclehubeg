-- ============================================================ 0039 ======
-- SIGNUP DIAGNOSTIC v3 (2026-08-30) — REAL BUG FROM THE USAGE TEST:
--   ALL signups fail with «Database error saving new user»
--   (auth/v1/signup → 500, admin.createUser → 500).
--
-- WHY v3: v1 aborted early (Probe A hit the profiles→auth.users FK —
-- expected), v2 printed results as WARNINGS which are easy to miss.
-- v3 prints EVERYTHING as ONE result grid at the end — copy that grid.
--
-- THIS SCRIPT WRITES NOTHING PERMANENT (the probe user is deleted; the
-- only output is the final SELECT). Safe to run any number of times.
-- END OF SCRIPT 0039 — no schema is modified by this file.
-- =========================================================================

create temp table if not exists _mh_diag (k text, v text);
delete from _mh_diag;

-- ============ PROBE — full signup replay (the real path) =================
do $$
declare
  v_id    uuid := gen_random_uuid();
  v_info  text;
  v_asg   text;
  v_ctx   text;
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

    select coalesce(
      (select 'profile created, role=' || role::text from public.profiles where id = v_id),
      'profile NOT created'
    ) into v_info;
    select coalesce(
      (select 'assignment → ' || coach_id::text from public.coach_assignments where client_id = v_id),
      'no assignment'
    ) into v_asg;

    delete from auth.users where id = v_id;  -- profiles cascade via FK

    insert into _mh_diag values
      ('PROBE_RESULT', 'OK — trigger chain works | ' || v_info || ' | ' || v_asg || ' | probe user deleted');

  exception when others then
    get stacked diagnostics v_ctx = PG_EXCEPTION_CONTEXT;
    insert into _mh_diag values
      ('PROBE_RESULT', 'FAILED >> SQLSTATE=' || sqlstate || ' | MSG=' || sqlerrm || ' | CONTEXT=[' || v_ctx || ']');
    begin delete from auth.users where id = v_id; exception when others then null; end;
  end;
end $$;

-- ============ INVENTORY — all custom triggers on the chain ===============
do $$
declare r record; s text := '';
begin
  for r in
    select tgrelid::regclass::text as t, tgname, p.proname
    from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    where tgrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
      and not tgisinternal
    order by 1, 2
  loop
    s := s || r.t || ' :: ' || r.tgname || ' -> ' || r.proname || '  ||  ';
  end loop;
  insert into _mh_diag values ('TRIGGERS', coalesce(nullif(s,''), 'NONE FOUND'));
end $$;

-- ============ INVENTORY — live handle_new_user version ===================
do $$
declare src text;
begin
  select prosrc into src from pg_proc where proname = 'handle_new_user';
  insert into _mh_diag values
    ('HANDLE_NEW_USER_VERSION',
     case when src like '%0036 HARDENING%' then '0036 (hardened, role hardcoded client)'
          when src like '%::user_role%' then '0001 ORIGINAL (casts metadata role!)'
          else 'UNKNOWN VARIANT' end
     || ' | first 200 chars: ' || left(regexp_replace(src, '\s+', ' ', 'g'), 200));
end $$;

-- ============ INVENTORY — live auto_assign source ========================
do $$
declare src text;
begin
  select prosrc into src from pg_proc where proname = 'auto_assign_client_to_admin';
  insert into _mh_diag values
    ('AUTO_ASSIGN_SOURCE', left(regexp_replace(coalesce(src,'MISSING'), '\s+', ' ', 'g'), 300));
end $$;

-- ============ INVENTORY — profiles constraints ===========================
do $$
declare r record; s text := '';
begin
  for r in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint where conrelid = 'public.profiles'::regclass
  loop
    s := s || r.conname || ' : ' || r.def || '  ||  ';
  end loop;
  insert into _mh_diag values ('PROFILES_CONSTRAINTS', coalesce(nullif(s,''), 'NONE'));
end $$;

-- ============ INVENTORY — auth users summary =============================
insert into _mh_diag
select 'AUTH_USERS_SUMMARY',
       'count=' || count(*) ||
       ' | last signup=' || coalesce(max(created_at)::text,'none') ||
       ' (' || coalesce((select email from auth.users order by created_at desc limit 1),'-') || ')'
from auth.users;

-- ============ OUTPUT — the ONE grid to copy ==============================
select k, v from _mh_diag order by k;
-- ==================================================== END OF SCRIPT 0039
