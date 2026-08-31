-- ============================================================
-- RUN_ON_SUPABASE_0048 — COACH PAGES: close the review-gate RLS gap
-- (Phase 56 real-test finding, 2026-08-31)
-- ============================================================
--
-- FINDING: policy cp_select (0031) grants anon+authenticated SELECT on
-- any row where is_published = true. Since 0046 the public page ALSO
-- requires review_status = 'approved' — but the RLS policy was never
-- updated. Result: a PENDING (not-yet-approved) page's full content —
-- including whatsapp_phone (meant for his activated clients only) —
-- is readable by anyone via the public REST API with the anon key,
-- even though the public page itself correctly hides it.
--
-- FIX: published rows must ALSO be approved. Owner/coach/admin
-- visibility of their own rows is unchanged.
--
-- Verified on production before writing: review_status column exists
-- (0046 was applied). If it were missing this CREATE would fail loudly
-- — run 0046 first in that case.
-- ============================================================

drop policy if exists cp_select on public.coach_pages;
create policy cp_select
  on public.coach_pages for select
  to anon, authenticated
  using (
    (is_published and review_status = 'approved')
    or coach_id = auth.uid()
    or public.is_admin()
  );

-- No other objects touched. Rollback (if ever needed):
-- drop policy if exists cp_select on public.coach_pages;
-- create policy cp_select
--   on public.coach_pages for select
--   to anon, authenticated
--   using (is_published or coach_id = auth.uid() or public.is_admin());
