-- =====================================================================
--  MuscleHubEG — Security RLS Hardening
--
--  Fixes three critical RLS gaps identified in the 2026-08-26 audit:
--
--  1. profiles:  users could self-promote to 'coach' by updating their
--     own role column (profiles_update_self had no WITH CHECK).
--  2. referral_earnings:  users could tamper with amount / status /
--     user_id on their own earnings rows (earnings_update_coach had
--     no WITH CHECK and allowed auth.uid() = user_id).
--  3. subscriptions:  users could self-upgrade their own tier /
--     end_date / status (subs_update_self_or_coach allowed
--     auth.uid() = client_id with no WITH CHECK).
--
--  Approach:
--  - profiles:   RLS WITH CHECK using a SECURITY DEFINER helper
--                get_profile_role() that reads the OLD role. Direct
--                client UPDATEs that change role are rejected. The
--                auto_promote_coach_if_allowed() SECURITY DEFINER
--                function bypasses RLS to set role='coach' for emails
--                listed in the new coach_emails table.
--  - referral_earnings:  BEFORE UPDATE trigger that blocks amount /
--                user_id / referral_id changes for non-coaches and
--                restricts status transitions to available→requested.
--  - subscriptions:  restrict UPDATE to coach-only (users can still
--                INSERT and SELECT their own rows).
--
--  Idempotent: safe to run multiple times.
--  Owner must run this in the Supabase SQL Editor, then execute
--  `NOTIFY pgrst, 'reload schema';`.
-- =====================================================================

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

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- The NEW role must match the OLD role — prevents self-promotion.
    -- auto_promote_coach_if_allowed() bypasses RLS (SECURITY DEFINER)
    -- so it is NOT affected by this check.
    and role is not distinct from public.get_profile_role(auth.uid())
  );

-- ---------- 4. referral_earnings: BEFORE UPDATE trigger ----------

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

drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (public.is_coach())
  with check (public.is_coach());

-- ---------- 6. Grant execute on new functions ----------

grant execute on function public.get_profile_role(uuid) to authenticated;
grant execute on function public.auto_promote_coach_if_allowed() to authenticated;
grant execute on function public.prevent_earnings_tamper() to authenticated;
