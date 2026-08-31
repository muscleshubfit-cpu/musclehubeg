-- =====================================================================
--  MuscleHub — Saved tool results table
--
--  Stores results from the free tools (calorie, BMI, macro, body fat)
--  so users can revisit them later. Limits based on membership tier:
--    Free: 3 results
--    Premium: 50 results
--    Pro: 200 results
-- =====================================================================

create table if not exists public.saved_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_slug text not null check (tool_slug in ('calorie-calculator', 'bmi-calculator', 'macro-calculator', 'body-fat-calculator', 'water-tracker')),
  title text,
  result_data jsonb not null,
  created_at timestamptz not null default now()
);

-- Index for user's results (sorted by date)
create index if not exists saved_results_user_id_idx
  on public.saved_results (user_id, created_at desc);

-- Row Level Security
alter table public.saved_results enable row level security;

-- Users can INSERT their own results
create policy "Users can save their own results"
  on public.saved_results for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can SELECT their own results
create policy "Users can view their own results"
  on public.saved_results for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can DELETE their own results
create policy "Users can delete their own results"
  on public.saved_results for delete
  to authenticated
  using (auth.uid() = user_id);
