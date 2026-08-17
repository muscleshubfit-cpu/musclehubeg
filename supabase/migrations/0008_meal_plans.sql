-- =====================================================================
--  MuscleHub — Meal Planner saved plans
--
--  Stores user-built meal plans from the Meal Planner tool.
--  Limits based on membership tier (resets monthly):
--    Free:     1 saved plan,  max 3 meals per plan
--    Premium: 10 saved plans, max 6 meals per plan
--    Pro:     50 saved plans, max 8 meals per plan
--    Coaching: unlimited
-- =====================================================================

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  -- Array of meals; each meal has a name (e.g. "Breakfast") and items[]
  -- Each item: { name, source, grams, per100g: {calories,protein,carbs,fat} }
  plan_data jsonb not null,
  -- Quick lookup stats (denormalized for fast admin views)
  total_calories int,
  total_protein  int,
  total_carbs    int,
  total_fat       int,
  meal_count     int,
  created_at timestamptz not null default now()
);

create index if not exists meal_plans_user_id_idx
  on public.meal_plans (user_id, created_at desc);

alter table public.meal_plans enable row level security;

drop policy if exists "Users can insert their own meal plans" on public.meal_plans;
create policy "Users can insert their own meal plans"
  on public.meal_plans for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own meal plans" on public.meal_plans;
create policy "Users can view their own meal plans"
  on public.meal_plans for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own meal plans" on public.meal_plans;
create policy "Users can delete their own meal plans"
  on public.meal_plans for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own meal plans" on public.meal_plans;
create policy "Users can update their own meal plans"
  on public.meal_plans for update
  to authenticated
  using (auth.uid() = user_id);
