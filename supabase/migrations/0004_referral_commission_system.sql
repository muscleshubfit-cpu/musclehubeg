-- =====================================================================
--  MuscleHubEG — Referral & Commission System
--  Run in Supabase SQL Editor (Dashboard → SQL → New query).
--  Idempotent — safe to run multiple times.
-- =====================================================================

-- ---------- 1. Add referral_code column to profiles ----------
alter table public.profiles
  add column if not exists referral_code text unique;

-- Auto-generate referral_code for existing profiles if missing
-- Format: first 4 chars of name + random 4 chars (e.g. AHMED7K3X)
insert into public.profiles (id, referral_code)
select
  p.id,
  upper(substr(coalesce(p.full_name, 'user'), 1, 4)) || substr(md5(random()::text), 1, 4)
from public.profiles p
where p.referral_code is null
on conflict (id) do nothing;

-- ---------- 2. referrals table ----------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid references public.profiles(id) on delete set null,
  referred_email text,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  commission_amount numeric(10,2) not null default 0,
  subscription_request_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_id);
create index if not exists idx_referrals_referred on public.referrals(referred_id);
create index if not exists idx_referrals_status on public.referrals(status);

alter table public.referrals enable row level security;

-- Users can see referrals where they are the referrer
drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
  on public.referrals for select
  to authenticated
  using (auth.uid() = referrer_id or public.is_coach());

-- Coaches can insert (for manual referrals)
drop policy if exists referrals_insert_coach on public.referrals;
create policy referrals_insert_coach
  on public.referrals for insert
  to authenticated
  with check (public.is_coach() or auth.uid() = referrer_id);

-- Coaches can update (to mark completed/rejected)
drop policy if exists referrals_update_coach on public.referrals;
create policy referrals_update_coach
  on public.referrals for update
  to authenticated
  using (public.is_coach());

-- ---------- 3. referral_earnings table ----------
create table if not exists public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'available', 'requested', 'paid')),
  created_at timestamptz not null default now(),
  requested_at timestamptz,
  paid_at timestamptz,
  payout_method text,
  payout_details text
);

create index if not exists idx_earnings_user on public.referral_earnings(user_id);
create index if not exists idx_earnings_status on public.referral_earnings(status);

alter table public.referral_earnings enable row level security;

-- Users can see their own earnings
drop policy if exists earnings_select_own on public.referral_earnings;
create policy earnings_select_own
  on public.referral_earnings for select
  to authenticated
  using (auth.uid() = user_id or public.is_coach());

-- Coaches can insert/update (when commission is earned, paid, etc.)
drop policy if exists earnings_insert_coach on public.referral_earnings;
create policy earnings_insert_coach
  on public.referral_earnings for insert
  to authenticated
  with check (public.is_coach() or auth.uid() = user_id);

drop policy if exists earnings_update_coach on public.referral_earnings;
create policy earnings_update_coach
  on public.referral_earnings for update
  to authenticated
  using (public.is_coach() or auth.uid() = user_id);

-- ---------- 4. referral_payouts table ----------
create table if not exists public.referral_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  method text not null check (method in ('cash_wallet', 'subscription_discount', 'bank_transfer')),
  wallet_number text,
  bank_details text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_payouts_user on public.referral_payouts(user_id);
create index if not exists idx_payouts_status on public.referral_payouts(status);

alter table public.referral_payouts enable row level security;

-- Users can see their own payout requests
drop policy if exists payouts_select_own on public.referral_payouts;
create policy payouts_select_own
  on public.referral_payouts for select
  to authenticated
  using (auth.uid() = user_id or public.is_coach());

-- Users can insert (create payout request)
drop policy if exists payouts_insert_own on public.referral_payouts;
create policy payouts_insert_own
  on public.referral_payouts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Coaches can update (approve/reject/pay)
drop policy if exists payouts_update_coach on public.referral_payouts;
create policy payouts_update_coach
  on public.referral_payouts for update
  to authenticated
  using (public.is_coach());

-- ---------- 5. Grant execute on is_coach() to anon + authenticated ----------
-- (already granted in previous migration, but re-grant for safety)
grant execute on function public.is_coach() to anon, authenticated;

-- ---------- 6. Create notification helper for referral earnings ----------
-- (reuses the existing notifications table from migration 0003)
