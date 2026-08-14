-- =====================================================================
--  MuscleHubEG — Blog Generation Queue
--  Run in Supabase SQL Editor. Safe to run multiple times.
--  This table stores the intermediate state of the 3-step blog
--  generation pipeline (pick → generate → publish).
-- =====================================================================

create table if not exists public.blog_generation_queue (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  focus_keyword text not null,
  category text not null default 'nutrition',
  rationale text default '',
  status text not null default 'topic_picked'
    check (status in ('topic_picked', 'generating', 'generated', 'published', 'failed', 'skipped_duplicate')),
  article_bundle jsonb,
  error_message text,
  en_post_id uuid,
  ar_post_id uuid,
  created_at timestamptz not null default now(),
  generated_at timestamptz,
  published_at timestamptz
);

create index if not exists idx_blog_queue_status on public.blog_generation_queue(status);
create index if not exists idx_blog_queue_created on public.blog_generation_queue(created_at desc);

alter table public.blog_generation_queue enable row level security;

-- Only coaches/admins can see the queue
drop policy if exists blog_queue_select_coach on public.blog_generation_queue;
create policy blog_queue_select_coach
  on public.blog_generation_queue for select
  to authenticated
  using (public.is_coach());

-- Only service role (server-side) can insert/update
-- (No RLS policy for insert/update = blocked for authenticated users,
--  but service_role bypasses RLS so server-side code works fine)
