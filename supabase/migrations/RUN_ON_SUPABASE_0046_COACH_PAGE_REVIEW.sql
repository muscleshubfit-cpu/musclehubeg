-- ============================================================================
-- RUN_ON_SUPABASE_0046_COACH_PAGE_REVIEW.sql
-- MuscleHubEG — migration 0046 (owner run: Supabase SQL Editor, single paste,
-- single transaction, ONE final grid at the end).
--
-- OWNER REQUEST (2026-08-30): «ضيف فى داشبورد الادمن قائمة جديدة لعرض صفحات
-- المدربين لمراجعتها والموافقة او الرفض عليها مع ارسال السبب (لان المدربين
-- بيكتبوا بنفسهم المحتوى المرئى على صفحاتهم)»
--
-- WHAT: admin moderation for coach-written PUBLIC landing content
-- (coach_pages.headline/bio/specialties/photos/social — migration 0031+).
--
-- MODEL (3 states, one column):
--   review_status = 'approved'  → page is live for the public (default:
--                                 every EXISTING page stays live — zero
--                                 disruption for current coaches)
--   review_status = 'pending'   → coach saved new/edited content; admin
--                                 must approve before it shows publicly
--   review_status = 'rejected'  → admin refused (+ reason in review_note);
--                                 page is HIDDEN from the public until the
--                                 coach edits again (→ back to pending)
--
-- WHO writes what:
--   coach PUT /api/coach/landing  → review_status='pending', note cleared
--                                    (admin-own saves stay approved)
--   admin PATCH /api/admin/coach-pages → approve | reject(+note required)
--
-- SAFE TO RE-RUN (idempotent): IF NOT EXISTS guards everywhere.
-- ============================================================================

-- 1) Columns ---------------------------------------------------------------
alter table public.coach_pages
  add column if not exists review_status text not null default 'approved';
alter table public.coach_pages
  add column if not exists review_note text not null default '';
alter table public.coach_pages
  add column if not exists reviewed_at timestamptz;

-- 2) CHECK guard (skip safely if re-run) ------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coach_pages_review_status_check'
  ) then
    alter table public.coach_pages
      add constraint coach_pages_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;
exception
  when others then
    raise notice 'review_status constraint skipped: %', sqlerrm;
end $$;

-- 3) Normalize any legacy rows (defensive — default already covers them) ----
update public.coach_pages
   set review_status = 'approved'
 where review_status is null or review_status = '';

-- 4) Service-role read sanity + final grid ----------------------------------
select
  '0046 OK' as status,
  (select count(*) from public.coach_pages) as total_pages,
  (select count(*) from public.coach_pages where review_status = 'approved') as approved,
  (select count(*) from public.coach_pages where review_status = 'pending')  as pending,
  (select count(*) from public.coach_pages where review_status = 'rejected') as rejected;
