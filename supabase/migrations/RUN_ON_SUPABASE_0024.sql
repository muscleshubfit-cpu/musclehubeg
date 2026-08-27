-- =====================================================================
--  MuscleHubEG — Migration 0024: ai_jobs queue table
--
--  OWNER DIRECTIVE (2026-08-27): the ENTIRE AI system runs natively in
--  GitHub Actions (like the blog pipeline). EVO chat stays on Vercel
--  streaming. This single generic queue serves ALL batch AI work:
--    plan_nutrition | plan_workout | meal_regenerate |
--    exercise_regenerate | article_tool | social_post
--
--  FLOW: UI/Coach submits job via /api/ai/jobs (service-role insert,
--  server validates tiers + payload) → GHA workflow process-ai-jobs.yml
--  claims queued rows every 10 min and writes results back.
--
--  TAMPER-PROOF (same philosophy as evo_chat_usage / migration 0022):
--    • Browser RLS = SELECT own rows ONLY (requested_by = auth.uid()).
--    • NO insert/update/delete policies → nobody can forge results,
--      bump priorities, or read other users' jobs from DevTools.
--    • ALL writes go through the service-role key (RLS bypass) inside
--      trusted code paths only.
--
--  Idempotent — safe to run multiple times.
-- =====================================================================

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),

  -- One of: plan_nutrition | plan_workout | meal_regenerate |
  --         exercise_regenerate | article_tool | social_post
  -- (unconstrained text, matching house convention of
  --  blog_generation_queue.status — app layer enforces the list)
  job_type text not null,

  -- queued → processing → done | failed   (failed keeps error_message)
  status text not null default 'queued',

  -- All per-type inputs live here (sanitized by the enqueue API route)
  payload jsonb not null default '{}'::jsonb,

  -- Processor output written by the GHA runner only
  result jsonb,

  error_message text,

  -- Who asked for this (auth.users id; NULL for owner/anon ops tools)
  requested_by uuid references auth.users(id) on delete set null,

  attempts int not null default 0,

  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Runner claim order: oldest queued first
create index if not exists idx_ai_jobs_status_created
  on public.ai_jobs (status, created_at asc);

-- User polling: my recent jobs
create index if not exists idx_ai_jobs_requester_created
  on public.ai_jobs (requested_by, created_at desc);

-- Per-type dashboards / debugging
create index if not exists idx_ai_jobs_type_status
  on public.ai_jobs (job_type, status);

-- ---------------------------------------------------------------------
-- Row Level Security — READ OWN ROWS ONLY
-- ---------------------------------------------------------------------
alter table public.ai_jobs enable row level security;

drop policy if exists "users_select_own_ai_jobs" on public.ai_jobs;
create policy "users_select_own_ai_jobs" on public.ai_jobs
  for select to authenticated
  using (requested_by = auth.uid());

-- Deliberately NO policies for insert / update / delete:
-- service-role bypasses RLS for all writes. Anon gets nothing.

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- VERIFY — run after execution; every flag must be true
-- ---------------------------------------------------------------------
select
  to_regclass('public.ai_jobs')                                   is not null                    as ai_jobs_table_ok,
  (select count(*) from pg_indexes
     where schemaname='public' and tablename='ai_jobs')           >= 3                           as indexes_ok,
  (select count(*) from pg_policies
     where schemaname='public' and tablename='ai_jobs'
       and policyname='users_select_own_ai_jobs')                  = 1                           as select_policy_ok,
  (select relrowsecurity from pg_class
     where oid = 'public.ai_jobs'::regclass)                                                     as rls_enabled_ok;
