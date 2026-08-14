create table if not exists public.blog_generation_queue (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  focus_keyword text not null,
  category text not null default 'nutrition',
  rationale text default '',
  status text not null default 'topic_picked',
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
