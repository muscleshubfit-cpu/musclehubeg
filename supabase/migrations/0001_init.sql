-- =====================================================================
--  MuscleHubEG — Supabase schema (FINAL, fixes RLS recursion)
--
--  IMPORTANT: This migration uses a SECURITY DEFINER function is_coach()
--  to avoid infinite recursion in RLS policies. The original migration
--  had policies like:
--    USING (auth.uid() = id OR EXISTS(SELECT 1 FROM profiles WHERE ...))
--  which query profiles FROM INSIDE profiles' own RLS → infinite recursion.
--
--  Run this in the Supabase SQL Editor (Dashboard → SQL → New query),
--  or with the Supabase CLI:  supabase db push
-- =====================================================================

-- ---------- is_coach() helper function (SECURITY DEFINER) ----------
-- Reads the profiles table with the owner's privileges, avoiding RLS recursion.
create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coach'
  )
$$;

-- ---------- Enum types ----------
do $$ begin
  create type user_role as enum ('client', 'coach');
exception when duplicate_object then null; end $$;
do $$ begin
  create type questionnaire_status as enum ('draft', 'submitted', 'approved', 'needs_info');
exception when duplicate_object then null; end $$;
do $$ begin
  create type subscription_status as enum ('active', 'expired', 'pending');
exception when duplicate_object then null; end $$;
do $$ begin
  create type plan_type as enum ('meal', 'workout');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ticket_status as enum ('open', 'pending', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type ticket_priority as enum ('low', 'normal', 'high');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role user_role not null default 'client',
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Auto-create a profile when a new auth user signs up
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
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- profiles policies (use is_coach() to avoid recursion)
drop policy if exists profiles_select_self_or_coach on public.profiles;
create policy profiles_select_self_or_coach
  on public.profiles for select
  using (auth.uid() = id or public.is_coach());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------- subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null,
  months int not null default 3,
  start_date timestamptz,
  end_date timestamptz,
  status subscription_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (client_id)
);
alter table public.subscriptions enable row level security;

drop policy if exists subs_select_owner_or_coach on public.subscriptions;
create policy subs_select_owner_or_coach
  on public.subscriptions for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists subs_insert_self on public.subscriptions;
create policy subs_insert_self
  on public.subscriptions for insert
  with check (auth.uid() = client_id);

drop policy if exists subs_update_self_or_coach on public.subscriptions;
create policy subs_update_self_or_coach
  on public.subscriptions for update
  using (auth.uid() = client_id or public.is_coach());

-- ---------- nutrition_questionnaires ----------
create table if not exists public.nutrition_questionnaires (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status questionnaire_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);
alter table public.nutrition_questionnaires enable row level security;

drop policy if exists nutriq_owner_or_coach on public.nutrition_questionnaires;
create policy nutriq_owner_or_coach
  on public.nutrition_questionnaires for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists nutriq_insert_self on public.nutrition_questionnaires;
create policy nutriq_insert_self
  on public.nutrition_questionnaires for insert
  with check (auth.uid() = client_id);

drop policy if exists nutriq_update_self_or_coach on public.nutrition_questionnaires;
create policy nutriq_update_self_or_coach
  on public.nutrition_questionnaires for update
  using (auth.uid() = client_id or public.is_coach());

-- ---------- fitness_questionnaires ----------
create table if not exists public.fitness_questionnaires (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status questionnaire_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);
alter table public.fitness_questionnaires enable row level security;

drop policy if exists fitq_owner_or_coach on public.fitness_questionnaires;
create policy fitq_owner_or_coach
  on public.fitness_questionnaires for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists fitq_insert_self on public.fitness_questionnaires;
create policy fitq_insert_self
  on public.fitness_questionnaires for insert
  with check (auth.uid() = client_id);

drop policy if exists fitq_update_self_or_coach on public.fitness_questionnaires;
create policy fitq_update_self_or_coach
  on public.fitness_questionnaires for update
  using (auth.uid() = client_id or public.is_coach());

-- ---------- progress_entries ----------
create table if not exists public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  weight numeric,
  waist numeric,
  chest numeric,
  hips numeric,
  arm numeric,
  neck numeric,
  energy int check (energy is null or energy between 1 and 10),
  adherence int check (adherence is null or adherence between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.progress_entries enable row level security;

drop policy if exists progress_owner_or_coach on public.progress_entries;
create policy progress_owner_or_coach
  on public.progress_entries for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists progress_insert_self on public.progress_entries;
create policy progress_insert_self
  on public.progress_entries for insert
  with check (auth.uid() = client_id);

drop policy if exists progress_update_self on public.progress_entries;
create policy progress_update_self
  on public.progress_entries for update
  using (auth.uid() = client_id);

-- ---------- plans ----------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  type plan_type not null,
  title text not null,
  notes text,
  file_url text,
  content jsonb,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;

drop policy if exists plans_owner_or_coach on public.plans;
create policy plans_owner_or_coach
  on public.plans for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists plans_insert_coach on public.plans;
create policy plans_insert_coach
  on public.plans for insert
  with check (public.is_coach());

drop policy if exists plans_update_coach on public.plans;
create policy plans_update_coach
  on public.plans for update
  using (public.is_coach());

drop policy if exists plans_delete_coach on public.plans;
create policy plans_delete_coach
  on public.plans for delete
  using (public.is_coach());

-- ---------- support_tickets ----------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;

drop policy if exists tickets_owner_or_coach on public.support_tickets;
create policy tickets_owner_or_coach
  on public.support_tickets for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists tickets_insert_self on public.support_tickets;
create policy tickets_insert_self
  on public.support_tickets for insert
  with check (auth.uid() = client_id);

drop policy if exists tickets_update_coach on public.support_tickets;
create policy tickets_update_coach
  on public.support_tickets for update
  using (auth.uid() = client_id or public.is_coach());

-- ---------- ticket_messages ----------
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.ticket_messages enable row level security;

drop policy if exists ticket_msgs_owner_or_coach on public.ticket_messages;
create policy ticket_msgs_owner_or_coach
  on public.ticket_messages for select
  using (
    exists(select 1 from public.support_tickets t where t.id = ticket_id and (t.client_id = auth.uid() or public.is_coach()))
  );

drop policy if exists ticket_msgs_insert_self_or_coach on public.ticket_messages;
create policy ticket_msgs_insert_self_or_coach
  on public.ticket_messages for insert
  with check (
    sender_id = auth.uid() and
    exists(select 1 from public.support_tickets t where t.id = ticket_id and (t.client_id = auth.uid() or public.is_coach()))
  );

-- ---------- chat_messages ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;

drop policy if exists chat_owner_or_coach on public.chat_messages;
create policy chat_owner_or_coach
  on public.chat_messages for select
  using (auth.uid() = client_id or public.is_coach());

drop policy if exists chat_insert_self on public.chat_messages;
create policy chat_insert_self
  on public.chat_messages for insert
  with check (auth.uid() = client_id);

-- ---------- Make a user a coach (run after first signup) ----------
-- update public.profiles set role = 'coach' where email = 'your-email@example.com';
