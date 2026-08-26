-- =====================================================================
--  MuscleHubEG — Unified Run Script for Production Supabase
--
--  Purpose: Apply migrations 0017 (Security RLS Hardening) and
--           0018 (extend_subscription RPC) to the production database.
--
--  Date: 2026-08-26
--  Author: Implementation Agent (per AGENTS.md §3.3 + §6)
--
--  ⚠️  HOW TO RUN (read carefully):
--
--  1. Open the Supabase Dashboard for the production project:
--     https://supabase.com/dashboard/project/wyopqryzfjifyeyvyxfy/sql/new
--
--  2. Paste this ENTIRE file into the SQL Editor.
--
--  3. Click "Run" (Ctrl/Cmd + Enter). Wait for "Success. No rows
--     returned" — this typically takes 1-3 seconds.
--
--  4. After the script completes, run the following SEPARATE statement
--     to refresh the PostgREST schema cache so the new RPCs are
--     immediately callable:
--
--         NOTIFY pgrst, 'reload schema';
--
--  5. Verify the migration succeeded by running the verification
--     queries at the bottom of this file (section 7).
--
--  Safety:
--  - This script is IDEMPOTENT — safe to run multiple times.
--  - It does NOT modify any existing data (only adds policies,
--    functions, a trigger, and a new table).
--  - The profiles_update_self policy change may briefly reject
--    concurrent user profile updates while the policy is being
--    replaced (sub-millisecond window — negligible).
--
--  Rollback (if needed):
--  - To revert migration 0017, run the rollback script in
--    section 8 below.
--  - To revert migration 0018, run:
--        drop function if exists public.extend_subscription(uuid, text, int, text);
--  - Code changes that depend on these migrations (commits
--    dcd82c6, 9f4053e) must also be reverted via git revert.
-- =====================================================================


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 0017 — Security RLS Hardening                         ║
-- ║  (fixes C1, C2, C3-subscriptions from the 2026-08-26 audit)      ║
-- ╚══════════════════════════════════════════════════════════════════╝


-- ---------- 0. coach_emails table (authoritative allowlist) ----------

create table if not exists public.coach_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.coach_emails enable row level security;

drop policy if exists coach_emails_select_coach on public.coach_emails;
create policy coach_emails_select_coach
  on public.coach_emails for select
  to authenticated
  using (public.is_coach());

-- Seed the Owner's coach email (already public in src/lib/data.ts as
-- the COACH_EMAILS fallback). Additional emails can be added via:
--   insert into public.coach_emails (email) values ('new@email.com');
insert into public.coach_emails (email)
values ('speerr@gmail.com')
on conflict (email) do nothing;


-- ---------- 1. get_profile_role() — SECURITY DEFINER helper ----------

create or replace function public.get_profile_role(p_user_id uuid)
returns user_role
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = p_user_id;
$$;


-- ---------- 2. auto_promote_coach_if_allowed() — bypasses RLS ----------
--
-- Called by src/lib/data.ts (fetchProfile) when a user logs in whose
-- email is in the coach_emails allowlist. The function bypasses RLS
-- (SECURITY DEFINER) to set role='coach' — direct client UPDATEs are
-- now blocked by the tightened profiles_update_self policy (section 3).

create or replace function public.auto_promote_coach_if_allowed()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Get the calling user's email
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then
    return false;
  end if;

  -- Check if the email is in the coach allowlist
  if exists (
    select 1 from public.coach_emails
    where lower(email) = lower(v_email)
  ) then
    -- Bypass RLS (SECURITY DEFINER) to set role = 'coach'
    update public.profiles set role = 'coach' where id = auth.uid();
    return true;
  end if;

  return false;
end;
$$;


-- ---------- 3. profiles: tighten UPDATE policy ----------
--
-- Before: using (auth.uid() = id)  → no WITH CHECK → any column change allowed
-- After:  WITH CHECK ensures NEW.role = OLD.role (via get_profile_role).
--         Self-promotion to 'coach' is now blocked at the DB level.
--         auto_promote_coach_if_allowed() bypasses RLS (SECURITY DEFINER).

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role is not distinct from public.get_profile_role(auth.uid())
  );


-- ---------- 4. referral_earnings: BEFORE UPDATE trigger ----------
--
-- Before: earnings_update_coach had no WITH CHECK + allowed auth.uid() = user_id
--         → users could change amount, status, user_id on their own rows.
-- After:  trigger blocks amount/user_id/referral_id changes for non-coaches
--         and restricts status transitions to available→requested (the
--         payout-request flow). Coaches bypass via is_coach().

create or replace function public.prevent_earnings_tamper()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Coaches can do anything
  if public.is_coach() then
    return NEW;
  end if;

  -- Non-coach users (the row owner) can only:
  -- 1. NOT change amount
  if NEW.amount is distinct from OLD.amount then
    raise exception 'Permission denied: cannot change earnings amount';
  end if;

  -- 2. NOT change user_id
  if NEW.user_id is distinct from OLD.user_id then
    raise exception 'Permission denied: cannot change earnings user_id';
  end if;

  -- 3. NOT change referral_id
  if NEW.referral_id is distinct from OLD.referral_id then
    raise exception 'Permission denied: cannot change earnings referral_id';
  end if;

  -- 4. Status can only change from 'available' to 'requested'
  --    (this is the payout-request flow)
  if NEW.status is distinct from OLD.status then
    if not (OLD.status = 'available' and NEW.status = 'requested') then
      raise exception 'Permission denied: can only request payout for available earnings';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists prevent_earnings_tamper on public.referral_earnings;
create trigger prevent_earnings_tamper
  before update on public.referral_earnings
  for each row
  execute function public.prevent_earnings_tamper();


-- ---------- 5. subscriptions: restrict UPDATE to coach-only ----------
--
-- Before: using (auth.uid() = client_id or is_coach()) → no WITH CHECK
--         → users could self-upgrade tier, end_date, status.
-- After:  UPDATE is coach-only (users can still INSERT + SELECT their
--         own rows; PayPal capture uses supabaseAdmin server-side which
--         bypasses RLS, and coach approval uses the authenticated coach
--         session).

drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (public.is_coach())
  with check (public.is_coach());


-- ---------- 6. Grant execute on new functions ----------

grant execute on function public.get_profile_role(uuid) to authenticated;
grant execute on function public.auto_promote_coach_if_allowed() to authenticated;
grant execute on function public.prevent_earnings_tamper() to authenticated;


-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 0018 — extend_subscription() RPC                      ║
-- ║  (fixes C10 from the 2026-08-26 audit)                           ║
-- ╚══════════════════════════════════════════════════════════════════╝


-- ---------- extend_subscription() — atomic subscription extension ----------
--
-- Replaces the old upsert({start_date: now, end_date: now+months})
-- which OVERWROTE existing rows — users lost remaining paid days on
-- early renewal.
--
-- Logic:
--   - Existing + active (end_date > now):  new_end = end_date + months
--   - Existing + expired (end_date <= now): new_end = now + months
--   - No existing row:                      insert new, start=now, end=now+months
--
-- Uses FOR UPDATE row lock to prevent concurrent renewal races.

create or replace function public.extend_subscription(
  p_client_id uuid,
  p_tier text,
  p_months int,
  p_subscription_type text default 'membership'
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions%rowtype;
  v_end timestamptz;
  v_months_total int;
begin
  -- Try to fetch existing subscription with a row lock
  select * into v_row
  from public.subscriptions
  where client_id = p_client_id and tier = p_tier
  for update;

  if found then
    -- Extend from the later of existing end_date or now
    if v_row.end_date is not null and v_row.end_date > now() then
      v_end := v_row.end_date + make_interval(months => p_months);
    else
      v_end := now() + make_interval(months => p_months);
    end if;

    v_months_total := coalesce(v_row.months, 0) + p_months;

    update public.subscriptions
    set
      end_date = v_end,
      months = v_months_total,
      status = 'active'
    where id = v_row.id
    returning * into v_row;

    return v_row;
  else
    -- New subscription
    v_end := now() + make_interval(months => p_months);

    insert into public.subscriptions
      (client_id, tier, months, start_date, end_date, status, subscription_type)
    values
      (p_client_id, p_tier, p_months, now(), v_end, 'active', p_subscription_type)
    returning * into v_row;

    return v_row;
  end if;
end;
$$;

-- Grant execute to authenticated users (coaches call this from client-side
-- reviewSubscriptionRequest; server-side capture-order uses supabaseAdmin)
grant execute on function public.extend_subscription(uuid, text, int, text) to authenticated;


-- =====================================================================
--  7. VERIFICATION QUERIES
--  Run these AFTER the script + NOTIFY to confirm everything is in place.
--  Each query should return a non-empty result.
-- =====================================================================

-- Verify 0017 section 0: coach_emails table exists + Owner email seeded
-- select * from public.coach_emails;
-- Expected: 1 row with email = 'speerr@gmail.com'

-- Verify 0017 section 1-2: functions exist
-- select proname from pg_proc where proname in ('get_profile_role', 'auto_promote_coach_if_allowed', 'prevent_earnings_tamper');
-- Expected: 3 rows

-- Verify 0017 section 3: profiles_update_self policy has WITH CHECK
-- select polname, polqual, polwithcheck from pg_policy where polname = 'profiles_update_self';
-- Expected: 1 row with polwithcheck NOT NULL

-- Verify 0017 section 4: trigger exists
-- select tgname from pg_trigger where tgname = 'prevent_earnings_tamper';
-- Expected: 1 row

-- Verify 0017 section 5: subs_update policy is coach-only
-- select polname, polqual, polwithcheck from pg_policy where polname = 'subs_update_self_or_coach';
-- Expected: 1 row, polqual contains 'is_coach'

-- Verify 0018: extend_subscription function exists
-- select proname from pg_proc where proname = 'extend_subscription';
-- Expected: 1 row


-- =====================================================================
--  8. ROLLBACK SCRIPT (run ONLY if you need to revert)
--  ⚠️  This reverts the security hardening — only use if a critical
--      regression is found. Code changes (commits dcd82c6, 9f4053e)
--      must ALSO be reverted via git revert.
-- =====================================================================

-- -- Revert 0018:
-- drop function if exists public.extend_subscription(uuid, text, int, text);

-- -- Revert 0017:
-- drop trigger if exists prevent_earnings_tamper on public.referral_earnings;
-- drop function if exists public.prevent_earnings_tamper();
-- drop function if exists public.auto_promote_coach_if_allowed();
-- drop function if exists public.get_profile_role(uuid);

-- -- Restore original (vulnerable) policies — ONLY if rolling back
-- drop policy if exists profiles_update_self on public.profiles;
-- create policy profiles_update_self
--   on public.profiles for update
--   using (auth.uid() = id);

-- drop policy if exists subs_update_self_or_coach on public.subscriptions;
-- create policy subs_update_self_or_coach
--   on public.subscriptions for update
--   using (auth.uid() = client_id or public.is_coach());

-- -- Note: referral_earnings original policy allowed auth.uid() = user_id
-- drop policy if exists earnings_update_coach on public.referral_earnings;
-- create policy earnings_update_coach
--   on public.referral_earnings for update
--   to authenticated
--   using (public.is_coach() or auth.uid() = user_id);

-- -- Optional: drop coach_emails table (if you want a full revert)
-- -- drop table if exists public.coach_emails;

-- -- Don't forget to refresh the schema cache after rollback:
-- -- NOTIFY pgrst, 'reload schema';
