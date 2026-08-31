-- ============================================================================
-- RUN_ON_SUPABASE_0055_RESTORE_SECURITY_GUARDS.sql
-- 0055 — RESTORE security guards that the GitHub-integration partial
--        migration re-run (Phase 61, 0001-0005 executed from scratch)
--        unintentionally reverted, + re-promote the test admin account.
--
-- WHY NOW (Phase 61-62 forensics, 2026-08-31):
--   The GitHub integration re-executed digit-named original migrations
--   0001-0005. Those files predate the security hardenings and recreated
--   THREE objects with their OLD weak definitions:
--     1. handle_new_user()         → 0036's hardening was replaced by the
--                                    0001 version that trusts client
--                                    metadata role (self-promotion hole)
--     2. profiles_update_self      → 0017's WITH CHECK (role is immutable
--                                    by self) was replaced by the 0001
--                                    version with no WITH CHECK (any
--                                    column, incl. role, was writable)
--     3. subs_update_self_or_coach → 0017's coach-only version was
--                                    replaced by the weaker 0001 version
--   Consequence observed: the admin.test account's profile row had its
--   role flipped to 'client' (write was possible through hole #2).
--
-- WHAT THIS SCRIPT DOES (idempotent — safe to re-run):
--   PART 1  Re-apply 0036 hardened handle_new_user() (role is ALWAYS
--           'client' server-side; no metadata trust)
--   PART 2  Re-apply 0017 hardened profiles_update_self (role cannot be
--           changed through self-updates ever again)
--   PART 3  Re-apply 0017 coach-only subscriptions update policy
--   PART 4  Re-promote admin.test@musclehub-test.com to role='admin'
--   PART 5  Verification grid
--
-- RUN: Supabase Dashboard → SQL Editor → paste → Run → reply تم
-- ============================================================================

-- ─────────────────────────── PART 1 ───────────────────────────
-- 0036 HARDENING (verbatim body): signup role is NEVER client-sent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    -- 0036 HARDENING: role is decided SERVER-SIDE ONLY (admin staff
    -- route / coach register route). Client metadata can never set it.
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── PART 2 ───────────────────────────
-- 0017 HARDENING (verbatim wording): self-updates can never change role.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role is not distinct from public.get_profile_role(auth.uid())
  );

-- ─────────────────────────── PART 3 ───────────────────────────
-- 0017 HARDENING (verbatim wording): subscriptions update = coach only.
drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (public.is_coach())
  with check (public.is_coach());

-- ─────────────────────────── PART 4 ───────────────────────────
-- Re-promote the Phase 60/61 test admin account (marked تجربة).
update public.profiles
set role = 'admin'
where email = 'admin.test@musclehub-test.com';

-- ─────────────────────────── PART 5 ───────────────────────────
-- VERIFICATION GRID (must show: role=admin for admin.test · the two
-- hardened policies present · handle_new_user body contains 'client').
select
  (select role from public.profiles where email = 'admin.test@musclehub-test.com') as admin_test_role,
  (select count(*) from pg_policies where tablename='profiles' and policyname='profiles_update_self' and coalesce(with_check,'') like '%get_profile_role%') as hardened_profile_policy,
  (select count(*) from pg_policies where tablename='subscriptions' and policyname='subs_update_self_or_coach' and coalesce(with_check,'') like '%is_coach%') as hardened_subs_policy,
  (select position('client' in prosrc) > 0 from pg_proc where proname='handle_new_user') as hardened_signup_fn;

notify pgrst, 'reload schema';
