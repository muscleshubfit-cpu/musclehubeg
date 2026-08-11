-- =====================================================================
--  MuscleHubEG — Fix subscriptions RLS + create notifications tables
--  Run in Supabase SQL Editor (Dashboard → SQL → New query → Run).
--  Idempotent — safe to run multiple times.
-- =====================================================================

-- ---------- 1. Fix subscriptions INSERT policy ----------
-- The original policy only allowed `auth.uid() = client_id` (self-insert).
-- But the COACH is the one who sets subscriptions, and the coach's auth.uid()
-- is NOT the client_id. So the coach got "new row violates row-level
-- security policy for table 'subscriptions'" when saving.
--
-- Fix: allow insert when auth.uid() = client_id OR is_coach().
drop policy if exists subs_insert_self on public.subscriptions;
drop policy if exists subs_insert_self_or_coach on public.subscriptions;
create policy subs_insert_self_or_coach
  on public.subscriptions for insert
  to authenticated
  with check (auth.uid() = client_id or public.is_coach());

-- ---------- 2. Create notifications table (for client notifications) ----------
-- Stores per-user notifications: plan activated, swap limit reached, etc.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

-- Allow users to see their own notifications; coaches can see all (for admin views)
drop policy if exists notifs_select_owner_or_coach on public.notifications;
create policy notifs_select_owner_or_coach
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id or public.is_coach());

-- Allow users to insert their own notifications; coaches can insert for any user
drop policy if exists notifs_insert_self on public.notifications;
drop policy if exists notifs_insert_self_or_coach on public.notifications;
create policy notifs_insert_self_or_coach
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_coach());

-- Allow users to mark their own notifications as read; coaches can update any
drop policy if exists notifs_update_self on public.notifications;
drop policy if exists notifs_update_self_or_coach on public.notifications;
create policy notifs_update_self_or_coach
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id or public.is_coach());

-- ---------- 3. Create admin_notifications table (for coach notifications) ----------
-- Stores global admin notifications: new client signup, new ticket, etc.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text,
  link text,
  target_role text not null default 'coach',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.admin_notifications enable row level security;

-- Only coaches can see admin notifications
drop policy if exists admin_notifs_select_coach on public.admin_notifications;
create policy admin_notifs_select_coach
  on public.admin_notifications for select
  to authenticated
  using (public.is_coach());

-- Only coaches can insert (system creates them on behalf of coach)
drop policy if exists admin_notifs_insert_coach on public.admin_notifications;
create policy admin_notifs_insert_coach
  on public.admin_notifications for insert
  to authenticated
  with check (public.is_coach());

-- Only coaches can mark as read
drop policy if exists admin_notifs_update_coach on public.admin_notifications;
create policy admin_notifs_update_coach
  on public.admin_notifications for update
  to authenticated
  using (public.is_coach());
