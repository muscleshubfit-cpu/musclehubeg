-- ============================================================ 0037 ======
-- COACH BOOST (owner-approved 2026-08-30):
--   A) coach_pages: public profile enrichment (personal photo, client
--      results photos, social links)
--   B) coach_ads: «أعلن معنا» — fixed-duration ad subscriptions
--      (fixed price from wallet; NEVER percentage — owner law)
--   C) coach_support_messages: coach → site support channel (separate
--      from the site's client support; client support belongs to coach)
--   D) storage bucket "coach-public": PUBLIC read bucket for coach
--      profile photos (private buckets would 403 on the public page)
-- Idempotent. Run via raw link in Supabase SQL editor. END OF SCRIPT 0037
-- =========================================================================

-- PART A — coach_pages enrichment columns -------------------------------
alter table public.coach_pages add column if not exists photo_url text not null default '';
alter table public.coach_pages add column if not exists results_photos jsonb not null default '[]'::jsonb;
alter table public.coach_pages add column if not exists instagram_url text not null default '';
alter table public.coach_pages add column if not exists facebook_url text not null default '';
alter table public.coach_pages add column if not exists tiktok_url text not null default '';
alter table public.coach_pages add column if not exists youtube_url text not null default '';
-- Coach's own WhatsApp number (digits only, intl form e.g. 2010XXXXXXXX).
-- Surfaced to HIS activated clients via /api/my/coach-whatsapp (server
-- gates on an active subscription) — never on the public landing page.
alter table public.coach_pages add column if not exists whatsapp_phone text not null default '';

-- PART B — coach_ads ------------------------------------------------------
create table if not exists public.coach_ads (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  package_id  text not null check (package_id in ('week','month','quarter')),
  days        int  not null check (days between 1 and 365),
  price_egp   numeric not null check (price_egp >= 0),
  status      text not null default 'active' check (status in ('active','cancelled')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_coach_ads_active
  on public.coach_ads(status, ends_at desc);
alter table public.coach_ads enable row level security;
drop policy if exists coach_ads_owner_read on public.coach_ads;
create policy coach_ads_owner_read on public.coach_ads for select
  using (auth.uid() = coach_id);
-- Writes happen ONLY through the service role (server route debits the
-- wallet atomically) — no client-side insert/update policies on purpose.

-- PART C — coach_support_messages -----------------------------------------
create table if not exists public.coach_support_messages (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.coach_support_messages(id) on delete cascade,
  sender_role text not null default 'coach' check (sender_role in ('coach','admin')),
  subject     text not null default '',
  body        text not null,
  status      text not null default 'open' check (status in ('open','answered','closed')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_coach_support_coach
  on public.coach_support_messages(coach_id, created_at desc);
alter table public.coach_support_messages enable row level security;
drop policy if exists coach_support_owner_read on public.coach_support_messages;
create policy coach_support_owner_read on public.coach_support_messages for select
  using (auth.uid() = coach_id);
drop policy if exists coach_support_owner_insert on public.coach_support_messages;
create policy coach_support_owner_insert on public.coach_support_messages for insert
  with check (auth.uid() = coach_id and sender_role = 'coach');
-- Admin replies run through the service role (/api/admin/coach-support).

-- PART D — PUBLIC storage bucket for coach photos -------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-public','coach-public', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists coach_public_read on storage.objects;
create policy coach_public_read on storage.objects for select
  using (bucket_id = 'coach-public');
drop policy if exists coach_public_owner_insert on storage.objects;
create policy coach_public_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'coach-public'
              and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists coach_public_owner_update on storage.objects;
create policy coach_public_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'coach-public'
         and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists coach_public_owner_delete on storage.objects;
create policy coach_public_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'coach-public'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- VERIFY (run these — expect the values shown):
--   select column_name from information_schema.columns
--     where table_name='coach_pages'
--       and column_name in ('photo_url','results_photos','instagram_url','facebook_url','tiktok_url','youtube_url','whatsapp_phone');
--   → 7 rows
--   select tablename, policyname from pg_policies
--     where tablename in ('coach_ads','coach_support_messages') order by 1;
--   → coach_ads: coach_ads_owner_read | coach_support_messages: 2 policies
--   select id, public from storage.buckets where id='coach-public';
--   → coach-public | true
--   select policyname from pg_policies where schemaname='storage'
--     and tablename='objects' and policyname like 'coach_public%';
--   → 4 rows
-- ==================================================== END OF SCRIPT 0037
