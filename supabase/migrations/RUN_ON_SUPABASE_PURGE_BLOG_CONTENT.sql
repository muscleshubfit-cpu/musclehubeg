-- =====================================================================
--  MuscleHubEG — PURGE ALL BLOG CONTENT (posts + generation queue)
--  Owner directive (2026-08-27): every current article and every
--  pending queue title is low-quality junk → delete ALL of them and
--  everything attached to them.
--
--  What gets deleted:
--    • public.blog_posts             → all rows (published + drafts +
--                                      featured_image URLs, EN/AR links,
--                                      FAQ/schema JSON — all inside the
--                                      deleted rows)
--    • public.blog_generation_queue  → all rows (pending / in-flight /
--                                      stuck titles + article bundles)
--
--  What needs NO manual step (verified against the codebase):
--    • Blog images live as EXTERNAL urls inside the deleted rows
--      (no Supabase Storage bucket is used for blog images).
--    • The EN↔AR link column lives inside the same table.
--    • sitemap.xml and the "related posts" duplicate-detector read
--      the table live → they self-clean on next request/run.
--
--  HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste
--  this whole file → Run. Atomic single transaction: either deletes
--  everything or nothing. Safe to run again at any time.
-- =====================================================================

-- ---------- 0. Quick look BEFORE deleting ----------
select
  (select count(*) from public.blog_posts)            as posts_to_delete,
  (select count(*) from public.blog_generation_queue) as queue_items_to_delete;

begin;

-- ---------- 1. Safety snapshots (kept OUTSIDE the app) ----------
-- These _purge_backup_* tables are never read by the website or admin,
-- so once purged nothing old appears anywhere. They exist ONLY so you
-- can restore later if you ever want to. Remove them anytime with the
-- one-liners at the bottom of this file.
drop table if exists public._purge_backup_blog_posts;
create table public._purge_backup_blog_posts as
  select * from public.blog_posts;

drop table if exists public._purge_backup_blog_generation_queue;
create table public._purge_backup_blog_generation_queue as
  select * from public.blog_generation_queue;

-- ---------- 2. THE PURGE ----------
delete from public.blog_generation_queue; -- pending/stuck titles first (child data)
delete from public.blog_posts;            -- articles + their image URLs

notify pgrst, 'reload schema'; -- keep PostgREST cache fresh (house-style)

commit;

-- ---------- 3. VERIFY (expected output) ----------
select
  (select count(*) from public.blog_posts)                          as posts_remaining_expect_0,
  (select count(*) from public.blog_generation_queue)               as queue_remaining_expect_0,
  (select count(*) from public._purge_backup_blog_posts)            as backed_up_posts,
  (select count(*) from public._purge_backup_blog_generation_queue) as backed_up_queue_items;
-- Expected: posts_remaining_expect_0 = 0 | queue_remaining_expect_0 = 0
--           backed_up_*              = same numbers shown in step 0.

-- =====================================================================
--  4. LATER — once you are happy with the new Pipeline-v2 content,
--     permanently erase the backups by running:
--        drop table public._purge_backup_blog_posts;
--        drop table public._purge_backup_blog_generation_queue;
--
--  5. ROLLBACK (restore everything back — only if EVER needed):
--        truncate public.blog_posts;
--        insert into public.blog_posts select * from public._purge_backup_blog_posts;
--        truncate public.blog_generation_queue;
--        insert into public.blog_generation_queue
--          select * from public._purge_backup_blog_generation_queue;
-- =====================================================================
