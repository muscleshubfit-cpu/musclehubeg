-- =====================================================================
--  MuscleHub — Subscription requests table + RLS policies
--
--  This migration ensures the subscription_requests table exists with
--  proper RLS policies so that:
--    - Authenticated users can INSERT their own subscription requests
--    - Only coaches can SELECT/UPDATE/DELETE all requests
--    - The `plan_tier` column accepts both legacy values (starter, elite)
--      and new membership tier values (premium, pro, coaching)
-- =====================================================================

-- Create subscription_requests table if it doesn't exist
create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  whatsapp text,
  plan_tier text not null,
  duration_months int not null default 1,
  price_egp numeric,
  payment_method text check (payment_method in ('instapay', 'vodafone_cash')),
  receipt_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for sorting by created_at (dashboard view)
create index if not exists subscription_requests_created_at_idx
  on public.subscription_requests (created_at desc);

-- Index for filtering by status
create index if not exists subscription_requests_status_idx
  on public.subscription_requests (status);

-- Index for filtering by user_id
create index if not exists subscription_requests_user_id_idx
  on public.subscription_requests (user_id);

-- Index for filtering by plan_tier
create index if not exists subscription_requests_plan_tier_idx
  on public.subscription_requests (plan_tier);

-- ---------- Row Level Security ----------
alter table public.subscription_requests enable row level security;

-- Users can insert their own subscription requests
drop policy if exists "Users can submit subscription requests" on public.subscription_requests;
create policy "Users can submit subscription requests"
  on public.subscription_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only coaches can view all subscription requests
drop policy if exists "Coaches can view subscription requests" on public.subscription_requests;
create policy "Coaches can view subscription requests"
  on public.subscription_requests for select
  to authenticated
  using (public.is_coach());

-- Users can view their own subscription requests (for status tracking)
drop policy if exists "Users can view their own subscription requests" on public.subscription_requests;
create policy "Users can view their own subscription requests"
  on public.subscription_requests for select
  to authenticated
  using (auth.uid() = user_id);

-- Only coaches can update (approve/reject) subscription requests
drop policy if exists "Coaches can review subscription requests" on public.subscription_requests;
create policy "Coaches can review subscription requests"
  on public.subscription_requests for update
  to authenticated
  using (public.is_coach())
  with check (public.is_coach());

-- Only coaches can delete subscription requests
drop policy if exists "Coaches can delete subscription requests" on public.subscription_requests;
create policy "Coaches can delete subscription requests"
  on public.subscription_requests for delete
  to authenticated
  using (public.is_coach());
